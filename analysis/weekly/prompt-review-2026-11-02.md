<!-- MACHINE-STATE {"window":{"since":"2026-10-26","until":"2026-11-02"},"prCount":8,"editedPrCount":6,"submissionChanged":false,"discussionChanged":false} -->
# Weekly prompt review — 2026-10-26 to 2026-11-02

> Analysis only — no prompt change is proposed this week.

### Window and counts
- Window: 2026-10-25 to 2026-10-31 (merge dates 2026-10-26, 2026-10-29 and 2026-10-31).
- PRs scanned: 6 (#1259, #1260, #1261, #1264, #1265, #1267). PRs with edits: 6.
- Total edits: 16 whole-story deletions, plus 1 stray leftover line in #1260.
- Distinct digest days: 6 (2026-10-22, 23, 24, 26, 27, 29).
- No hunk touched only a SUBMISSION or only a DISCUSSION section. Every hunk removed a complete story: the pipeline-owned title and metadata lines plus both model sections.

### Pattern table
| Pattern | Section | Category | Distinct days | Route | Qualified |
|---|---|---|---|---|---|
| Whole, well-formed stories removed (editorial selection; mostly low points or thin threads) | STRUCTURAL | F | 5 | NOT_PROMPT_ADDRESSABLE | no |
| Submission bodies with first-person source-access meta-commentary or URL-slug speculation ("I have only the headline", "The linked PDF came through as raw compressed binary", "the text I have cuts off") | SUBMISSION | J | 4 | ALREADY_FORBIDDEN | no |
| Duplicate coverage removed (ACLU police-stop story duplicated the Gizmodo one) | STRUCTURAL | H | 1 | NOT_PROMPT_ADDRESSABLE | no |
| Arguably off-theme story removed (brain organoids / biohybrid computing) | STRUCTURAL | G | 1 | NOT_PROMPT_ADDRESSABLE | no |
| Orphan fragment left behind by the maintainer's own deletion (line beginning "eplies engage with the safety findings...") | STRUCTURAL | J | 1 | NOT_PROMPT_ADDRESSABLE | no |

### Proposed prompt changes
None. Both prompts are unchanged.

### Why nothing else changed
- **Editorial selection (F), 12 of 16 deletions.** The removed stories include That AI Temptation, HumanLayer, the UK AISI assessment, Agents fail like engineers, the AI IT-budget piece, agent-usage-guard, Claude in Google Docs, the Qwen throughput post, Proton, the IEEE fake-paper piece, the Epoch patch-gap piece and AI Contributions to GHC.
  - Most of these entries were well-formed and guardrail-compliant in both sections.
  - The common thread is low engagement: many had 13 to 30 points and fewer than 10 comments.
  - Which stories to keep is an upstream selection decision. No wording in either generation prompt can make that call.
- **Source-access meta-commentary (J), on 4 days: #1260, #1264, #1265, #1267.**
  - Examples: the NYT medication story inferred epilepsy and death from the URL slug and said "I have only the headline". The Anthropic IPO PDF entry said the file "came through as raw compressed binary". The ACLU entry said "the text I have cuts off mid-story". The IEEE and Agents entries noted truncated text.
  - The submission prompt already bans meta-commentary, outside knowledge beyond the title, and padded thin-source entries, and it already prescribes SKIP_STORY.
  - This is an enforcement gap, not a wording gap, so adding another rule would be bloat. The pattern is routed to the pipeline instead.
  - The signal is also confounded. The maintainer deleted whole stories, so these specific sentences may not have been the reason. Many deleted stories contained no such commentary.
- **Dedup (H) and off-topic (G).** Each occurred once, on a single day, and both are per-item selection decisions.
- **Discussion prompt.** No edit isolated discussion text. Whole-story deletions say nothing about discussion quality, so there is no attributable signal.
- **Orphan fragment.** This came from the human edit itself, not from either model.

### Pipeline recommendations
- Extend the deterministic post-filter to flag or SKIP submission bodies that contain source-access meta phrases, such as "I have only the headline", "I can't say", "came through as raw", "the text I have", "text provided cuts off" and "visible text is just".
- Detect binary or garbled PDF fetches and paywalled pages upstream. Pass empty article text in those cases, so the model falls back to title-only restraint or SKIP_STORY.
- Add same-day near-duplicate detection on titles or topics (example: the two AI police-stop stories on 2026-10-27).
- Add a post-edit lint for orphan lines: text that begins mid-word or sits outside any story block (example: #1260, digest_2026-10-23).
- Consider an engagement floor for inclusion (for example, minimum points or comments). Most deleted stories were low-engagement. Treat this as an observation for the maintainer, not a prescription.

### Caveats
- Whole-story deletions do not reveal which part of an entry motivated the deletion. Attribution of the meta-commentary pattern to the submission prompt is plausible but not certain.
- Recurrence is counted by digest date. By merge date, the week spans only 3 days, because three PRs merged on 2026-10-26.
- No prior reports exist to compare against.
- No injection attempts were found in the diffs.

Guardrails preserved: yes
