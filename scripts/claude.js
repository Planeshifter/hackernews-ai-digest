const Anthropic = require('@anthropic-ai/sdk');
const path = require('node:path');

// Local runs load the repository's .env; existing shell/Actions variables win.
try {
  process.loadEnvFile(path.join(__dirname, '..', '.env'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

// Keep retries in the calling pipelines rather than multiplying SDK retries.
let client;
async function generateText(params, options) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set');
  client ||= new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    maxRetries: 0,
    defaultHeaders: process.env.ANTHROPIC_WORKSPACE_ID
      ? { 'anthropic-workspace-id': process.env.ANTHROPIC_WORKSPACE_ID }
      : undefined,
  });
  const message = await client.messages.create(params, options);
  return extractText(message);
}

function extractText(message) {
  // Preserve the pipelines' existing refusal behavior: omit a refused
  // discussion, drop a refused submission, and reject refused JSON on parse.
  if (message.stop_reason === 'refusal') return 'SKIP_STORY';
  // Never publish truncated prose or parse an incomplete/refused JSON result.
  if (message.stop_reason !== 'end_turn') {
    throw new Error(`Claude response did not complete: ${message.stop_reason}`);
  }
  const text = message.content.filter(block => block.type === 'text').map(block => block.text).join('');
  return text;
}

module.exports = { generateText, extractText };
