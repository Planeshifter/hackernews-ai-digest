<!-- MACHINE-STATE {"window":{"since":"2026-07-06","until":"2026-07-13"},"prCount":8,"editedPrCount":4,"submissionChanged":false,"discussionChanged":false} -->
# Weekly prompt review — 2026-07-06 to 2026-07-13

> Analysis only — no prompt change is proposed this week.

### Window and counts
- Window: 2026-07-05 to 2026-07-11
- PRs scanned: 4
- PRs with maintainer edits: 4
- Total edit hunks observed: 4
- Distinct edit days: 4

### Patterns observed
| Category | Section | Remedy route | Distinct days | Qualifies for prompt edit? |
|---|---|---|---:|:--:|
| I. STYLE_TIGHTENING (removed bold lede clause) | SUBMISSION | NOT_PROMPT_ADDRESSABLE | 1 | No |
| D. FORMAT_NORMALIZATION (insert blank line before bullet list) | DISCUSSION | NOT_PROMPT_ADDRESSABLE | 2 | No |
| F. LOW_QUALITY_DELETION (entire minor Show HN story removed) | STRUCTURAL | NOT_PROMPT_ADDRESSABLE | 1 | No |

#### Evidence and examples
- STYLE_TIGHTENING (SUBMISSION) — PR #1143 (2026-07-07)
  - Before: "**An append-only event log is the source of truth...** ... yields:"
  - After:  "An append-only event log is the source of truth... ... yields:"
  - Consistent direction? Single occurrence only.

- FORMAT_NORMALIZATION (DISCUSSION) — PRs #1144 (2026-07-08), #1145 (2026-07-10)
  - Before: paragraph immediately followed by "- **Hardware in disasters:** ..."
  - After:  a blank line inserted before the first bullet.
  - Repeats across two distinct days, but it's a pure formatting tidy, not content or scope.

- LOW_QUALITY_DELETION (STRUCTURAL) — PR #1148 (2026-07-11)
  - Entire "Show HN: SubjectiveZero..." story (submission + short discussion) removed from the digest.
  - Editorial curation/selection, not something a prompt can infer.

### Proposed prompt changes
None. No recurring, prompt-addressable behavior met the threshold (>=2 distinct days with a consistent, content-related pattern tied to a specific prompt section). The observed edits were formatting preferences and one editorial removal.

### Why nothing else changed
- STYLE_TIGHTENING (removed bold lede clause): Below threshold and a taste call. The current Submission prompt explicitly allows bolding the load-bearing lede; a single removal does not justify weakening that guidance.
- FORMAT_NORMALIZATION (blank line before bullets): Formatting-only adjustment across two days; better handled by a formatter/post-processor than by constraining the writing prompts.
- LOW_QUALITY_DELETION (whole-story cut): Editorial selection (low points/comments); not prompt-addressable.

### Pipeline recommendations
- Add a Markdown formatting pass to ensure a blank line between paragraphs and bullet lists, matching the maintainer’s edits.
- If desired, enforce upstream selection thresholds (e.g., minimum points/comments) to reduce later whole-story deletions of low-traction items.

### Caveats
- Diffs are limited; attribution of the whole-story deletion spans both sections, so treated as structural/editorial.
- With only one instance of bold removal, it is not clear there is a stable house style change.

Guardrails preserved: yes
