---
type: bug
status: in_progress
id: bug-ephemeral-work-never-arms-tick
title: Ephemeral work never arms the tick loop
assignee: arggon
branch: fix/bug-ephemeral-work-never-arms-tick
parent: ephemeral-tasks-one-offs-and-session-loops
labels: []
created: "2026-10-02"
updated: "2026-10-02"
claimed_at: "2026-10-02T16:24:50.366Z"
depends_on: [task-t2-markdown-task-files]
---
<!--
  Placement (v0): ArggonManager/scheduled-tasks-v2/v2-features-inspired-by-opencode-tasks/ephemeral-tasks-one-offs-and-session-loops/bug-ephemeral-work-never-arms-tick.md
  Leaves live only under a story. id is the filename stem: bug-ephemeral-work-never-arms-tick.
  CLI `arggon create bug ephemeral-work-never-arms-tick` adds the bug- prefix (do not pass it twice).
  parent MUST be the story id. Omit assignee when unassigned. Omit blocked_reason unless status is blocked.
-->

# Ephemeral work never arms the tick loop

## Context

Review findings B1 + M1 + M3 against `f24250a` / `26be6d5`, verdict **changes requested**.

`hasWork` was `state.jobs.some((job) => job.enabled)` (src/index.ts:2559) — it counted only
**file-defined** jobs. Both ephemeral drains live inside `tick`, so in a project with `jobs: []`
and a pending one-off or loop, no `setInterval` was ever created and the work never fired — while
`schedules_schedule` / `schedules_start_loop` returned success.

Reproduced: pending one-off in storage, `jobs: []`, `tickMs: 5000`, 7s wait → 0 prompts, one-off
still pending. Same for loops.

- **M1** — `setup` loaded jobs/states/history/one-offs but **not loops**; `loadLoops` was called
  only from the two loop tools. A stored, due loop never posted again after a restart. The comment
  near the loop tools ("so a loop survives a reload") was false.
- **M3** — a due one-off that found no free concurrency slot stayed pending and was retried every
  tick while logging `skipping N one-off task(s)`. Spec 001 and the README promise *skipped and
  recorded, never queued*; as written it could starve indefinitely.

## Acceptance

- [x] Ephemeral work arms the tick: a pending one-off or loop in a project with no file jobs runs,
      and `hasWork` accounts for it.
- [x] Creating the first ephemeral work while idle arms the loop without a restart or reload.
- [x] Loops are loaded at setup from their session-scoped keys and resume posting.
- [x] A due one-off that cannot get a slot is **recorded as skipped**, not retried forever.
- [x] Tests reproduce each probe. **Amended:** not with an injected clock — `tick()` reads
      `Date.now()` directly and there is no clock seam, so the tests use real waits with
      tight budgets (`tickMs: 5_000`, `dueAt` offsets, per-test timeouts). The exposure is
      wall-clock flakiness on a loaded machine, not a false pass.

## Notes

Filed by the coordinator from the T3–T6 lead-architect review. Serialized after T2 and before the
other three `src/index.ts` bugs only to keep two agents out of one file; they are not logically
dependent. ADR 0003's single-writer guarantee must survive the change: the lease is still taken
only when there is work, and a second instance must still stay inert.
