const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { generateText, extractText } = require('./claude.js');

test('extracts final text without publishing thinking or redacted blocks', () => {
  assert.equal(extractText({ stop_reason: 'end_turn', content: [
    { type: 'thinking', thinking: 'private reasoning' },
    { type: 'text', text: 'Summary ' },
    { type: 'redacted_thinking', data: 'opaque' },
    { type: 'text', text: 'body.' },
  ] }), 'Summary body.');
});

test('preserves refusal and empty-output fallback behavior', () => {
  assert.equal(extractText({ stop_reason: 'refusal', content: [] }), 'SKIP_STORY');
  assert.equal(extractText({ stop_reason: 'end_turn', content: [] }), '');
});

test('rejects truncated or unexpected completions', () => {
  for (const stop_reason of ['max_tokens', 'tool_use', 'pause_turn']) {
    assert.throws(() => extractText({ stop_reason, content: [{ type: 'text', text: 'partial' }] }), /did not complete/);
  }
});

test('SDK sends Anthropic authentication and native Messages requests without nested retries', async t => {
  const originalKey = process.env.ANTHROPIC_API_KEY;
  const originalBase = process.env.ANTHROPIC_BASE_URL;
  const originalWorkspace = process.env.ANTHROPIC_WORKSPACE_ID;
  const originalFetch = globalThis.fetch;
  process.env.ANTHROPIC_API_KEY = 'test-key-only';
  process.env.ANTHROPIC_WORKSPACE_ID = 'wrkspc_test';
  delete process.env.ANTHROPIC_BASE_URL;
  t.after(() => {
    if (originalKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = originalKey;
    if (originalBase !== undefined) process.env.ANTHROPIC_BASE_URL = originalBase;
    if (originalWorkspace === undefined) delete process.env.ANTHROPIC_WORKSPACE_ID;
    else process.env.ANTHROPIC_WORKSPACE_ID = originalWorkspace;
    globalThis.fetch = originalFetch;
  });
  let calls = 0;
  let status = 200;
  globalThis.fetch = async (url, init) => {
    calls++;
    assert.equal(String(url), 'https://api.anthropic.com/v1/messages');
    const headers = new Headers(init.headers);
    assert.equal(headers.get('x-api-key'), 'test-key-only');
    assert.equal(headers.get('anthropic-version'), '2023-06-01');
    assert.equal(headers.get('anthropic-workspace-id'), 'wrkspc_test');
    const body = JSON.parse(init.body);
    assert.equal(body.system, 'Classify the title.');
    assert.equal(body.messages[0].role, 'user');
    assert.equal(body.output_config.format.type, 'json_schema');
    return new Response(JSON.stringify(status === 200
      ? { stop_reason: 'end_turn', content: [{ type: 'text', text: '{"is_ai":true}' }] }
      : { type: 'error', error: { type: 'rate_limit_error', message: 'Rate limited' } }),
    { status, headers: { 'content-type': 'application/json' } });
  };
  const params = {
    model: 'claude-haiku-5-5', max_tokens: 128, thinking: { type: 'disabled' },
    system: 'Classify the title.', messages: [{ role: 'user', content: 'AI research' }],
    output_config: { format: { type: 'json_schema', schema: {
      type: 'object', properties: { is_ai: { type: 'boolean' } }, required: ['is_ai'], additionalProperties: false,
    } } },
  };
  assert.deepEqual(JSON.parse(await generateText(params)), { is_ai: true });
  status = 429;
  await assert.rejects(generateText(params), error => error.status === 429);
  assert.equal(calls, 2);
  delete process.env.ANTHROPIC_API_KEY;
  await assert.rejects(generateText(params), /ANTHROPIC_API_KEY is not set/);
  assert.equal(calls, 2);
});

// Evaluate entry points without their automatic main() call or filesystem,
// network, GitHub, and git side effects. Test their real request construction.
function loadPipeline(filename, mocks) {
  const fullPath = path.join(__dirname, filename);
  const source = fs.readFileSync(fullPath, 'utf8');
  const localRequire = createRequire(fullPath);
  const context = vm.createContext({
    require: name => Object.hasOwn(mocks, name) ? mocks[name] : localRequire(name),
    __dirname, console: { log() {}, error() {}, warn() {} },
    process: { env: { ANTHROPIC_API_KEY: 'test-key-only' }, exit: code => { throw new Error(`exit ${code}`); } },
    setTimeout: fn => fn(),
  });
  vm.runInContext(source.slice(0, source.lastIndexOf('main().catch')), context);
  return context;
}

test('classifier and weekly review construct native structured-output requests', async () => {
  const requests = [];
  const mocks = { './claude.js': { generateText: async params => {
    requests.push(params);
    return JSON.stringify(params.model.includes('haiku') ? { is_ai: true } : { schemaVersion: 1 });
  } } };
  const stories = loadPipeline('create_daily_stories.js', mocks);
  assert.equal(await vm.runInContext('isAIRelated("AI research")', stories), true);
  assert.equal(requests[0].model, 'claude-haiku-5-5');
  assert.equal(requests[0].thinking.type, 'disabled');
  assert.equal(requests[0].output_config.format.schema.properties.is_ai.type, 'boolean');
  assert.equal(typeof requests[0].system, 'string');
  const review = loadPipeline('propose_prompt_improvements.js', mocks);
  assert.equal((await vm.runInContext('callModel("Review these edits")', review)).schemaVersion, 1);
  assert.equal(requests[1].model, 'claude-opus-5-5');
  assert.equal(requests[1].thinking.type, 'adaptive');
  assert.ok(requests[1].output_config.format.schema.required.includes('proposals'));
});

test('digest uses Sonnet for both summaries and keeps good stories when discussion is refused', async () => {
  const requests = [];
  let output;
  const context = loadPipeline('create_daily_digest.js', {
    fs: {
      readFileSync: () => JSON.stringify([{
        id: 1, title: 'AI research', url: 'https://example.com/article', by: 'author',
        comments: [{ text: 'Interesting research.', by: 'reader' }],
      }]),
      writeFileSync: (_filename, body) => { output = body; },
    },
    axios: { get: async () => ({ data: '<body>Research article.</body>' }) },
    './claude.js': { generateText: async params => {
      requests.push(params);
      return requests.length === 1 ? 'A useful submission summary.' : extractText({ stop_reason: 'refusal' });
    } },
  });
  await vm.runInContext('main()', context);
  assert.equal(requests.length, 2);
  for (const request of requests) {
    assert.equal(request.model, 'claude-sonnet-5-5');
    assert.equal(request.thinking.type, 'adaptive');
    assert.equal(request.output_config.effort, 'medium');
    assert.equal(typeof request.system, 'string');
    assert.ok(request.messages.every(message => message.role === 'user'));
  }
  assert.match(output, /A useful submission summary\./);
  assert.doesNotMatch(output, /SKIP_STORY/);
});

test('Anthropic credit exhaustion aborts digest without writing output', async () => {
  let writes = 0;
  let calls = 0;
  const context = loadPipeline('create_daily_digest.js', {
    fs: {
      readFileSync: () => JSON.stringify([{ id: 1, title: 'AI', url: 'https://example.com', comments: [] }]),
      writeFileSync: () => { writes++; },
    },
    axios: { get: async () => ({ data: '<body>Article.</body>' }) },
    './claude.js': { generateText: async () => {
      calls++;
      throw Object.assign(new Error('Your credit balance is too low to access the Anthropic API.'), { status: 400 });
    } },
  });
  await assert.rejects(vm.runInContext('main()', context), /exit 1/);
  assert.equal(calls, 1);
  assert.equal(writes, 0);
});
