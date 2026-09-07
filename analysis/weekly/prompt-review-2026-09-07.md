<!-- MACHINE-STATE {"window":{"since":"2026-08-31","until":"2026-09-07"},"prCount":7,"editedPrCount":4,"submissionChanged":false,"discussionChanged":false} -->
# Weekly prompt review — 2026-08-31 to 2026-09-07

> Analysis only — no prompt change is proposed this week.

### Window and counts
- Window: 2026-08-28 to 2026-09-05
- PRs scanned: 4
- PRs with maintainer edits: 4
- Total edited items (story-level deletions observed): 9
- Distinct edit days: 4

### Observed edit patterns
| Category | Section | Distinct days | Remedy route | Qualifies for edit? |
|---|---|---:|---|---|
| F. LOW_QUALITY_DELETION (entire stories removed) | AMBIGUOUS (both sections removed together) | 4 | NOT_PROMPT_ADDRESSABLE | No |

Example evidence and minimal diff snippet:
- PR #1201: Entire story removed
  - Before: `### Identifying fake cosmetics using AI` … followed by both a submission summary and a discussion recap
  - After: Story block deleted in full
- PR #1207: `### AI is making back-office work extinct` — whole block deleted
- PR #1208: `### B200 Attention Kernel from Scratch...` and `### Qwen3.8-Max` — both blocks deleted
- PR #1209: `### Grok outage`, `### Three-LLM...`, `### Show HN: Real-time AI news aggregator` — all deleted

Short example diff (before → after):
- "### Identifying fake cosmetics using AI" + multi-paragraph submission and discussion → [entire story block removed]

These removals are consistent with editorial curation of which threads to include, not with fixing prompt-driven behaviors.

### Proposed prompt changes
None. No recurring, prompt-addressable behaviors were corrected by the maintainer. The edits were complete story deletions across both SUBMISSION and DISCUSSION sections, which are selection/taste decisions that a wording change cannot reliably preempt.

### Why nothing else changed
- Below threshold / not prompt-addressable: The only clear pattern was wholesale removal of entire stories across multiple PRs (categories F/G by effect). This reflects editorial selection (relevance, weight, space) rather than systematic prompt issues. There were no consistent edits to phrasing, structure, preambles, or article-vs-discussion scope that would justify adjusting either prompt.
- Already forbidden: No instances of preamble scaffolding, headers, or recap-in-discussion were selectively edited; therefore, no enforcement gap to address via prompt text.
- Ambiguous attribution: Because entire stories were cut, attribution to a single section (SUBMISSION vs DISCUSSION) is not possible and cannot justify section-specific prompt changes.

### Pipeline recommendations
- Consider an upstream selection filter (e.g., minimum points/comments thresholds, topic/keyword allowlist), or an editor-configurable exclude list, to reduce manual whole-story deletions.
- Optionally surface a lightweight pre-publish triage UI to batch-skip borderline stories before draft generation.

### Caveats
- Diffs show only removals; no granular, within-section edits to diagnose style or guardrail adherence.
- Attributions are necessarily AMBIGUOUS when entire stories are deleted.

Guardrails preserved: yes
