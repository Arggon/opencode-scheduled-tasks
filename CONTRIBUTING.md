<!-- arggon:generated template="CONTRIBUTING.md" -->
# Contributing to opencode-scheduled-tasks

Thanks for helping. Work is tracked in-tree under `ArggonManager/` (Markdown work items managed by `arggon`) — GitHub is used for PRs only.

## Getting started

1. Read [`AGENTS.md`](AGENTS.md) — the task workflow for humans and agents alike.
2. Find a claimable item: `arggon list --status todo --json`.
3. Claim it: `arggon update <id> --status in_progress --assignee <your-login>`. Never steal a claim.

## Branches

One branch per work item, generated from the item id:

- `arggon branch <id>` — follows the configured patterns in `ArggonManager/.convention.yml`.
- Defaults: `feat/<id>`, `fix/<id>`, `docs/<id>`, `chore/<id>`.
- Keep PRs small and focused; one concern per PR when possible.

## Commits

- Imperative mood, scoped prefix when useful: `feat: …`, `fix: …`, `docs: …`, `chore: …`, `test: …`.
- Reference the work item id in the commit body when it stands alone.

## Pull requests

- Reference the work item id in the PR title or body; move the item to `done` only when the PR fully finishes it.
- Update docs in the same PR as the change they describe.

### PR checklist

- [ ] Linked work item from `ArggonManager/` (or a clear docs-only / chore reason)
- [ ] Tests pass locally (`npm test` or the project equivalent)
- [ ] Docs updated in the same PR when behavior changed
- [ ] PR references the work item id

## Reporting bugs and filing work

File work items in the tree, not on GitHub: `arggon create bug "<title>" --parent <story-id>`. See [`ArggonManager/docs/tracking.md`](ArggonManager/docs/tracking.md) for how tracking works in this repo.

<!--
Copyright 2026 opencode-scheduled-tasks contributors
-->
