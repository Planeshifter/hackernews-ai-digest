<!-- MACHINE-STATE {"window":{"since":"2026-08-03","until":"2026-08-10"},"prCount":8,"editedPrCount":4,"submissionChanged":false,"discussionChanged":false} -->
# Weekly prompt review — 2026-08-03 to 2026-08-10

> Analysis only — no prompt change is proposed this week.

### Summary for 2026-08-03 to 2026-08-07
- PRs scanned: 4
- PRs with maintainer edits: 4
- Total edit hunks: 10 (entire-story deletions)
- Distinct edited days: 3

### Patterns observed
| Pattern | Section | Category | Distinct days | Remedy route | Qualifies for prompt edit |
|---|---|---:|---:|---|---|
| Repeated whole-story deletions (both submission and discussion removed) | STRUCTURAL | LOW_QUALITY_DELETION | 3 | NOT_PROMPT_ADDRESSABLE | No |

Example diff snippet:
- Before: "### Predictive Speculative KV Replication for Bursty LLM Inference" … (submission + discussion blocks)
- After: story block removed entirely

Evidence PRs: #1172, #1171, #1176, #1177

### Proposed prompt changes
None. The week’s edits reflect editorial selection (dropping entire stories), not a consistent, prompt-addressable behavior in either the submission or discussion generators. No guardrail issues or recurring style/format problems surfaced in the remaining content.

### Why nothing else changed
- Below threshold / editorial: All edits were complete removals of stories across multiple days. These are upstream curation choices (e.g., relevance, duplication, length), which prompts cannot infer or prevent.
- Already forbidden: No instances of preamble/scaffolding, headers, or article-recap-in-discussion were observed in the retained content; nothing suggested a guardrail wording gap.
- Ambiguous attribution: Whole-story deletions necessarily span both sections, giving no isolated signal to change just one prompt.

### Pipeline recommendations
- Consider an upstream curation pass (pre-generation allow/deny list) so low-priority or off-theme stories are excluded before model inference, reducing churn and token spend.
- Provide a simple maintainer-side skip file (by HN item ID) to prevent recurring inclusions of stories already deemed out-of-scope in a given window.

### Caveats
- Diffs were dominated by entire-story removals, limiting granular insight into per-section behavior.
- No evidence of prompt noncompliance; thus, conservative no-change is appropriate this week.

Guardrails preserved: yes
