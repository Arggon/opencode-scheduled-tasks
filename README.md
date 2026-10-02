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

### From git (available now)

```sh
opencode plugin add github:Arggon/opencode-scheduled-tasks
```

`opencode plugin add` writes to the **global** config and installs into
`~/.config/opencode/`, so it is the same thing as the copy above, done for you.

### From npm

Not yet published. The name `opencode-scheduled-tasks` is already taken on npm by
[`jdormit/opencode-tasks`](https://github.com/jdormit/opencode-tasks), so publishing here
needs a different name first.

### Jobs are per project, the plugin is not

The plugin can be installed globally, but it reads
`<project>/.opencode/schedules.json` from the **session's project directory**. So one global
install serves every repo, each with its own schedules. A project with no job file loads the
plugin, logs `no enabled jobs`, arms no timer, and takes no writer lease.

## Job reference

| Field | Default | Meaning |
| --- | --- | --- |
| `id` | *required* | `^[a-z0-9][a-z0-9._-]*$`, unique. Namespaced in storage, so it is never a path. |
| `schedule` | *required* | 5-field cron (`minute hour dom month dow`) or `@hourly` / `@daily` / `@weekly` / `@monthly`. |
| `timezone` | server local | IANA zone. The schedule is evaluated here, never in the host's `TZ`. |
| `prompt` | *required* | The text dispatched to the session. |
| `agent` | session default | Agent to switch to before dispatching. |
| `model` | session default | `provider/model` for this job's runs. **Set it.** |
| `enabled` | `true` | Set `false` to park a job without deleting it. |
| `permissions` | session default | Per-job permission rules in OpenCode's own schema. Absent ⇒ session defaults are inherited unchanged. |
| `session` | `reuse` | `reuse` keeps one session per job so runs build on prior context; `fresh` starts a new session per run, for stateless work. |
| `misfire` | `"skip"` | `skip` collapses a backlog to one run; `backfill` replays up to `maxCatchUp`. |
| `maxCatchUp` | `5` | Replay ceiling for `backfill`. |
| `runTimeout` | `15m` | Duration: `30s`, `5m`, `2h`, `1h30m`, `1d`. A bare number means seconds (see Acknowledgements). |
| `runTimeoutMs` | — | The millisecond form, kept for compatibility; wins only when `runTimeout` is absent. |

Supported cron syntax: `*`, lists (`1,15`), ranges (`9-17`), steps (`*/15`, `9-17/4`),
month names (`JAN-mar`) and day names (`sun`); `7` is accepted as Sunday. Day-of-month and
day-of-week follow the Vixie rule: when **both** are restricted, a day matches if **either**
does.

A schedule that can never match (`0 0 30 2 *` — 30 February) is rejected at load with a
named reason rather than becoming a job that silently never fires.

## Tools

- **`schedules_list`** — pure read. Per job: schedule, timezone, `nextRun`, `lastRun`,
  `lastStatus`, `lastError`, plus whether another instance holds the lease.
- **`schedules_schedule`** — schedule a one-off prompt for a time (`dueAt` epoch ms, or
  `dueIn` like `"2h"`). Runtime-only and ephemeral.
- **`schedules_cancel`** — cancel a pending one-off by id.
- **`schedules_history`** — one job's recent runs, newest first: due and start instants,
  outcome, resolved model, and any error. An unknown id returns a typed error naming it,
  never an empty list.
- **`schedules_format`** — return the job-file reference: both config surfaces, the precedence
  rule, and the fields that carry a cost or a permission consequence. Read it before
  authoring a job rather than guessing.
- **`schedules_run`** — trigger one job now, obeying the same concurrency, timeout and lease
  rules. Returns the admitted inbox id.
- **`schedules_start_loop`** — post a prompt into *this* session every N (`"5m"`, `"2h"`), up to
  ten loops per session. See [Session loops](#session-loops).
- **`schedules_stop_loop`** — stop one loop in this session by id, or every loop in this session
  when `id` is omitted.

Neither mutates the job set: **jobs are defined by the file**, so every change is reviewable
in a pull request.

## Cost safety

Every run is a real model request, so the scheduler is deliberately conservative:

- **Name a `model` on every job.** Without one a job inherits the session default, which for
  unattended recurring work is very often a *paid* model. The resolved model **and** the
  resolved session mode are echoed in every `running` line precisely so this is visible
  rather than assumed:

  ```
  scheduled-tasks: running nightly-audit (schedule "0 3 * * *" Europe/Madrid, model opencode/space-bunny-free, session reuse)
  ```

  The plugin never picks a model for you — that would be wrong for other users — but it will
  always tell you which one it used.

- **One-offs and loops cost money too.** They are not a free path around the bounds above:
  each admission is a real request. `schedules_schedule` takes an optional `model` and is
  admitted through the same concurrency cap as a job. `schedules_start_loop` takes **no**
  `model` of its own, because a loop posts into the live session that started it and so
  spends whatever model, agent and permissions that session already has. A loop re-posts
  every interval until it expires, so a 5m interval left at the default three-day TTL is
  roughly 860 requests — stop it with `schedules_stop_loop` rather than waiting it out.
  Both are visible in `schedules_list`: pending one-offs with their due instant, loops with
  their owner session and next fire time.
- A sleeping laptop that misses eight occurrences of `* * * * *` fires **once**, not eight
  times (`misfire: "skip"`). `backfill` replays up to `maxCatchUp`, oldest first, and reports
  the dropped remainder rather than swallowing it.
- At most one run is in flight at a time (`maxConcurrentRuns`). A due occurrence that finds
  no free slot is **skipped and recorded**, never queued.
- A failed run is **not** retried within its occurrence. Trigger a re-run with
  `schedules_run`.
- `runTimeout` bounds every run, which is also what makes a job safe when its prompt
  triggers a permission request nobody will ever answer.

## Observability

Lines go to `stderr` **and** to a per-project file, because plugin `console.error` is not
captured into OpenCode's own log file:

```
~/.local/share/opencode/scheduled-tasks/<project>/scheduler.log
```

```
2026-10-02T13:13:07.564Z scheduled-tasks: running dogfood-smoke (schedule "* * * * *" Europe/Madrid, model session default, session reuse)
2026-10-02T13:14:07.573Z scheduled-tasks: running dogfood-smoke (schedule "* * * * *" Europe/Madrid, model session default, session reuse)
2026-10-02T13:14:11.002Z scheduled-tasks: started loop loop_ab12cd34 every 5m in session ses_9f21
2026-10-02T13:16:09.887Z scheduled-tasks: loop loop_ab12cd34 posting into its own session (every 5m)
```

Set `OPENCODE_SCHEDULED_TASKS_DATA_DIR` to relocate that directory (containers, read-only
homes, test runs).

## Session loops

A loop posts a prompt into **the session that created it**, on a fixed interval — for
in-session automation like polling a deploy or watching a long-running command. It is not a
cron expression: a loop is "every N", not "at these times".

```
schedules_start_loop({ prompt: "Check the deploy and report status", every: "5m" })
schedules_stop_loop({ id: "loop_ab12cd34" })   // omit id to stop every loop here
```

- A loop is scoped by the calling session, and **cannot post into another session** or be
  stopped from one. Starting one without a session is refused rather than guessed at.
- Minimum interval is 1 minute; sub-minute is refused, matching OpenCode's cron resolution.
- Default lifetime is **three days**, after which it auto-disables and says so. Pass `ttl` for
  something else.
- The loop is re-armed *before* it posts, so a crash cannot double-post on the next tick.
- At most 10 loops per session; reaching the cap is reported with the existing ids.

Loops are ephemeral and agent-managed. They live in plugin storage keyed by session, so a
deleted session's loops are simply unreachable — a loop cannot outlive the session that asked
for it.

## One-off tasks

Sometimes the work is not recurring. `schedules_schedule` takes a prompt and a time — either
an absolute `dueAt` (epoch ms) or a relative `dueIn` (`"2h"`):

```
schedules_schedule({ prompt: "Run the migration check", dueIn: "2h" })
schedules_cancel({ id: "oneoff_ab12cd34" })
```

One-offs are **runtime-only and ephemeral**. They are never written to a job file, and they
can never become recurring jobs — promoting one is an explicit act of editing the job file,
so a reviewer sees it. That is the point: the job file stays a reviewed artifact instead of
accumulating dead one-off history.

- A time slightly in the past (within 5 minutes) still runs, on the next tick. Much older is
  refused rather than silently executed.
- Each one-off gets a fresh session and the **same permission discipline** as a scheduled job,
  so it is not a loophole around the rules above.
- A completed one-off survives only in `schedules_history`, then is discarded.
- At most 50 pending per project; reaching the cap is reported, not silently enforced.

## Run history

Each job keeps a bounded ring of its last 10 runs — due instant, start, outcome, resolved
model, and a bounded error string. Read it with `schedules_history`. The ring evicts
oldest-first and is capped at 50 however it is configured, so history cannot grow without
bound. It survives a restart, and an absent or corrupt record is dropped rather than
crashing the load.

## Unattended permissions

A scheduled run has **nobody to approve a prompt**. Two consequences, both of which have
caught people out:

- **An `"ask"` is effectively a deny.** Nobody is there to answer it. The plugin reports every
  `ask` a job declares in `schedules_list` (`askAsDeny`) and logs it on each run, so this is
  visible rather than a silent timeout.
- **`external_directory` defaults to `ask`**, so *any* file access outside the job's working
  directory fails quietly. If a job reads or writes elsewhere, allow it explicitly.

```yaml
permissions:
  bash:
    "*": deny
    "git diff *": allow
    "git log *": allow
  edit: deny
  external_directory:
    "/tmp/*": allow
```

Rules are applied to the session **immediately before** the prompt is admitted, and re-applied
on every run rather than assumed to persist.

### The last matching rule wins

OpenCode evaluates permission rules **in declaration order and the last match wins** — the
opposite of most permission systems, which prefer the most specific match. A catch-all
therefore goes **first**, and specific overrides go **after** it:

```yaml
# WRONG - "*": deny comes last, so it overrides every rule above it.
bash:
  "git *": allow
  "*": deny

# RIGHT - catch-all first, specifics carve out from it.
bash:
  "*": deny
  "git *": allow
```

A job that declares no `permissions` is **not** tightened implicitly: it inherits the
session's rules exactly as before. Silently reducing an existing job's authority would be its
own surprise.

*(The `ask` and `external_directory` warnings, and the rule-order semantics, come from
[`opencode-tasks`](https://github.com/jdormit/opencode-tasks) — see Acknowledgements.)*

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

The runtime tools break the "reviewed artifact" half of that, so they need a different
reading. A one-off runs in a **fresh** session, so it inherits nothing — except that its prompt
never appeared in a pull request either. A loop is worse on both counts: it posts into **the
live session that started it**, so it spends that session's authority while that session may
also be carrying an interactive conversation and whatever context the user has put into it.
Nothing about the loop's prompt was ever in version control. Treat a loop prompt as code,
because on every tick it gets to act with a person's session.

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

## Acknowledgements

This plugin was designed after an investigation concluded that OpenCode V2 ships no
scheduler. That was true of OpenCode core and **wrong about the ecosystem**:
[`jdormit/opencode-tasks`](https://github.com/jdormit/opencode-tasks) (MIT, Jeremy
Dormitzer) had been solving the same problem since March 2026, and several of its ideas are
better than ours.

Ideas adopted from it, and credited where they appear:

| Idea | Where it lives here |
| --- | --- |
| Duration strings with a bare number meaning seconds | the `runTimeout` field |
| Per-task permission rules, and the unattended-`ask` / rule-order warnings | ADR 0005, spec 002 |
| One-off tasks (and, in v2, in-session loops) | ADR 0006, spec 002 |
| Opt-in session reuse rather than always reusing | the `session` field |
| Per-task agent/model selection | job fields, spec 001 |

Where we deliberately diverge, the ADR says so and says why: we keep the JSON array
alongside markdown rather than replacing it (ADR 0004), and we stay in-process rather than
shipping an OS daemon (ADR 0001). The implementations are ours and differ in engine,
storage and API surface. See
[ADR 0007](ArggonManager/docs/adr/0007-attribution-and-lineage.md) for the full account,
including the search that should have found this project first.

## Status

v1 shipped: declarative jobs, tick loop, per-job sessions, cost-bounded misfire handling,
cross-process single-writer lease, DST-correct cron. v2 in progress — markdown task files,
per-job permissions, one-off tasks and session loops. ADRs and specs live under
`ArggonManager/docs/`.

Known limitation: **jobs only run while an OpenCode server is up.** For a job that must fire
regardless, drive `opencode run` from OS scheduling (see below).

## Design

Decisions live in `ArggonManager/docs/adr/`: a single tick loop over a declarative job file
(0001), misfire and cost bounds (0002), and the cross-process writer lease (0003). The
requirements they answer are in `ArggonManager/docs/specs/spec-opencode-scheduled-tasks-001.md`,
and the ground truth they rest on in
`ArggonManager/docs/explorations/exploration-opencode-scheduled-tasks-001.md`.

## License

MIT