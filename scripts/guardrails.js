// Machine-checkable guardrails for the digest generation prompts.
//
// Each phrase below MUST remain a verbatim substring of the matching prompt in
// scripts/prompts.js. The weekly prompt-improvement cron
// (scripts/propose_prompt_improvements.js) asserts every phrase survives in any
// LLM-proposed prompt before it will open a PR — this is the primary machine
// guarantee that an automated edit cannot silently drop a guardrail.
//
// IMPORTANT: if you intentionally reword a guardrail in scripts/prompts.js, you
// MUST update the corresponding phrase here in the SAME commit, or the
// assertion (assertGuardrailsPresent) will start failing for every future run.
// The submission prompt writes '"#", "##", or "###"' while the discussion
// prompt writes '"#"/"##"/"###"' — do NOT normalize the two to each other.

const REQUIRED_SUBMISSION_PHRASES = [
  'Output ONLY the summary body.',
  'Do NOT restate the title',
  'Do NOT reprint the URL, points, author, or comment count',
  'Do NOT emit a digest-level title, banner, emoji header, or a "***"/"---" divider.',
  'No "#", "##", or "###" headers anywhere in your output.',
  'NEVER ask for the submission or for clarification',
  'Never invent facts, numbers, quotes, benchmarks, prices, or features.',
  'Do NOT draw on outside knowledge',
  'output exactly this token and nothing else: SKIP_STORY',
  'beneath a "### {title}" header',
];

const REQUIRED_DISCUSSION_PHRASES = [
  'Summarize ONLY the discussion',
  'NEVER recap the article or the submission itself',
  'Output ONLY the body.',
  'no "***"/"---" divider, no "#"/"##"/"###" headers',
  'NEVER ask for the comments or for clarification',
  'Never invent quotes, positions, or numbers',
  'output exactly this token and nothing else: SKIP_STORY',
];

// The exact degrade token both prompts must keep.
const SKIP_TOKEN = 'SKIP_STORY';

// Character sequences that must never appear in a regenerated prompts.js string
// value (they would break the generated file or enable interpolation/escapes).
// Note: prompts.js is written via JSON.stringify, which already neutralizes
// these; this is a belt-and-suspenders reject list for the proposed text.
const FORBIDDEN_SUBSTRINGS = ['`', '${', '\\'];

// Return the list of required phrases missing from `prompt` (empty === all present).
function missingPhrases(prompt, phrases) {
  const text = String(prompt || '');
  return phrases.filter(p => !text.includes(p));
}

// Throw if either current prompt has drifted from the guardrail phrase list.
// Used as a build/CI assertion so guardrail drift fails loudly.
function assertGuardrailsPresent(submissionPrompt, discussionPrompt) {
  const missSub = missingPhrases(submissionPrompt, REQUIRED_SUBMISSION_PHRASES);
  const missDis = missingPhrases(discussionPrompt, REQUIRED_DISCUSSION_PHRASES);
  const problems = [];
  if (missSub.length) problems.push(`submission prompt missing: ${JSON.stringify(missSub)}`);
  if (missDis.length) problems.push(`discussion prompt missing: ${JSON.stringify(missDis)}`);
  if (problems.length) {
    throw new Error(`Guardrail drift detected — ${problems.join('; ')}. Update scripts/guardrails.js in the same commit that reworded the prompt.`);
  }
}

module.exports = {
  REQUIRED_SUBMISSION_PHRASES,
  REQUIRED_DISCUSSION_PHRASES,
  SKIP_TOKEN,
  FORBIDDEN_SUBSTRINGS,
  missingPhrases,
  assertGuardrailsPresent,
};

// Allow `node scripts/guardrails.js` to self-check against the live prompts.
if (require.main === module) {
  const { SUBMISSION_PROMPT, DISCUSSION_PROMPT } = require('./prompts.js');
  assertGuardrailsPresent(SUBMISSION_PROMPT, DISCUSSION_PROMPT);
  console.log('Guardrails present in current prompts.js ✓');
}
