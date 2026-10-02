---
id: 0001
title: Tick loop over declarative jobs
status: Accepted
date: 2026-10-02
deciders: arggon
---

# ADR 0001: Tick loop over declarative jobs

## Context

OpenCode V2 has no scheduler: no CLI subcommand, no config field, no API path (verified
against the live 2.0.22 server's 116-path OpenAPI, the V2 docs index, and a binary string
scan). A plugin is the only in-process extension point, and its `setup(ctx)` may return a
cleanup function — so a timer is possible. The open questions are **what drives the timer**
and **where a job's definition lives**.

A plugin runs once per server process and may run in several at once
(`opencode serve` plus an `opencode --standalone`), so the design must not assume a single
scheduler instance.

## Decision

**A single `unref()`ed `setInterval` tick loop** drives every job, evaluating all enabled
jobs each tick and firing those whose `nextRun` has passed.

**Jobs are declared in a version-controlled `.opencode/schedules.json`.** That file is the
only source of truth for *what* a job is. Mutable run state — `lastRun`, `nextRun`,
`leaseUntil`, `lastStatus` — lives in `ctx.storage` under a namespaced prefix and is never
written to the job file.

Both halves matter:

- The **tick loop** gives one timer, a single dispose path (`clearInterval`), and O(jobs)
  cost per tick. `nextRun` is advanced arithmetically, so a tick never rescans the elapsed
  wall-clock — a server asleep for a week does not do a week of work in one tick.
- The **declarative file** keeps job definitions reviewable in a PR. Runtime job CRUD
  (`schedules_add`/`schedules_remove`) is deliberately **not** in v1: it would split the
  source of truth between a reviewed file and mutable state, and every agent that could
  write a job becomes an agent that can install a recurring one.

The plugin adds no top-level OpenCode config field. `ctx.options` may supply defaults, but
the file is what defines jobs.

## Consequences

- Fire accuracy is bounded by the tick cadence (default 30 s). Acceptable: a run is a
  multi-second model call.
- Only two tools: `schedules_list` (pure read) and `schedules_run` (ad-hoc trigger). Neither
  mutates the job set.
- Changing a job means editing the file and reloading; there is no runtime mutation path.
- The plugin is inert when the file is absent, but still registers its tools and reports an
  empty list — absence is not an error.

## Alternatives considered

- **Per-job chained `setTimeout`** — N timers plus a re-arm path on every fire and reload,
  for accuracy nobody needs. Rejected.
- **OS cron / systemd calling `opencode run`** — survives server downtime and is OS-native,
  but is not a plugin, is platform-specific, and loses session continuity. Kept as a
  *documented escape hatch* for a job that must fire while the server is down, not as the
  engine.
- **Runtime job CRUD tools** — rejected: splits the source of truth, see above.