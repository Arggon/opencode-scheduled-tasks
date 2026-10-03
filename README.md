# opencode-scheduled-tasks

Cron-style **scheduled agent tasks for [OpenCode V2](https://opencode.ai/v2/docs/)**.

OpenCode V2's core ships no scheduler: no CLI subcommand, no config field, no API path. This
plugin adds one — declarative cron jobs that dispatch agent prompts on a running server.

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

That is one of **two** config surfaces. A job can equally be
[`.opencode/tasks/nightly-audit.md`](#markdown-job-files), whose body is the prompt. Both merge by
job id; see [Job reference](#job-reference).

## Install

### Globally (this machine, every project)

The plugin is a **single file** you copy, with nothing to build:

```sh
mkdir -p ~/.config/opencode/plugins/scheduled-tasks
cp src/index.ts ~/.config/opencode/plugins/scheduled-tasks/index.ts
opencode reload          # the plugins directory is scanned at startup
```

A project that only uses `.opencode/schedules.json` needs **no** `node_modules` at all — the file
imports nothing but `node:` builtins. Using
[markdown job files](#markdown-job-files) adds exactly one dependency, `yaml`, as an
**optionalDependency**; it is resolved only when a markdown job actually exists, and what happens
when it is missing is described [there](#markdown-job-files).

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

Not yet published. It publishes as **`arggon-opencode2-scheduled-tasks`**: `opencode-tasks` and
its earlier name `opencode-scheduled-tasks` both belong to
[`jdormit/opencode-tasks`](https://github.com/jdormit/opencode-tasks), which does the same job
on a different architecture — see [Acknowledgements](#acknowledgements). The `opencode2` infix
marks the V2 plugin surface, and it is why the repository name and the npm name differ.

### Jobs are per project, the plugin is not

The plugin can be installed globally, but it reads `<project>/.opencode/schedules.json` and
`<project>/.opencode/tasks/` from the **session's project directory**. So one global install
serves every repo, each with its own schedules. A project with no job file loads the plugin,
logs that it has no work, arms no timer, and takes no writer lease:

```
scheduled-tasks: no enabled jobs in .opencode/schedules.json or .opencode/tasks and no pending one-off or loop; no timer armed (schedules_schedule and schedules_start_loop arm it on demand)
```

## Job reference

Two surfaces, merged by job id, and **a markdown file wins over a JSON job with the same id**:

| Surface | Prompt lives in |
| --- | --- |
| `.opencode/schedules.json` — `{"version": 1, "jobs": [...]}` | the job's `prompt` string |
| `.opencode/tasks/<id>.md` | the file body, after the frontmatter |

| Field | Required | Default | Meaning |
| --- | --- | --- | --- |
| `id` | yes | — | `^[a-z0-9][a-z0-9._-]*$`, unique. For markdown it is the filename stem, and a frontmatter `id` that disagrees is reported and ignored. |
| `schedule` | yes | — | 5-field cron (`minute hour dom month dow`) or `@hourly` / `@daily` / `@weekly` / `@monthly` / `@midnight` / `@yearly` / `@annually`. |
| `prompt` | yes (JSON) | — | The text dispatched to the session. In markdown it is the body, which always wins over a frontmatter `prompt`. |
| `timezone` | no | server local | IANA zone. The schedule is evaluated here, never in the host's `TZ`. |
| `model` | no | session default | `provider/model` for this job's runs. **Set it.** |
| `agent` | no | session default | Agent switched to before dispatching. |
| `enabled` | no | `true` | Set `false` to park a job without deleting it. |
| `permissions` | no | session default | Per-job permission rules in OpenCode's own schema. Absent ⇒ session defaults are inherited unchanged. |
| `session` | no | `reuse` | `reuse` keeps one session per job so runs build on prior context; `fresh` starts a new session per run, for stateless work. |
| `misfire` | no | `"skip"` | `skip` collapses a backlog to one run; `backfill` replays up to `maxCatchUp`. |
| `maxCatchUp` | no | `5` | Replay ceiling for `backfill`. Clamped to 1–50. |
| `runTimeout` | no | `15m` | Duration: `30s`, `5m`, `2h`, `1h30m`, `1d`. A bare number means seconds (see [Acknowledgements](#acknowledgements)). |
| `runTimeoutMs` | no | — | The millisecond form, kept for compatibility; ignored when `runTimeout` is present. |

**Duration bounds.** A duration is parsed as written, then clamped to the same one-minute–24-hour
window `runTimeoutMs` has always had. So `runTimeout: "30s"` runs for 60 seconds and `"2d"` runs
for 24 hours; only the range between the two survives untouched. A malformed, zero or negative
duration is refused by name and the job is not loaded.

**`permissions` shape.** An action mapped either to one effect or to a map of glob `resource` →
effect, exactly as OpenCode's own config takes it:

```yaml
permissions:
  bash:
    "*": deny
    "git diff *": allow
  edit: deny
  external_directory:
    "/tmp/*": allow
```

At most 32 actions per job; an unknown effect is refused by name. Semantics — including why
last-match-wins matters — are in [Unattended permissions](#unattended-permissions).

Supported cron syntax: `*`, lists (`1,15`), ranges (`9-17`), steps (`*/15`, `9-17/4`),
month names (`JAN-mar`) and day names (`sun`); `7` is accepted as Sunday. Day-of-month and
day-of-week follow the Vixie rule: when **both** are restricted, a day matches if **either**
does.

A schedule that can never match (`0 0 30 2 *` — 30 February) is rejected at load with a
named reason rather than becoming a job that silently never fires.

`schedules_format` returns a **shorter** version of this for an agent about to author a job: both
surfaces, the precedence rule, the fields that carry a cost or permission consequence, and the
unattended-permission warning. It lists `permissions` and `session` too, with their defaults — the
`runTimeout` window there is derived from the same constants the parser clamps with, so the two cannot
drift apart.

## Markdown job files

A job can be a markdown file instead of a JSON entry — the shape
[`opencode-tasks`](https://github.com/jdormit/opencode-tasks) popularised, and the one that
survives a large prompt in a diff. Per-project, not global; see
[ADR 0004](ArggonManager/docs/adr/0004-markdown-task-files-alongside-json.md) for why the JSON
array was kept alongside.

```markdown
<!-- .opencode/tasks/nightly-audit.md -->
---
schedule: "0 3 * * *"
timezone: Europe/Madrid
model: opencode/space-bunny-free
agent: build
session: reuse
runTimeout: 30m
misfire: skip
maxCatchUp: 5
enabled: true
permissions:
  bash:
    "*": deny
    "git diff *": allow
---
Review the diff since the last tag for security issues.
```

- **The filename stem is the id.** `nightly-audit.md` is the job `nightly-audit`. A frontmatter
  `id` cannot move a job; if it disagrees, the disagreement is reported rather than ignored.
- **The body is the prompt.** Frontmatter is stripped, leading and trailing blank lines are
  trimmed, line endings are normalised to `\n`, and everything in between is preserved verbatim —
  re-wrapping prose nobody asked to have re-wrapped is worse than an escaped `\n`.
- **Precedence is per id.** A `.md` file and a JSON job with the same id produce **one** job, the
  markdown one, plus one reported shadow in `schedules_list` telling you to delete one of them.
  Jobs keep their JSON file position, so migrating one job at a time does not reshuffle the list.
- **A bad file is refused by name, never the directory.** Bad YAML, a missing `schedule`, an id
  that fails the pattern, an unterminated fence or a missing body — each names its file and the
  rest still load.
- **Frontmatter is untrusted input.** Files over 128 KiB are refused before they are read,
  frontmatter blocks over 8192 characters are refused before parsing, YAML alias expansion is
  capped at 10, and at most 100 markdown jobs are considered per load (a separate cap from the
  JSON array's, so one surface cannot starve the other). No frontmatter value is interpolated
  into the prompt.

### The one optional dependency

Reading frontmatter needs a real YAML parser, and there is deliberately **no hand-rolled subset**:
a parser that silently misreads what it does not cover is a CVE-shaped bug. So `yaml` is an
`optionalDependency`, reached through a guarded dynamic import that runs **only when a markdown
job file exists**.

If it is not installed, the plugin says so once and keeps working:

```
scheduled-tasks: no YAML reader: yaml is not installed, so .opencode/tasks/*.md jobs are refused and .opencode/schedules.json jobs are unaffected. Install yaml (an optionalDependency) to enable them.
```

Every markdown job is then refused by name, with that reason, and the JSON surface is untouched.
A JSON-only project never asks for the reader at all — that is pinned by a test that watches every
module the plugin resolves.

## Tools

- **`schedules_list`** — pure read. Per job: `schedule`, `timezone`, `nextRun`, `lastRun`,
  `lastStatus`, `lastError`, `enabled`, `misfire`, `session`, resolved `permissions`,
  `askAsDeny` (every `ask` the job declares — see [Unattended permissions](#unattended-permissions)),
  `runTimeoutMs`, `agent`, resolved `model`, and `running`. Alongside the jobs: `invalid` (refused
  jobs and reported shadows), pending `oneOffs` with their due instant, `loops` with their owner
  session and next fire time, `leaseHeld` / `leaseForeign`, `tickMs`, and any `error` from the job
  file.
- **`schedules_run`** — trigger one job now. It is a dispatch, so it obeys what a scheduled run
  obeys: it takes a slot from the same shared `maxConcurrentRuns` budget, takes and renews the
  job's run lease for its duration, is bounded by that job's `runTimeout` (interrupting the session
  on overrun, and saying so), and is refused while another instance holds the writer lease. It
  records `ok` / `timeout` / `failed` / `skipped` in the same history a scheduled run writes, and
  returns the id the dispatch admitted.
- **`schedules_schedule`** — schedule a one-off prompt for a time (`dueAt` epoch ms, or `dueIn`
  like `"2h"`). Runtime-only and ephemeral. See [One-off tasks](#one-off-tasks).
- **`schedules_cancel`** — cancel a pending one-off by id. An id that is unknown or has already run
  is a typed error naming it, pointing at `schedules_history`, not an empty success.
- **`schedules_history`** — recent runs for a **job, a one-off or a session loop**, newest first:
  due and start instants, outcome, resolved model, session, and any error. See
  [Run history](#run-history).
- **`schedules_format`** — return the job-file reference as text: both config surfaces, the
  precedence rule, and the fields that carry a cost or a permission consequence. Read it before
  authoring a job rather than guessing.
- **`schedules_start_loop`** — post a prompt into *this* session every N (`"5m"`, `"2h"`), up to
  ten loops per session. See [Session loops](#session-loops).
- **`schedules_stop_loop`** — stop one loop in this session by id, or every loop in this session
  when `id` is omitted.

None of them edits a recurring job: **jobs are defined by the file**, so every change to one is
reviewable in a pull request. The runtime tools create ephemeral work only.

## Cost safety

Every run is a real model request, so the scheduler is deliberately conservative:

- **Name a `model` on every job.** Without one a job inherits the session default, which for
  unattended recurring work is very often a *paid* model. The resolved model **and** the resolved
  session mode are echoed in every `running` line precisely so this is visible rather than
  assumed:

  ```
  2026-10-03T13:13:07.564Z scheduled-tasks: running nightly-audit (schedule "0 3 * * *" Europe/Madrid, model opencode/space-bunny-free, session reuse, runTimeout 15m)
  ```

  A job that declares an `ask` adds `, asks as deny: bash:git push` to the same line.

  The plugin never picks a model for you — that would be wrong for other users — but it will
  always tell you which one it used.

- **One-offs and loops cost money too.** They are not a free path around the bounds above:
  each admission is a real request. `schedules_schedule` takes an optional `model` and is
  admitted through the same concurrency cap as a job. `schedules_start_loop` takes **no**
  `model` of its own, because a loop posts into the live session that started it and so
  spends whatever model, agent and permissions that session already has. A loop re-posts
  every interval until it expires, so a 5m interval left at the default three-day TTL is
  roughly 860 requests — stop it with `schedules_stop_loop` rather than waiting it out.
  Both are visible in `schedules_list`.

- **A missed backlog costs one run under `skip`, and a bounded number under `backfill`.** A
  sleeping laptop that misses eight occurrences of `* * * * *` fires **once**, not eight times.
  `backfill` replays up to `maxCatchUp` of them, **oldest first, one run per tick**, so a
  five-occurrence backlog with `maxCatchUp: 3` costs three runs spread over three ticks. Whatever
  the backlog did not cover is reported, never dropped in silence: the log line names the count
  and `schedules_history` carries it as `dropped` on **every** record of that backlog, with
  `droppedCapped` saying the count is a lower bound.

- **There is no queue.** At most `maxConcurrentRuns` dispatches are in flight at once, shared by
  recurring jobs, one-offs, loops and manual triggers. What happens to an occurrence that finds
  no free slot depends on whose it is, and it is always recorded:

  | Occurrence | What happens |
  | --- | --- |
  | A `backfill` job's | stays **owed** — deferred to a later tick, not discarded |
  | A `skip` job's (the default) | **spent**, recorded as `skipped` |
  | A due one-off | **spent**, recorded as `skipped`, and reported as such in the log |
  | A due loop | **spent** for that tick; the loop itself survives and fires again next interval |

  A loop is the cheap thing to disappoint — it is owed another occurrence a minute later anyway.
  A one-off is not: it was asked for at a specific instant, so within the ephemeral work a
  one-off takes a contested slot **before** a loop does, and the log line saying so names who took
  it rather than only saying the cap was reached.

- A failed run is **not** retried within its occurrence. Trigger a re-run with
  `schedules_run`.
- Every run is **bounded by `runTimeout`** (default `15m`, clamped to 1 minute–24 hours). On
  overrun the scheduler calls `ctx.session.interrupt` for that session, records the outcome as
  `timeout`, and releases its concurrency slot — so a turn that triggers a permission request
  nobody will ever answer cannot wedge the scheduler or starve every other job. If the host has
  no `interrupt`, the run is **abandoned** rather than interrupted, and the record says which
  happened instead of claiming the session was stopped.

## Timezones and DST

A job's schedule is evaluated in **its own** IANA zone, defaulting to the server's. Correctness
never depends on the host's `TZ` — a job is not a UTC schedule with an offset, it is a wall clock.

The occurrence walk steps through **the target zone's own wall minutes**. It starts from that
zone's reading of "now" and every jump is arithmetic on that clock; the zone is applied once, when
a matched wall minute is turned into a real instant. That is what makes DST fall out rather than
being special-cased.

Two edges, both committed in
[spec 001 § Time](ArggonManager/docs/specs/spec-opencode-scheduled-tasks-001.md):

| Transition | What this plugin does | Is that the norm? |
| --- | --- | --- |
| **Spring forward** — a wall time that **does not exist** (Europe/Madrid 2026-03-29 02:30) | **Skipped.** The next occurrence is the next day. | **No — we are the outlier.** RFC 9557's `compatible` disambiguation, which `Temporal` implements, shifts forward by the length of the gap, so 02:30 becomes 03:30. `cron-parser` compensates the same way (measured at 5.10.1: `30 2 * * *` in `Europe/Madrid` from 2026-03-28 returns `2026-03-29T01:30Z`, which is 03:30 local). We chose a job that did not run over one that silently ran an hour late. |
| **Fall back** — a wall time that occurs **twice** (Europe/Madrid 2026-10-25 02:30) | Fires **once, at the first occurrence.** | **Yes.** `compatible` resolves an overlap to the earlier instant, and `cron-parser` agrees (measured at 5.10.1: returns `2026-10-25T00:30Z`, the CEST first pass). |

The spring-forward row is a compatibility choice a user is entitled to know about before adopting
a plugin rather than discover the morning their 02:30 job silently vanished. If you would rather
have the standard's compensating behaviour, it is a two-line change in `wallToInstant`.

One implementation note worth recording, because it is invisible until it is wrong: the walk's
cursor once read `now` through `Date`'s UTC getters instead of in the job's zone. That
round-trips only at offset zero, so in `America/New_York` every step landed `|offset| + 1`
minutes late and a `* * * * *` job fired once every 241 minutes. It survived 271 tests
because every timezone test used a non-negative offset. The helpers now name the frame they
speak, so the bug cannot be reintroduced silently.

## Observability

Every line reaches `stderr` **and** a per-project file, because plugin `console.error` is not
captured into OpenCode's own log file:

```
~/.local/share/opencode/scheduled-tasks/<project>/scheduler.log
```

```
2026-10-03T13:13:07.564Z scheduled-tasks: running nightly-audit (schedule "0 3 * * *" Europe/Madrid, model opencode/space-bunny-free, session reuse, runTimeout 15m)
2026-10-03T13:16:09.887Z scheduled-tasks: loop loop_ab12cd34 posting into its own session (every 5m, model session default)
2026-10-03T13:20:11.402Z scheduled-tasks: job nightly-audit timed out: exceeded runTimeout 15m; the session was interrupted
```

Set `OPENCODE_SCHEDULED_TASKS_DATA_DIR` to relocate that directory (containers, read-only
homes, test runs).

**Reading a line.** Job-scoped lines name the job, a one-off or a loop — `running <id>`,
`skipping <id>`, `job <id> failed:`, `triggered <id> on demand`, `started loop <id>`,
`scheduled one-off <id>`, `backlog truncated for <id>`. Host-level notices carry no job id
because they are about the project or the host: no work to do, a foreign writer lease, a missing
`ctx.session.prompt`, a host without `ctx.storage.scan`, a degraded log directory. Two sinks have
their own limits, and both say so in the line:

- **`ctx.location.directory is unavailable`** — emitted before any log path is known, so it is the
  one line that reaches `stderr` only.
- **an unwritable log directory** — the plugin keeps logging to `stderr` and says once that
  `scheduler.log` is unavailable.

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
- Minimum interval is 1 minute; sub-minute is refused with a named reason, matching OpenCode's
  cron resolution. (`runTimeout` is clamped to that same floor; a loop interval is refused.)
- Default lifetime is **three days**, after which it auto-disables and says so, naming the
  lifetime actually granted rather than the default. Pass `ttl` for something else.
- The loop is re-armed *before* it posts, so a crash cannot double-post on the next tick.
- At most 10 loops per session; reaching the cap is reported with the existing ids. Stored loops
  are read back under a hard ceiling of 50 per session, so a hand-edited record cannot exceed it.
- A loop takes no `agent`, `model` or `permissions`: it posts into a session a human may be
  sitting in, so it must not switch that session's target or replace its rules. It is bounded by
  the default run timeout anyway — a post that never returns would hold a slot the whole tick
  shares and keep a live session busy.
- A due loop competes for the same `maxConcurrentRuns` budget as everything else. Losing the slot
  costs it that tick, never the loop, and the log line says who took the slot.
- Stored loops are restored at startup. That needs `ctx.storage.scan`; on a host without it the
  plugin says so once and the loops resume the next time their own session starts or stops one.

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
- Each one-off gets a fresh session and the **same permission discipline** as a scheduled job
  (including the `ask`-as-deny report), so it is not a loophole around the rules above.
- A completed one-off survives only in `schedules_history`, then is discarded.
- At most 50 pending per project; reaching the cap is reported, not silently enforced. A stored
  record read back is additionally held to a hard ceiling of 200.
- Within a tick, one-offs are admitted **before** session loops for a contested slot.

## Run history

`schedules_history` answers for a job, a one-off or a loop, and says which of the three it found:

- **Jobs** keep a bounded ring of their last 10 runs — due instant, start, outcome, resolved
  model, session, and a bounded error string. The ring evicts oldest-first and is hard-capped at
  50 however `limit` is configured, so history cannot grow without bound.
- **One-offs and loops** are namespaced separately (`history/oneoff/…`, `history/loop/…`) so a
  generated id can never collide with a job id, and only the **most recent 50** such records are
  retained. That cap is the important one: a project's one-off count is not bounded, so the keys
  are capped rather than each ring.
- A record may also carry **`asksAsDeny`** (which `ask` rules this run turned into denies),
  **`dropped` / `droppedCapped`** (what the occurrence's backlog owed and did not run), and
  **`inMemoryOnly`**.
- An unknown id is a typed error naming it and listing the job and pending-one-off ids it does
  know — never an empty list, because "no runs yet" and "no such job" are different answers.

**What survives a restart depends on the host.** `ctx.storage` is feature-detected: if a host does
not offer both `get` and `set`, run state, pending one-offs and every run record live in that
process's memory alone. The plugin says so once at setup, and every affected record is stamped
`inMemoryOnly` so a reader is told rather than left to infer. An absent or corrupt record is
dropped rather than crashing the load.

## Unattended permissions

A scheduled run has **nobody to approve a prompt**. Two consequences, both of which have
caught people out:

- **An `"ask"` is effectively a deny.** Nobody is there to answer it. The plugin reports every
  `ask` a job declares in `schedules_list` (`askAsDeny`) and logs it on each run line and in the
  run record, so this is visible rather than a silent timeout.
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
on every run rather than assumed to persist — applying them replaces session state. On a host
with no `ctx.permission.rules` the job runs with the session's own rules and the degradation is
logged once.

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
[`opencode-tasks`](https://github.com/jdormit/opencode-tasks) — see
[Acknowledgements](#acknowledgements).)*

## One writer per machine

A plugin loads **once per server process**, so two servers would double-fire every job. The
plugin takes an exclusive lockfile beside its log (`fs.open(path, "wx")` — atomic exclusive
create). A second server logs one line, stays inert, and still answers `schedules_list` and
`schedules_run` (the latter refuses, naming the holder). A lease whose heartbeat goes stale is
reclaimed, so a `SIGKILL`ed server cannot wedge scheduling; a lockfile under **our own pid** is
reclaimed too, so `opencode reload` does not strand the plugin.

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

Runtime creation or editing of **recurring** jobs (edit the file) · an unbounded occurrence
queue · retry-with-backoff · multi-machine locking · sandboxing beyond inherited permissions ·
a CLI · a global task directory.

### Jobs that must run while the server is down

This plugin only runs while a server is up. For a job that must fire regardless, use OS
scheduling and reuse the same session continuity:

```sh
0 3 * * * opencode run -s nightly-audit "Review the diff since the last tag for security issues."
```

(This is a real trade, not an oversight: upstream
[`opencode-tasks`](https://github.com/jdormit/opencode-tasks) ships an OS daemon precisely so
its recurring jobs survive a closed editor. We chose in-process, so the two halves are separable
by hand. See [Acknowledgements](#acknowledgements).)

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

This plugin was designed after an investigation concluded that OpenCode V2's core ships no
scheduler. That was right about OpenCode core —
[exploration 001](ArggonManager/docs/explorations/exploration-opencode-scheduled-tasks-001.md)
records how it was checked — and **wrong about the ecosystem**.
[`jdormit/opencode-tasks`](https://github.com/jdormit/opencode-tasks) (MIT, Jeremy
Dormitzer) had been solving the same problem since March 2026 and was at 0.5.3 while this was
written. **We did not search for existing work before building, and should have.** Nothing here
is presented as a first.

Several of its ideas are better than ours. They were adopted, and they are credited where they
appear:

| Idea | Where it lives here |
| --- | --- |
| A duration field in which a bare number means **seconds** | `runTimeout` (and the clamp documented with it) |
| Per-job permission rules, and the warnings about an unattended `ask`, `external_directory` and last-match-wins | [ADR 0005](ArggonManager/docs/adr/0005-per-job-permission-rules.md), [Unattended permissions](#unattended-permissions) |
| A job as a **markdown file** whose body is the prompt | [ADR 0004](ArggonManager/docs/adr/0004-markdown-task-files-alongside-json.md), [Markdown job files](#markdown-job-files) |
| One-off tasks | [ADR 0006](ArggonManager/docs/adr/0006-ephemeral-runtime-tasks.md), [One-off tasks](#one-off-tasks) |
| In-session loops, on a default three-day expiry | [ADR 0006](ArggonManager/docs/adr/0006-ephemeral-runtime-tasks.md), [Session loops](#session-loops) |
| A choice about session continuity rather than a fixed behaviour | the `session` field |

Two honest footnotes on that table. **Markdown authoring** we took as a *shape*, not a layout:
its task files are global (`~/.config/opencode/tasks/*.md`) with a per-task `cwd`; ours are
per-project and live beside the JSON array, so a job file stays a pull-request artifact.
**Session continuity** is where we went the other way: theirs is opt-in (`session_name`, a fresh
session by default); we took the switch and defaulted it the *other* way — a job here accumulates
context unless it says `session: fresh`. Several fields simply overlap in both projects without
being lineage (per-job `agent` and `model`, `enabled`).

What we did **not** adopt, and why:

| | `opencode-tasks` | here |
| --- | --- | --- |
| Storage | Bun's `bun:sqlite`, one database at `~/.local/share/opencode/.tasks.db`; **Bun required** | none — `ctx.storage`, feature-detected, and jobs still run without it |
| Driver | an OS daemon (`bunx opencode-tasks --install`; launchd or systemd, every 60s) that spawns `opencode run` workers | one in-process tick loop, arbitrated by a lockfile |
| Recurring jobs while OpenCode is closed | **yes** | no — [OS cron is the escape hatch](#jobs-that-must-run-while-the-server-is-down) |
| Plugin surface | OpenCode **V1** — registered as `"plugin": ["opencode-tasks"]`, peer `@opencode-ai/plugin` | OpenCode **V2** — a plain default-export definition object, deliberately with **no** `@opencode/plugin` import |
| Where jobs live | global `~/.config/opencode/tasks/` | per-project `<project>/.opencode/` |
| Dependencies | `cron-parser`, `gray-matter` (and, in the pre-0.5 line, `better-sqlite3`) | none; `yaml` optional and only for markdown frontmatter |

The npm name falls out of that. `opencode-scheduled-tasks` on npm is the **same author's earlier
package**, last published at 0.1.1 and superseded by `opencode-tasks`; it is not a redirect and
not marked deprecated — simply parked. Hence **`arggon-opencode2-scheduled-tasks`** here: the name
is free, and the infix marks the V2 surface.

The ideas are recorded as *inspired by*, never as *copied from* — the implementations are ours and
differ in storage, engine and API surface. Offering our improvements back upstream is desirable
and is the author's call, not ours. The full account is
[ADR 0007](ArggonManager/docs/adr/0007-attribution-and-lineage.md).

## Status

**Shipped (v1):** declarative jobs in `.opencode/schedules.json`, one tick loop, persistent
per-job sessions, cost-bounded misfire handling, a cross-process single-writer lease, DST-aware
cron arithmetic, `schedules_list` and `schedules_run`.

**Shipped (v2):** markdown task files beside the JSON array · per-job `permissions` with
ask-as-deny reported · `session: reuse|fresh` · duration-valued `runTimeout`, and a bound that
actually binds (interrupt on overrun) · one-off tasks · in-session loops · bounded run history
for jobs, one-offs and loops · `schedules_format` · a real concurrent budget, run lease and
writer lease for `schedules_run`.

**Not in this plugin, on purpose:** an OS daemon or any way to fire while no server is up · a CLI
(tools are the V2-native surface) · a global task directory · runtime creation or editing of
recurring jobs · multi-machine locking.

**Known limitation:** **jobs only run while an OpenCode server is up.** For a job that must fire
regardless, drive `opencode run` from OS scheduling (see
[above](#jobs-that-must-run-while-the-server-is-down)).

ADRs and specs live under `ArggonManager/docs/`.

## Design

Decisions live in `ArggonManager/docs/adr/`: a single tick loop over a declarative job file
(0001), misfire and cost bounds (0002), the cross-process writer lease (0003), markdown task files
alongside the JSON array (0004), per-job permission rules (0005), ephemeral runtime tasks (0006),
and attribution and lineage (0007). The requirements they answer are in
[spec 001](ArggonManager/docs/specs/spec-opencode-scheduled-tasks-001.md) and
[spec 002](ArggonManager/docs/specs/spec-opencode-scheduled-tasks-002.md), and the ground truth
they rest on in
[exploration 001](ArggonManager/docs/explorations/exploration-opencode-scheduled-tasks-001.md).

## License

MIT