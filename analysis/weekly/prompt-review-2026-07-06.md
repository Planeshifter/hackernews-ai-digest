<!-- MACHINE-STATE {"window":{"since":"2026-06-29","until":"2026-07-06"},"prCount":10,"editedPrCount":7,"submissionChanged":false,"discussionChanged":false} -->
# Weekly prompt review — 2026-06-29 to 2026-07-06

> Analysis only — no prompt change is proposed this week.

### Window and counts
- Window: 2026-06-24 to 2026-07-03
- PRs scanned: 7
- PRs with edits: 7
- Total edit hunks observed: ~18
- Distinct digest days affected: 7

### Patterns observed
| Category | Section | Distinct days | Remedy route | Qualifies for prompt edit? |
|---|---|---:|---|---|
| PREAMBLE_SCAFFOLDING (banners, “Here is a summary…”, emoji headers, dividers) | DISCUSSION | 4+ | ALREADY_FORBIDDEN | No |
| ARTICLE_RECAP_IN_DISCUSSION (recapping the submission in the HN comments section) | DISCUSSION | 2 | ALREADY_FORBIDDEN | No |
| FORMAT_NORMALIZATION (restated headline as first line of body) | SUBMISSION | 5 | ALREADY_FORBIDDEN | No |
| MODEL_REFUSAL (“I don’t see the submission… please share…”, sample format) | SUBMISSION | 1 | ALREADY_FORBIDDEN | No |
| ERROR_PLACEHOLDER (provider 402/credit errors surfaced verbatim) | SUBMISSION | 1 | ALREADY_FORBIDDEN | No |
| STYLE_TIGHTENING (minor wording like “on Hacker News”) | DISCUSSION | 2 | NOT_PROMPT_ADDRESSABLE | No |

### Evidence by pattern
- PREAMBLE_SCAFFOLDING — DISCUSSION
  - Evidence PRs: #1135 (2026-06-28), #1133 (2026-06-26), #1138 (2026-07-01)
  - Example diff: "- Here is a summary of the Hacker News discussion…" → (removed); "- ***" / "### Daily Digest…" → (removed)
  - The DISCUSSION prompt already bans preambles, banners, and headers.

- ARTICLE_RECAP_IN_DISCUSSION — DISCUSSION
  - Evidence PRs: #1135 (2026-06-28), #1133 (2026-06-26)
  - Example diff: "- The Submission: …" recap paragraphs → (removed)
  - The DISCUSSION prompt already says “Summarize ONLY the discussion — NEVER recap the article or the submission itself.”

- FORMAT_NORMALIZATION (restated title) — SUBMISSION
  - Evidence PRs: #1135 (nanoeuler), #1134 (DSpark), #1131 (Overparameterization), #1138 (Claudoro), #1137 (Claude Desktop)
  - Example diff: "- nanoeuler: a GPT‑2‑class LLM built entirely from scratch in C/CUDA" → (removed)
  - The SUBMISSION prompt already says “Do NOT restate the title… Your first sentence must ADD something the title does not already say.”

- MODEL_REFUSAL — SUBMISSION
  - Evidence PR: #1137 (2026-06-30)
  - Example diff: "- I don’t see the submission to summarize. Please share…" and “Sample output format I’ll use:” → (removed)
  - The SUBMISSION prompt already forbids asking for content and specifies SKIP_STORY for unusable inputs.

- ERROR_PLACEHOLDER — SUBMISSION
  - Evidence PR: #1138 (2026-07-01)
  - Example diff: "*Unable to generate AI summary: 402 This request requires more credits…*" printed as body → (removed/trimmed)
  - These are pipeline/provider errors; the prompt cannot prevent them.

- STYLE_TIGHTENING — DISCUSSION
  - Evidence PRs: #1135, #1138
  - Example diff: "Here are the key takeaways from the discussion:" → "Here are the key takeaways from the discussion on Hacker News:"
  - Editorial taste; not something a prompt can or should force.

### Proposed prompt changes
None. Both prompts already contain explicit guardrails against every recurring issue observed: preambles/banners, restating titles, asking for inputs/refusals, and (for DISCUSSION) recapping the article. The week’s diffs indicate enforcement and pipeline hygiene needs, not wording gaps.

### Why nothing else changed
- Below threshold or one-off: MODEL_REFUSAL and ERROR_PLACEHOLDER appeared on a single day each; changing prompts for these would be overfitting.
- Already forbidden by current prompts: preambles/banners, repeated titles, and article recaps in the discussion section are clearly and repeatedly banned in the existing prompts.
- Not prompt-addressable/taste: minor style tweaks (“on Hacker News”) reflect editor preference and vary by item; enforcing such micro-style via prompts risks collateral rigidity.

### Pipeline recommendations
- Add a deterministic post-filter to strip common preambles/banners/dividers in both sections:
  - Remove lines starting with or containing: “Here is a summary…”, “Here is your daily digest…”, “Hacker News Daily Digest”, “The TL;DR:”, “The Submission:”, “The Context:”. Also strip leading/trailing emoji banners, “***”, and any residual “#/##/###” headers in the body.
- Enforce “no restated title” in SUBMISSION output:
  - If the first non-empty line equals or closely matches the story title (case/ punctuation-insensitive), delete that line and trim extra blank lines.
- Detect DISCUSSION article recap leakage:
  - Heuristics: flag lines that begin with “The Submission:”, “The article”, or that directly copy the submission’s first sentence; either drop them or fail the generation and retry.
- Handle refusals and provider errors robustly:
  - If body contains refusal patterns (“I don’t see the submission…”, “Please share…”, “Sample output format I’ll use”), or provider errors (“Unable to generate AI summary: 402…”, “max_tokens/credits”), replace the section with SKIP_STORY or automatically retry with a fallback model/provider.
- Input integrity check:
  - Ensure the model always receives the title and metadata; refusals suggesting missing context likely indicate an upstream payload issue.

### Caveats
- Some diffs include long deletions that combine multiple issues (preamble plus article recap) making per-line attribution approximate; nonetheless, the direction is consistent and already covered by guardrails.
- One edit showed a stray “-” bullet artifact after cleanup; assumed to be a manual cleanup quirk, not a systematic model behavior.

Guardrails preserved: yes
