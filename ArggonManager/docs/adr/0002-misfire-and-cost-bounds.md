---
id: 0002
title: Misfire and cost bounds
status: Proposed
date: 2026-10-02
deciders: arggon
---

# ADR 0002: Misfire and cost bounds

## Context

Every scheduled run is a **real, billable model request** that consumes tokens, hits rate
limits, and can execute tools. The scheduler's failure mode is therefore not "crashes" but
"quietly spends a lot of money": a laptop that sleeps across eight occurrences of a
`*/15 * * * *` job must not wake up and fire eight times.

Two independent pressures collide. Catch-up that is too eager is a cost incident; catch-up
that is too timid silently loses work the user scheduled. The policy must make that choice
**explicit and per-job**, not an emergent property of a sleep/wake cycle.

## Decision

Each job declares `misfire`, evaluated when the tick finds one or more occurrences that
passed while the scheduler was not running:

- **`skip`** (default) — fire **at most once**, immediately, then advance `nextRun` past
  `now`. A backlog of eight collapses into one run.
- **`backfill`** — replay missed occurrences oldest-first, up to `maxCatchUp`
  (default 5). Beyond the cap the remainder is dropped and reported as truncated in the run
  record, never silently.

Every occurrence is *at most* one attempt. A failed run records `lastStatus: failed` and is
**not** retried within that occurrence — retrying a billable call that just failed is how a
flaky provider becomes a spend loop. The next occurrence is a fresh attempt.

Two further bounds:

- **Global concurrency.** At most `maxConcurrentRuns` (default 1) runs in flight at once.
  A due occurrence that finds no free slot is *skipped and recorded*, never queued — a queue
  would replay the backlog the misfire policy just decided to collapse.
- **Per-run timeout.** `runTimeoutMs` bounds each run. On expiry the scheduler interrupts
  the session (`ctx.session.interrupt`) and records `lastStatus: timeout`. This is also the
  bound that makes a job safe when its prompt triggers a permission request no human will
  ever answer.

`catchUpWindow` is deliberately **not** added in v1. `skip` and `backfill` cover the real
cases, and a third knob would be a second way to express the same choice.

## Consequences

- A sleeping laptop costs one run, not a week of runs.
- A user who genuinely wants every occurrence replayed opts into `backfill` per job.
- Overlapping occurrences are dropped rather than serialized. A job whose run exceeds its
  cadence loses occurrences by design; the run record says so.
- Failed runs are visible in `schedules_list` but cost nothing extra to retry — the user
  triggers a re-run with `schedules_run`.

## Alternatives considered

- **Unbounded backfill** — the cost incident this ADR exists to prevent.
- **Retry failed runs with backoff** — retries billable calls; a provider outage would
  multiply spend. Rejected.
- **An occurrence queue** — replays exactly what the misfire policy collapsed, and grows
  without bound while the server is down. Rejected.
- **`catchUpWindow` as a third mode** — redundant with `skip`/`backfill`. Deferred.