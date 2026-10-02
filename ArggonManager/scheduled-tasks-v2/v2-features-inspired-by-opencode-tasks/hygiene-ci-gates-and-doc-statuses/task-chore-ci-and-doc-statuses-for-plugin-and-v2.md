---
type: task
status: todo
id: task-chore-ci-and-doc-statuses-for-plugin-and-v2
title: "No CI runs the plugin's tests; v2 docs statuses were never flipped"
branch: chore/task-chore-ci-and-doc-statuses-for-plugin-and-v2
parent: hygiene-ci-gates-and-doc-statuses
labels: []
created: "2026-10-02"
updated: "2026-10-02"
---
<!--
  Placement (v0): ArggonManager/scheduled-tasks-v2/v2-features-inspired-by-opencode-tasks/hygiene-ci-gates-and-doc-statuses/task-chore-ci-and-doc-statuses-for-plugin-and-v2.md
  Leaves live only under a story. id is the filename stem: task-chore-ci-and-doc-statuses-for-plugin-and-v2.
  CLI `arggon create task chore-ci-and-doc-statuses-for-plugin-and-v2` adds the task- prefix (do not pass it twice).
  parent MUST be the story id. Omit assignee when unassigned. Omit blocked_reason unless status is blocked.
-->

# No CI runs the plugin's tests; v2 docs statuses were never flipped

## Context

## Context

Review finding (L3), verdict **changes requested**.

**No CI runs the plugin's tests or typecheck.** `.github/workflows/arggon.yml` only runs the
tracker gate. So "tests green in CI" was never true for the plugin, and nothing on GitHub would
have caught a regression — which is how five blocking defects reached `main`.

**Statuses were not flipped at landing.** spec 002 and plan 002 are still `status: proposed` and
ADRs 0004–0007 are still `Proposed` despite shipping. ADRs 0001–0003 are the same — a
project-wide drift. The methodology requires flipping spec/plan status in the landing PR.

**Two story items were cascaded to `done` with empty template bodies.** `config-surface-…` and
`ephemeral-tasks-…` have no Context/Acceptance text, so there is no record of what they were
meant to deliver.

## Acceptance

- [ ] CI runs `npm run check` (typecheck + tests) on push/PR and fails on a failure.
- [ ] The harness (`npx tsx harness/smoke.ts`) is exercised in CI, or its exclusion is
      deliberate and documented.
- [ ] spec 002, plan 002 and ADRs 0004–0007 are `implemented`/`Accepted`; ADRs 0001–0003 too.
- [ ] Both v2 story bodies state their scope and acceptance instead of template stubs.


## Notes

Filed by the coordinator from the T3–T6 lead-architect review.

Filed by the coordinator from the T3–T6 lead-architect review.

Also fold in the README defects the review listed — duplicated `## Job reference` heading,
stale `running` samples predating the `session` field, `schedules_start_loop`/`stop_loop`
missing from the Tools list, and the Cost safety / Threat model sections not updated for
features that post into live sessions — **unless T7 already covered them**; check before editing,
and do not collide with T7 if it is running.



## Notes

Filed by the coordinator from the T3–T6 lead-architect review.

### 2026-10-02 @ses_f02aa69caffekIqM24LV3k4JbW
## Evidence

Commit `41b5b0d` on `chore/task-chore-ci-and-doc-statuses-for-plugin-and-v2`. 15 files;
`src/index.ts` and `test/index.test.ts` untouched (verified with
`git show --stat HEAD -- src/index.ts test/index.test.ts` — empty).

### Gates, all run before the commit

| Command | Observed |
| --- | --- |
| `npm run check` | 119 tests passed (1 file), tsc clean |
| `npx tsx harness/smoke.ts` | `[harness] PASS: the scheduler admitted a scheduled prompt on a real clock and recorded it`, exit 0, waited 25226ms (window derived from the clock) |
| `arggon validate` | ok (0 warning(s), convention v5) |
| `arggon spec validate` | ok (4 doc(s), 0 warning(s)) |
| `arggon spec analyze` | clean (2 spec(s) scanned) |
| `tools.arggon.validate` | ok:true, 0 errors, 0 warnings |

The CI job was rehearsed end-to-end in a scratch dir rather than assumed — `npm ci` with the
new lockfile, then `npm run check`, then `npx tsx harness/smoke.ts`:

```
added 50 packages in 552ms
Tests  119 passed (119)
[harness] PASS: the scheduler admitted a scheduled prompt on a real clock and recorded it
```

(Rehearsal in `/tmp/opencode/ci-probe`, never in this worktree: `node_modules` here is a symlink
to the primary checkout, so `npm ci` in place would have emptied the primary's install.)

### Workflow

`plugin-check` job added to `.github/workflows/arggon.yml`: node 22 → `npm ci` → `npm run check`
→ `npx tsx harness/smoke.ts`, job ceiling 15 min, harness step ceiling 5 min. No `needs:`, so it
runs in parallel with `tasks-validate`; the two need disjoint installs. `concurrency` is
workflow-ref + head-ref with `cancel-in-progress: true`. YAML parsed and asserted structurally
with `js-yaml` (no `yaml` dep in this repo).

**The harness is in CI, not excluded.** I read `tick()` in `src/index.ts` before deciding: it
writes only to `mkdtempSync(tmpdir())`, uses an injected fake `ctx` (`session.prompt` is a local
`async` that pushes to an array), and `process.env[DATA_DIR_ENV]` relocates the log dir into that
temp dir. No network, no real session, no machine state. It also exits non-zero on three distinct
failures, so it is a gate and not a smoke signal.

### `tsx`

Not resolvable from `node_modules` (checked before adding). `npx tsx --version` succeeded only by
downloading 4.23.15 into the npx cache — fine locally, unpinned in CI. Added as an explicit
devDependency. Lock diff verified by comparing every `packages[key].version`: **purely additive**
(26 `@esbuild/*` platform packages, `esbuild@0.28.2`, `tsx@4.23.15`); no existing version moved.

### Statuses flipped

- `spec-opencode-scheduled-tasks-002.md`, `plan-opencode-scheduled-tasks-002.md`: `proposed` → `implemented`
- ADRs `0001`–`0007`: `Proposed` → `Accepted`

Frontmatter line only: `git diff --stat` shows 2 lines per file (1+/1-). No ADR body touched.

### README

T7 (`task-t7-attribution-docs-and-v2-gate`) is `status: todo`, unassigned, and `origin/main`
still carries all four defects — verified, not assumed:

```
$ git show origin/main:README.md | grep -n "Job reference"
76:## Job reference## Job reference
$ git show origin/main:README.md | grep -c "schedules_start_loop"
0
```

So nothing owned them and I fixed all four. Cost safety and the threat model were written from the
code, not from the review's summary, and the result is sharper than the brief: `schedules_schedule`
takes an optional `model` and rides `maxConcurrentRuns`, but `schedules_start_loop` takes **no**
`model` — `tick()` calls `ctx.session.prompt({ sessionID, text, delivery: "queue" })` directly, so
a loop spends whatever model, agent and permissions the live session already has, on every tick for
up to its TTL. That is the real cost hazard and it is now what the README says.

Log samples were regenerated from `src/index.ts:2010`, which emits
`running <id> (schedule "<cron>" <tz>, model <m>, session <reuse|fresh>)` — the old samples predated
`session`.

## Findings for the coordinator (not filed by me)

1. **`.opencode/tasks/<id>.md` is not implemented.** `JOB_FORMAT_REFERENCE` (`src/index.ts:85`)
   *documents* the markdown surface and the precedence rule, and a test asserts the string — but
   there is no directory scan, no frontmatter parser and no merge. The only reader is
   `.opencode/schedules.json`. `task-t2-markdown-task-files` is `todo`, which is correct.
   This means spec 002's `### Config surface — markdown union` acceptance block is unimplemented,
   so `status: implemented` on spec 002 overstates it slightly. I made the call you specified and
   kept `task-t2` as the honest counter-record; I also wrote it into the
   `config-surface-markdown-task-files-durations` body rather than let the flip stand unqualified.
   ADR 0004 `Accepted` is not affected — an ADR status records the decision, not the implementation.
2. **`config-surface-markdown-task-files-durations` is `todo`, not `done`** — the brief said both
   stories were `done`. Only `ephemeral-tasks` is. I filled its body and left `status` alone; the
   half-delivered state is spelled out in the body for you to resolve.
3. **README § Status still claims "v2 in progress — markdown task files, per-job permissions,
   one-off tasks and session loops."** Markdown task files did not ship, so that line is wrong.
   Left alone: it was not one of the four listed defects and `task-t7` is the docs owner.
4. **Conflict risk: I touched `README.md`, which `task-t7` also owns.** If T7 is worked in
   parallel the merge will conflict in § Tools / § Cost safety / § Threat model / § Observability.
   Sequence them.
5. **`harness/smoke.ts` is outside `tsconfig.json` `include`** (`src/**/*.ts`, `test/**/*.ts`
   only), so `npm run typecheck` does not check it and CI does not either. Pre-existing; adding it
   would likely surface type errors against the fake `ctx`, which is out of my scope.
6. **`bug-tool-boundary-throws-and-ask-not-recorded`** sits under
   `run-control-permissions-session-mode-history` but names `schedules_run`. Not mine to move.

### handoff 2026-10-02 @ses_f02aa69caffekIqM24LV3k4JbW (session: ses_f02aa69caffekIqM24LV3k4JbW) — next: Code-review commit 41b5b0d, then push and open the PR; item is done on merge (coordinator flips status).
- branch: main
- open questions: README collides with task-t7 — sequence them; spec 002 implemented overstates markdown union (task-t2 still todo); config-surface story is todo not done
