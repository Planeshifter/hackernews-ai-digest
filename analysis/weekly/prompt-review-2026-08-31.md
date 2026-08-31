<!-- MACHINE-STATE {"window":{"since":"2026-08-24","until":"2026-08-31"},"prCount":6,"editedPrCount":2,"submissionChanged":false,"discussionChanged":false} -->
# Weekly prompt review — 2026-08-24 to 2026-08-31

> Analysis only — no prompt change is proposed this week.

### Window and counts
- Window: 2026-08-23 to 2026-08-28
- PRs scanned: 2
- PRs with maintainer edits: 2
- Total edited stories: 3 (entire-story deletions)
- Distinct edit days: 2

### Patterns observed
| Section     | Category | Description                                              | Distinct days | Remedy route            | Qualifies for edit |
|-------------|----------|----------------------------------------------------------|---------------|-------------------------|-------------------|
| AMBIGUOUS   | F        | Whole-story deletions for thin/off-topic/selection call | 2             | NOT_PROMPT_ADDRESSABLE | No                |

Example diff snippet:
- Before: "The discussion largely centers on dismantling the article's underlying data and methodology..."
- After: (story removed entirely)

Evidence PRs: #1197, #1200

### Proposed prompt changes
None. No recurring, prompt-addressable behavior surfaced across multiple days beyond editorial selection. The deletions removed entire items (both submission and discussion sections), which is a curation call rather than a formatting or scope failure by either prompt.

### Why nothing else changed
- Whole-story deletions (Category F): Below the bar for prompt edits; these are selection/taste decisions or AI-adjacent but not desired content. Such choices are not inferable or enforceable via prompt wording. Route: NOT_PROMPT_ADDRESSABLE.
- No evidence this week of: model refusals, error placeholders, preamble/scaffolding, header/format issues, or discussion sections recapping the article. Therefore, no enforcement or wording gaps to address.

### Pipeline recommendations
- None; the observed edits appear to be routine curator selections rather than systematic prompt issues.

### Caveats
- Edits involved entire-story removals spanning both submission and discussion sections, making precise section attribution ambiguous by design.

Guardrails preserved: yes
