<!-- arggon:generated template="AGENTS.md" -->
# AGENTS.md

For humans and AI agents working on **opencode-scheduled-tasks**. Work items live in-tree under `ArggonManager/`, managed by `arggon`; GitHub is for PRs only — never open GitHub issues.

> **Use the `arggon-cli` skill by default** (`.agents/skills/arggon-cli/SKILL.md`): contract, claims, pitfalls. OpenCode V2's native `arggon` tools and `/arggon-*` commands ship with its seam (`arggon init` default); without it the CLI alone is complete.

## Task workflow

1. **Find work:** `/arggon-next` (`tools.arggon.next`); `arggon list --status todo --json` for a scan.
2. **Claim first:** `/arggon-start <id>` or `tools.arggon.start({ id, assignee })`; never steal a claim.
3. **One branch per item:** `feat/<id>` / `fix/<id>` in `../<repo>-<id>`, not the primary checkout.
4. Open a small PR referencing the item id; reap merged worktrees with `tools.arggon.cleanup({ prune: true })`.
5. **Done** = acceptance checklist complete + item `done` + PR merged. **Never reopen** `done`/`cancelled`; follow-ups via `tools.arggon.create`.

### Orchestration

Delegated by default: the **delivery lead** assigns each item to a subagent (one per worktree), planning waves by file-disjointness, and **code-reviews every subagent change against the project's own bar** before merge — green CI is necessary, not sufficient. Verdicts land on the item via `tools.arggon.comment` — never as GitHub PR comments. Subagents follow the same rules and report findings to the delivery lead instead of filing tracker items.

## Docs & gates

Read before changes: [`ArggonManager/docs/convention.md`](ArggonManager/docs/convention.md) — work-loop parity, authority asymmetric and named (ADR 0021 §1) — [`ArggonManager/docs/engineering.md`](ArggonManager/docs/engineering.md), [`ArggonManager/docs/deploy.md`](ArggonManager/docs/deploy.md), `ArggonManager/docs/playbooks/` (`arggon playbook status`), [`CONTRIBUTING.md`](CONTRIBUTING.md). Keep `arggon validate` green before every commit and in CI.
