<!-- MACHINE-STATE {"window":{"since":"2026-10-19","until":"2026-10-26"},"prCount":7,"editedPrCount":4,"submissionChanged":false,"discussionChanged":false} -->
# Weekly prompt review — 2026-10-19 to 2026-10-26

> Analysis only — no prompt change is proposed this week.

### Window and counts

- Window: merges 2026-10-19 to 2026-10-23 (digests dated 2026-10-15, 2026-10-18, 2026-10-19, 2026-10-21).
- PRs scanned: 4. PRs with edits: 4.
- Total edits: 7 diff hunks, removing 11 complete stories. No line-level edits were made inside any retained story.
- Distinct days: 4 digest days across 3 distinct merge days.

### Pattern table

| Pattern | Section | Category | Distinct days | Route | Qualified |
|---|---|---|---|---|---|
| Whole-story deletion of fluent, well-formed, low-engagement stories | STRUCTURAL (whole story) | F | 4 | NOT_PROMPT_ADDRESSABLE | No |

### Proposed prompt changes

None.

### Why nothing else changed

- **No refusal, error, or scaffolding signal (A/B/C).** I read every deleted story in full. Each one contains a complete, on-contract submission summary and, in all but one case, a discussion summary. There are no refusals, placeholders, preambles, banners, dividers, or body headers. The deletions are not repairs of broken output.
- **Pattern F, editorial selection.** The deleted stories are:
  - Aidlc (26 pts)
  - Microsoft pre-training (43 pts)
  - Human-like chess bot (32 pts)
  - Cairn (29 pts)
  - Speculative decoding (50 pts)
  - Company World Models (25 pts)
  - KiviDB (68 pts)
  - Netflix VMAF (25 pts)
  - 500 clocks (72 pts)
  - Trail of Bits regressions (53 pts)
  - On-phone 2B agent (15 pts)
- **Low engagement is the shared trait.** All 11 stories sit at or below 72 points, and most have 4 to 29 comments. By contrast, adjacent retained stories visible in diff context have 153 to 508 points. This looks like the maintainer trimming the digest to its strongest stories, which is an upstream selection or taste decision. No wording change in either generation prompt could make the model decide whether a story belongs in the digest. Both prompts only ever see one story.
- **Not off-topic (G).** Nearly all deleted stories are clearly AI-related. A couple are borderline: VMAF (perceptual metric) and KiviDB (vector cache). Two borderline cases do not form a consistent topical-filter signal.
- **Cases that could not be counted as evidence:**
  - The chess-bot submission includes first-person meta-commentary: "(I've matched these to the capability headers... the alignment slightly uncertain.)" It also includes a Markdown table.
  - The clocks submission says "the page text I had doesn't show...".
  - These are mild tells, and the existing "no meta-commentary" rule already forbids them. More importantly, the human deleted these stories whole rather than editing those lines, so the deletion cannot be attributed to these sentences. Each appeared once. They do not meet the recurrence gate, and the behavior is already forbidden.
- **No prompt injection** was detected in the diff content.

### Pipeline recommendations

1. **Consider a points and comment-count floor upstream.** Every deletion this week fell below roughly 75 points. The maintainer should confirm whether this is an intentional curation rule before it is codified. Retained low-point stories may exist outside the visible diff context.
2. **Consider a per-digest story cap ranked by engagement,** if the maintainer's goal is a shorter digest.
3. **Optionally add a post-filter flag for first-person source-access meta-commentary,** such as "the text I had" or "I've matched". This would be a review hint, not an auto-delete.

### Caveats

- Only diff context is visible, so I cannot see the full set of retained stories or their point counts. The engagement threshold is therefore an inference.
- Deletion-only weeks provide no signal about wording quality, positive or negative.

Guardrails preserved: yes
