<!-- MACHINE-STATE {"window":{"since":"2026-08-10","until":"2026-08-17"},"prCount":8,"editedPrCount":7,"submissionChanged":false,"discussionChanged":false} -->
# Weekly prompt review — 2026-08-10 to 2026-08-17

> Analysis only — no prompt change is proposed this week.

### Window and counts
- Window: 2026-08-10 to 2026-08-16
- PRs scanned: 7
- PRs with maintainer edits: 7
- Total edited items (story deletions): 16
- Distinct edit days: 3 (2026-08-10, 2026-08-14, 2026-08-16)

### Patterns observed
| Section | Category | Distinct days | Remedy route | Qualifies for prompt edit? |
|---|---|---:|---|---|
| STRUCTURAL | F — LOW_QUALITY_DELETION (whole stories removed as thin/selection) | 3 | NOT_PROMPT_ADDRESSABLE | No |

Examples indicate the maintainer repeatedly removed entire stories (title, metadata, submission, and often discussion) across multiple PRs, typically lower-signal Show HN/product posts or miscellaneous items, consistent with manual curation rather than a prompt defect.

### Evidence and examples
- PRs: #1179, #1182, #1183, #1184, #1185, #1186, #1187
- Example diff snippet:
  - Before: "### Show HN: AI Pulse a fake LED strip beside the macOS Dock that shows agent status" … followed by a multi-paragraph submission and bullets.
  - After: Entire story block removed.

### Proposed prompt changes
None.
- No recurring, prompt-addressable issues were evident. Edits were wholesale removals reflecting editorial selection, not formatting, refusal, or discussion-vs-submission boundary problems. There were no consistent corrections to style, facts, or guardrail-violations that would justify prompt wording changes.

### Why nothing else changed
- Below threshold / editorial: The only recurring pattern was complete story deletions (Category F). This is selection, not something prompts can foresee or fix.
- Already forbidden: There were no cases of preamble/banners, format headers, or model refusals in the kept content that would suggest gaps in existing guardrails.
- Ambiguous attributions: In several deleted blocks, submission text flowed into what read like discussion summaries, but the entire stories were removed together, making it impossible to ascribe a consistent per-prompt fault. Regardless, those deletions were editorial and do not meet the recurrence gate for a prompt change.

### Pipeline recommendations
- Consider tightening upstream selection heuristics to match observed curation:
  - Apply a higher minimum points or comments threshold (e.g., deprioritize items < ~20 points or with very low comment counts) before generation.
  - Optionally down-rank or omit low-discussion Show HN/product announcements unless they surpass a higher engagement bar.
  - If desired, add a simple cap on total items per day to encourage keeping only higher-signal stories.

### Caveats
- Diffs showed only deletions; no targeted line edits to diagnose per-prompt behavior.
- Multiple PRs merged on the same day concentrate evidence; still, the pattern is clearly editorial.

Guardrails preserved: yes
