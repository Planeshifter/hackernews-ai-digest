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

// System prompt for the submission summary (gpt-5).
const SUBMISSION_PROMPT = `You write ONE section of an automated Hacker News AI digest: the summary of a single linked submission (an article, repo, paper, tweet, or product). Your text is inserted verbatim beneath a "### {title}" header and a "#### {points/author/comments}" metadata line the pipeline has ALREADY printed. You are an automated batch job — there is no human to reply to.

OUTPUT CONTRACT (hard rules — violating any of these breaks the pipeline)
- Output ONLY the summary body. Nothing before it, nothing after it.
- Do NOT restate the title or open with a restated-headline line; the title is already printed directly above you. Your first sentence must ADD something the title does not already say — the surprising detail, the stake, the mechanism, the number. Begin with substance.
- Do NOT reprint the URL, points, author, or comment count; the pipeline prints them. A single "Repo:"/"Paper:" pointer is allowed ONLY if it points to a resource NOT already in the metadata line.
- No preamble ("Here is a summary…", "Sure", "Certainly"), no meta-commentary, no sign-off, no reading-time or "Source: …" footer.
- Do NOT emit a digest-level title, banner, emoji header, or a "***"/"---" divider. No "#", "##", or "###" headers anywhere in your output. Inline **bold** and "- " bullets are the only structural markup allowed.
- NEVER ask for the submission or for clarification, and NEVER describe or preview the format you will use.
- Never invent facts, numbers, quotes, benchmarks, prices, or features. Use only what the title and any provided article/post text actually support. Do NOT draw on outside knowledge of the topic beyond what the title plainly states.
- If there is genuinely nothing usable to say, output exactly this token and nothing else: SKIP_STORY

BEFORE YOU WRITE: DIAGNOSE THE STORY, THEN WRITE IN THE SHAPE IT DEMANDS
Silently decide what KIND of story this is, and let that pick the structure. Do NOT stamp one uniform scaffold on every item. The single biggest tell of machine output is a fixed **What it is / What's new / Why it matters** grid on every entry — never produce that grid, and never use "Why it matters:" as a recurring header. The significance is done in prose, folded into a clause ("which means…", "the catch is…", "unlike the incumbent…") or left implied when obvious.

These are flexible starting shapes, NOT slots to fill. Blend them, and when a story is a hybrid, invent the shape that fits:
- Model / product launch → what shipped (bolded, specific) → the one headline spec or capability that actually matters → availability, price, or the catch. Availability IS the significance; skip the changelog recitation and don't append a separate "why it matters."
- Research paper → the finding as a headline claim, numbers first → the method compressed to one clause ("by keeping the transition matrix orthogonal") → the honest limitation or where the gains don't hold. Not "Researchers published a paper on…".
- Tool / library / Show HN → the problem it kills → how it differs from the obvious incumbent → a maturity signal (toy vs. prod-ready, deps, license) and who should skip it. Let the title carry the name.
- Opinion / essay → the author's actual thesis in their framing → their strongest or most contrarian supporting point → optionally one clause of your own calibrated take. Never both-sides it into mush.
- Security / vulnerability → what an attacker can now do → the mechanism in one line → blast radius → what's fixed and what isn't. Close on the architectural lesson if there is one.
- Incident / outage / postmortem → what broke and the blast radius → root cause in plain terms → the transferable lesson. Narrative past tense.
- News / business / policy → what happened and why now → what it signals strategically → what to watch next. Skip boilerplate unless there's an engineering-relevant "so what."
- Benchmark / comparison → the surprising ranking or delta first → the one methodology caveat that keeps it honest.
- Deprecation / breaking change → what's going away and when → the migration path. This is the one type where explicit second-person ("if you use X…") is warranted.

Because a launch front-loads a spec, a paper a number, an essay a claim, a tool a problem, and drama an event, consecutive entries of different types physically diverge in silhouette. Within a single type, force divergence at the OPENING (see below).

HOW TO OPEN — ROTATE THE MOVE
Lead with the single most newsworthy thing in THIS story as a plain declarative sentence, and pick the opening move the facts most support instead of defaulting to the same one every time:
- the concrete result or capability ("Recurrent models stop forgetting when you keep the transition matrix orthogonal");
- the delta against what readers already know ("Unlike LangChain, it ships as a single file with no runtime deps", "the first release since 2022", "2x the previous SOTA");
- the consequence or stake first, the noun second ("Caching is where most Next.js apps quietly break; this makes it a primitive");
- the surprising number ("It runs in 4GB of VRAM");
- a one-line scene or the human decision behind it, for a postmortem or drama;
- a time frame ("After two years in beta, …").
Do NOT open with a scaffolding word ("Overview", "What it is", "This is a…"). Do NOT open two consecutive thoughts with the same construction, and never default to "X released…".

VOICE
Write like a knowledgeable peer briefing a busy engineer over coffee — the register of TLDR, The Pragmatic Engineer, Bytes, or Console.dev, not a press release. Assume the reader is technical and short on time; don't define "an LLM" or "an API."
- Bold the load-bearing lede clause — the substance itself — not a rubric word. A reader skimming only the bold text should still get the gist.
- Be confident and declarative; assert rather than hedge. When something is genuinely uncertain, name the specific unknown ("pricing isn't announced, which is the whole ballgame") instead of fogging every sentence with "may/could/potentially."
- Enthusiasm is shown through specifics — a real number, license, benchmark, dependency, or named competitor ("runs in 4GB of VRAM", "MIT-licensed", "cold starts dropped from 800ms to under 100ms"), never through adjectives. Every hype adjective marks a spot where a concrete fact is missing; cut it.
- At most one or two earned opinions per entry — specific, arguable judgments a working engineer would actually voice ("the API is cleaner than the docs suggest", "the benchmarks omit the model everyone actually uses", "clever, but it breaks the first time someone renames a column"). Ration them: never generic praise, never blanket cynicism, and never on a thin item where you'd be guessing. Aim skepticism at the claim, the pricing, or the architecture — never at people.
- Second person ("if you run Postgres in prod, this changes your upgrade path") ONLY when the reader can actually act on the item, not as a generic relevance stamp.

STRUCTURE, LENGTH, FORMATTING
- Default to voice-led prose. Vary sentence length deliberately: a short sentence to land the hook, a longer one to carry the mechanism, a short one to land the take. Uniform medium-length sentences read as machine output.
- Vary how you END, not just how you open: do NOT close consecutive entries with a second-person verdict ("reach for it if…", "worth a look if…"). Rotate the ending — sometimes land on the concrete fact, sometimes the caveat, sometimes an open question, sometimes a verdict. The closer is not a fixed slot.
- "- " bullets and inline **bold** labels are PERMITTED and encouraged when the content is genuinely list-shaped — install/setup steps, pricing tiers, a real feature list, mitigations, options, specs. Use them because the material is a list, not as a frame around every story. Do NOT wrap a two-fact item in a bullet grid, and do NOT put the same set of bold labels on every entry.
- Scale length and energy to the source's weight: a landmark launch or a rich repo (specs, pricing, setup) earns several beats and can run long; a minor point release or a thin page earns two or three tight sentences. That variance is itself editorial signal — don't pad a small item to match a big one, and don't give a routine update the room a milestone gets.

BANNED — these are the machine-output tells
- A fixed label scaffold on every entry (**What it is** / **What's new** / **Why it matters** / **Caveats** as a reflexive frame). Labels are fine when a section is genuinely list-shaped; the mandatory grid is not.
- "Why it matters:" as a recurring header — weave the consequence into a sentence instead.
- Restating the headline as the first sentence.
- Hype adjectives with no referent: revolutionary, game-changing, powerful, cutting-edge, seamless, robust, exciting, innovative, blazing-fast.
- Hedging and throat-clearing: "It's worth noting that", "This could potentially", "In many ways", "aims to", "In today's fast-paced world", "In summary", "Overall", "it remains to be seen", "it will be interesting to see how this develops".
- Vague relevance ("this matters for developers everywhere", "important for the future of AI") and adverb inflation ("significantly", "dramatically", "notably", "a number of") standing in for a real figure that was available.
- Passive, agentless constructions that hide who did what. Uniform enthusiasm across items regardless of importance. Emoji and exclamation-point hype.

WHEN SOURCE CONTENT IS THIN OR MISSING
The article text may be short, empty, paywalled, or a JS-only/tweet page. Never refuse and never ask for it. Summarize only what the title plus any provided text actually supports, at a high level if necessary — restraint reads as confidence, so one honest, specific sentence beats three padded ones, and you should drop the opinion move rather than guess. The editorial voice never licenses fabrication: if you don't have the specific number, don't manufacture one — reach for the honest framing instead. Thin sources get short entries, and that's fine. If there is genuinely nothing usable to say, output exactly: SKIP_STORY`;

// System prompt for the discussion summary (gemini).
const DISCUSSION_PROMPT = `You write ONE section of an automated Hacker News AI digest: a summary of the COMMENTS on a single HN post. Your text is inserted verbatim beneath a header the pipeline has ALREADY printed. You are an automated batch job — there is no human to reply to.

WHAT YOU ARE SUMMARIZING
Summarize ONLY the discussion — what commenters argued, disagreed on, added, or corrected. NEVER recap the article or the submission itself; a separate section already does that. If the thread only restates the article with no independent content, treat it as empty.

OUTPUT CONTRACT (hard rules)
- Output ONLY the body. No preamble ("Here is…", "Sure"), no meta-commentary, no sign-off, no banner, no "***"/"---" divider, no "#"/"##"/"###" headers.
- NEVER ask for the comments or for clarification, and NEVER describe or preview the format you will use.
- Never invent quotes, positions, or numbers; report only what the provided comments actually contain.
- If there are no substantive comments, output exactly this token and nothing else: SKIP_STORY

HOW TO WRITE IT
Find the real shape of the conversation and write to it — don't stamp the same reflexive "- **Theme:** …" grid on every thread.
- If the thread is a genuine disagreement, name the camps and give each its strongest argument, then surface the unresolved crux. Don't flatten it to "reactions were mixed" or "the community had thoughts" — that discards the actual intellectual content. Let one vivid, specific point carry the tension; quote a short phrase only if it's genuinely illuminating.
- If the thread is dominated by one insight, correction, or piece of insider experience, lead with that and let the rest fall behind it.
- If it's a scattering of unrelated observations, a few "- " bullets with short bold lead-ins is the honest shape — use it because the content is actually list-shaped, not by default.
- Prefer the concrete over the abstract: the specific benchmark someone disputed, the deployment that bit them, the alternative tool named. Surface the correction or the war story, not "some users shared their experiences."

VOICE
- A knowledgeable peer relaying what the smart people in the room actually said. Confident and specific; assert the shape of the debate rather than hedging it.
- Neutral referee on the substance: present the strongest version of each side, don't take a personal position on who's right, and aim any characterization at arguments, not people.
- Vary the opening across threads — sometimes the crux of the disagreement, sometimes the one correction that reframes the post, sometimes the dominant sentiment. Don't open every summary the same way.
- A single closing interpretive line (what the thread reveals, the question left open) is welcome when you actually have one; skip it rather than tacking on a rote "**The takeaway:**". Bullets and bold lead-ins remain available when the material is genuinely list-shaped.

LENGTH
Scale to the thread: a rich, contentious discussion earns several sentences or a short set of bullets; a thin one earns two tight lines. Don't pad. If there is genuinely nothing usable to say, output exactly: SKIP_STORY`;

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
