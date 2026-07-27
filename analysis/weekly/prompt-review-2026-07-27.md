<!-- MACHINE-STATE {"window":{"since":"2026-07-20","until":"2026-07-27"},"prCount":7,"editedPrCount":3,"submissionChanged":false,"discussionChanged":false} -->
# Weekly prompt review — 2026-07-20 to 2026-07-27

> Analysis only — no prompt change is proposed this week.

### Window and counts
- Window: 2026-07-19 to 2026-07-24
- PRs scanned: 3
- PRs with edits: 3
- Total edit hunks: 3
- Distinct days with edits: 3

### Patterns observed
| Pattern | Section attribution | Category | Distinct days | Remedy route | Qualifies for prompt edit? |
|---|---|---|---:|---|---|
| Whole-story deletions of specific items (both submission and discussion removed) | AMBIGUOUS (entire story blocks) | F — LOW_QUALITY_DELETION (editorial selection) | 3 | NOT_PROMPT_ADDRESSABLE | No |

Examples/evidence:
- PR #1159: Removed entire "Qwen 3.8" story (tweet-based source; discussion veered into geopolitics)
- PR #1161: Removed entire "Oh-my-pi: A coding agent with the IDE wired in" (low-score thread)
- PR #1163: Removed entire "AI bet goes awry: Oracle fires 21,000 employees" (aggregator link; contested premise)

Short diff illustration:
- Before: story block with submission summary + discussion bullets
- After: story block omitted entirely

### Proposed prompt changes
None. The edits reflect upstream curation/selection rather than fixable prompt behavior. No recurring formatting, refusal, recap-in-discussion, or style issues were edited in-place this week.

### Why nothing else changed
- Edits were whole-story removals driven by taste/selection (category F). These are not prompt-addressable.
- Attribution is AMBIGUOUS for section-specific remedies because both submission and discussion content were deleted together; even so, the underlying action is editorial curation, not model behavior.
- No evidence of preamble/scaffolding, format normalization, article-recap-in-discussion, or factual fixes that recurred across days.

### Pipeline recommendations
- Consider tightening upstream story selection heuristics (e.g., minimum points/comments thresholds) to reduce later human deletions of low-signal or thin items.
- Prefer canonical sources over aggregator or social media links when multiple URLs exist for the same story; optionally deprioritize aggregator domains (e.g., MSN) and tweet-only announcements unless they include substantive details.

### Caveats
- Diffs only showed deletions, so section-level attribution is necessarily ambiguous.
- With only three edit hunks and all being editorial removals, there is insufficient signal to justify prompt wording changes.

Guardrails preserved: yes
