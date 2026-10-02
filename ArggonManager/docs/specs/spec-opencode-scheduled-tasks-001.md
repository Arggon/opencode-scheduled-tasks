---
spec_id: opencode-scheduled-tasks-001
title: Cron-style scheduled agent tasks
status: proposed
created: 2026-10-02
---

<!-- status: NOT implemented. Reverted from `implemented` by the acceptance audit
     (task-audit-spec-001-acceptance-boxes), which resolved all 39 boxes as:
     23 ticked with a named test, 1 amended, 4 FALSE (filed as bugs), 12 true but
     unpinned by any test. Sixteen boxes are therefore still open, and `implemented`
     was asserting something the acceptance section had never checked.
     DOC_STATUSES has no in-progress state, so `proposed` is the only honest value -
     the same rule that keeps spec 002 at `proposed`. This must be flipped together
     with plan-opencode-scheduled-tasks-001, or spec analyze reports SPEC-STATUS-DRIFT.
     Flip both in the PR that closes the last open box. -->

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

- [ ] Malformed JSON in the job file retains the **last-known-good** job set, logs the
      parse failure once, and makes `schedules_list` report the error alongside the jobs
      still in force.

> **Not ticked** — audit `task-audit-spec-001-acceptance-boxes`, 2026-10-02: the reachable half is pinned, the named half is unreachable. “Surfaces the error alongside the jobs still in force” is pinned by “keeps last-known-good jobs and surfaces the error on malformed JSON” and “still reports a corrupt schedules.json when markdown jobs are carrying the schedule”. **“Retains the last-known-good job set” cannot be observed or tested today**: `reloadJobs` is called exactly once, from `setup` (src/index.ts:4231), and there is no file watcher, so nothing ever reloads a broken file over a good job set — the retention branch (src/index.ts:2662) has no caller with a populated `state.jobs`. Deleting that branch leaves 234/234 green. Needs either a reload path plus a test, or an amendment that says the file is read once at setup.

- [x] A job set with zero enabled jobs arms **no** timer; the plugin stays loaded and inert.

> **Ticked** — audit `task-audit-spec-001-acceptance-boxes`, 2026-10-02: `test/index.test.ts` → “stays inert — no lease, no timer — when nothing is scheduled at all” (`leaseHeld: false`, no prompt after a tick), plus the predicate itself: “does not count a parked job — enabled: false is work with the timer switched off”.

### Concurrency — concurrency / idempotency

- [ ] The tick loop never re-enters: a tick still running when the next tick fires is
      skipped, not queued.

> **Not ticked** — audit `task-audit-spec-001-acceptance-boxes`, 2026-10-02: true, and **no test pins it**. The guard exists (`if (ticking) return`, src/index.ts:4258) and the tick does not re-enter — but deleting that line leaves 234/234 green, because a re-entrant tick re-reads a window the first one already consumed. Needs a test that holds a tick open across an interval boundary (a slow `ctx.storage.set`, say) and asserts the second tick is dropped rather than queued.

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

- [ ] A failed run records `lastStatus: failed` and the error message, and is **not** retried
      within that occurrence.

> **Not ticked** — audit `task-audit-spec-001-acceptance-boxes`, 2026-10-02: true, and **no test pins it**. Gutting `runJob`’s catch — removing `lastStatus = "failed"` and `lastError` entirely — leaves 234/234 green: no test produces a *failed scheduled* run (the two prompt-rejection harnesses cover a loop post and a one-off, not a job). The “not retried within that occurrence” half is pinned by “collapses a backlog of eight to exactly one run under `skip`” and “advances nextRun even when nothing was due, so the next tick does not rescan”. Needs: a due job whose `session.prompt` rejects, asserting `lastStatus: "failed"`, the message, and no second run in the occurrence.

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

- [ ] One tick costs O(jobs): `nextRun` is advanced arithmetically, so cost never grows with
      how long the server was asleep.

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

- [ ] `nextRun` reported by `schedules_list` is an absolute ISO-8601 instant, unambiguous
      regardless of the viewer's zone.

> **Not ticked** — audit `task-audit-spec-001-acceptance-boxes`, 2026-10-02: true, and **no test pins it**. `schedules_list` does emit `new Date(record.nextRun).toISOString()`; replacing that with the raw epoch number leaves 234/234 green. Needs an assertion on the shape of `jobs[].nextRun` / `lastRun`.

### Persistence — persistence/migration/rollback

- [x] Run state is persisted under a namespaced `ctx.storage` prefix, versioned; a state
      entry written by a newer version is ignored and re-initialized rather than
      misinterpreted.

> **Ticked** — audit `task-audit-spec-001-acceptance-boxes`, 2026-10-02: `test/index.test.ts` → “re-initializes an unknown version instead of misreading it” (`{ version: 99, lastRun: 5 }` → `{ version: 1 }`) and “keeps a well-formed record and drops unknown fields”. It is the only test that fails when the stored-version check in `normalizeState` is removed. The namespacing half is the box below.

- [x] A corrupt state entry is dropped and that job's `nextRun` recomputed from its
      schedule; other jobs are unaffected.

> **Ticked** — audit `task-audit-spec-001-acceptance-boxes`, 2026-10-02: `test/index.test.ts` → “re-initializes a corrupt or non-object entry” (`null`, `42`, “x”, `[1,2]` → a fresh record) plus “advances nextRun even when nothing was due, so the next tick does not rescan” for the recompute. **Unpinned sub-clause:** “other jobs are unaffected” — making `loadStates` return early on the first corrupt entry leaves 234/234 green.

- [ ] When `ctx.storage` is absent on the host (feature-detected), the scheduler degrades to
      in-memory state: jobs still run, and the loss of cross-restart continuity is recorded
      in the run record.

> **False** — audit `task-audit-spec-001-acceptance-boxes`, 2026-10-02: The degradation is real and the first clause holds (probe: with `ctx.storage` absent, a one-off scheduled through `schedules_schedule` is dispatched — one `session.prompt`). **The second clause does not exist**: nothing records the loss of cross-restart continuity. `state.storageAvailable` is assigned once at setup (src/index.ts:4206) and read nowhere in the file; `HistoryEntry` has no such field and no log line mentions it. Worse on a storageless host: the completed one-off’s record is written to `history/oneoff/<id>` and then `schedules_history` cannot find it, because the lookup falls through to storage. So the box names a report the code does not make.

### Observability — observability/debuggability

- [ ] Every fire, skip, and error emits exactly one bounded line, prefixed `scheduled-tasks:`
      and including the job id, to `stderr` **and** to
      `~/.local/share/opencode/scheduled-tasks/<project>/scheduler.log`.
      (Plugin `console.error` is **not** captured into OpenCode's own
      `~/.local/share/opencode/log/opencode.log` — verified against ArggonManager's `[arggon]`
      lines, which are equally absent — so stderr alone would make the scheduler unobservable.)

> **False** — audit `task-audit-spec-001-acceptance-boxes`, 2026-10-02: The dual sink works for every line emitted *after* the first lease — pinned by “turns a rejecting permission.rules into an error result, a logged line and no prompt” and “records the asks a run turned into denies, and states them in its own running line”, which read `scheduler.log` back. But the log directory is created by `acquireLease`, which runs only when there is work to arm, so **every line emitted before it never reaches the file**. Repro, fresh process, one enabled job, `ctx.storage.scan` absent: stderr gets `ctx.storage.scan is unavailable, …` then `could not append to …/scheduler.log`; `scheduler.log` does not exist. Same for an idle project: the line that says *why* the plugin is inert (`no enabled jobs in .opencode/schedules.json or .opencode/tasks …; no timer armed`) is stderr-only. Secondary: the box says every line includes the job id, and the degradation notices (missing `scan`, no YAML reader, lease unavailable, the loop-scan cap) name no job — correctly, since they are not about one.

- [ ] A repeated identical failure logs **once**, not once per tick.

> **Not ticked** — audit `task-audit-spec-001-acceptance-boxes`, 2026-10-02: true, and **no test pins it**. `logOnce` + the module-level `logged` set do deduplicate; making `logOnce` always emit leaves 234/234 green. Note that the test whose name promises this — “degrades to session defaults and logs once when ctx.permission.rules is missing” — asserts only that the run succeeds; it never counts a line.

- [ ] `schedules_list` reports per job: `id`, `schedule`, `timezone`, `enabled`, `nextRun`,
      `lastRun`, `lastStatus`, `lastError`, and whether the lease is held elsewhere.

> **Not ticked** — audit `task-audit-spec-001-acceptance-boxes`, 2026-10-02: true, and **no test pins it**. `schedules_list` reports every field the box lists, but the two that matter most are unpinned: replacing `lastStatus`/`lastError` with `null` leaves 234/234 green, and so does emitting `nextRun` as an epoch number instead of an ISO string. “reports jobs, next run and status through schedules_list” asserts `id`/`schedule`/`timezone`/`enabled` and that `leaseHeld` is a boolean; the foreign-lease half is pinned by “reports a lease held elsewhere instead of arming a second scheduler”.

- [x] A job may name a `model` as `provider/model` (or `{ providerID, id }`); a malformed one
      refuses the job with a named reason rather than dispatching on the wrong model.

> **Ticked** — audit `task-audit-spec-001-acceptance-boxes`, 2026-10-02: `test/index.test.ts` → “parses provider/model and the explicit object form” and “refuses the whole job when its model is malformed” (the good sibling job still loads; the refusal names the job and the expected form).

- [ ] The job's model is applied **before** the prompt is admitted, and the resolved model is
      echoed in the `running` line, so a job that inherited an unintended (paid) model is
      visible in the log instead of silent.

> **Not ticked** — audit `task-audit-spec-001-acceptance-boxes`, 2026-10-02: **one clause pinned, one not.** “Applied before the prompt is admitted” is pinned by “switches the session to the job’s model before dispatching the prompt”, which asserts the exact order `switchAgent → switchModel → prompt`. “The resolved model is echoed in the `running` line” is **not**: dropping `model ${model}` from `runJob`’s running line leaves 234/234 green (the loop post’s line *is* pinned, by “records a loop post in history, names the model it spent, and leaves the session alone”). **Overlap with spec 002** line 159, which asks for the resolved model *and* session mode in that line and is likewise unticked — the same unpinned claim in two specs, so a test should close both at once.

- [ ] A job that names no model inherits the session default, and the log says
      `model session default`.

> **Not ticked** — audit `task-audit-spec-001-acceptance-boxes`, 2026-10-02: **one clause pinned, one not.** “Inherits the session default” is pinned for the surfaces that report it: “reports the resolved model in schedules_list” (`model: "session default"`) and “records a run’s outcome, model and session, and survives a storage round-trip” (`model: "session default"` in the record). “The log says `model session default`” is not pinned for a job run — same mutant as the box above. The loop post’s line is pinned.

### Security — security/threat model

- [x] A job executes with the target session's existing agent, model, and permissions. The
      plugin grants no additional authority and implements no sandbox; this is documented as
      the threat model, not engineered around.

> **Ticked** — audit `task-audit-spec-001-acceptance-boxes`, 2026-10-02: The code half: `test/index.test.ts` → “leaves permissions absent when the job declares none” (no implicit tightening) and “applies declared rules before the prompt, and only when declared”. The documentation half is `README.md` § **Threat model**, which states verbatim that the plugin “grants no additional authority and implements no sandbox”.

### Environment and lifecycle — environment/platform

- [ ] The tick interval is `unref()`ed, so the scheduler never keeps the server process
      alive.

> **Not ticked** — audit `task-audit-spec-001-acceptance-boxes`, 2026-10-02: true, and **no test pins it**. The interval is `unref()`ed (src/index.ts:4312) and the process proves it — a probe that arms a 5 s tick and never calls cleanup exits in 0.095 s — but deleting the `unref` leaves 234/234 green.

- [ ] Lockfile paths are built with `node:path` and behave on Windows.

> **Not ticked** — audit `task-audit-spec-001-acceptance-boxes`, 2026-10-02: true, and **no test pins it**. `leaseBaseDir`, `leasePath` and `logPath` build every path with `node:path.join`, and the id is sanitized, so the paths are platform-correct by construction; no test would fail if that became string concatenation, so nothing keeps it true. (Observation, outside this box: `markdownFilePath` composes `${TASKS_DIR}/${name}`, which mixes separators on Windows — that string is only ever a refusal *message*, never a path anything is opened with.)

- [ ] The `setup` cleanup function clears the interval, releases the lease, and disposes the
      tool registration; it is safe to call more than once.

> **Not ticked** — audit `task-audit-spec-001-acceptance-boxes`, 2026-10-02: **idempotency pinned, the three effects not.** “Safe to call more than once” is pinned by “registers every tool and returns an idempotent cleanup” (two calls, no throw). Clearing the interval is not: removing `clearInterval(timer)` from `disarm` leaves 234/234 green. Releasing the lease on cleanup is not asserted on the cleanup path either — “hands the lease back once the last ephemeral task is done” covers `disarm` from the tick, not from the returned disposer.

### Upgrade — upgrade/data-loss

- [x] Upgrading the plugin preserves run history; no code path deletes another job's state.

> **Ticked** — audit `task-audit-spec-001-acceptance-boxes`, 2026-10-02: `test/index.test.ts` → “evicts the oldest ephemeral history key once the cap is reached, and never a job’s key”: it is the only test that fails when the namespace guard in `isEphemeralHistoryKey` is widened so eviction may delete a job’s history. **Overlap with spec 002** line 165, which states the same claim and is unticked — the tick here does not resolve that box, only this one.

- [x] Storage keys are namespaced so they can never collide with another plugin's keys.

> **Ticked** — audit `task-audit-spec-001-acceptance-boxes`, 2026-10-02: `test/index.test.ts` → “keeps ephemeral history in its own key space, so it cannot collide with a job’s”. Making the ephemeral keys flat again fails 17 tests, so the namespace is load-bearing rather than decorative.

- [ ] Removing a job from the file leaves its inert state behind; it is never used again
      unless the id returns.

> **Not ticked** — audit `task-audit-spec-001-acceptance-boxes`, 2026-10-02: true, and **no test pins it**. `loadStates` reads only the ids in the loaded job set and nothing anywhere deletes a removed job’s key — but making `setup` delete the state of every job missing from the file leaves 234/234 green.
