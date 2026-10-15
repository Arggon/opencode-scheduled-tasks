---
name: scheduled-tasks-setup
description: Install, verify and troubleshoot the opencode-scheduled-tasks plugin, which adds cron-style scheduled agent tasks to OpenCode V2. Use when the user wants scheduled, recurring or timed agent prompts in OpenCode, asks how to install the scheduler plugin, or reports that scheduled jobs are not firing, the log is missing, or a second server is inert.
license: MIT
compatibility: OpenCode V2 only (not V1, not other agents). Node built-ins only; the optional `yaml` package is needed only for markdown job files. Jobs run only while an OpenCode server is up.
metadata:
  repository: https://github.com/Arggon/opencode-scheduled-tasks
---

# Install and verify opencode-scheduled-tasks

OpenCode V2 core has no scheduler. This plugin (a single TypeScript file, `src/index.ts` in
https://github.com/Arggon/opencode-scheduled-tasks) runs a tick loop inside the OpenCode server
and dispatches prompts for jobs declared in the project. To write jobs, use the
`scheduled-tasks-jobs` skill; for one-offs and loops, `scheduled-tasks-runtime`.

## Install (pick one)

Global (every project on this machine):

```sh
git clone https://github.com/Arggon/opencode-scheduled-tasks
mkdir -p ~/.config/opencode/plugins/scheduled-tasks
cp opencode-scheduled-tasks/src/index.ts ~/.config/opencode/plugins/scheduled-tasks/index.ts
opencode reload
```

One project only: copy the same file to `.opencode/plugins/scheduled-tasks/index.ts` in the
project, then `opencode reload`.

From git: `opencode plugin add github:Arggon/opencode-scheduled-tasks` (writes the global config).

Not on npm yet. When published its name will be `arggon-opencode2-scheduled-tasks`; the npm names
`opencode-tasks` / `opencode-scheduled-tasks` belong to a different project (jdormit/opencode-tasks).

Markdown job files (`.opencode/tasks/*.md`) additionally need `yaml` resolvable from the plugin
(`npm install yaml`). JSON-only projects need no `node_modules`.

## Verify

1. `opencode plugin list` shows `scheduled-tasks`.
2. Even when installed globally, jobs are **per project**: the plugin reads
   `<project>/.opencode/schedules.json` and `<project>/.opencode/tasks/`. With no job file it logs
   `no enabled jobs ... no timer armed` and stays idle.
3. Call the `schedules_list` tool: it shows jobs, `nextRun`, `invalid` entries, `leaseHeld`,
   `tickMs`.
4. Read the log: `~/.local/share/opencode/scheduled-tasks/<project>/scheduler.log` (also stderr).
   `OPENCODE_SCHEDULED_TASKS_DATA_DIR` relocates that directory.

## Engine options

Set through OpenCode's object plugin form (`plugins: [{ package, options }]`); read once:

| Option | Default | Bounds |
| --- | --- | --- |
| `tickMs` | 30000 | 5000 – 3600000 |
| `maxConcurrentRuns` | 1 | 1 – 8 (shared by jobs, one-offs, loops, manual runs) |

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Plugin not listed | Run `opencode reload`; a plugin directory added after start is not scanned. |
| Edited job not picked up | Job files are read once at startup. Run `opencode reload`. |
| Job never fires | Check `schedules_list` → `invalid`, `enabled`, `nextRun`; check the log. Jobs only run while a server is up — for "must run anyway" use OS cron: `0 3 * * * opencode run -s <job-id> "<prompt>"`. |
| Second server does nothing | By design: one writer lease per machine. It logs the holder, still answers `schedules_list`, and refuses `schedules_run`. A stale lease (dead heartbeat, or our own pid after reload) is reclaimed. |
| Markdown jobs refused with "no YAML reader" | Install `yaml`; JSON jobs are unaffected. |
| `ctx.location.directory is unavailable` | Host gave no project directory; the scheduler is inert. Stderr only. |
| Run ends `timeout` | Exceeded `runTimeout` (default 15m); often an unanswered permission `ask`. See `scheduled-tasks-jobs`. |

## Network and security

The plugin itself imports only `node:fs`, `node:os`, `node:path` (plus optional `yaml`) and makes
no network calls. Each run is a normal OpenCode prompt, so the **model provider** is contacted by
OpenCode exactly as in an interactive session, and costs accordingly. Runs get the session's
permissions; the plugin adds no sandbox.
