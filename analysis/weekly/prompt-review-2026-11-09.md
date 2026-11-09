<!-- MACHINE-STATE {"window":{"since":"2026-11-02","until":"2026-11-09"},"prCount":8,"editedPrCount":7,"submissionChanged":false,"discussionChanged":false} -->
# Weekly prompt review — 2026-11-02 to 2026-11-09

> Analysis only — no prompt change is proposed this week.

### Window and counts
- Window: 2026-11-02 to 2026-11-08 (merge dates); digests covered 2026-10-30 to 2026-11-06.
- PRs scanned: 7 (#1268, #1269, #1271, #1273, #1274, #1275, #1276).
- PRs with edits: 7.
- Total edit hunks: 11, removing 17 whole stories. No hunk edited, rewrote, or added a line inside a kept story.
- Distinct merge days: 3 (11-02, 11-05, 11-08). Distinct digest days touched: 7.
- No prompt-injection content was found in the diffs.

### Patterns
| Pattern | Section | Category | Distinct days | Route | Qualified |
|---|---|---|---|---|---|
| Whole-story deletion of well-formed, substantive entries (bootgpt, watermarking, Claude Code backdoor, satire letter, spinf-serve, Uncracked City, METR assessment, offline survival kit, MCP redirect URIs, AegisKernel, Agentic Identity Broker, agent-setups tally) | STRUCTURAL | F | 6 | NOT_PROMPT_ADDRESSABLE | no |
| Whole-story deletion of thin-source entries whose summary said the page did not load (Interactive notes, Muse, Microsoft-Oracle, SketchAgentBench) | SUBMISSION | J | 3 | NOT_PROMPT_ADDRESSABLE | no |

### Proposed prompt changes
None.

### Why nothing else changed
- **Whole-story deletions (F).** All 17 removed entries respected the output contract. None had a preamble, banner, divider, # header, refusal, placeholder, or article recap in the discussion section. Several were among the strongest entries of the week, including the 961-point backdoor story and the detailed bootgpt and METR write-ups. The maintainer removed them as complete units, so these are selection or taste calls about which stories to include. A generation prompt sees one story at a time and cannot make that call.
- **Thin-source deletions (J).** Four deleted entries ran on missing article text: #1271 (11-01), #1273 (11-03) and #1276 (11-06, twice). They clear the days gate, but the direction is not consistent. The maintainer deleted rich-source stories at the same rate, and kept thin items appear elsewhere in the same digests. Because each story was deleted whole, we cannot tell whether the source handling caused the deletion. Telling the model to emit SKIP_STORY more aggressively on thin sources would contradict the deliberate thin-source instructions and could suppress stories the maintainer keeps. Left alone; worth watching.
- **First-person meta lines** ("so I can't say…", "I can't speak to how it ends") appear in several deleted submission summaries. The current prompt already bans meta-commentary, so this is already forbidden. The maintainer never edited these lines directly; they only went away when their stories were deleted. That is not evidence of a wording gap. It is noted under pipeline recommendations.
- **Discussion prompt.** No hunk touched discussion text alone, so there is no discussion evidence at all.

### Pipeline recommendations
- Story selection is where the maintainer's effort goes. Consider an upstream relevance and quality gate, or a per-day story cap, before generation.
- When the article fetch fails or returns empty, flag the story in the PR description so the maintainer can triage it quickly. This avoids changing prompt behavior.
- Optionally extend the deterministic post-filter to flag first-person meta sentences in submission output ("I can't say", "I can't speak to"). These are already forbidden by the prompt.

### Caveats
- Whole-story deletions span both sections, so they cannot be attributed to either prompt.
- The sample is small, and every edit was a deletion. The deletions carry no information about what was wrong with each story, if anything.
- No prior reports exist to compare against.

Guardrails preserved: yes
