# opencode-scheduled-tasks

Cron-style **scheduled agent tasks for [OpenCode V2](https://opencode.ai/v2/docs/)**.

OpenCode V2 has no scheduler: no CLI subcommand, no config field, no API path. This plugin
adds one — declarative cron jobs that dispatch agent prompts on a running server.

```jsonc
// .opencode/schedules.json
{
  "version": 1,
  "jobs": [
    {
      "id": "nightly-audit",
      "schedule": "0 3 * * *",              // 03:00 daily
      "timezone": "Europe/Madrid",
      "prompt": "Review the diff since the last tag for security issues.",
      "misfire": "skip"
    }
  ]
}
```

## Install

### Globally (this machine, every project)

The plugin is a **single dependency-free file**, so there is nothing to build and no
`node_modules`:

```sh
mkdir -p ~/.config/opencode/plugins/scheduled-tasks
cp src/index.ts ~/.config/opencode/plugins/scheduled-tasks/index.ts
opencode reload          # the plugins directory is scanned at startup
```

Verify:

```sh
opencode plugin list     # scheduled-tasks  local  ~/.config/opencode/plugins/scheduled-tasks/index.ts
```

`opencode reload` matters: a plugin directory added after the server started is not picked
up until then.

### In one project

```sh
mkdir -p .opencode/plugins/scheduled-tasks
cp src/index.ts .opencode/plugins/scheduled-tasks/index.ts
opencode reload
```

### From npm or git (once published)

```sh
opencode plugin add opencode-scheduled-tasks            # npm
opencode plugin add github:Arggon/opencode-scheduled-tasks   # git
```

`opencode plugin add` writes to the **global** config and installs into
`~/.config/opencode/`, so it is the same thing as the copy above, done for you.

### Jobs are per project, the plugin is not

The plugin can be installed globally, but it reads
`<project>/.opencode/schedules.json` from the **session's project directory**. So one global
install serves every repo, each with its own schedules. A project with no job file loads the
plugin, logs `no enabled jobs`, arms no timer, and takes no writer lease.

## Job reference## Job reference

| Field | Default | Meaning |
| --- | --- | --- |
| `id` | *required* | `^[a-z0-9][a-z0-9._-]*$`, unique. Namespaced in storage, so it is never a path. |
| `schedule` | *required* | 5-field cron (`minute hour dom month dow`) or `@hourly` / `@daily` / `@weekly` / `@monthly`. |
| `timezone` | server local | IANA zone. The schedule is evaluated here, never in the host's `TZ`. |
| `prompt` | *required* | The text dispatched to the session. |
| `agent` | session default | Agent to switch to before dispatching. |
| `model` | session default | `provider/model` for this job's runs. **Set it.** |
| `enabled` | `true` | Set `false` to park a job without deleting it. |
| `misfire` | `"skip"` | `skip` collapses a backlog to one run; `backfill` replays up to `maxCatchUp`. |
| `maxCatchUp` | `5` | Replay ceiling for `backfill`. |
| `runTimeoutMs` | `900000` | Per-run bound; on expiry the session is interrupted. |

Supported cron syntax: `*`, lists (`1,15`), ranges (`9-17`), steps (`*/15`, `9-17/4`),
month names (`JAN-mar`) and day names (`sun`); `7` is accepted as Sunday. Day-of-month and
day-of-week follow the Vixie rule: when **both** are restricted, a day matches if **either**
does.

A schedule that can never match (`0 0 30 2 *` — 30 February) is rejected at load with a
named reason rather than becoming a job that silently never fires.

## Tools

- **`schedules_list`** — pure read. Per job: schedule, timezone, `nextRun`, `lastRun`,
  `lastStatus`, `lastError`, plus whether another instance holds the lease.
- **`schedules_run`** — trigger one job now, obeying the same concurrency, timeout and lease
  rules. Returns the admitted inbox id.

Neither mutates the job set: **jobs are defined by the file**, so every change is reviewable
in a pull request.

## Cost safety

Every run is a real model request, so the scheduler is deliberately conservative:

- **Name a `model` on every job.** Without one a job inherits the session default, which for
  unattended recurring work is very often a *paid* model. The resolved model is echoed in
  every `running` line precisely so this is visible rather than assumed:

  ```
  scheduled-tasks: running nightly-audit (schedule "0 3 * * *" Europe/Madrid, model opencode/space-bunny-free)
  ```

  The plugin never picks a model for you — that would be wrong for other users — but it will
  always tell you which one it used.


- A sleeping laptop that misses eight occurrences of `* * * * *` fires **once**, not eight
  times (`misfire: "skip"`). `backfill` replays up to `maxCatchUp`, oldest first, and reports
  the dropped remainder rather than swallowing it.
- At most one run is in flight at a time (`maxConcurrentRuns`). A due occurrence that finds
  no free slot is **skipped and recorded**, never queued.
- A failed run is **not** retried within its occurrence. Trigger a re-run with
  `schedules_run`.
- `runTimeoutMs` bounds every run, which is also what makes a job safe when its prompt
  triggers a permission request nobody will ever answer.

## Observability

Lines go to `stderr` **and** to a per-project file, because plugin `console.error` is not
captured into OpenCode's own log file:

```
~/.local/share/opencode/scheduled-tasks/<project>/scheduler.log
```

```
2026-10-02T13:13:07.564Z scheduled-tasks: running dogfood-smoke (schedule "* * * * *" Europe/Madrid)
2026-10-02T13:14:07.573Z scheduled-tasks: running dogfood-smoke (schedule "* * * * *" Europe/Madrid)
```

Set `OPENCODE_SCHEDULED_TASKS_DATA_DIR` to relocate that directory (containers, read-only
homes, test runs).

## One writer per machine

A plugin loads **once per server process**, so two servers would double-fire every job. The
plugin takes an exclusive lockfile beside its log (`fs.open(path, "wx")` — atomic exclusive
create). A second server logs one line, stays inert, and still answers `schedules_list`. A
lease whose heartbeat goes stale is reclaimed, so a `SIGKILL`ed server cannot wedge
scheduling; a lockfile under **our own pid** is reclaimed too, so `opencode reload` does not
strand the plugin.

If the lock directory cannot be created the scheduler runs **without** arbitration and says
so, rather than disabling itself.

## Threat model

A job executes with the target session's existing agent, model and **permissions**. The
plugin grants no additional authority and implements no sandbox: a job can do exactly what
that repo's own OpenCode `permissions` config already allows. Gate schedules there, and keep
job prompts in version control so changes are reviewed.

## Non-goals

Runtime job CRUD (edit the file) · occurrence queueing · retry-with-backoff · multi-machine
locking · sandboxing beyond inherited permissions.

### Jobs that must run while the server is down

This plugin only runs while a server is up. For a job that must fire regardless, use OS
scheduling and reuse the same session continuity:

```sh
0 3 * * * opencode run -s nightly-audit "Review the diff since the last tag for security issues."
```

## Development

```sh
npm install
npm run check        # typecheck + tests
npx tsx harness/smoke.ts   # real-clock end-to-end: admits an actual scheduled prompt
```

The harness matters: it is what caught the two bugs unit tests with an injected clock could
not — a never-run job whose cursor stayed unarmed and so never came due, and a cadence floor
that silently doubled the default interval.

## Design

Decisions live in `ArggonManager/docs/adr/`: a single tick loop over a declarative job file
(0001), misfire and cost bounds (0002), and the cross-process writer lease (0003). The
requirements they answer are in `ArggonManager/docs/specs/spec-opencode-scheduled-tasks-001.md`,
and the ground truth they rest on in
`ArggonManager/docs/explorations/exploration-opencode-scheduled-tasks-001.md`.

## License

MIT