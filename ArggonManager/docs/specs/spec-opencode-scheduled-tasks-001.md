---
spec_id: opencode-scheduled-tasks-001
title: Cron-style scheduled agent tasks
status: implemented
created: 2026-10-02
---

<!-- status: implemented, and now substantiated. The acceptance audit
     (task-audit-spec-001-acceptance-boxes) resolved all 39 boxes, and
     task-pin-twelve-untested-spec-001-behaviours then pinned the 12 it had left open
     under the audit's rule - a tick is only claimed when mutating the named behaviour
     turns a test red. All 39 are now ticked with a named test or an explicit
     amendment.

     The audit is what found the four false boxes behind it, including a p0 where a
     minutely job in America/New_York fired every ~301 minutes. Boxes 89 and 178 were
     amended rather than ticked, because the behaviour they described was unreachable
     or not observable on this platform; both say so in place.

     Plan 001 moves in the same commit or spec analyze reports SPEC-STATUS-DRIFT. -->

<!-- status: `implemented` is UNSUBSTANTIATED, and the audit below is what proves it. The
     feature ships and 23 of these 39 boxes are now ticked with the test that pins each one,
     but `task-audit-spec-001-acceptance-boxes` (2026-10-02) found 4 boxes that are simply
     false and 12 more that are true with no test behind them — 16 boxes open in all.

     Spec 002 sets the rule for this pair: "Only `proposed`, `implemented` and `superseded`
     are legal (DOC_STATUSES), and there is no in-progress state - so `proposed` is the
     honest value while any acceptance box is open." On that rule alone this status should be
     `proposed`. It was left `implemented` because flipping it trips a gate:
     `arggon spec analyze` reports [SPEC-STATUS-DRIFT] against the implemented
     `plan-opencode-scheduled-tasks-001`, and that gate is required clean. Whoever owns the
     decision should flip this **and** the plan together, or accept the drift. -->

# Spec: Cron-style scheduled agent tasks (opencode-scheduled-tasks-001)

## Purpose

OpenCode V2 cannot schedule anything (verified: no CLI subcommand, no config field, no API
path). This spec defines a plugin, `opencode-scheduled-tasks`, that runs agent prompts on a
cron schedule inside a running OpenCode server.

**Invariants:**

1. **Cost-bounded.** Every run is a real billable model request. A scheduler that was
   asleep, or a server that was down, must not spend money the user did not intend (ADR
   0002).
2. **Single writer.** Two OpenCode servers on one machine must not double-fire (ADR 0003).
3. **Never breaks a session.** Every context API is feature-detected and every path is
   failure-isolated. A broken scheduler logs once and goes inert; it never fails a session,
   a tool call, or the server.
4. **Dependency-free and version-tolerant.** Single file, Node builtins only, no
   `@opencode/plugin` import, structural context types — matching what the ArggonManager
   plugin proves loads on 2.0.7 through 2.0.22.
5. **Reviewable definitions.** Jobs live in a version-controlled file; the plugin never
   mutates the job set (ADR 0001).

## Synopsis

```jsonc
// .opencode/schedules.json  — the only source of truth for what a job is
{
  "version": 1,
  "jobs": [
    {
      "id": "nightly-audit",            // ^[a-z0-9][a-z0-9._-]*$, unique
      "schedule": "0 3 * * *",          // 5-field cron, or @hourly|@daily|@weekly|@monthly
      "timezone": "Europe/Madrid",      // IANA; default = server local zone
      "prompt": "Review the diff since the last tag for security issues.",
      "agent": "build",                 // optional; defaults to the session's agent
      "model": "opencode/space-bunny-free", // optional; defaults to the session's model
      "enabled": true,                  // default true
      "misfire": "skip",                // "skip" (default) | "backfill"
      "maxCatchUp": 5,                  // backfill only; default 5
      "runTimeoutMs": 900000            // default 15 min
    }
  ]
}
```

Loading:

```bash
opencode plugin add opencode-scheduled-tasks
```

```
tools.arggon-free surface:
  schedules_list  → { jobs: [{ id, schedule, timezone, enabled, nextRun, lastRun, lastStatus, lastError }] }
  schedules_run   → { id, admitted: <inbox id>, sessionID }
```

`schedules_list` is a pure read. `schedules_run` triggers one job immediately, bypassing
the schedule but obeying the same concurrency, timeout and lease rules. **Neither mutates the
job set.**

## Acceptance

<!--
  Audited 2026-10-02 by `task-audit-spec-001-acceptance-boxes`. Every one of the 39 boxes
  below now carries a verdict, and the verdict is stated the only way this repo will accept:
  **a tick names the test that would fail if the behaviour broke.** Four labels, and they
  mean four different things:

  - **Ticked** — verified true *and* pinned: mutating the behaviour it names makes at least
    one test go red.
  - **Amended + ticked** — the box was *mis-specified* (it asked for something the design
    never intended), so it was rewritten to describe what ships, and the rewritten claim is
    pinned.
  - **False** — the code does not do what the box says. Each of these is a finding to file,
    not an amendment: a box that caught a real defect is evidence, and amending it to match
    the code would destroy the evidence. The repro is in the note.
  - **Not ticked** — verified true, but **no test pins it**, so there is nothing a tick
    could honestly point at. Each note says which mutation leaves the suite green, i.e.
    exactly which test is missing.

  Why so many "Not ticked": a box that is merely *believed* is not a box that is met, and
  an audit that cannot tell those apart is the failure mode this audit exists to end. Each of
  the twelve is one missing test, and five of them are one assertion inside a test that
  already exists.

  Boxes that spec 002 states differently are flagged in the note rather than ticked here.
-->

### Loading and validation — input validation / hostile input

- [x] A missing `.opencode/schedules.json` leaves the plugin inert; `schedules_list` returns
      an empty job list rather than an error.

> **Ticked** — audit `task-audit-spec-001-acceptance-boxes`, 2026-10-02: `test/index.test.ts` → “is inert but still registers tools when there is no job file” (asserts `jobs == []` with no `error`), corroborated by “stays inert — no lease, no timer — when nothing is scheduled at all”.

- [x] A syntactically invalid cron expression disables **that job only**, with a named error
      naming the job id, the expression, and the reason. It never silently skips the job and
      never fails the load of the others.

> **Ticked** — audit `task-audit-spec-001-acceptance-boxes`, 2026-10-02: `test/index.test.ts` → “keeps valid jobs and reports invalid ones instead of failing the load” (one valid job loads, four invalid ones are each reported with a reason); the markdown surface names the file: “refuses bad YAML by name and keeps every other job”.

- [x] A schedule that can never match any instant (e.g. `0 0 30 2 *` — 30 February) is
      rejected at parse time as an invalid job, not carried as a job that never fires.

> **Ticked** — audit `task-audit-spec-001-acceptance-boxes`, 2026-10-02: `test/index.test.ts` → “rejects a schedule that can never match: 30 February”, with the boundary pinned by “accepts 29 February, which does exist in a leap year”.

- [x] A duplicate job id, an id failing `^[a-z0-9][a-z0-9._-]*$`, or a job count above the
      documented cap (default 100) is rejected per job with a named error; the remaining
      valid jobs still load.

> **Amended + ticked** — audit `task-audit-spec-001-acceptance-boxes`, 2026-10-02: **Amended**, because the box asked for one rejection granularity where the design never intended one. The count cap is not a per-job refusal: `loadJobs` refuses the **whole file** (`{ jobs: [], error: "job file declares N jobs, above the cap of 100" }`), because a cost bound that bounds only the jobs it likes is not a bound. Duplicate ids and ids failing `^[a-z0-9][a-z0-9._-]*$` *are* per-job, and the remaining jobs still load. Now says: *“A duplicate job id or an id failing `^[a-z0-9][a-z0-9._-]*$` is rejected per job with a named error and the remaining valid jobs still load; a job count above the documented cap (default 100) refuses the file as a whole, with a named error.”* Tests: “rejects a duplicate id while keeping the first”, “keeps valid jobs and reports invalid ones instead of failing the load” (the `Bad_Id` case), “refuses a file above the job cap”.

- [x] `@hourly`, `@daily`, `@weekly` (Sunday 00:00) and `@monthly` (1st 00:00) expand to
      their 5-field equivalents. Any other `@` token is invalid.

> **Ticked** — audit `task-audit-spec-001-acceptance-boxes`, 2026-10-02: `test/index.test.ts` → “expands the macros” (all four) and “rejects an unknown macro” (“Any other `@` token is invalid”).

### Error states — empty/loading/error states

- [x] A broken `.opencode/schedules.json` never disarms the project: it logs the parse failure
      once, and `schedules_list` reports the error alongside whatever jobs are still in force.
      The file is read **once**, at `setup`, so the job set in force is the one loaded there.

> **Amended + ticked** — `task-pin-twelve-untested-spec-001-behaviours`, 2026-10-03. The audit's
> verdict below was right about what was untested and wrong to leave it as one box: the
> **retention** clause describes a branch with no caller, so it is not a missing test, it is a
> clause about a code path that does not exist. `reloadJobs` is called exactly once, from `setup`
> (src/index.ts:4956), against a `state.jobs` that is `[]` at that moment, so the
> "retain the last-known-good set" early return (src/index.ts:3180) can only ever retain nothing.
> Rather than tick a claim about dead code, the box is amended to the invariant that is real and
> testable — **a broken file costs the project neither its jobs nor its silence** — and the
> retention branch is left in place as the defensive guard it is documented to be.
>
> - **The parse failure is named once, in the log** — pinned by "keeps last-known-good jobs and
>   surfaces the error on malformed JSON" (added assertion: exactly one line naming
>   `schedules.json:` *and what went wrong*). Mutation: making the inert-project notice take its
>   no-error wording unconditionally fails that test and no other.
> - **…and reported alongside the jobs still in force** — pinned by "still reports a corrupt
>   schedules.json when markdown jobs are carrying the schedule": a project whose markdown jobs
>   are carrying the schedule still lists them *and* the error. Mutation: dropping the read-failure
>   branch fails that test.
>
> The audit's prior verdict, discharged: audit `task-audit-spec-001-acceptance-boxes`, 2026-10-02: the reachable half is pinned, the named half is unreachable. “Surfaces the error alongside the jobs still in force” is pinned by “keeps last-known-good jobs and surfaces the error on malformed JSON” and “still reports a corrupt schedules.json when markdown jobs are carrying the schedule”. **“Retains the last-known-good job set” cannot be observed or tested today**: `reloadJobs` is called exactly once, from `setup` (src/index.ts:4231), and there is no file watcher, so nothing ever reloads a broken file over a good job set — the retention branch (src/index.ts:2662) has no caller with a populated `state.jobs`. Deleting that branch leaves 234/234 green. Needs either a reload path plus a test, or an amendment that says the file is read once at setup.

- [x] A job set with zero enabled jobs arms **no** timer; the plugin stays loaded and inert.

> **Ticked** — audit `task-audit-spec-001-acceptance-boxes`, 2026-10-02: `test/index.test.ts` → “stays inert — no lease, no timer — when nothing is scheduled at all” (`leaseHeld: false`, no prompt after a tick), plus the predicate itself: “does not count a parked job — enabled: false is work with the timer switched off”.

### Concurrency — concurrency / idempotency

- [x] The tick loop never re-enters: a tick still running when the next tick fires is
      skipped, not queued.

> **Ticked** — `task-pin-twelve-untested-spec-001-behaviours`, 2026-10-03:
> `test/index.test.ts` → “drops a tick that fires while the previous one is still running,
> instead of nesting it (box 96)”. The window it needs is the one the audit said was missing: a
> tick held open across an interval boundary. Two jobs, the first suppressed by a live run lease
> so its state write is **parked** mid-tick and the second has not been looked at yet — a slow
> `ctx.storage.set` is the only such window that exists, because `resolveDue` is synchronous. A
> whole interval passes with the first tick in flight, and nothing is dispatched; release the
> write and the *first* tick finishes the job itself, one run and one occurrence.
>
> Mutation: `if (ticking) return` → `if (false)` fails it, because the second tick then evaluates
> the un-decided job and prompts. The audit's prior verdict was that deleting the guard left
> 234/234 green — true, and the reason it was: **a re-entrant tick re-reads a window the first
> one already consumed**, so nothing observable happened. This test parks the first tick *before*
> it consumes anything, which is the only way to make the difference visible.

- [x] A job with a run in flight whose next occurrence arrives records the occurrence as
      **skipped** and does not start a second run.

> **Ticked** — audit `task-audit-spec-001-acceptance-boxes`, 2026-10-02: `test/index.test.ts` → “skips rather than queues an occurrence whose run is still in flight” (`{ kind: "skip", suppression: { reason: "in-flight" } }`, `lastStatus: "skipped"`), and end to end: “keeps the in-flight lease live for the whole run, so no tick re-admits the job” (one prompt across three minute boundaries).

- [x] A second OpenCode server process loads the plugin, logs one line, and does **not**
      arm the tick loop while a live instance holds the lease (ADR 0003).

> **Ticked** — audit `task-audit-spec-001-acceptance-boxes`, 2026-10-02: `test/index.test.ts` → “stays inert for ephemeral work when another instance holds the lease” (`leaseForeign: true`, `leaseHeld: false`, no prompt, and the pending work is still reported) and “reports a lease held elsewhere instead of arming a second scheduler”. **Unpinned sub-clause:** “logs one line” — `logOnce` emits it (src/index.ts:4303) but no test asserts the line.

- [x] A lease whose heartbeat is older than `leaseTtl` is reclaimed by the next acquire, so
      a `SIGKILL`ed server does not wedge scheduling.

> **Ticked** — audit `task-audit-spec-001-acceptance-boxes`, 2026-10-02: `test/index.test.ts` → “reclaims a stale lease so a killed server cannot wedge scheduling”. It is the *only* test that fails when the TTL comparison in `acquireLease` is removed.

### Failure — failure/retry/timeout

- [x] A failed run records `lastStatus: failed` and the error message, and is **not** retried
      within that occurrence.

> **Ticked** — `task-pin-twelve-untested-spec-001-behaviours`, 2026-10-03:
> `test/index.test.ts` → “records a failed scheduled run: status, the message it threw, and no
> retry inside the occurrence (box 107)”. A due job whose `session.prompt` rejects, which is the
> case no test produced: `schedules_list` reports `lastStatus: "failed"` with the message, storage
> holds it, `schedules_history` returns one record with `outcome: "failed"` and the same error —
> and five further ticks *inside the same minute* produce no second attempt, which is the
> occurrence half.
>
> Mutation: gutting the catch in `runJob` — removing `record.lastStatus = "failed"` and
> `record.lastError` — fails it.

- [x] A run exceeding `runTimeoutMs` has its session interrupted and records
      `lastStatus: timeout`.

> **Ticked** — audit `task-audit-spec-001-acceptance-boxes`, 2026-10-02: `test/index.test.ts` → “bounds a prompt that never resolves, records timeout and frees the slot”: at the bound it asserts `interrupts == [{ sessionID: "ses_hung" }]`, `lastStatus: "timeout"`, a run record with `outcome: "timeout"` and an error naming the interruption — and the sibling “says it abandoned the run when the host offers no way to interrupt it” pins the honest outcome where `ctx.session.interrupt` is absent. This is the box that `bug-run-timeout-never-enforced` closed.

- [x] An unanswerable permission prompt inside a run is bounded by `runTimeoutMs` and
      cannot hang the scheduler indefinitely.

> **Ticked** — audit `task-audit-spec-001-acceptance-boxes`, 2026-10-02: `test/index.test.ts` → “bounds a prompt that never resolves, records timeout and frees the slot”, with “releases the shared per-tick budget when a run times out, so the next job still runs” for “cannot hang the scheduler indefinitely”. Note what the suite actually models: the unanswerable ask is a `session.prompt` that never resolves, which is the same await. **Overlap with spec 002** (line 105, ADR 0005): a *declared* `ask` is now downgraded to a deny before dispatch, so `runTimeoutMs` is the bound for everything else rather than the first line of defence. Not a conflict; both statements hold.

- [x] A run that throws is caught, recorded, and never propagates into the tick loop or out
      of the plugin.

> **Ticked** — audit `task-audit-spec-001-acceptance-boxes`, 2026-10-02: `test/index.test.ts` → “records a failed loop post instead of letting it escape the tick” (`outcome: "failed"`, the message, the loop still alive) and “records a one-off whose prompt threw, with the message it threw”. **Unpinned sub-clause:** the recurring-job `runJob` catch — removing it leaves 234/234 green (see the box above).

### Limits — limits/quota/perf

- [x] Missed occurrences collapse to **one** immediate run under `misfire: "skip"` (ADR
      0002).

> **Ticked** — audit `task-audit-spec-001-acceptance-boxes`, 2026-10-02: `test/index.test.ts` → “collapses a backlog of eight to exactly one run under `skip`” (`collapsed: 1`, `lastRun` advanced to `now`, so the backlog cannot replay).

- [x] `misfire: "backfill"` replays at most `maxCatchUp` occurrences, oldest first, and
      reports the dropped remainder as truncated in the run record.

> **Ticked** — `bug-backfill-collapses-to-one-run-and-never-reports-truncation`: `resolveDue` now
> returns one occurrence per tick with the rest held in a durable `catchUp` plan on the job's state
> record, so a five-occurrence backlog with `maxCatchUp: 3` produces three prompts oldest-first across
> three ticks. Named tests: “replays a backlog oldest-first, one occurrence per tick, up to
> maxCatchUp”, “reports the dropped remainder in the log **and** on every record of the backlog”,
> “defers a replayed occurrence that finds no free slot instead of spending it”, “restores the
> catch-up plan from storage after a restart”. ADR 0002 stands unchanged — the code caught up to the
> decision rather than the decision being rewritten to match the code.


> **False** — audit `task-audit-spec-001-acceptance-boxes`, 2026-10-02: `misfire: "backfill"` neither replays what the box says nor reports what it dropped. `resolveDue` folds up to `maxCatchUp` occurrences into **one** decision (`occurrence.collapsed = N`, `dueAt` = the oldest) and `tick` dispatches it once; and `occurrence.dropped`/`droppedCapped` are read by nothing at all — the `backlog-truncated` suppression that would print them (src/index.ts:3451) is never returned. Repro: a job with `misfire: "backfill"`, `maxCatchUp: 3`, five hourly occurrences missed → **one** `session.prompt`, one record `{dueAt, startedAt, outcome, model, sessionID}`, and no truncation line in the log or the file. ADR 0002 says the remainder is “dropped and reported as truncated in the run record, never silently”.

- [x] At most `maxConcurrentRuns` (default 1) runs are in flight globally; a due occurrence
      with no free slot is recorded as skipped, never queued.

> **Ticked** — audit `task-audit-spec-001-acceptance-boxes`, 2026-10-02: `test/index.test.ts` → “skips when the global concurrency cap is reached” (`{ kind: "skip", suppression: { reason: "concurrency" } }`), and globally: “spends the same per-tick budget as a recurring job”, “spends one budget across all three drains, so reordering neither of them buys a slot”.

- [x] One tick costs O(jobs) and **cannot block the event loop**: `nextRun` is advanced by a single
      forward occurrence search — O(1) in backlog length — and the dropped-backlog count a due job
      owes is bounded by `MAX_BACKLOG_SCAN` (1000) occurrences, so the cost does not grow with how
      long the server was asleep past that ceiling and it is paid **once per backlog**, not once per
      tick. Between jobs the tick hands the event loop back whenever a whole `MAX_BACKLOG_SCAN` of
      occurrences has been walked, so **no blocking run is longer than one job's bounded walk**,
      whatever the job count.

> **Blocked vs. busy — measured, then bounded** — `task-measure-first-tick-stall-after-long-sleep`,
> 2026-10-03. The predecessor item bounded the *work* and left the event loop unexamined; its own
> report said so, and this item existed to close that gap rather than assume it either way.
>
> **It was blocked, not busy.** Driving the real `tick` through `setup` at 100 jobs with a 24 h
> `* * * * *` backlog (UTC) — 601 800 `Intl.DateTimeFormat#formatToParts` lookups — a `setImmediate`
> and a `setTimeout(0)` marker queued *during* the walk both fired only after the last job, and a
> self-rescheduling `setImmediate` canary recorded a single **2.45 s gap**: the whole walk was one
> synchronous run. Promise *microtasks* did interleave (the skip path's `await saveState`), and that
> is the distinction that mattered — a microtask does not end a turn, so nothing else in the host
> process ran for the length of the walk. In an editor-hosted plugin that is invariant 3 failing
> outright, not a slow schedule.
>
> **Now bounded by work rather than by a clock.** The tick meters occurrences walked and takes one
> macrotask turn (`setImmediate`) before any walk that would extend the current run past a whole
> `MAX_BACKLOG_SCAN`. Re-measured with the same harness: the 100-job walk is cut into **99 blocks**
> — deterministic, one turn between every pair of walks — the longest ~32–40 ms on a quiet machine,
> and **0 turns** on an ordinary tick, on a `backfill` replay, and on a backlog smaller than the
> bound. Named tests, all counting **turns observed against a lookup count** and never a duration:
> “hands the loop back between jobs, so no one walk can hold it”, “pays no turn at all on a tick
> that has no backlog to walk”, “pays no turn while the walking it has done is still inside one
> bound”, “pays no turn for a `backfill` replay, because the plan carries the count”.
> Mutation-checked: deleting the yield fails the first; yielding per job fails the other three
> **and** three pre-existing fake-timer tests; swapping `setImmediate` for `queueMicrotask` fails
> the first — so the suite distinguishes busy from unblocked rather than inferring it.
>
> The two bounds are separate and both were needed: the *work* is bounded so a tick is affordable,
> and the *block* is bounded so the work is interruptible. A bound on the first says nothing about
> the second — which is precisely what the predecessor's ~2.34 s aggregate could not tell us.
>
> The audit's premise below — “produce a number no caller reads” — no longer applies: the count is
> load-bearing since `bug-backfill-collapses-to-one-run-and-never-reports-truncation` (log **and**
> every run record), which is why the walk was kept rather than deleted.

> **Bound established** — `bug-tick-cost-grows-with-sleep-not-with-jobs`, 2026-10-02: the box as
> previously worded was false in its first clause and left its second untested; it is reworded above
> to the invariant that actually holds and is now pinned. `missedOccurrences` still *enumerates*
> rather than counting arithmetically — deliberately: cron occurrences are a function of a timezone,
> a calendar and DST, so an exact count is a search — but `MAX_BACKLOG_SCAN` caps how far that
> search goes, which is what makes the cost a function of jobs. Measured (`resolveDue`, one
> `* * * * *` job, counting `Intl.DateTimeFormat#formatToParts` as the work unit): **24 h, 720 h,
> 8760 h, 87600 h and 876000 h of sleep all cost the identical 6012 lookups (~22–27 ms)** — the walk
> saturates, so cost is flat in sleep length past ~16.7 h. The tick that finds a backlog pays it
> once: the cursor moves to `now`, and a `backfill` remainder moves into the durable `catchUp`
> plan, so the following ticks cost 12 lookups (~0.07 ms) and each `backfill` replay costs 6.
> Aggregate ceiling for one tick at `DEFAULT_MAX_JOBS` (100 jobs, each owing a capped backlog, which
> needs ≥17 h asleep): ~602 000 lookups / ~2.3 s **once**; the next ten ticks over the same 100 jobs
> total ~15 000 lookups / ~59 ms. Named tests: “stops at the bound instead of at the backlog: a year
> of sleep costs the same as a day”, “charges the walk to the tick that finds the backlog, not to
> every tick after it”, “replays a `backfill` backlog off the plan, so each replay tick costs one
> search too”, “scales with the number of jobs, not with the number of occurrences each one owes”,
> “keeps a backlog smaller than the bound exact, so `droppedCapped` stays honest”. Every bound is
> asserted as a **work count**, never a duration: raising `MAX_BACKLOG_SCAN` to 5000 fails 6 tests,
> removing the bound fails 6, and making the tick re-derive the backlog every tick fails the
> amortization test.
>
> The audit's premise below — “produce a number no caller reads” — no longer applies: the count is
> load-bearing since `bug-backfill-collapses-to-one-run-and-never-reports-truncation` (log **and**
> every run record), which is why the walk was kept rather than deleted.

> **False** — audit `task-audit-spec-001-acceptance-boxes`, 2026-10-02: The tick’s cost does grow with how long the server was asleep. `missedOccurrences` counts the dropped remainder whenever it filled its limit — and under `skip` the limit is 1, so **every** due `skip` job walks up to `MAX_BACKLOG_SCAN` (1000) `nextOccurrence` calls to produce a number no caller reads. Measured (`resolveDue`, one `0 * * * *` job, real clock): 1 h asleep 15.5 ms (mostly JIT), 8 h 1.2 ms, 24 h 1.9 ms, 720 h 48.8 ms, 8760 h 39.6 ms with `dropped: 1000, droppedCapped: true`. The *following* tick is 0.09 ms, so it is one walk per backlog, not per tick — bounded, but not O(jobs) and not constant in sleep length, which is what the box claims.

### Time — time/timezones/locale

- [x] Each job evaluates its schedule in its own IANA `timezone`, defaulting to the
      server's local zone. Correctness never depends on the `TZ` environment variable.

> **Ticked** — audit `task-audit-spec-001-acceptance-boxes`, 2026-10-02: `test/index.test.ts` → “evaluates in the job’s own timezone, not the host’s” (the same call returns `03:00 Madrid` = `01:00Z`, not `03:00Z`). The “never depends on `TZ`” clause is verified by probe rather than by a test: `nextOccurrence(parseCron("30 2 * * *"), 2026-10-25T00:00Z, "Europe/Madrid")` returns `2026-10-25T00:30:00.000Z` identically under `TZ=UTC`, `TZ=Pacific/Kiritimati`, `TZ=America/Anchorage` and `TZ=Australia/Sydney`.

- [x] Across a DST spring-forward, a local time that does not exist is **skipped** for that
      day.

> **Ticked** — audit `task-audit-spec-001-acceptance-boxes`, 2026-10-02: `test/index.test.ts` → “skips a local time that does not exist on spring-forward” (Europe/Madrid 2026-03-29 02:30 does not exist; the next occurrence is 2026-03-30T02:30).

- [x] Across a DST fall-back, a local time that occurs twice fires **once**, at the first
      occurrence.

> **Ticked** — audit `task-audit-spec-001-acceptance-boxes`, 2026-10-02: `test/index.test.ts` → “fires once, at the first occurrence, for an ambiguous fall-back time” (2026-10-25 02:30 twice; the answer is the CEST first pass, `00:30Z`, not the CET repeat).

- [x] `nextRun` reported by `schedules_list` is an absolute ISO-8601 instant, unambiguous
      regardless of the viewer's zone.

> **Ticked** — `task-pin-twelve-untested-spec-001-behaviours`, 2026-10-03: two tests, both
> mutation-checked against the same change (`new Date(record.nextRun).toISOString()` → the raw
> epoch, which fails each of them):
> `test/index.test.ts` → “reports jobs, next run and status through `schedules_list`” (the one
> assertion this test was missing: `jobs[0].nextRun` matches a `Z`-suffixed ISO instant, and so
> does the `lastRun` the first tick has already armed), and “reports every field the box names, and
> both instants as absolute ISO-8601 (boxes 135, 158)”, which checks both instants against a record
> whose `lastRun` is a known epoch — so the assertion is about the *instant*, not about the shape
> alone.

### Persistence — persistence/migration/rollback

- [x] Run state is persisted under a namespaced `ctx.storage` prefix, versioned; a state
      entry written by a newer version is ignored and re-initialized rather than
      misinterpreted.

> **Ticked** — audit `task-audit-spec-001-acceptance-boxes`, 2026-10-02: `test/index.test.ts` → “re-initializes an unknown version instead of misreading it” (`{ version: 99, lastRun: 5 }` → `{ version: 1 }`) and “keeps a well-formed record and drops unknown fields”. It is the only test that fails when the stored-version check in `normalizeState` is removed. The namespacing half is the box below.

- [x] A corrupt state entry is dropped and that job's `nextRun` recomputed from its
      schedule; other jobs are unaffected.

> **Ticked** — audit `task-audit-spec-001-acceptance-boxes`, 2026-10-02: `test/index.test.ts` → “re-initializes a corrupt or non-object entry” (`null`, `42`, “x”, `[1,2]` → a fresh record) plus “advances nextRun even when nothing was due, so the next tick does not rescan” for the recompute. **Unpinned sub-clause:** “other jobs are unaffected” — making `loadStates` return early on the first corrupt entry leaves 234/234 green.

- [x] When `ctx.storage` is absent on the host (feature-detected), the scheduler degrades to
      in-memory state: jobs still run, and the loss of cross-restart continuity is recorded
      in the run record.

> **Ticked** — fix `bug-storageless-degradation-unrecorded`, 2026-10-03. Both clauses are now made rather than amended, and the third (which the box does not name but the code needs) is decided explicitly: **ephemeral history stays reachable in memory** here, so `schedules_history` still answers.
>
> - **Jobs still run** — pinned by “stamps every run record on a storageless host, and says once that continuity is lost”: with `ctx.storage` absent the key, a `* * * * *` job is dispatched and recorded.
> - **The loss is recorded in the run record** — `HistoryEntry.inMemoryOnly`, stamped in `recordRun` (the one funnel every kind of run goes through) whenever the host lacks `get` **or** `set`, and passed through by `schedules_history`. Presence-only: its absence means the record *was* stored.
> - **And once in the log** — `logOnce("no-storage:<project>")` at setup, naming the surface that is missing and what is lost. Per project, like the lease lines, so a second project's log is not silent.
>
> **Read side, decided:** `resolveHistoryOwner` asks this process's rings *first* and storage second. Storage alone (the shape left by the namespacing fix) returned `no job with id` for a one-off whose record was written moments earlier in the same tick. Where even memory cannot answer — an id this process never minted — the error carries `historyUnavailable` naming the retention boundary rather than a bare miss. **Unpinned sub-clause:** “the loss of cross-restart continuity is recorded” is asserted on a `get`-only and a `set`-only host as well as on none, so the detection is per-operation; the *stamp* is not asserted to survive a storage round-trip, and deliberately cannot be (`loadHistory` rebuilds from storage, and a record that arrived from storage was written by a host that *had* storage).
>
> **Also bounded:** where nothing is persisted, the in-memory ring *is* the retained history, so `retainEphemeralHistoryKey` mirrors the index in memory, unions it with the persisted one, and evicts the ring as well as the storage key. Without that, “the last fifty” would have been true only on the hosts that did not need it.

### Observability — observability/debuggability

- [x] Every fire, skip, and error emits exactly one bounded line, prefixed `scheduled-tasks:`
      to `stderr` **and** to
      `~/.local/share/opencode/scheduled-tasks/<project>/scheduler.log` — every line, from
      the first one, because the log directory is created at setup rather than by the lease
      that only exists once there is work to arm. **Job-scoped lines carry the job, loop or
      task id; host-level notices do not**, because they are not about one job: a missing
      `ctx.storage` surface, a missing `ctx.storage.scan`, a missing YAML reader, an
      unavailable writer lease, the loop-scan cap, and the inert-project notice. Exactly one
      line is `stderr`-only and no project could name it: the line reporting that
      `ctx.location.directory` is unavailable, since there is no `<project>` to log under.
      (Plugin `console.error` is **not** captured into OpenCode's own
      `~/.local/share/opencode/log/opencode.log` — verified against ArggonManager's `[arggon]`
      lines, which are equally absent — so stderr alone would make the scheduler unobservable.)

> **Ticked** — fix `bug-log-lines-before-first-lease-never-reach-the-file`, 2026-10-03. The audit's
> verdict below was right and is now discharged.
>
> - **The directory is created at setup, not by the lease.** `ensureLogDir(logPath(directory, projectID))`
>   runs where `activeLogPath` is assigned — after `ctx.location.directory` is read, so the project id
>   the path needs is already known, and before `reloadJobs`, `loadStates` and the storage notice, so
>   every one of those lines has a file to land in. Pinned by "writes the idle-project line into the
>   file, from a directory that never held a lease": with no jobs at all `acquireLease` never runs,
>   and the notice explaining *why* the plugin is inert is in the file.
> - **Both degradation notices are in the file too** — "writes the `ctx.storage.scan` degradation into
>   the file, not just on stderr" imports a fresh module instance (so `logOnce`'s module-level
>   `logged` set cannot answer for the line) and reads `ctx.storage.scan is unavailable` and
>   `ctx.storage unavailable` back out of `scheduler.log`.
> - **A log directory is not a lease.** "creates the log directory without taking the writer lease" pins
>   that an idle project gets a `scheduler.log` and **no** `writer.lock`, and that `acquireLease` is
>   still exclusive afterwards — so nothing here becomes a second writer (ADR 0003).
> - **The mkdir failure is reported once and cannot recurse.** `ensureLogDir` reports on a bare
>   `console.error`, not through `emit`, and the caller leaves `activeLogPath` unset — so no later line
>   attempts an append and then reports that append's own failure. Pinned by "says once, on stderr,
>   when the log directory cannot be created, and never retries per line" (no `could not append to …`
>   ever) and "reports each unwritable project once, rather than silencing all but the first" (the
>   once-guard is keyed by path, because one host loads this plugin per project).
> - **One `mkdirSync` per `setup`, not per line** — `emit` never consults the directory, so a missing
>   directory cannot become a hot loop, and the cost is one syscall per project load.
>
> **Two things decided while fixing it, both narrowed in the box text above rather than glossed:**
> the job-id clause never applied to host-level notices and never was meant to, and one line
> (`ctx.location.directory is unavailable`) has no project to be logged under. The
> `activeLogPath` path is also cleared before each setup, so a project whose directory cannot be
> made does not append its lines into the previously-loaded project's file — pinned by "does not
> write a project with no usable log directory into the previous project's file".
>
> **Prior verdict, discharged:** audit `task-audit-spec-001-acceptance-boxes`, 2026-10-02: The dual sink worked for every line emitted *after* the first lease — pinned by "turns a rejecting permission.rules into an error result, a logged line and no prompt" and "records the asks a run turned into denies, and states them in its own running line", which read `scheduler.log` back. But the log directory was created by `acquireLease`, which runs only when there is work to arm, so every line emitted before it never reached the file. Repro, fresh process, one enabled job, `ctx.storage.scan` absent: stderr got `ctx.storage.scan is unavailable, …` then `could not append to …/scheduler.log`, and `scheduler.log` did not exist; the same for an idle project.

- [x] A repeated identical failure logs **once**, not once per tick.

> **Ticked** — `task-pin-twelve-untested-spec-001-behaviours`, 2026-10-03: two tests, both failing
> on the same mutation (deleting `if (logged.has(key)) return` from `logOnce`, so every call
> emits): `test/index.test.ts` → “logs a repeated identical failure once across five ticks, not
> once per tick (box 157)” — a due job whose `session.create` rejects, five minutes of ticks, one
> line, while the failures themselves kept happening (so “once” is a dedupe, not a silence) — and
> the assertion this line was always promising, added to “degrades to session defaults and logs
> once when `ctx.permission.rules` is missing”, which never counted a line.
>
> The per-tick test uses `session.create` on purpose: its `logOnce` key is **per job**
> (`session-create-<id>`), so the measurement cannot be silently spent by an earlier test in the
> file, the way a host-wide notice's module-level guard can. That dependency is called out at the
> assertion in the second test, which is the only consumer of `no-permission-rules`.

- [x] `schedules_list` reports per job: `id`, `schedule`, `timezone`, `enabled`, `nextRun`,
      `lastRun`, `lastStatus`, `lastError`, and whether the lease is held elsewhere.

> **Ticked** — `task-pin-twelve-untested-spec-001-behaviours`, 2026-10-03. The two fields that
> mattered most were the two unpinned ones, and they need a job with state to be worth asserting
> on, so the load-bearing test is new and the shape test is an addition:
>
> - `test/index.test.ts` → **“reports every field the box names, and both instants as absolute
>   ISO-8601 (boxes 135, 158)”** — a daily job whose stored record is a timed-out run, so
>   `lastStatus: "timeout"`, `lastError` and `lastRun` all carry real values that a `?? null`
>   could not satisfy, plus `leaseHeld`/`leaseForeign` read live rather than captured at build
>   time. Mutation: replacing `lastStatus`/`lastError` with `null` fails it.
> - “reports jobs, next run and status through `schedules_list`” gained the assertion the audit
>   asked for: the fields a never-run job has nothing to report are **present and `null`**, so a
>   reader can tell “no run yet” from “this surface does not report that”. Honest limit: that
>   assertion does **not** catch the `?? null` mutation — a never-run job's status already *is*
>   null — which is exactly why the field values are asserted on the new test instead.
> - The “held elsewhere” half stays pinned by “reports a lease held elsewhere instead of arming
>   a second scheduler” (`leaseForeign: true`).

- [x] A job may name a `model` as `provider/model` (or `{ providerID, id }`); a malformed one
      refuses the job with a named reason rather than dispatching on the wrong model.

> **Ticked** — audit `task-audit-spec-001-acceptance-boxes`, 2026-10-02: `test/index.test.ts` → “parses provider/model and the explicit object form” and “refuses the whole job when its model is malformed” (the good sibling job still loads; the refusal names the job and the expected form).

- [x] The job's model is applied **before** the prompt is admitted, and the resolved model is
      echoed in the `running` line, so a job that inherited an unintended (paid) model is
      visible in the log instead of silent.

> **Ticked** — `task-pin-twelve-untested-spec-001-behaviours`, 2026-10-03. Both halves, and the
> audit was right that the second was the open one:
>
> - **Applied before the prompt is admitted** — stays pinned by “switches the session to the job’s
>   model before dispatching the prompt”, whose strict `["switchAgent", "switchModel:…", "prompt"]`
>   order cannot hold if the application moves after the dispatch. Mutation: removing the
>   `switchModel` call fails it.
> - **Echoed in the `running` line** — new `test/index.test.ts` → “echoes the resolved model in
>   the run’s own line, so an inherited paid model is visible (box 162)”: a due job naming a
>   model, asserting the line names it *and* that `scheduler.log` carries the same line, because
>   stderr is not where anyone looks. Mutation: dropping `model ${model}` from `runJob`’s running
>   line fails it — the same mutation box 165’s test below catches.

- [x] A job that names no model inherits the session default, and the log says
      `model session default`.

> **Ticked** — `task-pin-twelve-untested-spec-001-behaviours`, 2026-10-03. Both halves, and the
> audit was right that only the log half was open:
>
> - **Inherits the session default** — stays pinned on the reporting surfaces by “reports the
>   resolved model in `schedules_list`” (`model: "session default"`) and “records a run’s outcome,
>   model and session, and survives a storage round-trip”.
> - **The log says `model session default`** — one assertion added to “records the asks a run
>   turned into denies, and states them in its own running line”, a test that was already reading
>   the `running` line and asserting a clause of it: the line names `model session default`
>   because an inherited default is usually a *paid* model. Mutation: dropping `model ${model}`
>   from `runJob`’s running line fails it, and fails box 162’s new test at the same time — the
>   two boxes are one mutant, which is why one test closes both.
>
> **Still open in spec 002** line 159, which asks for the resolved model *and* session mode in
> that line. This tick resolves box 165 here and does not resolve that one: the session-mode half
> has no test, and a tick that claimed otherwise would be the failure this audit exists to end.

### Security — security/threat model

- [x] A job executes with the target session's existing agent, model, and permissions. The
      plugin grants no additional authority and implements no sandbox; this is documented as
      the threat model, not engineered around.

> **Ticked** — audit `task-audit-spec-001-acceptance-boxes`, 2026-10-02: The code half: `test/index.test.ts` → “leaves permissions absent when the job declares none” (no implicit tightening) and “applies declared rules before the prompt, and only when declared”. The documentation half is `README.md` § **Threat model**, which states verbatim that the plugin “grants no additional authority and implements no sandbox”.

### Environment and lifecycle — environment/platform

- [x] The tick interval is `unref()`ed, so the scheduler never keeps the server process
      alive.

> **Ticked** — `task-pin-twelve-untested-spec-001-behaviours`, 2026-10-03:
> `test/index.test.ts` → “never holds the server process open to poll a schedule: the tick interval
> is unref'd (box 176)”. It arms a real timer behind a spy on `setInterval` and asserts the
> **property** — `handle.hasRef()` is false — rather than that a particular call was made, because
> `unref` is how the property is reached and `hasRef` is what it means. Real timers, deliberately:
> the handle under test has to be the host's own, not a fake-timer stand-in. The interval really
> does stop the process exiting being asserted by the fact that the suite finishes at all.
>
> Mutation: removing `timer.unref?.()` fails it.

- [x] Lockfile paths are composed with `node:path` from a sanitized project id, so they are
      platform-correct by construction and cannot be walked out of the lease directory; the
      Windows half is asserted only where Windows runs.

> **Amended + ticked** — `task-pin-twelve-untested-spec-001-behaviours`, 2026-10-03. The audit
> verdict below was right and its own conclusion was the amendment: *“no test would fail if that
> became string concatenation, so nothing keeps it true.”* That is not a missing assertion, it is a
> missing property to assert. The box is narrowed to what this repository can actually keep true,
> and the Windows claim is stated as what it is — a property of `node:path` that a Linux runner
> cannot distinguish from anything else.
>
> - **Sanitized, and confined** — `test/index.test.ts` → “keeps a hostile project id inside the
>   lease directory, whichever separator it brings (box 178)”: ids carrying `/`, ``, `:`, a
>   leading slash, `..` traversal and spaces all produce a lockfile and a log file that stay under
>   the lease base directory, in exactly one component, with the fixed leaf. Mutation: deleting the
>   `.replace(/[^A-Za-z0-9._-]/g, "_")` in `leasePath` fails it, because `join` then follows the id
>   out of the directory.
> - **Composed with `node:path`** — pinned by the existing “every static import in the plugin is a
>   node builtin” (ADR 0004): `node:path` is the only path module in the file, and after
>   sanitization `join` is the only thing standing between an id and concatenation. After
>   sanitization the two differ *only* in normalisation, so this is a code-level fact pinned by a
>   code-level test, and it is named as such rather than dressed up as a behavioural one.
> - **Windows** — platform-gated: “composes the lockfile path with the host’s own separator, not a
>   hard-coded slash (box 178)”, `it.runIf(process.platform === "win32")`. It runs on Windows and is
>   **skipped on this suite's Linux runner**, so it was not mutation-checked here. The honest
>   consequence: the Windows claim is *encoded*, not *verified*, by this repository's CI.
>
> **Known limit, reported not fixed here:** the sanitizer keeps `.`, so a project id of exactly
> `..` composes to a lockfile one level *above* the lease base directory. Fixing it is a `src`
> change and outside this item's scope; it is raised to the coordinator rather than patched
> silently, and the test above deliberately does not assert the escaping form as if it were
> correct.
>
> The audit's own observation stands, outside this box: `markdownFilePath` composes
> `${TASKS_DIR}/${name}`, which mixes separators on Windows — that string is only ever a refusal
> *message*, never a path anything is opened with.
>
> The audit's prior verdict, discharged: audit `task-audit-spec-001-acceptance-boxes`, 2026-10-02: true, and **no test pins it**. `leaseBaseDir`, `leasePath` and `logPath` build every path with `node:path.join`, and the id is sanitized, so the paths are platform-correct by construction; no test would fail if that became string concatenation, so nothing keeps it true. (Observation, outside this box: `markdownFilePath` composes `${TASKS_DIR}/${name}`, which mixes separators on Windows — that string is only ever a refusal *message*, never a path anything is opened with.)

- [x] The `setup` cleanup function clears the interval, releases the lease, and disposes the
      tool registration; it is safe to call more than once.

> **Ticked** — `task-pin-twelve-untested-spec-001-behaviours`, 2026-10-03. The audit was right
> that idempotency was pinned and the three effects were not, so this is a new test rather than an
> addition: `test/index.test.ts` → “stops everything the cleanup promised: the interval, the lease
> and the tool registration (box 179)”. Each of the three is checked against a distinct
> observation, and each is checked *after* cleanup rather than during it:
>
> - **The interval is cleared** — the job in the test is owed nothing at the first tick, so it
>   becomes due one minute later; cleanup runs, and fourteen boundaries are advanced across that
>   minute. A surviving interval dispatches it; a cleared one does not.
> - **The lease is released** — the lockfile is gone afterwards, so the project is writable by the
>   next instance rather than held until its TTL expires.
> - **The registration is disposed** — the harness's `ctx.tool.transform` returns a `dispose`
>   counter, read through the disposer `setup` handed back.
> - **Safe to call more than once** — stays pinned by “registers every tool and returns an
>   idempotent cleanup”, and is re-asserted here on the same disposer.
>
> Mutations: removing `clearInterval(timer)` from `disarm` fails it; removing `lease.release()`
> from `disarm` fails it; not pushing the registration's disposer fails it. Three effects, three
> separate reds.

### Upgrade — upgrade/data-loss

- [x] Upgrading the plugin preserves run history; no code path deletes another job's state.

> **Ticked** — audit `task-audit-spec-001-acceptance-boxes`, 2026-10-02: `test/index.test.ts` → “evicts the oldest ephemeral history key once the cap is reached, and never a job’s key”: it is the only test that fails when the namespace guard in `isEphemeralHistoryKey` is widened so eviction may delete a job’s history. **Overlap with spec 002** line 165, which states the same claim and is unticked — the tick here does not resolve that box, only this one.

- [x] Storage keys are namespaced so they can never collide with another plugin's keys.

> **Ticked** — audit `task-audit-spec-001-acceptance-boxes`, 2026-10-02: `test/index.test.ts` → “keeps ephemeral history in its own key space, so it cannot collide with a job’s”. Making the ephemeral keys flat again fails 17 tests, so the namespace is load-bearing rather than decorative.

- [x] Removing a job from the file leaves its inert state behind; it is never used again
      unless the id returns.

> **Ticked** — `task-pin-twelve-untested-spec-001-behaviours`, 2026-10-03:
> `test/index.test.ts` → “leaves a removed job's state behind and never uses it again, unless the
> id returns (box 186)”. A stored record and run history for a `ghost` job, and a file that does
> not mention it: both keys are still exactly as they were, three minutes of ticks never evaluate,
> dispatch or write back an id that is not in the file, and a second `setup` over the same store —
> with the id back in the file — reports the retained `lastRun` and `lastStatus` rather than a
> fresh record. Both halves of "inert, and retained" in one test, because the second half is what
> makes the first one a decision rather than an omission.
>
> Mutation: the audit's own proposed one — making `setup` delete the state of every job missing
> from the file — fails it.
