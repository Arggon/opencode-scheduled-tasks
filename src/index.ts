/**
 * opencode-scheduled-tasks — cron-style scheduled agent tasks for OpenCode V2.
 *
 * Single source file: it is simultaneously the npm package entry and the file you copy into
 * `.opencode/plugins/scheduled-tasks/index.ts`. Node builtins only, and **no**
 * `@opencode/plugin` import — that static import fails to load an auto-discovered plugin in a
 * dependency-less tree (probed on 2.0.7/2.0.8/2.0.10/2.0.12; see ArggonManager's plugin
 * playbook). The plain default-export definition object below is a valid V2 plugin definition
 * and loads identically.
 *
 * Every `ctx` API is feature-detected and every path is failure-isolated: a broken
 * scheduler logs once and goes inert. It must never break a session, a tool call or the
 * server (invariant 3, spec 001).
 *
 * **What arms the tick.** Both ephemeral drains (one-offs, session loops) run *inside* the
 * tick, so a project with no job file can still have work — and it is handed work after
 * `setup` has already returned, by `schedules_schedule` / `schedules_start_loop`. Arming is
 * therefore a pure predicate (`hasWork`) applied by one holder (`arm`) that setup, the
 * ephemeral tools and the end of every tick all call, rather than a decision made once.
 *
 * **What a post goes through.** Every dispatch — recurring job, one-off, session loop —
 * takes the same `applyJobTarget` path, is recorded in the same bounded run history, and
 * spends from one per-tick concurrency budget. A loop posts into a **human's live session**,
 * which is a tighter requirement than a background job rather than a looser one; what it may
 * not do is switch that session's model or replace its permission rules, so a loop declares
 * no target of its own and the shared path resolves — and reports — the session's own.
 *
 * **Dependencies.** There is exactly one, and it is optional *at import time* (ADR 0004):
 * `yaml`, reached only through a guarded dynamic import that runs only when a markdown job
 * file exists. With no `.opencode/tasks/` directory this file imports nothing but `node:`
 * builtins, which is invariant 4 — and the test that pins it is the first thing to fail if a
 * future edit adds a top-level import. There is deliberately no hand-rolled YAML subset: a
 * parser that silently misreads what it does not cover is a CVE-shaped bug, so a host with no
 * reader gets a named refusal and the JSON surface, not a guess.
 *
 * Pure helpers (cron parsing, occurrence arithmetic, misfire resolution, markdown
 * frontmatter) are exported for unit tests and contain no OpenCode dependency.
 *
 * Architecture: ADR 0001 (tick loop over declarative jobs), ADR 0002 (misfire and cost
 * bounds), ADR 0003 (cross-process writer lease), ADR 0004 (markdown task files alongside
 * the JSON array), ADR 0006 (ephemeral tasks).
 */

import {
  appendFileSync,
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  statSync,
  unlinkSync,
  utimesSync,
  writeFileSync,
  writeSync,
} from "node:fs"
import { homedir } from "node:os"
import { dirname, join } from "node:path"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Milliseconds in one minute — cron resolution and the tick's floor unit. */
export const MINUTE_MS = 60_000

/** Default tick cadence. Fire accuracy is bounded by this; a run is seconds anyway. */
export const DEFAULT_TICK_MS = 30_000

/**
 * Floor for a configured cadence. Deliberately *below* `DEFAULT_TICK_MS`: clamping the
 * default up to a minute would silently halve its resolution and delay every job by up to
 * a minute. A cron job does not need sub-minute polling, but the harness and any future
 * second-resolution schedule do.
 */
export const MIN_TICK_MS = 5_000

/** Default per-run bound, which also bounds an unanswerable permission prompt. */
export const DEFAULT_RUN_TIMEOUT_MS = 15 * 60_000

/** Default ceiling on runs in flight at once, across all jobs. */
export const DEFAULT_MAX_CONCURRENT_RUNS = 1

/** Default replay ceiling for `misfire: "backfill"`. */
export const DEFAULT_MAX_CATCH_UP = 5

/** Ceiling on jobs loaded from one file, so a hostile or generated file cannot flood us. */
export const DEFAULT_MAX_JOBS = 100

/** A lease whose heartbeat is older than this is considered abandoned and reclaimed. */
export const DEFAULT_LEASE_TTL_MS = 90_000

/** Ceiling on one lease heartbeat write period (must stay well under the TTL). */
const LEASE_HEARTBEAT_MS = 30_000

/** `ctx.storage` key prefix — namespaced so it can never collide with another plugin. */
const STORAGE_PREFIX = "scheduled-tasks/"

/** Version of the persisted run-state record. An unknown version is re-initialized. */
export const STATE_VERSION = 1

/**
 * Job-file reference handed to an agent by `schedules_format`.
 *
 * Bounded on purpose: this text is model context, and the Code Mode catalog is charged per
 * request. It states both config surfaces, the precedence rule, and the fields that carry a
 * cost or a permission consequence — the three things an agent gets wrong otherwise.
 */
export const JOB_FORMAT_REFERENCE = `## Scheduled jobs (.opencode/schedules.json or .opencode/tasks/<id>.md)

Two surfaces, merged by job id. **A markdown file wins over a JSON job with the same id.**
Both validate the same way: one bad job is refused by name; the rest still load.

### Fields

| Field | Required | Notes |
| --- | --- | --- |
| \`id\` | yes | \`^[a-z0-9][a-z0-9._-]*$\`; the markdown filename stem. |
| \`schedule\` | yes | 5-field cron (\`min hour dom month dow\`) or \`@hourly\`/\`@daily\`/\`@weekly\`/\`@monthly\`. |
| \`prompt\` | yes | JSON: a string. Markdown: the body after the frontmatter. |
| \`timezone\` | no | IANA zone. Default: the server's local zone. |
| \`model\` | no | \`provider/model\`. **Always set it.** |
| \`agent\` | no | Agent switched to before dispatch. |
| \`enabled\` | no | \`false\` parks a job without deleting it. |
| \`misfire\` | no | \`skip\` (default, one run per backlog) or \`backfill\`. |
| \`maxCatchUp\` | no | Replay ceiling for \`backfill\`, one run per tick. Default 5, max 50. |
| \`runTimeout\` | no | Duration: \`30s\`, \`5m\`, \`1h30m\`, \`1d\`. A bare number means seconds. |
| \`runTimeoutMs\` | no | The millisecond form; kept for compatibility. |

### Always name a model

A job with no \`model\` inherits the session default, which for unattended recurring work is
often a **paid** model. The resolved model is logged on every run, so an inherited one is
visible — but naming it is what you meant.

### Costs money

Every run is a real model request. \`misfire: skip\` (the default) collapses a backlog to one run;
runs are never retried within an occurrence. Trigger a re-run with \`schedules_run\`.

### What a missed backlog does

\`misfire: skip\` runs the oldest occurrence once and drops the rest. \`misfire: backfill\` replays
up to \`maxCatchUp\` of them, **oldest first, one run per tick** — so a five-occurrence backlog with
\`maxCatchUp: 3\` costs three runs spread over three ticks, not three at once.

Either way the occurrences that did not run are **reported, never dropped in silence**: the log line
names the count, and \`schedules_history\` carries it as \`dropped\` on every record of that backlog
(\`droppedCapped\` says the count is a lower bound). An occurrence waiting for a free slot stays
*owed* — it is deferred to a later tick, not discarded — so a backlog costs time, never work.

### Unattended permission rules (v2)

Scheduled runs have nobody to answer an \`"ask"\`: treat it as a deny. Declare \`permissions\`
in the host's own schema if a job needs to be constrained, and remember that **the last
matching rule wins** — catch-all first, specifics after.

### Recurring jobs are file-only

Only file-defined jobs recur. One-offs and in-session loops are runtime; see \`schedules_schedule\`
and \`schedules_start_loop\`.`

/** Log prefix; one bounded line per fire, skip or error. */
const LOG_PREFIX = "scheduled-tasks:"

/**
 * Where this instance's log lines also go on disk.
 *
 * `console.error` from a plugin is **not** captured into OpenCode's own log file (verified:
 * ArggonManager's `[arggon]` lines are absent from `~/.local/share/opencode/log/opencode.log`
 * too), so console output alone makes the scheduler unobservable and a silent failure
 * indistinguishable from an idle job. Every line is therefore also appended to a per-project
 * file the user can read directly.
 *
 * `undefined` is the honest "there is no file sink for this process" state, and it means two
 * things that are not otherwise visible from a line: the project is not known yet (setup has
 * not reached `ctx.location`), or `ensureLogDir` could not create the directory.
 */
let activeLogPath: string | undefined

/** Maximum bytes of one appended log line. */
const LOG_LINE_MAX = 1000

/** Per-project log file, beside the writer lease. */
export function logPath(directory: string, id: string): string {
  const safe = id.replace(/[^A-Za-z0-9._-]/g, "_")
  return join(leaseBaseDir(), safe, "scheduler.log")
}

/**
 * Create the per-project log directory, once, independently of the writer lease.
 *
 * `acquireLease` used to be the only thing that made this directory, and it only runs when
 * there is work to arm — so every line emitted before the first lease reached `stderr` and
 * never reached the file. Those are precisely the startup and degradation diagnostics, the
 * ones you need when nothing is working and there is nothing in the file to read, and a
 * project that never arms a timer left no evidence it had been loaded at all.
 *
 * **A directory is not lock state.** Creating it claims nothing and writes no lockfile: the
 * lease keeps its own `mkdirSync` and remains the only thing that arbitrates, so a project
 * with no jobs still leaves no `writer.lock` behind.
 *
 * Exactly one `mkdirSync` per `setup`, not one per line: the alternative is a syscall on
 * every log write, and a per-line retry would turn a missing directory into a hot loop.
 * Returns false having said so once per directory on `stderr`, in which case the caller
 * leaves `activeLogPath` unset and the process keeps logging to `stderr` alone — which is
 * what an unwritable data directory degrades to, and is reported rather than hidden.
 */
export function ensureLogDir(path: string): boolean {
  try {
    mkdirSync(dirname(path), { recursive: true })
    return true
  } catch {
    // Reported once, straight to `stderr`, and deliberately *not* through `emit`: `emit` would
    // try to append into the directory that just failed to appear and report a second, less
    // useful failure behind this one — for whichever project this module was last loaded for,
    // which is not this one. The caller leaves `activeLogPath` unset, so every later line takes
    // the same `stderr`-only path without asking again. Nothing here calls back into the log,
    // so it cannot recurse.
    //
    // The once-guard is keyed by the **path**, not globally: one host loads this plugin for
    // every project it opens, and the line names a directory, so a second unwritable project
    // has to be able to report its own instead of being silenced by the first one's key.
    const key = `log-dir:${path}`
    if (!logged.has(key)) {
      logged.add(key)
      console.error(
        `${LOG_PREFIX} could not create the log directory ${dirname(path)}; scheduler.log is unavailable and every line stays on stderr`,
      )
    }
    return false
  }
}

/** Job file, relative to the plugin's location directory. */
const JOBS_FILE = join(".opencode", "schedules.json")

/**
 * Directory of markdown job files, relative to the plugin's location directory (ADR 0004).
 *
 * The second config surface. Both are loaded and merged by id, so adopting markdown one job
 * at a time works: a JSON array and this directory coexist during a migration.
 */
export const TASKS_DIR = join(".opencode", "tasks")

/** Extension of a markdown job file. The stem minus this is the job id. */
const MARKDOWN_EXT = ".md"

/**
 * Largest markdown job file read at all.
 *
 * `MAX_PROMPT_CHARS` already bounds the body; this bounds the file around it, and it is
 * checked with `stat` *before* the read, so a 4 GB `.md` cannot be pulled into memory just
 * to be refused.
 */
export const MAX_MARKDOWN_FILE_BYTES = 128 * 1024

/**
 * Largest frontmatter block handed to the YAML reader.
 *
 * Frontmatter is untrusted input, and a size bound is the only bound that applies to keys we
 * do not know about: it caps every collection's cardinality structurally, because you cannot
 * put a million list entries in 8 KB. The known collections (`permissions`) are bounded again
 * by `validatePermissions`.
 */
export const MAX_FRONTMATTER_CHARS = 8 * 1024

/**
 * Alias/anchor budget handed to the reader.
 *
 * YAML aliases are the format's own expansion bomb: a few KB of anchors and aliases can
 * describe an object graph that costs gigabytes to materialize. The reader refuses it, so the
 * bound is a number we own rather than a default we inherit.
 */
const MAX_YAML_ALIASES = 10

/**
 * Ceiling on markdown job files considered in one directory. **Per surface**: the JSON array
 * has its own (identical) cap, so a project running both mid-migration loads at most twice
 * this. That is deliberate — cost is bounded downstream by concurrency and by misfire, and a
 * combined cap would mean one surface's contents could refuse another surface's jobs.
 */
export const MAX_MARKDOWN_JOBS = DEFAULT_MAX_JOBS

/** The one accepted dependency, by name. Resolved lazily; never at import time. */
const YAML_READER_MODULE = "yaml"

/** Longest cron expression we will look at before refusing it as hostile input. */
const MAX_CRON_LENGTH = 128

/** Longest prompt text accepted for one job. */
const MAX_PROMPT_CHARS = 20_000

/** How far ahead occurrence search will look before declaring a schedule unsatisfiable. */
const SEARCH_HORIZON_MS = 5 * 366 * 24 * 60 * MINUTE_MS

// ---------------------------------------------------------------------------
// Cron: parsing
// ---------------------------------------------------------------------------

/** A parsed, validated cron schedule. All fields are sets of already-resolved numbers. */
export type CronSpec = {
  minutes: ReadonlySet<number>
  hours: ReadonlySet<number>
  daysOfMonth: ReadonlySet<number>
  months: ReadonlySet<number>
  daysOfWeek: ReadonlySet<number>
  /** False when the day-of-month field was exactly `*` — drives the Vixie OR rule. */
  domRestricted: boolean
  /** False when the day-of-week field was exactly `*` — drives the Vixie OR rule. */
  dowRestricted: boolean
}

/** A parse failure carrying a reason fit to show a user. */
export class CronError extends Error {
  readonly expression: string

  constructor(expression: string, reason: string) {
    super(`${reason} (in "${expression}")`)
    this.name = "CronError"
    this.expression = expression
  }
}

const MONTH_NAMES: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

const DAY_NAMES: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
}

type FieldSpec = {
  name: string
  min: number
  max: number
  names?: Record<string, number>
  /** Day-of-week accepts 7 as an alias for Sunday. */
  wrap?: (value: number) => number
}

/** The five fields, in order, with their bounds. */
const FIELDS: readonly FieldSpec[] = [
  { name: "minute", min: 0, max: 59 },
  { name: "hour", min: 0, max: 23 },
  { name: "day-of-month", min: 1, max: 31 },
  { name: "month", min: 1, max: 12, names: MONTH_NAMES },
  // `7` is accepted as an alias for Sunday, so the range runs to 7 and `wrap` folds it
  // onto 0. `*` therefore yields 0..7, which wraps (and dedupes) to 0..6.
  { name: "day-of-week", min: 0, max: 7, names: DAY_NAMES, wrap: (v) => (v === 7 ? 0 : v) },
]

/** `@macro` expansions, in 5-field form. */
const MACROS: Record<string, string> = {
  "@hourly": "0 * * * *",
  "@daily": "0 0 * * *",
  "@midnight": "0 0 * * *",
  "@weekly": "0 0 * * 0",
  "@monthly": "0 0 1 * *",
  "@yearly": "0 0 1 1 *",
  "@annually": "0 0 1 1 *",
}

/** One atom of a field: a single value, a range, or a stepped range. */
type Resolved = { values: number[]; restricted: boolean }

/** Resolve one comma-separated field atom set into concrete numbers. */
function resolveField(expression: string, raw: string, spec: FieldSpec): Resolved {
  const trimmed = raw.trim()
  if (trimmed === "") throw new CronError(expression, `empty ${spec.name} field`)

  const values = new Set<number>()
  let restricted = true

  for (const part of trimmed.split(",")) {
    const atom = part.trim()
    if (atom === "") throw new CronError(expression, `empty ${spec.name} entry`)

    const segments = atom.split("/")
    const rangePart = segments[0] ?? ""
    const stepPart = segments[1]
    if (segments.length > 2) throw new CronError(expression, `malformed step in ${spec.name} "${atom}"`)

    let step = 1
    if (stepPart !== undefined) {
      if (!/^\d+$/.test(stepPart)) throw new CronError(expression, `non-numeric step in ${spec.name} "${atom}"`)
      step = Number(stepPart)
      if (step === 0) throw new CronError(expression, `zero step in ${spec.name} "${atom}"`)
    }

    const nameOf = (token: string): number => {
      const lower = token.toLowerCase()
      if (spec.names !== undefined) {
        const named = spec.names[lower]
        if (named !== undefined) return named
      }
      if (!/^\d+$/.test(token)) throw new CronError(expression, `non-numeric ${spec.name} "${token}"`)
      return Number(token)
    }

    let start: number
    let end: number
    if (rangePart === "*") {
      start = spec.min
      end = spec.max
      if (stepPart === undefined) restricted = false
    } else if (rangePart.includes("-")) {
      const bounds = rangePart.split("-")
      if (bounds.length !== 2) throw new CronError(expression, `malformed range in ${spec.name} "${atom}"`)
      start = nameOf((bounds[0] ?? "").trim())
      end = nameOf((bounds[1] ?? "").trim())
    } else {
      start = nameOf(rangePart)
      end = stepPart === undefined ? start : spec.max
    }

    if (start < spec.min || start > spec.max) {
      throw new CronError(expression, `${spec.name} ${start} out of range ${spec.min}-${spec.max}`)
    }
    if (end < spec.min || end > spec.max) {
      throw new CronError(expression, `${spec.name} ${end} out of range ${spec.min}-${spec.max}`)
    }
    if (end < start) throw new CronError(expression, `inverted range in ${spec.name} "${atom}"`)

    const wrap = spec.wrap
    for (let value = start; value <= end; value += step) {
      values.add(wrap === undefined ? value : wrap(value))
    }
  }

  return { values: [...values].sort((a, b) => a - b), restricted }
}

/** Days in `month` (1-12) of `year`; `month` is validated by the caller. */
export function daysInMonth(month: number, year: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/**
 * True when the day-of-month and month fields can never name a real date — e.g.
 * `0 0 30 2 *` (30 February). Checking one leap year covers every Gregorian year, because
 * the leap rule repeats on a 4-year cycle.
 */
function hasImpossibleDay(spec: CronSpec): boolean {
  for (const month of spec.months) {
    for (const day of spec.daysOfMonth) {
      if (day <= daysInMonth(month, 2024)) return false
    }
  }
  return true
}

/**
 * Parse a 5-field cron expression (or an `@macro`) into a `CronSpec`.
 *
 * Throws `CronError` with a user-facing reason on a malformed expression, an out-of-range
 * field, or a schedule that can never match — never returns a spec that silently never
 * fires (spec 001 § "Loading and validation").
 */
export function parseCron(expression: string): CronSpec {
  if (typeof expression !== "string") throw new CronError(String(expression), "schedule must be a string")
  const trimmed = expression.trim()
  if (trimmed === "") throw new CronError(expression, "empty schedule")
  if (trimmed.length > MAX_CRON_LENGTH) {
    throw new CronError(`${trimmed.slice(0, 32)}…`, `schedule longer than ${MAX_CRON_LENGTH} characters`)
  }

  const normalized = trimmed.startsWith("@") ? MACROS[trimmed.toLowerCase()] : trimmed
  if (normalized === undefined) throw new CronError(trimmed, `unknown macro "${trimmed}"`)

  const fields = normalized.split(/\s+/).filter((part) => part !== "")
  if (fields.length !== FIELDS.length) {
    throw new CronError(
      normalized,
      `expected ${FIELDS.length} space-separated fields, found ${fields.length}`,
    )
  }

  const resolved = FIELDS.map((spec, index) => {
    const raw = fields[index]
    if (raw === undefined) throw new CronError(normalized, `missing ${spec.name} field`)
    return resolveField(normalized, raw, spec)
  })
  const [minuteField, hourField, dayField, monthField, weekField] = resolved as [
    Resolved,
    Resolved,
    Resolved,
    Resolved,
    Resolved,
  ]
  const parsed: CronSpec = {
    minutes: new Set(minuteField.values),
    hours: new Set(hourField.values),
    daysOfMonth: new Set(dayField.values),
    months: new Set(monthField.values),
    daysOfWeek: new Set(weekField.values),
    domRestricted: dayField.restricted,
    dowRestricted: weekField.restricted,
  }

  if (hasImpossibleDay(parsed)) {
    throw new CronError(normalized, "day-of-month never exists in the selected month(s)")
  }
  return parsed
}

// ---------------------------------------------------------------------------
// Timezone arithmetic
// ---------------------------------------------------------------------------

/** Local wall-clock parts of an instant in a named zone. */
export type WallParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  weekday: number
}

const formatterCache = new Map<string, Intl.DateTimeFormat>()

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  const cached = formatterCache.get(timeZone)
  if (cached !== undefined) return cached
  let formatter: Intl.DateTimeFormat
  try {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
    })
  } catch {
    throw new CronError(timeZone, `unknown IANA timezone "${timeZone}"`)
  }
  formatterCache.set(timeZone, formatter)
  return formatter
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
}

/** Wall-clock parts of `instantMs` in `timeZone`. */
export function wallParts(instantMs: number, timeZone: string): WallParts {
  const parts = formatterFor(timeZone).formatToParts(new Date(instantMs))
  const read: Record<string, string> = {}
  for (const part of parts) read[part.type] = part.value
  return {
    year: Number(read.year),
    month: Number(read.month),
    day: Number(read.day),
    hour: Number(read.hour) % 24,
    minute: Number(read.minute),
    weekday: WEEKDAY_INDEX[read.weekday ?? ""] ?? 0,
  }
}

/** Offset of `timeZone` from UTC, in ms, at the given instant. */
function zoneOffsetMs(instantMs: number, timeZone: string): number {
  const parts = wallParts(instantMs, timeZone)
  const asIfUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0, 0)
  // Drop the seconds the formatter rounded away so the offset is minute-exact.
  return asIfUtc - Math.floor(instantMs / MINUTE_MS) * MINUTE_MS
}

/** True when `instantMs` renders back to exactly this wall time in `timeZone`. */
function rendersAs(instantMs: number, parts: WallParts, timeZone: string): boolean {
  const back = wallParts(instantMs, timeZone)
  return (
    back.year === parts.year &&
    back.month === parts.month &&
    back.day === parts.day &&
    back.hour === parts.hour &&
    back.minute === parts.minute
  )
}

/**
 * The instant at which `timeZone` shows the given wall-clock minute, or `undefined` when
 * that local time **does not exist** (DST spring-forward).
 *
 * When the wall time occurs twice (DST fall-back) the **earlier** instant is returned, so a
 * schedule that lands on an ambiguous minute fires once, at the first occurrence.
 *
 * **Both edges are the ones the standard names, and one of them is a deliberate divergence.**
 * RFC 9557 (and the `Temporal` API built on it) classifies a wall-clock reading by how many
 * instants can carry it — zero in a spring-forward *gap*, one ordinarily, two in a fall-back
 * *overlap* — and resolves it with a `disambiguation` strategy. `compatible`, the default, is
 * "overlap → the earlier instant; gap → shift forward by the length of the gap", so
 * `30 2 * * *` on a spring-forward day becomes 03:30.
 *
 * - **Overlap → earlier**: identical to `compatible`, and to what `cron` and `cron-parser` do. Not
 *   a local choice.
 * - **Gap → skip**: `undefined`, so the walk moves on. This is *not* `compatible` and it is not what
 *   `cron`/`cron-parser` do either — they compensate and run the job at the landing hour. It is
 *   spec 001's committed behaviour (a job that did not run, rather than one that silently ran an
 *   hour late), and it is the reason this returns `undefined` rather than throwing as `reject` would:
 *   inside a search, "this minute does not exist" is an ordinary outcome, not an error.
 */
export function wallToInstant(parts: WallParts, timeZone: string): number | undefined {
  const target = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0, 0)
  const day = 24 * 60 * MINUTE_MS
  const candidates = new Set<number>()
  // Probing either side of the target covers both transitions: the offset in force just
  // before and just after the wall time we are resolving.
  for (const probe of [target - day, target, target + day]) {
    const candidate = target - zoneOffsetMs(probe, timeZone)
    if (rendersAs(candidate, parts, timeZone)) candidates.add(candidate)
  }
  if (candidates.size === 0) return undefined
  return Math.min(...candidates)
}

/**
 * Vixie day rule: when **both** day-of-month and day-of-week are restricted the day matches
 * if **either** does; when only one is restricted, that one must match.
 *
 * `parts` is a reading in whichever frame the caller walked; the rule is about the numbers, not the
 * frame, so it needs no zone.
 */
export function dayMatches(parts: WallParts, spec: CronSpec): boolean {
  if (!spec.months.has(parts.month)) return false
  const domOk = spec.daysOfMonth.has(parts.day)
  const dowOk = spec.daysOfWeek.has(parts.weekday)
  if (spec.domRestricted && spec.dowRestricted) return domOk || dowOk
  if (spec.domRestricted) return domOk
  if (spec.dowRestricted) return dowOk
  return true
}

/**
 * These wall parts as a value in the **naive wall-clock frame** — a `Date.UTC`-shaped integer that
 * stands for a wall-clock reading with no zone attached to it.
 *
 * Cron is a wall-clock language — `30 2 * * *` means 02:30 on the clock on the wall, not 02:30 UTC —
 * so every step of a schedule search is wall arithmetic and the zone only enters once, when a matched
 * reading is turned into an instant. Arithmetic in this frame is what makes that true: the naive
 * value for "local midnight on 9 March" is the same integer whatever the zone, and its ordering is
 * the wall clock's own ordering, which is what a walk over a schedule wants to step through.
 *
 * **This frame has a name in the standard, and `Temporal` implements it.** RFC 9557 / `Temporal`
 * call it a *plain* date-time: "a date and time without a specific time zone or UTC offset", meant
 * for exactly this — an appointment or a scheduled event, independent of any location. Walking a
 * schedule in `Temporal.PlainDateTime` arithmetic and resolving each match with `toZonedDateTime`
 * reproduces this file's behaviour exactly, including the shape of the walk across both transitions
 * and the index at which the fall-back's 61-minute step appears. `PlainDateTime` is the vocabulary
 * this file uses instead.
 *
 * **It is nonetheless hand-rolled here, because it has to be.** This plugin is vendored as one
 * dependency-free file and CI pins **Node 22** (`.github/workflows/arggon.yml`), where `Temporal` is
 * absent: on Node 22.23.3 / V8 12.4, `typeof Temporal === "undefined"`, and it is reachable only
 * behind `--harmony-temporal`, a V8 flag a plugin cannot set on the host process that loads it. (It
 * is present unflagged on Node 26 / V8 14.6 — but even there `PlainDateTime` shipped without
 * `getPossibleInstantsFor`, the method that most directly expresses "how many instants is this wall
 * time", so the API is not settled enough to be a floor either.) See ADR 0004: a dependency is only
 * acceptable where it does not compromise the dependency-free core, and this is the core.
 *
 * **Why the frame has to be named at every call site.**
 * `bug-next-occurrence-walks-utc-wall-parts-in-any-zone-west-of-utc` shipped a walk whose cursor was
 * a *real instant* read through `Date`'s UTC getters and handed to `wallToInstant`, which reads its
 * argument as `timeZone` wall parts. Those are the same value only at offset 0: inverting
 * `local = UTC + offset` by adding `offset` back round-trips when `offset >= 0` and *adds* the
 * magnitude when it is negative, so every step in New York landed `|offset| + 1` minutes late and a
 * `* * * * *` job fired once every 241 minutes. Nothing about it looked wrong where it was written,
 * which is why the helpers say which frame they speak rather than saying `UTC`.
 */
function wallToNaive(parts: WallParts): number {
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0, 0)
}

/** The parts a value in the naive wall-clock frame encodes. The inverse of `wallToNaive`. */
function naiveToWall(naiveMs: number): WallParts {
  const date = new Date(naiveMs)
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    // getUTCDay: 0 = Sunday, already the convention `daysOfWeek` uses.
    weekday: date.getUTCDay(),
  }
}

/**
 * First occurrence of `spec` strictly after `afterMs`, evaluated in `timeZone`, or
 * `undefined` when nothing matches within the search horizon.
 *
 * **The cursor walks wall minutes in `timeZone`'s own frame.** `wall` is a value in the naive
 * wall-clock frame (see `wallToNaive`), not an instant: it starts from the zone's own reading of
 * `afterMs`, `naiveToWall` decodes it, both jump branches rebuild it from the same naive parts, and
 * only the matched reading becomes a real instant. Every step is a step of the job's clock, so one
 * frame governs the whole loop — the two jumps would be in the wrong frame if they were not, and
 * fixing only the final conversion would leave them mis-walking.
 *
 * That is also what makes DST fall out for free: a wall time that does not exist resolves to
 * `undefined` and the walk continues, and an ambiguous one resolves to its first instant. Both
 * edges are spelled out at `wallToInstant`, including the one where this file parts company with
 * the standard's `compatible` disambiguation.
 *
 * **"Strictly after" is enforced on the instant, not on the frame.** The naive frame is not a total
 * order on instants — during a fall-back the wall clock repeats an hour — so a cursor asked from
 * inside the second pass still walks 01:00-01:59, every minute of which resolves to an instant already
 * in the past. The `instant > afterMs` guard is what rejects them, which is why an ambiguous minute
 * fires once at its first occurrence and is never replayed at its second.
 */
export function nextOccurrence(spec: CronSpec, afterMs: number, timeZone: string): number | undefined {
  // Start at the next whole minute of the job's own clock, strictly after `afterMs`. Reading
  // `afterMs` in `timeZone` rather than through UTC getters is the whole fix: it is the one place
  // the zone has to be applied, because every later step is arithmetic on the reading it yields.
  let wall = wallToNaive(wallParts(afterMs, timeZone)) + MINUTE_MS
  const horizon = wall + SEARCH_HORIZON_MS

  while (wall < horizon) {
    const parts = naiveToWall(wall)
    if (!dayMatches(parts, spec)) {
      // Jump to the next local midnight instead of walking 1440 dead minutes.
      wall = wallToNaive({ ...parts, day: parts.day + 1, hour: 0, minute: 0 })
      continue
    }
    if (!spec.hours.has(parts.hour)) {
      wall = wallToNaive({ ...parts, hour: parts.hour + 1, minute: 0 })
      continue
    }
    if (!spec.minutes.has(parts.minute)) {
      wall += MINUTE_MS
      continue
    }
    // The only conversion to a real instant in the loop, and it is in the zone the whole walk was
    // reading in — so the round trip is `zone -> naive -> zone`, not `zone -> UTC -> zone`.
    const instant = wallToInstant(parts, timeZone)
    if (instant !== undefined && instant > afterMs) return instant
    // The wall minute matched but does not exist locally (spring-forward): step past it.
    wall += MINUTE_MS
  }
  return undefined
}

// ---------------------------------------------------------------------------
// Job definition
// ---------------------------------------------------------------------------

/** How missed occurrences are handled when the scheduler was not running. */
export type MisfirePolicy = "skip" | "backfill"

/** A model reference: `{ providerID, id }`, as `ctx.session.switchModel` takes it. */
export type ModelRef = { providerID: string; id: string }

export type JobDefinition = {
  id: string
  schedule: string
  timezone: string
  prompt: string
  agent?: string
  /**
   * Model for this job's runs. Omitted means "inherit the session default", which is
   * usually a *paid* model — an unattended recurring job should name its model explicitly.
   */
  model?: ModelRef
  enabled: boolean
  misfire: MisfirePolicy
  maxCatchUp: number
  runTimeoutMs: number
  /**
   * `reuse` (default) keeps one session per job so runs build on prior context, the way
   * `opencode run -s` does. `fresh` starts a new session per run for stateless work.
   */
  session: SessionMode
  /**
   * Optional per-job permission rules, in OpenCode's own schema. Absent means the session
   * default is inherited unchanged — there is deliberately no implicit tightening.
   */
  permissions?: PermissionSet
}

/** One permission effect for an action. */
export type PermissionEffect = "allow" | "ask" | "deny"

/** A permission rule: one effect, or a map of glob `resource` pattern to effect. */
export type PermissionRule = PermissionEffect | Record<string, PermissionEffect>

/** The job field: an action name mapped to its rule(s) — OpenCode's own shape. */
export type PermissionSet = Record<string, PermissionRule>

const PERMISSION_EFFECTS: ReadonlySet<string> = new Set(["allow", "ask", "deny"])

/** Bound on how many actions one job may constrain, so a job file cannot go unbounded. */
export const MAX_PERMISSION_ACTIONS = 32

/**
 * Validate a job's `permissions`, mirroring OpenCode's own permission schema.
 *
 * Frontmatter/job data is untrusted, so this checks shape as well as values: the rule set is
 * bounded, every effect is one of the three literals, and a glob map's values are effects
 * rather than nested objects.
 */
export function validatePermissions(
  value: unknown,
): { permissions: PermissionSet } | { reason: string } {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return { reason: "permissions must be an object keyed by action" }
  }
  const entries = Object.entries(value as Record<string, unknown>)
  if (entries.length > MAX_PERMISSION_ACTIONS) {
    return { reason: `permissions declares ${entries.length} actions, above the cap of ${MAX_PERMISSION_ACTIONS}` }
  }
  const out: PermissionSet = {}
  for (const [action, rule] of entries) {
    if (action === "") return { reason: "permission action name is empty" }
    if (typeof rule === "string") {
      if (!PERMISSION_EFFECTS.has(rule)) {
        return { reason: `permission "${action}" has effect "${rule}", expected allow | ask | deny` }
      }
      out[action] = rule as PermissionEffect
      continue
    }
    if (rule === null || typeof rule !== "object" || Array.isArray(rule)) {
      return { reason: `permission "${action}" must be an effect string or a resource map` }
    }
    const patterns = Object.entries(rule as Record<string, unknown>)
    if (patterns.length === 0) return { reason: `permission "${action}" has an empty resource map` }
    const mapped: Record<string, PermissionEffect> = {}
    for (const [resource, effect] of patterns) {
      if (typeof effect !== "string" || !PERMISSION_EFFECTS.has(effect)) {
        return { reason: `permission "${action}" for "${resource}" has effect "${String(effect)}", expected allow | ask | deny` }
      }
      mapped[resource] = effect as PermissionEffect
    }
    out[action] = mapped
  }
  return { permissions: out }
}

/** Every `ask` effect anywhere in a rule set, as `action` or `action:resource`. */
export function collectAsks(rules: PermissionSet): string[] {
  const asks: string[] = []
  for (const [action, rule] of Object.entries(rules)) {
    if (rule === "ask") asks.push(action)
    else if (typeof rule === "object") {
      for (const [resource, effect] of Object.entries(rule)) if (effect === "ask") asks.push(`${action}:${resource}`)
    }
  }
  return asks
}

/** Whether a job reuses one session across runs or starts a fresh one each time. */
export type SessionMode = "reuse" | "fresh"

/** One recorded run. A job keeps a bounded ring of these. */
export type HistoryEntry = {
  /** The occurrence this run satisfied. */
  dueAt: number
  startedAt: number
  outcome: RunStatus
  /** Resolved model, so an expensive run is attributable after the fact. */
  model: string
  /** Session the run used; omitted when none was available. */
  sessionID?: string
  /**
   * Present only when this record was written by a host with **no usable storage**, so it exists
   * in that process's memory alone and is gone when it ends.
   *
   * Presence-only, like `asksAsDeny` and `dropped`: its absence means "this record was stored"
   * rather than "nothing was said about retention". It is stamped in the one place every run of
   * every kind funnels through (`recordRun`), because that is the only place that knows whether
   * what it is about to write can be read back — and a record that silently evaporates at restart
   * is indistinguishable from a run that never happened.
   */
  inMemoryOnly?: boolean
  /**
   * The `"ask"` rules this run silently turned into denies, as `action` or `action:resource`.
   *
   * Present only when the run had any, so its absence means "nothing was downgraded", which is a
   * different answer from "this run is not known". It is what makes the ask-as-deny report a
   * *record* rather than a log line a user has to go hunting for after the fact — the one
   * permission event here that nobody is present to see.
   */
  asksAsDeny?: string[]
  /**
   * Occurrences this run's backlog owed that were **not** run: past `maxCatchUp` under `backfill`,
   * collapsed by policy under `skip`.
   *
   * Present only when there was a remainder, so its absence means "this run was the whole backlog"
   * rather than "not known" (ADR 0002: the remainder is "dropped and reported as truncated in the
   * run record, never silently"). It is what makes that promise a *record* instead of a log line a
   * user has to go looking for after the fact — the same reason `asksAsDeny` is one.
   */
  dropped?: number
  /** `dropped` hit the backlog scan bound, so it is a lower bound rather than a count. */
  droppedCapped?: boolean
  error?: string
}

const JOB_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/

/**
 * Parse a job's `model` field: `provider/model`, or an explicit
 * `{ providerID, id }` object. Returns a reason string when it is malformed.
 */
export function parseModelRef(
  value: unknown,
): { model: ModelRef } | { reason: string } | undefined {
  if (value === undefined) return undefined
  if (typeof value === "string") {
    const trimmed = value.trim()
    const slash = trimmed.indexOf("/")
    if (slash <= 0 || slash === trimmed.length - 1) {
      return { reason: `model "${trimmed}" must be "provider/model"` }
    }
    const providerID = trimmed.slice(0, slash)
    const id = trimmed.slice(slash + 1)
    if (providerID.trim() === "" || id.trim() === "") {
      return { reason: `model "${trimmed}" must be "provider/model"` }
    }
    return { model: { providerID: providerID.trim(), id: id.trim() } }
  }
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>
    const providerID = asString(record.providerID)
    const id = asString(record.id) ?? asString(record.modelID)
    if (providerID !== undefined && id !== undefined) return { model: { providerID, id } }
  }
  return { reason: "model must be \"provider/model\" or { providerID, id }" }
}

/** A job that failed validation, kept so `schedules_list` can report it instead of hiding it. */
export type InvalidJob = { id: string; schedule: unknown; reason: string }

export type LoadedJobs = {
  jobs: JobDefinition[]
  invalid: InvalidJob[]
  /** Present when the file itself could not be read or parsed. */
  error?: string
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined
}

function boundedInt(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, Math.trunc(value)))
}

/** Duration units, in milliseconds. `w` is deliberately absent: no job needs weeks. */
const DURATION_UNITS: Record<string, number> = {
  ms: 1,
  s: 1000,
  m: MINUTE_MS,
  h: 60 * MINUTE_MS,
  d: 24 * 60 * MINUTE_MS,
}

const DURATION_TOKEN = /(\d+(?:\.\d+)?)\s*(ms|s|m|h|d)/gy

/**
 * Parse a duration into milliseconds.
 *
 * Accepts a bare number as **seconds** (`30` → 30s, the convention taken from
 * `opencode-tasks` — see ADR 0007), a single `<n><unit>` term, or compound terms
 * (`1h30m`). Units are `ms`, `s`, `m`, `h`, `d`.
 *
 * Returns `{ ms }` on success, `{ reason }` for a malformed, non-positive or
 * non-finite value, and `undefined` when the field is absent — so an absent
 * duration can never be confused with an invalid one.
 */
export function parseDuration(value: unknown): { ms: number } | { reason: string } | undefined {
  if (value === undefined || value === null) return undefined

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return { reason: "duration must be a finite number of seconds" }
    if (value <= 0) return { reason: `duration must be greater than zero, got ${value}` }
    return { ms: Math.round(value * 1000) }
  }

  if (typeof value !== "string") {
    return { reason: "duration must be a number of seconds or a string like \"30m\"" }
  }

  const text = value.trim().toLowerCase()
  if (text === "") return { reason: "duration is empty" }
  // A bare number in string form follows the same rule as a bare number.
  if (/^\d+(?:\.\d+)?$/.test(text)) return parseDuration(Number(text))

  DURATION_TOKEN.lastIndex = 0
  let total = 0
  let matched = 0
  let token: RegExpExecArray | null
  while ((token = DURATION_TOKEN.exec(text)) !== null) {
    const amount = Number(token[1])
    const unit = DURATION_UNITS[token[2]!]
    if (unit === undefined) return { reason: `unknown duration unit "${token[2]}"` }
    total += amount * unit
    matched = DURATION_TOKEN.lastIndex
  }

  // Anything left over means the tail was not a term we understand: "5m foo" and
  // "5x" must both fail loudly rather than silently resolving to 5 minutes.
  const compact = text.replace(/\s+/g, "")
  if (matched !== compact.length || matched === 0) {
    // A number followed by letters is a bad unit, not random text: say which one.
    const badUnit = /(\d+(?:\.\d+)?)([a-z]+)$/.exec(compact)
    if (badUnit !== null && DURATION_UNITS[badUnit[2]!] === undefined) {
      return { reason: `unknown duration unit "${badUnit[2]}"` }
    }
    return { reason: `cannot parse duration "${value}"` }
  }
  if (!Number.isFinite(total) || total <= 0) {
    return { reason: `duration must be greater than zero, got "${value}"` }
  }
  return { ms: Math.round(total) }
}

/**
 * Validate one raw job entry. Returns either a `JobDefinition` or the reason it is
 * refused; a refused job never silently disappears (spec 001 § "Loading and validation").
 */
export function validateJob(raw: unknown, index: number): { job: JobDefinition } | { reason: string } {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { reason: `job at index ${index} is not an object` }
  }
  const record = raw as Record<string, unknown>

  const id = asString(record.id)
  if (id === undefined) return { reason: `job at index ${index} has no id` }
  if (!JOB_ID_PATTERN.test(id)) {
    return { reason: `job id "${id}" must match ${JOB_ID_PATTERN.source}` }
  }

  const schedule = asString(record.schedule)
  if (schedule === undefined) return { reason: `job "${id}" has no schedule` }
  try {
    parseCron(schedule)
  } catch (error) {
    return { reason: `job "${id}": ${error instanceof Error ? error.message : String(error)}` }
  }

  const timezone = asString(record.timezone) ?? asString(record.tz) ?? localTimeZone()
  try {
    formatterFor(timezone)
  } catch {
    return { reason: `job "${id}": unknown IANA timezone "${timezone}"` }
  }

  const prompt = typeof record.prompt === "string" ? record.prompt.trim() : ""
  if (prompt === "") return { reason: `job "${id}" has no prompt` }
  if (prompt.length > MAX_PROMPT_CHARS) {
    return { reason: `job "${id}": prompt longer than ${MAX_PROMPT_CHARS} characters` }
  }

  const misfire = record.misfire === "backfill" ? "backfill" : "skip"

  // `runTimeout` is a duration string; `runTimeoutMs` is the v1 millisecond field and is
  // kept working unchanged. When both are present the explicit `runTimeout` wins.
  const duration = parseDuration(record.runTimeout)
  if (duration !== undefined && "reason" in duration) return { reason: `job "${id}": ${duration.reason}` }
  // An unrecognised `session` is refused rather than defaulted: silently choosing "reuse"
  // for a job that meant "fresh" would accumulate context nobody asked for.
  const sessionMode = asString(record.session)
  if (sessionMode !== undefined && sessionMode !== "reuse" && sessionMode !== "fresh") {
    return { reason: `job "${id}": session must be "reuse" or "fresh", got "${sessionMode}"` }
  }

  let permissions: PermissionSet | undefined
  if (record.permissions !== undefined) {
    const parsed = validatePermissions(record.permissions)
    if ("reason" in parsed) return { reason: `job "${id}": ${parsed.reason}` }
    permissions = parsed.permissions
  }

  const runTimeoutMs =
    duration !== undefined && "ms" in duration
      ? duration.ms
      : boundedInt(record.runTimeoutMs, DEFAULT_RUN_TIMEOUT_MS, MINUTE_MS, 24 * 60 * MINUTE_MS)
  const clampedRunTimeoutMs = boundedInt(runTimeoutMs, DEFAULT_RUN_TIMEOUT_MS, MINUTE_MS, 24 * 60 * MINUTE_MS)

  const model = parseModelRef(record.model)
  if (model !== undefined && "reason" in model) return { reason: `job "${id}": ${model.reason}` }

  return {
    job: {
      id,
      schedule,
      timezone,
      prompt,
      ...(asString(record.agent) !== undefined ? { agent: asString(record.agent) as string } : {}),
      ...(model !== undefined && "model" in model ? { model: model.model } : {}),
      enabled: record.enabled !== false,
      misfire,
      session: sessionMode === "fresh" ? "fresh" : "reuse",
      ...(permissions !== undefined ? { permissions } : {}),
      maxCatchUp: boundedInt(record.maxCatchUp, DEFAULT_MAX_CATCH_UP, 1, 50),
      runTimeoutMs: clampedRunTimeoutMs,
    },
  }
}

/**
 * Validate a whole parsed job file. Refusing one job never refuses the others: the valid
 * ones load and the invalid ones are reported.
 */
export function loadJobs(payload: unknown): LoadedJobs {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return { jobs: [], invalid: [], error: "job file must be a JSON object" }
  }
  const record = payload as Record<string, unknown>
  const version = record.version
  if (version !== undefined && version !== 1) {
    return { jobs: [], invalid: [], error: `unsupported job file version ${String(version)} (expected 1)` }
  }
  const raw = record.jobs
  if (!Array.isArray(raw)) {
    return { jobs: [], invalid: [], error: "job file has no `jobs` array" }
  }
  if (raw.length > DEFAULT_MAX_JOBS) {
    return {
      jobs: [],
      invalid: [],
      error: `job file declares ${raw.length} jobs, above the cap of ${DEFAULT_MAX_JOBS}`,
    }
  }

  const jobs: JobDefinition[] = []
  const invalid: InvalidJob[] = []
  const seen = new Set<string>()

  raw.forEach((entry, index) => {
    const outcome = validateJob(entry, index)
    if ("reason" in outcome) {
      const id = asString((entry as Record<string, unknown> | null)?.id) ?? `#${index}`
      invalid.push({ id, schedule: (entry as Record<string, unknown> | null)?.schedule, reason: outcome.reason })
      return
    }
    if (seen.has(outcome.job.id)) {
      invalid.push({ id: outcome.job.id, schedule: outcome.job.schedule, reason: `duplicate job id "${outcome.job.id}"` })
      return
    }
    seen.add(outcome.job.id)
    jobs.push(outcome.job)
  })

  return { jobs, invalid }
}

// ---------------------------------------------------------------------------
// Markdown job files (ADR 0004)
// ---------------------------------------------------------------------------

/**
 * One half of a markdown job file: the YAML frontmatter block and the body, which is the
 * prompt.
 */
type Frontmatter = { frontmatter: string; body: string }

/** A frontmatter block must open the file, on a line of its own. */
const FRONTMATTER_FENCE = /^---[ \t]*\r?\n/

/** ...and close on a line of its own too. */
const FRONTMATTER_CLOSE = "---"

/**
 * Split a markdown job file into its frontmatter block and its body.
 *
 * The split is ours, not the reader's: a YAML reader handed a whole markdown document would
 * either fail or invent a schema for prose, and "is this a job file at all" has to be
 * answerable before any parsing happens.
 *
 * Only blank lines at the edges are removed (a blank line holds nothing but whitespace).
 * Everything inside is preserved, which is the entire point of the format: a prompt is prose,
 * and re-wrapping, dedenting or collapsing its inner blank lines would silently edit what the
 * author wrote. Line endings are normalized to `\n`, because a `\r` carried into a prompt is
 * invisible garbage and a Windows-authored job would otherwise dispatch differently from its
 * LF twin.
 */
export function splitFrontmatter(text: string): Frontmatter | { reason: string } {
  // A UTF-8 BOM is invisible in an editor and would otherwise hide the opening fence.
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  const opening = FRONTMATTER_FENCE.exec(source)
  if (opening === null) {
    return { reason: "no YAML frontmatter: a job file must open with a `---` line" }
  }
  // The fences are *lines*, so the search starts on the line after the opening one and a
  // closing fence is only a closing fence when nothing follows it on that line. Splitting on
  // `\r?\n` is where the line-ending normalization happens: everything below joins with `\n`,
  // so neither the frontmatter text nor the prompt can carry a stray `\r`.
  const lines = source.slice(opening[0].length).split(/\r?\n/)
  let bodyFrom = -1
  for (const [index, line] of lines.entries()) {
    if (line.trimEnd() === FRONTMATTER_CLOSE) {
      bodyFrom = index + 1
      break
    }
  }
  if (bodyFrom === -1) {
    return { reason: "unterminated YAML frontmatter: no closing `---` line" }
  }
  return {
    frontmatter: lines.slice(0, bodyFrom - 1).join("\n"),
    body: trimBlankEdges(lines.slice(bodyFrom).join("\n")),
  }
}

/**
 * Drop blank lines from both ends of a block of text, touching nothing else.
 *
 * A `split`/`join` pass rather than `trim()`: `trim()` also eats trailing spaces on the first
 * and last *content* lines, which is an edit to prose nobody asked for.
 */
function trimBlankEdges(text: string): string {
  const lines = text.split("\n")
  let start = 0
  let end = lines.length
  while (start < end && (lines[start] ?? "").trim() === "") start++
  while (end > start && (lines[end - 1] ?? "").trim() === "") end--
  return lines.slice(start, end).join("\n")
}

/**
 * The one function a YAML reader has to provide: parse a document, or throw.
 *
 * `options` carries our alias budget, which is asked for at every call site rather than baked
 * into the resolved reader — so an injected reader gets the same bound as the built-in one. A
 * reader that does not know the option ignores it, which is the whole contract. Nothing else
 * about the reader is assumed: no schema, no tag set.
 */
export type YamlReader = (source: string, options?: { maxAliasCount?: number }) => unknown

let injectedReader: YamlReader | undefined
let readerResolved = false

/**
 * Supply the YAML reader, or state that there is none.
 *
 * This exists because of the distribution story, not for convenience. The plugin is copied as
 * one file into `.opencode/plugins/`, where it cannot declare a dependency — so an embedder
 * (or a test) that already has a YAML reader has no other way to hand it over. Passing
 * `undefined` states "there is no reader" and stops the dynamic import from being tried, which
 * is what makes the degradation testable on a machine that happens to have `yaml` installed.
 */
export function setYamlReader(reader: YamlReader | undefined): void {
  injectedReader = reader
  readerResolved = true
}

/**
 * Resolve the YAML reader, or `undefined` when there is none.
 *
 * **This is the only place the plugin resolves a package name at all**, and it is deliberately
 * unreachable from the JSON path: the import is dynamic, guarded, and inside a function, so a
 * project with no `.opencode/tasks/` directory never resolves `yaml` (invariant 4). The
 * specifier is held in a variable so no bundler tries to resolve it at build time — "this
 * module may legitimately not exist" is the point.
 *
 * A failed import is a degradation, not an error: the caller refuses the markdown jobs by name
 * and keeps serving the JSON surface (ADR 0004's "report it, do not fail the load").
 */
export async function loadYamlReader(): Promise<YamlReader | undefined> {
  if (readerResolved) return injectedReader
  readerResolved = true
  const specifier = YAML_READER_MODULE
  try {
    const module = (await import(/* @vite-ignore */ specifier)) as {
      parse?: unknown
      default?: { parse?: unknown }
    }
    // `yaml` exposes `parse` as a named export; the `default` arm covers a CJS-interop build.
    const parse = [module.parse, module.default?.parse].find(
      (candidate): candidate is (source: string, options?: { maxAliasCount?: number }) => unknown =>
        typeof candidate === "function",
    )
    if (parse === undefined) throw new Error(`${specifier} exposes no parse()`)
    injectedReader = (source, options) => parse(source, options)
    return injectedReader
  } catch {
    logOnce(
      "no-yaml",
      `no YAML reader: ${specifier} is not installed, so ${TASKS_DIR}/*.md jobs are refused and ` +
        `${JOBS_FILE} jobs are unaffected. Install ${specifier} (an optionalDependency) to enable them.`,
    )
    return undefined
  }
}

/**
 * Path of one markdown job file, for messages: `.opencode/tasks/<name>`.
 *
 * Takes a *file name*, not an id, because it is also used for the files that were found but
 * refused — whose name is exactly what the author has to look at.
 */
function markdownFilePath(name: string): string {
  return `${TASKS_DIR}/${name}`
}

/**
 * Name a parsed YAML value's *kind* for a refusal, never its content.
 *
 * Quoting the document would hand untrusted text straight back to whoever reads the error, so
 * only the type survives.
 */
function describeValue(value: unknown): string {
  if (Array.isArray(value)) return "a list"
  if (value === null) return "null"
  return typeof value
}

/**
 * Read one markdown job file into a raw job entry, or the reason it is refused.
 *
 * Every failure is per file, never per directory (ADR 0001's rule: refuse one job, never the
 * file). The returned `raw` is a plain record shaped exactly like a JSON job entry, so it goes
 * through `validateJob` unchanged — one validation path, identical error strings, and a field
 * added to `JobDefinition` later cannot be honoured by one surface and forgotten by the other.
 */
function readMarkdownJob(
  name: string,
  text: string,
  reader: YamlReader | undefined,
): { raw: Record<string, unknown>; notes: string[] } | { invalid: InvalidJob } {
  const id = name.slice(0, -MARKDOWN_EXT.length)
  const where = markdownFilePath(name)
  const refuse = (reason: string): { invalid: InvalidJob } => ({
    invalid: { id, schedule: undefined, reason: `${where}: ${reason}` },
  })

  const split = splitFrontmatter(text)
  if ("reason" in split) return refuse(split.reason)

  if (split.frontmatter.length > MAX_FRONTMATTER_CHARS) {
    return refuse(
      `frontmatter is ${split.frontmatter.length} characters, above the cap of ${MAX_FRONTMATTER_CHARS}`,
    )
  }
  if (reader === undefined) {
    return refuse(
      `no YAML reader available (${YAML_READER_MODULE} is not installed and none was provided); ` +
        `install it, or move this job to ${JOBS_FILE}`,
    )
  }

  let parsed: unknown
  try {
    parsed = reader(split.frontmatter, { maxAliasCount: MAX_YAML_ALIASES })
  } catch (error) {
    // The reader's own message is the useful one ("unexpected end of the stream"), so it is
    // quoted rather than replaced — clipped, because it is untrusted text of unknown length.
    const message = error instanceof Error ? error.message : String(error)
    return refuse(`frontmatter is not valid YAML (${clip(message, 200)})`)
  }
  // An empty block parses to null; that is a job with no fields, not a broken document, and it
  // deserves the same "has no schedule" refusal a JSON job with no fields gets.
  const fields = parsed === null || parsed === undefined ? {} : parsed
  if (typeof fields !== "object" || Array.isArray(fields)) {
    return refuse(`frontmatter must be a mapping of job fields, got ${describeValue(fields)}`)
  }

  const record = { ...(fields as Record<string, unknown>) }
  const notes: string[] = []

  // The filename stem is the id (ADR 0004). A frontmatter `id` cannot move a job — but a
  // silently ignored one is a job that quietly never fires under the name its author expects,
  // so the disagreement is reported next to the job it affected rather than dropped.
  if (record.id !== undefined) {
    const declared = typeof record.id === "string" ? record.id.trim() : String(record.id)
    if (declared !== id) {
      notes.push(
        `${where}: frontmatter "id" "${clip(declared, 60)}" is ignored; the filename stem "${id}" is the job id`,
      )
    }
  }
  delete record.id

  // The id is the stem — always, whether or not the frontmatter said so — so the record this
  // hands to `validateJob` is shaped exactly like a JSON job entry and reports its refusals
  // with the same words.
  record.id = id

  // The body is the prompt. It replaces anything the frontmatter called `prompt`: two prompts
  // in one file is a contradiction, and the body is the one a human reads.
  record.prompt = split.body

  return { raw: record, notes }
}

/**
 * Load every markdown job file in `directory` (which is `.opencode/tasks`) — never throws.
 *
 * A missing directory is **not** an error: it is the v1 state, a JSON-only project, and
 * reporting it would put a spurious error in front of every such project. Everything else the
 * directory can do wrong — unreadable, not a directory, a file that cannot be read — is
 * reported.
 */
export async function loadMarkdownJobs(directory: string): Promise<LoadedJobs> {
  let entries: Array<{ name: string; isDirectory(): boolean }>
  try {
    entries = readdirSync(directory, { withFileTypes: true })
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code === "ENOENT" || code === "ENOTDIR") return { jobs: [], invalid: [] }
    return {
      jobs: [],
      invalid: [],
      error: `${TASKS_DIR}: ${error instanceof Error ? error.message : String(error)}`,
    }
  }

  // Sorted, and stat-checked, before anything is read. `readdir` order is filesystem-defined,
  // so without the sort the order jobs appear in would depend on the inode layout — and job
  // order is user-visible through `schedules_list`. The stat is also a safety check: only
  // regular files are opened, because `readFileSync` on a FIFO blocks forever and would hang
  // the server from inside a plugin (invariant 3).
  const files: Array<{ name: string; size: number }> = []
  for (const entry of entries) {
    if (!entry.name.endsWith(MARKDOWN_EXT) || entry.isDirectory()) continue
    try {
      const stats = statSync(join(directory, entry.name))
      if (stats.isFile()) files.push({ name: entry.name, size: stats.size })
    } catch {
      // A dangling symlink, or a file that vanished mid-listing: not a job.
    }
  }
  files.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
  if (files.length === 0) return { jobs: [], invalid: [] }

  // Resolved once per directory, and only now: a project with no markdown job never asks for a
  // YAML reader at all (invariant 4).
  const reader = await loadYamlReader()

  const jobs: JobDefinition[] = []
  const invalid: InvalidJob[] = []
  let considered = 0
  let skipped = 0

  for (const file of files) {
    const id = file.name.slice(0, -MARKDOWN_EXT.length)
    // Counted per *file considered*, not per entry reported: one file can produce two reports
    // (an ignored `id` and a refusal), and a note must not cost the directory a job slot.
    if (considered >= MAX_MARKDOWN_JOBS) {
      skipped++
      continue
    }
    considered++
    if (file.size > MAX_MARKDOWN_FILE_BYTES) {
      invalid.push({
        id,
        schedule: undefined,
        reason: `${markdownFilePath(file.name)}: file is ${file.size} bytes, above the cap of ${MAX_MARKDOWN_FILE_BYTES}`,
      })
      continue
    }
    let text: string
    try {
      text = readFileSync(join(directory, file.name), "utf8")
    } catch (error) {
      invalid.push({
        id,
        schedule: undefined,
        reason: `${markdownFilePath(file.name)}: ${error instanceof Error ? error.message : String(error)}`,
      })
      continue
    }

    const outcome = readMarkdownJob(file.name, text, reader)
    if ("invalid" in outcome) {
      invalid.push(outcome.invalid)
      continue
    }
    for (const note of outcome.notes) invalid.push({ id, schedule: undefined, reason: note })

    // The *same* validation path as the JSON surface: no markdown-only rules, no second
    // schema. A bad schedule, timezone, duration, session mode or permission set is refused
    // with the identical string a JSON job with the same fields would produce.
    const validated = validateJob(outcome.raw, 0)
    if ("reason" in validated) {
      invalid.push({ id, schedule: outcome.raw.schedule, reason: validated.reason })
      continue
    }
    jobs.push(validated.job)
  }

  if (skipped > 0) {
    invalid.push({
      id: `${TASKS_DIR}/*.md`,
      schedule: undefined,
      reason: `${files.length} markdown job files found, above the cap of ${MAX_MARKDOWN_JOBS}; the rest were not read`,
    })
  }
  return { jobs, invalid }
}

/**
 * Merge the two config surfaces by id, with markdown winning (ADR 0004).
 *
 * Precedence is **per id**, not per source: a JSON array and a directory of `.md` files
 * coexist, which is what makes a one-job-at-a-time migration possible. A shadowed JSON job is
 * reported through the same `invalid` array the JSON surface already uses — the existing shape,
 * not a parallel channel, because a tool that reports refusals in one place cannot be
 * half-read.
 */
export function mergeJobSources(json: LoadedJobs, markdown: LoadedJobs): LoadedJobs {
  const merged: JobDefinition[] = []
  const positions = new Map<string, number>()
  for (const job of json.jobs) {
    if (positions.has(job.id)) continue
    positions.set(job.id, merged.length)
    merged.push(job)
  }

  const shadows: InvalidJob[] = []
  for (const job of markdown.jobs) {
    const at = positions.get(job.id)
    if (at === undefined) {
      positions.set(job.id, merged.length)
      merged.push(job)
      continue
    }
    // Keep the JSON file's position, so a migrating project does not reshuffle its whole job
    // list the day its first task file lands.
    merged[at] = job
    const shadowed = json.jobs.find((entry) => entry.id === job.id)
    shadows.push({
      id: job.id,
      schedule: shadowed?.schedule,
      reason:
        `${markdownFilePath(job.id + MARKDOWN_EXT)} shadows the job "${job.id}" in ${JOBS_FILE} ` +
        `(markdown wins); delete one of them to stop being told about this`,
    })
  }

  const errors = [json.error, markdown.error].filter((error): error is string => error !== undefined)
  return {
    jobs: merged,
    invalid: [...json.invalid, ...markdown.invalid, ...shadows],
    ...(errors.length > 0 ? { error: [...new Set(errors)].join("; ") } : {}),
  }
}

/** The server's local IANA zone; the default for a job that names no timezone. */
export function localTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  } catch {
    return "UTC"
  }
}

// ---------------------------------------------------------------------------
// Misfire resolution and run state (ADR 0002)
// ---------------------------------------------------------------------------

export type RunStatus = "ok" | "failed" | "timeout" | "skipped"

/**
 * What a `backfill` job still owes after the cursor moved past its window.
 *
 * Durable, and on the job's own state record for two reasons. The occurrences in it are real
 * billable work the user asked for, so a restart must not lose them; and the remainder has to
 * travel with them, because it is reported once — when the backlog was found — and a number that
 * lived only in the decision that found it would be gone by the time anyone read the record.
 */
export type CatchUpPlan = {
  /** Occurrences not yet dispatched, oldest first. Bounded by `maxCatchUp`. */
  pending: number[]
  /** Occurrences past the cap. Exact up to `MAX_BACKLOG_SCAN`, a lower bound beyond it. */
  dropped: number
  /** `dropped` hit the scan bound, so it is a lower bound rather than a count. */
  droppedCapped?: boolean
}

/** Durable, versioned per-job record. Only mutable run state lives here — never the job. */
export type JobState = {
  version: number
  lastRun?: number
  lastStatus?: RunStatus
  lastError?: string
  nextRun?: number
  /** Heartbeat of an in-flight run; an expired one is treated as abandoned. */
  leaseUntil?: number
  /**
   * Occurrences a `backfill` job still owes, replayed one per tick (ADR 0002). Absent whenever
   * nothing is owed, which is also what a *finished* backlog leaves behind.
   */
  catchUp?: CatchUpPlan
}

export type JobStateMap = Record<string, JobState>

/** One occurrence the tick decided about. */
export type Occurrence = {
  jobId: string
  /** The instant the occurrence was due. */
  dueAt: number
  /**
   * How many due occurrences this decision covers.
   *
   * One, always: a decision is one occurrence, dispatched on its own. `skip` still collapses a
   * backlog into a single run and `backfill` replays one occurrence per tick, so nothing folds
   * several occurrences into one decision any more — and the occurrences a decision did *not* run
   * are counted by `dropped`, which is where that fact now lives.
   */
  collapsed: number
  /** Occurrences this decision's backlog owed that were not run: past `maxCatchUp`, or collapsed by `skip`. */
  dropped: number
  /** True when `dropped` hit the scan bound and is therefore a lower bound. */
  droppedCapped?: boolean
  /**
   * True only on the tick that found the backlog, so the truncation is logged once instead of once
   * per replayed occurrence. The number itself rides every record (see `CatchUpPlan`).
   */
  backlogFound?: boolean
}

/** Why a due job was not run. */
export type Suppression =
  | { reason: "in-flight" }
  | { reason: "concurrency"; running: number }
  | { reason: "backlog-truncated"; dropped: number }

/**
 * The clause a log line carries when a decision's backlog did not fit, or `""` when it did.
 *
 * **Empty rather than a zero**, so a line about a run that covered its whole backlog reads exactly as
 * it did before truncation was reported — "nothing was dropped" is what a missing clause means, and
 * ADR 0002's "never silently" is a promise about the cases where something *was* dropped.
 *
 * The scan-bound flag is spelled out rather than left to the reader: a lower bound that looks like a
 * count is how "2 dropped" turns into a claim the scheduler cannot back up.
 */
function truncationClause(occurrence: Occurrence): string {
  if (occurrence.dropped <= 0) return ""
  const capped = occurrence.droppedCapped === true ? " or more; the backlog scan bound was reached" : ""
  return `backlog truncated, ${occurrence.dropped} occurrence(s) dropped${capped}`
}

export type TickDecision =
  | { kind: "run"; job: JobDefinition; occurrence: Occurrence }
  | { kind: "skip"; job: JobDefinition; occurrence: Occurrence; suppression: Suppression }

export type MissedOccurrences = {
  /** Replayed occurrences, oldest first, capped at `limit`. */
  instants: number[]
  /** Occurrences past the cap. Exact up to `MAX_BACKLOG_SCAN`, a lower bound beyond it. */
  dropped: number
  droppedCapped: boolean
}

/**
 * Ceiling on the walk that counts a dropped backlog — and the reason a tick's cost is bounded.
 *
 * The count is **not** derived arithmetically, and deliberately so: cron occurrences are a
 * function of a timezone, a calendar and DST, so an exact count *is* a search. What is bounded is
 * how far the search goes — past this many occurrences it stops and reports a lower bound
 * (`droppedCapped`). That is what makes a tick cost a function of the number of **jobs** rather
 * than of how long the server was asleep. Measured on this file (2026-10-03, re-measured after
 * `bug-next-occurrence-walks-utc-wall-parts-in-any-zone-west-of-utc`): a `* * * * *` job costs the
 * same 7014 timezone lookups (~31 ms) for a backlog of 24 hours and for one of 100 years, and pays
 * that once — the tick that finds the backlog consumes the window and a `backfill` remainder moves
 * into the durable plan, so the next tick costs one occurrence search (~0.03 ms). A later tick over
 * 100 such jobs costs ~8 ms.
 *
 * The walk is **7014** rather than the 6012 it used to be because a matching search now costs seven
 * timezone lookups rather than six: the walk reads `afterMs` in the job's own zone to learn what its
 * clock says before it walks that clock (`nextOccurrence`). The bound itself is unchanged, so the
 * longest block a walk can produce is still one job's — see `yieldToEventLoop` for the measurement
 * that the fix does not regress.
 *
 * **Not exported on purpose.** The bound is asserted as a literal in `test/index.test.ts`, so
 * raising it breaks a cost assertion in the open rather than being followed silently by a test
 * that reads the constant.
 */
const MAX_BACKLOG_SCAN = 1000

/**
 * Every occurrence of `spec` in `(afterMs, untilMs]`, capped at `limit`, oldest first.
 *
 * `dropped` reports what the cap swallowed rather than silently discarding it (ADR 0002).
 *
 * **Cost**: at most `limit + MAX_BACKLOG_SCAN + 1` occurrence searches, whatever the window holds
 * — the `limit` instants handed back, `MAX_BACKLOG_SCAN` occurrences counted, and one probe past
 * the bound that tells "exactly at the bound" from "beyond it". The scheduler's own `limit` is
 * `maxCatchUp` (≤ 50, from `validateJob`) or 1 under `skip`, so one job's count cannot exceed a
 * fixed ~1050 searches however long the server slept. `limit` is the one input that could still
 * make this unbounded, which is why its ceiling lives in `validateJob` and not here: clamping it
 * here would silently answer a different question than the caller asked.
 */
export function missedOccurrences(
  spec: CronSpec,
  afterMs: number,
  untilMs: number,
  timeZone: string,
  limit: number,
): MissedOccurrences {
  const instants: number[] = []
  let cursor = afterMs
  while (instants.length < limit) {
    const next = nextOccurrence(spec, cursor, timeZone)
    if (next === undefined || next > untilMs) break
    instants.push(next)
    cursor = next
  }
  if (instants.length < limit) return { instants, dropped: 0, droppedCapped: false }

  let dropped = 0
  while (dropped < MAX_BACKLOG_SCAN) {
    const next = nextOccurrence(spec, cursor, timeZone)
    if (next === undefined || next > untilMs) return { instants, dropped, droppedCapped: false }
    dropped += 1
    cursor = next
  }
  // One probe past the bound distinguishes "exactly at the bound" from "beyond it".
  const beyond = nextOccurrence(spec, cursor, timeZone)
  return { instants, dropped, droppedCapped: beyond !== undefined && beyond <= untilMs }
}

/**
 * Decide what to do about the occurrences a job owes at `nowMs`.
 *
 * The cursor is `state.lastRun ?? nowMs`: a job with **no history** starts at `nowMs`, so a
 * fresh install never replays a decade of the past — only a job that has actually run
 * before carries a cursor that can fall behind.
 *
 * **One occurrence per decision, whichever policy fires.** `skip` collapses a backlog into a single
 * run; `backfill` replays up to `maxCatchUp` of them, oldest first, one per tick. What the window
 * held beyond that is counted in `occurrence.dropped` and reported in both sinks — it is never
 * simply discarded.
 *
 * Whichever policy fires, the cursor is advanced to `nowMs`. That is what makes `skip` genuinely
 * *collapse* a backlog rather than replaying it one occurrence per tick: the window is consumed
 * whether or not each of its occurrences was run. Under `backfill` the occurrences that are owed
 * instead of run move into `state.catchUp` first, so consuming the window loses nothing — a backlog
 * replays across the following ticks rather than replaying inside the tick that found it, which is
 * what keeps one tick's cost to one run and leaves the shared per-tick budget in charge of the rest.
 *
 * Consuming the window is also what pays for the count below: **the walk that reports a dropped
 * backlog happens once per backlog, not once per tick**, and a `backfill` replay spends the durable
 * plan instead of re-counting it. See `MAX_BACKLOG_SCAN` for the bound and the measurement.
 */
export function resolveDue(
  job: JobDefinition,
  spec: CronSpec,
  state: JobState,
  nowMs: number,
  inFlight: boolean,
  running: number,
  maxConcurrentRuns: number,
): TickDecision | undefined {
  const after = state.lastRun ?? nowMs
  const backfill = job.misfire === "backfill"
  // A backlog still being replayed owes exactly the next occurrence, whatever the window says: the
  // cursor already moved past the whole window when the plan was made, so re-deriving from it would
  // find nothing and the plan could never drain.
  const replay = backfill ? state.catchUp : undefined
  const found: MissedOccurrences =
    replay === undefined || replay.pending.length === 0
      ? missedOccurrences(spec, after, nowMs, job.timezone, backfill ? job.maxCatchUp : 1)
      : {
          instants: [replay.pending[0] as number],
          dropped: replay.dropped,
          droppedCapped: replay.droppedCapped === true,
        }

  if (found.instants.length === 0) {
    // Arm the cursor the first time we ever see this job. Without this the job stays
    // starved forever: with `lastRun` still undefined every tick re-derives
    // `after = nowMs`, the window is always empty, and the job can never come due.
    if (state.lastRun === undefined) state.lastRun = nowMs
    const upcoming = nextOccurrence(spec, nowMs, job.timezone)
    if (upcoming !== undefined && state.nextRun !== upcoming) state.nextRun = upcoming
    return undefined
  }

  const occurrence: Occurrence = {
    jobId: job.id,
    dueAt: found.instants[0] as number,
    // One, because this decision dispatches one occurrence. The field is kept rather than dropped
    // because a record that says how many occurrences it covered is what makes "this run stood for
    // a backlog" answerable — and its value is the honest answer, which is no longer "several".
    collapsed: 1,
    dropped: found.dropped,
    ...(found.droppedCapped ? { droppedCapped: true } : {}),
    // Only the tick that *found* the backlog logs the truncation: every later replay would repeat a
    // line about a backlog discovered minutes ago, and the number is in every record regardless.
    ...(replay === undefined && found.dropped > 0 ? { backlogFound: true } : {}),
  }

  // The backlog becomes a plan the moment it is found, **before** admission is decided: whether
  // these occurrences are owed cannot depend on whether a slot happened to be free this tick. The
  // remainder travels with them, because it is reported on the tick that finds the backlog and the
  // records of the replays that follow.
  if (backfill && replay === undefined) {
    state.catchUp = {
      pending: found.instants,
      dropped: found.dropped,
      ...(found.droppedCapped ? { droppedCapped: true } : {}),
    }
  } else if (!backfill) {
    // A policy that stopped being `backfill` mid-drain collapses what is left, which is what
    // `skip` means. Keeping the old plan would instead spend one of its occurrences per tick —
    // neither policy, and silent.
    state.catchUp = undefined
  }

  /** Consume the whole window: the cursor moves to `nowMs`, never to a replayed instant. */
  const consume = (): void => {
    state.lastRun = nowMs
    const upcoming = nextOccurrence(spec, nowMs, job.timezone)
    if (upcoming !== undefined) state.nextRun = upcoming
  }

  /**
   * Take the occurrence this decision covered off what the job still owes.
   *
   * Before the dispatch, not after: a crash mid-run must not replay the same occurrence forever. A
   * plan with nothing left is removed rather than kept as an empty shell, so "this job is owed
   * nothing" needs no field of its own to say so.
   */
  const take = (): void => {
    const plan = state.catchUp
    if (plan === undefined) return
    const pending = plan.pending.slice(1)
    state.catchUp = pending.length === 0 ? undefined : { ...plan, pending }
  }

  // Suppressed rather than decided: under `backfill` an occurrence that finds no free slot stays
  // **owed**, because the plan now holds it. `skip` has no such thing — collapsing the window is its
  // whole decision — so there the occurrence is spent, exactly as it always was, and the record says
  // so in `lastStatus`.
  const defer = (suppression: Suppression): TickDecision => {
    consume()
    if (backfill) return { kind: "skip", job, occurrence, suppression }
    state.lastStatus = "skipped"
    return { kind: "skip", job, occurrence, suppression }
  }

  if (inFlight) return defer({ reason: "in-flight" })
  if (running >= maxConcurrentRuns) return defer({ reason: "concurrency", running })

  // Consume the occurrence *before* the run, so a crash mid-run cannot replay it forever — and
  // consume the whole window too, so the rest of the backlog is owed as a plan rather than
  // trickling out of a window that has already been taken.
  consume()
  take()

  return { kind: "run", job, occurrence }
}

/**
 * The durable record for one job, created in place if it is not there yet.
 *
 * Reading through this rather than `state.states[job.id] ?? { … }` matters for any run started
 * outside `tick`: `tick` creates the record for every job it considers, so a scheduled run never
 * noticed, but a manual `schedules_run` of a job the tick has not reached (or of a *disabled* job,
 * which `tick` skips before the record exists) would otherwise take its run lease on a throwaway
 * object — a lease nothing reads, which is precisely the lease this path exists to take.
 */
function jobState(state: SchedulerState, jobId: string): JobState {
  const existing = state.states[jobId]
  if (existing !== undefined) return existing
  const created: JobState = { version: STATE_VERSION }
  state.states[jobId] = created
  return created
}

/**
 * Take the per-job run lease for one dispatch, renewing it while the run is in flight, and hand
 * back the single closer that gives it up.
 *
 * The lease is the job-scoped half of ADR 0003's single-writer rule: `isRunOutstanding` reads
 * `leaseUntil`, so a tick will not admit a second prompt into a session whose run is still going —
 * for a scheduled run, a one-off and a manual trigger alike. All three go through here rather than
 * each open-coding the interval, because "the same lease rules" is only true while there is one
 * implementation of them.
 *
 * Renewal runs on `leaseRenewalMs` (half the bound), never from the tick heartbeat: see
 * `isRunOutstanding` for why the two signals must not be conflated.
 *
 * The closer is idempotent and clears the interval **before** the marker, so it can be called from
 * a `finally` on any path — success, timeout or throw — and an armed renewal can never outlive the
 * run it belongs to and suppress the next occurrence of a job nobody is running.
 */
export function openRunLease(record: JobState, runTimeoutMs: number): () => void {
  record.leaseUntil = Date.now() + runTimeoutMs
  const renew = setInterval(() => {
    record.leaseUntil = Date.now() + runTimeoutMs
  }, leaseRenewalMs(runTimeoutMs))
  renew.unref?.()
  let closed = false
  return () => {
    if (closed) return
    closed = true
    clearInterval(renew)
    record.leaseUntil = undefined
  }
}

/** Repair a persisted record: an unknown version or a corrupt entry re-initializes. */
export function normalizeState(value: unknown): JobState {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return { version: STATE_VERSION }
  const record = value as Record<string, unknown>
  if (record.version !== STATE_VERSION) return { version: STATE_VERSION }
  const state: JobState = { version: STATE_VERSION }
  if (typeof record.lastRun === "number" && Number.isFinite(record.lastRun)) state.lastRun = record.lastRun
  if (typeof record.nextRun === "number" && Number.isFinite(record.nextRun)) state.nextRun = record.nextRun
  if (typeof record.leaseUntil === "number" && Number.isFinite(record.leaseUntil)) {
    state.leaseUntil = record.leaseUntil
  }
  if (isRunStatus(record.lastStatus)) state.lastStatus = record.lastStatus
  if (typeof record.lastError === "string") state.lastError = record.lastError.slice(0, 500)
  const catchUp = normalizeCatchUp(record.catchUp)
  if (catchUp !== undefined) state.catchUp = catchUp
  return state
}

/**
 * Repair a stored catch-up plan, or refuse it.
 *
 * Refused when it cannot mean what it claims — not an object, no instant list, nothing left in it —
 * because a bogus entry here is not a cosmetic defect: it is a *dispatch*, of an instant no schedule
 * ever asked for. A spent plan (empty list) is refused for the ordinary reason, that there is
 * nothing left to replay.
 *
 * Kept, but sorted and bounded, when it does: "oldest first" is the promise ADR 0002 makes about
 * what `backfill` replays, so it is enforced here rather than assumed of whatever wrote the record.
 */
function normalizeCatchUp(value: unknown): CatchUpPlan | undefined {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return undefined
  const plan = value as Record<string, unknown>
  if (!Array.isArray(plan.pending)) return undefined
  const pending: number[] = []
  for (const raw of plan.pending.slice(0, MAX_BACKLOG_SCAN)) {
    if (typeof raw === "number" && Number.isFinite(raw)) pending.push(Math.trunc(raw))
  }
  if (pending.length === 0) return undefined
  const dropped =
    typeof plan.dropped === "number" && Number.isFinite(plan.dropped) ? Math.max(0, Math.trunc(plan.dropped)) : 0
  return {
    pending: pending.sort((a, b) => a - b),
    dropped,
    ...(plan.droppedCapped === true ? { droppedCapped: true } : {}),
  }
}

function isRunStatus(value: unknown): value is RunStatus {
  return value === "ok" || value === "failed" || value === "timeout" || value === "skipped"
}

/** How many past runs a job keeps. Bounded on purpose (spec 002 § Run history). */
export const DEFAULT_HISTORY_LIMIT = 10

/** Hard ceiling on the retained history, whatever a caller asks for. */
export const MAX_HISTORY_LIMIT = 50

/** Longest error string retained per run. */
const HISTORY_ERROR_MAX = 300

/**
 * Longest model or session string retained per run.
 *
 * Bounded for the same reason as `HISTORY_ERROR_MAX`, and on the read side as well as the write
 * side: a hand-edited record carrying a megabyte of "model" must not become a megabyte of
 * in-memory buffer and a megabyte of tool output.
 */
const HISTORY_LABEL_MAX = 200

/**
 * How much of a run's ask-as-deny list one record keeps: the number of entries, and the length
 * of each.
 *
 * Bounded like `HISTORY_ERROR_MAX` and for the same reason, with one difference that makes it
 * necessary rather than merely tidy: `error` and `model` are single strings, while the ask list
 * is an array **whose length nothing upstream bounds**. `validatePermissions` caps the actions a
 * job may constrain but not the resource patterns under each one, so a single action can expand
 * into an unbounded number of asks — and a stored record can be edited from outside entirely.
 * Cardinality first, then each string, so the bound holds however the list was shaped.
 */
const HISTORY_ASK_ENTRIES_MAX = 16
const HISTORY_ASK_LEN_MAX = 120

/**
 * Clip a run's ask-as-deny list: cardinality, then every element.
 *
 * Shared by `pushHistory` and `loadHistory` so a write side and a read side cannot disagree
 * about what a record contains — the same rule the error clip follows.
 */
function clipAsks(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const out: string[] = []
  // `slice` before the loop: a stored array of a million entries must not be walked.
  for (const raw of value.slice(0, HISTORY_ASK_ENTRIES_MAX)) {
    const ask = asString(raw)
    if (ask !== undefined) out.push(clip(ask, HISTORY_ASK_LEN_MAX))
  }
  // An empty list carries the same information as an absent one — "nothing was downgraded" — so
  // it is dropped rather than stored, and the field stays a report rather than a schema change.
  return out.length === 0 ? undefined : out
}

/**
 * A count a run record may carry: a non-negative integer, or nothing at all.
 *
 * Shared by the write and read sides for the reason `clipAsks` shares `clip` — a record is storage,
 * and storage can be edited from outside, so the two sides must not disagree about what a field
 * means. A zero is *nothing dropped*, which is what the absent field already says, so it is dropped
 * rather than stored: its absence has to be an answer.
 */
function storedCount(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return undefined
  const count = Math.trunc(value)
  return count === 0 ? undefined : count
}

/**
 * The truncation clause a run record carries, or `{}` when the backlog had no remainder.
 *
 * The flag travels with the count and only with it: `droppedCapped` qualifies a number, so a record
 * carrying it alone would describe a lower bound of nothing.
 */
function truncationFields(dropped: unknown, droppedCapped: unknown): Pick<HistoryEntry, "dropped" | "droppedCapped"> {
  const count = storedCount(dropped)
  if (count === undefined) return {}
  return { dropped: count, ...(droppedCapped === true ? { droppedCapped: true } : {}) }
}

/**
 * Append one run to a job's history, evicting oldest-first at the limit.
 *
 * Pure and exported so the eviction rule is testable without a clock or a session.
 */
export function pushHistory(
  history: readonly HistoryEntry[],
  entry: HistoryEntry,
  limit = DEFAULT_HISTORY_LIMIT,
): HistoryEntry[] {
  const bounded = Math.max(1, Math.min(MAX_HISTORY_LIMIT, Math.trunc(limit)))
  // Clipped here as well as in `loadHistory`: this is the write side, and the two have to agree
  // or the same run reads back differently depending on which one happened to see it.
  // Destructured out first because a spread cannot *remove* a key: a record carrying an empty or
  // malformed list must come back without the field, not with the raw one still attached.
  const { asksAsDeny: rawAsks, dropped, droppedCapped, ...rest } = entry
  const asksAsDeny = clipAsks(rawAsks)
  const truncation = truncationFields(dropped, droppedCapped)
  const next = [
    ...history,
    {
      ...rest,
      ...(rest.error === undefined ? {} : { error: clip(rest.error, HISTORY_ERROR_MAX) }),
      ...(asksAsDeny === undefined ? {} : { asksAsDeny }),
      ...truncation,
      model: clip(rest.model, HISTORY_LABEL_MAX),
      ...(rest.sessionID === undefined ? {} : { sessionID: clip(rest.sessionID, HISTORY_LABEL_MAX) }),
    },
  ]
  // Evict oldest-first: the newest run is the one a reader wants.
  return next.length > bounded ? next.slice(next.length - bounded) : next
}

/** An in-flight lease older than its own timeout is abandoned, not hung. */
export function isLeaseLive(state: JobState, nowMs: number): boolean {
  return state.leaseUntil !== undefined && state.leaseUntil > nowMs
}

/**
 * How often an in-flight run re-extends its own lease.
 *
 * Half the run bound, not the whole of it, so a lease can never lapse *between* renewals: at
 * every instant of a live run the lease has at least half a window left, while the run itself
 * has only what is left of its bound. So the lease always reaches past the run's remaining life,
 * by a margin that grows with every renewal. Tied to the bound rather than fixed, so a `1m` job
 * and a `1h` job renew at comparable fractions of themselves.
 *
 * Exported and pure because "two renewals fit inside one window" is the invariant worth pinning
 * on its own: a renewal period equal to (or longer than) the window reintroduces exactly the
 * expiry-under-a-live-run this exists to prevent, and nothing else in the file would notice.
 */
export function leaseRenewalMs(runTimeoutMs: number): number {
  const bounded = boundedInt(runTimeoutMs, DEFAULT_RUN_TIMEOUT_MS, MINUTE_MS, 24 * 60 * MINUTE_MS)
  return Math.max(1_000, Math.floor(bounded / 2))
}

/**
 * Whether a run of this job is already outstanding — the one question admission asks.
 *
 * **Two signals, and the rule is their disjunction, because neither can be trusted alone.**
 *
 * - `leaseUntil` is a comparison against `now`, so it is only as good as the clock. A stalled
 *   event loop (a long GC, a suspended laptop, a debugger pause) returns with the wall clock
 *   minutes past the window the run set at its start, and the lease then reads *expired* while
 *   the run is provably still going. Re-admitting there is a second prompt into a session that
 *   is already busy — the double-fire ADR 0003 exists to prevent.
 * - `inFlight` membership is a fact about *this* process, not a comparison against a clock, so
 *   it cannot be wrong in that direction. It is also the signal that matches the concurrency
 *   accounting exactly: an id is in the set from admission until the run returns, whatever the
 *   outcome.
 *
 * The lease is kept regardless, because it is the only signal that survives anything this
 * process did not observe — a previous instance's, or a restart's. It is renewed from run
 * liveness while a run is live (see `runJob`) rather than from the tick heartbeat, because the
 * tick heartbeat is the *cross-process writer* lease's mechanism (ADR 0003) and cannot see runs;
 * making `leaseUntil` depend on the tick would leave it answering "did a tick happen", not "is a
 * run outstanding", at the cost of a storage write per in-flight job per tick.
 *
 * The asymmetry, stated once: a timeout that fires late is recoverable — the record is a little
 * pessimistic and the next occurrence is unaffected — while a lease that expires under a live
 * run is not, because two runs of one occurrence is a fact the history can no longer explain. So
 * when the two bounds conflict, the run bound wins on *reporting* and liveness wins on
 * *suppression*.
 */
export function isRunOutstanding(record: JobState, inFlight: boolean, nowMs: number): boolean {
  return inFlight || isLeaseLive(record, nowMs)
}

// ---------------------------------------------------------------------------
// Cross-process writer lease (ADR 0003)
// ---------------------------------------------------------------------------

export type Lease = {
  path: string
  /** False when the directory could not be created and we run without a lease. */
  held: boolean
  /** True when another live instance holds the lease and we must stay inert. */
  foreign: boolean
  heartbeat: () => void
  release: () => void
}

/**
 * Override for the state directory. Set `OPENCODE_SCHEDULED_TASKS_DATA_DIR` to relocate
 * every lockfile — useful for a container, a read-only home, or a test run that must not
 * touch the real one.
 */
export const DATA_DIR_ENV = "OPENCODE_SCHEDULED_TASKS_DATA_DIR"

/** Directory holding one lockfile per project. */
export function leaseBaseDir(): string {
  const override = asString(process.env[DATA_DIR_ENV])
  if (override !== undefined) return override
  return join(homedir(), ".local", "share", "opencode", "scheduled-tasks")
}

/** Lockfile path for one project. The id is sanitized, so it is never a path component. */
export function leasePath(directory: string, id: string): string {
  const safe = id.replace(/[^A-Za-z0-9._-]/g, "_")
  return join(leaseBaseDir(), safe, "writer.lock")
}

function readLease(path: string): { pid: number; heartbeat: number } | undefined {
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, "utf8"))
    if (parsed === null || typeof parsed !== "object") return undefined
    const record = parsed as Record<string, unknown>
    const pid = typeof record.pid === "number" ? record.pid : Number.NaN
    const heartbeat = typeof record.heartbeat === "number" ? record.heartbeat : Number.NaN
    if (!Number.isFinite(pid) || !Number.isFinite(heartbeat)) return undefined
    return { pid, heartbeat }
  } catch {
    return undefined
  }
}

/**
 * Acquire the writer lease for this instance.
 *
 * `fs.openSync(path, "wx")` is an atomic exclusive create: `EEXIST` proves another process
 * holds it. A lease whose heartbeat is older than `ttlMs` is reclaimed, so a `SIGKILL`ed
 * server does not wedge scheduling forever. When the directory cannot be created we
 * **degrade** to running without a lease rather than disabling the scheduler — the
 * `held: false` result is recorded so the loss of arbitration is visible, not silent.
 */
/** A lease for a project with no enabled jobs: nothing to arbitrate, nothing to release. */
const IDLE_LEASE: Lease = {
  path: "(none)",
  held: false,
  foreign: false,
  heartbeat: () => {},
  release: () => {},
}

export function acquireLease(path: string, options: { now?: () => number; ttlMs?: number } = {}): Lease {
  const now = (): number => options.now?.() ?? Date.now()
  const ttlMs = options.ttlMs ?? DEFAULT_LEASE_TTL_MS

  const noLease = (foreign: boolean): Lease => ({
    path,
    held: false,
    foreign,
    heartbeat: () => {},
    release: () => {},
  })

  let created = false
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      mkdirSync(dirname(path), { recursive: true })
    } catch {
      return noLease(false)
    }
    try {
      const fd = openSync(path, "wx")
      try {
        writeSync(fd, JSON.stringify({ pid: process.pid, heartbeat: now() }))
      } finally {
        closeSync(fd)
      }
      created = true
      break
    } catch {
      const existing = readLease(path)
      // Our own pid means a reload inside this very process: the previous instance may not
      // have run its cleanup, and treating that as a foreign holder would make the plugin
      // permanently inert after the first `opencode reload`. Take our own lease back.
      if (existing !== undefined && existing.pid === process.pid) {
        try {
          writeFileSync(path, JSON.stringify({ pid: process.pid, heartbeat: now() }))
          created = true
          break
        } catch {
          return noLease(true)
        }
      }
      if (existing !== undefined && now() - existing.heartbeat <= ttlMs) {
        return noLease(true)
      }
      // Stale or unreadable: drop it and make exactly one more exclusive attempt.
      try {
        unlinkSync(path)
      } catch {
        return noLease(true)
      }
    }
  }

  if (!created) return noLease(true)

  return {
    path,
    held: true,
    foreign: false,
    heartbeat: () => {
      try {
        const existing = readLease(path)
        if (existing !== undefined && existing.pid !== process.pid) return
        utimesSync(path, new Date(), new Date())
        writeFileSync(path, JSON.stringify({ pid: process.pid, heartbeat: now() }))
      } catch {
        // A failed heartbeat only costs us the lease at the next stale check; the tick
        // itself keeps running, which is the correct degradation.
      }
    },
    release: () => {
      const existing = readLease(path)
      if (existing !== undefined && existing.pid !== process.pid) return
      try {
        unlinkSync(path)
      } catch {
        // Already gone: releasing twice is not an error.
      }
    },
  }
}

// ---------------------------------------------------------------------------
// One-off tasks (ADR 0006)
// ---------------------------------------------------------------------------

/**
 * An ephemeral single-run task.
 *
 * Deliberately **not** a `JobDefinition`: a one-off has an absolute instant and no
 * recurrence, and it never reaches a job file. Keeping the two types apart is what makes
 * ADR 0001's "recurring jobs are file-only" guarantee testable.
 */
export type OneOffTask = {
  id: string
  /** Absolute instant, epoch ms. */
  dueAt: number
  prompt: string
  agent?: string
  model?: ModelRef
  runTimeoutMs: number
  permissions?: PermissionSet
  createdAt: number
}

/** Most one-offs a project may hold pending at once. */
export const DEFAULT_ONEOFF_CAP = 50

/** Hard ceiling on pending one-offs, whatever the cap is configured to. */
export const MAX_ONEOFF_CAP = 200

/** Ceiling on one-off prompt length; job data is untrusted. */
const ONEOFF_PROMPT_MAX = 20_000

const ONEOFF_PREFIX = `${STORAGE_PREFIX}oneoff/`

/**
 * A past instant inside this window is accepted and fires on the next tick rather than
 * being refused. Refusing outright would make "schedule it 30s ago" impossible; running it
 * silently much later would be dishonest. Everything beyond the window is refused.
 */
export const ONEOFF_GRACE_MS = 5 * MINUTE_MS

export type OneOffValidation =
  | { task: Omit<OneOffTask, "id" | "createdAt"> }
  | { reason: string }

/**
 * Validate a `schedules_schedule` request.
 *
 * `nowMs` is injected so the grace window is testable without a clock.
 */
export function validateOneOff(
  input: Record<string, unknown>,
  nowMs: number,
): OneOffValidation {
  const prompt = typeof input.prompt === "string" ? input.prompt.trim() : ""
  if (prompt === "") return { reason: "prompt is required" }
  if (prompt.length > ONEOFF_PROMPT_MAX) {
    return { reason: `prompt longer than ${ONEOFF_PROMPT_MAX} characters` }
  }

  const dueAt = typeof input.dueAt === "number" ? input.dueAt : Number.NaN
  if (!Number.isFinite(dueAt)) {
    const parsed = parseDuration(input.dueIn)
    if (parsed === undefined || "reason" in parsed) {
      return { reason: "dueAt (epoch ms) or dueIn (a duration from now) is required" }
    }
    return finish(input, prompt, nowMs + parsed.ms)
  }
  if (dueAt < nowMs - ONEOFF_GRACE_MS) {
    return {
      reason: `dueAt is more than ${Math.round(ONEOFF_GRACE_MS / 1000)}s in the past; pass a future instant`,
    }
  }
  return finish(input, prompt, dueAt)
}

function finish(
  input: Record<string, unknown>,
  prompt: string,
  dueAt: number,
): OneOffValidation {
  const agent = asString(input.agent)
  const model = parseModelRef(input.model)
  if (model !== undefined && "reason" in model) return { reason: model.reason }
  const timeout = parseDuration(input.runTimeout)
  if (timeout !== undefined && "reason" in timeout) return { reason: timeout.reason }
  let permissions: PermissionSet | undefined
  if (input.permissions !== undefined) {
    const parsed = validatePermissions(input.permissions)
    if ("reason" in parsed) return { reason: parsed.reason }
    permissions = parsed.permissions
  }
  return {
    task: {
      dueAt,
      prompt,
      ...(agent !== undefined ? { agent } : {}),
      ...(model !== undefined && "model" in model ? { model: model.model } : {}),
      runTimeoutMs:
        timeout !== undefined && "ms" in timeout
          ? boundedInt(timeout.ms, DEFAULT_RUN_TIMEOUT_MS, MINUTE_MS, 24 * 60 * MINUTE_MS)
          : DEFAULT_RUN_TIMEOUT_MS,
      ...(permissions !== undefined ? { permissions } : {}),
    },
  }
}

/** Ids are random because they are created and consumed by an agent, not authored. */
function oneOffId(): string {
  return `oneoff_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
}

/**
 * Read pending one-offs, dropping malformed entries rather than failing the load.
 *
 * **Capped on read as well as on write**, because `saveOneOffs`'s slice only ever bounds what
 * this plugin writes — a record that was hand-edited, or written by an older build with a
 * different cap, arrives whole and would otherwise be admitted in full. The cap keeps the
 * *oldest* entries: the list is due-ordered, so the oldest are the most overdue and the newest
 * are the ones someone has just asked for and is still waiting on. The drop is stated in the
 * log, because a task that silently stops existing is the worst way for it to go.
 */
async function loadOneOffs(ctx: PluginContext): Promise<OneOffTask[]> {
  const stored = await storageGet(ctx, `${ONEOFF_PREFIX}pending`)
  if (!Array.isArray(stored)) return []
  const out: OneOffTask[] = []
  for (const raw of stored) {
    if (raw === null || typeof raw !== "object") continue
    const record = raw as Record<string, unknown>
    const id = asString(record.id)
    const prompt = asString(record.prompt)
    if (id === undefined || prompt === undefined) continue
    if (typeof record.dueAt !== "number" || !Number.isFinite(record.dueAt)) continue
    if (typeof record.createdAt !== "number") continue
    const model = parseModelRef(record.model)
    out.push({
      id,
      dueAt: record.dueAt,
      prompt,
      createdAt: record.createdAt,
      runTimeoutMs: boundedInt(record.runTimeoutMs, DEFAULT_RUN_TIMEOUT_MS, MINUTE_MS, 24 * 60 * MINUTE_MS),
      ...(asString(record.agent) !== undefined ? { agent: asString(record.agent) as string } : {}),
      ...(model !== undefined && "model" in model ? { model: model.model } : {}),
      ...(record.permissions !== undefined ? { permissions: record.permissions as PermissionSet } : {}),
    })
  }
  if (out.length > MAX_ONEOFF_CAP) {
    logLine(
      `stored one-off record holds ${out.length} tasks, over the cap of ${MAX_ONEOFF_CAP}; dropping the newest ${out.length - MAX_ONEOFF_CAP}`,
    )
    return out.slice(0, MAX_ONEOFF_CAP)
  }
  return out
}

async function saveOneOffs(ctx: PluginContext, tasks: readonly OneOffTask[]): Promise<void> {
  await storageSet(ctx, `${ONEOFF_PREFIX}pending`, tasks.slice(0, MAX_ONEOFF_CAP))
}

// ---------------------------------------------------------------------------
// Session loops (ADR 0006)
// ---------------------------------------------------------------------------

/**
 * An in-session recurring prompt: posts into **the session that created it** on a fixed
 * interval, until it is stopped or expires.
 *
 * Not a `JobDefinition`: a loop has a duration interval (not a cron expression), belongs to
 * a session rather than a project, and is agent-managed rather than file-defined.
 */
export type SessionLoop = {
  id: string
  /** Session that owns this loop. A loop never posts into another. */
  sessionID: string
  prompt: string
  intervalMs: number
  nextRunAt: number
  createdAt: number
  /** When the loop auto-disables. */
  expiresAt: number
}

/** Most loops one session may hold at once. */
export const DEFAULT_LOOP_CAP = 10

/**
 * Hard ceiling on loops per session, whatever the cap is configured to.
 *
 * Enforced where a stored record is *read* (`normalizeLoops`), not only where one is created:
 * `schedules_start_loop` caps what this plugin accepts, which says nothing about what a
 * hand-edited or oversized record can hand it at setup.
 */
export const MAX_LOOP_CAP = 50

/** Default loop lifetime. Three days, matching the convention borrowed with this feature. */
export const DEFAULT_LOOP_TTL_MS = 3 * 24 * 60 * MINUTE_MS

/** Loops are minute-resolution at best; OpenCode's cron is too. */
export const MIN_LOOP_INTERVAL_MS = MINUTE_MS

const LOOP_PREFIX = `${STORAGE_PREFIX}loop/`

function loopId(): string {
  return `loop_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
}

export type LoopValidation = { task: Omit<SessionLoop, "id" | "createdAt" | "nextRunAt"> } | { reason: string }

/** Validate a `schedules_start_loop` request. `nowMs` is injected so TTLs are testable. */
export function validateLoop(input: Record<string, unknown>, nowMs: number, sessionID: string): LoopValidation {
  const prompt = typeof input.prompt === "string" ? input.prompt.trim() : ""
  if (prompt === "") return { reason: "prompt is required" }
  if (prompt.length > ONEOFF_PROMPT_MAX) {
    return { reason: `prompt longer than ${ONEOFF_PROMPT_MAX} characters` }
  }

  // A duration, not a cron expression: a loop is "every N", not "at these times".
  const interval = parseDuration(input.every ?? input.interval)
  if (interval === undefined) {
    return { reason: "every is required, as a duration such as \"5m\", \"2h\" or \"1d\"" }
  }
  if ("reason" in interval) return { reason: interval.reason }
  if (interval.ms < MIN_LOOP_INTERVAL_MS) {
    return {
      reason: `interval must be at least ${Math.round(MIN_LOOP_INTERVAL_MS / 1000)}s (loops are minute-resolution)`,
    }
  }

  const ttl = parseDuration(input.ttl)
  if (ttl !== undefined && "reason" in ttl) return { reason: ttl.reason }
  const expiresInMs = ttl !== undefined && "ms" in ttl ? ttl.ms : DEFAULT_LOOP_TTL_MS

  return { task: { sessionID, prompt, intervalMs: interval.ms, expiresAt: nowMs + expiresInMs } }
}

/**
 * Validate one session's stored loop record, dropping malformed entries rather than failing
 * the whole load, and capping what is kept.
 *
 * Pure and exported because **two** callers need it and must not drift: the per-session read
 * (`loadLoops`) and the startup scan, which has a record in hand and the session id it was
 * filed under rather than being told either.
 *
 * The cap is `MAX_LOOP_CAP` — the hard ceiling the constant has always claimed to be, applied
 * here so the claim is true of a hand-edited or oversized record rather than only of what
 * `schedules_start_loop` is willing to accept. Oldest kept, because a loop is recurring work
 * somebody asked for and not a queue entry to prune.
 */
export function normalizeLoops(stored: unknown, sessionID: string): SessionLoop[] {
  if (!Array.isArray(stored)) return []
  const out: SessionLoop[] = []
  for (const raw of stored) {
    if (raw === null || typeof raw !== "object") continue
    const r = raw as Record<string, unknown>
    const id = asString(r.id)
    const prompt = asString(r.prompt)
    if (id === undefined || prompt === undefined) continue
    if (typeof r.intervalMs !== "number" || !Number.isFinite(r.intervalMs)) continue
    if (typeof r.nextRunAt !== "number" || !Number.isFinite(r.nextRunAt)) continue
    if (typeof r.expiresAt !== "number" || !Number.isFinite(r.expiresAt)) continue
    out.push({
      id,
      sessionID,
      prompt,
      intervalMs: r.intervalMs,
      nextRunAt: r.nextRunAt,
      expiresAt: r.expiresAt,
      createdAt: typeof r.createdAt === "number" ? r.createdAt : r.nextRunAt,
    })
  }
  if (out.length > MAX_LOOP_CAP) {
    logLine(
      `stored loop record for session ${sessionID} holds ${out.length} loops, over the ceiling of ${MAX_LOOP_CAP}; dropping the newest ${out.length - MAX_LOOP_CAP}`,
    )
    return out.slice(0, MAX_LOOP_CAP)
  }
  return out
}

/** Read loops for one session. */
async function loadLoops(ctx: PluginContext, sessionID: string): Promise<SessionLoop[]> {
  return normalizeLoops(await storageGet(ctx, `${LOOP_PREFIX}${sessionID}`), sessionID)
}

/**
 * Ceiling on stored loop records one startup scan will consider, and the page size it asks
 * for. A loop is filed per session, so this bounds how many *sessions* are restored at once —
 * the cardinality a hostile or long-lived storage namespace could otherwise grow into.
 */
export const MAX_LOOP_SCAN_KEYS = 500

const LOOP_SCAN_PAGE = 100

/** One `{ key, value }` pair as a scan hands it back. Both fields are feature-detected. */
type ScanEntry = { key?: unknown; value?: unknown }

/**
 * Read one `scan` result as a page plus its continuation cursor.
 *
 * Deliberately tolerant in *shape* and strict in *content*: the documented surface is
 * `{ entries, next }`, and a bare array is accepted because it can only mean the single page
 * it is. Every field is still validated below — a scan we cannot read must return nothing,
 * not guesses.
 */
function scanPage(result: unknown): { entries: ScanEntry[]; next?: string } {
  if (Array.isArray(result)) return { entries: result as ScanEntry[] }
  if (result === null || typeof result !== "object") return { entries: [] }
  const record = result as { entries?: unknown; next?: unknown }
  const entries = Array.isArray(record.entries) ? (record.entries as ScanEntry[]) : []
  const next = asString(record.next)
  return next === undefined ? { entries } : { entries, next }
}

/**
 * Every session that has stored loops, discovered by prefixing this plugin's own namespace.
 *
 * `ctx.storage.scan` is **feature-detected**: it is not on every host version's plugin
 * surface, and a scheduler cannot enumerate state it was never offered. When it is absent the
 * answer is a degradation with a name (`logOnce`), not a guess: stored loops still resume the
 * moment their own session calls `schedules_start_loop` / `schedules_stop_loop`, which is the
 * path that always worked.
 */
async function scanLoopSessions(ctx: PluginContext): Promise<Array<{ sessionID: string; stored: unknown }>> {
  const scan = ctx.storage?.scan
  if (typeof scan !== "function") {
    logOnce(
      "no-storage-scan",
      "ctx.storage.scan is unavailable, so a stored session loop is not restored at startup; it resumes " +
        "the next time that session starts or stops a loop",
    )
    return []
  }

  const found: Array<{ sessionID: string; stored: unknown }> = []
  const seen = new Set<string>()
  let after: string | undefined
  for (let page = 0; found.length < MAX_LOOP_SCAN_KEYS && page <= MAX_LOOP_SCAN_KEYS; page += 1) {
    let result: unknown
    try {
      result = await scan({
        prefix: LOOP_PREFIX,
        limit: LOOP_SCAN_PAGE,
        ...(after !== undefined ? { after } : {}),
      })
    } catch (error) {
      logOnce("storage-scan", `storage scan failed (${error instanceof Error ? error.message : String(error)})`)
      return found
    }
    const read = scanPage(result)
    for (const entry of read.entries) {
      const key = asString(entry.key)
      if (key === undefined || !key.startsWith(LOOP_PREFIX)) continue
      // The key tail is the owning session, and it becomes a storage key and a prompt target,
      // so it goes through the same token check `schedules_start_loop` applies to its caller.
      const sessionID = sessionToken(key.slice(LOOP_PREFIX.length))
      if (sessionID === undefined || seen.has(sessionID)) continue
      seen.add(sessionID)
      found.push({ sessionID, stored: entry.value })
    }
    if (read.next === undefined) break
    after = read.next
  }
  if (found.length >= MAX_LOOP_SCAN_KEYS) {
    logLine(`loop scan stopped at the cap of ${MAX_LOOP_SCAN_KEYS} sessions; the rest were not restored`)
  }
  return found
}

/**
 * Restore every stored session loop at setup.
 *
 * Without this a stored, due loop simply never posted again after a restart — while the
 * comment beside `schedules_start_loop` claimed a loop survives a reload. The sessions that
 * own one are not knowable without asking storage, which is the whole reason `scan` is here.
 */
async function loadAllLoops(ctx: PluginContext, state: SchedulerState): Promise<void> {
  for (const { sessionID, stored } of await scanLoopSessions(ctx)) {
    const loops = normalizeLoops(stored, sessionID)
    if (loops.length > 0) state.loops.set(sessionID, loops)
  }
}

async function saveLoops(ctx: PluginContext, sessionID: string, loops: readonly SessionLoop[]): Promise<void> {
  // A loop belongs to one session, so the key is that session's: a loop can never outlive
  // the session that asked for it, and a dead session's loops are simply unreachable.
  //
  // The id comes from the **caller** — the session token `schedules_start_loop` /
  // `schedules_stop_loop` already validated — never from the record being saved. That is
  // what lets an *emptied* set be persisted at all: deriving the key from the first loop
  // meant an empty set had no key, so a stop was never written and the next `start_loop`
  // read the stale record back and resurrected the stopped loops (bug-loop-stop-does-not-
  // persist-and-concurrency-bypass). The scoping property is unchanged — still exactly one
  // key per session id, still re-derived on load.
  const key = `${LOOP_PREFIX}${sessionID}`
  if (loops.length > 0) {
    // No slice to the ceiling here, deliberately: every array that reaches this point came from
    // `normalizeLoops` (which caps at `MAX_LOOP_CAP`) or from `schedules_start_loop` (which caps
    // at `DEFAULT_LOOP_CAP`), so a second cap would be unreachable — and a mutation removing it
    // caught nothing, which is how unreachable code is recognised.
    await storageSet(ctx, key, loops)
    return
  }
  // Stopping the last loop must leave a *persistent* "nothing here", not a silent no-op.
  await storageRemove(ctx, key)
}

/**
 * This session's loops, read from storage the first time they are needed.
 *
 * `Map.has`, deliberately, and not `loops.length > 0`: an empty list is the real, loaded
 * answer after `stop_loop` (and after every loop expires), and treating empty as "not
 * loaded yet" is what made a later `start_loop` re-read a stale record. The in-memory entry
 * is written back so the storage read happens at most once per session.
 */
async function loopsFor(ctx: PluginContext, state: SchedulerState, sessionID: string): Promise<SessionLoop[]> {
  const known = state.loops.get(sessionID)
  if (known !== undefined) return known
  const loaded = await loadLoops(ctx, sessionID)
  state.loops.set(sessionID, loaded)
  return loaded
}

// ---------------------------------------------------------------------------
// OpenCode V2 plugin context (structural types — no `@opencode/plugin` import)
// ---------------------------------------------------------------------------

/**
 * The durable key/value surface, entirely optional.
 *
 * `scan` is what makes *stored state* discoverable rather than merely addressable: without it
 * the plugin can read a key whose id it already knows (a job id, the calling session) but can
 * never enumerate what a previous run left behind. Verified present on 2.0.22 as
 * `scan({ prefix?, after?, limit? }) → { entries: [{ key, value }], next? }`, with keys already
 * relative to this plugin's own namespace — and it is feature-detected everywhere it is used,
 * because the surface varies by version.
 */
type StorageContext = {
  get?(key: string): Promise<unknown>
  set?(key: string, value: unknown): Promise<unknown>
  remove?(key: string): Promise<unknown>
  scan?(input: { prefix?: string; after?: string; limit?: number }): Promise<unknown>
}

type SessionContext = {
  create?(input?: { title?: string }): Promise<unknown>
  get?(input: { sessionID: string }): Promise<unknown>
  prompt?(input: Record<string, unknown>): Promise<unknown>
  interrupt?(input: { sessionID: string; continue?: boolean }): Promise<unknown>
  update?(input: { sessionID: string; title?: string }): Promise<unknown>
  rename?(input: { sessionID: string; title: string }): Promise<unknown>
  switchAgent?(input: { sessionID: string; agent: string }): Promise<unknown>
  switchModel?(input: { sessionID: string; model: { providerID: string; id: string } }): Promise<unknown>
}

type ToolEditorLike = {
  namespace?(input: { name: string; description: string }): void
  add?(tool: ToolRegistration): void
}

type ToolContext = {
  transform?(callback: (editor: ToolEditorLike) => void): Promise<unknown>
}

type ToolCallContext = { sessionID?: unknown }

type ToolResult = { output: Record<string, unknown> }

type ToolRegistration = {
  name: string
  description: string
  input: Record<string, unknown>
  output: Record<string, unknown>
  options: { namespace: string; codemode: boolean }
  execute: (input: Record<string, unknown>, context?: ToolCallContext) => Promise<ToolResult>
}

/**
 * The V2 `ctx.permission` surface. `rules` *replaces* a session's permission rules; without
 * it a job cannot constrain itself, so every caller feature-detects it (ADR 0005).
 */
type PermissionContext = {
  rules?(input: { sessionID: string; permissions: unknown[] }): Promise<unknown>
}

type PluginContext = {
  options?: Record<string, unknown>
  permission?: PermissionContext
  location?: { directory?: unknown; project?: { id?: unknown } }
  storage?: StorageContext
  session?: SessionContext
  tool?: ToolContext
}

type PluginDefinition = {
  id: string
  setup: (ctx: PluginContext) => Promise<(() => void) | void>
}

export const TOOL_NAMESPACE = "schedules"

/**
 * One short line: the Code Mode catalog pays for this description on every model request.
 */
const TOOL_NAMESPACE_DESCRIPTION =
  "Scheduled agent tasks: list cron jobs with their next/last run, or trigger one now."

/** Log at most once per key — a broken scheduler stays quiet and inert. */
const logged = new Set<string>()

function emit(message: string): void {
  const line = `${LOG_PREFIX} ${clip(message, LOG_LINE_MAX)}`
  // stderr first: it is what an interactive `--print-logs` run shows.
  console.error(line)
  if (activeLogPath === undefined) return
  try {
    appendFileSync(activeLogPath, `${new Date().toISOString()} ${line}\n`)
  } catch {
    // A scheduler that cannot write its log must still run; say so once and move on.
    if (!logged.has("log-write")) {
      logged.add("log-write")
      console.error(`${LOG_PREFIX} could not append to ${activeLogPath}`)
    }
  }
}

function logOnce(key: string, message: string): void {
  if (logged.has(key)) return
  logged.add(key)
  emit(message)
}

function logLine(message: string): void {
  emit(message)
}

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function dispose(registration: unknown): void {
  const candidate = registration as { dispose?: unknown } | null
  if (candidate !== null && typeof candidate.dispose === "function") {
    void Promise.resolve((candidate.dispose as () => unknown).call(candidate)).catch(() => {})
  }
}

/**
 * The storage operations this host does **not** offer, in the order they are needed.
 *
 * `get`, `set` and `remove` are feature-detected one at a time, everywhere they are used, because
 * the plugin storage surface grew across host versions and a scheduler cannot assume a present
 * `storage` object carries any particular method. This names what is missing rather than answering
 * yes/no, so the one setup line about a degraded host can say *which* half is gone: a host that
 * only writes keeps nothing readable, and one that only reads keeps nothing at all.
 */
function missingStorageOps(ctx: PluginContext): string[] {
  return [
    ...(typeof ctx.storage?.get === "function" ? [] : ["get"]),
    ...(typeof ctx.storage?.set === "function" ? [] : ["set"]),
  ]
}

async function storageGet(ctx: PluginContext, key: string): Promise<unknown> {
  try {
    return typeof ctx.storage?.get === "function" ? await ctx.storage.get(key) : undefined
  } catch (error) {
    logOnce("storage-get", `storage read failed (${error instanceof Error ? error.message : String(error)})`)
    return undefined
  }
}

async function storageSet(ctx: PluginContext, key: string, value: unknown): Promise<void> {
  try {
    if (typeof ctx.storage?.set === "function") await ctx.storage.set(key, value)
  } catch (error) {
    logOnce("storage-set", `storage write failed (${error instanceof Error ? error.message : String(error)})`)
  }
}

/**
 * Record that a key holds **nothing**, rather than leaving whatever it held in place.
 *
 * Deleting is the honest form, but it is not universal: `remove` is optional on the plugin
 * storage surface, exactly like `set`. So a host that cannot delete gets an explicit empty
 * record, which reads back as "nothing here" through the same normalizer. Either way the
 * answer survives a restart — which is the whole point, because the alternative (writing
 * nothing and treating *absent* as *empty*) let a stopped loop resurrect from its own
 * stale record.
 */
async function storageRemove(ctx: PluginContext, key: string): Promise<void> {
  try {
    if (typeof ctx.storage?.remove === "function") {
      await ctx.storage.remove(key)
      return
    }
  } catch (error) {
    logOnce("storage-remove", `storage delete failed (${error instanceof Error ? error.message : String(error)}); writing an empty record instead`)
  }
  await storageSet(ctx, key, [])
}

/**
 * A runtime-provided session id, accepted only when it looks like an opaque token.
 *
 * A loop is scoped by this, so an odd or hostile value must not become a storage key.
 */
function sessionToken(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const token = value.trim()
  return token !== "" && token.length <= 128 && /^[A-Za-z0-9._:-]+$/.test(token) ? token : undefined
}

function sessionIdOf(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim() !== "") return value.trim()
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>
    for (const key of ["id", "sessionID", "sessionId"]) {
      const found = asString(record[key])
      if (found !== undefined) return found
    }
  }
  return undefined
}

// ---------------------------------------------------------------------------
// The scheduler
// ---------------------------------------------------------------------------

type SchedulerState = {
  jobs: JobDefinition[]
  specs: Map<string, CronSpec>
  states: JobStateMap
  /** Session id per reused job, so runs accumulate context the way `opencode run -s` does. */
  sessions: Map<string, string>
  /** Bounded per-job run history, oldest-first. */
  history: Map<string, HistoryEntry[]>
  /** Pending one-off tasks. Runtime-only; never written to a job file (ADR 0006). */
  oneOffs: OneOffTask[]
  /** In-session loops, keyed by the owning session id. */
  loops: Map<string, SessionLoop[]>
  /**
   * Ids of one-offs dispatched by this process and not yet recorded.
   *
   * Not the same question as `inFlight`, and deliberately a separate set: a one-off is consumed
   * out of `oneOffs` before it is dispatched and records nothing until it finishes, so for the
   * length of a run its id is named nowhere. This is what lets a reader be told "this one-off
   * exists and has no runs yet" rather than "no such id" for a run that is plainly happening.
   */
  dispatching: Set<string>
  /**
   * Ids with a run outstanding — a job's run or a loop's post — so the concurrency cap is
   * global rather than per-kind. Ids are namespaced by construction (`oneoff_*`, `loop_*` vs
   * a file-defined job id), so the two sets cannot collide in practice.
   */
  inFlight: Set<string>
  fileError?: string
  invalid: InvalidJob[]
  /**
   * Whether this host can keep what it records across a restart — i.e. whether it offers **both**
   * halves of the plugin storage surface that durability needs: `set` to write and `get` to read
   * back.
   *
   * Detected as the pair rather than as "is there a `storage` object", because neither operation
   * implies the other and a scheduler that assumes they arrive together invents continuity it
   * does not have. `false` is not a shrug: it is stamped onto every run record
   * (`HistoryEntry.inMemoryOnly`), said once at setup, and is why ephemeral history is kept and
   * read in memory below.
   */
  storageAvailable: boolean
  /**
   * This process's own record of the ephemeral history keys it has minted, oldest stamp first.
   *
   * The mirror of the persisted index, and the only one on a host with no storage — where the
   * in-memory ring *is* the retained history, so a cap that counted storage keys alone would
   * bound nothing and every one-off would leave a ring behind for the life of the session.
   */
  ephemeralKeys: Map<string, number>
}

/**
 * Whether this instance has **anything** for the tick to do.
 *
 * Enabled file jobs are only half the answer, and counting only them is the whole bug: both
 * ephemeral drains live *inside* `tick`, so a project with `jobs: []` and a pending one-off
 * (or a stored loop) has work even though no job file says so. Deciding that once at setup is
 * what let `schedules_schedule` report success for work nothing would ever fire.
 *
 * Exported and pure because the rule is the invariant worth pinning on its own: it is what
 * ADR 0003's "take the writer lease only when there is work" is decided against, so a change
 * here changes when a second instance is expected to stay inert.
 */
export function hasWork(work: {
  jobs: readonly Pick<JobDefinition, "enabled">[]
  oneOffs: readonly unknown[]
  loops: ReadonlyMap<string, readonly unknown[]>
}): boolean {
  if (work.jobs.some((job) => job.enabled)) return true
  if (work.oneOffs.length > 0) return true
  for (const loops of work.loops.values()) {
    if (loops.length > 0) return true
  }
  return false
}

const NO_INPUT = { type: "object", properties: {}, additionalProperties: false }

const LIST_OUTPUT = {
  type: "object",
  properties: {
    jobs: { type: "array" },
    invalid: { type: "array" },
    error: { type: "string" },
    leaseHeld: { type: "boolean" },
    leaseForeign: { type: "boolean" },
    tickMs: { type: "number" },
  },
}

const RUN_OUTPUT = {
  type: "object",
  properties: { id: { type: "string" }, sessionID: { type: "string" }, admitted: { type: "string" } },
}

const FORMAT_OUTPUT = {
  type: "object",
  properties: { reference: { type: "string" } },
}

const SCHEDULE_OUTPUT = {
  type: "object",
  properties: { id: { type: "string" }, dueAt: { type: "string" }, pending: { type: "number" } },
}

const LOOP_OUTPUT = {
  type: "object",
  properties: { id: { type: "string" }, sessionID: { type: "string" }, nextRunAt: { type: "string" }, expiresAt: { type: "string" } },
}

const LOOP_LIST_OUTPUT = {
  type: "object",
  properties: { loops: { type: "array" }, cap: { type: "number" } },
}

const CANCEL_OUTPUT = {
  type: "object",
  properties: { id: { type: "string" }, cancelled: { type: "boolean" }, pending: { type: "number" } },
}

const HISTORY_OUTPUT = {
  type: "object",
  properties: {
    id: { type: "string" },
    kind: { type: "string", description: 'Which kind of thing this id is: "job", "oneoff" or "loop".' },
    session: { type: "string" },
    runs: { type: "array" },
    limit: { type: "number" },
    historyUnavailable: { type: "string" },
  },
}

/**
 * Read, validate and merge both config surfaces; never throws.
 *
 * Asynchronous because the markdown surface resolves its YAML reader through a dynamic import
 * — the one guarded, optional dependency in the file (ADR 0004). The JSON surface stays
 * synchronous underneath: an `await` here changes when the merge completes, never what it
 * accepts.
 */
async function reloadJobs(ctx: PluginContext, directory: string, state: SchedulerState): Promise<void> {
  let payload: unknown
  let failure: string | undefined
  let jsonMissing = true
  try {
    payload = JSON.parse(readFileSync(join(directory, JOBS_FILE), "utf8"))
    jsonMissing = false
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    jsonMissing = code === "ENOENT"
    failure = jsonMissing ? `no ${JOBS_FILE}` : `${JOBS_FILE}: ${error instanceof Error ? error.message : String(error)}`
  }

  // Loaded independently and unconditionally: a broken .md file must not cost a project its
  // JSON jobs, and a missing YAML reader must not cost it its schedules.json either.
  const markdown = await loadMarkdownJobs(join(directory, TASKS_DIR))

  if (payload === undefined && markdown.jobs.length === 0 && markdown.invalid.length === 0) {
    // Nothing loaded at all: retain the last-known-good set and report only the reason.
    // Tearing down running jobs because a file was deleted mid-edit would be worse than the
    // bug it reports.
    state.fileError = failure
    return
  }

  const loaded = mergeJobSources(payload === undefined ? { jobs: [], invalid: [] } : loadJobs(payload), markdown)
  const specs = new Map<string, CronSpec>()
  for (const job of loaded.jobs) {
    // validateJob already parsed this successfully; a failure here would be a bug, and
    // dropping the job is safer than arming the loop with an unparsed schedule.
    try {
      specs.set(job.id, parseCron(job.schedule))
    } catch {
      /* unreachable: validateJob rejects exactly what parseCron rejects */
    }
  }

  // A *read* failure is reported when the file exists and is broken even if markdown jobs are
  // carrying the schedule — silently ignoring a corrupt schedules.json is how a user spends an
  // afternoon wondering why their edit did nothing. A merely *absent* one stays quiet as long
  // as something else defines a job, which is the whole point of the union.
  const readProblem = failure !== undefined && (!jsonMissing || loaded.jobs.length === 0) ? failure : undefined
  const problems = [...(loaded.error !== undefined ? [loaded.error] : []), ...(readProblem !== undefined ? [readProblem] : [])]

  state.jobs = loaded.jobs
  state.specs = specs
  state.invalid = loaded.invalid
  state.fileError = problems.length > 0 ? [...new Set(problems)].join("; ") : undefined
}
/** Resolve (creating on first use) the persistent session a job runs in. */
/**
 * The session a job's next run should use.
 *
 * `fresh` creates a new session every call and never caches one; `reuse` caches the job's
 * first session so runs accumulate context. A `fresh` job therefore leaves nothing behind in
 * the session map.
 */
async function sessionFor(ctx: PluginContext, state: SchedulerState, job: JobDefinition): Promise<string | undefined> {
  if (job.session !== "fresh") {
    const existing = state.sessions.get(job.id)
    if (existing !== undefined) return existing
  }
  if (typeof ctx.session?.create !== "function") {
    logOnce("no-session-create", "ctx.session.create is unavailable; runs cannot be dispatched")
    return undefined
  }
  try {
    const created = await ctx.session.create({ title: `scheduled: ${job.id}` })
    const id = sessionIdOf(created)
    if (id === undefined) return undefined
    if (job.session !== "fresh") state.sessions.set(job.id, id)
    return id
  } catch (error) {
    logOnce(`session-create-${job.id}`, `session create failed (${error instanceof Error ? error.message : String(error)})`)
    return undefined
  }
}

async function loadStates(ctx: PluginContext, state: SchedulerState): Promise<void> {
  for (const job of state.jobs) {
    const stored = await storageGet(ctx, `${STORAGE_PREFIX}${job.id}`)
    state.states[job.id] = normalizeState(stored)
  }
}

/** Reload every job's run history at setup. */
async function loadAllHistory(ctx: PluginContext, state: SchedulerState): Promise<void> {
  for (const job of state.jobs) {
    const key = historyKey("job", job.id)
    state.history.set(key, await loadHistory(ctx, key))
  }
}

async function saveState(ctx: PluginContext, state: SchedulerState, jobId: string): Promise<void> {
  await storageSet(ctx, `${STORAGE_PREFIX}${jobId}`, state.states[jobId])
}

const HISTORY_PREFIX = `${STORAGE_PREFIX}history/`

/**
 * What a run record belongs to. Decides the storage key and which ids the reader knows, and
 * nothing else — the record itself is the same shape for all three.
 */
type HistoryKind = "job" | "oneoff" | "loop"

/**
 * The one place a history key is spelled.
 *
 * A job's key is unchanged (`history/<id>`) because a job id is the id in the reviewed job file
 * and its history is read at setup from `state.jobs`. Ephemeral ids get a **sub-namespace**:
 * they are generated, they outlive nothing, and a job file may legitimately be named `oneoff_x`
 * or `loop_x` (the id pattern allows both), so sharing one flat key space with them is a
 * collision waiting for a coincidence. The load-bearing property is that `JOB_ID_PATTERN`
 * forbids `/`, so `history/oneoff/…` and `history/loop/…` can never be produced by a job id and
 * no job key can be shadowed by an ephemeral one.
 */
function historyKey(kind: HistoryKind, id: string): string {
  return kind === "job" ? `${HISTORY_PREFIX}${id}` : `${HISTORY_PREFIX}${kind}/${id}`
}

/** Whether a key is one of this plugin's ephemeral history keys, and so safe to delete. */
function isEphemeralHistoryKey(key: string): boolean {
  return key.startsWith(`${HISTORY_PREFIX}oneoff/`) || key.startsWith(`${HISTORY_PREFIX}loop/`)
}

/** An id this plugin generated, as opposed to one a job file declares. */
function isEphemeralId(id: string): boolean {
  return /^oneoff_/.test(id) || /^loop_/.test(id)
}

/**
 * How many *ephemeral* history keys are retained at once.
 *
 * A job's history is bounded by its own ring. A one-off's is not, because the number of one-offs
 * is not: each one mints a key, and nothing ever removed it. This caps the keys instead — a
 * project that has run a thousand one-offs keeps the last fifty runs' records and nothing older.
 */
export const MAX_EPHEMERAL_HISTORY_KEYS = 50

/**
 * The index of ephemeral history keys this plugin minted, oldest-last.
 *
 * The key set cannot be counted any other way that works on every host: `scan` is optional (and
 * absent wherever the plugin storage surface predates it), whereas `get`/`set` are always here.
 * So the plugin keeps its own list, and every eviction decision is made from it.
 */
type EphemeralHistoryKey = { key: string; at: number }

const EPHEMERAL_INDEX_KEY = `${HISTORY_PREFIX}ephemeral`

/**
 * Note that `key` holds ephemeral history, and drop the oldest entries past the cap.
 *
 * Removal happens *before* the index is rewritten: a crash between the two leaves the index
 * still naming a key that exists, so the next write evicts it again. The other order would
 * forget a key that was never deleted, and a forgotten key is leaked for good.
 *
 * The index is trusted only as far as `isEphemeralHistoryKeyRecord` accepted it, which is where
 * the "never delete a job's history" rule is enforced: an entry naming anything outside this
 * plugin's ephemeral namespace is not read at all, so it can never reach the deletion below.
 * (Checked in the filter rather than again at the deletion, because a second check there is
 * unreachable — a mutation that removed it caught nothing, and unreachable defence is worse than
 * none: it reads as protection that is not there.)
 *
 * This process's own list is unioned with the persisted one rather than replacing it, so a key
 * minted by an earlier process still counts against the cap after a restart — and, on a host with
 * no storage, the in-memory union is the whole index. That is why eviction drops the *ring* and
 * not just the index entry: where nothing is persisted, the ring is the retained history, and
 * forgetting to delete it would leave the cap counting nothing at all.
 */
async function retainEphemeralHistoryKey(ctx: PluginContext, state: SchedulerState, key: string): Promise<void> {
  if (!isEphemeralHistoryKey(key)) return
  const stored = await storageGet(ctx, EPHEMERAL_INDEX_KEY)
  const persisted: EphemeralHistoryKey[] = Array.isArray(stored) ? stored.filter(isEphemeralHistoryKeyRecord) : []
  // This process's stamps first, and the persisted ones only for keys it does not have. A key in
  // both halves is one key: read twice it would occupy two slots and evict a younger one early,
  // which is what a storage write that silently failed mid-session would otherwise arrange.
  const stamps = new Map(state.ephemeralKeys)
  for (const entry of persisted) {
    if (!stamps.has(entry.key)) stamps.set(entry.key, entry.at)
  }
  const known = [...stamps].map(([key, at]) => ({ key, at }))
  // Re-recorded rather than appended, so a loop that keeps posting stays at the young end and an
  // active loop is never evicted in favour of a one-off that ran once, months ago. Ordered by
  // the stamp rather than by position, so a hand-edited index is read by its timestamps and not
  // by whatever order it happened to be written in.
  const next = [...known.filter((entry) => entry.key !== key), { key, at: Date.now() }].sort(
    (a, b) => a.at - b.at,
  )
  const evicted = next.slice(0, Math.max(0, next.length - MAX_EPHEMERAL_HISTORY_KEYS))
  const kept = next.slice(Math.max(0, next.length - MAX_EPHEMERAL_HISTORY_KEYS))
  for (const entry of evicted) {
    // Safe to delete without re-checking the namespace: every entry above came out of
    // `isEphemeralHistoryKeyRecord`, which is what refuses anything outside it.
    await storageRemove(ctx, entry.key)
    state.history.delete(entry.key)
  }
  state.ephemeralKeys = new Map(kept.map((entry) => [entry.key, entry.at]))
  await storageSet(ctx, EPHEMERAL_INDEX_KEY, kept)
}

function isEphemeralHistoryKeyRecord(value: unknown): value is EphemeralHistoryKey {
  if (value === null || typeof value !== "object") return false
  const record = value as Record<string, unknown>
  return typeof record.key === "string" && isEphemeralHistoryKey(record.key) && typeof record.at === "number"
}

/** Read one run history, tolerating absent or corrupt storage (spec 002 § Persistence). */
async function loadHistory(ctx: PluginContext, key: string): Promise<HistoryEntry[]> {
  const stored = await storageGet(ctx, key)
  if (!Array.isArray(stored)) return []
  const entries: HistoryEntry[] = []
  for (const raw of stored) {
    if (raw === null || typeof raw !== "object") continue
    const record = raw as Record<string, unknown>
    if (typeof record.dueAt !== "number" || typeof record.startedAt !== "number") continue
    if (!isRunStatus(record.outcome) || typeof record.model !== "string") continue
    // Clipped, not just re-validated: a record can be *shape-valid* and still carry a megabyte
    // of error text, and the clip that exists on the write side cannot help a record that
    // arrived from outside. Bounded on read as well as on write, as the comment claims.
    const sessionID = asString(record.sessionID)
    const error = asString(record.error)
    const asksAsDeny = clipAsks(record.asksAsDeny)
    // The truncated remainder survives the round-trip, or "reported in the run record" is a promise
    // about a field that exists only between the write and the next restart.
    const truncation = truncationFields(record.dropped, record.droppedCapped)
    entries.push({
      dueAt: record.dueAt,
      startedAt: record.startedAt,
      outcome: record.outcome,
      model: clip(record.model, HISTORY_LABEL_MAX),
      ...(sessionID !== undefined ? { sessionID: clip(sessionID, HISTORY_LABEL_MAX) } : {}),
      // `inMemoryOnly` is deliberately *not* rebuilt here, unlike the truncation fields beside it:
      // the stamp is only ever applied when the host had no storage to write to, so a record that
      // arrived from storage was written by a host that *had* storage — and honouring a stored
      // `inMemoryOnly` would report a persisted record as lost. Since every other field here is
      // rebuilt rather than passed through, dropping it is also the answer to a hand-edited
      // record claiming it.
      ...(asksAsDeny !== undefined ? { asksAsDeny } : {}),
      ...truncation,
      ...(error !== undefined ? { error: clip(error, HISTORY_ERROR_MAX) } : {}),
    })
  }
  return entries.slice(-MAX_HISTORY_LIMIT)
}

async function saveHistory(ctx: PluginContext, state: SchedulerState, key: string): Promise<void> {
  await storageSet(ctx, key, state.history.get(key) ?? [])
}

/**
 * Record one run against the right history, and keep the ephemeral key space bounded.
 *
 * Every run of every kind goes through here, so "which key did this land in", "is that key still
 * retained" and "can this record be read back after a restart" are one decision rather than three
 * that can disagree — which is exactly how the one-off's history ended up written somewhere
 * nothing could read it.
 */
async function recordRun(
  ctx: PluginContext,
  state: SchedulerState,
  kind: HistoryKind,
  id: string,
  entry: HistoryEntry,
): Promise<void> {
  // Stamped here, on the write side, because this is the last point where the host's storage
  // surface is still a fact rather than an assumption. What follows — `saveHistory` — can only
  // fail *silently* by feature-detecting its way past a missing `set`, and a record that outlives
  // nothing must say so on itself rather than leaving the reader to infer it from a log line.
  const recorded: HistoryEntry = state.storageAvailable ? entry : { ...entry, inMemoryOnly: true }
  const key = historyKey(kind, id)
  state.history.set(key, pushHistory(state.history.get(key) ?? [], recorded))
  await saveHistory(ctx, state, key)
  if (kind !== "job") await retainEphemeralHistoryKey(ctx, state, key)
}

/** What an id turned out to be, and the runs recorded against it. */
type HistoryOwner = { kind: HistoryKind; session?: string; runs: HistoryEntry[] }

/**
 * Which history an id belongs to, and whether this plugin can still answer for it.
 *
 * The lookup is deliberately wider than `state.jobs`. A one-off is consumed the moment it runs
 * and a loop is scoped to a session, so neither is in any live list by the time anyone asks what
 * it did — which is why history was written and never read. So the answer comes from this
 * process's own rings first and from storage second, namespaced per kind, and a flat pre-fix key
 * is migrated on the way through so a host that already leaked one gets it reclaimed instead of
 * inheriting the leak.
 *
 * **Memory first, storage second, and both are needed.** Storage is what survives a restart and
 * the only copy once this process is gone; the rings are what a run that happened *just now* left
 * behind, and on a host with no storage they are the only copy there will ever be. Storage alone
 * — the shape this function had after the namespacing fix — turned a one-off that demonstrably ran
 * into `no job with id`, which is the symptom the previous item existed to eliminate.
 */
async function resolveHistoryOwner(ctx: PluginContext, state: SchedulerState, id: string): Promise<HistoryOwner | undefined> {
  const job = state.jobs.find((entry) => entry.id === id)
  if (job !== undefined) {
    return { kind: "job", session: job.session, runs: state.history.get(historyKey("job", id)) ?? [] }
  }
  const pending = state.oneOffs.find((task) => task.id === id)
  if (pending !== undefined) {
    // Pending, so nothing has run yet — a real answer, and not the same answer as "no such id".
    return { kind: "oneoff", runs: state.history.get(historyKey("oneoff", id)) ?? [] }
  }
  if (state.dispatching.has(id)) {
    // Running right now: the id is real and its outcome is not written yet, which is a
    // different answer from an unknown id and from a finished run.
    return { kind: "oneoff", runs: state.history.get(historyKey("oneoff", id)) ?? [] }
  }
  for (const [sessionID, loops] of state.loops) {
    const loop = loops.find((entry) => entry.id === id)
    if (loop === undefined) continue
    return { kind: "loop", session: sessionID, runs: state.history.get(historyKey("loop", id)) ?? [] }
  }

  // Gone from every live list, which is the normal state of a finished one-off.
  for (const kind of ["oneoff", "loop"] as const) {
    const key = historyKey(kind, id)
    const runs = state.history.get(key) ?? []
    if (runs.length > 0) return { kind, runs }
    const stored = await loadHistory(ctx, key)
    if (stored.length > 0) return { kind, runs: stored }
  }
  if (!isEphemeralId(id)) return undefined
  // A pre-fix build wrote ephemeral history flat, under the id itself, and never removed it.
  // Adopt it: copy it to the namespaced key so this and every later read agree, then delete the
  // leaked key — which is the one thing `storage.remove` can now be relied on to do.
  const legacy = historyKey("job", id)
  const runs = await loadHistory(ctx, legacy)
  if (runs.length === 0) return undefined
  await storageSet(ctx, historyKey("oneoff", id), runs)
  await storageRemove(ctx, legacy)
  await retainEphemeralHistoryKey(ctx, state, historyKey("oneoff", id))
  return { kind: "oneoff", runs }
}

/**
 * Dispatch a one-off: same target-application (agent, model, permissions) and the same
 * bounded run record as a recurring job, but no cron and no job-file entry.
 *
 * Reuses `applyJobTarget` deliberately — a one-off gets the same permission discipline as a
 * scheduled job, so it cannot become a loophole.
 *
 * **Every exit records**, through the one `record` closure below rather than through the catch
 * alone. The early returns used to leave no trace at all: a host without `session.prompt`, a host
 * without `session.create`, and a `create` that resolved no usable id were each `return
 * "failed"` above the `try`, so the outcome went back to the tick, and the tick recorded only
 * an `"ok"`. A one-off could consume its occurrence and leave nothing behind — the scheduler log
 * said it ran, and no record said what happened to it.
 */
async function runOneOff(ctx: PluginContext, state: SchedulerState, task: OneOffTask): Promise<void> {
  // Dispatch instant, taken before anything is awaited: a run that times out genuinely began
  // before it finished, so a completion stamp records the bound rather than the run.
  const startedAt = Date.now()
  let model = "unknown"
  let asksAsDeny: string[] = []
  let sessionID: string | undefined
  const record = (outcome: RunStatus, error?: string): Promise<void> =>
    recordRun(ctx, state, "oneoff", task.id, {
      dueAt: task.dueAt,
      startedAt,
      outcome,
      model,
      ...(sessionID !== undefined ? { sessionID } : {}),
      ...(asksAsDeny.length === 0 ? {} : { asksAsDeny }),
      ...(error !== undefined ? { error } : {}),
    })

  if (typeof ctx.session?.create !== "function") {
    logOnce("no-session-create", "ctx.session.create is unavailable; one-offs cannot be dispatched")
    await record("failed", "ctx.session.create is unavailable")
    return
  }
  if (typeof ctx.session?.prompt !== "function") {
    logOnce("no-prompt", "ctx.session.prompt is unavailable; one-offs cannot be dispatched")
    await record("failed", "ctx.session.prompt is unavailable")
    return
  }
  // Bound to a local, because the narrowing above does not survive into the closure below.
  const prompt = ctx.session.prompt
  try {
    const created = await ctx.session.create({ title: `scheduled: ${task.id}` })
    sessionID = sessionIdOf(created)
    if (sessionID === undefined) {
      await record("failed", "ctx.session.create resolved a session with no id")
      return
    }
    const target = await applyJobTarget(ctx, task, sessionID)
    model = target.model
    asksAsDeny = target.asksAsDeny
    logLine(
      `running one-off ${task.id} (due ${new Date(task.dueAt).toISOString()}, model ${model}, runTimeout ${runTimeoutLabel(task.runTimeoutMs)}${asksClause(asksAsDeny)})`,
    )
    // Bounded by the same `boundRun` a recurring job run uses, and for the same reason: a
    // one-off carries a `runTimeoutMs` that was parsed and clamped like a job's, and a bound that
    // does not bind is worse than none.
    const bounded = await boundRun(ctx, sessionID, task.runTimeoutMs, () =>
      prompt({ sessionID: sessionID as string, text: task.prompt, delivery: "queue" }),
    )
    if (bounded.outcome === "timeout") {
      const reason = timeoutReason(task.runTimeoutMs, bounded.stopped)
      logLine(`one-off ${task.id} timed out: ${reason}`)
      await record("timeout", reason)
      return
    }
    // The *resolved* model, not the requested one: `applyJobTarget` is what answered "this is
    // what will be billed", and the record has to agree with the `running` line above it.
    await record("ok")
  } catch (error) {
    const message = clip(error instanceof Error ? error.message : String(error), HISTORY_ERROR_MAX)
    logLine(`one-off ${task.id} failed: ${message}`)
    await record("failed", message)
  }
}

/**
 * Record one loop post against the bounded run history, exactly as a job run and a one-off
 * are recorded: due instant, start, outcome, resolved model, bounded error.
 *
 * A loop used to be invisible here — it posted and nothing said so. Every run is billable,
 * and a loop is a *recurring* billable run into a live session, so "what did this loop do
 * last" has to have the same answer "what did this job do last" does.
 */
async function recordLoopRun(
  ctx: PluginContext,
  state: SchedulerState,
  loop: SessionLoop,
  sessionID: string,
  dueAt: number,
  outcome: RunStatus,
  model: string,
  error?: string,
): Promise<void> {
  await recordRun(ctx, state, "loop", loop.id, {
    dueAt,
    startedAt: Date.now(),
    outcome,
    model,
    sessionID,
    ...(error !== undefined ? { error } : {}),
  })
}

/**
 * Post one due loop into the session that owns it.
 *
 * Goes through `applyJobTarget` for the same reason a one-off does: an ephemeral path that
 * skips the target path is a loophole. What that means *here* is narrower than for a job,
 * and deliberately so — a loop posts into the **live session a human is using**, so it must
 * not switch that session's model or agent and must not replace its permission rules.
 * `SessionLoop` carries no `agent`, `model` or `permissions`, so the shared call applies
 * nothing and only *resolves and reports* what the session will spend. When the two paths
 * ever diverge, this is the one place that would have to change — which is the point of
 * sharing it rather than open-coding a `prompt` call here.
 *
 * Never throws out of here (invariant 3): the failure is recorded and the loop lives on.
 */
async function postLoop(
  ctx: PluginContext,
  state: SchedulerState,
  loop: SessionLoop,
  sessionID: string,
  dueAt: number,
): Promise<void> {
  if (typeof ctx.session?.prompt !== "function") {
    logOnce("no-prompt", "ctx.session.prompt is unavailable; session loops cannot post")
    await recordLoopRun(ctx, state, loop, sessionID, dueAt, "failed", "unknown", "ctx.session.prompt is unavailable")
    return
  }
  // Bound to a local, because the narrowing above does not survive into the closure below.
  const prompt = ctx.session.prompt

  let outcome: RunStatus = "failed"
  let model = "unknown"
  try {
    // A loop carries no `permissions`, so `asksAsDeny` is always empty here — and that is the
    // point of routing through the shared call rather than around it: a loop cannot post into
    // its own session with rules nobody declared, and the record shows it carried none.
    model = (await applyJobTarget(ctx, loop, sessionID)).model
    logLine(
      `loop ${loop.id} posting into its own session (every ${Math.round(loop.intervalMs / MINUTE_MS)}m, model ${model})`,
    )
    // Bounded by the same `boundRun` a recurring job run uses, and this one matters most: a loop
    // posts into the session a human is sitting in, so a post that never returns holds a slot
    // that the whole tick shares (`claimed`) and keeps a live session busy. `SessionLoop` carries
    // no `runTimeout` — it is configured by `every`, which is a cadence and not a bound — so the
    // default run bound is used rather than inventing a field the tool does not expose.
    //
    // Interrupting is still the right call here: the turn being interrupted *is* the loop's own
    // queued prompt, and leaving it running is what a bound exists to prevent.
    const bounded = await boundRun(ctx, sessionID, DEFAULT_RUN_TIMEOUT_MS, () =>
      // Queue, so a loop cannot interleave with a human typing into the same session.
      prompt({ sessionID, text: loop.prompt, delivery: "queue" }),
    )
    if (bounded.outcome === "timeout") {
      const reason = timeoutReason(DEFAULT_RUN_TIMEOUT_MS, bounded.stopped)
      logLine(`loop ${loop.id} timed out: ${reason}`)
      await recordLoopRun(ctx, state, loop, sessionID, dueAt, "timeout", model, reason)
      return
    }
    outcome = "ok"
  } catch (error) {
    const message = clip(error instanceof Error ? error.message : String(error), 300)
    logLine(`loop ${loop.id} failed: ${message}`)
    await recordLoopRun(ctx, state, loop, sessionID, dueAt, "failed", model, message)
    return
  }
  await recordLoopRun(ctx, state, loop, sessionID, dueAt, outcome, model)
}

/**
 * A loop's lifetime as a short, honest label for the log.
 *
 * The expiry line used to say "expired after 3 days" whatever `ttl` the caller asked for,
 * which is only true when they did not ask for one. The actual granted lifetime is the
 * difference between `expiresAt` and `createdAt`, so that is what is stated.
 */
function loopLifetime(loop: SessionLoop): string {
  const ms = Math.max(0, loop.expiresAt - loop.createdAt)
  // Largest whole unit that fits, so the line reads like the `ttl` the caller wrote.
  if (ms >= 24 * 60 * MINUTE_MS) return `${Math.round(ms / (24 * 60 * MINUTE_MS))}d`
  if (ms >= 60 * MINUTE_MS) return `${Math.round(ms / (60 * MINUTE_MS))}h`
  if (ms >= MINUTE_MS) return `${Math.round(ms / MINUTE_MS)}m`
  return `${Math.round(ms / 1000)}s`
}

/**
 * The part of a task that decides *how* it is dispatched.
 *
 * Structural rather than `JobDefinition`, so a one-off and a recurring job share this path
 * without either being cast into the other.
 */
type DispatchTarget = {
  id: string
  agent?: string
  model?: ModelRef
  permissions?: PermissionSet
}

/** What `applyJobTarget` resolved, for the caller to report and to record. */
type AppliedTarget = {
  /**
   * The model this run will be billed on. A task that names no model **inherits the session
   * default**, which for an unattended recurring job is usually a paid model — which is why this
   * is echoed in the `running` line: the log is where you see which model is being billed.
   */
  model: string
  /**
   * The `"ask"` rules this run turns into denies; empty when the task declares none.
   *
   * An `ask` in an unattended run has nobody to answer it, so it **is** a deny — reported rather
   * than left to time out, and the warnings come from opencode-tasks (ADR 0007). Returned rather
   * than logged here because the caller owns the line that reports it and the record that keeps
   * it, and one fact reported in one place cannot describe two different runs.
   */
  asksAsDeny: string[]
}

/**
 * Point the target session at the task's agent, model and permissions before dispatching, and
 * report what that resolved to.
 *
 * Both returned facts are the caller's to state: the resolved model in the run line and the run
 * record, the ask list in both. A task that declares no permissions — every loop — gets an empty
 * list rather than a special case here.
 */
async function applyJobTarget(ctx: PluginContext, job: DispatchTarget, sessionID: string): Promise<AppliedTarget> {
  if (job.agent !== undefined && typeof ctx.session?.switchAgent === "function") {
    await ctx.session.switchAgent({ sessionID, agent: job.agent })
  }
  if (job.model !== undefined) {
    if (typeof ctx.session?.switchModel === "function") {
      await ctx.session.switchModel({ sessionID, model: job.model })
    } else {
      logOnce("no-switch-model", "ctx.session.switchModel is unavailable; the job runs on the session default")
    }
  }

  // Permission rules are applied AFTER agent/model and BEFORE the prompt is admitted, so a
  // scheduled run is already constrained when its turn starts. Re-applied every run rather
  // than assumed to persist, because `rules` replaces session state (ADR 0005).
  const asksAsDeny = job.permissions === undefined ? [] : collectAsks(job.permissions)
  if (job.permissions !== undefined) {
    if (typeof ctx.permission?.rules === "function") {
      await ctx.permission.rules({ sessionID, permissions: [job.permissions] })
    } else {
      logOnce("no-permission-rules", "ctx.permission.rules is unavailable; the job runs with session defaults")
    }
  }

  return {
    model: job.model === undefined ? "session default" : `${job.model.providerID}/${job.model.id}`,
    asksAsDeny,
  }
}

/**
 * How a dispatch line states the asks it turns into denies, or nothing at all when there are
 * none.
 *
 * Folded into the line the run already logs rather than emitted beside it: one line per dispatch,
 * so the log and the record it is written from cannot describe different runs.
 */
function asksClause(asksAsDeny: readonly string[]): string {
  return asksAsDeny.length === 0 ? "" : `, asks as deny: ${asksAsDeny.join(", ")}`
}

/**
 * The configured run bound, as a log line and a run record state it.
 *
 * Minutes when it is whole minutes, because that is how `runTimeout` is written in a job file
 * (`5m`), and the record has to be comparable with the configuration that produced it.
 */
function runTimeoutLabel(ms: number): string {
  return ms % MINUTE_MS === 0 ? `${Math.round(ms / MINUTE_MS)}m` : `${Math.round(ms / 1000)}s`
}

/**
 * What a bounded dispatch produced: it settled — carrying the value `dispatch` resolved with — or
 * it blew the bound.
 *
 * `value` is what makes a bounded dispatch usable by a caller that needs the dispatch's own result
 * (`schedules_run` returns the admitted inbox id). Discarding it would force such a caller to
 * capture the value out of band, which is how a bounded run and the value it produced come to
 * disagree. It is absent on the timeout path because there is no such value: the dispatch is
 * abandoned, not completed.
 */
type BoundedRun = { outcome: "ok"; value: unknown } | { outcome: "timeout"; stopped: boolean }

/**
 * Await one dispatch for at most `timeoutMs`, and stop the session if it overruns.
 *
 * This is the whole enforcement of `runTimeoutMs`. It used to be a bare `await ctx.session.prompt`
 * — unbounded, with no `Promise.race`, no `AbortController` and no timer anywhere in the file —
 * so a prompt that triggered a permission request nobody would ever answer hung for the life of
 * the process, kept its `maxConcurrentRuns` slot, and let the whole scheduler stall behind it.
 *
 * A rejection from `dispatch` propagates to the caller's own handler, so an ordinary failure is
 * still recorded as `failed` with its message; only the *timeout* path is new, and it reports
 * `stopped` honestly rather than claiming the run was ended when it may not have been.
 *
 * The timer is cleared on every path. Leaving it armed is the worst available failure: it would
 * fire during whatever the session does next and interrupt an unrelated turn, possibly a human's.
 */
async function boundRun(
  ctx: PluginContext,
  sessionID: string,
  timeoutMs: number,
  dispatch: () => Promise<unknown>,
): Promise<BoundedRun> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const expiry = new Promise<{ kind: "expired" }>((resolve) => {
    timer = setTimeout(() => resolve({ kind: "expired" }), timeoutMs)
    // Never hold the process open just to notice that a run overran.
    timer.unref?.()
  })
  // Deferred through a microtask so a synchronous throw from `dispatch` becomes a rejection
  // inside the `try`, where the `finally` can still clear the timer. `Promise.race` attaches a
  // handler to both sides, so a dispatch abandoned by the timeout that rejects later is handled
  // too — no unhandled rejection escapes the abandoned promise.
  //
  // The settled value is carried through rather than dropped: a caller that reports what the
  // dispatch admitted needs it, and it is only knowable here.
  const work = Promise.resolve()
    .then(dispatch)
    .then((value) => ({ kind: "settled" as const, value }))
  let raced: { kind: "settled"; value: unknown } | { kind: "expired" }
  try {
    raced = await Promise.race([work, expiry])
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
  if (raced.kind === "settled") return { outcome: "ok", value: raced.value }
  return { outcome: "timeout", stopped: await stopRun(ctx, sessionID) }
}

/**
 * Stop a session that blew its run bound, if this host offers any way to.
 *
 * **Feature-detected, and the detection is the point.** `ctx.session.interrupt` is verified
 * present on OpenCode 2.0.22 — probed live inside the host, not read off a type: it is a
 * function, takes `{ sessionID }`, and resolves `{ interrupted: boolean }`, so a `false` is an
 * answer rather than a failure. The surface still varies by version, exactly as
 * `ctx.storage.remove` does, so it is checked before every use rather than assumed.
 *
 * Where it is missing the honest outcome is that the await was **abandoned**, not that the run was
 * stopped: the host may still be working on it. The caller records that distinction, because a
 * record claiming a session was interrupted when nothing interrupted it is the same class of lie
 * as a timeout that does not time out.
 */
async function stopRun(ctx: PluginContext, sessionID: string): Promise<boolean> {
  if (typeof ctx.session?.interrupt !== "function") return false
  try {
    const result = await ctx.session.interrupt({ sessionID })
    const interrupted = (result as { interrupted?: unknown } | null | undefined)?.interrupted
    // Absent or `true` means it did what it was asked; only an explicit `false` is a refusal.
    return interrupted !== false
  } catch {
    // An interrupt that throws stops nothing, so the run counts as abandoned. Reported where the
    // record is written, once, rather than swallowed here.
    return false
  }
}

/**
 * Why a run stopped short, as the history entry states it.
 *
 * Two clauses, because they are different claims and only one of them is true on a host with no
 * cancel primitive. `stopped` means the session was interrupted; not stopped means the scheduler
 * gave up waiting and the host may still be running the turn.
 */
function timeoutReason(timeoutMs: number, stopped: boolean): string {
  return stopped
    ? `exceeded runTimeout ${runTimeoutLabel(timeoutMs)}; the session was interrupted`
    : `exceeded runTimeout ${runTimeoutLabel(timeoutMs)}; abandoned — ctx.session.interrupt is unavailable, so the host may still be running it`
}

/**
 * Run one job: admit the prompt, bound it by `runTimeoutMs`, record the outcome.
 *
 * A run never throws out of here: every failure is recorded on the job's state, which is
 * what keeps invariant 3 (never breaks a session) true for the scheduling path too.
 *
 * The whole occurrence is passed rather than its `dueAt`, because what the record also needs is what
 * the occurrence's backlog did **not** run — the truncated remainder, which is the one part of the
 * misfire policy that belongs in the record and nowhere else (ADR 0002).
 */
async function runJob(
  ctx: PluginContext,
  state: SchedulerState,
  job: JobDefinition,
  occurrence: Occurrence,
): Promise<void> {
  const now = Date.now()
  const record = jobState(state, job.id)

  // The lease is renewed for as long as this run is legitimately in flight, from run liveness and
  // not from the tick heartbeat — see `isRunOutstanding` for why the two must not be conflated.
  // Half the bound, so the lease always outlasts the run's remaining life; and the bound below is
  // the only thing that can end the run, so there is nothing here for a renewal to paper over.
  const releaseLease = openRunLease(record, job.runTimeoutMs)

  // Collected in the `finally` so a thrown run still lands in the history.
  let outcome: RunStatus = "failed"
  let model = "unknown"
  let asksAsDeny: string[] = []
  let sessionID: string | undefined

  try {
    if (typeof ctx.session?.prompt !== "function") {
      logOnce("no-prompt", "ctx.session.prompt is unavailable; the scheduler is inert")
      record.lastError = "ctx.session.prompt is unavailable"
      return
    }
    // Bound to a local, because the narrowing above does not survive into the closure below.
    const prompt = ctx.session.prompt
    sessionID = await sessionFor(ctx, state, job)
    if (sessionID === undefined) {
      record.lastStatus = "failed"
      record.lastError = "no session available for this job"
      return
    }
    const target = await applyJobTarget(ctx, job, sessionID)
    model = target.model
    asksAsDeny = target.asksAsDeny

    logLine(
      `running ${job.id} (schedule "${job.schedule}" ${job.timezone}, model ${model}, session ${job.session}, runTimeout ${runTimeoutLabel(job.runTimeoutMs)}${asksClause(asksAsDeny)})`,
    )

    // `prompt` admits the turn; what bounds the run is the timer in `boundRun`, which is the only
    // enforcement `runTimeoutMs` ever had. It interrupts the session when this host offers a way
    // to and abandons the wait when it does not — and it says which, in the record.
    const bounded = await boundRun(ctx, sessionID, job.runTimeoutMs, () =>
      prompt({
        sessionID,
        text: job.prompt,
        // Queue, so a run cannot interleave with a human typing into the same session.
        delivery: "queue",
      }),
    )
    if (bounded.outcome === "timeout") {
      outcome = "timeout"
      record.lastStatus = "timeout"
      record.lastError = timeoutReason(job.runTimeoutMs, bounded.stopped)
      logLine(`job ${job.id} timed out: ${record.lastError}`)
      return
    }
    outcome = "ok"
    record.lastStatus = "ok"
    record.lastError = undefined
  } catch (error) {
    record.lastStatus = "failed"
    record.lastError = clip(error instanceof Error ? error.message : String(error), 500)
    logLine(`job ${job.id} failed: ${record.lastError}`)
  } finally {
    // Renewal first, then the lease itself: from here the run is over, so a lease that outlived
    // it would suppress the next occurrence of a job that is no longer running.
    releaseLease()
    await recordRun(ctx, state, "job", job.id, {
      dueAt: occurrence.dueAt,
      startedAt: now,
      outcome,
      model,
      ...(sessionID !== undefined ? { sessionID } : {}),
      ...(asksAsDeny.length === 0 ? {} : { asksAsDeny }),
      // The remainder, on **every** record of a truncated backlog, not only the first: each of these
      // records is an occurrence of a backlog that was cut short, and a reader holding any one of
      // them is owed the fact. Absent when the backlog had no remainder — see `HistoryEntry`.
      ...truncationFields(occurrence.dropped, occurrence.droppedCapped),
      ...(record.lastError !== undefined ? { error: record.lastError } : {}),
    })
    await saveState(ctx, state, job.id)
  }
}

/**
 * Hand the event loop back for exactly one turn.
 *
 * The job loop below is the only place in this file that can spend seconds of straight-line CPU.
 * One job's `MAX_BACKLOG_SCAN` walk is ~31 ms on its own (7014 timezone lookups), and at
 * `DEFAULT_MAX_JOBS` (100 jobs, each owing a capped backlog — which needs ≥17 h asleep) a hundred
 * of them run back to back. Measured on this file (2026-10-03, 24 h backlog, `* * * * *`, UTC, the
 * real `tick` driven through `setup`): **601 800 lookups, and a 2.45 s stretch in which no timer
 * and no I/O callback ran at all** — `setImmediate` and `setTimeout(0)` markers queued during the
 * walk both fired only after the last job had been evaluated.
 *
 * Re-measured after `bug-next-occurrence-walks-utc-wall-parts-in-any-zone-west-of-utc`, same
 * scenario: **702 100 lookups over ~2.97 s**, because a matching search now costs seven lookups
 * rather than six — the walk reads `afterMs` in the job's own zone before walking that zone's
 * clock. The bound the turn buys is unchanged and is the thing to check: the **longest stretch with
 * no callback at all is ~48 ms**, one job's walk plus the loop's own per-job overhead, and the next
 * four are 40/38/36/34 ms. Still no run anywhere near the 2.45 s, and still no run that grows with
 * the number of jobs behind it.
 *
 * That gap is the whole difference between *busy* and *blocked*. The loop already interleaves
 * microtasks — the skip path awaits a storage write — and microtasks do not end a turn, so nothing
 * else in the host process gets to run for the length of the walk. This plugin runs inside the
 * user's editor session, so an unbounded straight-line run here is invariant 3 failing outright,
 * not a slow schedule.
 *
 * **A macrotask turn, and nothing weaker.** A microtask at this point would restore nothing, which
 * is the measurement above rather than an assumption about it. `setImmediate` rather than
 * `setTimeout(0)`: it is the check phase, so it costs one loop iteration with no timer clamping,
 * and it cannot be queued behind another timer that has not expired.
 *
 * **Paid only where the walk was**, at the call site. The caller decides; this is just the turn.
 * The bound it buys is a statement about **work**, not about a machine's clock: no blocking run is
 * longer than one job's bounded walk, whatever the number of jobs behind it.
 */
function yieldToEventLoop(): Promise<void> {
  return new Promise<void>((resolve) => {
    setImmediate(resolve)
  })
}

/** Evaluate every enabled job once. Re-entrancy is guarded by the caller. */
async function tick(ctx: PluginContext, state: SchedulerState, lease: Lease, maxConcurrent: number): Promise<void> {
  lease.heartbeat()

  const now = Date.now()
  const decisions: Array<Extract<TickDecision, { kind: "run" }>> = []

  /**
   * Occurrences walked since this tick last handed the event loop back.
   *
   * The bound is `MAX_BACKLOG_SCAN` because that is the unit of the work being bounded: one job's
   * walk cannot exceed it, so a turn taken whenever the meter reaches it means **no blocking run is
   * longer than one job's walk**, whatever the job count behind it. It is a count and not a clock
   * so that the bound is the same on a fast machine and a slow one.
   */
  let walkedSinceTurn = 0

  for (const job of state.jobs) {
    if (!job.enabled) continue
    const spec = state.specs.get(job.id)
    if (spec === undefined) continue

    // **Hand the loop back before the walk that would extend the current run.** Checked here, at the
    // top, rather than after the decision below: the turn then separates walks, so a job that finds
    // a backlog always begins a fresh blocking run and the run it begins is exactly one walk. The
    // cost is a turn only on the ticks that would otherwise have blocked — measured at ~1.5 µs,
    // against a tick that spends ~31 ms per capped backlog — so an ordinary tick pays nothing.
    //
    // **What the meter counts is occurrences, not lookups**, and the two stopped being the same
    // price when the walk's frame was fixed: a search now costs seven timezone lookups where it
    // cost six, so one capped walk is ~17 % dearer than it was. `MAX_BACKLOG_SCAN` was left at 1000
    // rather than scaled down — the bound buys *one job's walk* as a block, which is unchanged in
    // kind, and re-measured at ~48 ms as the longest stretch without a callback.
    //
    // Nothing the turn protects is affected by it: `resolveDue` decides **and** mutates the record
    // before the meter is charged, `decisions` keeps the order the loop found, and the shared
    // budget below is seeded from `decisions.length`, which a turn cannot reorder. What the turn
    // *does* change is real and is the point — a run still in flight from an earlier tick may now
    // settle while this loop waits, so `state.inFlight.size` can fall mid-loop. That can only free a
    // slot, never hand one out twice: every admitted decision still costs exactly one.
    if (walkedSinceTurn >= MAX_BACKLOG_SCAN) {
      walkedSinceTurn = 0
      await yieldToEventLoop()
    }

    const record = state.states[job.id] ?? { version: STATE_VERSION }
    state.states[job.id] = record

    // An abandoned lease (crashed run) is cleared so the job can fire again.
    if (record.leaseUntil !== undefined && !isLeaseLive(record, now)) record.leaseUntil = undefined

    const decision = resolveDue(
      job,
      spec,
      record,
      now,
      // `isRunOutstanding` and not the bare lease: a lease that reads expired while its run is
      // provably still going would let a second prompt into a busy session, which is the
      // double-fire ADR 0003 exists to prevent. The clock-independent signal holds it too.
      isRunOutstanding(record, state.inFlight.has(job.id), now),
      state.inFlight.size + decisions.length,
      maxConcurrent,
    )
    // Charge what this decision walked, in **occurrences** rather than in milliseconds — a count
    // the tick already has, so the meter cannot drift from the work and the block it bounds is a
    // statement about work rather than about one machine's clock.
    //
    // `backlogFound` is what makes the charge honest rather than merely cheap: it is true on exactly
    // one decision per backlog — the one that ran the bounded counting walk to find the remainder
    // and put it in the durable plan — and false on every replay off that plan, where the walk is a
    // single search because the number travelled with the plan. So a replay tick is charged nothing,
    // exactly as it spends nothing, and an ordinary tick is charged nothing, exactly as it spends
    // nothing. Charging `dropped` on every decision would have put a turn per job on every replay
    // tick, interrupting work that was never there.
    if (decision?.occurrence.backlogFound === true) {
      // The instants handed back were searched for before the remainder was counted, so they are
      // part of what the decision cost. That term is what carries one capped walk past the bound on
      // its own, which is why the turn is taken at the *top* of the next iteration rather than here:
      // a single job's walk then never spends a turn interrupting nothing, and the tick it starts is
      // a fresh blocking run.
      walkedSinceTurn += (job.misfire === "backfill" ? job.maxCatchUp : 1) + decision.occurrence.dropped
    }
    if (decision === undefined) continue

    if (decision.kind === "skip") {
      // The truncation rides the **occurrence**, not the suppression, and both are reported in one
      // line because they are one decision: a truncated backlog is not why a run did not happen, it
      // is what the run could not cover, so a line naming only the reason drops half of it.
      // (`backlog-truncated` remains a `Suppression` member and is still read here, so a
      // pre-existing record of one is reported rather than silently un-printed.)
      const reason =
        decision.suppression.reason === "in-flight"
          ? "previous run still in flight"
          : decision.suppression.reason === "concurrency"
            ? `concurrency cap reached (${decision.suppression.running}/${maxConcurrent})`
            : `backlog truncated, ${decision.suppression.dropped} occurrence(s) dropped`
      const truncated = truncationClause(decision.occurrence)
      logLine(`skipping ${job.id}: ${reason}${truncated === "" ? "" : `; ${truncated}`}`)
      await saveState(ctx, state, job.id)
      continue
    }
    // A run's own truncation is reported here rather than inside `runJob`, which knows the outcome
    // and not when the backlog was found. Once per backlog, not once per replay.
    const truncated = truncationClause(decision.occurrence)
    if (decision.occurrence.backlogFound === true && truncated !== "") {
      logLine(`backlog truncated for ${job.id}: ${truncated}`)
    }
    decisions.push(decision)
  }

  // One slot counter for the whole tick, so the three drains below share a single budget:
  // recurring decisions, one-off tasks and loop posts each consume from it. Reading it only in the
  // job loop is what let 3 due loops post in one tick under `maxConcurrentRuns: 1`.
  //
  // Seeded **once**, here, and spent from by all three drains — none of them re-reads the live
  // `state.inFlight.size`. That is what makes the reordering below safe: a drain finds the budget
  // already spent whether or not the run that spent it has settled by the time it looks, so moving
  // a drain earlier cannot hand the same slot out a second time.
  const inFlightBeforeTick = state.inFlight.size
  let claimed = inFlightBeforeTick + decisions.length
  // *Who* spent it, because "the cap is full" is not an answer a person staring at a starved loop
  // can use. Now that one-offs drain first, a refused loop has almost always lost the slot to a
  // **one-off** — and a line naming only the cap would read as though another loop had outranked
  // it, which is the opposite of the rule this tick exists to enforce. The two halves of the seed
  // are named separately: a run still going is not the same claim as an occurrence admitted above
  // and dispatched at the end of this tick.
  let oneOffClaimed = 0
  let loopClaimed = 0
  const budgetSpentBy = (): string => {
    const parts: string[] = []
    if (inFlightBeforeTick > 0) parts.push(`${inFlightBeforeTick} run(s) still in flight`)
    if (decisions.length > 0) parts.push(`${decisions.length} recurring job occurrence(s) decided this tick`)
    if (oneOffClaimed > 0) parts.push(`${oneOffClaimed} one-off task(s) earlier this tick`)
    if (loopClaimed > 0) parts.push(`${loopClaimed} loop post(s) earlier this tick`)
    return parts.join(", ")
  }

  // **One-offs drain before loops** — specific beats recurring. Coordinator decision, recorded on
  // `task-tick-drain-order-oneoffs-before-loops`; it is settled and not re-opened per tick.
  //
  // The two ephemeral kinds lose the slot to each other very differently. A loop is an indefinite,
  // repeating request: it is owed another occurrence a minute later anyway, so a due loop that
  // finds no free slot loses one turn and keeps its loop. A one-off that finds no slot is *spent
  // and recorded as `skipped`* — permanently, by design, which is what keeps the backlog bounded —
  // so a user who asked for a specific task at a specific time would lose it to a recurring
  // request, silently. The loop is the cheap thing to disappoint; the one-off is not.
  //
  // ADR 0006 points the same way: recurring *jobs* stay file-only and ephemeral work is the
  // exception to file-only, so within the ephemeral drains the least-repeating intent — the
  // user-stated instant — should win the scarce slot.
  //
  // Recurring *jobs* still decide first, above, unchanged: a job is a standing cron instruction and
  // neither ephemeral drain may starve it. Only the order *between* the two ephemeral kinds moved.
  const due = state.oneOffs.filter((task) => task.dueAt <= now)
  if (due.length > 0) {
    // The same shared budget the loop drain spends from below: a tick that already spent its slots
    // on jobs has none left, and recomputing `state.inFlight.size` here would hand out a second
    // full budget in the same tick. It is this drain's turn to spend first, so `claimed` still
    // holds only the seed the job loop left.
    const free = Math.max(0, maxConcurrent - claimed)
    const admitted = due.slice(0, free)
    const skipped = due.slice(free)
    claimed += admitted.length
    oneOffClaimed += admitted.length

    if (skipped.length > 0) {
      // **Skipped and recorded, never queued** (spec 001 § concurrency, ADR 0002) — the same
      // rule `resolveDue` applies to a recurring occurrence that finds no free slot. Leaving
      // them pending instead re-decided the *same* due instant on every tick, so under a busy
      // scheduler a one-off could be deferred indefinitely while the "skipping N" line
      // repeated once a tick and said nothing about the outcome. Consuming the occurrence here
      // is what makes the backlog bounded; the record is what makes it honest.
      logLine(
        `skipping ${skipped.length} one-off task(s): concurrency cap reached (${maxConcurrent}); recorded as skipped`,
      )
      for (const task of skipped) {
        // `startedAt` is the instant the occurrence was *decided*, not dispatched: there was no
        // dispatch to stamp, and a start that preceded its own skip would describe a run which
        // somehow began after it was skipped.
        await recordRun(ctx, state, "oneoff", task.id, {
          dueAt: task.dueAt,
          startedAt: now,
          outcome: "skipped",
          model: task.model === undefined ? "session default" : `${task.model.providerID}/${task.model.id}`,
          error: `no free run slot: concurrency cap ${maxConcurrent} reached`,
        })
      }
    }

    // Every due one-off leaves the pending list — the ones that ran *and* the ones that were
    // skipped — so a crash cannot replay one forever and a skip cannot be retried into the
    // next tick's backlog.
    const dueIds = new Set(due.map((task) => task.id))
    state.oneOffs = state.oneOffs.filter((task) => !dueIds.has(task.id))
    await saveOneOffs(ctx, state.oneOffs)

    for (const task of admitted) {
      // The run records itself now, on every outcome, so this is a bare dispatch: there is no
      // "ok" case left here to special-case, and none of the other cases can be forgotten.
      state.dispatching.add(task.id)
      void runOneOff(ctx, state, task)
        .catch((error: unknown) => {
          // `runOneOff` records its own failures, so this is only reachable if the recording
          // path itself threw — which must still not take the tick down with it.
          logOnce(`oneoff-${task.id}`, `one-off failed (${error instanceof Error ? error.message : String(error)})`)
        })
        .finally(() => {
          state.dispatching.delete(task.id)
        })
    }
  }

  // Loops fire only into the session that owns them, and never outlive that session. They drain
  // *after* the one-offs above — see the ordering rule recorded there — so a due loop that finds
  // the budget gone knows it lost the slot to something more specific than itself, and says so.
  for (const [sessionID, loops] of state.loops) {
    if (loops.length === 0) continue
    const surviving: SessionLoop[] = []
    let dirty = false
    for (const loop of loops) {
      if (loop.expiresAt <= now) {
        logLine(`loop ${loop.id} expired after ${loopLifetime(loop)} and was disabled`)
        // Persisted, not just dropped from memory: an expiry that survives in memory but not
        // in storage comes back whole after a restart, which is how a stopped loop kept
        // posting.
        dirty = true
        continue
      }
      surviving.push(loop)
      if (loop.nextRunAt > now) continue

      // A due loop is a billable model request into someone's live session — a *tighter*
      // requirement than a background job, not a looser one — so it goes through the same
      // admission as everything else. The occurrence is consumed either way; the difference
      // is recorded, never queued, exactly like a due one-off above — which, unlike this
      // drain, spends the tick's slot first.
      const dueAt = loop.nextRunAt
      // Re-arm first: a crash must not double-post on the next tick.
      loop.nextRunAt = now + loop.intervalMs
      dirty = true

      if (claimed >= maxConcurrent) {
        // Name who took the slot, not just the cap. After the reordering above the common cause is
        // a pending one-off, and "concurrency cap reached" alone would leave the reader believing
        // this loop lost to another loop — the exact inverse of the rule the tick enforces.
        const spentBy = budgetSpentBy()
        logLine(
          `skipping loop ${loop.id}: concurrency cap reached (${claimed}/${maxConcurrent}); the slot went to ${spentBy}`,
        )
        await recordLoopRun(
          ctx,
          state,
          loop,
          sessionID,
          dueAt,
          "skipped",
          "session default",
          `no free run slot: concurrency cap ${maxConcurrent} reached, spent on ${spentBy}`,
        )
        continue
      }

      claimed += 1
      loopClaimed += 1
      // In flight for the rest of the tick, exactly as a job run is: a second loop due in the
      // same session must see the slot taken rather than double-posting into one session.
      state.inFlight.add(loop.id)
      void postLoop(ctx, state, loop, sessionID, dueAt)
        .catch((error: unknown) => {
          logOnce(`loop-${loop.id}`, `post failed (${error instanceof Error ? error.message : String(error)})`)
        })
        .finally(() => {
          state.inFlight.delete(loop.id)
        })
    }
    if (dirty) {
      state.loops.set(sessionID, surviving)
      // `nextRunAt` moves on every post, so this write is what stops a loop from replaying
      // the same occurrence after a restart.
      await saveLoops(ctx, sessionID, surviving)
    }
  }

  for (const decision of decisions) {
    state.inFlight.add(decision.job.id)
    // The whole occurrence, because the record needs what the backlog did not run, not only when.
    void runJob(ctx, state, decision.job, decision.occurrence)
      .catch((error: unknown) => {
        logOnce(`run-${decision.job.id}`, `run failed (${error instanceof Error ? error.message : String(error)})`)
      })
      .finally(() => {
        state.inFlight.delete(decision.job.id)
      })
  }
}

function buildTools(
  ctx: PluginContext,
  state: SchedulerState,
  currentLease: () => Lease,
  arm: () => void,
  tickMs: number,
  // The cap as configured, so `schedules_run` measures a manual trigger against the same budget
  // `tick` spends rather than against a second, independently-clamped copy of it.
  maxConcurrent: number,
): ToolRegistration[] {
  return [
    {
      name: "list",
      description: "List scheduled jobs with schedule, timezone, next/last run and last status. Pure read.",
      input: NO_INPUT,
      output: LIST_OUTPUT,
      options: { namespace: TOOL_NAMESPACE, codemode: true },
      execute: async () => {
        // Read through, not captured: the lease is acquired lazily when ephemeral work first
        // appears, so a snapshot taken at build time would report `leaseHeld: false` for an
        // instance that is in fact the writer.
        const lease = currentLease()
        return {
          output: {
          jobs: state.jobs.map((job) => {
            const record = state.states[job.id] ?? { version: STATE_VERSION }
            return {
              id: job.id,
              schedule: job.schedule,
              timezone: job.timezone,
              enabled: job.enabled,
              misfire: job.misfire,
              session: job.session,
              permissions: job.permissions ?? "session default",
              // Surfaced so a job that will silently deny at runtime is visible up front.
              askAsDeny:
                job.permissions === undefined ? [] : collectAsks(job.permissions),
              runTimeoutMs: job.runTimeoutMs,
              agent: job.agent ?? null,
              model:
                job.model === undefined
                  ? "session default"
                  : `${job.model.providerID}/${job.model.id}`,
              nextRun: record.nextRun === undefined ? null : new Date(record.nextRun).toISOString(),
              lastRun: record.lastRun === undefined ? null : new Date(record.lastRun).toISOString(),
              lastStatus: record.lastStatus ?? null,
              lastError: record.lastError ?? null,
              running: state.inFlight.has(job.id),
            }
          }),
          invalid: state.invalid,
          // Pending one-offs are runtime state, listed separately from the file-defined
          // jobs so the two are never mistaken for one another.
          oneOffs: [...state.oneOffs]
            .sort((a, b) => a.dueAt - b.dueAt)
            .map((task) => ({
              id: task.id,
              dueAt: new Date(task.dueAt).toISOString(),
              prompt: clip(task.prompt, 200),
              model: task.model === undefined ? "session default" : `${task.model.providerID}/${task.model.id}`,
            })),
          oneOffCap: DEFAULT_ONEOFF_CAP,
          // Loops are per session, so they are listed across sessions with their owner.
          loops: [...state.loops.entries()].flatMap(([sessionID, loops]) =>
            loops.map((loop) => ({
              id: loop.id,
              sessionID,
              nextRunAt: new Date(loop.nextRunAt).toISOString(),
              expiresAt: new Date(loop.expiresAt).toISOString(),
              intervalMs: loop.intervalMs,
            })),
          ),
          loopCap: DEFAULT_LOOP_CAP,
          ...(state.fileError !== undefined ? { error: state.fileError } : {}),
          leaseHeld: lease.held,
          leaseForeign: lease.foreign,
          tickMs,
          },
        }
      },
    },
    {
      name: "start_loop",
      description:
        "Start a recurring prompt inside THIS session on a fixed interval (e.g. every 5m). Auto-disables after three days unless a ttl is given.",
      input: {
        type: "object",
        properties: {
          prompt: { type: "string", description: "Text posted into this session each interval." },
          every: { type: "string", description: "Interval as a duration: \"5m\", \"2h\", \"1d\". Minimum 1m." },
          ttl: { type: "string", description: "Lifetime as a duration. Default 3 days." },
        },
        required: ["prompt", "every"],
        additionalProperties: false,
      },
      output: LOOP_OUTPUT,
      options: { namespace: TOOL_NAMESPACE, codemode: true },
      execute: async (input, context) => {
        // A loop is owned by the session that asked for it, so the calling session id is
        // the only thing that can scope it. No session => refuse rather than guess.
        const sessionID = sessionToken(context?.sessionID)
        if (sessionID === undefined) {
          return { output: { error: "no calling session: a loop can only be started from inside a session" } }
        }
        const now = Date.now()
        const validated = validateLoop(input, now, sessionID)
        if ("reason" in validated) return { output: { error: validated.reason } }

        // Restore this session's loops from storage FIRST, so a loop survives a reload and
        // so the cap is measured against what actually exists rather than against an empty
        // in-memory map. Checking the cap before restoring silently overwrote stored loops.
        //
        // "Loaded" means `Map.has`, not "non-empty": after `stop_loop` the stored answer for
        // this session is an empty list, and reading it as "not loaded yet" is what brought
        // stopped loops back from the stale record.
        const restored = await loopsFor(ctx, state, sessionID)
        if (restored.length >= DEFAULT_LOOP_CAP) {
          return {
            output: {
              error: `at the cap of ${DEFAULT_LOOP_CAP} loops in this session; stop one first`,
              cap: DEFAULT_LOOP_CAP,
              loops: restored.map((loop) => loop.id),
            },
          }
        }

        const loop: SessionLoop = {
          ...validated.task,
          id: loopId(),
          createdAt: now,
          nextRunAt: now + validated.task.intervalMs,
        }
        state.loops.set(sessionID, [...restored, loop])
        await saveLoops(ctx, sessionID, state.loops.get(sessionID)!)
        // The first loop in a project with no jobs is the *only* thing that makes the tick
        // worth running, and this call happens long after `setup` decided there was nothing
        // to do. Re-decide rather than asking for a reload.
        arm()
        logLine(`started loop ${loop.id} every ${Math.round(loop.intervalMs / MINUTE_MS)}m in session ${sessionID}`)
        return {
          output: {
            id: loop.id,
            sessionID,
            nextRunAt: new Date(loop.nextRunAt).toISOString(),
            expiresAt: new Date(loop.expiresAt).toISOString(),
          },
        }
      },
    },
    {
      name: "stop_loop",
      description: "Stop one loop in this session by id, or every loop in this session when id is omitted.",
      input: {
        type: "object",
        properties: { id: { type: "string", description: "Loop id. Omit to stop all loops in this session." } },
        additionalProperties: false,
      },
      output: LOOP_LIST_OUTPUT,
      options: { namespace: TOOL_NAMESPACE, codemode: true },
      execute: async (input, context) => {
        const sessionID = sessionToken(context?.sessionID)
        if (sessionID === undefined) {
          return { output: { error: "no calling session" } }
        }
        const existing = await loopsFor(ctx, state, sessionID)
        const id = asString(input.id)
        if (id === undefined) {
          state.loops.set(sessionID, [])
          // Persisted, not just emptied in memory: this is the write whose absence let a
          // later `start_loop` read the stale record and resurrect every stopped loop.
          await saveLoops(ctx, sessionID, [])
          // Removing work can empty a project, and an empty project owes the writer lease back
          // rather than polling for the rest of the process's life.
          arm()
          logLine(`stopped all loops in session ${sessionID}`)
          return { output: { loops: [], cap: DEFAULT_LOOP_CAP } }
        }
        if (!existing.some((loop) => loop.id === id)) {
          // Name the session too: the loop may well exist, in a different one.
          return {
            output: {
              error: `no loop with id "${id}" in session ${sessionID}`,
              loops: existing.map((loop) => loop.id),
            },
          }
        }
        const remaining = existing.filter((loop) => loop.id !== id)
        state.loops.set(sessionID, remaining)
        await saveLoops(ctx, sessionID, remaining)
        arm()
        logLine(`stopped loop ${id}`)
        return {
          output: { loops: remaining.map((loop) => ({ id: loop.id, nextRunAt: new Date(loop.nextRunAt).toISOString() })), cap: DEFAULT_LOOP_CAP },
        }
      },
    },
    {
      name: "schedule",
      description:
        "Schedule a one-off prompt for a specific time. Runtime-only and ephemeral: it never becomes a recurring job and never touches a job file.",
      input: {
        type: "object",
        properties: {
          prompt: { type: "string", description: "Text dispatched at the due time." },
          dueAt: { type: "number", description: "Absolute epoch ms. Optional when dueIn is given." },
          dueIn: { type: "string", description: "Duration from now, e.g. \"30m\" or \"2h\"." },
          model: { type: "string", description: "provider/model. Set it: a one-off still costs a model call." },
          agent: { type: "string" },
          runTimeout: { type: "string", description: "Duration, e.g. \"15m\"." },
          permissions: { type: "object", description: "Permission rules in opencode's own schema." },
        },
        required: ["prompt"],
        additionalProperties: false,
      },
      output: SCHEDULE_OUTPUT,
      options: { namespace: TOOL_NAMESPACE, codemode: true },
      execute: async (input) => {
        const now = Date.now()
        const validated = validateOneOff(input, now)
        if ("reason" in validated) return { output: { error: validated.reason } }
        const pending = state.oneOffs.filter((task) => task.dueAt > now).length
        if (pending >= DEFAULT_ONEOFF_CAP) {
          // Reported, not silently enforced: the agent can cancel or wait.
          return {
            output: {
              error: `at the cap of ${DEFAULT_ONEOFF_CAP} pending one-off tasks; cancel one or wait for one to run`,
              pending,
            },
          }
        }
        const task: OneOffTask = { ...validated.task, id: oneOffId(), createdAt: now }
        state.oneOffs = [...state.oneOffs, task]
        await saveOneOffs(ctx, state.oneOffs)
        // Same re-decision as `start_loop`, and for the same reason: this tool is the only
        // thing that can give a job-less project work, and it runs long after `setup` decided
        // there was none. Returning success without arming is what made the work unreachable.
        arm()
        logLine(`scheduled one-off ${task.id} for ${new Date(task.dueAt).toISOString()}`)
        return {
          output: {
            id: task.id,
            dueAt: new Date(task.dueAt).toISOString(),
            pending: state.oneOffs.length,
          },
        }
      },
    },
    {
      name: "cancel",
      description: "Cancel a pending one-off task by id.",
      input: {
        type: "object",
        properties: { id: { type: "string", description: "One-off id, as returned by schedules_schedule." } },
        required: ["id"],
        additionalProperties: false,
      },
      output: CANCEL_OUTPUT,
      options: { namespace: TOOL_NAMESPACE, codemode: true },
      execute: async (input) => {
        const id = asString(input.id)
        if (id === undefined) return { output: { error: "id is required" } }
        const before = state.oneOffs.length
        const target = state.oneOffs.find((task) => task.id === id)
        if (target === undefined) {
          // Naming the id matters: "no such one-off" and "already ran" are different
          // answers, and an agent retrying needs to know which happened.
          return {
            output: {
              error: `no pending one-off with id "${id}" (it may have already run; check schedules_history)`,
              pending: before,
            },
          }
        }
        state.oneOffs = state.oneOffs.filter((task) => task.id !== id)
        await saveOneOffs(ctx, state.oneOffs)
        arm()
        logLine(`cancelled one-off ${id}`)
        return { output: { id, cancelled: true, pending: state.oneOffs.length } }
      },
    },
    {
      name: "history",
      description:
        "Return recent runs for a job, a one-off or a session loop, newest first: due and start instants, outcome, resolved model, " +
        "and any error. A run carries inMemoryOnly on a host with no storage: it is readable for this session and not after it.",
      input: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description:
              "Job id as reported by schedules_list, one-off id as returned by schedules_schedule, or loop id as returned by schedules_start_loop.",
          },
          limit: { type: "number", description: "Max runs to return (capped at 50)." },
        },
        required: ["id"],
        additionalProperties: false,
      },
      output: HISTORY_OUTPUT,
      options: { namespace: TOOL_NAMESPACE, codemode: true },
      execute: async (input) => {
        const id = asString(input.id)
        if (id === undefined) return { output: { error: "id is required" } }
        const limit = boundedInt(input.limit, DEFAULT_HISTORY_LIMIT, 1, MAX_HISTORY_LIMIT)
        // Wider than `state.jobs` on purpose: a one-off is consumed the moment it runs and a
        // loop belongs to a session, so a completed one is in neither list by the time anyone
        // asks what it did — which is what made this tool unable to read a one-off at all.
        const owner = await resolveHistoryOwner(ctx, state, id)
        // An unknown id is a typed failure naming the id, never an empty success: "no runs
        // yet" and "no such job" are different answers and must not look alike.
        if (owner === undefined) {
          return {
            output: {
              error: `no job with id "${id}"`,
              // Jobs plus what is still pending: the live ids this plugin can name. A completed
              // one-off is deliberately absent — it has no pending record to name it by, which
              // is the whole reason the lookup above had to reach into storage.
              ids: [
                ...state.jobs.map((entry) => entry.id),
                ...state.oneOffs.map((task) => task.id),
              ],
              // A completed one-off or loop is named by neither list, so on a host that cannot
              // read storage the two remaining explanations — "never ran" and "ran, and the
              // record died with the session" — cannot be told apart. Say which one is being
              // reported, because answering "no job with id" for a run that demonstrably
              // happened is exactly the lie this repo already paid for once.
              ...(isEphemeralId(id) && typeof ctx.storage?.get !== "function"
                ? {
                    historyUnavailable:
                      "this host offers no ctx.storage.get, so a finished one-off or loop is found from this " +
                      "session's memory only, and never after it",
                  }
                : {}),
            },
          }
        }
        const runs = owner.runs
          .slice(-limit)
          .reverse()
          .map((entry) => ({
            dueAt: new Date(entry.dueAt).toISOString(),
            startedAt: new Date(entry.startedAt).toISOString(),
            outcome: entry.outcome,
            model: entry.model,
            ...(entry.sessionID !== undefined ? { sessionID: entry.sessionID } : {}),
            // Carried through to the reader rather than left to be inferred from the setup line:
            // "this run happened and is gone when the session ends" is a different fact from
            // "this run happened", and only the record can tell the two apart after the fact.
            ...(entry.inMemoryOnly === true ? { inMemoryOnly: true } : {}),
            ...(entry.asksAsDeny !== undefined ? { asksAsDeny: entry.asksAsDeny } : {}),
            // What the backlog owed and this run did not cover, so "how much did I miss?" is
            // answered here rather than by reading the log (ADR 0002).
            ...truncationFields(entry.dropped, entry.droppedCapped),
            ...(entry.error !== undefined ? { error: entry.error } : {}),
          }))
        return {
          output: {
            id,
            // Reported because the three kinds answer different questions: a loop runs into a
            // session, a job may reuse one, and a one-off has a fresh session every time.
            kind: owner.kind,
            ...(owner.session !== undefined ? { session: owner.session } : {}),
            runs,
            limit,
          },
        }
      },
    },
    {
      name: "format",
      description:
        "Return the job-file reference: both config surfaces, the precedence rule, and the fields that carry a cost or permission consequence.",
      input: NO_INPUT,
      output: FORMAT_OUTPUT,
      options: { namespace: TOOL_NAMESPACE, codemode: true },
      execute: async () => ({ output: { reference: JOB_FORMAT_REFERENCE } }),
    },
    {
      name: "run",
      // Every clause here is enforced below, and the tests name each one: the cap (the shared
      // `claimed` budget), the bound (`boundRun` + `runTimeoutMs` + `interrupt`), the lease (the
      // writer lease this instance holds, and the per-job run lease it takes), and the record
      // (`recordRun`, so a manual run lands in the same ring a scheduled one writes).
      //
      // The sentence used to promise the first three while the code did none of them, which is why
      // it is now specific rather than reassuring: a caller reading "the same rules" has to be
      // able to find the code that keeps them. `admitted` is the settled dispatch value, which is
      // why the bound can keep this tool's return honest — see `boundRun`.
      description:
        "Trigger one scheduled job now, under the same rules a scheduled run obeys: it takes a slot " +
        "from the shared maxConcurrentRuns budget and holds the job's run lease for its duration, is " +
        "bounded by the job's runTimeout (interrupting the session on overrun), is refused while " +
        "another instance holds the writer lease, and records ok/timeout/failed/skipped in the job's " +
        "history.",
      input: {
        type: "object",
        properties: { id: { type: "string", description: "Job id, as reported by schedules_list." } },
        required: ["id"],
        additionalProperties: false,
      },
      output: RUN_OUTPUT,
      options: { namespace: TOOL_NAMESPACE, codemode: true },
      execute: async (input) => {
        const id = asString(input.id)
        if (id === undefined) {
          return { output: { error: "id is required" } }
        }
        const job = state.jobs.find((entry) => entry.id === id)
        if (job === undefined) {
          return { output: { error: `no job with id "${id}"`, ids: state.jobs.map((entry) => entry.id) } }
        }
        if (typeof ctx.session?.prompt !== "function") {
          return { output: { id: job.id, error: "ctx.session.prompt is unavailable" } }
        }
        // **Concurrency**, first of the three and the reason this is not a bare `prompt`. The
        // single budget every dispatch shares, measured the same way `tick` measures it, so a
        // manual trigger and a scheduled run compete for the same slots instead of running
        // alongside each other.
        //
        // The writer lease is read *through* (`currentLease`), never captured at build time: it is
        // acquired lazily when work first appears and re-decided on every `arm`, so a snapshot
        // would report a stale holder. A foreign holder means another live instance owns this
        // project's runs (ADR 0003), and a second writer is exactly what that ADR exists to
        // prevent — so the trigger is refused with the reason, not silently dropped. The degraded
        // case (`held: false` because the lock directory could not be created) is *not* foreign and
        // still runs, which is the degradation ADR 0003 chose over disabling the scheduler.
        const lease = currentLease()
        if (lease.foreign) {
          return {
            output: {
              id: job.id,
              error: `another OpenCode instance holds the writer lease at ${lease.path}; a manual trigger is a dispatch, so it is refused here rather than run from two writers`,
            },
          }
        }
        if (state.inFlight.has(job.id)) {
          return { output: { id: job.id, error: "job is already running" } }
        }
        const startedAt = Date.now()
        // `dueAt` is the decision instant, not a schedule: a manual trigger has no occurrence, so
        // it is stamped into both fields and the record reads as what happened rather than as a
        // schedule it was never part of.
        //
        // `model` and `asksAsDeny` default to what a scheduled run of this job records before it
        // knows the answer, so a refusal or an early failure is a well-formed record rather than a
        // hollow one.
        const record = (
          outcome: RunStatus,
          error?: string,
          model = "unknown",
          sessionID?: string,
          asksAsDeny: readonly string[] = [],
        ): Promise<void> =>
          recordRun(ctx, state, "job", job.id, {
            dueAt: startedAt,
            startedAt,
            outcome,
            model,
            ...(sessionID !== undefined ? { sessionID } : {}),
            ...(asksAsDeny.length === 0 ? {} : { asksAsDeny: [...asksAsDeny] }),
            ...(error !== undefined ? { error } : {}),
          })
        if (state.inFlight.size >= maxConcurrent) {
          // Said, not silent. `schedules_run` is a human-initiated call, so the caller is a person
          // who asked for a run and is owed the reason it did not happen — and the record says the
          // same thing, so the ring a scheduled run writes explains this one too.
          const reason = `no free run slot: concurrency cap ${maxConcurrent} reached (${state.inFlight.size} in flight)`
          logLine(`skipping on-demand trigger of ${job.id}: ${reason}`)
          await record("skipped", reason)
          return { output: { id: job.id, error: reason } }
        }
        // **Registration**, and it is the other half of the cap: the slot is taken by joining the
        // same `inFlight` set `tick` counts, so a scheduled run cannot start alongside this one,
        // and it is released on every path below — timeout, throw and refusal alike.
        state.inFlight.add(job.id)
        // **Lease**, per job: the same run lease a scheduled run takes, renewed on the same
        // schedule and dropped in the same place, so `isRunOutstanding` holds the job outstanding
        // for a manual run exactly as it does for a scheduled one. A tick cannot re-admit a job
        // whose manual run is still going.
        const releaseLease = openRunLease(jobState(state, job.id), job.runTimeoutMs)
        let outcome: RunStatus = "failed"
        let model = "unknown"
        let asksAsDeny: readonly string[] = []
        let sessionID: string | undefined
        try {
          // Everything that can reject on the host is inside this `try`, and that is the whole
          // boundary. `sessionFor` and `applyJobTarget` were awaited *above* it, so a rejection
          // from `session.create`, `switchAgent`, `switchModel` or `permission.rules` escaped the
          // tool uncaught — invariant 3 (never break a session) broken, with nothing in the
          // scheduler log to show the dispatch failed. The host owns every one of those promises.
          sessionID = await sessionFor(ctx, state, job)
          if (sessionID === undefined) {
            const reason = "no session available for this job"
            logLine(`trigger of ${job.id} failed: ${reason}`)
            await record("failed", reason)
            return { output: { id: job.id, error: reason } }
          }
          const target = await applyJobTarget(ctx, job, sessionID)
          model = target.model
          // The asks a run turns into denies belong in the record, not only in the log line: a
          // manual run is a billable run of this job, so `schedules_history` answers for it exactly
          // as it does for a scheduled one.
          asksAsDeny = target.asksAsDeny
          // Bound to a local, because the narrowing above does not survive into the closure below.
          const prompt = ctx.session.prompt
          // **Bound**, the same `boundRun` every scheduled dispatch goes through: this job's
          // `runTimeoutMs`, `ctx.session.interrupt` on overrun, and an honest outcome either way.
          // Pre-fix this awaited `ctx.session.prompt` directly, so a hung manual run hung the tool
          // call forever — unbounded, and unbounded while holding a `maxConcurrentRuns` slot.
          const bounded = await boundRun(ctx, sessionID, job.runTimeoutMs, () =>
            prompt({
              sessionID,
              text: job.prompt,
              delivery: "queue",
            }),
          )
          if (bounded.outcome === "timeout") {
            outcome = "timeout"
            const reason = timeoutReason(job.runTimeoutMs, bounded.stopped)
            logLine(`trigger of ${job.id} timed out: ${reason}`)
            await record("timeout", reason, model, sessionID, asksAsDeny)
            return { output: { id: job.id, error: reason } }
          }
          outcome = "ok"
          // Reported even though a tool trigger is attended: the turn is queued, so the ask is
          // downgraded before anyone can answer it, exactly as in a scheduled run.
          logLine(`triggered ${job.id} on demand (model ${model}${asksClause(asksAsDeny)})`)
          await record("ok", undefined, model, sessionID, asksAsDeny)
          return {
            output: {
              id: job.id,
              sessionID,
              admitted: sessionIdOf(bounded.value) ?? "",
            },
          }
        } catch (error) {
          outcome = "failed"
          const message = clip(error instanceof Error ? error.message : String(error), 500)
          // Logged as well as returned: a dispatch that fails silently is indistinguishable from
          // an idle job, which is what the per-project log exists to prevent.
          logLine(`trigger of ${job.id} failed: ${message}`)
          await record("failed", message, model, sessionID, asksAsDeny)
          return { output: { id: job.id, error: message } }
        } finally {
          // Renewal first, then the lease itself, then the slot — the same order `runJob` uses,
          // and on every path. A manual trigger must not be able to starve scheduled work by
          // holding the cap: a hung run gives the slot up at its bound, and a throw gives it up
          // here.
          releaseLease()
          state.inFlight.delete(job.id)
          if (outcome === "ok") {
            // Persisted only when the run succeeded, so a manual trigger cannot rewrite the
            // schedule's own cursor (`lastRun`/`nextRun` belong to `resolveDue`).
            await saveState(ctx, state, job.id)
          }
        }
      },
    },
  ]
}

// ---------------------------------------------------------------------------
// V2 plugin definition
// ---------------------------------------------------------------------------

const definition: PluginDefinition = {
  id: "scheduled-tasks",
  async setup(ctx) {
    const disposers: Array<() => void> = []
    const directory = asString(ctx.location?.directory)

    const storageMissing = missingStorageOps(ctx)
    const state: SchedulerState = {
      jobs: [],
      specs: new Map(),
      states: {},
      sessions: new Map(),
      history: new Map(),
      oneOffs: [],
      loops: new Map(),
      dispatching: new Set(),
      inFlight: new Set(),
      invalid: [],
      storageAvailable: storageMissing.length === 0,
      ephemeralKeys: new Map(),
    }

    // Options are read once, from the `plugins: [{ package, options }]` object form. The job
    // file is what defines jobs; these only tune the engine.
    const options = ctx.options ?? {}
    const tickMs = boundedInt(options.tickMs, DEFAULT_TICK_MS, MIN_TICK_MS, 60 * MINUTE_MS)
    const maxConcurrent = boundedInt(
      options.maxConcurrentRuns,
      DEFAULT_MAX_CONCURRENT_RUNS,
      1,
      8,
    )

    if (directory === undefined) {
      logOnce("no-location", "ctx.location.directory is unavailable; the scheduler is inert")
      return () => {}
    }

    const projectID = asString(ctx.location?.project?.id) ?? directory
    // The log directory is created *here*, before anything is decided and before the lease
    // exists, so the startup and degradation lines below have a file to land in. Creating
    // the directory is not taking the lease: `acquireLease` keeps its own `mkdirSync` and
    // still does the arbitrating, so a project with no jobs leaves no `writer.lock` behind.
    //
    // Assigned unconditionally, and cleared first, because one host loads this plugin for
    // every project it opens: a project whose directory cannot be made must not inherit the
    // previous project's path and append its lines into someone else's file.
    activeLogPath = undefined
    const candidateLogPath = logPath(directory, projectID)
    if (ensureLogDir(candidateLogPath)) activeLogPath = candidateLogPath

    // Said once per project, here, before any work is decided: jobs still run without storage, but
    // run state, pending one-offs and every run record live in this process's memory alone.
    // Nothing else the plugin emits would name the difference — a run logs its outcome either way,
    // and the record that says "in memory only" is read by whoever asks `schedules_history`, not
    // by the log. Keyed by project like the lease lines, because one server loads this plugin for
    // every project it opens and a host-wide fact reported once would leave the second project's
    // log silent about its own degradation.
    if (!state.storageAvailable) {
      // Both halves gone is the whole surface as far as durability goes — `remove` on its own
      // retains nothing — so the line names the surface rather than a "/" of two methods. A host
      // missing exactly one is named for that one, because "storage is unavailable" would be the
      // less useful half of the truth.
      const surface = storageMissing.length === 2 ? "ctx.storage" : `ctx.storage.${storageMissing.join("/")}`
      logOnce(
        `no-storage:${projectID}`,
        `${surface} unavailable; jobs still run and their history is readable ` +
          `through schedules_history, but run state, pending one-offs and run records are kept in memory ` +
          `only and are lost when this session ends`,
      )
    }

    // Read the jobs *before* arbitrating. A globally-installed plugin loads in every
    // project, and claiming the writer lease (or littering a lockfile) in a project that
    // has no schedules would be wrong in every such project.
    await reloadJobs(ctx, directory, state)
    await loadStates(ctx, state)
    await loadAllHistory(ctx, state)
    state.oneOffs = await loadOneOffs(ctx)
    await loadAllLoops(ctx, state)

    // -----------------------------------------------------------------------
    // Arming: one holder for the lease and the timer, re-decided on demand.
    //
    // This cannot be a single `const hasWork = …` at setup. Both ephemeral drains
    // (`state.loops`, `state.oneOffs`) live *inside* `tick`, so a project whose only work is
    // ephemeral has work that no job file mentions — and it is handed work *after* setup, by
    // `schedules_schedule` / `schedules_start_loop`, minutes into the session. Deciding once
    // meant those tools returned success for work nothing would ever fire.
    //
    // So `hasWork` is a pure predicate, and `arm` is the single place that turns its answer
    // into a lease and a timer. It is called from setup, from every tool that creates or
    // removes ephemeral work, and from the end of each tick. Both operations are synchronous
    // (`acquireLease` is an atomic `open(…, "wx")`, `setInterval` is immediate), so two
    // callers can never both decide to arm.
    // -----------------------------------------------------------------------
    let lease: Lease = IDLE_LEASE
    let timer: ReturnType<typeof setInterval> | undefined
    let ticking = false

    const runTick = (): void => {
      // Never re-enter: a tick still in flight is skipped, not queued (spec 001).
      if (ticking) return
      ticking = true
      void tick(ctx, state, lease, maxConcurrent)
        .catch((error: unknown) => {
          logOnce("tick", `tick failed (${error instanceof Error ? error.message : String(error)})`)
        })
        .finally(() => {
          ticking = false
          // Re-decide after the work, not only before it: a project whose last one-off has
          // now run owes the writer lease back instead of polling for the rest of the
          // process's life. Cheap — an armed timer returns on its first line.
          arm()
        })
    }

    const disarm = (): void => {
      if (timer !== undefined) {
        clearInterval(timer)
        timer = undefined
      }
      if (lease !== IDLE_LEASE) {
        lease.release()
        lease = IDLE_LEASE
      }
    }

    const arm = (): void => {
      // No work at all — check this *first*, because "already polling" must not shadow it:
      // a project whose last one-off has just run owes the lease back, not another poll.
      if (!hasWork(state)) {
        if (lease !== IDLE_LEASE || timer !== undefined) {
          disarm()
          logLine("no enabled jobs, pending one-off or loop left; timer stopped and the writer lease released")
        }
        return
      }
      // Already polling: the timer and the lease it was armed with are both correct.
      if (timer !== undefined) return
      // ADR 0003: a foreign lease leaves the plugin loaded and its tools readable, but the
      // tick loop unarmed — a second server must not double-fire every job. Re-arbitrated
      // whenever we do not hold it, so a holder that has since died heals on the next
      // decision instead of wedging the project until a restart.
      if (!lease.held) {
        lease = acquireLease(leasePath(directory, projectID))
        if (lease.foreign) {
          logOnce(`lease-foreign:${lease.path}`, `another OpenCode instance holds the writer lease at ${lease.path}; staying inert`)
          return
        }
        if (!lease.held) {
          logOnce(`lease-unavailable:${lease.path}`, `writer lease unavailable at ${lease.path}; running without arbitration`)
        }
      }
      timer = setInterval(runTick, tickMs)
      // Never hold the server process open just to poll a schedule.
      timer.unref?.()
      // Armed from cold, which is the interesting case: the work was created after setup
      // decided there was none, so evaluating on the next interval boundary would leave a
      // due-in-the-past one-off waiting out a whole tick period for no reason.
      runTick()
    }

    const registered = registerTools(ctx, state, () => lease, arm, tickMs, maxConcurrent)
    if (registered) disposers.push(registered)
    disposers.push(disarm)

    if (hasWork(state)) {
      arm()
    } else {
      // The file existing but holding only disabled jobs is not the same as having no
      // file at all, and the log is the only place that difference is visible. Both
      // surfaces are named, because either can be the one holding the parked jobs.
      const surfaces = `${JOBS_FILE} or ${TASKS_DIR}`
      logLine(
        state.fileError === undefined
          ? `no enabled jobs in ${surfaces} and no pending one-off or loop; no timer armed ` +
            `(schedules_schedule and schedules_start_loop arm it on demand)`
          : `no enabled jobs (${state.fileError}); no timer armed ` +
            `(schedules_schedule and schedules_start_loop arm it on demand)`,
      )
    }

    return () => {
      for (const disposeOne of disposers.reverse()) {
        try {
          disposeOne()
        } catch {
          // Cleanup must never throw out of the plugin boundary.
        }
      }
    }
  },
}

/** Register `schedules_list` / `schedules_run`; returns a disposer, or undefined. */
function registerTools(
  ctx: PluginContext,
  state: SchedulerState,
  currentLease: () => Lease,
  arm: () => void,
  tickMs: number,
  maxConcurrentRuns: number,
): (() => void) | undefined {
  try {
    const transform = ctx.tool?.transform
    if (typeof transform !== "function") {
      logOnce("no-tools", "ctx.tool.transform is unavailable; no tools registered")
      return undefined
    }
    let registration: unknown
    const pending = transform((editor: ToolEditorLike) => {
      editor.namespace?.({ name: TOOL_NAMESPACE, description: TOOL_NAMESPACE_DESCRIPTION })
      for (const tool of buildTools(ctx, state, currentLease, arm, tickMs, maxConcurrentRuns)) editor.add?.(tool)
    })
    if (pending !== undefined && typeof (pending as Promise<unknown>).then === "function") {
      void (pending as Promise<unknown>).then(
        (value) => {
          registration = value
        },
        (error: unknown) => {
          logOnce("tools", `tool registration failed (${error instanceof Error ? error.message : String(error)})`)
        },
      )
    }
    return () => dispose(registration)
  } catch (error) {
    logOnce("tools", `tool registration failed (${error instanceof Error ? error.message : String(error)})`)
    return undefined
  }
}

export default definition