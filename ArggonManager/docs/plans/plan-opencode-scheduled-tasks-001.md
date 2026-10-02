---
plan_id: opencode-scheduled-tasks-001
title: Plan for Cron-style scheduled agent tasks
spec: ArggonManager/docs/specs/spec-opencode-scheduled-tasks-001.md
status: proposed
created: 2026-10-02
---

# Plan: Cron-style scheduled agent tasks (opencode-scheduled-tasks-001)

Derived from `ArggonManager/docs/specs/spec-opencode-scheduled-tasks-001.md`. Each task
carries a verifiable acceptance criterion and links back to the spec. Waves are
file-disjoint: T1–T3 are pure modules with no OpenCode dependency and can run in parallel;
T4 and T5 depend on them.

## Tasks

### T1: Cron expression parser and next-occurrence arithmetic

- Parse 5-field cron (`minute hour day-of-month month day-of-week`) supporting `*`, lists,
  ranges, and steps; expand the `@hourly`/`@daily`/`@weekly`/`@monthly` macros.
- Compute the next occurrence strictly after a given instant, in a named IANA timezone.
- Reject malformed expressions, out-of-range fields, and schedules that can never match
  (e.g. `0 0 30 2 *`).
- **Acceptance:** a table-driven test pins the next occurrence for each field position
  (including month rollover and leap day) under UTC and a DST-observing zone; malformed and
  impossible schedules are rejected with a named reason; DST spring-forward skips the
  nonexistent local time and fall-back yields a single first occurrence.
- **Spec:** Loading and validation; Time.

### T2: Misfire resolution and the run-state machine

- Resolve a due job against the misfire policy: `skip` collapses a backlog to one run,
  `backfill` replays up to `maxCatchUp` oldest-first and reports truncation.
- Track per-job run state (`lastRun`, `nextRun`, `lastStatus`, `lastError`) as a pure
  reducer over an injected clock and a persisted, versioned record.
- Enforce `maxConcurrentRuns` and the per-job in-flight set; an overlapping occurrence is
  recorded as skipped, never queued.
- **Acceptance:** reducer tests pin that a backlog of 8 under `skip` yields exactly one run,
  that `backfill` yields `maxCatchUp` runs plus a truncated remainder record, that an
  in-flight job's next occurrence records `skipped`, and that an unknown state version
  re-initializes instead of misreading.
- **Spec:** Limits; Concurrency; Persistence.

### T3: Cross-process lease

- Acquire an exclusive lockfile with `fs.open(path, "wx")` under a per-project data
  directory; write PID and heartbeat; refresh the heartbeat each tick; reclaim a lease
  staler than `leaseTtl`; release on cleanup.
- Degrade to running without the lease — recording that in the run record — when the
  directory cannot be created, rather than disabling the scheduler.
- **Acceptance:** a test that holds the lock in a second "instance" shows the second
  instance logging once and not arming; a lock with an expired heartbeat is reclaimed; a
  failed directory creation yields a lease-free run that reports the degradation.
- **Spec:** Concurrency.

### T4: The plugin entry — context wiring, tools, and failure isolation

- Assemble the single dependency-free plugin file: structural context types, plain
  default-export definition object, **no** `@opencode/plugin` import (this static import
  breaks loading on 2.0.7–2.0.12), `setup` → cleanup.
- Load and validate `.opencode/schedules.json`, retaining last-known-good on malformed
  JSON; register `schedules_list` and `schedules_run` via `ctx.tool.transform`.
- Arm the `unref()`ed tick loop only when the lease is held and at least one job is enabled;
  drive T1+T2 from the tick.
- **Acceptance:** with a fake context, setup registers both tools and returns a cleanup that
  clears the interval, releases the lease and disposes the registration, and is safe to call
  twice; a context missing `ctx.storage` degrades to in-memory state; a malformed job file
  keeps the previous job set; a throwing run is recorded and never escapes the loop.
- **Spec:** all.

### T5: Docs, packaging, and dogfood

- `README.md`: install, job-file reference, the two tools, the threat model, and the
  documented escape hatch (OS cron for jobs that must fire while the server is down).
- `package.json` publishable as an OpenCode plugin; ship the vendored-single-file install
  path (zero `node_modules`) alongside the package.
- Dogfood: install into this repo and drive a `* * * * *` job end to end against a real
  server, capturing the observed log lines.
- **Acceptance:** a fresh clone can install and run a one-minute job with no build step, and
  the README's documented commands are executed verbatim by the dogfood run.
- **Spec:** Synopsis.

## Non-goals (recorded in exploration 001, not reopened here)

Runtime job CRUD tools · backfill queueing · retry-with-backoff · `catchUpWindow` ·
distributed/multi-machine locking · sandboxing beyond inherited session permissions ·
server-downtime guarantees (OS cron is the documented path).