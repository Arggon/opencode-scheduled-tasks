---
type: task
status: done
id: task-t5-one-off-tasks
title: One-off tasks
assignee: arggon
branch: feat/task-t5-one-off-tasks
parent: ephemeral-tasks-one-offs-and-session-loops
labels: []
created: "2026-10-02"
updated: "2026-10-02"
depends_on: [task-t3-session-mode-and-run-history]
---
<!--
  Placement (v0): ArggonManager/scheduled-tasks-v2/v2-features-inspired-by-opencode-tasks/ephemeral-tasks-one-offs-and-session-loops/task-t5-one-off-tasks.md
  Leaves live only under a story. id is the filename stem: task-t5-one-off-tasks.
  CLI `arggon create task t5-one-off-tasks` adds the task- prefix (do not pass it twice).
  parent MUST be the story id. Omit assignee when unassigned. Omit blocked_reason unless status is blocked.
-->

# One-off tasks

## Context

`schedules_schedule` / `schedules_cancel` for absolute-instant, single-run tasks under their own
storage namespace. Implements ADR 0006, which narrows ADR 0001 to recurring jobs only.

See plan 002 §T5 and spec 002 § "One-off tasks".

## Acceptance

- [x] A one-off fires exactly once at its instant and is then gone.
- [x] A one-off **never** appears in or mutates a job file (ADR 0006 guarantee).
- [x] A past instant is refused, or run within a small documented grace window — never silently
      treated as "due now".
- [x] Cancelling an unknown or already-completed id returns a typed error naming the id.
- [x] Completed one-offs survive only inside run history, then are discarded.
- [x] Per-project cap (default 50) is enforced and **reported** when reached.



## Notes

Plan 002, spec 002 and the cited ADRs are the authority; this body is the
done-gate checklist (ADR 0015).

### 2026-10-02 @ses_f02bdeb4cffejd923dpf4pjWci
**Review verdict: changes requested** (lead-architect review, run after merge; read-only, no edits made).

Commits `26be6d5` + `fed8299`. Judge: engineering.md review bar, ADR 0006, spec 002 § "One-off tasks", plan 002 §T5.

### ADR 0006's guarantee holds — verified structurally, not from the test
I enumerated every writer in the plugin rather than trusting the byte-identity test:
- `JOBS_FILE` (src/index.ts:152) appears at exactly three sites: the `readFileSync` in `reloadJobs` (1765) and two log strings. It is **never opened for writing**.
- The only `writeFileSync` call sites are the writer lease (src/index.ts:1235, 1265) and `appendFileSync` to `scheduler.log` (1613). Neither is the job file.
- `state.jobs` is assigned in exactly one place, from the parsed file payload (src/index.ts:1789); `loadJobs` is called from exactly one place (2554).
- `OneOffTask` (1294-1304) has no `schedule` field; `SessionLoop` (1438-1448) has `intervalMs`. Neither is ever passed to `validateJob`/`loadJobs`, and neither type is structurally assignable to `JobDefinition`.
- Both stores write only under `scheduled-tasks/oneoff/` and `scheduled-tasks/loop/` via `ctx.storage`.

**There is no path by which a one-off reaches a job file or becomes recurring.** The design choice of keeping `OneOffTask` a separate type is what makes this true, and the byte-identity test at test/index.test.ts:1412 is a good belt-and-braces check.

### Blocking

**1. A one-off never fires in a project with no enabled recurring job.** `tick` is armed only when `hasWork` is true, and `hasWork` counts **only file-defined jobs** (src/index.ts:2559, gate at 2573). The one-off drain lives inside `tick` (src/index.ts:2116-2145). Probe: seeded a pending one-off in storage, set up with an empty `jobs` array, waited 7s with `tickMs: 5000` → `prompts posted: 0`, `pending still: ["oneoff_due"]`. The log says `no enabled jobs in .opencode/schedules.json; no timer armed`, and the one-off sits there forever.
This is the feature's primary use case: `schedules_schedule` works perfectly in a project with no job file, returns an id and `pending: 1`, and the agent believes it is scheduled. The same trap applies to a job file whose jobs are all `enabled: false`.
*Fix:* make `hasWork` account for pending ephemeral work, and re-evaluate it when `schedule`/`start_loop` creates work (arm the interval lazily if it is not armed). As a minimum, have `schedules_schedule` refuse with a named reason when no timer is armed, so it cannot lie.

**2. One-off history is unreadable, and its storage keys accumulate without bound.** `runOneOff`'s success path writes history under `task.id` (src/index.ts:2131-2141), but `schedules_history` resolves ids only against `state.jobs` (src/index.ts:2424-2429). Probe: after a one-off ran, `schedules_history({id: "oneoff_hm6wy…"})` → `{"error":"no job with id \"oneoff_hm6wy…\"","ids":["nightly"]}`. Consequences:
- README:206 — *"A completed one-off survives only in `schedules_history`, then is discarded"* — is **false**.
- The `cancel` error text at src/index.ts:2395 — *"(it may have already run; check schedules_history)"* — is **false**; it points an agent at a tool that cannot answer.
- `loadAllHistory` only loads keys for file-defined jobs (src/index.ts:1832-1836) and `ctx.storage.remove` is **never called anywhere in the file**, so `scheduled-tasks/history/oneoff_<id>` is written once per one-off and never read or deleted — unbounded key growth on disk for a chatty agent, which is the exact failure mode ADR 0006 § Consequences says to fear.
*Fix:* either accept a one-off id in `schedules_history` (distinguishing "no job"/"no one-off"/"no runs yet") and keep the record bounded under one key, or delete the history key on completion and correct both README:206 and the `cancel` message. Current state is the worst of both.

### Non-blocking

**3. A due one-off that finds no free slot is *deferred*, not skipped — and the log says otherwise.** `claimed` takes what fits and the rest stay in `state.oneOffs` to be retried every tick (src/index.ts:2119-2125), while the log line claims `skipping N one-off task(s): concurrency cap reached` (2121). README:140-141 promises the opposite for occurrences generally: *"A due occurrence that finds no free slot is **skipped and recorded**, never queued."* With `maxConcurrentRuns: 1` and a job due every tick, a one-off can starve indefinitely with no record beyond a log line. *Fix:* pick one — drop unclaimed due one-offs and record a `skipped` history entry (consistent with ADR 0002 and spec 001), or relabel the line "deferred" and bound how long a one-off may be deferred.

**4. Three failure paths record no history at all, and the success path stamps the wrong `startedAt`.** `runOneOff` returns `"failed"` before/inside the `try` when `ctx.session.create`/`prompt` are missing (src/index.ts:1884-1891) or when the created session has no id (1898) — the `catch` never runs, and the tick's `.then` only records `outcome === "ok"` (2131). So a failed one-off is recorded only when an exception was thrown *mid-dispatch*. Separately, the success entry uses `startedAt: Date.now()` at **completion** time (src/index.ts:2136) while jobs record the start (2033), so one-off history does not satisfy "records … start". *Fix:* record `failed` on every exit path from `runOneOff` and capture `startedAt` before dispatch.

**5. The one-off list is capped on write but not on read.** `loadOneOffs` returns the whole stored array with no cap (src/index.ts:1396-1421); only `saveOneOffs` slices to `MAX_ONEOFF_CAP` (1424), and it slices the **oldest-first** end, so an oversized stored list would silently drop the newest (soonest-due) entries at the next write. Same shape as the loop finding on T6.

**6. The per-project cap check is subtly weaker than it reads.** `schedules_schedule` counts only `dueAt > now` (src/index.ts:2351) but reports `pending: state.oneOffs.length` (2369) and stores the full list. Fine in practice, worth aligning.

**7. Tick-box honesty, on the positive side.** Every other checkbox on this item is genuinely covered: grace window both ways (test/index.test.ts:1344-1352), cap reported not silent (1448), typed cancel error naming the id (1419), validation parity with jobs (1360), prompt bound (1369). `pending: 50` in the cap test comes from storage seeding, which is why finding 5 is invisible to the suite.

**8. Coverage gap worth noting in the item:** the 119 tests exercise one-offs only up to the **tool boundary**. Nothing in the suite drives the drain half of `tick` (src/index.ts:2116-2145) — no test sets `tickMs` at all. The fire path is covered only by the harness, and T5 did not extend it. Finding 1 is exactly what a one-line end-to-end case (job-less project, due one-off, real clock) would have caught.

**9. Scope:** the commit stays on one-offs apart from the shared `applyJobTarget`/history helpers, which is the right reuse. `fed8299` is a legitimate docs follow-up, but it means the feature merged undocumented for one commit — the item should not have been marked done until the README landed.
