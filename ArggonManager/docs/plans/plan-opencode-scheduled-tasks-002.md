---
plan_id: opencode-scheduled-tasks-002
title: Plan for v2 — markdown task files, run control, ephemeral tasks
spec: ArggonManager/docs/specs/spec-opencode-scheduled-tasks-002.md
status: proposed
created: 2026-10-02
---

# Plan: v2 — markdown task files, run control, ephemeral tasks (opencode-scheduled-tasks-002)

Derived from `ArggonManager/docs/specs/spec-opencode-scheduled-tasks-002.md`. Governed by
ADR 0004 (markdown union), 0005 (permissions), 0006 (ephemeral tasks, amends 0001) and 0007
(attribution).

## A note on parallelism

The v1 design put everything in **one file** (`src/index.ts`) so it could be vendored and
audited with no build step. That is the right distribution trade and the wrong development
trade: **every task below touches the same file**, so there is no file-disjointness to plan
waves over. These tasks are sequential by nature, and several are genuinely ordered
(durations → session mode → history → one-offs → loops). They are listed as one ordered chain
rather than faked into parallel waves.

## Tasks

### T1: Duration parsing and the `schedules_format` tool

- Compound duration parser (`1h30m`, `5m`, `1d`, `30s`), rejecting malformed and non-positive
  values with named reasons; plain numbers mean seconds.
- Wire `runTimeout` alongside the existing `runTimeoutMs` on both config surfaces.
- `schedules_format` returns the job-file reference for agent authors.
- **Acceptance:** a table pins every accepted form and the rejections; `runTimeoutMs` still
  works unchanged; `schedules_format` names both config surfaces and the precedence rule.
- **Spec:** Durations. **Story:** config-surface.

### T2: Markdown task files (ADR 0004)

- Load `.opencode/tasks/<id>.md`, strip YAML frontmatter, use the body as the prompt.
- Merge by id with markdown winning; report shadowed ids.
- Route both surfaces through **one** validation path so per-job errors are identical in shape.
- Keep the YAML reader optional: absent markdown directory must mean zero dependencies.
- **Acceptance:** a markdown job loads and fires; a duplicate id yields one job plus one
  reported shadow; bad YAML refuses only that job; with no markdown directory the plugin
  imports nothing and behaves as v1 (asserted by a load-time test).
- **Spec:** Config surface. **Story:** config-surface. **Depends on:** T1.

### T3: Session mode and run history

- `session: reuse|fresh`; anything else refused with a named reason.
- Bounded per-job run-history ring buffer recording due/start/outcome/model/error.
- `schedules_history`, and the resolved mode reported in `schedules_list` and the log line.
- **Acceptance:** `fresh` creates a new session per run and `reuse` does not; an invalid mode
  is refused; the buffer evicts oldest-first at its cap; `schedules_history` on an unknown id
  returns a typed error naming the id.
- **Spec:** Session mode, Run history. **Story:** run-control. **Depends on:** T1.

### T4: Per-job permissions (ADR 0005)

- Parse `permissions` in OpenCode's own schema; apply via `ctx.permission.rules()` immediately
  before `session.prompt`, ordered with `agent`/`model`.
- No declaration ⇒ session default unchanged (no implicit tightening).
- Treat `"ask"` as a reported deny for scheduled runs rather than a silent timeout.
- README: last-match-wins ordering with a correct and an incorrect example, plus the
  `external_directory` footgun.
- **Acceptance:** declared rules are applied before dispatch in the tested order; an absent
  `permissions` leaves the session untouched; an `"ask"` is reported in the run record and the
  log line; a host without `ctx.permission.rules` degrades to session defaults and logs once.
- **Spec:** Permissions. **Story:** run-control. **Depends on:** T3.

### T5: One-off tasks (ADR 0006)

- `schedules_schedule` / `schedules_cancel`; own storage namespace, never a job file.
- Absolute instant only (no cron — a one-off has no recurrence); past instants refused or
  executed within a small grace window, never silently "due now".
- Completed one-offs survive only in run history; per-project cap (default 50).
- **Acceptance:** a one-off fires once at its instant and is then gone; it never appears in a
  job file; cancelling an unknown or completed id returns a typed error naming it; the cap is
  reported when reached.
- **Spec:** One-off tasks. **Story:** ephemeral-tasks. **Depends on:** T3.

### T6: Session loops (ADR 0006)

- `schedules_start_loop` / `schedules_stop_loop`; duration interval, sub-minute refused.
- Post into the creating session only; default three-day expiry, auto-disable and report.
- Per-session cap (default 10); cleared when the session is gone.
- **Acceptance:** a loop posts into its own session and nowhere else; a sub-minute interval is
  refused; an expired loop disables itself and is reported; stopping an unknown id returns a
  typed error; a loop cannot outlive its session.
- **Spec:** Session loops. **Story:** ephemeral-tasks. **Depends on:** T5.

### T7: Attribution, docs and the v2 gate

- README **Acknowledgements** naming `opencode-tasks` and its author, with the adopted ideas
  listed; README sections for permissions semantics, session mode, one-offs, loops, history.
- Package metadata noting the lineage; verify the ADRs cite it inline (0004/0005/0006 already do).
- **Acceptance:** README's documented commands are executed verbatim by the dogfood run;
  `opencode-tasks` and its author are named in the README and in spec 002; the v1 job file
  still behaves identically (additive-upgrade assertion).
- **Spec:** Observability/upgrade. **Story:** all three.

## Out of scope (recorded, not reopened)

OS daemon · runtime creation of recurring jobs · CLI · global task directory · multi-machine
locking. See spec 002 § Non-goals.

## Open question for the maintainer

Upstream contribution back to `jdormit/opencode-tasks` is desirable but is the author's call.
Not assumed by this plan; raise it with them directly (ADR 0007).