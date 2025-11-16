const path = require('path');
const fs = require('fs');
const axios = require('axios');
const OpenAI = require('openai');

// Configuration
const CONFIG = {
  STORIES_TO_FETCH: 250,
  MIN_COMMENTS: 3,
  MIN_SCORE: 5,
  REQUEST_DELAY: 1000,
  REQUEST_TIMEOUT: 10000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000,
  MAX_COMMENT_DEPTH: 10, // Prevent infinite recursion
  CLASSIFIER_MODEL: 'openai/gpt-5.1'
};

const API_URLS = {
  TOP_STORIES: 'https://hacker-news.firebaseio.com/v0/topstories.json',
  ITEM: 'https://hacker-news.firebaseio.com/v0/item/'
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

console.log(`[${new Date().toISOString()}] Starting HN AI story collection for: ${YESTERDAY_STRING}`);

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

function isSameDay(date1, date2) {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

// Fetch story data from HN API
async function fetchStoryData(storyId) {
  try {
    const response = await retryWithBackoff(
      async () => axios.get(`${API_URLS.ITEM}${storyId}.json`, { timeout: CONFIG.REQUEST_TIMEOUT }),
      CONFIG.MAX_RETRIES,
      `fetch story ${storyId}`
    );
    return response.data;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ERROR fetching story data for ID ${storyId}:`, error.message);
    return null;
  }
}

// Recursively fetch comments
async function fetchComments(story, depth = 0) {
  if (!story.kids || story.kids.length === 0 || depth >= CONFIG.MAX_COMMENT_DEPTH) {
    delete story.kids;
    return;
  }

  console.log(`[${new Date().toISOString()}]     Fetching ${story.kids.length} comments at depth ${depth}`);
  story.comments = [];
  
  for (const kidId of story.kids) {
    try {
      const kidData = await fetchStoryData(kidId);
      
      if (!kidData || kidData.deleted || kidData.dead) {
        continue;
      }
      
      // Recursively fetch nested comments
      if (kidData.kids && kidData.kids.length > 0) {
        await fetchComments(kidData, depth + 1);
      }
      
      // Clean up comment data
      delete kidData.parent;
      delete kidData.type;
      delete kidData.time;
      delete kidData.id;
      delete kidData.kids;
      
      story.comments.push(kidData);
    } catch (error) {
      console.error(`[${new Date().toISOString()}]     ERROR fetching comment ${kidId}:`, error.message);
    }
  }
  
  delete story.kids;
}

async function isAIRelated(title) {
  try {
    console.log(`[${new Date().toISOString()}]     Classifying: "${title}"`);
    
    const completion = await retryWithBackoff(
      async () => openai.chat.completions.create({
        model: CONFIG.CLASSIFIER_MODEL,
        messages: [
          { 
            role: 'system', 
            content: `You classify story titles as AI-related or not. 
            AI-related includes: artificial intelligence, machine learning, deep learning, neural networks, LLMs, GPT, ChatGPT, Claude, transformers, AI tools, AI companies, AI research, computer vision, NLP, robotics with AI, AGI, AI safety, AI ethics.
            Return JSON: {"is_ai": true} or {"is_ai": false}` 
          },
          { 
            role: 'user', 
            content: title 
          },
        ],
				temperature: 0,	
				max_tokens: 50,
        response_format: { 
          type: "json_schema",
          json_schema: {
            name: "ai_classification",
            strict: true,
            schema: {
              type: "object",
              properties: {
                is_ai: {
                  type: "boolean",
                  description: "Whether the title is AI-related"
                }
              },
              required: ["is_ai"],
              additionalProperties: false
            }
          }
        }
      }, { timeout: CONFIG.REQUEST_TIMEOUT }),
      CONFIG.MAX_RETRIES,
      'AI classification'
    );
    
    const result = JSON.parse(completion.choices[0]?.message?.content || '{"is_ai": false}');
    console.log(`[${new Date().toISOString()}]     AI-related: ${result.is_ai}`);
    return result.is_ai;
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ERROR classifying story:`, error.message);
    return false;
  }
}

// Fetch and process newest stories
async function fetchNewestStories() {
  console.log(`[${new Date().toISOString()}] Fetching top stories from HN API`);
  
  try {
    const response = await retryWithBackoff(
      async () => axios.get(API_URLS.TOP_STORIES, { timeout: CONFIG.REQUEST_TIMEOUT }),
      CONFIG.MAX_RETRIES,
      'fetch top stories'
    );
    
    const storyIds = response.data.slice(0, CONFIG.STORIES_TO_FETCH);
    console.log(`[${new Date().toISOString()}] Retrieved ${storyIds.length} story IDs`);
    
    const stories = [];
    let processedCount = 0;
    let yesterdayCount = 0;
    let aiCount = 0;
    
    for (const storyId of storyIds) {
      processedCount++;
      console.log(`[${new Date().toISOString()}] Processing story ${processedCount}/${storyIds.length} (ID: ${storyId})`);
      
      const storyData = await fetchStoryData(storyId);
      if (!storyData) {
        console.log(`[${new Date().toISOString()}]   Skipping: Failed to fetch story data`);
        continue;
      }
      
      // Check if story is from yesterday
      const storyDate = new Date(storyData.time * 1000);
      if (!isSameDay(storyDate, YESTERDAY)) {
        console.log(`[${new Date().toISOString()}]   Skipping: Story from ${storyDate.toISOString().split('T')[0]}`);
        continue;
      }
      
      yesterdayCount++;
      
      // Check if story meets minimum engagement criteria
      const descendants = storyData.descendants || 0;
      const score = storyData.score || 0;
      
      if (descendants < CONFIG.MIN_COMMENTS || score < CONFIG.MIN_SCORE) {
        console.log(`[${new Date().toISOString()}]   Skipping: Low engagement (${score} points, ${descendants} comments)`);
        continue;
      }
      
      console.log(`[${new Date().toISOString()}]   "${storyData.title}" (${score} points, ${descendants} comments)`);
      console.log(`[${new Date().toISOString()}]   Checking for AI content...`);
      
      // Check if story is AI-related
      const isAI = await isAIRelated(storyData.title);
      console.log(`[${new Date().toISOString()}]   AI-related: ${isAI}`);
      
      if (!isAI) {
        continue;
      }
      
      aiCount++;
      
      // Fetch comments
      if (storyData.kids && storyData.kids.length > 0) {
        console.log(`[${new Date().toISOString()}]   Fetching comment tree...`);
        await fetchComments(storyData);
        console.log(`[${new Date().toISOString()}]   Retrieved ${storyData.comments?.length || 0} top-level comments`);
      }
      
      // Clean up story data
      delete storyData.kids;
      delete storyData.type;
      
      stories.push(storyData);
      console.log(`[${new Date().toISOString()}]   ✓ Added story to collection (total: ${stories.length})`);
      
      // Rate limiting
      await sleep(CONFIG.REQUEST_DELAY);
    }
    
    console.log(`[${new Date().toISOString()}] ========================================`);
    console.log(`[${new Date().toISOString()}] Processing complete:`);
    console.log(`[${new Date().toISOString()}]   Total processed: ${processedCount}`);
    console.log(`[${new Date().toISOString()}]   From yesterday: ${yesterdayCount}`);
    console.log(`[${new Date().toISOString()}]   AI-related: ${aiCount}`);
    console.log(`[${new Date().toISOString()}]   Collected: ${stories.length}`);
    console.log(`[${new Date().toISOString()}] ========================================`);
    
    return stories;
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ERROR fetching stories:`, error.message);
    return [];
  }
}

async function main() {
  const startTime = Date.now();
  
  // Check API key
  if (!process.env.OPEN_ROUTER_API_KEY) {
    console.error(`[${new Date().toISOString()}] ERROR: OPEN_ROUTER_API_KEY environment variable is not set`);
    process.exit(1);
  }
  
  // Fetch and process stories
  const stories = await fetchNewestStories();
  
  if (stories.length === 0) {
    console.log(`[${new Date().toISOString()}] No AI stories found for ${YESTERDAY_STRING}`);
    process.exit(0);
  }
  
  // Save stories to file
  const outputPath = path.join(__dirname, '..', 'data', 'stories.json');
  
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(outputPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log(`[${new Date().toISOString()}] Created data directory: ${dataDir}`);
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(stories, null, 2));
    console.log(`[${new Date().toISOString()}] Saved ${stories.length} stories to: ${outputPath}`);
    
    // Calculate file size
    const stats = fs.statSync(outputPath);
    const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`[${new Date().toISOString()}] File size: ${fileSizeMB} MB`);
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ERROR saving stories:`, error.message);
    process.exit(1);
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`[${new Date().toISOString()}] Total execution time: ${duration} seconds`);
}

// Run main function and handle top-level errors
main().catch(error => {
  console.error(`[${new Date().toISOString()}] FATAL ERROR:`, error);
  process.exit(1);
});
