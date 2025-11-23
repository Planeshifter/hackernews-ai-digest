const path = require('path');
const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
const OpenAI = require('openai');
const jsonSerializeCompressed = require('./serialize_compressed.js');

// Configuration
const CONFIG = {
  MAX_CONTENT_LENGTH: 6000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000,
  REQUEST_DELAY: 1000,
  REQUEST_TIMEOUT: 10000,
  MODELS: {
    SUMMARY: 'google/gemini-3-pro-preview',
    DISCUSSION: 'google/gemini-3-pro-preview'
  }
};

// Initialize OpenAI client
const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPEN_ROUTER_API_KEY
});

// Date setup
const TODAY = new Date();
const YESTERDAY = new Date(TODAY.getTime() - (24 * 60 * 60 * 1000));
const YESTERDAY_STRING = YESTERDAY.toISOString().split('T')[0];

console.log(`[${new Date().toISOString()}] Creating digest for: ${YESTERDAY_STRING}`);

// Utility functions
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryWithBackoff(fn, retries = CONFIG.MAX_RETRIES, context = '') {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      console.log(`[${new Date().toISOString()}] Retry ${CONFIG.MAX_RETRIES - retries + 1}/${CONFIG.MAX_RETRIES} for ${context}`);
      await sleep(CONFIG.RETRY_DELAY);
      return retryWithBackoff(fn, retries - 1, context);
    }
    throw error;
  }
}

function extractTextFromHtml(html) {
  const $ = cheerio.load(html);
  
  // Remove non-content elements
  const elementsToRemove = [
    'script', 'link', 'style', 'noscript', 
    'meta', 'iframe', 'img', 'nav', 'footer', 'header'
  ];
  elementsToRemove.forEach(element => $(element).remove());
  
  // Extract and clean text
  let innerText = $('body').text();
  innerText = innerText.replace(/\s+/g, ' ').trim();
  
  return innerText.substring(0, CONFIG.MAX_CONTENT_LENGTH);
}

async function main() {
  const startTime = Date.now();
  
  // Check API key
  if (!process.env.OPEN_ROUTER_API_KEY) {
    console.error(`[${new Date().toISOString()}] ERROR: OPEN_ROUTER_API_KEY environment variable is not set`);
    process.exit(1);
  }
  
  // Load stories
  const storiesPath = path.join(__dirname, '..', 'data', 'stories.json');
  console.log(`[${new Date().toISOString()}] Loading stories from: ${storiesPath}`);
  
  let stories;
  try {
    stories = JSON.parse(fs.readFileSync(storiesPath, 'utf8'));
    console.log(`[${new Date().toISOString()}] Loaded ${stories.length} stories`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ERROR: Failed to load stories:`, error.message);
    process.exit(1);
  }
  
  // Initialize digest
  let digest = `## AI Submissions for ${YESTERDAY.toDateString()} {{ 'date': '${YESTERDAY.toISOString()}' }}\n\n`;
  let processedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  
  // Process each story
  for (let i = 0; i < stories.length; i++) {
    const story = stories[i];
    
    if (!story.url) {
      console.log(`[${new Date().toISOString()}] Skipping story ${i} (ID: ${story.id}): No URL`);
      skippedCount++;
      continue;
    }
    
    console.log(`[${new Date().toISOString()}] Processing story ${i}/${stories.length} (ID: ${story.id}): ${story.title}`);
    
    try {
      // Fetch web content with retry
      console.log(`[${new Date().toISOString()}]   Fetching content from: ${story.url}`);
      const response = await retryWithBackoff(
        async () => axios.get(story.url, {
          timeout: CONFIG.REQUEST_TIMEOUT,
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HN-Digest-Bot/1.0)' }
        }),
        CONFIG.MAX_RETRIES,
        `fetch ${story.url}`
      );
      
      const content = extractTextFromHtml(response.data);
      console.log(`[${new Date().toISOString()}]   Extracted ${content.length} characters of text`);
      
      if (content.length < 100) {
        console.log(`[${new Date().toISOString()}]   Warning: Very short content, may affect summary quality`);
      }
      
      try {
        // Generate submission summary
        console.log(`[${new Date().toISOString()}]   Generating submission summary with ${CONFIG.MODELS.SUMMARY}`);
        const submissionCompletion = await retryWithBackoff(
          async () => openai.chat.completions.create({
            model: CONFIG.MODELS.SUMMARY,
            messages: [
              { 
                role: 'system', 
                content: 'This AI will write a daily digest of the top stories on Hacker News; it will summarize the following submission in an engaging way.' 
              },
              { role: 'user', content: content },
            ]
          }, { timeout: CONFIG.REQUEST_TIMEOUT }),
          CONFIG.MAX_RETRIES,
          'submission summary'
        );
        
        const submissionSummary = submissionCompletion.choices[0]?.message?.content;
        if (!submissionSummary) {
          throw new Error('Empty summary returned from API');
        }
        
        // Generate discussion summary
        const comments = jsonSerializeCompressed(story.comments || []).substring(0, CONFIG.MAX_CONTENT_LENGTH);
        console.log(`[${new Date().toISOString()}]   Generating discussion summary with ${CONFIG.MODELS.DISCUSSION} (${comments.length} chars)`);
        
        const discussionCompletion = await retryWithBackoff(
          async () => openai.chat.completions.create({
            model: CONFIG.MODELS.DISCUSSION,
            messages: [
              { 
                role: 'system', 
                content: 'This AI will write a daily digest of the top stories on Hacker News; it will summarize the following discussion about the submission in the comments on Hacker News.' 
              },
              { role: 'user', content: `Summary of Submission: ${submissionSummary}.` },
              { role: 'user', content: `Please summarize the following discussion: ${comments}` },
            ]
          }, { timeout: CONFIG.REQUEST_TIMEOUT }),
          CONFIG.MAX_RETRIES,
          'discussion summary'
        );
        
        const discussionSummary = discussionCompletion.choices[0]?.message?.content;
        if (!discussionSummary) {
          throw new Error('Empty discussion summary returned from API');
        }
        
        // Add to digest
        digest += `### ${story.title}\n\n`;
        digest += `#### [Submission URL](${story.url}) | ${story.score || 0} points | by [${story.by}](https://news.ycombinator.com/user?id=${story.by}) | [${story.descendants || 0} comments](https://news.ycombinator.com/item?id=${story.id})\n\n`;
        digest += submissionSummary + '\n\n';
        digest += discussionSummary + '\n\n';
        
        processedCount++;
        console.log(`[${new Date().toISOString()}]   ✓ Successfully processed story ${i}`);
        
        // Rate limiting delay
        await sleep(CONFIG.REQUEST_DELAY);
        
      } catch (error) {
        console.error(`[${new Date().toISOString()}]   ERROR generating summaries:`, error.message);
        
        // Add partial entry to digest
        digest += `### ${story.title}\n\n`;
        digest += `#### [Submission URL](${story.url}) | ${story.score || 0} points | by [${story.by}](https://news.ycombinator.com/user?id=${story.by}) | [${story.descendants || 0} comments](https://news.ycombinator.com/item?id=${story.id})\n\n`;
        digest += `*Unable to generate AI summary: ${error.message}*\n\n`;
        errorCount++;
      }
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ERROR processing story ${i}:`, error.message);
      errorCount++;
    }
  }
  
  // Save digest
  const outputPath = path.join(__dirname, '..', 'data', `digest_${YESTERDAY_STRING}.md`);
  try {
    fs.writeFileSync(outputPath, digest);
    console.log(`[${new Date().toISOString()}] Digest saved to: ${outputPath}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ERROR saving digest:`, error.message);
    process.exit(1);
  }
  
  // Summary statistics
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`[${new Date().toISOString()}] ========================================`);
  console.log(`[${new Date().toISOString()}] Digest generation complete`);
  console.log(`[${new Date().toISOString()}]   Total stories: ${stories.length}`);
  console.log(`[${new Date().toISOString()}]   Processed: ${processedCount}`);
  console.log(`[${new Date().toISOString()}]   Skipped: ${skippedCount}`);
  console.log(`[${new Date().toISOString()}]   Errors: ${errorCount}`);
  console.log(`[${new Date().toISOString()}]   Duration: ${duration} seconds`);
  console.log(`[${new Date().toISOString()}] ========================================`);
}

// Run main function and handle top-level errors
main().catch(error => {
  console.error(`[${new Date().toISOString()}] FATAL ERROR:`, error);
  process.exit(1);
});
