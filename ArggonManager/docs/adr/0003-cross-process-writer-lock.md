---
id: 0003
title: Cross-process writer lock
status: Accepted
date: 2026-10-02
deciders: arggon
---

# ADR 0003: Cross-process writer lock

## Context

A plugin is instantiated **once per server process**, and a user can easily have more than
one OpenCode server: the shared background service plus an `opencode --standalone` TUI, or
two `opencode serve` instances on different ports. Two instances means two tick loops, and
two tick loops means **every scheduled prompt fires twice** — double the bill, double the
tool side effects.

`ctx.storage` would be the natural place to arbitrate, but its cross-process scoping is
**unverified**: it has no HTTP endpoint (it is plugin-internal), the docs do not state
whether two servers share a store, and the ArggonManager playbook treats it as per-plugin
state without addressing multi-process access. Designing on an unverified primitive is how
double-spend bugs ship.

## Decision

**Arbitrate with an OS-level exclusive lockfile, not with `ctx.storage`.**

On acquiring the tick loop, the plugin creates a lockfile with `fs.open(path, "wx")` —
atomic exclusive create, `EEXIST` when another live instance holds it. The file records the
owning PID and a heartbeat timestamp. The holder refreshes the heartbeat on every tick; an
instance whose lock is **stale** (heartbeat older than `leaseTtl`) reclaims it, so a crashed
or `SIGKILL`ed server does not wedge scheduling permanently. The lock is released in the
`setup` cleanup function, and released-and-stale are treated identically on the next acquire.

The lock lives under a per-project data directory derived from the plugin's own location, so
two different repos never contend.

`ctx.storage` keeps its narrower, honest role: a **cache of run state**, per ADR 0001. Its
scoping being unknown no longer matters, because it no longer decides who fires.

## Consequences

- A second server logs one line and stays inert instead of duplicating every run. It does
  not fail: its `schedules_list` still reads the shared job file and reports that another
  instance holds the lease.
- A stale lock costs one missed occurrence at most, then self-heals on reclaim.
- The lease is advisory, not a distributed lock. It does not survive a machine clock jump
  backwards, and two servers on **different machines** over a shared filesystem are out of
  scope.
- If the lock directory cannot be created (read-only home), the plugin logs once and runs
  **without** the lease rather than disabling itself. This degrades to the pre-ADR
  double-fire risk and is recorded in the run record, so it is visible rather than silent.

## Alternatives considered

- **Arbitrate through `ctx.storage`** — rejected: the primitive's cross-process behavior is
  unverified, and a scheduler's correctness cannot rest on it.
- **In-memory `Map` guard** — cannot see another process. Useless for this purpose.
- **A mandatory hard lock (refuse to run without it)** — turns a permissions problem on
  `~/.local/share` into a silently dead scheduler. Rejected in favour of the logged
  degradation above.
- **A distributed lock (Redis, etc.)** — far beyond a single-workstation plugin. Rejected.