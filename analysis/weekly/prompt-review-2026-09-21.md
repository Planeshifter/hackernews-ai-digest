<!-- MACHINE-STATE {"window":{"since":"2026-09-14","until":"2026-09-21"},"prCount":12,"editedPrCount":4,"submissionChanged":false,"discussionChanged":false} -->
# Weekly prompt review — 2026-09-14 to 2026-09-21

> Analysis only — no prompt change is proposed this week.

### Window and counts
- Window: 2026-09-14 to 2026-09-20
- PRs scanned: 4
- PRs with maintainer edits: 4
- Total edit hunks: ~13 (entire-story removals)
- Distinct days touched (by digest date): 4

### Patterns observed
| Pattern | Section | Category | Distinct days | Remedy route | Qualifies for edit |
|---|---|---|---:|---|---|
| Entire-story removals (AI-relevant items trimmed) | AMBIGUOUS | F: LOW_QUALITY_DELETION | 4 | NOT_PROMPT_ADDRESSABLE | No |

Example diff:
- Before: `### Show HN: Self-hosted company OS, Claude Code and Codex agents in departments` … (submission + discussion blocks)
- After: story block removed entirely

Evidence PRs: #1216, #1222, #1224, #1225

### Proposed prompt changes
None. No consistent, prompt-addressable behavior was corrected by the maintainer; edits were selective removals of whole stories across multiple days.

### Why nothing else changed
- Entire-story deletions across multiple PRs appear to be editorial curation (length/selection), not formatting, refusal, or summary-quality violations tied to a specific prompt. This is not prompt-addressable.
- No instances of preamble/scaffolding, headers, article-recap in discussion, or other guardrail breaches were independently edited within a story while leaving the other section intact; most removals were wholesale, making attribution ambiguous and unsuitable to drive prompt changes.

### Pipeline recommendations
- None. The observed edits reflect human editorial selection rather than enforceable formatting or guardrail issues.

### Caveats
- Many edits removed entire story blocks (including both submission and discussion), making per-section attribution inherently ambiguous. Out of caution, no prompt tweaks were inferred from such deletions.

Guardrails preserved: yes
