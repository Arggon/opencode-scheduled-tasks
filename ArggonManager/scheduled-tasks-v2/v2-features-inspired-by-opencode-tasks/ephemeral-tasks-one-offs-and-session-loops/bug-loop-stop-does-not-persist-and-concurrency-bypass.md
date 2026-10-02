---
type: bug
status: done
id: bug-loop-stop-does-not-persist-and-concurrency-bypass
title: "stop_loop does not persist, and loops bypass the concurrency cap"
assignee: arggon
branch: fix/bug-loop-stop-does-not-persist-and-concurrency-bypass
parent: ephemeral-tasks-one-offs-and-session-loops
labels: []
created: "2026-10-02"
updated: "2026-10-02"
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

- [x] Stopping a loop persists; a stopped loop cannot be resurrected by a later `start_loop` in the
      same session, and the expiry path cleans up persistently.
- [x] Stop-all persists an empty set or removes the key.
- [x] Due loops respect `maxConcurrentRuns`; exceeding it is recorded, not posted.
- [x] Loop posts go through `applyJobTarget` (model, permissions, timeout) and record history like
      every other run. — *Narrowed honestly: the path is shared, and a loop declares none of the
      three, so for a loop the shared call resolves and reports the session's own model and
      applies nothing. That is deliberate (a loop posts into a human's live session and must not
      switch its model or replace its permission rules), and the test asserts exactly that.
      `applyJobTarget` has no timeout step at all, and `runTimeoutMs` is not enforced for
      one-offs either — a separate gap, reported to the coordinator, not filed here.*
- [x] The expiry log states the actual lifetime, and `nextRunAt` survives a restart.
- [x] Tests reproduce each probe above, with an injected clock. — *Both reviewer probes are
      reproduced verbatim; the cross-tick probe uses an injected clock (`vi.setSystemTime` +
      `advanceTimersByTimeAsync`) because real loop intervals are floored at a minute, and the
      rest pin explicit due instants instead of sleeping.*

## Notes

Filed by the coordinator from the T3–T6 lead-architect review.

### 2026-10-02 @ses_f0273ba47ffe8nSj6fb5n88RMi
## Fix report (branch `fix/bug-loop-stop-does-not-persist-and-concurrency-bypass`)

### Root causes

**B2 — a stop was never written.** `saveLoops` derived the key from `loops[0].sessionID`, so an
emptied session produced *no key* and no write: `stop_loop` returned `loops: []` while storage kept
the old record, and `start_loop`/`stop_loop` treated an empty in-memory list as "not loaded yet" and
re-read it. `ctx.storage.remove` was declared and unused — it is the right primitive, but not the
only one: on a host without it the answer still has to be persistable.

**B3 — no cap at all.** The loop drain never read `maxConcurrent`/`inFlight`; every due loop posted
in the same tick. The one-off drain recomputed its budget from `state.inFlight.size + decisions.length`,
so the two drains could each spend a full budget in one tick.

**L2.** The expiry line hardcoded `3 days`; `nextRunAt` was advanced on the in-memory object and never
written, so a restart replayed the occurrence.

### Storage layout (unchanged shape, one new writer)

Still exactly one key per session id, `scheduled-tasks/loop/<sessionID>`, still re-derived from the key
on load — the scoping property (a loop can only ever post into, and never outlive, its own session) is
untouched. What changed is *who* supplies the id: `saveLoops(ctx, sessionID, loops)` takes the session
token the tool already validated instead of reading it off the record being saved. That is what makes an
emptied set writable at all. An empty set is persisted as: `storage.remove(key)` when the host has it,
and `storage.set(key, [])` when it does not (`remove` is optional on this surface, like `set`) — plus the
`[]` fallback if `remove` throws, so the invariant "a stop is durable" never depends on which storage
API a host happens to expose.

`loopsFor(ctx, state, sessionID)` replaces the empty-as-not-loaded proxy with `Map.has`. A storage read is
now a fallback for *"not in memory yet"*, never an override of a decision this process already made.

### Dispatch through `applyJobTarget` without breaking human-session posting

`postLoop` calls the same `applyJobTarget` a job run and a one-off call. `SessionLoop` carries no `agent`,
`model` or `permissions`, so the shared call **applies nothing** and only resolves and reports what the
session will spend (`"session default"`), which is now recorded in the run history and echoed in the log
line. That asymmetry is deliberate: a loop posts into the live session a human is using, so it must not
switch that session's model or agent and must not replace its permission rules (README: a loop spends
whatever the session already has). The test asserts it both ways — the resolved model is reported, and
`switchModel`/`switchAgent`/`permission.rules` are called **zero** times by a loop post.

### Concurrency semantics chosen

One counter per tick (`claimed`), seeded from `state.inFlight.size + decisions.length`, spent by all three
drains in order: jobs → loops → one-offs. A due loop with no free slot: occurrence **consumed**
(`nextRunAt` advanced), recorded as `outcome: "skipped"` in the loop's history with
`no free run slot: concurrency cap N reached`, and logged `skipping loop <id>: concurrency cap reached
(1/1)`. Never queued, never retried — same rule as a due one-off, because the alternative is a backlog
re-decided every tick. An admitted loop post is added to `state.inFlight` and removed when it settles, so
a later tick counts it too.

**Open question for review:** the drain *order* (loops before one-offs) is inherited, not chosen here. It
means a due one-off can be skipped in favour of a recurring loop when the cap is 1. Specific-beats-recurring
would argue for the opposite order; I did not change it because that is a policy decision, not this bug.

### Gates

```
npx tsc --noEmit          clean
npx vitest run            191 passed (179 before) — 1 file
npx tsx harness/smoke.ts  PASS: the scheduler admitted a scheduled prompt on a real clock and recorded it
arggon validate           ok (0 warnings, convention v5)
arggon spec analyze       clean (2 specs)
```

### Mutation checks — every fix, deliberately broken

| Mutation | Caught by |
| --- | --- |
| M1 `saveLoops` never persists the empty set | 4 tests (reviewer repro, no-`remove` host, expiry, restart) |
| M2 loop drain ignores `maxConcurrent` | 4 tests (reviewer's 3-due-loops probe, not-over-applied, shared budget, cross-tick) |
| M3 tick drops its loop writes | 2 tests (expiry persistence, `nextRunAt` persistence) |
| M4b loop post no longer calls `applyJobTarget` | 1 test (history `model` + log line) |
| M5 `loopsFor` reverts to "empty means not loaded" | 1 test (a stop whose write failed must not be undone by the next start) |
| M6 expiry log hardcodes "3 days" | 1 test (2h ttl) |
| M7 one-off drain recomputes the budget instead of sharing it | 1 test (loop takes the single slot, one-off recorded skipped) |
| M8 admitted loop post not recorded in flight | 1 test (cross-tick, injected clock) |

**Not caught, deliberately reported:** M4h — replacing the `applyJobTarget` call with a hardcoded
`model = "session default"` passes everything. For a loop that declares no target the shared call has no
observable side effect, so no black-box test can distinguish it from a constant. The realistic regression
(deleting the call, M4b) *is* caught because the model falls back to `"unknown"`.

Two harness knobs were added for this and are worth knowing about: `slowWrites` (settle a loop-record write
on the next macrotask, so a finished post no longer looks in flight) and `failWrites`/`storageRemove: false`
(a host with no `remove`, and a host whose writes fail). Every wait is followed by a real assertion.

### handoff 2026-10-02 @ses_f0273ba47ffe8nSj6fb5n88RMi (session: ses_f0273ba47ffe8nSj6fb5n88RMi) — next: Code-review the branch, then open a PR referencing the item id; 191 tests green, all six boxes ticked with notes.
- branch: fix/bug-loop-stop-does-not-persist-and-concurrency-bypass
- open questions: Drain order (loops before one-offs) means a one-off can be skipped for a loop at cap 1 - policy call?; runTimeoutMs is stored but unenforced for one-offs too; loop history shares the history/ key spa…

### 2026-10-02 @ses_f037cc89cffeOo07JPEJShqzJw
**Live confirmation that loop stop persists** (v2.0.22, deployed build): the `loop2` project log shows `started loop …` → `stopped loop …` → `stopped all loops in session ses_abc` → `no enabled jobs, pending one-off or loop left; timer stopped and the writer lease released`, with no resurrection on the next `start_loop`. The concurrency-cap and `applyJobTarget` halves are covered by the suite; the persistence half is now also confirmed on the real host.
