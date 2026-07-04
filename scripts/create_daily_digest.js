const path = require('path');
const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
const OpenAI = require('openai');
const jsonSerializeCompressed = require('./serialize_compressed.js');

// Configuration
const CONFIG = {
  MAX_CONTENT_LENGTH: 6000,      // article body budget (chars)
  COMMENT_MAX_LENGTH: 12000,     // comment thread budget (chars) — larger than the article
  MIN_CONTENT_LENGTH: 200,       // below this, treat the article body as unavailable
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000,
  REQUEST_DELAY: 1000,
  REQUEST_TIMEOUT: 10000,        // HTTP fetch timeout
  LLM_TIMEOUT: 90000,            // LLM completion timeout (gpt-5/gemini are slow)
  MAX_COMPLETION_TOKENS: 8000,   // generous — a low cap starves reasoning models and yields empty output
  MIN_SUCCESS_RATIO: 0.5,        // abort (do not publish) if fewer than this fraction of attempts succeed
  MODELS: {
    SUMMARY: 'gpt-5',
    DISCUSSION: 'google/gemini-3.1-pro-preview'
  }
};

// Initialize OpenAI client. maxRetries: 0 so retryWithBackoff is the single
// retry authority (otherwise the SDK's internal retries nest and multiply).
const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPEN_ROUTER_API_KEY,
  maxRetries: 0
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

function errorStatus(error) {
  return error?.status || error?.response?.status;
}

// OpenRouter returns 402 (and/or a "requires more credits" message) when the
// account balance is exhausted. This is fatal for the whole run — every
// subsequent call will fail the same way.
function isInsufficientCredits(error) {
  const msg = (error?.message || '').toLowerCase();
  return errorStatus(error) === 402
    || msg.includes('requires more credits')
    || msg.includes('insufficient credits');
}

async function retryWithBackoff(fn, retries = CONFIG.MAX_RETRIES, context = '') {
  try {
    return await fn();
  } catch (error) {
    // Do not retry client errors (4xx) — e.g. 402 insufficient credits or a
    // 404/403 on a fetch — they will not succeed on retry and only waste time
    // and credits.
    const status = errorStatus(error);
    if (status && status >= 400 && status < 500) {
      throw error;
    }
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

// Strip HTML/entities from a snippet (e.g. an HN self-post `text` field) to
// plain text, without the element-removal/truncation that extractTextFromHtml
// applies to full pages.
function htmlToText(html) {
  if (!html) return '';
  return cheerio.load(`<body>${html}</body>`)('body').text().replace(/\s+/g, ' ').trim();
}

// Sentinel a model emits when it has nothing usable to summarize.
const SKIP_SENTINEL = 'SKIP_STORY';

// True when the output is empty or exactly the skip sentinel (matched as a
// trimmed whole-string, tolerating stray markdown emphasis — NOT as a
// substring, so a summary that merely mentions the word is never dropped).
function isSkip(text) {
  const t = (text || '').trim();
  if (t === '') return true;
  // Strip surrounding markdown emphasis/heading marks and whitespace (but NOT
  // underscores — the sentinel itself contains one) before comparing.
  return t.replace(/[*`#\s]/g, '').toUpperCase() === SKIP_SENTINEL;
}

// True when the output is a refusal / clarification request rather than a
// summary. Anchored to the START of a SHORT output so it cannot false-positive
// on a long, legitimate summary that happens to quote a call-to-action.
function isRefusal(text) {
  const t = (text || '').trim();
  if (t.length > 400) return false;
  const head = t.slice(0, 200).toLowerCase();
  return /i (?:do not|don'?t|didn'?t|cannot|can'?t) (?:see|have|find|access) the (?:submission|article|discussion|content|comments|text)/.test(head)
    || /please (?:share|provide|paste) (?:one of|the following|the submission|the article)/.test(head)
    || /(?:could|can) you (?:please )?(?:share|provide|paste)/.test(head)
    || /i'?m ready to (?:summarize|write|help)/.test(head)
    || /sample output format/.test(head);
}

// Conservative safety net: strip a single leading conversational/preamble or
// self-invented banner line if the model emitted one despite the prompt. Logs
// nothing here; the caller logs when the result changes.
function stripPreamble(text) {
  let t = (text || '').trim();
  // Drop a leading greeting/meta line ("Here is a summary:", "Certainly!", a
  // "# Daily Digest" banner, or a "***"/"---" divider) followed by real body.
  const patterns = [
    /^\s*(?:certainly|sure|of course|absolutely|good morning|good afternoon|hello)[!,.:]?\s*\n+/i,
    /^\s*here(?:'s| is| are)[^\n]*\n+/i,
    /^\s*welcome[^\n]*\n+/i,
    /^\s*#{1,3}\s+[^\n]*digest[^\n]*\n+/i,
    /^\s*(?:\*\*\*|---)\s*\n+/,
  ];
  let changed = true;
  while (changed) {
    changed = false;
    for (const re of patterns) {
      const next = t.replace(re, '');
      if (next !== t && next.trim().length > 0) { t = next.trim(); changed = true; }
    }
  }
  return t.trim();
}

// The two generation prompts live in their own module so the weekly
// prompt-improvement cron can regenerate them safely. See scripts/prompts.js.
const { SUBMISSION_PROMPT, DISCUSSION_PROMPT } = require('./prompts.js');

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
  let skippedCount = 0;   // stories with no URL
  let droppedCount = 0;   // stories dropped because the model refused / had nothing usable
  let errorCount = 0;     // stories dropped because a generation call errored
  let fatalError = false; // set on credit exhaustion — abort without publishing

  // Process each story
  for (let i = 0; i < stories.length; i++) {
    const story = stories[i];

    if (!story.url) {
      console.log(`[${new Date().toISOString()}] Skipping story ${i} (ID: ${story.id}): No URL`);
      skippedCount++;
      continue;
    }

    console.log(`[${new Date().toISOString()}] Processing story ${i}/${stories.length} (ID: ${story.id}): ${story.title}`);

    // Fetch the article body. Failures are NON-fatal: we still summarize from
    // the title (and any HN self-post text) so the model never has to refuse
    // for lack of a submission.
    let content = '';
    try {
      console.log(`[${new Date().toISOString()}]   Fetching content from: ${story.url}`);
      const response = await retryWithBackoff(
        async () => axios.get(story.url, {
          timeout: CONFIG.REQUEST_TIMEOUT,
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HN-Digest-Bot/1.0)' }
        }),
        CONFIG.MAX_RETRIES,
        `fetch ${story.url}`
      );
      content = extractTextFromHtml(response.data);
      console.log(`[${new Date().toISOString()}]   Extracted ${content.length} characters of text`);
    } catch (error) {
      console.log(`[${new Date().toISOString()}]   Could not fetch article (${error.message}); summarizing from title/metadata`);
    }

    const hnText = htmlToText(story.text);

    try {
      // ---- Submission summary (gpt-5) ----
      const hasBody = content.length >= CONFIG.MIN_CONTENT_LENGTH || hnText.length > 0;
      const submissionUser = hasBody
        ? `Title: ${story.title}\nURL: ${story.url}\n\n` +
          (hnText ? `Author's post text:\n${hnText}\n\n` : '') +
          `Article text (may be truncated):\n${content || '(none extracted)'}`
        : `Title: ${story.title}\nURL: ${story.url}\n\nThe article body could not be extracted (it is likely paywalled, JavaScript-only, or a media/tweet page). Summarize at a high level from the title alone; do not invent specifics. If the title alone is not enough to say anything useful, reply with ${SKIP_SENTINEL}.`;

      console.log(`[${new Date().toISOString()}]   Generating submission summary with ${CONFIG.MODELS.SUMMARY}`);
      const submissionCompletion = await retryWithBackoff(
        async () => openai.chat.completions.create({
          model: CONFIG.MODELS.SUMMARY,
          max_tokens: CONFIG.MAX_COMPLETION_TOKENS,
          messages: [
            { role: 'system', content: SUBMISSION_PROMPT },
            { role: 'user', content: submissionUser },
          ]
        }, { timeout: CONFIG.LLM_TIMEOUT }),
        CONFIG.MAX_RETRIES,
        'submission summary'
      );

      let submissionSummary = submissionCompletion.choices[0]?.message?.content || '';

      // Drop the whole story if the model refused or had nothing usable.
      if (isSkip(submissionSummary) || isRefusal(submissionSummary)) {
        console.log(`[${new Date().toISOString()}]   ⤫ Dropping story ${i}: submission summary was ${isSkip(submissionSummary) ? 'empty/SKIP_STORY' : 'refusal-shaped'}`);
        droppedCount++;
        continue;
      }
      submissionSummary = stripPreamble(submissionSummary);

      // ---- Discussion summary (gemini) ----
      // Only attempt a discussion summary when there are actual comments — an
      // empty array serializes to "[]", which is not worth a model call.
      let discussionSummary = '';
      if (Array.isArray(story.comments) && story.comments.length > 0) {
        const comments = jsonSerializeCompressed(story.comments).substring(0, CONFIG.COMMENT_MAX_LENGTH);
        console.log(`[${new Date().toISOString()}]   Generating discussion summary with ${CONFIG.MODELS.DISCUSSION} (${comments.length} chars)`);
        const discussionCompletion = await retryWithBackoff(
          async () => openai.chat.completions.create({
            model: CONFIG.MODELS.DISCUSSION,
            max_tokens: CONFIG.MAX_COMPLETION_TOKENS,
            messages: [
              { role: 'system', content: DISCUSSION_PROMPT },
              { role: 'user', content: `Submission summary (context only — do NOT recap it):\n${submissionSummary}` },
              { role: 'user', content: `Comments to summarize:\n${comments}` },
            ]
          }, { timeout: CONFIG.LLM_TIMEOUT }),
          CONFIG.MAX_RETRIES,
          'discussion summary'
        );
        discussionSummary = discussionCompletion.choices[0]?.message?.content || '';
        // A thin/refused discussion omits ONLY the discussion section; it never
        // drops an otherwise-good submission.
        if (isSkip(discussionSummary) || isRefusal(discussionSummary)) {
          console.log(`[${new Date().toISOString()}]   Discussion summary omitted (${isSkip(discussionSummary) ? 'empty/SKIP_STORY' : 'refusal-shaped'})`);
          discussionSummary = '';
        } else {
          discussionSummary = stripPreamble(discussionSummary);
        }
      }

      // ---- Append the entry ----
      digest += `### ${story.title}\n\n`;
      digest += `#### [Submission URL](${story.url}) | ${story.score || 0} points | by [${story.by}](https://news.ycombinator.com/user?id=${story.by}) | [${story.descendants || 0} comments](https://news.ycombinator.com/item?id=${story.id})\n\n`;
      digest += submissionSummary + '\n\n';
      if (discussionSummary) {
        digest += discussionSummary + '\n\n';
      }

      processedCount++;
      console.log(`[${new Date().toISOString()}]   ✓ Successfully processed story ${i}`);

      // Rate limiting delay
      await sleep(CONFIG.REQUEST_DELAY);

    } catch (error) {
      console.error(`[${new Date().toISOString()}]   ERROR generating summaries for story ${i}:`, error.message);
      errorCount++;
      // Never write a placeholder into the digest — skip the story entirely.
      // On credit exhaustion, abort the run: every later call will also fail.
      if (isInsufficientCredits(error)) {
        console.error(`[${new Date().toISOString()}]   FATAL: OpenRouter reports insufficient credits — aborting run.`);
        fatalError = true;
        break;
      }
    }
  }
  
  // Guard rails: never publish an empty or mostly-failed digest — a bad fetch
  // day or credit exhaustion should fail loudly (non-zero exit) so the run is
  // retried, not silently ship a broken/near-empty digest.
  const attempted = processedCount + errorCount;
  if (fatalError) {
    console.error(`[${new Date().toISOString()}] Aborting without saving: fatal error during generation (processed ${processedCount}).`);
    process.exit(1);
  }
  if (processedCount === 0) {
    console.error(`[${new Date().toISOString()}] Aborting without saving: no stories were successfully summarized.`);
    process.exit(1);
  }
  if (attempted > 0 && processedCount / attempted < CONFIG.MIN_SUCCESS_RATIO) {
    console.error(`[${new Date().toISOString()}] Aborting without saving: majority of stories failed (${processedCount}/${attempted} succeeded).`);
    process.exit(1);
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

  // Summary statistics (a per-run quality report — watch these for prompt drift)
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`[${new Date().toISOString()}] ========================================`);
  console.log(`[${new Date().toISOString()}] Digest generation complete`);
  console.log(`[${new Date().toISOString()}]   Total stories: ${stories.length}`);
  console.log(`[${new Date().toISOString()}]   Processed: ${processedCount}`);
  console.log(`[${new Date().toISOString()}]   Skipped (no URL): ${skippedCount}`);
  console.log(`[${new Date().toISOString()}]   Dropped (refusal/empty): ${droppedCount}`);
  console.log(`[${new Date().toISOString()}]   Errors (generation failed): ${errorCount}`);
  console.log(`[${new Date().toISOString()}]   Duration: ${duration} seconds`);
  console.log(`[${new Date().toISOString()}] ========================================`);
}

// Run main function and handle top-level errors
main().catch(error => {
  console.error(`[${new Date().toISOString()}] FATAL ERROR:`, error);
  process.exit(1);
});
