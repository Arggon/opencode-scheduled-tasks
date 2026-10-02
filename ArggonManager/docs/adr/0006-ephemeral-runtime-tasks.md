---
id: 0006
title: Ephemeral runtime tasks — one-offs and session loops
status: Proposed
date: 2026-10-02
deciders: arggon
---

# ADR 0006: Ephemeral runtime tasks — one-offs and session loops

**Amends [ADR 0001](0001-tick-loop-over-declarative-jobs.md)** on one point only. Everything
else in ADR 0001 stands.

## Context

ADR 0001 ruled that jobs are defined by a file and that the plugin never mutates the job set,
on the grounds that a mutable job set splits the source of truth and lets any agent that can
write a job install a recurring one.

That reasoning is sound for **recurring** jobs, and this ADR does not overturn it. But two of
the most wanted capabilities are inherently *not* recurring jobs:

- **One-off tasks** — "run the migration check tomorrow at 8am". The defining property is that
  it runs once and then it is over. There is no steady-state definition to review, and
  demanding a PR for each one would make the feature unusable.
- **Session loops** — `/loop 5m check the deploy` posting into the *active* session for an
  in-session activity, auto-expiring after three days. `opencode-tasks` (see
  [Attribution](0007-attribution-and-lineage.md)) draws exactly this line in a comparison
  table, and the line is the right one.

Both are runtime, ephemeral, and scoped to a session or a moment. Treating them as "jobs"
would stretch the term until the ADR 0001 guarantee became untrue.

## Decision

**Recurring jobs stay file-only. Ephemeral tasks are a separate, runtime-only concept.**

- **Recurring jobs** remain exactly as ADR 0001 defines them: declarative file, never mutated
  by the plugin or an agent. The guarantee is unchanged and still testable.
- **One-off tasks** live in `ctx.storage` under their own namespace, created by an agent tool
  (`schedules_schedule`), listed by `schedules_list`, cancellable by `schedules_cancel`. They
  carry an **absolute instant** and a prompt; there is no cron expression because there is no
  recurrence.
- **Session loops** are in-session timers owned by the active session, created by
  `schedules_start_loop` and stopped by `schedules_stop_loop`. They post into the session that
  created them, use a **duration interval** (`5m`, `2h`, `1d`) rather than cron, and carry a
  default **three-day expiry**.
- Neither can become recurring: promoting a one-off to a recurring job is an explicit act of
  writing a job file, never a side effect.
- Both expire. A completed one-off is retained only inside the bounded run history
  (see spec 002); an expired loop is disabled and reported.

## Consequences

- ADR 0001's guarantee is **narrowed and sharpened**, not dropped: "recurring jobs are
  file-only" is now a testable statement, because one-offs and loops are explicitly outside it.
- Two new runtime stores, both under namespaced storage keys so they can never collide with
  recurring-job state.
- The plugin now holds mutable state it did not before, so the same bounds apply: expiry on
  every entry, bounded cardinality, and a cap on one-offs and loops per project.
- Unbounded accumulation is the failure mode to fear here — a chatty agent creating one-offs in
  a loop. The cap and the expiry are the answer, and they are acceptance criteria in spec 002,
  not afterthoughts.

## Alternatives considered

- **Let agents create recurring jobs too** — rejected: it defeats the purpose of ADR 0001, and
  "an agent can install a recurring unattended job" is exactly the capability a reviewer would
  want to gate behind a diff.
- **Persist one-offs to the job file** — rejected: a job file full of dead one-off history is
  noise in every diff, and completion would mean rewriting the source of truth.
- **Treat loops as recurring jobs with a short cron** — rejected: a loop needs a duration
  interval and in-session targeting, neither of which a cron expression expresses, and routing
  it through the recurring path would let loops outlive the session that asked for them.