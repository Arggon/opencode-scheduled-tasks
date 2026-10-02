<!-- arggon:generated template="skills/arggon-cli/references/pitfalls.md" -->
# Pitfalls

Part of the `arggon-cli` skill (`SKILL.md`). Traps that have actually bitten
agents in this codebase — read before mutating the tracker or merging.

## Tracker and claims

- `update --labels a,b` **REPLACES** the label list (kebab-case, unique). Same for
  `--depends-on a,b` (empty clears; `--add-depends-on <id>` appends; unknown ids
  fail). **Dependencies are advisory**: they gate `next`/`--ready` suggestions,
  never updates.
- `in_progress` on a claimable type without `assignee` is rejected;
  initiatives/epics may be `in_progress` unassigned.
- Claims carry a soft lease (`claimed_at`, ISO date-time) — reporting only.
  `list --stale --older-than 7d` reports stale claims.
  `update --steal --reason "<why>" --assignee <you>` is **HUMAN-only** (agents
  refused behave like `--force`), double-gated: the repo must arm
  `x-tracker.allow-steal: true` and it must run at an interactive terminal with a
  y/N confirmation. Agents coordinate instead of stealing.
- `update --status blocked` requires `--blocked-reason`; `blocked_reason` is
  forbidden otherwise.
- **Done gate** (task-done-gate-acceptance-waiver, ADR 0015): `update --status
done` on a task/bug whose body still has unchecked acceptance boxes is
  REFUSED — tick every box first (the honest path), or pass
  `--waive "<reason>"` (non-empty; records a dated `### Waiver` section in the
  item body, then flips). The waiver is HUMAN-only: the `arggon_update`
  MCP/native tool has no waive parameter, the kernel refuses `agent` callers,
  and the flag refuses to fire when there is nothing to waive (no done flip, a
  container, a complete checklist). Containers are not gated — their contract
  is the acceptance-aware cascade below.
- **Cascade:** a terminal status (done/cancelled) auto-completes ancestor
  containers whose whole subtree is terminal — up to the initiative. Opt out with
  `--no-cascade`; flipped ids come back as `autoCompleted`. It is
  **acceptance-aware**: a container whose own body still has unchecked acceptance
  boxes is never auto-completed (reported as `cascadeSkipped`) — tick the checklist
  or pass `--no-cascade`.
- **Reopen is gated like steal** (bug-reopen-ungated-cli): `--status todo` on a
  `done`/`cancelled` item requires a y/N confirmation at an interactive terminal;
  non-TTY callers (agents, scripts, CI) are refused — no `--yes` override.
- `comment`/`handoff` are body-only (frontmatter, including `updated`, is never
  touched) and are allowed on `done`/`cancelled` items: a comment is history, not
  a reopen. `handoff` fields are bounded.
- Tracker mutations (`create`, `update`, `comment`, `handoff`, `adopt`,
  `cleanup --prune`, `import-issues`) auto-commit only the files they wrote
  (`chore(tasks): ...`); opt out per call with `--no-commit`.

## Merging tracker-carrying PRs

- **MERGE-merge, never squash.** Tracker mutations auto-commit locally on your
  branch; a squash merge rewrites them into one new commit on main while the
  branch's local auto-commits remain — the next pull on the stale branch diverges
  on identical content. If squash is unavoidable: `git pull --rebase origin main`
  from the stale branch (enable rerere), or delete the branch and restart from
  fresh main. For stacked/multi-item branches, prefer `--no-commit` and let the PR
  carry the tracker change.
- **Prevention beats recovery:** when mutating the tracker from the PRIMARY
  checkout (auto-commits land on local main), `git push origin main` immediately
  after every mutation — before opening or merging any PR — so the post-merge
  pull stays fast-forward.

## Repo hygiene and staging

- **Worktree starts prepare and keep the worktree** (bug-start-worktree-node-modules):
  `start --worktree` prepares a fresh worktree's install before the claim commit
  (additive `linkedNodeModules` in `--json`), so the wired pre-commit gate runs
  there — the old manual `git worktree add` + `ln -s` + re-run dance is gone. The
  install mirrors the primary checkout's `node_modules` as a link farm (a real
  directory whose entries link the primary's packages; a bare symlink when the
  worktree shadows no workspace package), and start never commits it (the claim
  commit stages only the item file). Before a configured
  `x-worktree.post-start` hook runs start removes the install so `npm ci` cannot
  reify through it and empty the primary install, re-creating it only when the
  hook leaves no `node_modules`. A failure after the worktree exists never rolls
  it back: the worktree and branch survive, the error names the failing step, path
  and remediation, and re-running `start --worktree` attaches and retries the
  failed claim commit (a failed push is the exception: push it manually, as the
  error says). Hooks are never bypassed. Discard an unwanted worktree with
  the command the error prints (`git worktree remove --force <path>`, plus
  `git branch -D <branch>` when start created the branch).
- **A worktree resolves workspace packages to its OWN copy, and reports the
  exceptions.** `start --worktree` points every workspace package the worktree
  also carries (`node_modules/@arggondev/lib` shape) at the worktree copy and
  pre-builds it with the package's own `build` script when its declared entry is
  missing (the built names are printed on stdout), so the spawned CLI and tests
  run the branch's build instead of the primary's. Every such package with a
  `build` script is pre-built by default — deliberately, because a local copy is
  preferred whenever it exists — but only when the install can consume the
  result: a bare symlink to the primary install has no farm to flip, so an
  attach re-run skips the build instead of paying ~2s for nothing (a reified
  `npm ci` install, whose link already resolves the worktree copy, is still
  built: the gate needs that declared entry). The build's exit is honored — a
  failed build falls back visibly even when it still emitted the entry (`tsc`
  without `noEmitOnError`) — so the gate never runs a kernel the build itself
  reported as failed (a per-invocation opt-out is a candidate follow-up, not a
  flag today). A copy that could not be built — no `build` script, a failed
  build, or no declared entry — keeps the primary's copy and is reported as
  `linkedWorkspaces` in `--json`
  (plus a stdout note), re-read after the `x-worktree.post-start` hook so a hook
  that installs locally (the recommended `npm ci`) reports `[]`. To force a full
  worktree-local install instead, run `npm ci` there.
- **Stage explicit paths — never `git add -A` / `git add .`.** Directory patterns
  like `node_modules/` match directories only, so a `node_modules` SYMLINK to a
  shared install is untracked-but-not-ignored and `-A` commits it (a start-created
  link farm is a real directory, so the pattern does cover that case). Explicit paths also protect against sweeping unrelated dirty files
  into your commit. Tracker mutations stage surgically (`git add -- <path>` only);
  your own commits should do the same.
- A stale `dist` after a pull → `unknown option` errors: rebuild
  (`npm run build`) or run from source (`npm run arggon -- <command>`).
- `init` docs are never overwritten — even with `--force`; re-runs regenerate
  untouched generated docs silently, skip modified ones, and `--backup` archives
  them to `backup/<date>/`.
- `adopt` requires an initialized tree; it creates the migration task — executing
  it is an agent job per the checklist body.
- Conventions evolve: check `conventionVersion` in any envelope.
- **Leave it cleaner:** release expired claims (`update <id> --status todo`), prune
  merged worktrees (`arggon cleanup --prune`), flag stale playbooks, and keep the
  tree validating before every commit.
