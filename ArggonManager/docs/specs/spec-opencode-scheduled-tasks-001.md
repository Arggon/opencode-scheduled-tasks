---
spec_id: 001
title: Cron-style scheduled agent tasks
status: proposed
created: 2026-10-02
---

# Spec: Cron-style scheduled agent tasks (001)

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

### Loading and validation — input validation / hostile input

- [ ] A missing `.opencode/schedules.json` leaves the plugin inert; `schedules_list` returns
      an empty job list rather than an error.
- [ ] A syntactically invalid cron expression disables **that job only**, with a named error
      naming the job id, the expression, and the reason. It never silently skips the job and
      never fails the load of the others.
- [ ] A schedule that can never match any instant (e.g. `0 0 30 2 *` — 30 February) is
      rejected at parse time as an invalid job, not carried as a job that never fires.
- [ ] A duplicate job id, an id failing `^[a-z0-9][a-z0-9._-]*$`, or a job count above the
      documented cap (default 100) is rejected per job with a named error; the remaining
      valid jobs still load.
- [ ] `@hourly`, `@daily`, `@weekly` (Sunday 00:00) and `@monthly` (1st 00:00) expand to
      their 5-field equivalents. Any other `@` token is invalid.

### Error states — empty/loading/error states

- [ ] Malformed JSON in the job file retains the **last-known-good** job set, logs the
      parse failure once, and makes `schedules_list` report the error alongside the jobs
      still in force.
- [ ] A job set with zero enabled jobs arms **no** timer; the plugin stays loaded and inert.

### Concurrency — concurrency / idempotency

- [ ] The tick loop never re-enters: a tick still running when the next tick fires is
      skipped, not queued.
- [ ] A job with a run in flight whose next occurrence arrives records the occurrence as
      **skipped** and does not start a second run.
- [ ] A second OpenCode server process loads the plugin, logs one line, and does **not**
      arm the tick loop while a live instance holds the lease (ADR 0003).
- [ ] A lease whose heartbeat is older than `leaseTtl` is reclaimed by the next acquire, so
      a `SIGKILL`ed server does not wedge scheduling.

### Failure — failure/retry/timeout

- [ ] A failed run records `lastStatus: failed` and the error message, and is **not** retried
      within that occurrence.
- [ ] A run exceeding `runTimeoutMs` has its session interrupted and records
      `lastStatus: timeout`.
- [ ] An unanswerable permission prompt inside a run is bounded by `runTimeoutMs` and
      cannot hang the scheduler indefinitely.
- [ ] A run that throws is caught, recorded, and never propagates into the tick loop or out
      of the plugin.

### Limits — limits/quota/perf

- [ ] Missed occurrences collapse to **one** immediate run under `misfire: "skip"` (ADR
      0002).
- [ ] `misfire: "backfill"` replays at most `maxCatchUp` occurrences, oldest first, and
      reports the dropped remainder as truncated in the run record.
- [ ] At most `maxConcurrentRuns` (default 1) runs are in flight globally; a due occurrence
      with no free slot is recorded as skipped, never queued.
- [ ] One tick costs O(jobs): `nextRun` is advanced arithmetically, so cost never grows with
      how long the server was asleep.

### Time — time/timezones/locale

- [ ] Each job evaluates its schedule in its own IANA `timezone`, defaulting to the
      server's local zone. Correctness never depends on the `TZ` environment variable.
- [ ] Across a DST spring-forward, a local time that does not exist is **skipped** for that
      day.
- [ ] Across a DST fall-back, a local time that occurs twice fires **once**, at the first
      occurrence.
- [ ] `nextRun` reported by `schedules_list` is an absolute ISO-8601 instant, unambiguous
      regardless of the viewer's zone.

### Persistence — persistence/migration/rollback

- [ ] Run state is persisted under a namespaced `ctx.storage` prefix, versioned; a state
      entry written by a newer version is ignored and re-initialized rather than
      misinterpreted.
- [ ] A corrupt state entry is dropped and that job's `nextRun` recomputed from its
      schedule; other jobs are unaffected.
- [ ] When `ctx.storage` is absent on the host (feature-detected), the scheduler degrades to
      in-memory state: jobs still run, and the loss of cross-restart continuity is recorded
      in the run record.

### Observability — observability/debuggability

- [ ] Every fire, skip, and error emits exactly one bounded line to the server log via
      `console.error`, prefixed `scheduled-tasks:` and including the job id.
- [ ] A repeated identical failure logs **once**, not once per tick.
- [ ] `schedules_list` reports per job: `id`, `schedule`, `timezone`, `enabled`, `nextRun`,
      `lastRun`, `lastStatus`, `lastError`, and whether the lease is held elsewhere.

### Security — security/threat model

- [ ] A job executes with the target session's existing agent, model, and permissions. The
      plugin grants no additional authority and implements no sandbox; this is documented as
      the threat model, not engineered around.

### Environment and lifecycle — environment/platform

- [ ] The tick interval is `unref()`ed, so the scheduler never keeps the server process
      alive.
- [ ] Lockfile paths are built with `node:path` and behave on Windows.
- [ ] The `setup` cleanup function clears the interval, releases the lease, and disposes the
      tool registration; it is safe to call more than once.

### Upgrade — upgrade/data-loss

- [ ] Upgrading the plugin preserves run history; no code path deletes another job's state.
- [ ] Storage keys are namespaced so they can never collide with another plugin's keys.
- [ ] Removing a job from the file leaves its inert state behind; it is never used again
      unless the id returns.