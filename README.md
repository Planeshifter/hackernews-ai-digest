# Hacker News AI Digest

Daily Digest of Hacker News submissions related to AI.

## AI models

All model requests use OpenRouter through the OpenAI SDK, authenticated with
`OPEN_ROUTER_API_KEY`. Model IDs are pinned so upgrades are deliberate.

| Task | OpenRouter model | Reasoning effort |
| --- | --- | --- |
| Classify AI-related titles | `openai/gpt-6-luna` | None (50-token structured JSON response) |
| Summarize linked submissions | `openai/gpt-6-luna` | Medium |
| Summarize HN discussions | `google/gemini-3.8-flash` | Medium |
| Weekly prompt improvement proposals | `openai/gpt-6-luna` | Medium |

Pricing checked September 27, 2026, in USD per million uncached input/output tokens:

- [GPT-6 Luna](https://openrouter.ai/openai/gpt-6-luna): $0.10 / $0.50,
  down from $1.25 / $10 for GPT-5 and GPT-5.1 (92% / 95% lower token rates).
- [Gemini 3.8 Flash](https://openrouter.ai/google/gemini-3.8-flash): $0.75 / $3.75
  at the current 50% promotional discount, down from $2 / $12 for Gemini 3.1 Pro
  Preview (62.5% / 68.75% lower token rates). Its listed undiscounted rates are
  $1.50 / $7.50, still below the previous model.

Actual spending depends on token usage, including billed reasoning tokens,
caching, and provider pricing. Token-rate savings do not establish equivalent
editorial quality; compare generated drafts before relying on the new defaults.
