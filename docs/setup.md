# Digest pipeline setup

The generation scripts call Anthropic directly using `ANTHROPIC_API_KEY`.
Add that name as a GitHub Actions repository secret for the daily digest and
weekly prompt-review workflows.

If the key works across multiple workspaces, also set `ANTHROPIC_WORKSPACE_ID`
in `.env` locally and as a GitHub Actions repository secret. Find the ID in
Claude Console under Settings → Workspaces. The scripts send it as the
`anthropic-workspace-id` header. Workspace-scoped keys don't need this setting.

The defaults use the latest Haiku, Sonnet, and Opus releases as of October 12,
2026, verified against [Anthropic's model catalog](https://platform.claude.com/docs/en/models/overview):

| Task | Model |
| --- | --- |
| AI story classification | `claude-haiku-5-5` |
| Submission and discussion summaries | `claude-sonnet-5-5` |
| Weekly prompt review | `claude-opus-5-5` |

To generate a digest locally, use Node.js 20.12 or later, install dependencies
with `npm ci`, and put `ANTHROPIC_API_KEY=your-key` in the repository's root
`.env` file (or export it in your shell). Then run:

```sh
node scripts/create_daily_stories.js
node scripts/create_daily_digest.js
```

The scripts automatically load the root `.env` file. Existing shell and GitHub
Actions variables take precedence. `.env` is ignored by git. Story collection
writes `data/stories.json`, and digest generation writes yesterday's
UTC edition to `data/digest_YYYY-MM-DD.md`.

The weekly prompt-review workflow also needs the existing GitHub token. Its
prompt guardrails and human review process remain in place.

Run integration checks without API credentials using:

```sh
node --test scripts/claude.test.js
node scripts/guardrails.js
```
