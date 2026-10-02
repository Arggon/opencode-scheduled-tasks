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
| \`maxCatchUp\` | no | Replay ceiling for \`backfill\`. Default 5. |
| \`runTimeout\` | no | Duration: \`30s\`, \`5m\`, \`1h30m\`, \`1d\`. A bare number means seconds. |
| \`runTimeoutMs\` | no | The millisecond form; kept for compatibility. |

### Always name a model

A job with no \`model\` inherits the session default, which for unattended recurring work is
often a **paid** model. The resolved model is logged on every run, so an inherited one is
visible — but naming it is what you meant.

### Costs money

Every run is a real model request. \`misfire: skip\` means a backlog collapses to one run;
runs are never retried within an occurrence. Trigger a re-run with \`schedules_run\`.

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
 */
let activeLogPath: string | undefined

/** Maximum bytes of one appended log line. */
const LOG_LINE_MAX = 1000

/** Per-project log file, beside the writer lease. */
export function logPath(directory: string, id: string): string {
  const safe = id.replace(/[^A-Za-z0-9._-]/g, "_")
  return join(leaseBaseDir(), safe, "scheduler.log")
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

/** Wall parts treated as a UTC instant, so day/month arithmetic never needs a timezone. */
function wallAsUtc(parts: WallParts): number {
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0, 0)
}

function wallFromUtc(ms: number): WallParts {
  const date = new Date(ms)
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
 * Vixie day rule: when **both** day-of-month and day-of-week are restricted the day matches
 * if **either** does; when only one is restricted, that one must match.
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
 * First occurrence of `spec` strictly after `afterMs`, evaluated in `timeZone`, or
 * `undefined` when nothing matches within the search horizon.
 *
 * The search walks **wall-clock** minutes and only converts the match to an instant, which
 * is what makes DST correct for free: a wall time that does not exist resolves to
 * `undefined` and the walk continues, and an ambiguous wall time resolves to its first
 * instant.
 */
export function nextOccurrence(spec: CronSpec, afterMs: number, timeZone: string): number | undefined {
  // Start at the next whole minute strictly after `afterMs`.
  let wall = Math.floor(afterMs / MINUTE_MS) * MINUTE_MS + MINUTE_MS
  const horizon = wall + SEARCH_HORIZON_MS

  while (wall < horizon) {
    const parts = wallFromUtc(wall)
    if (!dayMatches(parts, spec)) {
      // Jump to the next local midnight instead of walking 1440 dead minutes.
      wall = Date.UTC(parts.year, parts.month - 1, parts.day + 1, 0, 0, 0, 0)
      continue
    }
    if (!spec.hours.has(parts.hour)) {
      wall = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour + 1, 0, 0, 0)
      continue
    }
    if (!spec.minutes.has(parts.minute)) {
      wall += MINUTE_MS
      continue
    }
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

/** Durable, versioned per-job record. Only mutable run state lives here — never the job. */
export type JobState = {
  version: number
  lastRun?: number
  lastStatus?: RunStatus
  lastError?: string
  nextRun?: number
  /** Heartbeat of an in-flight run; an expired one is treated as abandoned. */
  leaseUntil?: number
}

export type JobStateMap = Record<string, JobState>

/** One occurrence the tick decided about. */
export type Occurrence = {
  jobId: string
  /** The instant the occurrence was due. */
  dueAt: number
  /** How many due occurrences this decision covers, and how many past the cap were dropped. */
  collapsed: number
  dropped: number
  /** True when `dropped` hit the scan bound and is therefore a lower bound. */
  droppedCapped?: boolean
}

/** Why a due job was not run. */
export type Suppression =
  | { reason: "in-flight" }
  | { reason: "concurrency"; running: number }
  | { reason: "backlog-truncated"; dropped: number }

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
 * Ceiling on the walk that counts a dropped backlog. Counting a `* * * * *` job across a
 * year asleep would otherwise cost half a million `nextOccurrence` calls to produce a number
 * nobody acts on, so past this bound the count is reported as a lower bound.
 */
const MAX_BACKLOG_SCAN = 1000

/**
 * Every occurrence of `spec` in `(afterMs, untilMs]`, capped at `limit`, oldest first.
 *
 * `dropped` reports what the cap swallowed rather than silently discarding it (ADR 0002).
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
 * Whichever policy fires, the cursor is advanced to `nowMs`. That is what makes `skip`
 * genuinely *collapse* a backlog rather than replaying it one occurrence per tick: the
 * window is consumed whether or not each of its occurrences was run.
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
  const limit = job.misfire === "backfill" ? job.maxCatchUp : 1
  const { instants, dropped, droppedCapped } = missedOccurrences(spec, after, nowMs, job.timezone, limit)

  if (instants.length === 0) {
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
    dueAt: instants[0] as number,
    collapsed: instants.length,
    dropped,
    ...(droppedCapped ? { droppedCapped: true } : {}),
  }

  /** Consume the whole window: the cursor moves to `nowMs`, never to a replayed instant. */
  const consume = (): void => {
    state.lastRun = nowMs
    const upcoming = nextOccurrence(spec, nowMs, job.timezone)
    if (upcoming !== undefined) state.nextRun = upcoming
  }

  if (inFlight) {
    state.lastStatus = "skipped"
    consume()
    return { kind: "skip", job, occurrence, suppression: { reason: "in-flight" } }
  }
  if (running >= maxConcurrentRuns) {
    state.lastStatus = "skipped"
    consume()
    return { kind: "skip", job, occurrence, suppression: { reason: "concurrency", running } }
  }

  // Advance the cursor *before* the run, so a crash mid-run cannot replay the same
  // occurrence forever — and advance it to `nowMs`, so the rest of the backlog is consumed
  // rather than trickling out one occurrence per tick.
  consume()

  return { kind: "run", job, occurrence }
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
  return state
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
  const errored = entry.error === undefined ? {} : { error: clip(entry.error, HISTORY_ERROR_MAX) }
  const next = [...history, { ...entry, ...errored }]
  // Evict oldest-first: the newest run is the one a reader wants.
  return next.length > bounded ? next.slice(next.length - bounded) : next
}

/** An in-flight lease older than its own timeout is abandoned, not hung. */
export function isLeaseLive(state: JobState, nowMs: number): boolean {
  return state.leaseUntil !== undefined && state.leaseUntil > nowMs
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

/** Read pending one-offs, dropping malformed entries rather than failing the load. */
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

/** Hard ceiling on loops per session, whatever the cap is configured to. */
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

/** Read loops for one session, dropping malformed entries rather than failing the load. */
async function loadLoops(ctx: PluginContext, sessionID: string): Promise<SessionLoop[]> {
  const stored = await storageGet(ctx, `${LOOP_PREFIX}${sessionID}`)
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
  return out
}

async function saveLoops(ctx: PluginContext, loops: readonly SessionLoop[]): Promise<void> {
  // A loop belongs to one session, so the key is that session's: a loop can never outlive
  // the session that asked for it, and a dead session's loops are simply unreachable.
  const first = loops[0]
  if (first !== undefined) await storageSet(ctx, `${LOOP_PREFIX}${first.sessionID}`, loops)
}

// ---------------------------------------------------------------------------
// OpenCode V2 plugin context (structural types — no `@opencode/plugin` import)
// ---------------------------------------------------------------------------

type StorageContext = {
  get?(key: string): Promise<unknown>
  set?(key: string, value: unknown): Promise<unknown>
  remove?(key: string): Promise<unknown>
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
  inFlight: Set<string>
  fileError?: string
  invalid: InvalidJob[]
  storageAvailable: boolean
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
    session: { type: "string" },
    runs: { type: "array" },
    limit: { type: "number" },
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
    state.history.set(job.id, await loadHistory(ctx, job.id))
  }
}

async function saveState(ctx: PluginContext, state: SchedulerState, jobId: string): Promise<void> {
  await storageSet(ctx, `${STORAGE_PREFIX}${jobId}`, state.states[jobId])
}

const HISTORY_PREFIX = `${STORAGE_PREFIX}history/`

/** Read one job's history, tolerating absent or corrupt storage (spec 002 § Persistence). */
async function loadHistory(ctx: PluginContext, jobId: string): Promise<HistoryEntry[]> {
  const stored = await storageGet(ctx, `${HISTORY_PREFIX}${jobId}`)
  if (!Array.isArray(stored)) return []
  const entries: HistoryEntry[] = []
  for (const raw of stored) {
    if (raw === null || typeof raw !== "object") continue
    const record = raw as Record<string, unknown>
    if (typeof record.dueAt !== "number" || typeof record.startedAt !== "number") continue
    if (!isRunStatus(record.outcome) || typeof record.model !== "string") continue
    entries.push({
      dueAt: record.dueAt,
      startedAt: record.startedAt,
      outcome: record.outcome,
      model: record.model,
      ...(asString(record.sessionID) !== undefined ? { sessionID: asString(record.sessionID) as string } : {}),
      ...(asString(record.error) !== undefined ? { error: asString(record.error) as string } : {}),
    })
  }
  // Bounded on read as well as on write, so a hand-edited or oversized record cannot
  // grow the in-memory buffer either.
  return entries.slice(-MAX_HISTORY_LIMIT)
}

async function saveHistory(ctx: PluginContext, state: SchedulerState, jobId: string): Promise<void> {
  await storageSet(ctx, `${HISTORY_PREFIX}${jobId}`, state.history.get(jobId) ?? [])
}

/**
 * Dispatch a one-off: same target-application (agent, model, permissions) and the same
 * bounded run record as a recurring job, but no cron and no job-file entry.
 *
 * Reuses `applyJobTarget` deliberately — a one-off gets the same permission discipline as a
 * scheduled job, so it cannot become a loophole.
 */
async function runOneOff(
  ctx: PluginContext,
  state: SchedulerState,
  task: OneOffTask,
): Promise<RunStatus> {
  if (typeof ctx.session?.create !== "function") {
    logOnce("no-session-create", "ctx.session.create is unavailable; runs cannot be dispatched")
    return "failed"
  }
  if (typeof ctx.session?.prompt !== "function") {
    logOnce("no-prompt", "ctx.session.prompt is unavailable; one-offs cannot be dispatched")
    return "failed"
  }
  let outcome: RunStatus = "failed"
  let model = "unknown"
  let sessionID: string | undefined
  try {
    const created = await ctx.session.create({ title: `scheduled: ${task.id}` })
    sessionID = sessionIdOf(created)
    if (sessionID === undefined) return "failed"
    model = await applyJobTarget(ctx, task, sessionID)
    logLine(`running one-off ${task.id} (due ${new Date(task.dueAt).toISOString()}, model ${model})`)
    await ctx.session.prompt({ sessionID, text: task.prompt, delivery: "queue" })
    outcome = "ok"
  } catch (error) {
    const message = clip(error instanceof Error ? error.message : String(error), 300)
    logLine(`one-off ${task.id} failed: ${message}`)
    state.history.set(
      task.id,
      pushHistory(state.history.get(task.id) ?? [], {
        dueAt: task.dueAt,
        startedAt: Date.now(),
        outcome: "failed",
        model,
        ...(sessionID !== undefined ? { sessionID } : {}),
        error: message,
      }),
    )
    await saveHistory(ctx, state, task.id)
  }
  return outcome
}

/**
 * Point the target session at the job's agent and model before dispatching.
 *
 * A job that names no model **inherits the session default**, which for an unattended
 * recurring job is usually a paid model. That is why the resolved model is echoed in the
 * `running` line: the log is where you see which model is being billed.
 */
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

async function applyJobTarget(ctx: PluginContext, job: DispatchTarget, sessionID: string): Promise<string> {
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
  const asks = job.permissions === undefined ? [] : collectAsks(job.permissions)
  if (job.permissions !== undefined) {
    if (typeof ctx.permission?.rules === "function") {
      await ctx.permission.rules({ sessionID, permissions: [job.permissions] })
    } else {
      logOnce("no-permission-rules", "ctx.permission.rules is unavailable; the job runs with session defaults")
    }
    // An "ask" in an unattended run has nobody to answer it, so it is a deny. Reported
    // rather than left to time out — and the warnings come from opencode-tasks (ADR 0007).
    if (asks.length > 0) {
      logLine(`job ${job.id} declares "ask" permissions with nobody to answer them; treated as deny: ${asks.join(", ")}`)
    }
  }

  return job.model === undefined ? "session default" : `${job.model.providerID}/${job.model.id}`
}

/**
 * Run one job: admit the prompt, bound it by `runTimeoutMs`, record the outcome.
 *
 * A run never throws out of here: every failure is recorded on the job's state, which is
 * what keeps invariant 3 (never breaks a session) true for the scheduling path too.
 */
async function runJob(
  ctx: PluginContext,
  state: SchedulerState,
  job: JobDefinition,
  dueAt: number,
): Promise<void> {
  const now = Date.now()
  const record = state.states[job.id] ?? { version: STATE_VERSION }
  record.leaseUntil = now + job.runTimeoutMs

  // Collected in the `finally` so a thrown run still lands in the history.
  let outcome: RunStatus = "failed"
  let model = "unknown"
  let sessionID: string | undefined

  try {
    if (typeof ctx.session?.prompt !== "function") {
      logOnce("no-prompt", "ctx.session.prompt is unavailable; the scheduler is inert")
      record.lastError = "ctx.session.prompt is unavailable"
      return
    }
    sessionID = await sessionFor(ctx, state, job)
    if (sessionID === undefined) {
      record.lastStatus = "failed"
      record.lastError = "no session available for this job"
      return
    }
    model = await applyJobTarget(ctx, job, sessionID)

    logLine(
      `running ${job.id} (schedule "${job.schedule}" ${job.timezone}, model ${model}, session ${job.session})`,
    )

    // `prompt` admits the turn; the run itself is bounded by the lease the tick refreshes.
    await ctx.session.prompt({
      sessionID,
      text: job.prompt,
      // Queue, so a run cannot interleave with a human typing into the same session.
      delivery: "queue",
    })
    outcome = "ok"
    record.lastStatus = "ok"
    record.lastError = undefined
  } catch (error) {
    record.lastStatus = "failed"
    record.lastError = clip(error instanceof Error ? error.message : String(error), 500)
    logLine(`job ${job.id} failed: ${record.lastError}`)
  } finally {
    record.leaseUntil = undefined
    state.history.set(
      job.id,
      pushHistory(state.history.get(job.id) ?? [], {
        dueAt,
        startedAt: now,
        outcome,
        model,
        ...(sessionID !== undefined ? { sessionID } : {}),
        ...(record.lastError !== undefined ? { error: record.lastError } : {}),
      }),
    )
    await saveHistory(ctx, state, job.id)
    await saveState(ctx, state, job.id)
  }
}

/** Evaluate every enabled job once. Re-entrancy is guarded by the caller. */
async function tick(ctx: PluginContext, state: SchedulerState, lease: Lease, maxConcurrent: number): Promise<void> {
  lease.heartbeat()

  const now = Date.now()
  const decisions: Array<Extract<TickDecision, { kind: "run" }>> = []

  for (const job of state.jobs) {
    if (!job.enabled) continue
    const spec = state.specs.get(job.id)
    if (spec === undefined) continue

    const record = state.states[job.id] ?? { version: STATE_VERSION }
    state.states[job.id] = record

    // An abandoned lease (crashed run) is cleared so the job can fire again.
    if (record.leaseUntil !== undefined && !isLeaseLive(record, now)) record.leaseUntil = undefined

    const decision = resolveDue(
      job,
      spec,
      record,
      now,
      isLeaseLive(record, now),
      state.inFlight.size + decisions.length,
      maxConcurrent,
    )
    if (decision === undefined) continue

    if (decision.kind === "skip") {
      const reason =
        decision.suppression.reason === "in-flight"
          ? "previous run still in flight"
          : decision.suppression.reason === "concurrency"
            ? `concurrency cap reached (${decision.suppression.running}/${maxConcurrent})`
            : `backlog truncated, ${decision.suppression.dropped} occurrence(s) dropped`
      logLine(`skipping ${job.id}: ${reason}`)
      await saveState(ctx, state, job.id)
      continue
    }
    decisions.push(decision)
  }

  // Loops fire only into the session that owns them, and never outlive that session.
  for (const [sessionID, loops] of state.loops) {
    if (loops.length === 0) continue
    const surviving: SessionLoop[] = []
    for (const loop of loops) {
      if (loop.expiresAt <= now) {
        logLine(`loop ${loop.id} expired after 3 days and was disabled`)
        continue
      }
      surviving.push(loop)
      if (loop.nextRunAt > now) continue
      // Re-arm first: a crash must not double-post on the next tick.
      loop.nextRunAt = now + loop.intervalMs
      if (typeof ctx.session?.prompt === "function") {
        logLine(`loop ${loop.id} posting into its own session (every ${Math.round(loop.intervalMs / MINUTE_MS)}m)`)
        void ctx.session
          .prompt({ sessionID, text: loop.prompt, delivery: "queue" })
          .catch((error: unknown) => {
            logOnce(`loop-${loop.id}`, `post failed (${error instanceof Error ? error.message : String(error)})`)
          })
      }
    }
    if (surviving.length !== loops.length) {
      state.loops.set(sessionID, surviving)
      await saveLoops(ctx, surviving)
    }
  }

  // One-offs are drained after recurring jobs so a one-off never starves a schedule.
  const due = state.oneOffs.filter((task) => task.dueAt <= now)
  if (due.length > 0) {
    const claimed = due.slice(0, Math.max(0, maxConcurrent - state.inFlight.size - decisions.length))
    if (claimed.length === 0 && due.length > 0) {
      logLine(`skipping ${due.length} one-off task(s): concurrency cap reached (${maxConcurrent})`)
    }
    // Removed before running, so a crash cannot replay a one-off forever: the same rule the
    // recurring cursor uses.
    state.oneOffs = state.oneOffs.filter((task) => !claimed.includes(task))
    await saveOneOffs(ctx, state.oneOffs)
    for (const task of claimed) {
      const entry = task.id
      void runOneOff(ctx, state, task).then(async (outcome) => {
        // A completed one-off survives only in history, then is gone (ADR 0006).
        if (outcome === "ok") {
          state.history.set(
            entry,
            pushHistory(state.history.get(entry) ?? [], {
              dueAt: task.dueAt,
              startedAt: Date.now(),
              outcome,
              model: task.model === undefined ? "session default" : `${task.model.providerID}/${task.model.id}`,
            }),
          )
          await saveHistory(ctx, state, entry)
        }
      })
    }
  }

  for (const decision of decisions) {
    state.inFlight.add(decision.job.id)
    void runJob(ctx, state, decision.job, decision.occurrence.dueAt)
      .catch((error: unknown) => {
        logOnce(`run-${decision.job.id}`, `run failed (${error instanceof Error ? error.message : String(error)})`)
      })
      .finally(() => {
        state.inFlight.delete(decision.job.id)
      })
  }
}

function buildTools(ctx: PluginContext, state: SchedulerState, lease: Lease, tickMs: number): ToolRegistration[] {
  return [
    {
      name: "list",
      description: "List scheduled jobs with schedule, timezone, next/last run and last status. Pure read.",
      input: NO_INPUT,
      output: LIST_OUTPUT,
      options: { namespace: TOOL_NAMESPACE, codemode: true },
      execute: async () => ({
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
      }),
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
        const existing = state.loops.get(sessionID) ?? []
        const restored = existing.length > 0 ? existing : await loadLoops(ctx, sessionID)
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
        await saveLoops(ctx, state.loops.get(sessionID)!)
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
        const existing = state.loops.get(sessionID) ?? (await loadLoops(ctx, sessionID))
        const id = asString(input.id)
        if (id === undefined) {
          state.loops.set(sessionID, [])
          await saveLoops(ctx, [])
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
        await saveLoops(ctx, remaining)
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
        logLine(`cancelled one-off ${id}`)
        return { output: { id, cancelled: true, pending: state.oneOffs.length } }
      },
    },
    {
      name: "history",
      description:
        "Return one job's recent runs, newest first: due and start instants, outcome, resolved model, and any error.",
      input: {
        type: "object",
        properties: {
          id: { type: "string", description: "Job id, as reported by schedules_list." },
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
        const job = state.jobs.find((entry) => entry.id === id)
        // An unknown id is a typed failure naming the id, never an empty success: "no runs
        // yet" and "no such job" are different answers and must not look alike.
        if (job === undefined) {
          return { output: { error: `no job with id "${id}"`, ids: state.jobs.map((e) => e.id) } }
        }
        const limit = boundedInt(input.limit, DEFAULT_HISTORY_LIMIT, 1, MAX_HISTORY_LIMIT)
        const runs = [...(state.history.get(id) ?? [])]
          .slice(-limit)
          .reverse()
          .map((entry) => ({
            dueAt: new Date(entry.dueAt).toISOString(),
            startedAt: new Date(entry.startedAt).toISOString(),
            outcome: entry.outcome,
            model: entry.model,
            ...(entry.sessionID !== undefined ? { sessionID: entry.sessionID } : {}),
            ...(entry.error !== undefined ? { error: entry.error } : {}),
          }))
        return { output: { id, session: job.session, runs, limit } }
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
      description: "Trigger one scheduled job now, obeying the same concurrency, timeout and lease rules.",
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
        if (state.inFlight.has(job.id)) {
          return { output: { id: job.id, error: "job is already running" } }
        }
        if (typeof ctx.session?.prompt !== "function") {
          return { output: { id: job.id, error: "ctx.session.prompt is unavailable" } }
        }
        const sessionID = await sessionFor(ctx, state, job)
        if (sessionID === undefined) {
          return { output: { id: job.id, error: "no session available for this job" } }
        }
        const model = await applyJobTarget(ctx, job, sessionID)
        try {
          const admitted = await ctx.session.prompt({
            sessionID,
            text: job.prompt,
            delivery: "queue",
          })
          logLine(`triggered ${job.id} on demand (model ${model})`)
          return {
            output: {
              id: job.id,
              sessionID,
              admitted: sessionIdOf(admitted) ?? "",
            },
          }
        } catch (error) {
          return {
            output: { id: job.id, error: clip(error instanceof Error ? error.message : String(error), 500) },
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

    const state: SchedulerState = {
      jobs: [],
      specs: new Map(),
      states: {},
      sessions: new Map(),
      history: new Map(),
      oneOffs: [],
      loops: new Map(),
      inFlight: new Set(),
      invalid: [],
      storageAvailable: typeof ctx.storage?.get === "function",
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
    activeLogPath = logPath(directory, projectID)

    // Read the jobs *before* arbitrating. A globally-installed plugin loads in every
    // project, and claiming the writer lease (or littering a lockfile) in a project that
    // has no schedules would be wrong in every such project.
    await reloadJobs(ctx, directory, state)
    await loadStates(ctx, state)
    await loadAllHistory(ctx, state)
    state.oneOffs = await loadOneOffs(ctx)

    const hasWork = state.jobs.some((job) => job.enabled)

    // ADR 0003: a foreign lease leaves the plugin loaded and its tools readable, but the
    // tick loop unarmed — a second server must not double-fire every job.
    const lease = hasWork ? acquireLease(leasePath(directory, projectID)) : IDLE_LEASE
    if (lease.foreign) {
      logLine(`another OpenCode instance holds the writer lease at ${lease.path}; staying inert`)
    } else if (hasWork && !lease.held) {
      logLine(`writer lease unavailable at ${lease.path}; running without arbitration`)
    }

    const registered = registerTools(ctx, state, lease, tickMs)
    if (registered) disposers.push(registered)

    if (hasWork && !lease.foreign) {
      let running = false
      const interval = setInterval(() => {
        // Never re-enter: a tick still in flight is skipped, not queued (spec 001).
        if (running) return
        running = true
        void tick(ctx, state, lease, maxConcurrent)
          .catch((error: unknown) => {
            logOnce("tick", `tick failed (${error instanceof Error ? error.message : String(error)})`)
          })
          .finally(() => {
            running = false
          })
      }, tickMs)
      // Never hold the server process open just to poll a schedule.
      interval.unref?.()
      disposers.push(() => clearInterval(interval))
    } else if (!hasWork) {
      // The file existing but holding only disabled jobs is not the same as having no
      // file at all, and the log is the only place that difference is visible. Both
      // surfaces are named, because either can be the one holding the parked jobs.
      const surfaces = `${JOBS_FILE} or ${TASKS_DIR}`
      logLine(
        state.fileError === undefined
          ? `no enabled jobs in ${surfaces}; no timer armed`
          : `no enabled jobs (${state.fileError}); no timer armed`,
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
      lease.release()
    }
  },
}

/** Register `schedules_list` / `schedules_run`; returns a disposer, or undefined. */
function registerTools(
  ctx: PluginContext,
  state: SchedulerState,
  lease: Lease,
  tickMs: number,
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
      for (const tool of buildTools(ctx, state, lease, tickMs)) editor.add?.(tool)
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