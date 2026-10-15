---
name: scheduled-tasks-runtime
description: Operate the opencode-scheduled-tasks OpenCode V2 plugin at runtime with its tools - list jobs and next runs, trigger a job now, read run history, schedule or cancel a one-off prompt for a later time, and start or stop a loop that re-posts a prompt into the current session every N minutes. Use when the user says "remind me / run this in 2h", "check the deploy every 5 minutes", "run the nightly job now", or asks whether or why a scheduled job ran.
license: MIT
compatibility: OpenCode V2 with the opencode-scheduled-tasks plugin installed (see scheduled-tasks-setup).
metadata:
  repository: https://github.com/Arggon/opencode-scheduled-tasks
---

# Run, inspect and schedule ephemeral work

These tools are exposed by the plugin. None of them creates or edits a **recurring** job — that
is done in the job files (`scheduled-tasks-jobs` skill). Every dispatch below is a real model
request and shares the `maxConcurrentRuns` budget (default 1).

## Inspect

- `schedules_list` — per job: schedule, timezone, `nextRun`, `lastRun`, `lastStatus`,
  `lastError`, `enabled`, `misfire`, `session`, resolved `permissions`, `askAsDeny`,
  `runTimeoutMs`, `agent`, `model`, `running`; plus `invalid` (refused jobs, shadows), pending
  `oneOffs`, `loops`, `leaseHeld` / `leaseForeign`, `tickMs`. Pure read. Start here.
- `schedules_history` — recent runs (newest first) for a job, a one-off or a loop: due/start
  times, outcome (`ok` / `timeout` / `failed` / `skipped`), model, session, error, `dropped`.
- `schedules_format` — the job-file reference text, for authoring.

## Trigger a recurring job now

`schedules_run` with the job id. It obeys the same rules as a scheduled run: takes a concurrency
slot, holds the job's run lease, is bounded by its `runTimeout`, records history, and is refused
while another server holds the writer lease. Failed runs are never retried automatically; this is
the way to re-run.

## One-off prompts

```
schedules_schedule({ prompt: "Run the migration check", dueIn: "2h" })   // or dueAt: <epoch ms>
schedules_cancel({ id: "oneoff_ab12cd34" })
```

- Runs once, in a **fresh** session, with the same permission handling as jobs; optional `model`
  (set one — otherwise the session default is used).
- A time up to 5 minutes in the past still runs on the next tick; older is refused.
- Ephemeral: never written to a job file. After running it survives only in `schedules_history`.
- If no concurrency slot is free when due, it is **spent** and recorded `skipped`.

## Session loops

```
schedules_start_loop({ prompt: "Check the deploy and report status", every: "5m" })
schedules_stop_loop({ id: "loop_ab12cd34" })   // omit id to stop every loop in this session
```

- Posts into **the session that started it**, using that session's model, agent and permissions
  (a loop takes none of its own). Cannot target or be stopped from another session.
- Minimum interval 1 minute; max 10 loops per session; default lifetime **3 days** (`ttl` to
  change), then it auto-disables.
- Cost: a 5m loop left for 3 days is about 860 requests. Stop it when done.
- A tick with no free slot is skipped for that loop; the loop continues.
- Loops are restored after restart only if the host provides `ctx.storage.scan`.

## Notes

Runtime prompts are never reviewed in a pull request; treat a loop prompt like code, since it acts
with a live person's session. Everything runs only while an OpenCode server is up.
