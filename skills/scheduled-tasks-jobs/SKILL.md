---
name: scheduled-tasks-jobs
description: Author, review and validate recurring cron jobs for the opencode-scheduled-tasks OpenCode V2 plugin, in .opencode/schedules.json or .opencode/tasks/<id>.md. Covers the job fields, cron syntax, timezones and DST, misfire (skip/backfill) and cost bounds, run timeouts, and unattended permissions. Use when creating or changing a scheduled job, choosing a schedule or model for one, or explaining why a job ran, was skipped or timed out.
license: MIT
compatibility: OpenCode V2 with the opencode-scheduled-tasks plugin installed (see scheduled-tasks-setup). The validation script needs Node 20+ and npx tsx.
metadata:
  repository: https://github.com/Arggon/opencode-scheduled-tasks
---

# Author recurring jobs

Recurring jobs are defined **only by files** in the project, so every change is reviewable in a
pull request. No tool creates or edits a recurring job. After editing, run `opencode reload`
(files are read once at startup). The `schedules_format` tool returns a short version of this
reference from the running plugin; full field table: [references/job-reference.md](references/job-reference.md).

## Steps

1. Pick a surface. JSON array `.opencode/schedules.json` (`{"version": 1, "jobs": [...]}`), or one
   markdown file per job `.opencode/tasks/<id>.md` (filename stem = id, body = prompt; needs `yaml`).
   Same id in both: the markdown one wins and a shadow is reported.
2. Write the job. Required: `id` (`^[a-z0-9][a-z0-9._-]*$`), `schedule`, `prompt`. **Always set
   `model`** — otherwise the session default (often paid) is used. Set `timezone` (IANA).
3. Set permissions for unattended work (below).
4. Validate: `npx tsx skills/scheduled-tasks-jobs/scripts/validate-jobs.ts <project-dir>` from a
   clone of the repo (see [scripts/validate-jobs.ts](scripts/validate-jobs.ts)). It runs the
   plugin's own loaders and prints each job's next run, or the refusal reason.
5. `opencode reload`, then `schedules_list` to confirm `nextRun`; `schedules_run` to try it now.

Examples: [assets/schedules.example.json](assets/schedules.example.json),
[assets/nightly-audit.md](assets/nightly-audit.md).

```json
{
  "version": 1,
  "jobs": [
    {
      "id": "nightly-audit",
      "schedule": "0 3 * * *",
      "timezone": "America/Argentina/Cordoba",
      "model": "opencode/space-bunny-free",
      "prompt": "Review the diff since the last tag for security issues.",
      "misfire": "skip",
      "runTimeout": "30m",
      "permissions": { "bash": { "*": "deny", "git diff *": "allow" }, "edit": "deny" }
    }
  ]
}
```

## Schedules

5-field cron `minute hour dom month dow`, or `@hourly @daily @weekly @monthly @midnight @yearly
@annually`. Supports `*`, lists, ranges, steps (`*/15`, `9-17/4`), month/day names, `7` = Sunday.
If both day-of-month and day-of-week are restricted, either matching is enough (Vixie rule).
Impossible schedules (`0 0 30 2 *`) are refused at load. Evaluated in the job's `timezone`
(default: server local). DST: a nonexistent wall time (spring forward) is **skipped** to the next
day; a repeated one (fall back) fires once, at the first occurrence.

## Misfire and cost bounds

- `misfire: skip` (default): a missed backlog (e.g. laptop asleep) runs **once**.
- `misfire: backfill`: replays up to `maxCatchUp` (default 5, clamped 1–50) missed occurrences,
  oldest first, **one per tick**. Uncovered occurrences are logged and recorded as `dropped` in
  `schedules_history` (`droppedCapped` = lower bound).
- No queue: at most `maxConcurrentRuns` (default 1) dispatches at once. With no free slot a
  `skip` occurrence is spent and recorded `skipped`; a `backfill` occurrence stays owed.
- Failed runs are not retried; use `schedules_run`.
- `runTimeout` (default `15m`; `30s`, `5m`, `2h`, `1h30m`, `1d`; bare number = seconds) is clamped
  to 1 minute – 24 hours. On overrun the session is interrupted and the run recorded `timeout`
  (or `abandoned` if the host cannot interrupt). Zero/negative/malformed values refuse the job.
- `session: reuse` (default) keeps one session per job (context accumulates, so later runs cost
  more tokens); `session: fresh` starts a new one per run.

## Unattended permissions

Nobody answers prompts during a scheduled run: an `ask` is effectively a **deny** (reported as
`askAsDeny`), and `external_directory` defaults to `ask`, so access outside the project fails
unless allowed. `permissions` uses OpenCode's shape (action → effect, or glob → effect), max 32
actions; rules are re-applied before each run. Absent → the session's own rules. Jobs never get
more authority than the session would.
