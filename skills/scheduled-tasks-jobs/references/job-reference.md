# Job reference

Copied from the repository README (sections: Job reference, Markdown job files). Source of truth: `src/index.ts` and https://github.com/Arggon/opencode-scheduled-tasks#job-reference.


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
| `runTimeout` | no | `15m` | Duration: `30s`, `5m`, `2h`, `1h30m`, `1d`. A bare number means seconds (see [Acknowledgements](https://github.com/Arggon/opencode-scheduled-tasks#acknowledgements)). |
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
last-match-wins matters — are in [Unattended permissions](../SKILL.md#unattended-permissions).

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

### Markdown job files

A job can be a markdown file instead of a JSON entry — the shape
[`opencode-tasks`](https://github.com/jdormit/opencode-tasks) popularised, and the one that
survives a large prompt in a diff. Per-project, not global; see
[ADR 0004](https://github.com/Arggon/opencode-scheduled-tasks/blob/main/ArggonManager/docs/adr/0004-markdown-task-files-alongside-json.md) for why the JSON
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

