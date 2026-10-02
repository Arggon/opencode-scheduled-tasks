---
type: bug
status: in_progress
id: bug-loop-stop-does-not-persist-and-concurrency-bypass
title: "stop_loop does not persist, and loops bypass the concurrency cap"
assignee: arggon
parent: ephemeral-tasks-one-offs-and-session-loops
labels: []
created: "2026-10-02"
updated: "2026-10-02"
claimed_at: "2026-10-02T16:56:16.906Z"
depends_on: [bug-ephemeral-work-never-arms-tick]
---
<!--
  Placement (v0): ArggonManager/scheduled-tasks-v2/v2-features-inspired-by-opencode-tasks/ephemeral-tasks-one-offs-and-session-loops/bug-loop-stop-does-not-persist-and-concurrency-bypass.md
  Leaves live only under a story. id is the filename stem: bug-loop-stop-does-not-persist-and-concurrency-bypass.
  CLI `arggon create bug loop-stop-does-not-persist-and-concurrency-bypass` adds the bug- prefix (do not pass it twice).
  parent MUST be the story id. Omit assignee when unassigned. Omit blocked_reason unless status is blocked.
-->

# stop_loop does not persist, and loops bypass the concurrency cap

## Context

Review findings B2 + B3 + L2 against `f24250a`, verdict **changes requested**.

**B2 — stopping a loop does not stop it, and stopped loops resurrect.** `saveLoops`
(src/index.ts:1524-1529) wrote **only when the set was non-empty** (`if (first !== undefined)`), so
an emptied session was never persisted. `start_loop` then used "empty" as a proxy for "not loaded"
and re-read the stale record.

Reproduced: stop loop a → stop all (`loops: []` returned, storage still `[loop_b]`) → start c →
`schedules_list.loops` = `[loop_b, loop_c]`. The expiry path hits this too. The
already-declared-but-unused `ctx.storage.remove` (src/index.ts:1538) is the obvious fix.

**B3 — loops bypass the concurrency cap.** The loop drain (src/index.ts:2089-2114) never read
`maxConcurrent` or `inFlight`; every due loop posted in the same tick.

Reproduced: 3 due loops, `maxConcurrentRuns: 1` → **3 prompts in one tick**. Violates spec 002
invariant 1 and the README. Loops also skipped `applyJobTarget` entirely — no model, permissions,
timeout or history — while posting into a **human's live session**, which is a tighter
requirement than a background job, not a looser one.

**L2** — the expiry log hardcoded "3 days" although `ttl` is supported, and `nextRunAt` was
re-armed in memory but never persisted.

## Acceptance

- [ ] Stopping a loop persists; a stopped loop cannot be resurrected by a later `start_loop` in the
      same session, and the expiry path cleans up persistently.
- [ ] Stop-all persists an empty set or removes the key.
- [ ] Due loops respect `maxConcurrentRuns`; exceeding it is recorded, not posted.
- [ ] Loop posts go through `applyJobTarget` (model, permissions, timeout) and record history like
      every other run.
- [ ] The expiry log states the actual lifetime, and `nextRunAt` survives a restart.
- [ ] Tests reproduce each probe above, with an injected clock.

## Notes

Filed by the coordinator from the T3–T6 lead-architect review.
