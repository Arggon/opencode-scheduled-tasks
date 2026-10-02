---
spec_id: opencode-scheduled-tasks-002
title: v2 — markdown task files, run control, ephemeral tasks
status: implemented
created: 2026-10-02
---

# Spec: v2 — markdown task files, run control, ephemeral tasks (opencode-scheduled-tasks-002)

## Purpose

Extend the v1 scheduler ([spec 001](spec-opencode-scheduled-tasks-001.md)) with the capabilities
that make scheduled agent work safe, authorable and genuinely useful.

The ideas for permissions, one-off tasks, session loops, per-task session mode, run history,
duration strings and markdown authoring were **inspired by
[`jdormit/opencode-tasks`](https://github.com/jdormit/opencode-tasks) (MIT, Jeremy
Dormitzer)**, which was built independently and earlier; see
[ADR 0007](../adr/0007-attribution-and-lineage.md) and the Acknowledgements in the README.

**Invariants (carried from spec 001, restated because this change is large):**

1. **Cost-bounded** — every run is billable; backlog, concurrency and retries stay bounded.
2. **Single writer** — two servers never double-fire.
3. **Never breaks a session** — feature-detected, failure-isolated, no throw out of the plugin.
4. **Dependency-free core** — the plugin still loads with **zero** dependencies when no
   markdown task file is present (see ADR 0004).
5. **Recurring jobs stay file-only** — no agent, tool or daemon may create or mutate a
   *recurring* job. Only ephemeral tasks are runtime (ADR 0006).

## Synopsis

```jsonc
// .opencode/schedules.json  — unchanged
{ "version": 1, "jobs": [ { "id": "nightly", "schedule": "0 3 * * *", "prompt": "…" } ] }
```

```markdown
<!-- .opencode/tasks/nightly.md — new; body IS the prompt -->
---
schedule: "0 3 * * *"
timezone: Europe/Madrid
model: opencode/space-bunny-free
agent: build
session: reuse          # reuse (default) | fresh
runTimeout: 30m         # duration string, or ms number
misfire: skip
maxCatchUp: 5
permissions:
  bash:
    "*": deny
    "git diff *": allow
  edit: deny
---
Review the diff since the last tag for security issues.
```

```
tools.schedules.*   list · run · schedule · cancel · start_loop · stop_loop · history · format
```

## Acceptance

### Config surface — markdown union (ADR 0004)

- [ ] `.opencode/tasks/<id>.md` is loaded; the filename stem is the job id, matching
      `^[a-z0-9][a-z0-9._-]*$`.
- [ ] The markdown body is the prompt, with YAML frontmatter stripped; leading/trailing blank
      lines and a single trailing newline are trimmed, and inner formatting is preserved.
- [ ] JSON and markdown jobs merge by id; **markdown wins** on conflict and the shadowed id is
      reported through `schedules_list` rather than silently replaced.
- [ ] A malformed markdown job (bad YAML, missing schedule, bad id, missing body) is refused
      **per job** with a named reason, exactly as a malformed JSON job is.
- [ ] With no `.opencode/tasks/` directory the plugin loads with **zero** dependencies and
      behaves exactly as in v1.
- [ ] Frontmatter is untrusted input: field sizes and collection cardinality are bounded, and
      no frontmatter value is interpolated into a prompt.
- [ ] A markdown file whose stem duplicates a JSON job id produces one job and one reported
      shadow, never two jobs or a crash.

### Durations

- [ ] `runTimeout` and loop intervals accept duration strings — `30s`, `5m`, `2h`, `1d`,
      and compounds like `1h30m` — and plain numbers as seconds.
- [ ] A malformed or non-positive duration is refused with a named reason rather than silently
      defaulting.
- [ ] The existing millisecond field (`runTimeoutMs`) keeps working, unchanged.

### Permissions (ADR 0005)

- [ ] A job may declare `permissions`, mirroring OpenCode's own permission schema (action +
      glob `resource` + `allow`/`ask`/`deny`).
- [ ] Rules are applied via `ctx.permission.rules()` **immediately before** `session.prompt`,
      in the same ordered step as `agent` and `model`, and re-applied on every run.
- [ ] A job with no `permissions` inherits the session default **unchanged** — no implicit
      tightening.
- [ ] An `"ask"` rule in a scheduled context is treated as a **deny** and is reported as such
      in the run record and the `running` log line; it is never left to time out.
- [ ] `external_directory` is called out in the README as the default that fails most quietly.
- [ ] Last-match-wins rule ordering is documented in the README, with a correct and an
      incorrect example, because it inverts the usual expectation.
- [ ] On a host without `ctx.permission.rules` the job runs with session defaults and the
      degradation is logged once.

### Session mode

- [ ] `session: "reuse"` (default) keeps today's behaviour — one session per job, accumulated.
- [ ] `session: "fresh"` creates a new session per run and does not reuse it.
- [ ] A `session` value other than `reuse`/`fresh` is refused with a named reason.
- [ ] The resolved session mode appears in `schedules_list` and in the `running` log line.

### Run history

- [ ] Each job keeps a bounded ring buffer of its most recent runs (default last 10).
- [ ] Each entry records the due instant, start, outcome (`ok`/`failed`/`timeout`/`skipped`),
      the resolved model, and a bounded error string.
- [ ] `schedules_history` returns a job's history, newest first, bounded and pagination-free.
- [ ] The buffer is capped and **oldest entries are evicted**; history can never grow unbounded.
- [ ] An unknown job id returns a typed error naming the id, not an empty success.

### One-off tasks (ADR 0006)

- [ ] `schedules_schedule` creates an ephemeral task from an absolute instant plus a prompt.
- [ ] One-offs live under their own storage namespace and are **never** written to a job file.
- [ ] `schedules_list` reports pending one-offs with their due instant; `schedules_cancel`
      removes one by id.
- [ ] A one-off in the past is refused (or executed on the next tick if within a small grace
      window) — never silently treated as "due now".
- [ ] Completed one-offs are retained only inside run history, then discarded.
- [ ] Cancelling an unknown or already-completed id returns a typed error naming the id.
- [ ] One-offs per project are capped (default 50); the cap is reported when reached.

### Session loops (ADR 0006)

- [ ] `schedules_start_loop` creates an in-session loop from a duration interval and a prompt;
      `schedules_stop_loop` stops one by id or all.
- [ ] A loop's interval is a **duration**, not a cron expression, and sub-minute intervals are
      refused with a named reason.
- [ ] A loop posts into **the session that created it** and never into another.
- [ ] A loop carries a default **three-day expiry**, after which it auto-disables and is
      reported.
- [ ] Loops per session are capped (default 10); the cap is reported when reached.
- [ ] Stopping a loop that does not exist returns a typed error naming the id.
- [ ] Loops are cleared when their session is gone, and a loop cannot outlive its session.

### Observability and upgrade

- [ ] Every fire, skip, error, expiry and cancellation appends one bounded line to
      `scheduler.log`, including the job id.
- [ ] The `running` line names the resolved model **and** session mode.
- [ ] `schedules_format` returns the job-file reference so an agent can author jobs correctly.
- [ ] State written by a v1-shaped record (no new fields) loads unchanged; every new field is
      optional with a documented default.
- [ ] A v1 job file with no markdown directory produces identical behaviour to v1 — the upgrade
      is additive.
- [ ] Upgrading preserves recurring-job state and run history; nothing is deleted.

### Non-goals

Recorded here rather than reopened: an OS daemon (superseded by keeping the in-process
engine; OS cron remains the documented escape hatch — ADR 0001), runtime creation of
*recurring* jobs (ADR 0006), a CLI (tools are the V2-native surface), a global task directory
(per-project schedules stay PR-reviewable), and multi-machine locking.