<!-- MACHINE-STATE {"window":{"since":"2026-08-17","until":"2026-08-24"},"prCount":5,"editedPrCount":1,"submissionChanged":false,"discussionChanged":false} -->
# Weekly prompt review — 2026-08-17 to 2026-08-24

> Analysis only — no prompt change is proposed this week.

### Window and counts
- Window: 2026-08-16 to 2026-08-22
- PRs scanned: 1
- PRs with maintainer edits: 1
- Total edited items: 1 (one whole-story deletion)
- Distinct days with edits: 1

### Observed edit patterns
| Pattern | Section | Category | Distinct days | Route | Qualifies for prompt edit |
|---|---|---|---:|---|---|
| Removal of a non-AI story (Tidal Cycles live-coding) | STRUCTURAL | G — OFF_TOPIC_DELETION | 1 | NOT_PROMPT_ADDRESSABLE | No |

Example diff snippet:
- Before: "### Tidal Cycles – Live coding music..." plus a product summary paragraph and a separate paragraph clearly summarizing HN comments about Strudel and setup friction.
- After: Entire story (title, metadata, submission summary, and discussion summary) removed.

### Proposed prompt changes
None. The single observed change was an editorial deletion for off-topic content and does not reflect a systematic, prompt-addressable behavior.

### Why nothing else changed
- Below threshold: Only one PR/day showed edits; no recurrence across days.
- Not prompt-addressable: The deletion reflects curation of AI relevance, not a formatting or content error the prompts could infer. Both prompts already obey the required guardrails and there was no evidence of refusals, placeholders, preamble/scaffolding, formatting violations, discussion recapping the article, or style problems driving edits.
- Ambiguity avoided: The removed block contained both SUBMISSION and DISCUSSION sections; attributing it to either prompt would be inappropriate.

### Pipeline recommendations
- Strengthen upstream selection to exclude non-AI stories before they reach the digest (e.g., a lightweight topic filter keyed to AI/ML terms or a manual pre-triage step). This will prevent whole-story deletions like the Tidal Cycles item.

### Caveats
- Very small sample (one edit on one day), so confidence is low and we should wait for additional evidence before contemplating any prompt adjustments.

Guardrails preserved: yes
