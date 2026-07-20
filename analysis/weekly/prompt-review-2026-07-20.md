<!-- MACHINE-STATE {"window":{"since":"2026-07-13","until":"2026-07-20"},"prCount":7,"editedPrCount":2,"submissionChanged":false,"discussionChanged":false} -->
# Weekly prompt review — 2026-07-13 to 2026-07-20

> Analysis only — no prompt change is proposed this week.

### Window and counts
- Window: 2026-07-11 to 2026-07-17
- PRs scanned: 2
- PRs with maintainer edits: 2
- Total discrete edit hunks: 2
- Distinct edited days: 2

### Patterns observed
| Section     | Category | Distinct days | Remedy route            | Qualifies for edit |
|-------------|----------|---------------|-------------------------|-------------------|
| STRUCTURAL  | F (LOW_QUALITY_DELETION) | 2 | NOT_PROMPT_ADDRESSABLE | No |

Evidence PRs: #1149, #1154

Example diff:
- Before: "### Microsoft latest report shows 25% emissions raised due to AI data centers" plus a submission summary body
- After: entire story block removed

### Proposed prompt changes
None. No recurring, prompt-addressable issues met the threshold.

### Why nothing else changed
- Low-quality/off-topic deletions (Category F, STRUCTURAL): The maintainer removed two entire stories (including the fixed title/metadata lines the pipeline prints). The deleted items (WindowsCentral emissions piece; ACM Queue MLOps paper) appear to have been editorial curation decisions rather than fixes to systematic prompt behavior. This is not prompt-addressable and does not warrant tightening language in either prompt.

### Pipeline recommendations
- None.

### Caveats
- Edits were whole-story removals, so motivation is inferred as editorial curation. No signs of prompt violations like preamble, refusals, or article-recap-in-discussion appeared in the provided diffs.

Guardrails preserved: yes
