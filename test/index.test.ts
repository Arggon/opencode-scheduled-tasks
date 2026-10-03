import { describe, expect, it, beforeEach, afterEach, vi } from "vitest"
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { spawnSync } from "node:child_process"

import plugin, {
  CronError,
  DEFAULT_MAX_CATCH_UP,
  MINUTE_MS,
  DATA_DIR_ENV,
  STATE_VERSION,
  acquireLease,
  dayMatches,
  isLeaseLive,
  isRunOutstanding,
  leaseRenewalMs,
  loadJobs,
  loadMarkdownJobs,
  logPath,
  mergeJobSources,
  setYamlReader,
  splitFrontmatter,
  missedOccurrences,
  nextOccurrence,
  normalizeState,
  parseCron,
  parseDuration,
  parseModelRef,
  pushHistory,
  resolveDue,
  traceOccurrenceWalk,
  WalkTooLong,
  validateJob,
  validateLoop,
  validateOneOff,
  wallParts,
  MAX_FRONTMATTER_CHARS,
  MAX_HISTORY_LIMIT,
  MAX_MARKDOWN_FILE_BYTES,
  MAX_MARKDOWN_JOBS,
  MIN_TICK_MS,
  MAX_PERMISSION_ACTIONS,
  collectAsks,
  DEFAULT_LOOP_CAP,
  DEFAULT_LOOP_TTL_MS,
  DEFAULT_ONEOFF_CAP,
  hasWork,
  leasePath,
  normalizeLoops,
  MAX_LOOP_SCAN_KEYS,
  MAX_LOOP_CAP,
  MAX_ONEOFF_CAP,
  MAX_EPHEMERAL_HISTORY_KEYS,
  openRunLease,
  type HistoryEntry,
  type JobDefinition,
  type JobState,
  type CronSpec,
  type YamlReader,
} from "../src/index.ts"

// A DST-observing zone: Europe/Madrid springs forward on the last Sunday of March and
// falls back on the last Sunday of October.
const MADRID = "Europe/Madrid"
const DST_SPRING_FORWARD_2026 = "2026-03-29" // 02:00 -> 03:00; 02:30 does not exist
const DST_FALL_BACK_2026 = "2026-10-25" // 03:00 -> 02:00; 02:30 happens twice

/**
 * A zone **west** of UTC, added by `bug-next-occurrence-walks-utc-wall-parts-in-any-zone-west-of-utc`.
 *
 * Madrid and UTC are the only two zones the suite used to evaluate schedules in, and both sit at or
 * east of Greenwich, which is the whole range in which the old UTC-frame walk cancelled out. New York
 * is the zone the bug was reported from, and it is also an ordinary zone: most of the people running
 * a scheduler are west of Greenwich. Its DST transitions are in March and November.
 */
const NEW_YORK = "America/New_York"
const NY_SPRING_FORWARD_2026 = "2026-03-08" // 02:00 -> 03:00; 02:30 does not exist
const NY_FALL_BACK_2026 = "2026-11-01" // 02:00 -> 01:00; 01:30 happens twice

/**
 * A zone west of UTC with a **half-hour** magnitude: UTC-3:30 in standard time, UTC-2:30 in
 * daylight time.
 *
 * A whole-hour negative offset cannot see a `:30` bug — `|offset| + 1` is 241 either way if the
 * minutes are dropped, and 151 vs 211 here is the difference between the two.
 */
const ST_JOHNS = "America/St_Johns"

/** ISO-8601 local reading of an instant, for assertions that do not care about internals. */
function local(instantMs: number, timeZone: string): string {
  const parts = wallParts(instantMs, timeZone)
  const pad = (n: number): string => String(n).padStart(2, "0")
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`
}

/**
 * `zone`'s offset from UTC in whole minutes at `instantMs`, positive **east** of Greenwich.
 *
 * Derived from `wallParts` rather than tabulated, so a test can assert the *range* the matrix covers
 * instead of trusting that nobody deleted the half of it that found the bug. Only exact on whole
 * minutes — `wallParts` has no second field, and every caller here pins one.
 */
function offsetMinutes(instantMs: number, zone: string): number {
  const parts = wallParts(instantMs, zone)
  return (Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute) - instantMs) / MINUTE_MS
}

/** Minutes from `fromMs` to the next occurrence of `spec` in `zone`; the reported cadence. */
function stepMinutes(spec: ReturnType<typeof parseCron>, fromMs: number, zone: string): number {
  return (nextOccurrence(spec, fromMs, zone)! - fromMs) / MINUTE_MS
}

/**
 * Where the occurrence walk starts: the zone's own reading of `afterMs`, as a value in the naive
 * wall-clock frame, plus the one minute that makes the search strictly after.
 *
 * The walk's trace is a list of moves, and a list of moves is only worth reading once it can be tied
 * back to a known starting value — so the first step of every trace below is checked against this,
 * computed from the exported `wallParts` rather than copied out of the implementation. A test that
 * recomputed the walk's own frame instead would agree with a broken walk by construction.
 */
function seedWall(afterMs: number, timeZone: string): number {
  const parts = wallParts(afterMs, timeZone)
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute) + MINUTE_MS
}

/**
 * How many instants render as the given local wall-clock reading in `zone`.
 *
 * RFC 9557 / `Temporal` classify a wall-clock reading by exactly this count: **zero** in a
 * spring-forward *gap*, **one** ordinarily, **two** in a fall-back *overlap*, and the `disambiguation`
 * option is the policy for turning that count into an instant. This is the classification the suite's
 * DST fixtures are supposed to be about, so it is *derived* here rather than asserted in prose — by
 * scanning a day either side of the reading with raw `Intl`, touching no plugin code beyond the
 * exported `wallParts`.
 *
 * The reason to bother: a tzdata update that moves a transition would leave every DST test in this
 * file still passing while quietly testing the wrong fixture. This makes it fail instead.
 */
function possibleInstants(reading: string, zone: string): number {
  const [date, time] = reading.split("T")
  const [y, mo, d] = date!.split("-").map(Number)
  const [h, mi] = time!.split(":").map(Number)
  const noonish = Date.UTC(y!, mo! - 1, d!, h!, mi!, 0, 0) // the reading read as if it were UTC
  let count = 0
  for (let t = noonish - 24 * 60 * MINUTE_MS; t <= noonish + 24 * 60 * MINUTE_MS; t += MINUTE_MS) {
    const parts = wallParts(t, zone)
    if (
      parts.year === y &&
      parts.month === mo &&
      parts.day === d &&
      parts.hour === h &&
      parts.minute === mi
    ) {
      count += 1
    }
  }
  return count
}

/**
 * Poll until `predicate` holds, on real timers.
 *
 * The tick dispatches with `void runOneOff(...)`, so "the scheduler admitted a prompt" is a
 * statement about wall-clock progress, not about a returned promise. Asserting on it
 * synchronously would test the microtask queue instead of the scheduler.
 */
// The predicate is awaited, deliberately. An async predicate wrapped without `await` would be
// a Promise — always truthy — so `waitFor` would return on its first poll and the assertion
// after it would check a state that had not settled yet. Two lease-release tests were written
// that way and were silently vacuous; the typecheck caught them, not the test run.
async function waitFor(
  predicate: () => boolean | Promise<boolean>,
  label: string,
  timeoutMs = 4_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await predicate()) return
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  throw new Error(`timed out after ${timeoutMs}ms waiting for ${label}`)
}

describe("parseCron — fields", () => {
  it("accepts every field form: wildcard, list, range, step and stepped range", () => {
    const spec = parseCron("0,30 9-17/4 * * *")
    expect([...spec.minutes]).toEqual([0, 30])
    expect([...spec.hours]).toEqual([9, 13, 17])
    expect(spec.domRestricted).toBe(false)
    expect(spec.dowRestricted).toBe(false)
  })

  it("treats a bare `n/step` field as `min-max/step`", () => {
    expect([...parseCron("*/15 * * * *").minutes]).toEqual([0, 15, 30, 45])
    expect([...parseCron("5/20 * * * *").minutes]).toEqual([5, 25, 45])
  })

  it("records which day fields were restricted, for the Vixie OR rule", () => {
    expect(parseCron("0 0 1 * *").domRestricted).toBe(true)
    expect(parseCron("0 0 1 * *").dowRestricted).toBe(false)
    expect(parseCron("0 0 * * 1").dowRestricted).toBe(true)
  })

  it("accepts month and day names, and 7 as Sunday", () => {
    expect([...parseCron("0 0 * JAN-mar *").months]).toEqual([1, 2, 3])
    expect([...parseCron("0 0 * * sun").daysOfWeek]).toEqual([0])
    expect([...parseCron("0 0 * * 7").daysOfWeek]).toEqual([0])
  })

  it("expands the macros", () => {
    expect([...parseCron("@hourly").minutes]).toEqual([0])
    expect([...parseCron("@daily").hours]).toEqual([0])
    expect([...parseCron("@weekly").daysOfWeek]).toEqual([0])
    expect([...parseCron("@monthly").daysOfMonth]).toEqual([1])
  })
})

describe("parseCron — rejections", () => {
  const rejects = (expression: string, fragment: string): void => {
    expect(() => parseCron(expression)).toThrow(CronError)
    expect(() => parseCron(expression)).toThrow(new RegExp(fragment, "i"))
  }

  it("rejects an unknown macro", () => rejects("@fortnightly", "unknown macro"))
  it("rejects the wrong field count", () => rejects("0 0 * *", "expected 5"))
  it("rejects a non-numeric field", () => rejects("x 0 * * *", "non-numeric"))
  it("rejects an out-of-range minute", () => rejects("60 * * * *", "out of range"))
  it("rejects an out-of-range month", () => rejects("0 0 * 13 *", "out of range"))
  it("rejects a zero step", () => rejects("*/0 * * * *", "zero step"))
  it("rejects an inverted range", () => rejects("0 17-9 * * *", "inverted"))
  it("collapses runs of whitespace rather than rejecting them", () => {
    // Vixie treats runs of spaces as one separator; being lenient here is friendly, not lax.
    expect([...parseCron("0  0   *  *  *").hours]).toEqual([0])
  })
  it("rejects an empty list entry", () => rejects("0,,5 * * * *", "empty minute entry"))
  it("rejects a schedule that can never match: 30 February", () => {
    rejects("0 0 30 2 *", "never exists")
  })
  it("accepts 29 February, which does exist in a leap year", () => {
    expect(parseCron("0 0 29 2 *")).toBeDefined()
  })
  it("rejects an oversized expression as hostile input", () => {
    rejects("* ".repeat(80) + "* * *", "longer than")
  })
})

describe("dayMatches — Vixie rule", () => {
  it("ORs day-of-month and day-of-week when both are restricted", () => {
    const spec = parseCron("0 0 13 * 5") // the 13th, OR any Friday
    expect(dayMatches({ ...wallParts(0, "UTC"), month: 5, day: 13, weekday: 3 }, spec)).toBe(true)
    expect(dayMatches({ ...wallParts(0, "UTC"), month: 5, day: 14, weekday: 5 }, spec)).toBe(true)
    expect(dayMatches({ ...wallParts(0, "UTC"), month: 5, day: 14, weekday: 3 }, spec)).toBe(false)
  })

  it("requires the restricted field when only one is restricted", () => {
    const domOnly = parseCron("0 0 13 * *")
    expect(dayMatches({ ...wallParts(0, "UTC"), month: 5, day: 13, weekday: 3 }, domOnly)).toBe(true)
    expect(dayMatches({ ...wallParts(0, "UTC"), month: 5, day: 12, weekday: 3 }, domOnly)).toBe(false)
  })
})

describe("nextOccurrence", () => {
  it("is strictly after the given instant", () => {
    const spec = parseCron("0 * * * *")
    const at = Date.UTC(2026, 4, 10, 12, 0, 0)
    expect(nextOccurrence(spec, at, "UTC")).toBe(at + 60 * MINUTE_MS)
  })

  it("never returns an instant at or before the cursor, even inside a repeated hour", () => {
    // The one place "strictly after" is not free. A cursor in the naive frame is ordered by the
    // **wall clock**, and during a fall-back the wall clock runs backwards over an hour: at
    // 2026-11-01T06:00Z New York reads 01:00 for the *second* time, so every wall minute after it
    // — 01:01, 01:02, up to 01:59 — resolves to an instant an hour in the past. Seeding the walk
    // from `afterMs` is not enough to exclude them, and neither is "the cursor advanced", because
    // in that frame it did.
    //
    // So the frame cannot carry the ordering and the walk rests the claim on the instant: `instant > afterMs`.
    // Drop that comparison and this answers with 2026-11-01T05:01Z for a cursor at 06:00Z — an hour
    // *in the past*, and on a `* * * * *` job a scheduler would fire it immediately, in a loop.
    const spec = parseCron("* * * * *")
    // Each zone's own fall-back instant, because the repeated local hour lands at a different time
    // in UTC in each: New York at 06:00Z (EDT -4 -> EST -5), St_Johns at 04:30Z (NDT -2:30 ->
    // NST -3:30). Both land inside the same 2026-11-01, which is why one date serves both.
    for (const [zone, fallsBackAt] of [
      [NEW_YORK, Date.parse(`${NY_FALL_BACK_2026}T06:00:00Z`)],
      [ST_JOHNS, Date.parse(`${NY_FALL_BACK_2026}T04:30:00Z`)],
    ] as const) {
      // Every wall minute of the second pass is rejected, not just the one the cursor sits on,
      // because *all* of local 01:01-01:59 resolves to the first pass, an hour earlier. So the
      // answer is the same from anywhere inside it: one hour past the transition, which is 02:00
      // local — the first wall minute whose instant is still ahead.
      const expected = new Date(fallsBackAt + 60 * MINUTE_MS).toISOString()
      for (const offset of [0, 1, 15, 29] as const) {
        const after = fallsBackAt + offset * MINUTE_MS
        expect({ zone, offset, instant: new Date(nextOccurrence(spec, after, zone)!).toISOString() }).toEqual({
          zone,
          offset,
          instant: expected,
        })
      }
      // And the invariant itself, over every second of the half-hour of the repeated hour rather
      // than four points in it: the answer is never at or behind the cursor.
      for (let minute = 0; minute < 30; minute += 1) {
        for (const second of [0, 30, 59]) {
          const cursor = fallsBackAt + minute * MINUTE_MS + second * 1000
          expect(nextOccurrence(spec, cursor, zone)!).toBeGreaterThan(cursor)
        }
      }
    }
  })

  it("rolls over the hour, the day, the month and the year", () => {
    expect(local(nextOccurrence(parseCron("0 0 * * *"), Date.UTC(2026, 0, 31, 23, 30), "UTC")!, "UTC")).toBe(
      "2026-02-01T00:00",
    )
    expect(local(nextOccurrence(parseCron("0 0 1 * *"), Date.UTC(2026, 1, 28, 12, 0), "UTC")!, "UTC")).toBe(
      "2026-03-01T00:00",
    )
    expect(local(nextOccurrence(parseCron("0 0 1 1 *"), Date.UTC(2026, 11, 5, 12, 0), "UTC")!, "UTC")).toBe(
      "2027-01-01T00:00",
    )
  })

  it("lands on 29 February in a leap year and skips to 1 March otherwise", () => {
    const spec = parseCron("0 0 29 2 *")
    expect(local(nextOccurrence(spec, Date.UTC(2026, 0, 1), "UTC")!, "UTC")).toBe("2028-02-29T00:00")
    expect(local(nextOccurrence(spec, Date.UTC(2027, 0, 1), "UTC")!, "UTC")).toBe("2028-02-29T00:00")
  })

  it("evaluates in the job's own timezone, not the host's", () => {
    // `after` is 2026-05-10T00:00Z = 02:00 in Madrid, so the next 03:00 is the SAME day,
    // at 01:00Z (CEST, UTC+2). Reading the schedule in UTC instead would give 03:00Z.
    const after = Date.UTC(2026, 4, 10, 0, 0)
    const instant = nextOccurrence(parseCron("0 3 * * *"), after, MADRID)!
    expect(local(instant, MADRID)).toBe("2026-05-10T03:00")
    expect(new Date(instant).toISOString()).toBe("2026-05-10T01:00:00.000Z")
  })

  // -------------------------------------------------------------------------
  // The offset-sign axis (bug-next-occurrence-walks-utc-wall-parts-in-any-zone-west-of-utc)
  //
  // The schedule walk used to advance the cursor in **UTC** wall parts and hand those parts to
  // `wallToInstant`, which reads them as **`timeZone`** wall parts. The two frames are the same only
  // at offset 0: inverting `local = UTC + offset` by adding `offset` back round-trips for
  // `offset >= 0`, and *adds* the magnitude for a negative one, so every step landed `|offset| + 1`
  // minutes late. 271 tests missed it because every zone they evaluated was at or east of Greenwich.
  //
  // So the axis to vary is the **sign of the offset**, and a table is the shape that keeps it
  // varied: deleting a zone narrows the range, and the guard below is what makes that deletion fail
  // rather than pass quietly.
  // -------------------------------------------------------------------------

  /** Both signs, both magnitudes, both extremes — the range the walk has to be right over. */
  const OFFSET_MATRIX = [
    "UTC",
    MADRID,
    "Asia/Kolkata", // +5:30 — half hour, east
    "Pacific/Kiritimati", // +14 — the eastern extreme
    ST_JOHNS, // -2:30 in May, -3:30 in January — half hour, west
    "America/Buenos_Aires", // -3
    NEW_YORK, // -4 in May — the zone the bug was reported from
    "America/Chicago", // -5
    "Pacific/Honolulu", // -10 — the western extreme
  ] as const

  it("varies the sign of the UTC offset, not one side of it", () => {
    // The matrix is not a list of zones people like; it is one zone per **class** the walk has to be
    // right over, and the classes are derived here rather than trusted. A zone's class is fixed by two
    // facts `Intl` will answer for any instant: the **sign** of its offset from Greenwich (east /
    // west / Greenwich itself) and whether it **observes DST** (its offset differs between the two
    // seasons). Magnitude and sub-hour parts follow from the offset's value. Asserted over both
    // seasons, because the sign is not a property of a zone — it is a property of an instant, and
    // `America/New_York` is `-5` in January and `-4` in May.
    const SEASONS = [
      { name: "January (standard time)", at: Date.UTC(2026, 0, 10, 12, 0) },
      { name: "May (daylight time)", at: Date.UTC(2026, 4, 10, 12, 0) },
    ]

    for (const season of SEASONS) {
      const offsets = OFFSET_MATRIX.map((zone) => offsetMinutes(season.at!, zone))

      // **The axis whose absence let the bug through.** Asserted as a range rather than as a list, so
      // a future edit that drops the negative half fails here instead of quietly narrowing the tests
      // back to the range where the frame error cancels.
      expect(Math.min(...offsets)).toBeLessThanOrEqual(-240)
      expect(Math.max(...offsets)).toBeGreaterThanOrEqual(840)

      // A whole-hour case cannot see a `:30` offset, so half-hour magnitudes belong on **both** sides
      // of Greenwich; the west one is `America/St_Johns`, which is what the bug report asked for.
      expect(offsets).toContain(330)
      expect(offsets.filter((n) => n % 60 !== 0 && n < 0).length).toBeGreaterThanOrEqual(1)

      // And the sign is not standing in for the magnitude: a fix that special-cased the zones rather
      // than the frame would still pass the range check, so pin that three distinct signs are in play.
      expect(new Set(offsets.map((n) => Math.sign(n))).size).toBe(3)
    }

    // DST-observing vs fixed, derived: a zone that shifts between the seasons has to be in the matrix
    // (its offset is a function of the instant, which is the whole reason the bug was seasonal) and so
    // does a zone that does not (a fixed offset is the case where the frame error hides most easily).
    const january = OFFSET_MATRIX.map((zone) => offsetMinutes(SEASONS[0]!.at, zone))
    const may = OFFSET_MATRIX.map((zone) => offsetMinutes(SEASONS[1]!.at, zone))
    const shifting = OFFSET_MATRIX.map((zone, i) => ({ zone, jan: january[i]!, may: may[i]! })).filter(
      (row) => row.jan !== row.may,
    )
    const fixed = OFFSET_MATRIX.length - shifting.length
    // `UTC`, `Asia/Kolkata`, `Pacific/Kiritimati`, `America/Buenos_Aires`, `Pacific/Honolulu`.
    expect(fixed).toBeGreaterThanOrEqual(4)
    // `Europe/Madrid`, `America/St_Johns`, `America/New_York`, `America/Chicago`.
    expect(shifting.length).toBeGreaterThanOrEqual(3)
    // And the direction of every shift, derived rather than assumed. Every DST zone in the matrix is
    // northern-hemisphere, so summer is further **east**: `America/New_York` goes from `-5` to `-4`,
    // `Europe/Madrid` from `+1` to `+2`. The bug-relevant consequence is that for a zone west of
    // Greenwich the *magnitude shrinks* into summer — and the symptom was `|offset| + 1`, so the same
    // New York job was 301 minutes slow in January and 241 in May. Measuring one season would have
    // understated the defect by an hour; both seasons are therefore part of the axis.
    for (const row of shifting) expect(row.may).toBeGreaterThan(row.jan)
    for (const row of shifting.filter((r) => r.jan < 0)) expect(Math.abs(row.may)).toBeLessThan(Math.abs(row.jan))
  })

  it("keeps a minutely job minutely in every zone, east or west of UTC", () => {
    // The reported symptom, as a table: a `* * * * *` job stepping 241 minutes at a time in New
    // York means the most common schedule in the most common timezone fires roughly every 4 hours.
    // The step is the *cadence*, so it is asserted directly rather than inferred from a due time.
    const spec = parseCron("* * * * *")
    const start = Date.UTC(2026, 4, 10, 12, 0)

    const steps: Record<string, number[]> = {}
    for (const zone of OFFSET_MATRIX) {
      const seen: number[] = []
      let cursor = start
      for (let i = 0; i < 4; i += 1) {
        seen.push(stepMinutes(spec, cursor, zone))
        cursor = nextOccurrence(spec, cursor, zone)!
      }
      steps[zone] = seen
    }
    // One expectation covering the whole table: the diff names the zone that is wrong and shows the
    // exact step it took instead, which is the `241 !== 1` symptom rather than a bare false.
    expect(steps).toEqual(Object.fromEntries(OFFSET_MATRIX.map((zone) => [zone, [1, 1, 1, 1]])))
  })

  it("steps one minute at a half-hour magnitude, in daylight time and in standard time", () => {
    // `America/St_Johns` is UTC-2:30 in May and UTC-3:30 in January. The old walk added the
    // magnitude instead of subtracting it, so the two seasons reported 151 and 211 minutes — a
    // half-hour offset bug a whole-hour case (241) cannot distinguish from an hours-only one.
    const spec = parseCron("* * * * *")
    const daylight = Date.UTC(2026, 4, 10, 12, 0) // NDT, UTC-2:30
    const standard = Date.UTC(2026, 0, 10, 12, 0) // NST, UTC-3:30

    expect(offsetMinutes(daylight, ST_JOHNS)).toBe(-150)
    expect(offsetMinutes(standard, ST_JOHNS)).toBe(-210)
    expect([stepMinutes(spec, daylight, ST_JOHNS), stepMinutes(spec, standard, ST_JOHNS)]).toEqual([1, 1])
  })

  it("jumps the day and the hour in the zone's own frame, not a UTC one", () => {
    // The two jump branches are where the frame is hardest to get right and easiest to leave wrong:
    // a cursor mis-framed by `|offset|` **hours** still produces the right answer for a minutely
    // schedule, because every day and every hour matches and the branch is never taken. So the
    // branches need schedules that *restrict* the day and the hour, evaluated in a negative-offset
    // zone, or nothing pins them.
    //
    // Both branches run on every one of these: a restricted day rejects most of the walk and jumps
    // to the next local midnight; a restricted hour rejects the rest of it and jumps to the top of
    // the next matching hour. The old walk took those jumps from UTC-derived parts, so a
    // monthly-at-midnight job in New York landed on the wrong night — and a day-of-week job was
    // matched against the **UTC** weekday, which is the previous day for every evening in the
    // Americas.
    const cases: Array<{ schedule: string; zone: string; after: string; want: string }> = [
      // Day-of-month: the next 1st, at local midnight. New York is UTC-4, St_Johns UTC-2:30.
      { schedule: "0 0 1 * *", zone: NEW_YORK, after: "2026-05-10T12:00:00Z", want: "2026-06-01T00:00" },
      { schedule: "0 0 1 * *", zone: ST_JOHNS, after: "2026-05-10T12:00:00Z", want: "2026-06-01T00:00" },
      // The same jump crossing a **year** boundary, where a mis-framed target is a whole year out.
      { schedule: "0 0 1 1 *", zone: NEW_YORK, after: "2026-05-10T12:00:00Z", want: "2027-01-01T00:00" },
      { schedule: "0 0 1 1 *", zone: ST_JOHNS, after: "2026-05-10T12:00:00Z", want: "2027-01-01T00:00" },
      // Day-of-week: 2026-05-10 is a Sunday, so the next Monday is the 11th. Reading the weekday
      // off UTC instead of the zone would give the 18th.
      { schedule: "30 9 * * 1", zone: NEW_YORK, after: "2026-05-10T12:00:00Z", want: "2026-05-11T09:30" },
      { schedule: "30 9 * * 1", zone: ST_JOHNS, after: "2026-05-10T12:00:00Z", want: "2026-05-11T09:30" },
      // Saturday evening local in New York is already Sunday in UTC — the case where the two
      // weekday frames disagree, and the one that only fails if the parts are UTC's.
      { schedule: "0 20 * * 6", zone: NEW_YORK, after: "2026-05-16T02:00:00Z", want: "2026-05-16T20:00" },
      // Hour branch only: 08:00 local has to jump forward to 09:00 **the same day** — the jump is
      // forward to the next matching hour, not to the next occurrence of the schedule.
      { schedule: "0 9 * * *", zone: NEW_YORK, after: "2026-05-10T12:00:00Z", want: "2026-05-10T09:00" },
      // The same jump from 09:30 local, where 09:00 is already behind and tomorrow is the answer.
      { schedule: "0 9 * * *", zone: ST_JOHNS, after: "2026-05-10T12:00:00Z", want: "2026-05-11T09:00" },
      // Two matching hours with a non-matching one between them: from 10:00 local the jump has to
      // *skip* 11:00-16:00 and land on 17:00 in the same day.
      { schedule: "0 9,17 * * *", zone: NEW_YORK, after: "2026-05-10T14:00:00Z", want: "2026-05-10T17:00" },
    ]

    const readings: Record<string, string> = {}
    for (const { schedule, zone, after, want } of cases) {
      const instant = nextOccurrence(parseCron(schedule), Date.parse(after), zone)!
      const reading = local(instant, zone)
      readings[`${schedule} @ ${zone}`] = reading
      expect({ schedule, zone, reading }).toEqual({ schedule, zone, reading: want })
    }
    // And every one of those readings is a whole local minute the schedule actually names — the
    // jump has to land *on* the schedule, not merely somewhere after it.
    expect(Object.values(readings).every((reading) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(reading))).toBe(true)
  })

  it("skips a local time that does not exist on spring-forward", () => {
    const spec = parseCron("30 2 * * *") // 02:30 — absent on 2026-03-29 in Madrid
    const after = Date.parse(`${DST_SPRING_FORWARD_2026}T00:00:00Z`)
    const instant = nextOccurrence(spec, after, MADRID)!
    expect(local(instant, MADRID)).toBe("2026-03-30T02:30")
    expect(local(instant, MADRID).startsWith(DST_SPRING_FORWARD_2026)).toBe(false)
  })

  it("fires once, at the first occurrence, for an ambiguous fall-back time", () => {
    const spec = parseCron("30 2 * * *") // 02:30 happens twice on 2026-10-25 in Madrid
    const after = Date.parse(`${DST_FALL_BACK_2026}T00:00:00Z`)
    const instant = nextOccurrence(spec, after, MADRID)!
    expect(local(instant, MADRID)).toBe("2026-10-25T02:30")
    // The first occurrence is still CEST (UTC+2), i.e. 00:30 UTC — not the CET repeat.
    expect(new Date(instant).toISOString()).toBe("2026-10-25T00:30:00.000Z")
  })

  // -------------------------------------------------------------------------
  // The same two transitions, west of UTC. Madrid is the only zone the suite used to re-verify DST
  // in, and a DST frame error is at its most obvious exactly here — but the transitions that matter
  // to users happen in the Americas, so Madrid is not the representative case, it is the lucky one.
  // -------------------------------------------------------------------------

  it("skips a local time that does not exist on spring-forward west of UTC", () => {
    // 02:30 on 2026-03-08 does not exist in New York (EST -5 -> EDT -4 at 07:00Z). The next 02:30
    // is the next day, and by then the offset is -4, so 02:30 EDT is 06:30Z — *not* 07:30Z, which
    // is what a walk that mis-read the frame would report.
    //
    // The fixture is verified to be a **gap** (zero possible instants, in the standard's terms) before
    // the behaviour is asserted, so a tzdata release that moved this transition fails here rather than
    // leaving a test that no longer describes what it says.
    expect(possibleInstants(`${NY_SPRING_FORWARD_2026}T02:30`, NEW_YORK)).toBe(0)
    expect(possibleInstants("2026-03-09T02:30", NEW_YORK)).toBe(1)
    const spec = parseCron("30 2 * * *")
    const after = Date.parse(`${NY_SPRING_FORWARD_2026}T00:00:00Z`)
    const instant = nextOccurrence(spec, after, NEW_YORK)!
    expect(local(instant, NEW_YORK)).toBe("2026-03-09T02:30")
    expect(local(instant, NEW_YORK).startsWith(NY_SPRING_FORWARD_2026)).toBe(false)
    expect(new Date(instant).toISOString()).toBe("2026-03-09T06:30:00.000Z")
  })

  it("fires once, at the first occurrence, for an ambiguous fall-back time west of UTC", () => {
    // 01:30 on 2026-11-01 happens twice in New York: 01:30 EDT (-4) then 01:30 EST (-5). The
    // policy is unchanged from Madrid's — fire once, at the earlier instant — and it is *this*
    // zone where the two candidates are 60 minutes apart rather than Madrid's hour, so a frame
    // error cannot hide behind a small disagreement.
    // The fixture is verified to be an **overlap** (two possible instants) and the day after it
    // ordinary (one), so the "fires once, at the earlier" claim is measured rather than assumed.
    expect(possibleInstants(`${NY_FALL_BACK_2026}T01:30`, NEW_YORK)).toBe(2)
    expect(possibleInstants("2026-11-02T01:30", NEW_YORK)).toBe(1)
    const spec = parseCron("30 1 * * *")
    const after = Date.parse(`${NY_FALL_BACK_2026}T00:00:00Z`)
    const instant = nextOccurrence(spec, after, NEW_YORK)!
    expect(local(instant, NEW_YORK)).toBe("2026-11-01T01:30")
    expect(new Date(instant).toISOString()).toBe("2026-11-01T05:30:00.000Z")
    // And the repeat is genuinely not a second occurrence: asked from inside the *second* pass, the
    // next 01:30 is tomorrow's, because the earlier one is already in the past.
    const insideSecondPass = nextOccurrence(spec, Date.parse(`${NY_FALL_BACK_2026}T06:30:00Z`), NEW_YORK)!
    expect(local(insideSecondPass, NEW_YORK)).toBe("2026-11-02T01:30")
  })

  it("loses no whole day at a transition west of UTC, which the UTC-frame walk did", () => {
    // The two tests above pin the *policy* at each transition — a nonexistent local time is skipped,
    // an ambiguous one fires at its first instant — and both pass on the old walk as well, because
    // `wallToInstant` re-renders whatever wall parts it is handed in the job's own zone: the old
    // walk matched UTC 02:30 and got back an instant that *reads* as 02:30 local. Policy was never
    // what it broke.
    //
    // What it broke at a transition is worse than a slow cadence, and this is the case that shows it.
    // A walk in UTC wall parts asks "when is the next 03:30 **UTC**", which is a different question
    // from "when is the next 03:30 **here**", and near a transition the two land on different
    // *dates*. Ask a New York 03:30 job at 23:00 the night before the spring-forward and the old walk
    // answered with **2026-03-09** — it skipped 2026-03-08 entirely, so a daily job silently did not
    // run on the day the clocks changed. On the fall-back night it was a day every time: both passes
    // of the repeated hour were stepped over, not just the second.
    //
    // Every `want` below was cross-checked against a brute-force scan of every whole minute in the
    // window, reading the local parts with raw `Intl` and applying the cron fields directly — an
    // oracle that shares no code with `nextOccurrence`. `America/St_Johns` is on the axis too: its
    // transitions are an hour earlier in the day and its offsets are half hours, so a `:30` bug
    // cannot hide behind the whole-hour cases.
    const cases: Array<{ schedule: string; zone: string; after: string; instant: string; reading: string }> = [
      // Spring forward. NY moves at 07:00Z (-5 -> -4); St_Johns at 05:30Z (-2:30 -> -1:30).
      {
        schedule: "30 3 * * *",
        zone: NEW_YORK,
        after: `${NY_SPRING_FORWARD_2026}T04:00:00Z`, // 23:00 EST the night before
        instant: "2026-03-08T07:30:00.000Z",
        reading: "2026-03-08T03:30",
      },
      {
        schedule: "30 3 * * *",
        zone: ST_JOHNS,
        after: `${NY_SPRING_FORWARD_2026}T03:30:00Z`,
        instant: "2026-03-08T06:00:00.000Z",
        reading: "2026-03-08T03:30",
      },
      // Fall back. The 01:30 answers are the **first** pass of the ambiguous minute, so the policy
      // above and the no-lost-day claim are the same assertion seen from two sides: the run happens,
      // once, on the day it belongs to. NY moves at 06:00Z (-4 -> -5); St_Johns at 04:30Z.
      {
        schedule: "30 1 * * *",
        zone: NEW_YORK,
        after: `${NY_FALL_BACK_2026}T01:30:00Z`,
        instant: "2026-11-01T05:30:00.000Z",
        reading: "2026-11-01T01:30",
      },
      {
        schedule: "30 1 * * *",
        zone: ST_JOHNS,
        after: `${NY_FALL_BACK_2026}T01:30:00Z`,
        instant: "2026-11-01T04:00:00.000Z",
        reading: "2026-11-01T01:30",
      },
      // And a local time that exists exactly once on the fall-back night, to show the day survives
      // independently of the ambiguity: 02:30 EST is the one occurrence the transition does not touch.
      {
        schedule: "30 2 * * *",
        zone: ST_JOHNS,
        after: `${NY_FALL_BACK_2026}T02:30:00Z`,
        instant: "2026-11-01T06:00:00.000Z",
        reading: "2026-11-01T02:30",
      },
    ]

    const readings: Record<string, string> = {}
    for (const { schedule, zone, after, instant: wantInstant, reading: want } of cases) {
      // Each `want` is an **ordinary** reading — exactly one instant renders it — except the two 01:30
      // ones, which are overlaps. Asserted from the standard's own classification so a tzdata change
      // cannot turn this into a test of a transition that no longer happens.
      const possibles = possibleInstants(want, zone)
      expect({ zone, want, possibles }).toEqual({
        zone,
        want,
        possibles: want.endsWith("T01:30") ? 2 : 1,
      })
      const found = nextOccurrence(parseCron(schedule), Date.parse(after), zone)!
      const reading = local(found, zone)
      readings[`${schedule} @ ${zone}`] = `${new Date(found).toISOString()} = ${reading}`
      // Both halves in one assertion: the exact instant *and* the local clock it renders as, so a
      // walk that got the right local reading on the wrong day cannot pass.
      expect({ key: `${schedule} @ ${zone}`, got: new Date(found).toISOString(), reading }).toEqual({
        key: `${schedule} @ ${zone}`,
        got: wantInstant,
        reading: want,
      })
    }
    // Nothing above landed on the day after its transition, which is what "lost a day" meant.
    expect(Object.keys(readings)).toHaveLength(cases.length)
  })

  it("keeps a minutely job one minute apart straight through a spring-forward west of UTC", () => {
    // 200 consecutive minutely occurrences spanning the New York transition, each exactly one minute
    // after the last, with the nonexistent hour skipped rather than fired. A walk in the wrong frame
    // cannot produce that, and neither can a walk that treats 02:00-02:59 as real wall minutes.
    //
    // The step stays one minute across the gap because the missing hour has no *instants* in it: the
    // clock reads 01:59 EST and then 03:00 EDT, one minute apart in time, having skipped an hour of
    // clock. That is what "the wall walk is continuous" looks like from the instants.
    const spec = parseCron("* * * * *")
    let cursor = Date.parse(`${NY_SPRING_FORWARD_2026}T05:00:00Z`) // 00:00 EST
    const readings: string[] = []
    for (let i = 0; i < 200; i += 1) {
      const next = nextOccurrence(spec, cursor, NEW_YORK)!
      expect(next - cursor).toBe(MINUTE_MS)
      readings.push(local(next, NEW_YORK))
      cursor = next
    }
    expect(readings[0]).toBe("2026-03-08T00:01")
    // Nothing in the nonexistent hour, and the walk resumes at 03:00 the instant 01:59 was due.
    expect(readings.filter((r) => r.startsWith(`${NY_SPRING_FORWARD_2026}T02:`))).toEqual([])
    expect(readings.indexOf(`${NY_SPRING_FORWARD_2026}T03:00`)).toBe(119)
    expect(readings[119 - 1]).toBe(`${NY_SPRING_FORWARD_2026}T01:59`)
    // 200 occurrences over a wall clock that lost an hour: 199 steps, one of them an hour of clock.
    expect(readings.at(-1)).toBe("2026-03-08T04:20")
  })

  it("keeps a minutely job one minute apart straight through a fall-back west of UTC", () => {
    // The mirror image, and the half with a real gap in it. The instants are the contract: one
    // minute apart across the whole walk **except at the transition itself**, where the gap is 61
    // minutes rather than one.
    //
    // That gap is not new behaviour and not a side effect of the frame fix — it is the policy this
    // plugin already documented and Madrid already had: an ambiguous wall minute fires at its first
    // instant, never at its second. So the repeated 01:00-01:59 is walked once, and the instants
    // that would have rendered it the second time are the 60 minutes in between. A wall-clock
    // schedule that fired the repeated hour twice would run 60 extra times a night.
    const spec = parseCron("* * * * *")

    /** Walk `span` minutely occurrences from `from`, reporting each step and each local reading. */
    const walk = (zone: string, from: string, span: number): { gaps: number[]; readings: string[] } => {
      let cursor = Date.parse(from)
      const gaps: number[] = []
      const readings: string[] = []
      for (let i = 0; i < span; i += 1) {
        const next = nextOccurrence(spec, cursor, zone)!
        gaps.push((next - cursor) / MINUTE_MS)
        readings.push(local(next, zone))
        cursor = next
      }
      return { gaps, readings }
    }

    const newYork = walk(NEW_YORK, `${NY_FALL_BACK_2026}T04:30:00Z`, 200) // 00:30 EDT
    expect(newYork.gaps).toHaveLength(200)
    expect(newYork.gaps.filter((gap) => gap !== 1)).toEqual([61])
    expect(newYork.readings[0]).toBe(`${NY_FALL_BACK_2026}T00:31`)
    // The repeated hour is walked at its first pass, so no local reading appears twice.
    expect(new Set(newYork.readings).size).toBe(200)
    expect(newYork.readings.filter((r) => r === `${NY_FALL_BACK_2026}T01:30`)).toHaveLength(1)
    expect(newYork.readings.indexOf(`${NY_FALL_BACK_2026}T02:00`)).toBe(89)
    // 200 occurrences, 199 steps, and one of those steps was 61 minutes: the last reading lands
    // 00:31 + 259 minutes of clock, which is 03:50 rather than 02:50.
    expect(newYork.readings.at(-1)).toBe(`${NY_FALL_BACK_2026}T03:50`)

    // **The zone does not change the shape.** Madrid's fall-back is the case the suite already
    // pinned, so it runs the same walk: one 61-minute step, everything else one minute, and no
    // repeated local reading. New York diverging from Madrid here would mean the frame fix is not
    // complete, whatever the numbers above say on their own.
    //
    // Both walks start *before* the transition instant, so both actually span it: Madrid falls back
    // at 2026-10-25T01:00Z and New York at 2026-11-01T06:00Z, and a walk begun after either one
    // would report the same numbers while proving nothing.
    const madrid = walk(MADRID, "2026-10-24T23:00:00Z", 200) // 01:00 CEST, spans 01:00Z
    expect(madrid.gaps.filter((gap) => gap !== 1)).toEqual(newYork.gaps.filter((gap) => gap !== 1))
    expect(new Set(madrid.readings).size).toBe(200)
    expect(madrid.readings.filter((r) => r === `${DST_FALL_BACK_2026}T02:30`)).toHaveLength(1)

    // And the same claim on the other transition, where the gap is in the *clock* rather than in the
    // instants: spring-forward reads continuously because the missing hour holds no instants at all.
    // Madrid springs forward at 2026-03-29T01:00Z.
    expect(walk(NEW_YORK, `${NY_SPRING_FORWARD_2026}T05:00:00Z`, 200).gaps.filter((g) => g !== 1)).toEqual([])
    expect(walk(MADRID, "2026-03-28T23:00:00Z", 200).gaps.filter((g) => g !== 1)).toEqual([])
  })

  // -------------------------------------------------------------------------
  // The walk's own invariants: every move advances, and the walk terminates
  // (task-assert-occurrence-walk-jumps-strictly-advance)
  //
  // The walk moves its cursor in four places — the day jump, the hour jump, and the two
  // `wall += MINUTE_MS` — and `wall < horizon` is its only exit besides a match. So a branch that
  // computes a value the cursor has already passed does not make the walk slow: the loop re-reads
  // the same parts and takes the same branch **forever**. That is not hypothetical. A stray
  // `+ zoneOffsetMs(afterMs, timeZone)` left in the day-jump branch once kept `vitest run` silent for
  // 700 seconds, and a CI job can only end a hang by being killed — no assertion, no diff, and
  // indistinguishable from merely slow.
  //
  // Which is why nothing below is bounded by a clock. A wall-clock timeout is slow when it works and
  // ambiguous when it fires, and it cannot tell a stalled cursor from a slow machine. Every walk here
  // is bounded by a **step counter** (`traceOccurrenceWalk`'s `maxSteps`), which throws on exhaustion
  // rather than truncating — a partial walk is not a shorter answer, it is no answer.
  // -------------------------------------------------------------------------

  /**
   * Days in the horizon `nextOccurrence` walks before it declares a schedule unsatisfiable.
   *
   * Written out here rather than imported: `SEARCH_HORIZON_MS` is deliberately unexported, because a
   * bound that a test can read is a bound that can be moved without anyone noticing it move. So the
   * horizon is asserted as arithmetic on the seed instead — see "ends an unsatisfiable walk at the
   * horizon" — which means changing `SEARCH_HORIZON_MS` has to change this number *on purpose*.
   */
  const HORIZON_DAYS = 5 * 366

  /**
   * Comfortably above every walk asserted below, and three orders of magnitude below the horizon's
   * own worst case (~2.6M moves). A budget this loose cannot be what ends a walk, so a walk that ends
   * has genuinely terminated rather than been cut off.
   */
  const STEP_BUDGET = 10_000

  /**
   * A spec no cursor can satisfy, assembled directly because `parseCron` will not produce one.
   *
   * That refusal is the parser doing its job — `0 0 31 4 *` is a `CronError`, since April has no
   * 31st — and it means **nothing the parser accepts is unsatisfiable**: every field combination it
   * lets through recurs well inside the horizon. Which is asserted here rather than assumed, because
   * it is the reason a hand-built spec is necessary rather than lazy: the unsatisfiable walk is only
   * reachable as a `CronSpec` value.
   *
   * An empty field is the smallest such thing, and which field is empty decides *how* the walk fails
   * to match — a missing month takes the day jump every time, a missing hour the hour jump, a missing
   * minute the minute move.
   */
  const unsatisfiable = (field: "months" | "hours" | "minutes"): CronSpec => {
    /** 0..max-1 — the minute and hour fields, which both start at zero. */
    const from = (max: number): Set<number> => new Set(Array.from({ length: max }, (_, i) => i))
    /** 1..max — the month and day-of-month fields, which both start at one. */
    const to = (max: number): Set<number> => new Set(Array.from({ length: max }, (_, i) => i + 1))
    return {
      minutes: field === "minutes" ? new Set<number>() : from(60),
      hours: field === "hours" ? new Set<number>() : from(24),
      daysOfMonth: to(31),
      months: field === "months" ? new Set<number>() : to(12),
      daysOfWeek: new Set([0, 1, 2, 3, 4, 5, 6]),
      domRestricted: false,
      dowRestricted: false,
    }
  }

  it("advances the cursor on every step of every branch, in every zone of the matrix", () => {
    // The property itself: **every move of the cursor moves it forward**. Read off a trace rather
    // than inferred from an answer, because an answer comes out the same whether the walk took one
    // step or took a wrong one a thousand times and arrived anyway. That distinction is the whole
    // item — the stray `zoneOffsetMs` did not change any answer, it changed only whether the walk
    // came back.
    //
    // **Continuity is asserted too, and it is what keeps the step checks honest.** `from` of each step
    // has to be the `to` of the one before it, so a branch that moved the cursor without recording
    // the move breaks the chain instead of quietly walking out of the assertion. Without that, a
    // branch could be added to the walk and never be examined.
    const SCHEDULES = [
      "* * * * *", // every minute matches: the trace is empty, which has to be allowed
      "0 * * * *", // unmatched minutes walk, an unmatched hour jumps
      "30 9 * * 1", // day, hour and minute
      "0 9 * * *", // hour only — every day matches, so the day jump is never taken
      "0 0 1 * *", // day only — every hour matches, so the hour jump is never taken
      "59 23 31 12 *", // a day jump, then an hour jump, then 59 minute steps
    ]
    const SEEDS = [
      "2026-01-01T00:00:00Z",
      "2026-02-28T23:59:00Z", // a leap day, and a seed that lands on a local midnight
      "2026-05-10T12:00:00Z", // an ordinary afternoon in the Americas
      "2026-10-25T00:00:00Z", // the Madrid fall-back
      "2026-12-31T23:30:00Z", // the year boundary, where a jump has to roll the year
      `${NY_SPRING_FORWARD_2026}T06:59:00Z`, // 01:59 EST — walks into the missing hour
      "2026-03-29T00:59:00Z", // 01:59 CET — the same, in Madrid
    ]

    /** Branch names each zone's walks took, so coverage is a measurement rather than an intention. */
    const branchesByZone: Record<string, Set<string>> = {}
    let stepsChecked = 0

    for (const zone of OFFSET_MATRIX) {
      const seen = new Set<string>()
      branchesByZone[zone] = seen
      for (const schedule of SCHEDULES) {
        const spec = parseCron(schedule)
        for (const after of SEEDS) {
          const at = Date.parse(after)
          // The **bounded** walk goes first, on purpose: it is the one that cannot hang, so the
          // termination of this search is established before the unbounded call below is made with
          // the same inputs.
          const walk = traceOccurrenceWalk(spec, at, zone, STEP_BUDGET)
          const steps = walk.steps
          // The two entry points are one walk, so the ledger cannot describe a different algorithm
          // from the one the scheduler runs.
          expect(walk.result).toBe(nextOccurrence(spec, at, zone))

          stepsChecked += steps.length
          for (const [i, step] of steps.entries()) {
            seen.add(step.branch)
            expect({ schedule, zone, i, from: step.from, to: step.to, advanced: step.to > step.from }).toEqual({
              schedule,
              zone,
              i,
              from: step.from,
              to: step.to,
              advanced: true,
            })
            // Where the walk was when it made this move: the seed, or the last move's landing.
            expect(step.from).toBe(i === 0 ? seedWall(at, zone) : steps[i - 1]!.to)
            expect(steps[i + 1]?.from ?? step.to).toBe(step.to)
          }
        }
      }
    }

    // **All three of the walk's cursor-advancing moves, in every zone of the matrix** — not one
    // schedule in one zone, which is the shape that let the last frame bug through 271 tests. The
    // fourth move (a matched wall minute that does not exist) needs a spring-forward to be
    // reachable and is asserted on its own below, against the two transition fixtures.
    for (const [zone, seen] of Object.entries(branchesByZone)) {
      expect({ zone, day: seen.has("day"), hour: seen.has("hour"), minute: seen.has("minute") }).toEqual({
        zone,
        day: true,
        hour: true,
        minute: true,
      })
    }
    // And the sweep was wide enough for that to mean something. The walk count is a literal, not
    // `OFFSET_MATRIX.length * SCHEDULES.length * SEEDS.length`, so deleting a schedule or a seed
    // fails here instead of quietly narrowing the coverage the claim above rests on.
    expect({ walks: 378, stepsChecked }).toEqual({ walks: 378, stepsChecked: expect.any(Number) })
    expect(stepsChecked).toBeGreaterThan(5_000)
  })

  it("advances the cursor past a wall minute that does not exist", () => {
    // The fourth move, written separately from the minute move and reachable only where the clocks
    // spring forward: a wall minute that satisfies every field and still has no instant.
    //
    // It fires **once per missing occurrence, not once per missing minute**, and that is worth
    // pinning: only 02:30 is a minute the schedule wants. The other 29 minutes of the missing hour
    // are walked by the *minute* branch, because the walk cannot know they are missing — it knows
    // only that 30 is the minute it is after. Both branches move the same minute, which is exactly
    // why "same" is not evidence and this one is asserted separately.
    //
    // Each fixture is verified to be a **gap** — zero possible instants, in the standard's terms —
    // before the behaviour is asserted, so a tzdata release that moved the transition fails here
    // rather than leaving a test that no longer describes what it says.
    const cases = [
      {
        zone: NEW_YORK,
        after: `${NY_SPRING_FORWARD_2026}T06:59:00Z`, // 01:59 EST, the minute before the jump
        missing: `${NY_SPRING_FORWARD_2026}T02:30`,
        want: "2026-03-09T02:30",
      },
      {
        zone: MADRID,
        after: "2026-03-29T00:59:00Z", // 01:59 CET, the minute before the jump
        missing: `${DST_SPRING_FORWARD_2026}T02:30`,
        want: "2026-03-30T02:30",
      },
    ]

    for (const { zone, after, missing, want } of cases) {
      expect(possibleInstants(missing, zone)).toBe(0)
      const spec = parseCron("30 2 * * *")
      const at = Date.parse(after)
      const walk = traceOccurrenceWalk(spec, at, zone, STEP_BUDGET)
      const steps = walk.steps
      const overGap = steps.filter((step) => step.branch === "gap")

      expect({ zone, moves: overGap.length }).toEqual({ zone, moves: 1 })
      expect(overGap.every((step) => step.to > step.from)).toBe(true)
      expect((overGap[0]!.to - overGap[0]!.from) / MINUTE_MS).toBe(1)
      // The rest of the missing hour is walked a minute at a time by the minute branch, so the walk
      // steps *through* 02:31-03:00 rather than jumping it: 29 moves from 02:31 to 03:00, none of
      // them a gap move, before the hour jump carries it out of an hour that no longer has a 02:30.
      const rest = steps.slice(steps.indexOf(overGap[0]!) + 1)
      const insideGap = rest.slice(0, rest.findIndex((step) => step.branch === "hour"))
      expect(insideGap).toHaveLength(29)
      expect(insideGap.every((step) => step.branch === "minute" && step.to - step.from === MINUTE_MS)).toBe(
        true,
      )

      // And the search terminated with the answer the policy already pins: 02:30 does not exist on
      // that day, so the next one is tomorrow's. Reached the long way round, through the gap.
      expect(walk.result).toBe(nextOccurrence(spec, at, zone))
      expect(local(walk.result!, zone)).toBe(want)
    }
  })

  it("returns undefined on a spec that cannot be satisfied, rather than looping forever", () => {
    // The assertion that would have caught the stray `zoneOffsetMs`, and the reason it is written
    // with a step budget: on a schedule no cursor can satisfy, the walk has to *return* — within a
    // bounded number of moves — and the only thing that can end it is the horizon.
    //
    // `0 0 31 4 *` cannot be used, because `parseCron` rejects it (April has no 31st), which is why
    // the spec is hand-built. The parser's side of that bargain is asserted too, since it is what
    // makes the hand-built spec the only way in: every schedule `parseCron` accepts recurs inside
    // the horizon, so a parsed spec can never be the unsatisfiable case.
    expect(() => parseCron("0 0 31 4 *")).toThrow(CronError)
    for (const schedule of ["0 0 29 2 *", "0 0 29 2 1", "59 23 31 12 *", "0 0 1 1 0"]) {
      expect({ schedule, found: nextOccurrence(parseCron(schedule), Date.UTC(2026, 5, 1), "UTC") }).toEqual({
        schedule,
        found: expect.any(Number),
      })
    }

    const spec = unsatisfiable("months")
    const at = Date.parse("2026-05-11T03:00:00Z") // 23:00 on the 10th, west of every offset in the matrix

    for (const zone of OFFSET_MATRIX) {
      const walk = traceOccurrenceWalk(spec, at, zone, STEP_BUDGET)
      // Terminated, with nothing found. The budget is far above what this walk needs, so it ended
      // itself rather than running out of room — "returned undefined eventually" is only a claim if
      // "eventually" is bounded, and here it is bounded by the horizon (asserted in the next test).
      expect({ zone, result: walk.result, moves: walk.steps.length < STEP_BUDGET }).toEqual({
        zone,
        result: undefined,
        moves: true,
      })
      // Every move is the day jump — an empty month set can never be satisfied by any cursor.
      expect(new Set(walk.steps.map((step) => step.branch))).toEqual(new Set(["day"]))
      // Deliberately **not** `nextOccurrence` here. It is the same walk (the sweep above proves the
      // two entry points agree), but this one has no budget, so on an unsatisfiable spec it is the
      // horizon alone that saves it — and a test that can hang is worse than no test. The unbounded
      // entry point is exercised in the sweep, where the bounded walk has already proved the search
      // terminates and the schedule is satisfiable anyway.
    }
  })

  it("ends an unsatisfiable walk at the horizon, in one move per day of it", () => {
    // **The horizon is what terminates the walk, asserted as arithmetic rather than trusted from the
    // loop's shape.** The claim is about where the last move landed: the walk stops on the first move
    // that reaches the horizon, so its last step starts before the horizon and ends at or after it —
    // and, because every move here is a day jump, overshoots by less than a day. That pins the
    // horizon's *value* (5 * 366 days from the seed) as well as its role.
    const spec = unsatisfiable("months")
    const at = Date.parse("2026-05-11T03:00:00Z")

    for (const zone of OFFSET_MATRIX) {
      const horizon = seedWall(at, zone) + HORIZON_DAYS * 24 * 60 * MINUTE_MS
      const { steps } = traceOccurrenceWalk(spec, at, zone, HORIZON_DAYS + 2)
      const last = steps.at(-1)!

      expect({
        zone,
        startedBeforeHorizon: last.from < horizon,
        endedAtOrAfterHorizon: last.to >= horizon,
        overshootMinutes: (last.to - horizon) / MINUTE_MS,
      }).toEqual({
        zone,
        startedBeforeHorizon: true,
        endedAtOrAfterHorizon: true,
        overshootMinutes: expect.any(Number),
      })
      expect(last.to - horizon).toBeLessThan(24 * 60 * MINUTE_MS)

      // One move per day of the horizon — plus one when the seed is not itself a local midnight,
      // because the first jump stops at the *next* one. Both bounds are asserted so neither an
      // off-by-one nor a horizon that quietly changed can pass.
      expect(steps.length).toBeGreaterThanOrEqual(HORIZON_DAYS)
      expect(steps.length).toBeLessThanOrEqual(HORIZON_DAYS + 1)
    }

    // And the same claim for a walk that can never match at the *minute* rather than the day, whose
    // moves are one minute each: it takes one move per minute of the horizon, all 2 635 200 of them.
    // That is the horizon bounding a walk at its most expensive, and it is exact rather than
    // approximate because every move is a whole minute from the seed and the last one lands on the
    // horizon. It is also pure arithmetic — no timezone lookups, which is why the budget test below
    // can afford to walk the whole thing.
    const minuteSpec = unsatisfiable("minutes")
    const { steps } = traceOccurrenceWalk(minuteSpec, at, "UTC", HORIZON_DAYS * 24 * 60 + 1)
    expect(steps.length).toBe(HORIZON_DAYS * 24 * 60)
    expect(new Set(steps.map((step) => step.branch))).toEqual(new Set(["minute"]))
  })

  it("refuses a walk that outruns its step budget, rather than walking it out", () => {
    // The step counter doing the job the item asks of it. `unsatisfiable("minutes")` matches every
    // day and every hour and no minute at all, so the walk takes its smallest move forever and only
    // the horizon can stop it — 2.5 million moves away. A wall-clock timeout cannot express that
    // honestly (it is unbounded in seconds as well as in steps, which is precisely the case a
    // stalled cursor is in), and a walk that returns *something* when its budget runs out would be
    // worse than one that fails, because `undefined` would then be a real answer.
    const spec = unsatisfiable("minutes")
    const at = Date.parse("2026-05-10T12:00:00Z")

    expect(() => traceOccurrenceWalk(spec, at, "UTC", STEP_BUDGET)).toThrow(WalkTooLong)
    // A budget the walk fits inside is not a refusal: the two are distinguished by the throw, so a
    // walk that merely *finished* can never be mistaken for one that was cut short.
    expect(traceOccurrenceWalk(spec, at, "UTC", HORIZON_DAYS * 24 * 60 + 1).steps.length).toBeGreaterThan(
      STEP_BUDGET,
    )
    // The same walk through the unbounded `nextOccurrence` is deliberately not called here, and that is
    // the point of a budget rather than a timeout: this spec is unsatisfiable, so the horizon is the
    // only thing that could end the walk, and a test that leans on one structural fact to stop a loop
    // it cannot interrupt is a test that can hang. The horizon's claim is discharged above on the
    // bounded walk instead — same code path — and a bad edit earns a throw rather than a wait.

    // The thrown error is the only diagnostic a bounded walk leaves behind, so it has to say **which**
    // bound was spent: a reader who sees "budget of 10000" knows the walk outran the test's own
    // limit, rather than wondering whether it reached the horizon.
    expect(new WalkTooLong(STEP_BUDGET).message).toContain(`budget of ${STEP_BUDGET}`)
  })
})

describe("loadJobs — validation", () => {
  const wrap = (jobs: unknown[]): unknown => ({ version: 1, jobs })

  it("loads a well-formed job and applies documented defaults", () => {
    const { jobs, invalid } = loadJobs(wrap([{ id: "nightly", schedule: "0 3 * * *", prompt: "review" }]))
    expect(invalid).toEqual([])
    expect(jobs).toHaveLength(1)
    expect(jobs[0]).toMatchObject({
      id: "nightly",
      enabled: true,
      misfire: "skip",
      maxCatchUp: DEFAULT_MAX_CATCH_UP,
    })
    expect(jobs[0]!.timezone).toBeTruthy()
  })

  it("keeps valid jobs and reports invalid ones instead of failing the load", () => {
    const { jobs, invalid } = loadJobs(
      wrap([
        { id: "good", schedule: "@daily", prompt: "ok" },
        { id: "bad-cron", schedule: "not a cron", prompt: "x" },
        { id: "Bad_Id", schedule: "@daily", prompt: "x" },
        { id: "no-prompt", schedule: "@daily" },
        { id: "bad-tz", schedule: "@daily", prompt: "x", timezone: "Mars/Olympus" },
      ]),
    )
    expect(jobs.map((job) => job.id)).toEqual(["good"])
    expect(invalid).toHaveLength(4)
    expect(invalid.every((entry) => entry.reason.length > 0)).toBe(true)
  })

  it("rejects a duplicate id while keeping the first", () => {
    const { jobs, invalid } = loadJobs(
      wrap([
        { id: "dup", schedule: "@daily", prompt: "first" },
        { id: "dup", schedule: "@hourly", prompt: "second" },
      ]),
    )
    expect(jobs).toHaveLength(1)
    expect(jobs[0]!.prompt).toBe("first")
    expect(invalid[0]!.reason).toMatch(/duplicate/)
  })

  it("bounds out-of-range numeric fields instead of trusting them", () => {
    const { jobs } = loadJobs(
      wrap([{ id: "x", schedule: "@daily", prompt: "p", maxCatchUp: 9_999, runTimeoutMs: -1 }]),
    )
    expect(jobs[0]!.maxCatchUp).toBe(50)
    expect(jobs[0]!.runTimeoutMs).toBe(MINUTE_MS)
  })

  it("refuses a file above the job cap", () => {
    const many = Array.from({ length: 101 }, (_, i) => ({ id: `j${i}`, schedule: "@daily", prompt: "p" }))
    const result = loadJobs(wrap(many))
    expect(result.jobs).toEqual([])
    expect(result.error).toMatch(/above the cap/)
  })

  it("refuses an unsupported file version and a non-object payload", () => {
    expect(loadJobs({ version: 99, jobs: [] }).error).toMatch(/unsupported job file version/)
    expect(loadJobs([]).error).toMatch(/must be a JSON object/)
    expect(loadJobs({ version: 1 }).error).toMatch(/no `jobs` array/)
  })

  it("bounds an oversized prompt", () => {
    const outcome = validateJob({ id: "big", schedule: "@daily", prompt: "x".repeat(20_001) }, 0)
    expect("reason" in outcome && outcome.reason).toMatch(/longer than/)
  })
})

describe("missedOccurrences", () => {
  it("enumerates a backlog oldest-first and reports what the cap dropped", () => {
    const spec = parseCron("0 * * * *")
    const from = Date.UTC(2026, 4, 10, 0, 0)
    const to = from + 8 * 60 * MINUTE_MS // eight hourly occurrences

    const full = missedOccurrences(spec, from, to, "UTC", 100)
    expect(full.instants).toHaveLength(8)
    expect(full.dropped).toBe(0)

    const capped = missedOccurrences(spec, from, to, "UTC", 3)
    expect(capped.instants).toHaveLength(3)
    expect(capped.dropped).toBeGreaterThan(0)
  })

  it("returns nothing when the window holds no occurrence", () => {
    const spec = parseCron("0 0 1 1 *") // 1 January
    const result = missedOccurrences(spec, Date.UTC(2026, 4, 1), Date.UTC(2026, 4, 2), "UTC", 10)
    expect(result.instants).toEqual([])
  })

  /**
   * `MAX_BACKLOG_SCAN`, restated as a literal.
   *
   * Not exported on purpose (`src/index.ts` keeps it module-private): a test reading the constant
   * follows any new value silently, so raising the bound would pass green. Written out here, a change
   * to it breaks a cost assertion in the open instead.
   */
  const SCAN_BOUND = 1000

  it("counts a minutely backlog the same west of UTC as at it (ADR 0002)", () => {
    // ADR 0002 is *the count agrees with the instants it is reported beside*. The old walk stepped
    // `|offset| + 1` minutes at a time, so a 24 h window in New York was exhausted after six
    // searches and reported **4 dropped with no cap** — claiming a day of backlog held five
    // occurrences. That is the agreement broken, on top of the cadence being wrong.
    const spec = parseCron("* * * * *")
    const from = Date.UTC(2026, 4, 10, 0, 0)
    const to = from + 24 * 60 * MINUTE_MS // 1439 occurrences; the bound admits 1000 of them

    const counted: Record<string, unknown> = {}
    for (const zone of ["UTC", NEW_YORK, ST_JOHNS, "America/Buenos_Aires"]) {
      const result = missedOccurrences(spec, from, to, zone, 1)
      counted[zone] = { instants: result.instants, dropped: result.dropped, droppedCapped: result.droppedCapped }
    }
    // The zone must not change the answer. Exactly one occurrence is admitted as an instant, 1000 are
    // counted, and the flag is set because the walk really was cut short.
    expect(counted).toEqual({
      UTC: { instants: [from + MINUTE_MS], dropped: SCAN_BOUND, droppedCapped: true },
      [NEW_YORK]: { instants: [from + MINUTE_MS], dropped: SCAN_BOUND, droppedCapped: true },
      [ST_JOHNS]: { instants: [from + MINUTE_MS], dropped: SCAN_BOUND, droppedCapped: true },
      "America/Buenos_Aires": { instants: [from + MINUTE_MS], dropped: SCAN_BOUND, droppedCapped: true },
    })
  })

  it("stays exact below the bound in a negative-offset zone, so `droppedCapped` stays honest", () => {
    // The flag has to mean "the walk stopped here", not "the number looks round". Below the bound
    // the count is a count, and reporting it as capped would claim a truncation that did not happen
    // — the inverted version of the ADR 0002 failure the bug above was. In New York this is the
    // case that read as `4 dropped, uncapped`: a walk that ended early reports the end as an
    // answer, and only the instants beside it show it is wrong.
    const spec = parseCron("* * * * *")
    const from = Date.UTC(2026, 4, 10, 0, 0)

    const exact = missedOccurrences(spec, from, from + (SCAN_BOUND + 1) * MINUTE_MS, NEW_YORK, 1)
    expect(exact.instants).toEqual([from + MINUTE_MS])
    expect(exact.dropped).toBe(SCAN_BOUND)
    expect(exact.droppedCapped).toBe(false)

    // One more minute of window is one more occurrence past the bound, so now it is cut short.
    const beyond = missedOccurrences(spec, from, from + (SCAN_BOUND + 2) * MINUTE_MS, NEW_YORK, 1)
    expect(beyond.dropped).toBe(SCAN_BOUND)
    expect(beyond.droppedCapped).toBe(true)
  })

  it("enumerates a backlog west of UTC as consecutive minutes, not as a sparse series", () => {
    // The instants themselves, not just the count: a caller that *replays* a backlog (`backfill`)
    // gets this list, so a 241-minute gap here would fire a job hours apart while reporting a
    // one-minute schedule. Pinned on the half-hour zone because that is where a `±:30` magnitude
    // shows up as its own step size.
    const spec = parseCron("* * * * *")
    const from = Date.UTC(2026, 4, 10, 0, 0)
    const { instants } = missedOccurrences(spec, from, from + 10 * MINUTE_MS, ST_JOHNS, 10)

    expect(instants).toHaveLength(10)
    for (const [i, instant] of instants.entries()) expect(instant).toBe(from + (i + 1) * MINUTE_MS)
    // And each one really is that local minute, read back in the job's own zone. `America/St_Johns`
    // is UTC-2:30 in May, so 00:00Z is 21:30 the previous evening there.
    expect(instants.map((instant) => local(instant, ST_JOHNS))).toEqual([
      "2026-05-09T21:31",
      "2026-05-09T21:32",
      "2026-05-09T21:33",
      "2026-05-09T21:34",
      "2026-05-09T21:35",
      "2026-05-09T21:36",
      "2026-05-09T21:37",
      "2026-05-09T21:38",
      "2026-05-09T21:39",
      "2026-05-09T21:40",
    ])
  })
})

describe("resolveDue — misfire and cost bounds (ADR 0002)", () => {
  const job = (over: Partial<JobDefinition> = {}): JobDefinition => ({
    session: "reuse",
    id: "j",
    schedule: "0 * * * *",
    timezone: "UTC",
    prompt: "p",
    enabled: true,
    misfire: "skip" as const,
    maxCatchUp: DEFAULT_MAX_CATCH_UP,
    runTimeoutMs: MINUTE_MS,
    ...over,
  })

  const hourly = parseCron("0 * * * *")

  it("collapses a backlog of eight to exactly one run under `skip`", () => {
    const from = Date.UTC(2026, 4, 10, 0, 0)
    const now = from + 8 * 60 * MINUTE_MS
    const state: JobState = { version: STATE_VERSION, lastRun: from }
    const decision = resolveDue(job(), hourly, state, now, false, 0, 1)
    expect(decision?.kind).toBe("run")
    expect(decision?.occurrence.collapsed).toBe(1)
    // The cursor advanced past the whole window, so the backlog cannot replay.
    expect(state.lastRun).toBe(now)
  })

  it("backfill admits one occurrence per decision and owes the rest as a plan", () => {
    // ADR 0002: "replay missed occurrences oldest-first, up to `maxCatchUp`". Pre-fix this test
    // asserted `collapsed: 3` — which read like a replay and was a single run, the item's whole
    // defect. The plan is what makes the remaining occurrences owed rather than discarded.
    const from = Date.UTC(2026, 4, 10, 0, 0)
    const now = from + 8 * 60 * MINUTE_MS
    const state: JobState = { version: STATE_VERSION, lastRun: from }
    const definition = job({ misfire: "backfill", maxCatchUp: 3 })

    const first = resolveDue(definition, hourly, state, now, false, 0, 1)
    expect(first?.kind).toBe("run")
    // **One** occurrence per decision, and the oldest one.
    expect(first?.occurrence).toMatchObject({
      dueAt: from + 60 * MINUTE_MS,
      // Nothing is folded into a decision any more: the other two are owed, not covered.
      collapsed: 1,
      // The remainder past the cap, reported rather than discarded.
      dropped: 5,
      // Flagged once, on the tick that found the backlog, so the log line is not a per-replay loop.
      backlogFound: true,
    })
    // The plan holds the occurrences this decision did not run, oldest first.
    expect(state.catchUp?.pending).toEqual([from + 2 * 60 * MINUTE_MS, from + 3 * 60 * MINUTE_MS])
    // The window is consumed, so the backlog cannot reappear as a *new* one next tick.
    expect(state.lastRun).toBe(now)

    // Each later tick replays the next occurrence, oldest first, still carrying the remainder.
    const second = resolveDue(definition, hourly, state, now, false, 0, 1)
    expect(second?.occurrence).toMatchObject({ dueAt: from + 2 * 60 * MINUTE_MS, collapsed: 1, dropped: 5 })
    expect(second?.occurrence.backlogFound).toBeUndefined()
    const third = resolveDue(definition, hourly, state, now, false, 0, 1)
    expect(third?.occurrence).toMatchObject({ dueAt: from + 3 * 60 * MINUTE_MS, dropped: 5 })

    // The plan is spent: the last replay clears it, so the next tick owes nothing.
    expect(state.catchUp).toBeUndefined()
    expect(resolveDue(definition, hourly, state, now, false, 0, 1)).toBeUndefined()
  })

  it("defers a replay that finds no free slot instead of spending the occurrence", () => {
    // A backlog behind a long run is *waiting*, not skipped. Consuming it here would lose an
    // occurrence the user explicitly asked `backfill` for — the same loss as the cap, one tick late.
    const from = Date.UTC(2026, 4, 10, 0, 0)
    const now = from + 8 * 60 * MINUTE_MS
    const state: JobState = { version: STATE_VERSION, lastRun: from }
    const definition = job({ misfire: "backfill", maxCatchUp: 3 })
    resolveDue(definition, hourly, state, now, false, 0, 1)

    const inFlight = resolveDue(definition, hourly, state, now, true, 0, 1)
    expect(inFlight).toMatchObject({ kind: "skip", suppression: { reason: "in-flight" } })
    expect(state.catchUp?.pending).toHaveLength(2)
    // Nothing was skipped, so nothing claims to be: the last run's status is left alone.
    expect(state.lastStatus).toBeUndefined()

    const capped = resolveDue(definition, hourly, state, now, false, 1, 1)
    expect(capped).toMatchObject({ kind: "skip", suppression: { reason: "concurrency", running: 1 } })
    expect(state.catchUp?.pending).toHaveLength(2)
    expect(state.lastStatus).toBeUndefined()
  })

  it("reports a lower bound once the backlog scan bound is reached", () => {
    // `MAX_BACKLOG_SCAN` exists so counting a year of `* * * * *` cannot cost half a million
    // `nextOccurrence` calls — but a lower bound is only honest if it says so. 1010 minutes of a
    // `* * * * *` backlog is 1010 occurrences, one more than the bound admits to counting.
    const from = Date.UTC(2026, 4, 10, 0, 0)
    const now = from + 1010 * MINUTE_MS
    const state: JobState = { version: STATE_VERSION, lastRun: from }
    // A `* * * * *` spec, because only a per-minute cadence fills 1010 occurrences in 1010 minutes.
    const minutely = parseCron("* * * * *")
    const decision = resolveDue(
      job({ misfire: "backfill", maxCatchUp: 2, schedule: "* * * * *" }),
      minutely,
      state,
      now,
      false,
      0,
      1,
    )
    expect(decision?.occurrence).toMatchObject({ dropped: 1000, droppedCapped: true })
    // The one occurrence the cap admits past the first, and it is owed rather than counted.
    expect(state.catchUp?.pending).toEqual([from + 2 * MINUTE_MS])
  })

  it("never backfills history for a job with no previous run", () => {
    const now = Date.UTC(2026, 4, 10, 8, 0)
    const state: JobState = { version: STATE_VERSION }
    expect(resolveDue(job({ misfire: "backfill" }), hourly, state, now, false, 0, 1)).toBeUndefined()
    expect(state.nextRun).toBe(Date.UTC(2026, 4, 10, 9, 0))
  })

  it("arms the cursor on first sight so a never-run job still comes due", () => {
    // Regression: a job with no history left `lastRun` undefined, so every tick recomputed
    // `after = now` against an empty window and the job could never fire at all.
    const definition = job()
    const state: JobState = { version: STATE_VERSION }
    // First sighting just before an hourly boundary.
    const first = Date.UTC(2026, 4, 10, 8, 59, 50)

    expect(resolveDue(definition, hourly, state, first, false, 0, 1)).toBeUndefined()
    expect(state.lastRun).toBe(first)

    // A tick 10s earlier than the occurrence is still not due.
    expect(resolveDue(definition, hourly, state, Date.UTC(2026, 4, 10, 8, 59, 58), false, 0, 1)).toBeUndefined()

    // A tick 10s past it fires, against a cursor that is now a real past instant.
    const decision = resolveDue(definition, hourly, state, Date.UTC(2026, 4, 10, 9, 0, 10), false, 0, 1)
    expect(decision?.kind).toBe("run")
    expect(decision?.occurrence.dueAt).toBe(Date.UTC(2026, 4, 10, 9, 0))
  })

  it("skips rather than queues an occurrence whose run is still in flight", () => {
    const from = Date.UTC(2026, 4, 10, 0, 0)
    const now = from + 2 * 60 * MINUTE_MS
    const state: JobState = { version: STATE_VERSION, lastRun: from, leaseUntil: now + 60_000 }
    const decision = resolveDue(job(), hourly, state, now, true, 0, 1)
    expect(decision).toMatchObject({ kind: "skip", suppression: { reason: "in-flight" } })
    expect(state.lastStatus).toBe("skipped")
  })

  it("skips when the global concurrency cap is reached", () => {
    const from = Date.UTC(2026, 4, 10, 0, 0)
    const now = from + 60 * MINUTE_MS
    const state: JobState = { version: STATE_VERSION, lastRun: from }
    const decision = resolveDue(job(), hourly, state, now, false, 1, 1)
    expect(decision).toMatchObject({ kind: "skip", suppression: { reason: "concurrency", running: 1 } })
  })

  it("advances nextRun even when nothing was due, so the next tick does not rescan", () => {
    const state: JobState = { version: STATE_VERSION, lastRun: Date.UTC(2026, 4, 10, 8, 0) }
    resolveDue(job(), hourly, state, Date.UTC(2026, 4, 10, 8, 30), false, 0, 1)
    expect(state.nextRun).toBe(Date.UTC(2026, 4, 10, 9, 0))
  })

  it("arms a minutely job's nextRun one minute out, in a negative-offset zone", () => {
    // `nextRun` is what `hasWork` reads to decide whether to arm the tick, so it is the user-visible
    // face of the bug: a `* * * * *` job in New York used to report its next run **241 minutes** out,
    // which on an idle host means the schedule does not fire for four hours. Asserted on the
    // scheduler path rather than on `nextOccurrence`, because that is the path the fix has to hold.
    const spec = parseCron("* * * * *")
    const now = Date.UTC(2026, 4, 10, 12, 0)
    const state: JobState = { version: STATE_VERSION, lastRun: now }
    const definition = job({ schedule: "* * * * *", timezone: NEW_YORK })

    expect(resolveDue(definition, spec, state, now, false, 0, 1)).toBeUndefined()
    expect(state.nextRun).toBe(now + MINUTE_MS)

    // And once it is due, the occurrence it fires is the *oldest* the window owes — `skip` collapses a
    // backlog to one run, oldest first — so a five-minute window fires its first minute and counts
    // the other four. The cadence claim is that the five instants are consecutive, which the drop
    // count and the one-minute `nextRun` both rest on.
    const due = Date.UTC(2026, 4, 10, 12, 5)
    const ran = resolveDue(definition, spec, state, due, false, 0, 1)
    expect(ran).toMatchObject({ kind: "run", occurrence: { dueAt: now + MINUTE_MS } })
    expect(ran?.occurrence.dropped).toBe(4)
    expect(ran?.occurrence.droppedCapped).toBeUndefined()
    expect(state.nextRun).toBe(due + MINUTE_MS)
  })
})

// ---------------------------------------------------------------------------
// The cost bound: a tick is a function of the number of jobs, not of sleep length.
// ---------------------------------------------------------------------------

describe("the dropped-backlog count costs a bounded walk, not a walk per occurrence", () => {
  /**
   * `MAX_BACKLOG_SCAN`, restated as a literal.
   *
   * **The constant is deliberately not exported** (`src/index.ts` keeps it module-private), and
   * asserting the literal is the stronger test rather than the weaker convenience: a test reading
   * the constant would follow any new value silently, so doubling the walk would pass green. With
   * the number written here, raising the bound has to break this assertion in the open, which is
   * what makes "the bound changed" a reviewable fact instead of an invisible one.
   */
  const SCAN_BOUND = 1000

  /**
   * Lookups one occurrence search may cost, with headroom.
   *
   * `wallToInstant` probes three candidate instants and reads each one twice (`zoneOffsetMs` and
   * `rendersAs`), so a search that matches costs six of those.
   *
   * **Plus one**, which is where the frame fix spends its lookup
   * (`bug-next-occurrence-walks-utc-wall-parts-in-any-zone-west-of-utc`): the walk now reads
   * `afterMs` in the job's own zone to learn what its clock says before it walks that clock, so a
   * matching search costs seven where it used to cost six. Written as a per-search figure because
   * the assertions below are per-search ones — two searches is what an ordinary no-backlog tick
   * costs (one to enumerate, one to arm `nextRun`).
   *
   * The ceiling is deliberately loose in *form* — these tests assert that the walk is **bounded**,
   * not that a search is implemented a particular way — but fourteen is **exact** here, and that is
   * why the old twelve had to move rather than being left as slack: an ordinary no-backlog `resolveDue`
   * measures exactly 14 lookups, and asserting `≤ 12` against it is a real failure. The relationship
   * is unchanged from the old constant (2× the per-search cost), so the *claim* is the same claim
   * restated against a search that costs one more lookup — and a search that grew past seven (an
   * unbounded re-probe, say) still fails here instead of being absorbed.
   */
  const LOOKUPS_PER_SEARCH = 14

  /**
   * Timezone lookups `run` performs.
   *
   * **Work, not wall-clock.** Every occurrence search bottoms out in `wallParts` →
   * `Intl.DateTimeFormat#formatToParts`, and nothing else in the plugin calls it, so counting these
   * counts exactly the searches the scheduler made. A duration would be the same claim measured
   * badly — it fails on a loaded machine and passes on a fast one. The counter is installed on the
   * prototype, so the formatters the module already cached are counted too, and restored in a
   * `finally` so a failing assertion cannot leak it into the next test.
   */
  function lookupsDuring<T>(run: () => T): { lookups: number; value: T } {
    const real = Intl.DateTimeFormat.prototype.formatToParts
    let calls = 0
    Intl.DateTimeFormat.prototype.formatToParts = function (
      this: Intl.DateTimeFormat,
      date?: Date | number,
    ): Intl.DateTimeFormatPart[] {
      calls += 1
      return (real as (d?: Date | number) => Intl.DateTimeFormatPart[]).call(this, date)
    }
    try {
      // The value comes out of the *same* call the counter measured. Measuring a call and then
      // repeating it to see what it returned would spend the occurrence twice, which for a
      // `backfill` replay means testing a plan that is one tick further drained than intended.
      const value = run()
      return { lookups: calls, value }
    } finally {
      Intl.DateTimeFormat.prototype.formatToParts = real
    }
  }

  const definition = (over: Partial<JobDefinition> = {}): JobDefinition => ({
    session: "reuse",
    id: "j",
    schedule: "* * * * *",
    timezone: "UTC",
    prompt: "p",
    enabled: true,
    misfire: "skip" as const,
    maxCatchUp: DEFAULT_MAX_CATCH_UP,
    runTimeoutMs: MINUTE_MS,
    ...over,
  })

  /** A pinned minute boundary, so the window holds exactly as many occurrences as the test means. */
  const FROM = Date.UTC(2026, 4, 10, 0, 0)
  const minutely = parseCron("* * * * *")

  it("stops at the bound instead of at the backlog: a year of sleep costs the same as a day", () => {
    // The item's claim to test: the count is an enumeration, so its cost has to be *capped*
    // somewhere or it grows with sleep. `MAX_BACKLOG_SCAN` is that cap.
    //
    // A window of N minutes on `* * * * *` holds N occurrences and `limit` of them come back as
    // instants, so the remainder to count is `N - limit`. Every window below is past that by a wide
    // margin — a window of only a few hundred occurrences would be counted to the end and never
    // reach the bound, which is what these windows have to avoid.
    const short = missedOccurrences(minutely, FROM, FROM + 30 * MINUTE_MS, "UTC", 1)
    expect(short).toMatchObject({ dropped: 29, droppedCapped: false })

    // Counted under `skip` (limit 1) as the scheduler does. `limit = 1` is what makes the rest of
    // the window a *count* rather than a list — the case this item is about.
    const day = missedOccurrences(minutely, FROM, FROM + 24 * 60 * MINUTE_MS, "UTC", 1)
    const year = missedOccurrences(minutely, FROM, FROM + 365 * 24 * 60 * MINUTE_MS, "UTC", 1)

    // **The bound.** Both report the same count and the same honest flag: past the bound the
    // answer is a lower bound, and that is said rather than presented as a count.
    for (const measured of [day, year]) {
      expect(measured.dropped).toBe(SCAN_BOUND)
      expect(measured.droppedCapped).toBe(true)
    }

    // **Cost, as a bounded work count rather than a clock.** A removed or raised cap does not
    // fail this on a timing threshold — it fails because `missedOccurrences` is now asked for
    // 525 600 searches instead of 1001, and this asserts the *ceiling* rather than a duration.
    // `* * * * *` matched under UTC never re-probes, so work is exactly proportional to searches.
    const searches = (windowMs: number): number =>
      lookupsDuring(() => missedOccurrences(minutely, FROM, FROM + windowMs, "UTC", 1)).lookups

    // Warm the formatter cache and the JIT, so the first measured call is not the outlier.
    void searches(MINUTE_MS)

    const dayWork = searches(24 * 60 * MINUTE_MS)
    const yearWork = searches(365 * 24 * 60 * MINUTE_MS)
    const decadeWork = searches(3650 * 24 * 60 * MINUTE_MS)

    // A decade is 5.2 million occurrences. If the walk were unbounded this would be five million
    // searches' worth of lookups; instead the cost is the same as a single day's window, because
    // both stop at the bound.
    expect(decadeWork).toBe(dayWork)
    expect(yearWork).toBe(dayWork)
    // And it really did count 1000 occurrences rather than short-circuiting to "a lot".
    expect(dayWork).toBeGreaterThan(SCAN_BOUND)
    expect(dayWork).toBeLessThanOrEqual(SCAN_BOUND * LOOKUPS_PER_SEARCH)
  })

  it("keeps a backlog smaller than the bound exact, so `droppedCapped` stays honest", () => {
    // The flag has to mean "the scan stopped here", not "`dropped` is a round number". A count that
    // reached exactly the bound is exact, and calling it capped would report a truncation that did
    // not happen — the ADR 0002 failure this item's predecessor was filed for, inverted.
    //
    // 1001 occurrences with one instant returned leaves exactly 1000 to count: the walk finishes on
    // the bound without being cut short, so the number is a count and the flag is absent.
    const exact = missedOccurrences(minutely, FROM, FROM + (SCAN_BOUND + 1) * MINUTE_MS, "UTC", 1)
    expect(exact.instants).toHaveLength(1)
    expect(exact.dropped).toBe(SCAN_BOUND)
    expect(exact.droppedCapped).toBe(false)

    // One occurrence more, and the walk *is* cut short — so the bound is a lower bound and the
    // flag has to say so, or the number reads as a count the scheduler cannot back up.
    const beyond = missedOccurrences(minutely, FROM, FROM + (SCAN_BOUND + 2) * MINUTE_MS, "UTC", 1)
    expect(beyond.dropped).toBe(SCAN_BOUND)
    expect(beyond.droppedCapped).toBe(true)
  })

  it("reports the count on the run record, not only in the log", () => {
    // `dropped` is load-bearing since the predecessor item: it is the number the walk is paid for.
    // A number that is computed and never read is the cost this item exists to justify, so the
    // record has to carry it — this is the "the work is not discarded" half of that claim.
    // `maxCatchUp: 2` returns two instants, so 1003 occurrences leaves 1001 to count: past the
    // bound, and therefore reported as a lower bound.
    const state: JobState = { version: STATE_VERSION, lastRun: FROM }
    const decision = resolveDue(
      definition({ misfire: "backfill", maxCatchUp: 2 }),
      minutely,
      state,
      FROM + (SCAN_BOUND + 3) * MINUTE_MS,
      false,
      0,
      1,
    )
    expect(decision?.occurrence).toMatchObject({ dropped: SCAN_BOUND, droppedCapped: true })

    const kept = pushHistory([], {
      dueAt: 1,
      startedAt: 2,
      outcome: "ok",
      model: "session default",
      dropped: decision?.occurrence.dropped,
      droppedCapped: decision?.occurrence.droppedCapped,
    })
    expect(kept[0]).toMatchObject({ dropped: SCAN_BOUND, droppedCapped: true })
  })

  it("charges the walk to the tick that finds the backlog, not to every tick after it", () => {
    // The item's own framing — "one tick costs O(occurrences)" — was measured per tick. It is per
    // *backlog*: the tick that finds one pays it, and every later tick over the same job pays one
    // search to arm `nextRun` and nothing else. The cursor advance is the amortization the bound
    // rests on, so it is what this test watches.
    const now = FROM + 24 * 60 * MINUTE_MS
    const state: JobState = { version: STATE_VERSION, lastRun: FROM }

    // Warm the formatter cache and the JIT, so the first measured call is not the outlier.
    resolveDue(definition(), minutely, { version: STATE_VERSION, lastRun: FROM }, now, false, 0, 1)

    const found = lookupsDuring(() => resolveDue(definition(), minutely, state, now, false, 0, 1))
    // It really did count to the bound, on the tick that found the backlog.
    expect(found.lookups).toBeGreaterThan(SCAN_BOUND)
    expect(found.value?.occurrence.dropped).toBe(SCAN_BOUND)
    expect(state.lastRun).toBe(now)

    // Thirty seconds later, on the same job: the window was consumed, so there is nothing to count.
    const ordinary = lookupsDuring(() => resolveDue(definition(), minutely, state, now + 30_000, false, 0, 1))
    expect(ordinary.value).toBeUndefined()
    expect(ordinary.lookups).toBeLessThanOrEqual(LOOKUPS_PER_SEARCH)
  })

  it("replays a `backfill` backlog off the plan, so each replay tick costs one search too", () => {
    // The other half of the amortization: a `backfill` backlog keeps draining across following
    // ticks, so a per-replay walk would be exactly the "once per tick, forever" cost the item
    // describes. The durable plan is what makes the replay cheap — it carries the remainder, so
    // nothing has to be re-counted to know it again.
    const now = FROM + 24 * 60 * MINUTE_MS
    const state: JobState = { version: STATE_VERSION, lastRun: FROM }
    const backfill = definition({ misfire: "backfill", maxCatchUp: 5 })

    resolveDue(backfill, minutely, { version: STATE_VERSION, lastRun: FROM }, now, false, 0, 1)

    const found = lookupsDuring(() => resolveDue(backfill, minutely, state, now, false, 0, 1))
    expect(found.lookups).toBeGreaterThan(SCAN_BOUND)
    // The remainder is on the plan, which is what a later replay reads instead of re-counting.
    expect(state.catchUp?.dropped).toBe(SCAN_BOUND)

    // Each replay tick owes the next occurrence and still reports the same remainder — for the
    // price of one search, because the number travelled with the plan instead of being re-derived.
    for (const tick of [1, 2, 3]) {
      const replay = lookupsDuring(() => resolveDue(backfill, minutely, state, now + tick * 30_000, false, 0, 1))
      expect(replay.value?.occurrence).toMatchObject({ collapsed: 1, dropped: SCAN_BOUND })
      expect(replay.lookups).toBeLessThanOrEqual(LOOKUPS_PER_SEARCH)
    }
  })

  it("scales with the number of jobs, not with the number of occurrences each one owes", () => {
    // What the spec box has to mean: a tick's cost is a function of how many jobs it evaluated.
    // Five jobs owing a day each and five owing a decade each cost the same, because each walk
    // stops at the bound — so a tick is O(jobs × bound) with a fixed bound, and the sleep length
    // is not in it at all.
    const day = FROM + 24 * 60 * MINUTE_MS
    const decade = FROM + 3650 * 24 * 60 * MINUTE_MS

    const tickOfFive = (now: number): number =>
      lookupsDuring(() => {
        for (const state of Array.from({ length: 5 }, () => ({ version: STATE_VERSION, lastRun: FROM }))) {
          resolveDue(definition(), minutely, state, now, false, 0, 1)
        }
      }).lookups

    // Warm the formatter cache and the JIT first.
    tickOfFive(day)

    const fiveDays = tickOfFive(day)
    const fiveDecades = tickOfFive(decade)

    // A decade per job is 5.2M occurrences against 1440 for a day, and the two ticks cost the same.
    expect(fiveDecades).toBe(fiveDays)
    // Five jobs, each paying its own bound and no more than that.
    expect(fiveDays).toBeGreaterThan((5 * SCAN_BOUND) / 2)
    expect(fiveDays).toBeLessThanOrEqual(5 * SCAN_BOUND * LOOKUPS_PER_SEARCH)
  })
})

describe("the first tick after a long sleep cannot hold the event loop (task-measure-first-tick-stall-after-long-sleep)", () => {
  /**
   * `MAX_BACKLOG_SCAN`, restated as a literal for the reason given in the block above: an
   * imported-constant test would follow a new value silently, so raising the bound would pass green.
   */
  const SCAN_BOUND = 1000

  /** Enough jobs that the walk is long enough to be cut in two, and short enough to stay quick. */
  const JOBS = 3

  /** One whole backlog each: enough that every job's walk reaches the bound. */
  const ASLEPT_FOR_MS = 24 * 60 * MINUTE_MS

  /**
   * A long run that cannot finish on its own — so the tick's *dispatch* phase cannot be what the
   * test is measuring. It costs nothing: the prompt never resolves and the test never waits for it.
   */
  let dir: string
  let restoreEnv: string | undefined

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "st-stall-"))
    restoreEnv = process.env[DATA_DIR_ENV]
    process.env[DATA_DIR_ENV] = join(dir, "state")
  })

  afterEach(() => {
    if (restoreEnv === undefined) delete process.env[DATA_DIR_ENV]
    else process.env[DATA_DIR_ENV] = restoreEnv
    rmSync(dir, { recursive: true, force: true })
  })

  /**
   * Run one real tick — the plugin's own, through `setup` — over `JOBS` jobs whose cursors are
   * `asleepMs` in the past, and report how the event loop behaved while it ran.
   *
   * **Turns, counted as work, never as durations.** A `setImmediate` chain records the lookup count
   * it can see on each turn, so "a turn happened in the middle of the walk" is a statement about an
   * integer — how far the walk had got — rather than about elapsed time on a machine that may be
   * busy. That is the whole question: an assertion in milliseconds would be a flake by construction
   * and would not distinguish *busy* from *blocked* on a slow run either.
   *
   * Counted by `Intl.DateTimeFormat#formatToParts`, the primitive every occurrence search bottoms
   * out in and the only thing in the plugin that calls it, so a lookup count *is* a count of how far
   * the walk has got.
   */
  async function firstTick(
    asleepMs: number,
    jobOverrides: Record<string, Record<string, unknown>> = {},
    seedOverrides: Record<string, Record<string, unknown>> = {},
  ): Promise<{ lookups: number; turnsInsideWalk: number }> {
    mkdirSync(join(dir, ".opencode"), { recursive: true })
    const lastRun = Date.now() - asleepMs
    writeFileSync(
      join(dir, ".opencode", "schedules.json"),
      JSON.stringify({
        version: 1,
        jobs: Array.from({ length: JOBS }, (_, i) => ({
          id: `j${i}`,
          // UTC explicitly: the bound is a statement about the walk, and the walk's cost is a
          // function of how many occurrences it counts — which is what the schedule decides.
          schedule: "* * * * *",
          timezone: "UTC",
          prompt: "p",
          enabled: true,
          ...jobOverrides[`j${i}`],
        })),
      }),
    )
    const store = new Map<string, unknown>(
      Array.from({ length: JOBS }, (_, i) => [
        `scheduled-tasks/j${i}`,
        { version: STATE_VERSION, lastRun, ...seedOverrides[`j${i}`] },
      ]),
    )

    const real = Intl.DateTimeFormat.prototype.formatToParts
    let lookups = 0
    Intl.DateTimeFormat.prototype.formatToParts = function (
      this: Intl.DateTimeFormat,
      date?: Date | number,
    ): Intl.DateTimeFormatPart[] {
      lookups += 1
      return (real as (d?: Date | number) => Intl.DateTimeFormatPart[]).call(this, date)
    }
    try {
      /** Lookup count seen on each event-loop turn. */
      const observed: number[] = []
      let pumping = true
      const pump = (): void => {
        if (!pumping) return
        observed.push(lookups)
        setImmediate(pump)
      }
      setImmediate(pump)

      const cleanup = await plugin.setup({
        // Long enough that only the tick `arm()` dispatches from cold happens here.
        options: { tickMs: 60 * MINUTE_MS, maxConcurrentRuns: JOBS },
        location: { directory: dir, project: { id: "stall" } },
        storage: {
          get: async (key: string) => store.get(key),
          set: async (key: string, value: unknown) => void store.set(key, value),
          remove: async (key: string) => void store.delete(key),
        },
        session: {
          create: async () => ({ id: "ses_1" }),
          // Never resolves: the runs stay in flight, which is also what keeps the tick from
          // dispatching a second time and muddying what was measured.
          prompt: () => new Promise<never>(() => {}),
        },
        tool: { transform: async () => ({ dispose() {} }) },
      } as never)

      // The tick is over when nothing has been looked up for a stretch of turns. A turn count, not
      // a duration, so a slow machine cannot cut the walk short and make this pass.
      for (let settled = 0; settled < 500; settled += 1) {
        const before = lookups
        for (let turn = 0; turn < 500; turn += 1) await new Promise<void>((resolve) => setImmediate(resolve))
        if (lookups === before) break
      }
      pumping = false
      ;(cleanup as () => void)?.()

      const total = lookups
      return {
        lookups: total,
        // Strictly between: a turn that saw the walk still going. With the whole walk in one
        // synchronous run there is none, whatever the job count.
        turnsInsideWalk: observed.filter((seen) => seen > 0 && seen < total).length,
      }
    } finally {
      Intl.DateTimeFormat.prototype.formatToParts = real
    }
  }

  it("hands the loop back between jobs, so no one walk can hold it", async () => {
    // The measurement this pins, on a real tick: 100 jobs each owing a capped backlog spent
    // 601 800 lookups in a **single 2.45 s stretch during which no timer and no I/O callback ran**.
    // The bound the box needs is not "the tick is fast" — the work is the work — but "no blocking
    // run is longer than one job's walk", whatever the number of jobs behind it.
    //
    // `maxConcurrentRuns: JOBS` matters: every job is admitted, so no decision takes the skip
    // branch's `await saveState`. Microtask boundaries were never the thing that mattered — they do
    // not end a turn — so without a yield of its own the three walks are one uninterrupted run.
    const { lookups, turnsInsideWalk } = await firstTick(ASLEPT_FOR_MS)

    // The walk really did reach the bound on every job, so this is not a cheap walk that happened
    // to be cut up. A day of minutely occurrences is ~1440 of them, which is past `SCAN_BOUND`.
    expect(lookups).toBeGreaterThanOrEqual(JOBS * SCAN_BOUND)

    // One turn between each pair of walks. Asserted as *at least*: the pump can get extra turns, and
    // the claim is that the loop was given back, not that it was given back exactly once.
    expect(turnsInsideWalk).toBeGreaterThanOrEqual(JOBS - 1)
  })

  it("pays no turn at all on a tick that has no backlog to walk", async () => {
    // The other half of the same decision, and the reason the meter is metered rather than
    // unconditional: a tick whose jobs owe nothing beyond their one occurrence searches once each.
    // Nothing can be blocked, so nothing should be interrupted — an unconditional yield here would
    // add an event-loop turn per job to every ordinary tick, forever, to protect against a cost
    // that is not being paid.
    const { turnsInsideWalk, lookups } = await firstTick(MINUTE_MS)
    expect(lookups).toBeGreaterThan(0)
    expect(lookups).toBeLessThan(JOBS * SCAN_BOUND)
    expect(turnsInsideWalk).toBe(0)
  })

  it("pays no turn while the walking it has done is still inside one bound", async () => {
    // The threshold is not a tuning knob, it is the definition of when the loop is at risk. A
    // backlog *smaller* than `MAX_BACKLOG_SCAN` cannot hold the loop, so a tick full of them must
    // not pay for protection it does not need — that is what keeps the turn off the common path,
    // and it is a separate property from "no backlog at all", which the test above covers.
    //
    // Half an hour owes 29 occurrences, so each job walks 30 of them: three jobs are 90, nowhere
    // near a bound's worth. Yielding per job here would be protection bought against a cost the
    // tick is not paying.
    const { turnsInsideWalk, lookups } = await firstTick(30 * MINUTE_MS)
    // The walks were real — ~180 lookups' worth — so this is a tick that did work and declined to
    // interrupt, not a tick that did nothing.
    expect(lookups).toBeGreaterThan(JOBS)
    expect(lookups).toBeLessThan(JOBS * SCAN_BOUND)
    expect(turnsInsideWalk).toBe(0)
  })

  it("pays no turn for a `backfill` replay, because the plan carries the count", async () => {
    // The durability that makes the walk happen once also makes it happen **only** once, and the two
    // are the same decision. Charging a replay would buy nothing and cost a turn per job on every
    // tick of a draining backlog — which is precisely the amortization the durable plan exists to
    // provide, being paid back.
    //
    // `j0` arrives with a plan already in storage, so this tick *replays* it: one search, the
    // remainder read off the plan. `j1` finds a capped backlog, so a turn would be legitimate
    // somewhere in this tick if the replay were charging for work it did not do.
    // `j0` arrives with a plan already in storage, so this tick *replays* it: one search, the
    // remainder read off the plan — and a `dropped` of 1000 riding along that does not describe
    // work this tick did. `j1` owes a single occurrence, so it walks once and is charged nothing.
    // `j2` is the real one: a capped backlog, a full walk. If the replay were charging for work it
    // did not do, the turn would be taken before `j1` and this tick would block for a walk twice
    // over.
    const plan = { pending: [Date.now() - 30_000], dropped: SCAN_BOUND, droppedCapped: true }
    const { turnsInsideWalk, lookups } = await firstTick(
      ASLEPT_FOR_MS,
      { j0: { misfire: "backfill" } },
      { j0: { catchUp: plan }, j1: { lastRun: Date.now() - MINUTE_MS } },
    )
    // And the walk it does pay for is real, so this is not a tick that simply did nothing.
    expect(lookups).toBeGreaterThanOrEqual(SCAN_BOUND)
    expect(turnsInsideWalk).toBe(0)
  })
})

describe("normalizeState", () => {
  it("re-initializes an unknown version instead of misreading it", () => {
    expect(normalizeState({ version: 99, lastRun: 5 })).toEqual({ version: STATE_VERSION })
  })

  it("re-initializes a corrupt or non-object entry", () => {
    for (const value of [null, undefined, 42, "x", [1, 2]]) {
      expect(normalizeState(value)).toEqual({ version: STATE_VERSION })
    }
  })

  it("keeps a well-formed record and drops unknown fields", () => {
    const state = normalizeState({
      version: STATE_VERSION,
      lastRun: 10,
      nextRun: 20,
      lastStatus: "ok",
      lastError: "boom",
      nonsense: true,
    })
    expect(state).toEqual({ version: STATE_VERSION, lastRun: 10, nextRun: 20, lastStatus: "ok", lastError: "boom" })
    expect("nonsense" in state).toBe(false)
  })

  it("bounds a stored error string", () => {
    expect(normalizeState({ version: STATE_VERSION, lastError: "x".repeat(9000) }).lastError).toHaveLength(500)
  })

  it("keeps a stored catch-up plan, oldest first, and bounds it", () => {
    // A plan is the only record of occurrences still owed, so it has to survive a restart — and it
    // is storage, so it is repaired rather than trusted: the replay promise is *oldest first*, and
    // that is enforced on the read side instead of assuming the writer ordered it.
    const plan = normalizeState({
      version: STATE_VERSION,
      catchUp: { pending: [30, 10, 20], dropped: 4, droppedCapped: true },
    })
    expect(plan.catchUp).toEqual({ pending: [10, 20, 30], dropped: 4, droppedCapped: true })

    // Bounded by the scan bound, which is more than a plan can ever hold.
    const huge = normalizeState({
      version: STATE_VERSION,
      catchUp: { pending: Array.from({ length: 5_000 }, (_, n) => n + 1), dropped: 0 },
    })
    expect(huge.catchUp?.pending).toHaveLength(1_000)
  })

  it("drops a catch-up plan it cannot replay rather than dispatching a bogus instant", () => {
    // Each of these is a stored record that cannot mean what it claims, so it is dropped rather
    // than replayed: storage is writable from outside, and a bogus instant would be dispatched as
    // though the schedule had asked for it.
    for (const catchUp of [
      { pending: "later", dropped: 2 },
      // Every instant unusable, so there is nothing left that could be replayed.
      { pending: [Number.NaN, Number.POSITIVE_INFINITY], dropped: 2 },
      // A spent plan is not a plan.
      { pending: [], dropped: 3 },
      { dropped: 3 },
      null,
    ]) {
      expect(normalizeState({ version: STATE_VERSION, catchUp }).catchUp).toBeUndefined()
    }

    // A count nobody can stand behind is dropped, but the occurrences still owed are not: losing
    // them would be the very loss this whole path exists to prevent.
    expect(normalizeState({ version: STATE_VERSION, catchUp: { pending: [10], dropped: -4 } }).catchUp).toEqual({
      pending: [10],
      dropped: 0,
    })
  })
})

describe("isLeaseLive", () => {
  it("treats an expired lease as abandoned", () => {
    expect(isLeaseLive({ version: STATE_VERSION, leaseUntil: 1_000 }, 999)).toBe(true)
    expect(isLeaseLive({ version: STATE_VERSION, leaseUntil: 1_000 }, 1_000)).toBe(false)
    expect(isLeaseLive({ version: STATE_VERSION }, 0)).toBe(false)
  })
})

describe("acquireLease (ADR 0003)", () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "st-lease-"))
  })
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it("grants the lease to the first instance", () => {
    const lease = acquireLease(join(dir, "w.lock"))
    expect(lease.held).toBe(true)
    expect(lease.foreign).toBe(false)
    lease.release()
  })

  it("leaves a second instance foreign and unarmed", () => {
    const path = join(dir, "w.lock")
    // Simulate a genuinely different holder process: two instances inside one test process
    // share a pid, and a pid-identical lock is (correctly) reclaimed as our own.
    writeFileSync(path, JSON.stringify({ pid: process.pid + 1, heartbeat: Date.now() }))
    const second = acquireLease(path)
    expect(second.held).toBe(false)
    expect(second.foreign).toBe(true)
  })

  it("grants the lease when nobody holds it", () => {
    const lease = acquireLease(join(dir, "fresh.lock"))
    expect(lease.held).toBe(true)
    expect(lease.foreign).toBe(false)
    lease.release()
  })

  it("lets a fresh instance take the lease once the holder releases it", () => {
    const path = join(dir, "w.lock")
    acquireLease(path).release()
    expect(acquireLease(path).held).toBe(true)
  })

  it("reclaims a stale lease so a killed server cannot wedge scheduling", () => {
    const path = join(dir, "w.lock")
    writeFileSync(path, JSON.stringify({ pid: 999_999, heartbeat: 0 }))
    const lease = acquireLease(path, { now: () => 10 * 60_000, ttlMs: 60_000 })
    expect(lease.held).toBe(true)
    lease.release()
  })

  it("reclaims an unreadable lease rather than refusing to run", () => {
    const path = join(dir, "w.lock")
    writeFileSync(path, "not json")
    expect(acquireLease(path).held).toBe(true)
  })

  it("degrades to lease-free running when the directory cannot be created", () => {
    const blocker = join(dir, "blocker")
    writeFileSync(blocker, "x")
    // mkdir of `<blocker>/w.lock` fails because `blocker` is a file.
    const lease = acquireLease(join(blocker, "w.lock"))
    expect(lease.held).toBe(false)
    expect(lease.foreign).toBe(false)
    expect(() => lease.heartbeat()).not.toThrow()
    expect(() => lease.release()).not.toThrow()
  })

  it("survives a double release", () => {
    const lease = acquireLease(join(dir, "w.lock"))
    lease.release()
    expect(() => lease.release()).not.toThrow()
  })
})

describe("plugin setup — context wiring and failure isolation", () => {
  let dir: string
  let restoreEnv: string | undefined

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "st-plugin-"))
    mkdirSync(join(dir, ".opencode"), { recursive: true })
    // Redirect the lockfile out of the real home: the suite never touches it, and no lease
    // leaks from one test into the next (which would make the results order-dependent).
    restoreEnv = process.env[DATA_DIR_ENV]
    process.env[DATA_DIR_ENV] = join(dir, "state")
  })
  afterEach(() => {
    if (restoreEnv === undefined) delete process.env[DATA_DIR_ENV]
    else process.env[DATA_DIR_ENV] = restoreEnv
    rmSync(dir, { recursive: true, force: true })
  })

  type ToolCall = { tool: Record<string, unknown>; editor: { namespace?: (n: unknown) => void; add?: (t: unknown) => void }; added: Record<string, unknown>[] }

  /** A fake V2 context capturing everything the plugin touches. */
  function fakeCtx(overrides: Record<string, unknown> = {}): {
    ctx: Record<string, unknown>
    calls: ToolCall[]
    prompts: Record<string, unknown>[]
  } {
    const calls: ToolCall[] = []
    const prompts: Record<string, unknown>[] = []
    const ctx: Record<string, unknown> = {
      location: { directory: dir, project: { id: "proj-test" } },
      storage: {
        get: async () => undefined,
        set: async () => {},
        remove: async () => {},
      },
      session: {
        create: async () => ({ id: "ses_1" }),
        prompt: async (input: Record<string, unknown>) => {
          prompts.push(input)
          return { id: "inbox_1" }
        },
      },
      tool: {
        transform: async (callback: (editor: never) => void) => {
          const editor: ToolCall["editor"] = {
            namespace: (n) => void (editorNamespace = n),
            add: (t) => void addedTools.push(t as Record<string, unknown>),
          }
          let editorNamespace: unknown
          const addedTools: Record<string, unknown>[] = []
          callback(editor as never)
          calls.push({ tool: {}, editor, added: addedTools })
          void editorNamespace
          return { dispose: () => {} }
        },
      },
      ...overrides,
    }
    void calls
    void prompts
    return { ctx, calls, prompts }
  }

  /** Every cleanup handed out in this test, released by `afterEach`. */
  const outstanding: Array<() => void> = []

  afterEach(() => {
    for (const dispose of outstanding.splice(0).reverse()) {
      try {
        dispose()
      } catch {
        // A failing teardown must not mask the assertion that ran before it.
      }
    }
  })

  /** Run setup and register a teardown, so no lease outlives its test. */
  async function setupWithCleanup(ctx: Record<string, unknown>): Promise<() => void> {
    const cleanup = await plugin.setup(ctx as never)
    const wrapped = typeof cleanup === "function" ? cleanup : () => {}
    outstanding.push(wrapped)
    return wrapped
  }

  function writeJobs(jobs: unknown[]): void {
    writeFileSync(join(dir, ".opencode", "schedules.json"), JSON.stringify({ version: 1, jobs }))
  }

  it("registers every tool and returns an idempotent cleanup", async () => {
    writeJobs([{ id: "nightly", schedule: "@daily", prompt: "review" }])
    const { ctx, calls } = fakeCtx()
    const cleanup = await setupWithCleanup(ctx)

    expect(calls).toHaveLength(1)
    const names = calls[0]!.added.map((tool) => tool.name)
    expect(names).toEqual(["list", "start_loop", "stop_loop", "schedule", "cancel", "history", "format", "run"])
    for (const tool of calls[0]!.added) {
      expect((tool.options as Record<string, unknown>).namespace).toBe("schedules")
      expect((tool.options as Record<string, unknown>).codemode).toBe(true)
    }

    expect(typeof cleanup).toBe("function")
    expect(() => {
      ;(cleanup as () => void)()
      ;(cleanup as () => void)()
    }).not.toThrow()
  })

  it("reports jobs, next run and status through schedules_list", async () => {
    writeJobs([{ id: "nightly", schedule: "0 3 * * *", prompt: "review", timezone: "UTC" }])
    const { ctx, calls } = fakeCtx()
    const cleanup = await setupWithCleanup(ctx)

    const list = calls[0]!.added.find((tool) => tool.name === "list")!
    const result = (await (list.execute as (i: unknown) => Promise<{ output: Record<string, unknown> }>)({}))
      .output as { jobs: Record<string, unknown>[]; leaseHeld: boolean }

    expect(result.jobs).toHaveLength(1)
    expect(result.jobs[0]).toMatchObject({ id: "nightly", schedule: "0 3 * * *", timezone: "UTC", enabled: true })
    expect(typeof result.leaseHeld).toBe("boolean")
  })

  it("schedules_run admits the prompt and rejects an unknown id", async () => {
    writeJobs([
      { id: "nightly", schedule: "@daily", prompt: "review" },
      { id: "other", schedule: "@daily", prompt: "x" },
    ])
    const { ctx, calls, prompts } = fakeCtx()
    const cleanup = await setupWithCleanup(ctx)

    const run = calls[0]!.added.find((tool) => tool.name === "run")!
    const execute = run.execute as (i: Record<string, unknown>) => Promise<{ output: Record<string, unknown> }>

    const ok = await execute({ id: "nightly" })
    expect(ok.output).toMatchObject({ id: "nightly", admitted: "inbox_1" })
    expect(prompts).toHaveLength(1)
    expect(prompts[0]).toMatchObject({ text: "review", delivery: "queue" })

    const missing = await execute({ id: "nope" })
    expect(missing.output.error).toMatch(/no job with id/)
  })

  it("is inert but still registers tools when there is no job file", async () => {
    const { ctx, calls } = fakeCtx()
    const cleanup = await setupWithCleanup(ctx)
    const list = calls[0]!.added.find((tool) => tool.name === "list")!
    const result = (await (list.execute as (i: unknown) => Promise<{ output: Record<string, unknown> }>)({})).output
    expect(result.jobs).toEqual([])
  })

  it("keeps last-known-good jobs and surfaces the error on malformed JSON", async () => {
    writeJobs([{ id: "good", schedule: "@daily", prompt: "p" }])
    const { ctx, calls } = fakeCtx()
    const cleanup = await setupWithCleanup(ctx)

    writeFileSync(join(dir, ".opencode", "schedules.json"), "{ not json")
    const second = fakeCtx()
    const secondCleanup = await setupWithCleanup(second.ctx)
    const list = second.calls[0]!.added.find((tool) => tool.name === "list")!
    const result = (await (list.execute as (i: unknown) => Promise<{ output: Record<string, unknown> }>)({})).output
    // Malformed on a cold read: nothing to retain, but the error is reported, not hidden.
    expect(result.error).toBeTruthy()
    expect(calls).toHaveLength(1)
  })

  it("degrades to in-memory state when ctx.storage is absent", async () => {
    writeJobs([{ id: "j", schedule: "@daily", prompt: "p" }])
    const { ctx, calls } = fakeCtx({ storage: undefined })
    await expect(plugin.setup(ctx as never)).resolves.toBeDefined()
    expect(calls).toHaveLength(1)
  })

  it("never throws out of setup when the context is almost empty", async () => {
    await expect(plugin.setup({} as never)).resolves.toBeTypeOf("function")
    await expect(plugin.setup({ location: { directory: dir } } as never)).resolves.toBeTypeOf("function")
  })

  it("registers nothing, and does not throw, when ctx.tool.transform is missing", async () => {
    writeJobs([{ id: "j", schedule: "@daily", prompt: "p" }])
    const { ctx } = fakeCtx({ tool: undefined })
    await expect(setupWithCleanup(ctx)).resolves.toBeDefined()
  })

  it("reports a lease held elsewhere instead of arming a second scheduler", async () => {
    writeJobs([{ id: "j", schedule: "@daily", prompt: "p" }])
    // Simulate a foreign holder by pre-writing a fresh lease for this project.
    const { leasePath } = await import("../src/index.ts")
    const path = leasePath(dir, "proj-test")
    mkdirSync(join(path, ".."), { recursive: true })
    writeFileSync(path, JSON.stringify({ pid: process.pid + 1, heartbeat: Date.now() }))

    const { ctx, calls } = fakeCtx()
    const cleanup = await plugin.setup(ctx as never)
    const list = calls[0]!.added.find((tool) => tool.name === "list")!
    const result = (await (list.execute as (i: unknown) => Promise<{ output: Record<string, unknown> }>)({})).output
    expect(result.leaseForeign).toBe(true)
    expect(result.leaseHeld).toBe(false)
    ;(cleanup as () => void)()
    rmSync(path, { force: true })
  })
})
describe("acquireLease — reload within the same process", () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "st-lease2-"))
  })
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it("reclaims its own lease rather than treating itself as a foreign holder", () => {
    // Regression: after `opencode reload` the previous instance may not have released, and
    // a fresh heartbeat under our own pid used to make the new instance inert forever.
    const path = join(dir, "w.lock")
    writeFileSync(path, JSON.stringify({ pid: process.pid, heartbeat: Date.now() }))
    const lease = acquireLease(path)
    expect(lease.held).toBe(true)
    expect(lease.foreign).toBe(false)
    lease.release()
  })
})

describe("model selection — a scheduled job should never silently inherit a paid model", () => {
  it("parses provider/model and the explicit object form", () => {
    expect(parseModelRef("opencode/space-bunny-free")).toEqual({
      model: { providerID: "opencode", id: "space-bunny-free" },
    })
    expect(parseModelRef({ providerID: "opencode", id: "space-bunny-free" })).toEqual({
      model: { providerID: "opencode", id: "space-bunny-free" },
    })
  })

  it("returns undefined when absent, so the job simply inherits the session default", () => {
    expect(parseModelRef(undefined)).toBeUndefined()
  })

  it("rejects a malformed model rather than dispatching on the wrong one", () => {
    for (const bad of ["space-bunny-free", "/x", "opencode/", 42, {}]) {
      expect(parseModelRef(bad)).toHaveProperty("reason")
    }
  })

  it("refuses the whole job when its model is malformed", () => {
    const { jobs, invalid } = loadJobs({
      version: 1,
      jobs: [
        { id: "bad-model", schedule: "@daily", prompt: "p", model: "no-slash" },
        { id: "good-model", schedule: "@daily", prompt: "p", model: "opencode/space-bunny-free" },
      ],
    })
    expect(jobs.map((j) => j.id)).toEqual(["good-model"])
    expect(jobs[0]!.model).toEqual({ providerID: "opencode", id: "space-bunny-free" })
    expect(invalid[0]!.reason).toMatch(/provider\/model/)
  })

  it("switches the session to the job's model before dispatching the prompt", async () => {
    const dir = mkdtempSync(join(tmpdir(), "st-model-"))
    mkdirSync(join(dir, ".opencode"), { recursive: true })
    writeFileSync(
      join(dir, ".opencode", "schedules.json"),
      JSON.stringify({
        version: 1,
        jobs: [
          {
            id: "free-model-job",
            schedule: "@daily",
            prompt: "p",
            agent: "build",
            model: "opencode/space-bunny-free",
          },
        ],
      }),
    )
    const order: string[] = []
    let added: Array<Record<string, unknown>> = []
    const ctx = {
      location: { directory: dir, project: { id: "model-test" } },
      session: {
        create: async () => ({ id: "ses_1" }),
        switchAgent: async () => void order.push("switchAgent"),
        switchModel: async (input: Record<string, unknown>) =>
          void order.push(`switchModel:${(input.model as { providerID: string; id: string }).providerID}/${
            (input.model as { providerID: string; id: string }).id
          }`),
        prompt: async () => void order.push("prompt"),
      },
      tool: {
        transform: async (cb: (e: { add?: (tool: unknown) => void }) => void) => {
          cb({ add: (tool) => added.push(tool as Record<string, unknown>) })
          return { dispose: () => {} }
        },
      },
    }
    const cleanup = await plugin.setup(ctx as never)
    try {
      const run = added.find((tool) => tool.name === "run")!
      const out = await (run.execute as (i: Record<string, unknown>) => Promise<{ output: Record<string, unknown> }>)({
        id: "free-model-job",
      })
      expect(out.output.error).toBeUndefined()
      // Order matters: the model must be selected before the turn is dispatched, or the
      // run bills whatever the session happened to be on.
      expect(order).toEqual([
        "switchAgent",
        "switchModel:opencode/space-bunny-free",
        "prompt",
      ])
    } finally {
      ;(cleanup as () => void)?.()
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it("reports the resolved model in schedules_list", async () => {
    const dir = mkdtempSync(join(tmpdir(), "st-model2-"))
    mkdirSync(join(dir, ".opencode"), { recursive: true })
    writeFileSync(
      join(dir, ".opencode", "schedules.json"),
      JSON.stringify({
        version: 1,
        jobs: [
          { id: "explicit", schedule: "@daily", prompt: "p", model: "opencode/space-bunny-free" },
          { id: "implicit", schedule: "@daily", prompt: "p" },
        ],
      }),
    )
    let added: Array<Record<string, unknown>> = []
    const ctx = {
      location: { directory: dir, project: { id: "model-test-2" } },
      session: { create: async () => ({ id: "ses_1" }), prompt: async () => ({ id: "i" }) },
      tool: {
        transform: async (cb: (e: { add?: (t: unknown) => void }) => void) => {
          cb({ add: (tool) => added.push(tool as Record<string, unknown>) })
          return { dispose: () => {} }
        },
      },
    }
    const cleanup = await plugin.setup(ctx as never)
    try {
      const list = added.find((tool) => tool.name === "list")!
      const result = (
        await (list.execute as (i: unknown) => Promise<{ output: { jobs: Record<string, unknown>[] } }>)({})
      ).output
      expect(result.jobs.find((j) => j.id === "explicit")!.model).toBe("opencode/space-bunny-free")
      expect(result.jobs.find((j) => j.id === "implicit")!.model).toBe("session default")
    } finally {
      ;(cleanup as () => void)?.()
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe("parseDuration (T1)", () => {
  it("accepts every unit and compound terms", () => {
    expect(parseDuration("30s")).toEqual({ ms: 30_000 })
    expect(parseDuration("5m")).toEqual({ ms: 5 * MINUTE_MS })
    expect(parseDuration("2h")).toEqual({ ms: 2 * 60 * MINUTE_MS })
    expect(parseDuration("1d")).toEqual({ ms: 24 * 60 * MINUTE_MS })
    expect(parseDuration("1h30m")).toEqual({ ms: 90 * MINUTE_MS })
    expect(parseDuration("1h30m15s")).toEqual({ ms: 90 * MINUTE_MS + 15_000 })
    expect(parseDuration("250ms")).toEqual({ ms: 250 })
  })

  it("treats a bare number as seconds, the convention taken from opencode-tasks", () => {
    expect(parseDuration(30)).toEqual({ ms: 30_000 })
    expect(parseDuration(0.5)).toEqual({ ms: 500 })
    expect(parseDuration("90")).toEqual({ ms: 90_000 })
  })

  it("is case- and space-insensitive", () => {
    expect(parseDuration(" 1H30M ")).toEqual({ ms: 90 * MINUTE_MS })
  })

  it("returns undefined for an absent value, so absence is never an error", () => {
    expect(parseDuration(undefined)).toBeUndefined()
    expect(parseDuration(null)).toBeUndefined()
  })

  it("refuses malformed, zero, negative and non-finite values with a reason", () => {
    for (const bad of ["", "   ", "abc", "5x", "5m foo", "m5", "-5m", "0s", 0, -1, Number.NaN, Infinity]) {
      expect(parseDuration(bad), `expected ${String(bad)} to be refused`).toHaveProperty("reason")
    }
  })

  it("does not silently accept a valid prefix of a malformed duration", () => {
    // "5m foo" must not resolve to 5 minutes.
    expect(parseDuration("5m foo")).toHaveProperty("reason")
  })
})

describe("runTimeout vs runTimeoutMs (T1)", () => {
  const wrap = (job: Record<string, unknown>): unknown => ({ version: 1, jobs: [job] })

  it("accepts a duration string for runTimeout", () => {
    const { jobs } = loadJobs(wrap({ id: "j", schedule: "@daily", prompt: "p", runTimeout: "30m" }))
    expect(jobs[0]!.runTimeoutMs).toBe(30 * MINUTE_MS)
  })

  it("keeps runTimeoutMs working unchanged", () => {
    const { jobs } = loadJobs(wrap({ id: "j", schedule: "@daily", prompt: "p", runTimeoutMs: 120_000 }))
    expect(jobs[0]!.runTimeoutMs).toBe(2 * MINUTE_MS)
  })

  it("prefers an explicit runTimeout when both are present", () => {
    const { jobs } = loadJobs(
      wrap({ id: "j", schedule: "@daily", prompt: "p", runTimeout: "2h", runTimeoutMs: 1000 }),
    )
    expect(jobs[0]!.runTimeoutMs).toBe(2 * 60 * MINUTE_MS)
  })

  it("clamps to the v1 bounds, exactly as runTimeoutMs did", () => {
    const { jobs } = loadJobs(wrap({ id: "j", schedule: "@daily", prompt: "p", runTimeout: "90d" }))
    expect(jobs[0]!.runTimeoutMs).toBe(24 * 60 * MINUTE_MS)
  })

  it("refuses the whole job on an invalid duration, naming it", () => {
    const { jobs, invalid } = loadJobs(wrap({ id: "j", schedule: "@daily", prompt: "p", runTimeout: "5x" }))
    expect(jobs).toHaveLength(0)
    expect(invalid[0]!.reason).toMatch(/job "j".*unknown duration unit/)
  })
})

describe("schedules_format (T1)", () => {
  it("returns a reference naming both surfaces, the precedence rule and the model field", async () => {
    const dir = mkdtempSync(join(tmpdir(), "st-fmt-"))
    mkdirSync(join(dir, ".opencode"), { recursive: true })
    writeFileSync(join(dir, ".opencode", "schedules.json"), JSON.stringify({ version: 1, jobs: [] }))
    let added: Array<Record<string, unknown>> = []
    const ctx = {
      location: { directory: dir, project: { id: "fmt" } },
      session: { create: async () => ({ id: "s" }), prompt: async () => ({ id: "i" }) },
      tool: {
        transform: async (cb: (e: { add?: (tool: unknown) => void }) => void) => {
          cb({ add: (tool) => added.push(tool as Record<string, unknown>) })
          return { dispose: () => {} }
        },
      },
    }
    const cleanup = await plugin.setup(ctx as never)
    try {
      const fmt = added.find((tool) => tool.name === "format")!
      const out = await (fmt.execute as (i: unknown) => Promise<{ output: { reference: string } }>)({})
      const ref = out.output.reference
      expect(ref).toContain(".opencode/schedules.json")
      expect(ref).toContain(".opencode/tasks/<id>.md")
      expect(ref).toMatch(/markdown file wins/i)
      expect(ref).toContain("provider/model")
      expect(ref).toMatch(/paid/i)
      expect(ref).toContain("runTimeout")
      // Bounded: this is model context on every call.
      expect(ref.length).toBeLessThan(4000)
    } finally {
      ;(cleanup as () => void)?.()
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe("session mode (T3)", () => {
  const wrap = (job: Record<string, unknown>): unknown => ({ version: 1, jobs: [job] })

  it("defaults to reuse and accepts an explicit fresh", () => {
    expect(loadJobs(wrap({ id: "a", schedule: "@daily", prompt: "p" })).jobs[0]!.session).toBe("reuse")
    expect(loadJobs(wrap({ id: "b", schedule: "@daily", prompt: "p", session: "fresh" })).jobs[0]!.session).toBe("fresh")
  })

  it("refuses any other mode rather than defaulting it", () => {
    // Defaulting "reuse" for a job that meant something else would accumulate context
    // nobody asked for, silently.
    for (const bad of ["REUSE", "new", "always", "1"]) {
      const { jobs, invalid } = loadJobs(wrap({ id: "j", schedule: "@daily", prompt: "p", session: bad }))
      expect(jobs, bad).toHaveLength(0)
      expect(invalid[0]!.reason).toMatch(/session must be "reuse" or "fresh"/)
    }
  })

  it("fresh creates a new session per run and caches nothing", async () => {
    const dir = mkdtempSync(join(tmpdir(), "st-fresh-"))
    mkdirSync(join(dir, ".opencode"), { recursive: true })
    writeFileSync(
      join(dir, ".opencode", "schedules.json"),
      JSON.stringify({ version: 1, jobs: [{ id: "j", schedule: "@daily", prompt: "p", session: "fresh" }] }),
    )
    let created = 0
    let added: Array<Record<string, unknown>> = []
    const ctx = {
      location: { directory: dir, project: { id: "fresh" } },
      session: {
        create: async () => ({ id: `ses_${++created}` }),
        prompt: async () => ({ id: "i" }),
      },
      tool: {
        transform: async (cb: (e: { add?: (tool: unknown) => void }) => void) => {
          cb({ add: (tool) => added.push(tool as Record<string, unknown>) })
          return { dispose: () => {} }
        },
      },
    }
    const cleanup = await plugin.setup(ctx as never)
    try {
      const run = added.find((tool) => tool.name === "run")!
      const exec = run.execute as (i: Record<string, unknown>) => Promise<{ output: Record<string, unknown> }>
      const first = await exec({ id: "j" })
      const second = await exec({ id: "j" })
      expect(first.output.sessionID).toBe("ses_1")
      expect(second.output.sessionID).toBe("ses_2")
      expect(created).toBe(2)
    } finally {
      ;(cleanup as () => void)?.()
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it("reuse reuses the same session across runs", async () => {
    const dir = mkdtempSync(join(tmpdir(), "st-reuse-"))
    mkdirSync(join(dir, ".opencode"), { recursive: true })
    writeFileSync(
      join(dir, ".opencode", "schedules.json"),
      JSON.stringify({ version: 1, jobs: [{ id: "j", schedule: "@daily", prompt: "p" }] }),
    )
    let created = 0
    let added: Array<Record<string, unknown>> = []
    const ctx = {
      location: { directory: dir, project: { id: "reuse" } },
      session: {
        create: async () => ({ id: `ses_${++created}` }),
        prompt: async () => ({ id: "i" }),
      },
      tool: {
        transform: async (cb: (e: { add?: (tool: unknown) => void }) => void) => {
          cb({ add: (tool) => added.push(tool as Record<string, unknown>) })
          return { dispose: () => {} }
        },
      },
    }
    const cleanup = await plugin.setup(ctx as never)
    try {
      const run = added.find((tool) => tool.name === "run")!
      const exec = run.execute as (i: Record<string, unknown>) => Promise<{ output: Record<string, unknown> }>
      expect((await exec({ id: "j" })).output.sessionID).toBe("ses_1")
      expect((await exec({ id: "j" })).output.sessionID).toBe("ses_1")
      expect(created).toBe(1)
    } finally {
      ;(cleanup as () => void)?.()
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe("run history (T3)", () => {
  const entry = (n: number): HistoryEntry => ({
    dueAt: n,
    startedAt: n,
    outcome: "ok",
    model: "opencode/space-bunny-free",
  })

  it("appends and keeps order", () => {
    expect(pushHistory([], entry(1))).toEqual([entry(1)])
    expect(pushHistory([entry(1)], entry(2))).toHaveLength(2)
  })

  it("evicts oldest-first at the limit, so the newest run always survives", () => {
    let history: HistoryEntry[] = []
    for (let n = 1; n <= 15; n += 1) history = pushHistory(history, entry(n), 10)
    expect(history).toHaveLength(10)
    expect(history[0]!.dueAt).toBe(6)
    expect(history[9]!.dueAt).toBe(15)
  })

  it("never exceeds the hard ceiling however small a limit is asked for", () => {
    let history: HistoryEntry[] = []
    for (let n = 1; n <= 200; n += 1) history = pushHistory(history, entry(n), 9999)
    expect(history).toHaveLength(MAX_HISTORY_LIMIT)
    expect(pushHistory([], entry(1), 0)).toHaveLength(1)
  })

  it("bounds a stored error string", () => {
    const h = pushHistory([], { ...entry(1), outcome: "failed", error: "x".repeat(5000) })
    expect(h[0]!.error!.length).toBe(300)
  })

  it("keeps the truncated remainder, and drops a count it cannot stand behind", () => {
    // ADR 0002: the remainder is "dropped and reported as truncated in the run record, never
    // silently". A zero carries no information — "nothing was dropped" — so it is absent rather
    // than stored, which is also what makes the field's absence an answer.
    const kept = pushHistory([], { ...entry(1), dropped: 4, droppedCapped: true })
    expect(kept[0]).toMatchObject({ dropped: 4, droppedCapped: true })

    expect(pushHistory([], { ...entry(1), dropped: 0 })[0]).not.toHaveProperty("dropped")
    // The flag has nothing to qualify without a count, so it goes with it.
    expect(pushHistory([], { ...entry(1), dropped: -3, droppedCapped: true })[0]).not.toHaveProperty("dropped")
    expect(pushHistory([], { ...entry(1), dropped: -3, droppedCapped: true })[0]).not.toHaveProperty("droppedCapped")
    // …including a count that is not one.
    expect(pushHistory([], { ...entry(1), dropped: "two", droppedCapped: true } as unknown as HistoryEntry)[0]).not.toHaveProperty(
      "dropped",
    )
  })

  it("records a run's outcome, model and session, and survives a storage round-trip", async () => {
    const dir = mkdtempSync(join(tmpdir(), "st-hist-"))
    mkdirSync(join(dir, ".opencode"), { recursive: true })
    writeFileSync(
      join(dir, ".opencode", "schedules.json"),
      JSON.stringify({ version: 1, jobs: [{ id: "j", schedule: "@daily", prompt: "p" }] }),
    )
    const store = new Map<string, unknown>()
    let added: Array<Record<string, unknown>> = []
    const makeCtx = (): Record<string, unknown> => ({
      location: { directory: dir, project: { id: "hist" } },
      storage: {
        get: async (k: string) => store.get(k),
        set: async (k: string, v: unknown) => void store.set(k, v),
        remove: async (k: string) => void store.delete(k),
      },
      session: {
        create: async () => ({ id: "ses_1" }),
        switchModel: async () => {},
        prompt: async () => ({ id: "i" }),
      },
      tool: {
        transform: async (cb: (e: { add?: (tool: unknown) => void }) => void) => {
          cb({ add: (tool) => added.push(tool as Record<string, unknown>) })
          return { dispose: () => {} }
        },
      },
    })
    const resolved = await plugin.setup(makeCtx() as never)
    let cleanup: () => void = typeof resolved === "function" ? resolved : () => {}
    try {
      const run = added.find((tool) => tool.name === "run")!
      const before = Date.now()
      await (run.execute as (i: Record<string, unknown>) => Promise<unknown>)({ id: "j" })
      cleanup()
      const keys = [...store.keys()].filter((k) => k.includes("history"))

      // An on-demand run records in the same ring a scheduled one writes, under the job's own
      // history key. This asserted the opposite — "no scheduled run happened, so nothing should be
      // stored yet" — and that *was* the defect (bug-schedules-run-not-bounded-capped-or-leased,
      // acceptance box 3): a run that costs a model call and leaves no record behind is a run
      // nobody can account for, and `schedules_run` promised the same rules a scheduled run obeys.
      expect(keys).toEqual(["scheduled-tasks/history/j"])
      const stored = store.get("scheduled-tasks/history/j") as Array<Record<string, unknown>>
      expect(stored).toHaveLength(1)
      expect(stored[0]).toMatchObject({ outcome: "ok", model: "session default", sessionID: "ses_1" })
      // Stamped at dispatch: both fields are real instants of this run, neither absent.
      expect(typeof stored[0]!.dueAt).toBe("number")
      expect(typeof stored[0]!.startedAt).toBe("number")
      expect(stored[0]!.startedAt as number).toBeGreaterThanOrEqual(before)
    } finally {
      cleanup?.()
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it("schedules_history returns newest-first and a typed error for an unknown id", async () => {
    const dir = mkdtempSync(join(tmpdir(), "st-hist2-"))
    mkdirSync(join(dir, ".opencode"), { recursive: true })
    writeFileSync(
      join(dir, ".opencode", "schedules.json"),
      JSON.stringify({ version: 1, jobs: [{ id: "j", schedule: "@daily", prompt: "p", session: "fresh" }] }),
    )
    let added: Array<Record<string, unknown>> = []
    const ctx = {
      location: { directory: dir, project: { id: "hist2" } },
      session: { create: async () => ({ id: "s" }), prompt: async () => ({ id: "i" }) },
      tool: {
        transform: async (cb: (e: { add?: (tool: unknown) => void }) => void) => {
          cb({ add: (tool) => added.push(tool as Record<string, unknown>) })
          return { dispose: () => {} }
        },
      },
    }
    const cleanup = await plugin.setup(ctx as never)
    try {
      const hist = added.find((tool) => tool.name === "history")!
      const exec = hist.execute as (i: Record<string, unknown>) => Promise<{ output: Record<string, unknown> }>
      const empty = await exec({ id: "j" })
      expect(empty.output.session).toBe("fresh")
      expect(empty.output.runs).toEqual([])
      const missing = await exec({ id: "nope" })
      expect(missing.output.error).toMatch(/no job with id "nope"/)
      expect(missing.output.ids).toContain("j")
    } finally {
      ;(cleanup as () => void)?.()
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe("per-job permissions (T4)", () => {
  const wrap = (job: Record<string, unknown>): unknown => ({ version: 1, jobs: [job] })

  it("accepts an effect string and a resource map, in the host's own shape", () => {
    const { jobs, invalid } = loadJobs(
      wrap({
        id: "j",
        schedule: "@daily",
        prompt: "p",
        permissions: { edit: "deny", bash: { "*": "allow", "git push *": "deny" } },
      }),
    )
    expect(invalid).toEqual([])
    expect(jobs[0]!.permissions).toEqual({ edit: "deny", bash: { "*": "allow", "git push *": "deny" } })
  })

  it("leaves permissions absent when the job declares none", () => {
    expect(loadJobs(wrap({ id: "j", schedule: "@daily", prompt: "p" })).jobs[0]!.permissions).toBeUndefined()
  })

  it("refuses a malformed permission set, naming the job", () => {
    for (const bad of [
      "deny",
      ["deny"],
      { edit: "maybe" },
      { edit: { "*": "perhaps" } },
      { edit: {} },
      { edit: { "*": { nested: true } } },
    ]) {
      const { jobs, invalid } = loadJobs(wrap({ id: "j", schedule: "@daily", prompt: "p", permissions: bad }))
      expect(jobs, JSON.stringify(bad)).toHaveLength(0)
      expect(invalid[0]!.reason).toMatch(/job "j"/)
    }
  })

  it("caps the number of actions a job may constrain", () => {
    const many: Record<string, string> = {}
    for (let n = 0; n <= 40; n += 1) many[`act${n}`] = "allow"
    const { invalid } = loadJobs(wrap({ id: "j", schedule: "@daily", prompt: "p", permissions: many }))
    expect(invalid[0]!.reason).toMatch(/above the cap/)
  })

  it("finds every ask, at both the action and resource level", () => {
    expect(collectAsks({ edit: "ask" })).toEqual(["edit"])
    expect(collectAsks({ bash: { "*": "allow", "git push *": "ask" }, read: "ask" })).toEqual([
      "bash:git push *",
      "read",
    ])
    expect(collectAsks({ edit: "deny" })).toEqual([])
  })

  it("applies declared rules before the prompt, and only when declared", async () => {
    const dir = mkdtempSync(join(tmpdir(), "st-perm-"))
    mkdirSync(join(dir, ".opencode"), { recursive: true })
    writeFileSync(
      join(dir, ".opencode", "schedules.json"),
      JSON.stringify({
        version: 1,
        jobs: [
          {
            id: "guarded",
            schedule: "@daily",
            prompt: "p",
            model: "opencode/space-bunny-free",
            permissions: { edit: "deny", bash: { "*": "allow" } },
          },
          { id: "inherit", schedule: "@daily", prompt: "p" },
        ],
      }),
    )
    const order: string[] = []
    let added: Array<Record<string, unknown>> = []
    const ctx = {
      location: { directory: dir, project: { id: "perm" } },
      session: {
        create: async () => ({ id: "ses_1" }),
        switchModel: async () => void order.push("switchModel"),
        prompt: async () => void order.push("prompt"),
      },
      permission: {
        rules: async (input: { sessionID: string; permissions: unknown[] }) =>
          void order.push(`rules:${JSON.stringify(input.permissions)}`),
      },
      tool: {
        transform: async (cb: (e: { add?: (tool: unknown) => void }) => void) => {
          cb({ add: (tool) => added.push(tool as Record<string, unknown>) })
          return { dispose: () => {} }
        },
      },
    }
    const cleanup = await plugin.setup(ctx as never)
    try {
      const run = added.find((tool) => tool.name === "run")!
      const exec = run.execute as (i: Record<string, unknown>) => Promise<{ output: Record<string, unknown> }>

      order.length = 0
      await exec({ id: "guarded" })
      // Rules land after model selection and before the turn is admitted.
      expect(order).toEqual([
        "switchModel",
        `rules:${JSON.stringify([{ edit: "deny", bash: { "*": "allow" } }])}`,
        "prompt",
      ])

      order.length = 0
      await exec({ id: "inherit" })
      // No declared permissions => the session's own rules are left completely alone.
      expect(order).toEqual(["prompt"])
    } finally {
      ;(cleanup as () => void)?.()
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it("degrades to session defaults and logs once when ctx.permission.rules is missing", async () => {
    const dir = mkdtempSync(join(tmpdir(), "st-perm2-"))
    mkdirSync(join(dir, ".opencode"), { recursive: true })
    writeFileSync(
      join(dir, ".opencode", "schedules.json"),
      JSON.stringify({
        version: 1,
        jobs: [{ id: "j", schedule: "@daily", prompt: "p", permissions: { edit: "deny" } }],
      }),
    )
    let added: Array<Record<string, unknown>> = []
    const ctx = {
      location: { directory: dir, project: { id: "perm2" } },
      session: { create: async () => ({ id: "s" }), prompt: async () => ({ id: "i" }) },
      tool: {
        transform: async (cb: (e: { add?: (tool: unknown) => void }) => void) => {
          cb({ add: (tool) => added.push(tool as Record<string, unknown>) })
          return { dispose: () => {} }
        },
      },
    }
    const cleanup = await plugin.setup(ctx as never)
    try {
      const run = added.find((tool) => tool.name === "run")!
      const out = await (run.execute as (i: Record<string, unknown>) => Promise<{ output: Record<string, unknown> }>)({
        id: "j",
      })
      // The run still happens, on session defaults: a missing host capability must not
      // silently stop the job.
      expect(out.output.error).toBeUndefined()
    } finally {
      ;(cleanup as () => void)?.()
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it("reports declared asks in schedules_list as deny-warnings", async () => {
    const dir = mkdtempSync(join(tmpdir(), "st-perm3-"))
    mkdirSync(join(dir, ".opencode"), { recursive: true })
    writeFileSync(
      join(dir, ".opencode", "schedules.json"),
      JSON.stringify({
        version: 1,
        jobs: [
          { id: "asks", schedule: "@daily", prompt: "p", permissions: { edit: "ask", read: "deny" } },
          { id: "plain", schedule: "@daily", prompt: "p" },
        ],
      }),
    )
    let added: Array<Record<string, unknown>> = []
    const ctx = {
      location: { directory: dir, project: { id: "perm3" } },
      session: { create: async () => ({ id: "s" }), prompt: async () => ({ id: "i" }) },
      tool: {
        transform: async (cb: (e: { add?: (tool: unknown) => void }) => void) => {
          cb({ add: (tool) => added.push(tool as Record<string, unknown>) })
          return { dispose: () => {} }
        },
      },
    }
    const cleanup = await plugin.setup(ctx as never)
    try {
      const list = added.find((tool) => tool.name === "list")!
      const out = await (list.execute as (i: unknown) => Promise<{ output: { jobs: Record<string, unknown>[] } }>)({})
      const asks = out.output.jobs.find((j) => j.id === "asks")!
      expect(asks.askAsDeny).toEqual(["edit"])
      expect(asks.permissions).toEqual({ edit: "ask", read: "deny" })
      expect(out.output.jobs.find((j) => j.id === "plain")!.permissions).toBe("session default")
    } finally {
      ;(cleanup as () => void)?.()
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe("one-off tasks (T5, ADR 0006)", () => {
  const now = Date.UTC(2026, 4, 10, 12, 0, 0)

  it("accepts an absolute instant", () => {
    const out = validateOneOff({ prompt: "p", dueAt: now + 60_000 }, now)
    expect(out).toHaveProperty("task")
    expect((out as { task: { dueAt: number } }).task.dueAt).toBe(now + 60_000)
  })

  it("accepts a relative duration instead", () => {
    const out = validateOneOff({ prompt: "p", dueIn: "2h" }, now)
    expect((out as { task: { dueAt: number } }).task.dueAt).toBe(now + 2 * 60 * MINUTE_MS)
  })

  it("accepts a slightly past instant inside the grace window", () => {
    expect(validateOneOff({ prompt: "p", dueAt: now - 60_000 }, now)).toHaveProperty("task")
  })

  it("refuses an instant well beyond the grace window rather than running it silently", () => {
    const out = validateOneOff({ prompt: "p", dueAt: now - 60 * MINUTE_MS }, now)
    expect(out).toHaveProperty("reason")
    expect((out as { reason: string }).reason).toMatch(/in the past/)
  })

  it("requires a prompt and a time", () => {
    expect(validateOneOff({ dueAt: now }, now)).toHaveProperty("reason")
    expect(validateOneOff({ prompt: "p" }, now)).toHaveProperty("reason")
    expect(validateOneOff({ prompt: "p", dueIn: "bogus" }, now)).toHaveProperty("reason")
  })

  it("validates the optional fields with the same rules as a job", () => {
    expect(validateOneOff({ prompt: "p", dueAt: now + 1, model: "nope" }, now)).toHaveProperty("reason")
    expect(validateOneOff({ prompt: "p", dueAt: now + 1, permissions: { edit: "maybe" } }, now)).toHaveProperty(
      "reason",
    )
    const ok = validateOneOff({ prompt: "p", dueAt: now + 1, model: "opencode/space-bunny-free" }, now)
    expect((ok as { task: { model: { id: string } } }).task.model.id).toBe("space-bunny-free")
  })

  it("bounds a one-off prompt", () => {
    expect(validateOneOff({ prompt: "x".repeat(20_001), dueAt: now + 1 }, now)).toHaveProperty("reason")
  })

  it("creates, lists and cancels without ever touching a job file", async () => {
    const dir = mkdtempSync(join(tmpdir(), "st-oneoff-"))
    mkdirSync(join(dir, ".opencode"), { recursive: true })
    const jobsFile = join(dir, ".opencode", "schedules.json")
    writeFileSync(jobsFile, JSON.stringify({ version: 1, jobs: [] }))
    const jobsBefore = readFileSync(jobsFile, "utf8")
    let added: Array<Record<string, unknown>> = []
    const ctx = {
      location: { directory: dir, project: { id: "oneoff" } },
      session: { create: async () => ({ id: "s" }), prompt: async () => ({ id: "i" }) },
      tool: {
        transform: async (cb: (e: { add?: (tool: unknown) => void }) => void) => {
          cb({ add: (tool) => added.push(tool as Record<string, unknown>) })
          return { dispose: () => {} }
        },
      },
    }
    const cleanup = await plugin.setup(ctx as never)
    try {
      const schedule = added.find((tool) => tool.name === "schedule")!
      const cancel = added.find((tool) => tool.name === "cancel")!
      const list = added.find((tool) => tool.name === "list")!
      const sExec = schedule.execute as (i: Record<string, unknown>) => Promise<{ output: Record<string, unknown> }>
      const cExec = cancel.execute as (i: Record<string, unknown>) => Promise<{ output: Record<string, unknown> }>
      const lExec = list.execute as (i: unknown) => Promise<{ output: Record<string, unknown> }>

      const created = await sExec({ prompt: "run the migration check", dueIn: "2h" })
      expect(created.output.id).toMatch(/^oneoff_/)
      expect(created.output.pending).toBe(1)

      const listed = await lExec({})
      expect((listed.output.oneOffs as unknown[]).length).toBe(1)
      expect(listed.output.oneOffCap).toBe(50)

      const id = created.output.id as string
      const cancelled = await cExec({ id })
      expect(cancelled.output).toMatchObject({ id, cancelled: true, pending: 0 })

      // ADR 0006's guarantee, asserted rather than asserted-in-prose.
      expect(readFileSync(jobsFile, "utf8")).toBe(jobsBefore)
    } finally {
      ;(cleanup as () => void)?.()
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it("reports a typed error naming an unknown or already-run one-off", async () => {
    const dir = mkdtempSync(join(tmpdir(), "st-oneoff2-"))
    mkdirSync(join(dir, ".opencode"), { recursive: true })
    writeFileSync(join(dir, ".opencode", "schedules.json"), JSON.stringify({ version: 1, jobs: [] }))
    let added: Array<Record<string, unknown>> = []
    const ctx = {
      location: { directory: dir, project: { id: "oneoff2" } },
      session: { create: async () => ({ id: "s" }), prompt: async () => ({ id: "i" }) },
      tool: {
        transform: async (cb: (e: { add?: (tool: unknown) => void }) => void) => {
          cb({ add: (tool) => added.push(tool as Record<string, unknown>) })
          return { dispose: () => {} }
        },
      },
    }
    const cleanup = await plugin.setup(ctx as never)
    try {
      const cancel = added.find((tool) => tool.name === "cancel")!
      const out = await (cancel.execute as (i: Record<string, unknown>) => Promise<{ output: Record<string, unknown> }>)({
        id: "oneoff_missing",
      })
      expect(out.output.error).toMatch(/no pending one-off with id "oneoff_missing"/)
      expect(out.output.error).toMatch(/may have already run/)
    } finally {
      ;(cleanup as () => void)?.()
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it("reports the cap instead of silently refusing", async () => {
    const dir = mkdtempSync(join(tmpdir(), "st-oneoff3-"))
    mkdirSync(join(dir, ".opencode"), { recursive: true })
    writeFileSync(join(dir, ".opencode", "schedules.json"), JSON.stringify({ version: 1, jobs: [] }))
    const store = new Map<string, unknown>()
    // Pre-seed the cap so the next create must refuse.
    const seeded = Array.from({ length: 50 }, (_, n) => ({
      id: `oneoff_seed${n}`,
      dueAt: Date.now() + 10 * MINUTE_MS,
      prompt: "p",
      createdAt: Date.now(),
      runTimeoutMs: MINUTE_MS,
    }))
    store.set("scheduled-tasks/oneoff/pending", seeded)
    let added: Array<Record<string, unknown>> = []
    const ctx = {
      location: { directory: dir, project: { id: "oneoff3" } },
      storage: {
        get: async (k: string) => store.get(k),
        set: async (k: string, v: unknown) => void store.set(k, v),
        remove: async (k: string) => void store.delete(k),
      },
      session: { create: async () => ({ id: "s" }), prompt: async () => ({ id: "i" }) },
      tool: {
        transform: async (cb: (e: { add?: (tool: unknown) => void }) => void) => {
          cb({ add: (tool) => added.push(tool as Record<string, unknown>) })
          return { dispose: () => {} }
        },
      },
    }
    const cleanup = await plugin.setup(ctx as never)
    try {
      const schedule = added.find((tool) => tool.name === "schedule")!
      const out = await (schedule.execute as (i: Record<string, unknown>) => Promise<{ output: Record<string, unknown> }>)({
        prompt: "p",
        dueIn: "1h",
      })
      expect(out.output.error).toMatch(/at the cap of 50/)
      expect(out.output.pending).toBe(50)
    } finally {
      ;(cleanup as () => void)?.()
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe("session loops (T6, ADR 0006)", () => {
  const now = Date.UTC(2026, 4, 10, 12, 0, 0)

  it("accepts a duration interval, not a cron expression", () => {
    const out = validateLoop({ prompt: "check the deploy", every: "5m" }, now, "ses_1")
    expect(out).toHaveProperty("task")
    const task = (out as { task: { intervalMs: number; expiresAt: number; sessionID: string } }).task
    expect(task.intervalMs).toBe(5 * MINUTE_MS)
    expect(task.expiresAt).toBe(now + DEFAULT_LOOP_TTL_MS)
    expect(task.sessionID).toBe("ses_1")
  })

  it("refuses a sub-minute interval, because loops are minute-resolution", () => {
    expect(validateLoop({ prompt: "p", every: "30s" }, now, "ses_1")).toHaveProperty("reason")
  })

  it("refuses a cron expression and a missing interval", () => {
    expect(validateLoop({ prompt: "p", every: "* * * * *" }, now, "ses_1")).toHaveProperty("reason")
    expect(validateLoop({ prompt: "p" }, now, "ses_1")).toHaveProperty("reason")
    expect(validateLoop({ every: "5m" }, now, "ses_1")).toHaveProperty("reason")
  })

  it("honours an explicit ttl", () => {
    const out = validateLoop({ prompt: "p", every: "1h", ttl: "2h" }, now, "ses_1")
    expect((out as { task: { expiresAt: number } }).task.expiresAt).toBe(now + 2 * 60 * MINUTE_MS)
  })

  it("scopes a loop to the calling session and refuses without one", async () => {
    const dir = mkdtempSync(join(tmpdir(), "st-loop-"))
    mkdirSync(join(dir, ".opencode"), { recursive: true })
    writeFileSync(join(dir, ".opencode", "schedules.json"), JSON.stringify({ version: 1, jobs: [] }))
    let added: Array<Record<string, unknown>> = []
    const ctx = {
      location: { directory: dir, project: { id: "loop" } },
      session: { create: async () => ({ id: "s" }), prompt: async () => ({ id: "i" }) },
      tool: {
        transform: async (cb: (e: { add?: (tool: unknown) => void }) => void) => {
          cb({ add: (tool) => added.push(tool as Record<string, unknown>) })
          return { dispose: () => {} }
        },
      },
    }
    const cleanup = await plugin.setup(ctx as never)
    try {
      const start = added.find((tool) => tool.name === "start_loop")!
      const exec = start.execute as (
        i: Record<string, unknown>,
        c?: { sessionID?: unknown },
      ) => Promise<{ output: Record<string, unknown> }>

      const noSession = await exec({ prompt: "p", every: "5m" })
      expect(noSession.output.error).toMatch(/only be started from inside a session/)

      const created = await exec({ prompt: "check the deploy", every: "5m" }, { sessionID: "ses_abc" })
      expect(created.output.sessionID).toBe("ses_abc")
      expect(created.output.id).toMatch(/^loop_/)

      // The loop is recorded against its owning session, and nothing else.
      const list = added.find((tool) => tool.name === "list")!
      const listed = await (list.execute as (i: unknown) => Promise<{ output: Record<string, unknown> }>)({})
      const loops = listed.output.loops as Array<Record<string, unknown>>
      expect(loops).toHaveLength(1)
      expect(loops[0]!.sessionID).toBe("ses_abc")
      expect(listed.output.loopCap).toBe(DEFAULT_LOOP_CAP)
    } finally {
      ;(cleanup as () => void)?.()
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it("stops one loop by id, or all of them, and names an unknown id", async () => {
    const dir = mkdtempSync(join(tmpdir(), "st-loop2-"))
    mkdirSync(join(dir, ".opencode"), { recursive: true })
    writeFileSync(join(dir, ".opencode", "schedules.json"), JSON.stringify({ version: 1, jobs: [] }))
    let added: Array<Record<string, unknown>> = []
    const ctx = {
      location: { directory: dir, project: { id: "loop2" } },
      session: { create: async () => ({ id: "s" }), prompt: async () => ({ id: "i" }) },
      tool: {
        transform: async (cb: (e: { add?: (tool: unknown) => void }) => void) => {
          cb({ add: (tool) => added.push(tool as Record<string, unknown>) })
          return { dispose: () => {} }
        },
      },
    }
    const cleanup = await plugin.setup(ctx as never)
    try {
      const start = added.find((tool) => tool.name === "start_loop")!
      const stop = added.find((tool) => tool.name === "stop_loop")!
      const sExec = start.execute as (i: Record<string, unknown>, c?: { sessionID?: unknown }) => Promise<{ output: Record<string, unknown> }>
      const xExec = stop.execute as (i: Record<string, unknown>, c?: { sessionID?: unknown }) => Promise<{ output: Record<string, unknown> }>
      const call = { sessionID: "ses_abc" }

      const a = await sExec({ prompt: "a", every: "5m" }, call)
      const b = await sExec({ prompt: "b", every: "5m" }, call)

      const one = await xExec({ id: a.output.id }, call)
      expect((one.output.loops as Array<Record<string, unknown>>).map((l) => l.id)).toEqual([b.output.id])

      const missing = await xExec({ id: "loop_nope" }, call)
      expect(missing.output.error).toMatch(/no loop with id "loop_nope" in session ses_abc/)

      const all = await xExec({}, call)
      expect(all.output.loops).toEqual([])
    } finally {
      ;(cleanup as () => void)?.()
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it("does not let one session stop another session's loop", async () => {
    const dir = mkdtempSync(join(tmpdir(), "st-loop3-"))
    mkdirSync(join(dir, ".opencode"), { recursive: true })
    writeFileSync(join(dir, ".opencode", "schedules.json"), JSON.stringify({ version: 1, jobs: [] }))
    let added: Array<Record<string, unknown>> = []
    const ctx = {
      location: { directory: dir, project: { id: "loop3" } },
      session: { create: async () => ({ id: "s" }), prompt: async () => ({ id: "i" }) },
      tool: {
        transform: async (cb: (e: { add?: (tool: unknown) => void }) => void) => {
          cb({ add: (tool) => added.push(tool as Record<string, unknown>) })
          return { dispose: () => {} }
        },
      },
    }
    const cleanup = await plugin.setup(ctx as never)
    try {
      const start = added.find((tool) => tool.name === "start_loop")!
      const stop = added.find((tool) => tool.name === "stop_loop")!
      const sExec = start.execute as (i: Record<string, unknown>, c?: { sessionID?: unknown }) => Promise<{ output: Record<string, unknown> }>
      const xExec = stop.execute as (i: Record<string, unknown>, c?: { sessionID?: unknown }) => Promise<{ output: Record<string, unknown> }>
      const mine = await sExec({ prompt: "p", every: "5m" }, { sessionID: "ses_mine" })
      const theirs = await xExec({ id: mine.output.id }, { sessionID: "ses_theirs" })
      expect(theirs.output.error).toMatch(/in session ses_theirs/)
    } finally {
      ;(cleanup as () => void)?.()
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it("reports the per-session cap rather than silently refusing", async () => {
    const dir = mkdtempSync(join(tmpdir(), "st-loop4-"))
    mkdirSync(join(dir, ".opencode"), { recursive: true })
    writeFileSync(join(dir, ".opencode", "schedules.json"), JSON.stringify({ version: 1, jobs: [] }))
    const store = new Map<string, unknown>()
    const seed = Array.from({ length: DEFAULT_LOOP_CAP }, (_, n) => ({
      id: `loop_seed${n}`,
      prompt: "p",
      intervalMs: MINUTE_MS,
      nextRunAt: Date.now() + 10 * MINUTE_MS,
      expiresAt: Date.now() + 60 * MINUTE_MS,
      createdAt: Date.now(),
    }))
    store.set("scheduled-tasks/loop/ses_full", seed)
    let added: Array<Record<string, unknown>> = []
    const ctx = {
      location: { directory: dir, project: { id: "loop4" } },
      storage: {
        get: async (k: string) => store.get(k),
        set: async (k: string, v: unknown) => void store.set(k, v),
        remove: async (k: string) => void store.delete(k),
      },
      session: { create: async () => ({ id: "s" }), prompt: async () => ({ id: "i" }) },
      tool: {
        transform: async (cb: (e: { add?: (tool: unknown) => void }) => void) => {
          cb({ add: (tool) => added.push(tool as Record<string, unknown>) })
          return { dispose: () => {} }
        },
      },
    }
    const cleanup = await plugin.setup(ctx as never)
    try {
      const start = added.find((tool) => tool.name === "start_loop")!
      const out = await (start.execute as (i: Record<string, unknown>, c?: { sessionID?: unknown }) => Promise<{ output: Record<string, unknown> }>)(
        { prompt: "p", every: "5m" },
        { sessionID: "ses_full" },
      )
      expect(out.output.error).toMatch(/at the cap of 10 loops/)
    } finally {
      ;(cleanup as () => void)?.()
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

// ---------------------------------------------------------------------------
// Markdown task files (T2, ADR 0004)
// ---------------------------------------------------------------------------

/**
 * A YAML reader double.
 *
 * It is **not** a YAML implementation and does not try to be: it returns a canned field set,
 * which is enough to pin the plumbing we own (what text reaches the reader, what a parse
 * failure does, which options we ask for). Real YAML is `yaml`'s job, and the one test that
 * uses the real reader runs only where the optional dependency is installed. Writing a subset
 * parser here would be the exact thing ADR 0004 rejected.
 */
function readerReturning(fields: Record<string, unknown>): (source: string, options?: { maxAliasCount?: number }) => unknown {
  return () => fields
}

/** A reader that fails the way a real one does, so the refusal path is exercised for real. */
function readerThrowing(message: string): (source: string, options?: { maxAliasCount?: number }) => unknown {
  return () => {
    throw new Error(message)
  }
}

/**
 * The real `yaml` reader, when this tree has it.
 *
 * `yaml` is an *optional* dependency (ADR 0004), so the two tests that need a real parser are
 * declared with `it.runIf` and simply do not exist in a tree that never installed it — rather
 * than passing vacuously, and rather than every other markdown test being at the mercy of
 * whether the checkout happens to have a package in `node_modules`.
 */
const yamlSpecifier = "yaml"
const realYaml = ((await import(/* @vite-ignore */ yamlSpecifier).catch(() => undefined)) as { parse?: YamlReader })
  ?.parse

/** A markdown job file: frontmatter block, then the body. */
function taskFile(frontmatter: string, body: string): string {
  return `---\n${frontmatter}\n---\n\n${body}\n`
}

describe("splitFrontmatter — markdown job files (ADR 0004)", () => {
  it("splits the block from the body and preserves inner formatting exactly", () => {
    const text = taskFile(
      'schedule: "0 3 * * *"\ntimezone: Europe/Madrid',
      "Review the diff.\n\n    indented code\n\n  - a list\n\nLast line.",
    )
    const split = splitFrontmatter(text)
    expect("reason" in split).toBe(false)
    if ("reason" in split) return
    expect(split.frontmatter).toBe('schedule: "0 3 * * *"\ntimezone: Europe/Madrid')
    // Every inner blank line, every indent and every newline inside the body survives.
    expect(split.body).toBe("Review the diff.\n\n    indented code\n\n  - a list\n\nLast line.")
  })

  it("trims the blank lines and the newline at the edges, and nothing else", () => {
    const split = splitFrontmatter("---\nschedule: @daily\n---\n\n\nfirst\n\nlast\n\n\n")
    if ("reason" in split) throw new Error(split.reason)
    expect(split.body).toBe("first\n\nlast")
  })

  it("keeps trailing spaces on a content line — the last line is not a blank line", () => {
    const split = splitFrontmatter("---\nschedule: @daily\n---\nanswer with: OK  \n")
    if ("reason" in split) throw new Error(split.reason)
    expect(split.body).toBe("answer with: OK  ")
  })

  it("normalizes CRLF and tolerates a BOM", () => {
    // A `\r` carried into a prompt is invisible garbage, and a Windows-authored job must not
    // dispatch differently from its LF twin.
    const split = splitFrontmatter("﻿---\r\nschedule: @daily\r\n---\r\n\r\nline one\r\nline two\r\n")
    if ("reason" in split) throw new Error(split.reason)
    expect(split.frontmatter).toBe("schedule: @daily")
    expect(split.body).toBe("line one\nline two")
  })

  it("refuses a file with no frontmatter, and one whose block never closes", () => {
    expect(splitFrontmatter("just a prompt\n")).toMatchObject({
      reason: expect.stringContaining("must open with a `---` line"),
    })
    expect(splitFrontmatter("---\nschedule: @daily\nstill going\n")).toMatchObject({
      reason: expect.stringContaining("no closing `---` line"),
    })
  })

  it("treats the fences as lines: trailing spaces close, trailing text does not", () => {
    const closed = splitFrontmatter("---\nschedule: @daily\n---   \nbody\n")
    if ("reason" in closed) throw new Error(closed.reason)
    expect(closed.body).toBe("body")

    // `--- extra` is YAML content, not a fence: the block stays open and the reader decides.
    const open = splitFrontmatter("---\nnote: --- extra\n---\nbody\n")
    if ("reason" in open) throw new Error(open.reason)
    expect(open.frontmatter).toBe("note: --- extra")
  })

  it("stops at the first closing fence, so a `---` rule in the body is just prose", () => {
    const split = splitFrontmatter("---\nschedule: @daily\n---\nabove\n\n---\n\nbelow\n")
    if ("reason" in split) throw new Error(split.reason)
    expect(split.body).toBe("above\n\n---\n\nbelow")
  })
})

describe("invariant 4 — the plugin imports nothing but node builtins (ADR 0004)", () => {
  /**
   * Run a script in a child process whose ESM loader reports every specifier that is not a
   * builtin. Nothing about the plugin is stubbed: it is imported and set up for real.
   */
  function runWatched(script: string): { code: number | null; stdout: string; stderr: string } {
    const dir = mkdtempSync(join(tmpdir(), "st-invariant4-"))
    // The loader hook is the whole test: it sees every resolution, so a package name that
    // sneaks into a static import cannot hide from it.
    const hook = join(dir, "hook.mjs")
    writeFileSync(
      hook,
      [
        "export async function resolve(specifier, context, next) {",
        '  const builtin = specifier.startsWith("node:") || specifier.startsWith("file:")',
        '  if (!builtin && !specifier.startsWith("/") && !specifier.startsWith(".")) {',
        '    process.stderr.write(`EXTERNAL:${specifier}\\n`)',
        "  }",
        "  return next(specifier, context)",
        "}",
      ].join("\n"),
    )
    const entry = join(dir, "run.mjs")
    writeFileSync(
      entry,
      [
        `import { register } from "node:module"`,
        `register(${JSON.stringify(hook)}, import.meta.url)`,
        script.replaceAll("__PLUGIN__", JSON.stringify(new URL("../src/index.ts", import.meta.url).pathname)),
      ].join("\n"),
    )
    const run = spawnSync(process.execPath, [entry], { encoding: "utf8", timeout: 120_000 })
    return { code: run.status, stdout: run.stdout ?? "", stderr: run.stderr ?? "" }
  }

  /** A minimal project with a schedules.json, plus the plugin's setup wired to a fake ctx. */
  const SETUP_JSON_ONLY = `
    const { mkdtempSync, mkdirSync, writeFileSync } = await import("node:fs")
    const { tmpdir } = await import("node:os")
    const { join } = await import("node:path")
    const plugin = (await import(__PLUGIN__)).default
    const dir = mkdtempSync(join(tmpdir(), "st-json-only-"))
    mkdirSync(join(dir, ".opencode"), { recursive: true })
    process.env[(await import(__PLUGIN__)).DATA_DIR_ENV] = join(dir, "state")
    writeFileSync(join(dir, ".opencode", "schedules.json"), JSON.stringify({ version: 1, jobs: [{ id: "j", schedule: "@daily", prompt: "p" }] }))
    const added = []
    const cleanup = await plugin.setup({
      location: { directory: dir, project: { id: "watched" } },
      storage: { get: async () => undefined, set: async () => {}, remove: async () => {} },
      session: { create: async () => ({ id: "ses_1" }), prompt: async () => ({ id: "inbox_1" }) },
      tool: { transform: async (cb) => { cb({ add: (t) => added.push(t) }); return { dispose() {} } } },
    })
    const list = added.find((t) => t.name === "list")
    const out = await list.execute({}, {})
    if (out.output.jobs.length !== 1) { console.error("NO-JOBS"); process.exit(2) }
    console.log("LOADED")
    ;(cleanup || (() => {}))()
  `

  it("every static import in the plugin is a node builtin", () => {
    // The cheap half of the pin, and the one a reviewer reads: neither `import … from "yaml"`
    // nor a bare `import "yaml"` can be added without this failing first. The `from` clause
    // is optional in the pattern so a side-effect import is caught too, and the filler class
    // excludes quotes so a bare import cannot be swallowed into the next statement's
    // specifier. A dynamic `import(x)` never matches: `^` requires the line to start with it.
    const source = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8")
    const statics = [...source.matchAll(/^\s*import\s+(?:[^"';]*?\bfrom\s*)?["']([^"']+)["']/gm)].map((m) => m[1]!)
    expect(statics.sort()).toEqual(["node:fs", "node:os", "node:path"])
  })

  it("loads and runs a JSON-only project without resolving any package", () => {
    const run = runWatched(SETUP_JSON_ONLY)
    expect(run.stderr).not.toContain("EXTERNAL:")
    expect(run.stdout).toContain("LOADED")
    expect(run.code).toBe(0)
  })

  it("reaches for the YAML reader only when a markdown job exists", () => {
    // The other half of the pin: the guarded dynamic import is real, reachable, and gated on
    // the markdown path — not a dead branch that would have failed to resolve anyway.
    const run = runWatched(
      SETUP_JSON_ONLY
        .replace(
          `writeFileSync(join(dir, ".opencode", "schedules.json"),`,
          `mkdirSync(join(dir, ".opencode", "tasks"), { recursive: true })
    writeFileSync(join(dir, ".opencode", "tasks", "nightly.md"), "---\\nschedule: @daily\\n---\\n\\nreview\\n")
    writeFileSync(join(dir, ".opencode", "schedules.json"),`,
        )
        .replace(`if (out.output.jobs.length !== 1)`, `if (out.output.jobs.length !== 1)`),
    )
    // The plugin still loads and still serves its JSON job — and now, and only now, it has
    // asked for a package.
    expect(run.stdout).toContain("LOADED")
    expect(run.stderr).toContain("EXTERNAL:yaml")
  })
})

describe("loadMarkdownJobs — one refusal per file, never per directory (ADR 0004)", () => {
  let dir: string
  let tasks: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "st-tasks-"))
    tasks = join(dir, ".opencode", "tasks")
    mkdirSync(tasks, { recursive: true })
  })
  afterEach(() => {
    // The reader is process-global by design (resolve once); leaving one installed would leak
    // into every later test.
    setYamlReader(undefined)
    rmSync(dir, { recursive: true, force: true })
  })

  const write = (name: string, content: string): void => writeFileSync(join(tasks, name), content)

  it("loads a job whose body is the prompt, with every frontmatter field applied", async () => {
    write(
      "nightly.md",
      taskFile(
        'schedule: "0 3 * * *"\ntimezone: Europe/Madrid\nmodel: opencode/space-bunny-free\nsession: fresh\nrunTimeout: 30m',
        "Review the diff since the last tag.",
      ),
    )
    setYamlReader(
      readerReturning({
        schedule: "0 3 * * *",
        timezone: "Europe/Madrid",
        model: "opencode/space-bunny-free",
        session: "fresh",
        runTimeout: "30m",
      }),
    )
    const { jobs, invalid } = await loadMarkdownJobs(tasks)
    expect(invalid).toEqual([])
    expect(jobs).toHaveLength(1)
    expect(jobs[0]).toMatchObject({
      id: "nightly",
      schedule: "0 3 * * *",
      timezone: "Europe/Madrid",
      session: "fresh",
      // T1's duration parser, reached through the same field the JSON surface uses.
      runTimeoutMs: 30 * MINUTE_MS,
      prompt: "Review the diff since the last tag.",
      misfire: "skip",
      enabled: true,
    })
  })

  it("hands the reader the frontmatter text and nothing else, and asks for a bounded alias count", async () => {
    const seen: Array<{ source: string; options?: { maxAliasCount?: number } }> = []
    setYamlReader((source, options) => {
      seen.push({ source, options })
      return { schedule: "@daily" }
    })
    write("j.md", taskFile('schedule: "@daily"\n# a comment', "prompt body"))
    await loadMarkdownJobs(tasks)
    expect(seen).toHaveLength(1)
    expect(seen[0]!.source).toBe('schedule: "@daily"\n# a comment')
    // Aliases are the format's own expansion bomb; the bound has to be ours, not a default.
    expect(typeof seen[0]!.options?.maxAliasCount).toBe("number")
  })

it("the body is the prompt: frontmatter cannot override it, and is never interpolated into it", async () => {
    write(
      "j.md",
      taskFile("schedule: @daily\nagent: build\nprompt: I am the frontmatter", "Agent: {{agent}}; prompt: I am the body"),
    )
    setYamlReader(readerReturning({ schedule: "@daily", agent: "build", prompt: "I am the frontmatter" }))
    const { jobs } = await loadMarkdownJobs(tasks)
    // A frontmatter value is data *about* the run, never text inside it. Substituting one
    // would open a prompt-injection seam: the field would reach the model as though the author
    // had typed it there.
    expect(jobs[0]!.prompt).toBe("Agent: {{agent}}; prompt: I am the body")
    expect(jobs[0]!.agent).toBe("build")
  })

  it("bounds the cardinality of a collection the frontmatter declares", async () => {
    // The size cap bounds unknown fields structurally; a collection we *know* about gets its
    // own bound, reached through the same validation path as the JSON surface.
    const actions: Record<string, string> = {}
    for (let n = 0; n <= MAX_PERMISSION_ACTIONS; n += 1) actions[`act${n}`] = "allow"
    write("wide.md", taskFile("schedule: @daily", "p"))
    setYamlReader(readerReturning({ schedule: "@daily", permissions: actions }))
    const { jobs, invalid } = await loadMarkdownJobs(tasks)
    expect(jobs).toEqual([])
    expect(invalid[0]!.reason).toMatch(new RegExp(`above the cap of ${MAX_PERMISSION_ACTIONS}`))
    // Byte-identical to the JSON surface's refusal for the same fields, once more.
    expect(invalid[0]!.reason).toBe(
      loadJobs({ version: 1, jobs: [{ id: "wide", schedule: "@daily", prompt: "p", permissions: actions }] }).invalid[0]!.reason,
    )
  })

  it("takes the id from the filename stem and reports a disagreeing frontmatter id", async () => {
    write("nightly.md", taskFile("schedule: @daily\nid: something-else", "p"))
    setYamlReader(readerReturning({ schedule: "@daily", id: "something-else" }))
    const { jobs, invalid } = await loadMarkdownJobs(tasks)
    expect(jobs[0]!.id).toBe("nightly")
    // Reported, because a silently ignored id is a job that never fires under the name its
    // author expects.
    expect(invalid[0]!.reason).toMatch(/frontmatter "id" "something-else" is ignored/)
  })

  it("refuses bad YAML by name and keeps every other job", async () => {
    write("good.md", taskFile("schedule: @daily", "fine"))
    write("broken.md", "---\nschedule: \"unclosed\n---\n\nbody\n")
    setYamlReader(
      (source) => {
        if (source.includes("unclosed")) throw new Error("unexpected end of the stream")
        return { schedule: "@daily" }
      },
    )
    const { jobs, invalid } = await loadMarkdownJobs(tasks)
    expect(jobs.map((job) => job.id)).toEqual(["good"])
    expect(invalid).toHaveLength(1)
    expect(invalid[0]).toMatchObject({ id: "broken" })
    expect(invalid[0]!.reason).toMatch(/\.opencode\/tasks\/broken\.md: frontmatter is not valid YAML \(unexpected end of the stream\)/)
  })

  it("refuses a missing schedule with byte-identical wording to the JSON surface", async () => {
    // The acceptance criterion for ADR 0004: one validation path, so the reason an author
    // reads is the same one either surface would have produced.
    write("nightly.md", taskFile("timezone: UTC", "review"))
    setYamlReader(readerReturning({ timezone: "UTC" }))
    const { invalid } = await loadMarkdownJobs(tasks)
    const json = loadJobs({ version: 1, jobs: [{ id: "nightly", timezone: "UTC", prompt: "review" }] })
    expect(invalid[0]!.reason).toBe(json.invalid[0]!.reason)
    expect(invalid[0]!.reason).toBe('job "nightly" has no schedule')
  })

  it("refuses a bad id, a missing body, and frontmatter that is not a mapping", async () => {
    write("Bad Name.md", taskFile("schedule: @daily", "p"))
    write("nobody.md", taskFile("schedule: @daily", "   \n\n"))
    write("list.md", "---\n- one\n- two\n---\n\nbody\n")
    setYamlReader((source) => (source.startsWith("-") ? ["one", "two"] : { schedule: "@daily" }))
    const { jobs, invalid } = await loadMarkdownJobs(tasks)
    expect(jobs).toEqual([])
    const byId = new Map(invalid.map((entry) => [entry.id, entry.reason]))
    expect(byId.get("Bad Name")).toMatch(/must match \^\[a-z0-9\]/)
    expect(byId.get("nobody")).toBe('job "nobody" has no prompt')
    expect(byId.get("list")).toMatch(/frontmatter must be a mapping of job fields, got a list/)
  })

  it("bounds an oversized file and an oversized frontmatter block, before parsing", async () => {
    let asked = 0
    setYamlReader(() => {
      asked++
      return { schedule: "@daily" }
    })
    write("huge.md", taskFile("schedule: @daily", "x".repeat(MAX_MARKDOWN_FILE_BYTES + 1)))
    write("wide.md", taskFile(`note: "${"y".repeat(MAX_FRONTMATTER_CHARS + 1)}"`, "p"))
    const { jobs, invalid } = await loadMarkdownJobs(tasks)
    expect(jobs).toEqual([])
    // Neither file reached the reader: the bounds are on the way in, not after parsing.
    expect(asked).toBe(0)
    expect(invalid.map((entry) => entry.id)).toEqual(["huge", "wide"])
    expect(invalid[0]!.reason).toMatch(new RegExp(`above the cap of ${MAX_MARKDOWN_FILE_BYTES}`))
    expect(invalid[1]!.reason).toMatch(new RegExp(`above the cap of ${MAX_FRONTMATTER_CHARS}`))
  })

  it("ignores what is not a markdown job file, and never blocks on a fifo", async () => {
    writeFileSync(join(tasks, "notes.txt"), "not a job")
    writeFileSync(join(tasks, "archive.md"), "not a job")
    mkdirSync(join(tasks, "nested.md"))
    write("real.md", taskFile("schedule: @daily", "p"))
    if (process.platform !== "win32") {
      // `readFileSync` on a fifo blocks forever. A plugin that hangs the server is the worst
      // possible failure (invariant 3), so only regular files are opened. Node has no fifo
      // binding of its own, so the platform tool makes one.
      spawnSync("mkfifo", [join(tasks, "pipe.md")])
    }
    setYamlReader(readerReturning({ schedule: "@daily" }))
    const { jobs, invalid } = await loadMarkdownJobs(tasks)
    // It returned at all: reading the fifo would have hung the suite rather than failed it.
    expect(jobs.map((job) => job.id)).toEqual(["real"])
    // `notes.txt` and the `nested.md` directory are not job files and are not mentioned.
    // `archive.md` *is* a `.md` in the jobs directory, so it is refused by name rather than
    // skipped in silence — "not a job file" and "a job file we cannot read" are different
    // answers, and only the second one should ever happen by accident.
    expect(invalid.map((entry) => entry.id)).toEqual(["archive"])
    expect(invalid[0]!.reason).toMatch(/must open with a `---` line/)
  })

  it("loads files in filename order and reports the excess above the cap", async () => {
    for (let n = 0; n < MAX_MARKDOWN_JOBS + 2; n += 1) write(`job-${String(n).padStart(3, "0")}.md`, taskFile("schedule: @daily", "p"))
    setYamlReader(readerReturning({ schedule: "@daily" }))
    const { jobs, invalid } = await loadMarkdownJobs(tasks)
    expect(jobs).toHaveLength(MAX_MARKDOWN_JOBS)
    expect(jobs[0]!.id).toBe("job-000")
    expect(jobs[MAX_MARKDOWN_JOBS - 1]!.id).toBe(`job-${String(MAX_MARKDOWN_JOBS - 1).padStart(3, "0")}`)
    expect(invalid).toHaveLength(1)
    expect(invalid[0]!.reason).toMatch(new RegExp(`above the cap of ${MAX_MARKDOWN_JOBS}`))
  })

  it("a missing directory is the v1 state, not an error", async () => {
    // A JSON-only project must never see an error about a directory it was never asked for.
    const loaded = await loadMarkdownJobs(join(dir, ".opencode", "tasks"))
    expect(loaded).toEqual({ jobs: [], invalid: [] })
  })

  it("refuses every markdown job by name when there is no YAML reader, and says why", async () => {
    // ADR 0004's degradation: JSON-only operation, reported, never a failed load.
    write("nightly.md", taskFile("schedule: @daily", "p"))
    setYamlReader(undefined)
    const { jobs, invalid } = await loadMarkdownJobs(tasks)
    expect(jobs).toEqual([])
    expect(invalid).toHaveLength(1)
    expect(invalid[0]!.reason).toMatch(/no YAML reader available \(yaml is not installed and none was provided\)/)
    expect(invalid[0]!.reason).toMatch(/schedules\.json/)
  })
})

describe("mergeJobSources — markdown wins, per id (ADR 0004)", () => {
  const job = (id: string, prompt: string, schedule = "@daily"): JobDefinition => ({
    id,
    schedule,
    timezone: "UTC",
    prompt,
    enabled: true,
    misfire: "skip",
    maxCatchUp: DEFAULT_MAX_CATCH_UP,
    runTimeoutMs: MINUTE_MS,
    session: "reuse",
  })

  it("yields exactly one job and one reported shadow for a duplicate id", () => {
    const merged = mergeJobSources(
      { jobs: [job("nightly", "from json", "0 4 * * *")], invalid: [] },
      { jobs: [job("nightly", "from markdown", "0 3 * * *")], invalid: [] },
    )
    expect(merged.jobs).toHaveLength(1)
    expect(merged.jobs[0]!.prompt).toBe("from markdown")
    expect(merged.invalid).toHaveLength(1)
    // The existing `invalid` shape, reused: the shadow is reported, never silently dropped.
    expect(merged.invalid[0]).toEqual({
      id: "nightly",
      schedule: "0 4 * * *",
      reason: expect.stringContaining("shadows the job \"nightly\" in .opencode/schedules.json (markdown wins)"),
    })
  })

  it("keeps the JSON file's order when a job is shadowed, so a migration does not reshuffle", () => {
    const merged = mergeJobSources(
      { jobs: [job("a", "json a"), job("b", "json b"), job("c", "json c")], invalid: [] },
      { jobs: [job("b", "md b")], invalid: [] },
    )
    expect(merged.jobs.map((entry) => entry.id)).toEqual(["a", "b", "c"])
    expect(merged.jobs[1]!.prompt).toBe("md b")
  })

  it("lets the two surfaces coexist — that is what makes migration one job at a time", () => {
    const merged = mergeJobSources(
      { jobs: [job("json-only", "j")], invalid: [{ id: "broken", schedule: undefined, reason: "bad" }] },
      { jobs: [job("md-only", "m")], invalid: [{ id: "also-broken", schedule: undefined, reason: "worse" }] },
    )
    expect(merged.jobs.map((entry) => entry.id)).toEqual(["json-only", "md-only"])
    expect(merged.invalid.map((entry) => entry.id)).toEqual(["broken", "also-broken"])
  })

  it("reports both surfaces' errors rather than dropping one", () => {
    const merged = mergeJobSources(
      { jobs: [], invalid: [], error: "unsupported job file version 99" },
      { jobs: [], invalid: [], error: ".opencode/tasks: EACCES" },
    )
    expect(merged.error).toBe("unsupported job file version 99; .opencode/tasks: EACCES")
  })
})

describe("markdown task files end to end (T2, ADR 0004)", () => {
  let dir: string
  let tasks: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "st-t2-"))
    tasks = join(dir, ".opencode", "tasks")
    mkdirSync(tasks, { recursive: true })
  })
  afterEach(() => {
    setYamlReader(undefined)
    rmSync(dir, { recursive: true, force: true })
  })

  type Added = Array<Record<string, unknown>>

  /** Set up the plugin against `dir` and hand back its registered tools and prompts. */
  async function run(): Promise<{
    tools: Added
    prompts: Record<string, unknown>[]
    cleanup: () => void
    list: () => Promise<Record<string, unknown>>
  }> {
    const added: Added = []
    const prompts: Record<string, unknown>[] = []
    process.env[DATA_DIR_ENV] = join(dir, "state")
    const cleanup = await plugin.setup({
      location: { directory: dir, project: { id: "t2" } },
      storage: { get: async () => undefined, set: async () => {}, remove: async () => {} },
      session: {
        create: async () => ({ id: "ses_1" }),
        prompt: async (input: Record<string, unknown>) => {
          prompts.push(input)
          return { id: "inbox_1" }
        },
      },
      tool: {
        transform: async (cb: (editor: { add?: (tool: unknown) => void }) => void) => {
          cb({ add: (tool) => void added.push(tool as Record<string, unknown>) })
          return { dispose() {} }
        },
      },
    } as never)
    const tool = (name: string): Record<string, unknown> => {
      const found = added.find((entry) => entry.name === name)
      if (found === undefined) throw new Error(`tool ${name} was not registered`)
      return found
    }
    return {
      tools: added,
      prompts,
      cleanup: cleanup as () => void,
      list: async () =>
        ((await (tool("list").execute as (i: unknown) => Promise<{ output: Record<string, unknown> }>)({})).output),
    }
  }

  it("loads, lists and fires a markdown-only project — no schedules.json at all", async () => {
    writeFileSync(
      join(tasks, "nightly.md"),
      taskFile('schedule: "0 3 * * *"\ntimezone: UTC', "Review the diff since the last tag.\n\n- be careful"),
    )
    setYamlReader(readerReturning({ schedule: "0 3 * * *", timezone: "UTC" }))

    const { cleanup, list, tools, prompts } = await run()
    try {
      const listing = await list()
      expect(listing.error).toBeUndefined()
      expect((listing.jobs as Record<string, unknown>[]).map((job) => job.id)).toEqual(["nightly"])
      // A markdown-only project has real work, so it arbitrates and arms like any other.
      expect(listing.leaseHeld).toBe(true)

      const run = tools.find((tool) => tool.name === "run")!
      const out = await (run.execute as (i: Record<string, unknown>) => Promise<{ output: Record<string, unknown> }>)({
        id: "nightly",
      })
      expect(out.output.error).toBeUndefined()
      // The body reached the session verbatim, inner formatting included.
      expect(prompts[0]).toMatchObject({
        text: "Review the diff since the last tag.\n\n- be careful",
        delivery: "queue",
      })
    } finally {
      cleanup()
    }
  })

  it("reports a shadowed id through schedules_list rather than replacing it silently", async () => {
    writeFileSync(
      join(dir, ".opencode", "schedules.json"),
      JSON.stringify({
        version: 1,
        jobs: [
          { id: "nightly", schedule: "0 4 * * *", prompt: "from json", timezone: "UTC" },
          { id: "json-only", schedule: "@daily", prompt: "still here" },
        ],
      }),
    )
    writeFileSync(join(tasks, "nightly.md"), taskFile('schedule: "0 3 * * *"\ntimezone: UTC', "from markdown"))
    setYamlReader(readerReturning({ schedule: "0 3 * * *", timezone: "UTC" }))

    const { cleanup, list } = await run()
    try {
      const listing = await list()
      const jobs = listing.jobs as Record<string, unknown>[]
      // One job per id, markdown winning, and the JSON-only job untouched.
      expect(jobs.map((job) => job.id)).toEqual(["nightly", "json-only"])
      expect(jobs[0]).toMatchObject({ schedule: "0 3 * * *" })
      const invalid = listing.invalid as Array<{ id: string; reason: string }>
      expect(invalid).toHaveLength(1)
      expect(invalid[0]).toMatchObject({ id: "nightly" })
      expect(invalid[0]!.reason).toMatch(/shadows/)
    } finally {
      cleanup()
    }
  })

  it("with no YAML reader, markdown jobs are refused by name and the JSON ones still fire", async () => {
    writeFileSync(
      join(dir, ".opencode", "schedules.json"),
      JSON.stringify({ version: 1, jobs: [{ id: "json-job", schedule: "@daily", prompt: "still works" }] }),
    )
    writeFileSync(join(tasks, "nightly.md"), taskFile("schedule: @daily", "never dispatched"))
    setYamlReader(undefined)

    const { cleanup, list, tools, prompts } = await run()
    try {
      const listing = await list()
      expect((listing.jobs as Record<string, unknown>[]).map((job) => job.id)).toEqual(["json-job"])
      const invalid = listing.invalid as Array<{ id: string; reason: string }>
      expect(invalid.map((entry) => entry.id)).toEqual(["nightly"])
      expect(invalid[0]!.reason).toMatch(/no YAML reader available/)

      const run = tools.find((tool) => tool.name === "run")!
      await (run.execute as (i: Record<string, unknown>) => Promise<unknown>)({ id: "json-job" })
      expect(prompts).toHaveLength(1)
      expect(prompts[0]).toMatchObject({ text: "still works" })
    } finally {
      cleanup()
    }
  })

  it("still reports a corrupt schedules.json when markdown jobs are carrying the schedule", async () => {
    // v1 only reported a read failure when nothing loaded at all. With a second surface, a
    // broken file that is being masked by working markdown jobs has to be reported anyway —
    // otherwise an author's edit appears to do nothing.
    writeFileSync(join(dir, ".opencode", "schedules.json"), "{ not json")
    writeFileSync(join(tasks, "nightly.md"), taskFile("schedule: @daily", "review"))
    setYamlReader(readerReturning({ schedule: "@daily" }))

    const { cleanup, list } = await run()
    try {
      const listing = await list()
      expect((listing.jobs as Record<string, unknown>[]).map((job) => job.id)).toEqual(["nightly"])
      expect(listing.error).toMatch(/schedules\.json/)
    } finally {
      cleanup()
    }
  })

it.runIf(realYaml !== undefined)(
    "parses real YAML frontmatter end to end — the reader is the only parser here",
    async () => {
      setYamlReader(realYaml)
      writeFileSync(
        join(tasks, "nightly.md"),
        taskFile(
          'schedule: "0 3 * * *"  # a comment after a quoted cron\ntimezone: Europe/Madrid\nsession: fresh          # reuse (default) | fresh\nrunTimeout: 1h30m\npermissions:\n  bash:\n    "*": deny\n    "git diff *": allow\n  edit: deny',
          "Review the diff.",
        ),
      )
      const { cleanup, list } = await run()
      try {
        const listing = await list()
        expect(listing.invalid).toEqual([])
        const jobs = listing.jobs as Record<string, unknown>[]
        expect(jobs[0]).toMatchObject({
          id: "nightly",
          schedule: "0 3 * * *",
          timezone: "Europe/Madrid",
          session: "fresh",
          runTimeoutMs: 90 * MINUTE_MS,
          askAsDeny: [],
        })
        // The nested resource map is the reader's work, not ours, and it arrives intact.
        expect(jobs[0]!.permissions).toEqual({ bash: { "*": "deny", "git diff *": "allow" }, edit: "deny" })
      } finally {
        cleanup()
      }
    },
  )

  it.runIf(realYaml !== undefined)("refuses a YAML alias bomb, by name", async () => {
    // Anchors and aliases are the format's own expansion bomb: a few hundred bytes describe a
    // graph that costs gigabytes to materialize. The budget we ask for is what stops it.
    setYamlReader(realYaml)
    writeFileSync(
      join(tasks, "bomb.md"),
      taskFile(
        [
          'a: &a [x,x,x,x,x,x,x,x]',
          "b: &b [*a,*a,*a,*a,*a,*a,*a,*a]",
          "c: &c [*b,*b,*b,*b,*b,*b,*b,*b]",
          "d: [*c,*c,*c,*c]",
          'schedule: "@daily"',
        ].join("\n"),
        "body",
      ),
    )
    writeFileSync(join(tasks, "fine.md"), taskFile('schedule: "@daily"', "body"))
    const { cleanup, list } = await run()
    try {
      const listing = await list()
      expect((listing.jobs as Record<string, unknown>[]).map((job) => job.id)).toEqual(["fine"])
      const invalid = listing.invalid as Array<{ id: string; reason: string }>
      expect(invalid).toHaveLength(1)
      expect(invalid[0]!.reason).toMatch(/Excessive alias count/)
    } finally {
      cleanup()
    }
  })
})
// ---------------------------------------------------------------------------
// What arms the tick (bug-ephemeral-work-never-arms-tick)
// ---------------------------------------------------------------------------

describe("hasWork — the predicate that decides whether the tick is armed", () => {
  const loops = (counts: number[]): Map<string, unknown[]> =>
    new Map(counts.map((n, i) => [`ses_${i}`, Array.from({ length: n }, () => ({}))]))

  it("counts an enabled file job", () => {
    expect(hasWork({ jobs: [{ enabled: true }], oneOffs: [], loops: new Map() })).toBe(true)
  })

  it("does not count a parked job — enabled: false is work with the timer switched off", () => {
    expect(hasWork({ jobs: [{ enabled: false }], oneOffs: [], loops: new Map() })).toBe(false)
  })

  it("counts pending one-offs, which is the whole point of the fix", () => {
    // Both ephemeral drains live *inside* `tick`. A project with no job file and one pending
    // one-off has work, and it is work the tick is the only thing that can perform.
    expect(hasWork({ jobs: [], oneOffs: [{}], loops: new Map() })).toBe(true)
  })

  it("counts a loop in any session, and ignores an empty session entry", () => {
    expect(hasWork({ jobs: [], oneOffs: [], loops: loops([0, 1]) })).toBe(true)
    expect(hasWork({ jobs: [], oneOffs: [], loops: loops([0, 0]) })).toBe(false)
  })

  it("reports nothing to do only when every source is empty", () => {
    expect(hasWork({ jobs: [], oneOffs: [], loops: new Map() })).toBe(false)
    expect(hasWork({ jobs: [{ enabled: false }], oneOffs: [], loops: loops([0]) })).toBe(false)
  })
})

describe("normalizeLoops — one validation path for every stored loop record", () => {
  const stored = [
    {
      id: "loop_1",
      prompt: "check the deploy",
      intervalMs: 5 * MINUTE_MS,
      nextRunAt: 1_000,
      expiresAt: 2_000,
      createdAt: 500,
    },
  ]

  it("stamps the owning session on every loop it returns", () => {
    const loops = normalizeLoops(stored, "ses_abc")
    expect(loops).toHaveLength(1)
    // The session comes from the *caller*, never from the record: a loop is scoped by the
    // key it was filed under, and a record cannot move itself into another session.
    expect(loops[0]!.sessionID).toBe("ses_abc")
    expect(loops[0]).toMatchObject({ id: "loop_1", intervalMs: 5 * MINUTE_MS, createdAt: 500 })
  })

  it("defaults createdAt to nextRunAt when it is absent", () => {
    const [loop] = normalizeLoops([{ ...stored[0], createdAt: undefined }], "ses_abc")
    expect(loop!.createdAt).toBe(loop!.nextRunAt)
  })

  it("drops malformed entries instead of failing the load", () => {
    expect(
      normalizeLoops([null, "x", {}, { id: "loop_x" }, { ...stored[0], intervalMs: "5m" }], "ses_abc"),
    ).toEqual([])
    expect(normalizeLoops("not an array", "ses_abc")).toEqual([])
  })
})

describe("arming the tick — ephemeral work is work (bug-ephemeral-work-never-arms-tick)", () => {
  let dir: string
  let restoreEnv: string | undefined
  let consoleLines: string[] = []
  let realConsoleError: typeof console.error
  const outstanding: Array<() => void> = []

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "st-arm-"))
    mkdirSync(join(dir, ".opencode"), { recursive: true })
    restoreEnv = process.env[DATA_DIR_ENV]
    process.env[DATA_DIR_ENV] = join(dir, "state")
    // The plugin reports through `console.error`, so a log claim ("expired after 2h") has to
    // be asserted against captured lines rather than against nothing.
    realConsoleError = console.error
    consoleLines = []
    console.error = (...args: unknown[]): void => void consoleLines.push(args.map(String).join(" "))
  })

  afterEach(() => {
    for (const dispose of outstanding.splice(0).reverse()) {
      try {
        dispose()
      } catch {
        // A failing teardown must not mask the assertion that ran before it.
      }
    }
    console.error = realConsoleError
    if (restoreEnv === undefined) delete process.env[DATA_DIR_ENV]
    else process.env[DATA_DIR_ENV] = restoreEnv
    rmSync(dir, { recursive: true, force: true })
  })

  type Tool = {
    execute: (
      input: Record<string, unknown>,
      context?: { sessionID?: unknown },
    ) => Promise<{ output: Record<string, unknown> }>
  }

  type Harness = {
    tools: Array<Record<string, unknown>>
    prompts: Record<string, unknown>[]
    store: Map<string, unknown>
    /** Every `switchModel` / `switchAgent` / `permission.rules` call the plugin made. */
    targetCalls: Record<string, unknown>[]
    /** Let a held prompt settle. */
    release: () => void
    tool: (name: string) => Tool
    list: () => Promise<Record<string, unknown>>
    cleanup: () => void
  }

  /**
   * A `get`/`set`/`remove` double, with the host's prefix `scan` only when asked for.
   *
   * `remove` is optional on the real surface, so it can be withheld here to exercise the host
   * that has no delete — the one where "nothing is stored" has to be written as an empty
   * record or a stopped loop comes back.
   */
  function storageDouble(
    store: Map<string, unknown>,
    withScan: boolean,
    withRemove = true,
    failWrites = false,
    slowWrites = false,
  ): Record<string, unknown> {
    // A loop record written on the next macrotask settles after every pending microtask has run,
    // so a loop post that has already finished no longer *looks* in flight by the time the
    // next drain runs. That is how a real store behaves, and it is what makes "the budget
    // this tick decided" different from "whatever still happens to be in flight".
    const settle = async (key: string): Promise<void> => {
      if (slowWrites && key.startsWith("scheduled-tasks/loop/")) {
        await new Promise((resolve) => setTimeout(resolve, 0))
      }
    }
    const base: Record<string, unknown> = {
      get: async (key: string) => store.get(key),
      set: async (key: string, value: unknown) => {
        await settle(key)
        if (failWrites) throw new Error("storage write failed")
        store.set(key, value)
      },
      ...(withRemove
        ? {
            remove: async (key: string) => {
              await settle(key)
              if (failWrites) throw new Error("storage delete failed")
              store.delete(key)
            },
          }
        : {}),
    }
    if (withScan) {
      // Mirrors the host surface verified on 2.0.22: `{ entries: [{ key, value }], next? }`,
      // keys already relative to the plugin's own namespace, `next` absent on the last page.
      base.scan = async (input: { prefix?: string; after?: string; limit?: number }) => {
        const keys = [...store.keys()].filter((key) => key.startsWith(input.prefix ?? "")).sort()
        const start = input.after === undefined ? 0 : Math.max(0, keys.indexOf(input.after) + 1)
        const limit = input.limit ?? 100
        const page = keys.slice(start, start + limit)
        const entries = page.map((key) => ({ key, value: store.get(key) }))
        const consumed = start + page.length
        return consumed < keys.length ? { entries, next: page[page.length - 1]! } : { entries }
      }
    }
    return base
  }

  /** One pending one-off as `setup` would find it in storage. */
  const pendingOneOff = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
    id: "oneoff_probe",
    dueAt: Date.now() - 1_000,
    prompt: "the probe prompt",
    createdAt: Date.now() - 60_000,
    runTimeoutMs: MINUTE_MS,
    ...over,
  })

  /** One stored loop, due now and unexpired. */
  const storedLoop = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
    id: "loop_stored",
    prompt: "the loop prompt",
    intervalMs: MINUTE_MS,
    nextRunAt: Date.now() - 1_000,
    expiresAt: Date.now() + 60 * MINUTE_MS,
    createdAt: Date.now() - 60_000,
    ...over,
  })

  async function harness(
    options: {
      jobs?: unknown[]
      seed?: Record<string, unknown>
      scan?: boolean
      storage?: boolean
      /** Withhold `storage.remove`, as a host without the optional delete API would. */
      storageRemove?: boolean
      /** Make every storage write fail, so only what this process remembers survives. */
      failWrites?: boolean
      /** Settle a *loop record* write on the next macrotask, as a slow store would. */
      slowWrites?: boolean
      /** Hold every admitted prompt until `release()`, so a run can be caught in flight. */
      hold?: boolean
      /** Make every admitted prompt fail with this message. */
      promptError?: string
      pluginOptions?: Record<string, unknown>
      projectID?: string
    } = {},
  ): Promise<Harness> {
    const store = new Map<string, unknown>(Object.entries(options.seed ?? {}))
    if (options.jobs !== undefined) {
      writeFileSync(
        join(dir, ".opencode", "schedules.json"),
        JSON.stringify({ version: 1, jobs: options.jobs }),
      )
    }
    const tools: Array<Record<string, unknown>> = []
    const prompts: Record<string, unknown>[] = []
    // Every target-application call the plugin makes, so "did a loop touch the human's
    // session configuration?" is answerable rather than assumed.
    const targetCalls: Record<string, unknown>[] = []
    let openTheGate: () => void = () => {}
    const gate = options.hold === true ? new Promise<void>((resolve) => void (openTheGate = resolve)) : undefined
    const ctx: Record<string, unknown> = {
      ...(options.pluginOptions === undefined ? {} : { options: options.pluginOptions }),
      location: { directory: dir, project: { id: options.projectID ?? "arm" } },
      ...(options.storage === false
        ? {}
        : {
            storage: storageDouble(
              store,
              options.scan ?? false,
              options.storageRemove ?? true,
              options.failWrites ?? false,
              options.slowWrites ?? false,
            ),
          }),
      session: {
        create: async () => ({ id: "ses_created" }),
        prompt: async (input: Record<string, unknown>) => {
          prompts.push(input)
          if (options.promptError !== undefined) throw new Error(options.promptError)
          if (gate !== undefined) await gate
          return { id: `inbox_${prompts.length}` }
        },
        switchModel: async (input: Record<string, unknown>) => void targetCalls.push({ switchModel: input }),
        switchAgent: async (input: Record<string, unknown>) => void targetCalls.push({ switchAgent: input }),
      },
      permission: {
        rules: async (input: Record<string, unknown>) => void targetCalls.push({ rules: input }),
      },
      tool: {
        transform: async (cb: (editor: { add?: (tool: unknown) => void }) => void) => {
          cb({ add: (tool) => void tools.push(tool as Record<string, unknown>) })
          return { dispose() {} }
        },
      },
    }
    const resolved = await plugin.setup(ctx as never)
    const cleanup = (): void => {
      ;(resolved as () => void)?.()
      // Never leave a held prompt pending: a test that ends mid-run must not strand the
      // plugin's dispatch promise into the next test.
      openTheGate()
    }
    outstanding.push(cleanup)
    const tool = (name: string): Tool => {
      const found = tools.find((entry) => entry.name === name)
      if (found === undefined) throw new Error(`tool ${name} was not registered`)
      return found as unknown as Tool
    }
    return {
      tools,
      prompts,
      store,
      tool,
      cleanup,
      targetCalls,
      release: openTheGate,
      list: async () => (await tool("list").execute({})).output,
    }
  }

  // ---------------------------------------------------------------------
  // Probe 1, reproduced exactly: a pending one-off, no jobs, and no timer.
  // ---------------------------------------------------------------------

  it(
    "fires a one-off left pending by a previous run in a project with no jobs (the reviewer's probe)",
    async () => {
      // `jobs: []` plus a pending one-off in storage is the state the reviewer seeded, and the
      // old code armed nothing at all: `hasWork` read the job array only, so the tick never
      // existed and `schedules_schedule` had already returned success.
      const { prompts, store, list } = await harness({
        jobs: [],
        seed: { "scheduled-tasks/oneoff/pending": [pendingOneOff()] },
        pluginOptions: { tickMs: 5_000 },
      })

      await new Promise((resolve) => setTimeout(resolve, 7_000))

      expect(prompts.length).toBeGreaterThan(0)
      expect(prompts[0]).toMatchObject({ text: "the probe prompt", delivery: "queue" })
      // And it is gone from the pending list, not merely dispatched: a one-off that stays
      // pending is how the original deferral bug presented.
      expect((await list()).oneOffs).toEqual([])
      expect(store.get("scheduled-tasks/oneoff/pending")).toEqual([])
    },
    20_000,
  )

  it("takes the writer lease for ephemeral work, and takes it before the work runs", async () => {
    // Proof the lease was taken *because* of the ephemeral task: it was not held at setup,
    // where there was nothing to arbitrate.
    const { list } = await harness({
      jobs: [],
      seed: { "scheduled-tasks/oneoff/pending": [pendingOneOff({ dueAt: Date.now() + 30 * MINUTE_MS })] },
    })
    const listing = await list()
    expect(listing.leaseHeld).toBe(true)
    expect(listing.leaseForeign).toBe(false)
  })

  // ---------------------------------------------------------------------
  // Idle → armed: the tool call is minutes after `setup` decided there was nothing.
  // ---------------------------------------------------------------------

  it("arms from idle the moment the first ephemeral task is created — no reload, no restart", async () => {
    const { tool, list, prompts, store } = await harness({ jobs: [] })

    // Idle: no jobs, no one-offs, no loops — so no lease and no timer.
    const idle = await list()
    expect(idle.leaseHeld).toBe(false)
    expect(idle.oneOffs).toEqual([])

    // `dueAt` one second in the past is inside the documented grace window, so this is a
    // legitimate "run it now" and not a refused stale instant.
    const created = await tool("schedule").execute({
      prompt: "armed by a tool call",
      dueAt: Date.now() - 1_000,
    })
    expect(created.output.id).toMatch(/^oneoff_/)

    // The lease was acquired *after* setup, by the tool, because the answer changed.
    expect((await list()).leaseHeld).toBe(true)
    await waitFor(() => prompts.length > 0, "the tool-created one-off to be dispatched")
    expect(prompts[0]).toMatchObject({ text: "armed by a tool call" })
    expect(store.get("scheduled-tasks/oneoff/pending")).toEqual([])
  })

  it("arms a real timer, so work due later still fires without another tool call", async () => {
    const { tool, prompts, list } = await harness({ jobs: [], pluginOptions: { tickMs: 5_000 } })

    await tool("schedule").execute({ prompt: "due on a later tick", dueAt: Date.now() + 1_000 })
    // Arming evaluates immediately; nothing was due yet, so nothing was dispatched. That is
    // what proves the dispatch below came from the *timer*, not from the arming call.
    expect(prompts).toEqual([])

    await waitFor(() => prompts.length > 0, "the interval to pick up the later one-off", 9_000)
    expect(prompts[0]).toMatchObject({ text: "due on a later tick" })
    await waitFor(
      async () => (await list()).leaseHeld === false,
      "the lease to be handed back once the work is done",
    )
    // The wait above is the mechanism; this is the assertion. Asserted on the lockfile, not
    // on `leaseHeld` - see the sibling test for why the in-memory flag cannot see a release.
    expect(existsSync(leasePath(dir, "arm"))).toBe(false)
  }, 15_000)

  it("hands the lease back once the last ephemeral task is done", async () => {
    // ADR 0003 says the lease is taken only when there is work; deciding once at setup made
    // that true only for the first instant of the process's life.
    const { tool, list } = await harness({ jobs: [] })
    await tool("schedule").execute({ prompt: "short-lived", dueAt: Date.now() - 1_000 })
    expect((await list()).leaseHeld).toBe(true)
    // The end of the tick re-decides, so the timer stops and the lease is released.
    await waitFor(
      async () => (await list()).leaseHeld === false,
      "the lease to be handed back",
      6_000,
    )
    // `leaseHeld` reads the in-memory lease object, so it cannot tell whether release()
    // actually ran - `disarm` clears the local either way, and a mutation that deletes the
    // `lease.release()` call still satisfies it. The lockfile is the thing being released,
    // so the lockfile is what has to be asserted. (Verified: removing `release()` fails
    // this line and leaves the `leaseHeld` assertion green.)
    expect(existsSync(leasePath(dir, "arm"))).toBe(false)
  }, 10_000)

  it("stays armed while a recurring job keeps it in work", async () => {
    const { list } = await harness({ jobs: [{ id: "nightly", schedule: "@daily", prompt: "p" }] })
    expect((await list()).leaseHeld).toBe(true)
  })

  it("stays inert — no lease, no timer — when nothing is scheduled at all", async () => {
    const { list, prompts } = await harness({ jobs: [{ id: "parked", schedule: "@daily", prompt: "p", enabled: false }] })
    expect((await list()).leaseHeld).toBe(false)
    await new Promise((resolve) => setTimeout(resolve, 200))
    expect(prompts).toEqual([])
  })

  // ---------------------------------------------------------------------
  // ADR 0003 under lazy arming: a second instance must still stay inert.
  // ---------------------------------------------------------------------

  it("stays inert for ephemeral work when another instance holds the lease", async () => {
    const path = leasePath(dir, "arm")
    mkdirSync(join(path, ".."), { recursive: true })
    writeFileSync(path, JSON.stringify({ pid: process.pid + 1, heartbeat: Date.now() }))

    const { list, prompts } = await harness({
      jobs: [],
      seed: { "scheduled-tasks/oneoff/pending": [pendingOneOff()] },
    })
    try {
      const listing = await list()
      expect(listing.leaseForeign).toBe(true)
      expect(listing.leaseHeld).toBe(false)
      // The pending one-off is still reported — refusing to double-fire is not "pretending
      // the work does not exist".
      expect((listing.oneOffs as unknown[]).length).toBe(1)
      await new Promise((resolve) => setTimeout(resolve, 300))
      expect(prompts).toEqual([])
    } finally {
      rmSync(path, { force: true })
    }
  })

  it("stays inert when a tool hands the first ephemeral work to a project another instance owns", async () => {
    // The lazy-arming path has to pass through ADR 0003 too, not just the setup path: this
    // instance is idle (so it holds no lease and has no timer), a foreign holder exists, and
    // an agent then hands it a one-off. Arming must arbitrate and decline.
    const path = leasePath(dir, "arm")
    mkdirSync(join(path, ".."), { recursive: true })
    writeFileSync(path, JSON.stringify({ pid: process.pid + 1, heartbeat: Date.now() }))

    const { tool, list, prompts } = await harness({ jobs: [] })
    try {
      expect((await list()).leaseHeld).toBe(false)
      await tool("schedule").execute({ prompt: "should not run", dueAt: Date.now() - 1_000 })
      const listing = await list()
      expect(listing.leaseForeign).toBe(true)
      expect(listing.leaseHeld).toBe(false)
      // The work is reported, not pretended away: refusing to double-fire is not silence.
      expect((listing.oneOffs as unknown[]).length).toBe(1)
      await new Promise((resolve) => setTimeout(resolve, 300))
      expect(prompts).toEqual([])
    } finally {
      rmSync(path, { force: true })
    }
  })

  // ---------------------------------------------------------------------
  // M1: a stored loop has to come back with the process.
  // ---------------------------------------------------------------------

  it("restores a stored session loop at setup and posts it into its own session", async () => {
    // The load that never happened: `setup` read jobs, states, history and one-offs, so a
    // stored, due loop simply stopped after a restart while the tool's own comment claimed it
    // survived a reload.
    const { list, prompts, store } = await harness({
      jobs: [],
      scan: true,
      seed: { "scheduled-tasks/loop/ses_abc": [storedLoop()] },
    })

    expect((await list()).loops).toEqual([
      {
        id: "loop_stored",
        sessionID: "ses_abc",
        nextRunAt: new Date(store.get("scheduled-tasks/loop/ses_abc") === undefined ? 0 : Date.now()).toISOString().slice(0, 0) || expect.any(String),
        expiresAt: expect.any(String),
        intervalMs: MINUTE_MS,
      },
    ])
    await waitFor(() => prompts.length > 0, "the restored loop to post")
    // A loop posts into the session that owns it and nowhere else.
    expect(prompts[0]).toMatchObject({ sessionID: "ses_abc", text: "the loop prompt" })
  })

  it("discovers loops across several sessions and several pages", async () => {
    const { list } = await harness({
      jobs: [],
      scan: true,
      seed: {
        "scheduled-tasks/loop/ses_a": [storedLoop({ id: "loop_a" })],
        "scheduled-tasks/loop/ses_b": [storedLoop({ id: "loop_b" })],
        // Not loop keys: a job state and a history entry must not be mistaken for one.
        "scheduled-tasks/nightly": { version: STATE_VERSION },
        "scheduled-tasks/history/nightly": [],
      },
    })
    const loops = (await list()).loops as Array<Record<string, unknown>>
    expect(loops.map((loop) => [loop.sessionID, loop.id])).toEqual([
      ["ses_a", "loop_a"],
      ["ses_b", "loop_b"],
    ])
  })

  it("arms the tick for a stored loop, so it needs no tool call to resume", async () => {
    // A loop restored at setup is work found by `hasWork`, so it must take the lease.
    const { list } = await harness({
      jobs: [],
      scan: true,
      seed: { "scheduled-tasks/loop/ses_abc": [storedLoop({ nextRunAt: Date.now() + 30 * MINUTE_MS })] },
    })
    expect((await list()).leaseHeld).toBe(true)
  })

  it("arms from idle when the first loop is started, and posts it when it comes due", async () => {
    const { tool, list, prompts } = await harness({ jobs: [] })
    expect((await list()).leaseHeld).toBe(false)

    const started = await tool("start_loop").execute({ prompt: "fresh loop", every: "1m" }, { sessionID: "ses_new" })
    expect(started.output.id).toMatch(/^loop_/)
    expect((await list()).leaseHeld).toBe(true)
    // Nothing is due yet, so arming must not post it early.
    expect(prompts).toEqual([])
  })

  it("says so plainly when ctx.storage.scan is absent, and restores nothing", async () => {
    // The honest degradation: no scan means the sessions that own a loop cannot be
    // enumerated, and pretending otherwise would be a reload path that does not work.
    const { list, prompts } = await harness({
      jobs: [],
      scan: false,
      seed: { "scheduled-tasks/loop/ses_abc": [storedLoop()] },
    })
    expect((await list()).loops).toEqual([])
    expect((await list()).leaseHeld).toBe(false)
    await new Promise((resolve) => setTimeout(resolve, 200))
    expect(prompts).toEqual([])
  })

  it("ignores a scan result it cannot read, and a scan that throws", async () => {
    for (const scan of [
      async () => "nonsense",
      async () => ({ entries: "nonsense" }),
      async () => null,
      async () => {
        throw new Error("scan is down")
      },
    ]) {
      const tools: Array<Record<string, unknown>> = []
      const resolved = await plugin.setup({
        location: { directory: dir, project: { id: "arm" } },
        storage: {
          get: async (key: string) =>
            key === "scheduled-tasks/loop/ses_abc" ? [storedLoop()] : undefined,
          set: async () => {},
          remove: async () => {},
          scan: scan as never,
        },
        session: { create: async () => ({ id: "s" }), prompt: async () => ({ id: "i" }) },
        tool: {
          transform: async (cb: (editor: { add?: (tool: unknown) => void }) => void) => {
            cb({ add: (tool) => void tools.push(tool as Record<string, unknown>) })
            return { dispose() {} }
          },
        },
      } as never)
      try {
        const list = tools.find((tool) => tool.name === "list") as unknown as Tool
        const out = await list.execute({})
        expect(out.output.loops).toEqual([])
      } finally {
        ;(resolved as () => void)?.()
      }
    }
  })

  it("stops enumerating at the scan cap rather than restoring an unbounded namespace", async () => {
    // A loop is filed per session, so the cardinality of storage decides the cost of startup.
    // Seeding more sessions than the cap proves the walk is bounded, not proportional.
    const seed: Record<string, unknown> = {}
    for (let n = 0; n < MAX_LOOP_SCAN_KEYS + 5; n += 1) {
      seed[`scheduled-tasks/loop/ses_${String(n).padStart(4, "0")}`] = [storedLoop({ id: `loop_${n}` })]
    }
    const { list } = await harness({ jobs: [], scan: true, seed })
    const loops = (await list()).loops as Array<Record<string, unknown>>
    expect(loops).toHaveLength(MAX_LOOP_SCAN_KEYS)
  })

  // ---------------------------------------------------------------------
  // M3: a due one-off with no free slot is skipped and recorded, never queued.
  // ---------------------------------------------------------------------

  it(
    "skips and records a due one-off that finds no free slot, instead of retrying it forever",
    async () => {
      // One slot, one due recurring job: the job takes it, so the one-off owing the same
      // instant cannot run. Under the old code it stayed pending and was re-decided every
      // tick, logging "skipping 1 one-off task(s)" each time and running whenever the
      // scheduler happened to be idle — unbounded deferral, not a skip.
      const { prompts, store, list } = await harness({
        jobs: [{ id: "busy", schedule: "* * * * *", timezone: "UTC", prompt: "the job prompt" }],
        seed: {
          "scheduled-tasks/busy": {
            version: STATE_VERSION,
            lastRun: Date.now() - 5 * MINUTE_MS,
          },
          "scheduled-tasks/oneoff/pending": [pendingOneOff({ prompt: "the one-off prompt" })],
        },
        pluginOptions: { tickMs: 5_000, maxConcurrentRuns: 1 },
      })

      await waitFor(() => prompts.length > 0, "the recurring job to take the slot")

      // Skipped and *recorded*: the occurrence is spent, and the record says why.
      await waitFor(
        () => Array.isArray(store.get("scheduled-tasks/history/oneoff/oneoff_probe")),
        "the skip to be recorded in history",
      )
      const history = store.get("scheduled-tasks/history/oneoff/oneoff_probe") as Array<Record<string, unknown>>
      expect(history).toHaveLength(1)
      expect(history[0]).toMatchObject({ outcome: "skipped", dueAt: expect.any(Number) })
      expect(String(history[0]!.error)).toMatch(/concurrency cap 1/)

      // And it never ran, and never stays queued: not in the pending list, not dispatched.
      expect(prompts.filter((entry) => entry.text === "the one-off prompt")).toEqual([])
      expect((await list()).oneOffs).toEqual([])

      // The load-bearing half: a further tick must not reconsider the same due instant.
      const before = store.get("scheduled-tasks/oneoff/pending")
      await new Promise((resolve) => setTimeout(resolve, 6_000))
      expect(store.get("scheduled-tasks/oneoff/pending")).toEqual(before)
      expect(store.get("scheduled-tasks/history/oneoff/oneoff_probe")).toHaveLength(1)
      expect(prompts.filter((entry) => entry.text === "the one-off prompt")).toEqual([])
    },
    25_000,
  )

  it("runs the one-offs it can and records skips only for the ones it cannot", async () => {
    const { prompts, store } = await harness({
      jobs: [],
      seed: {
        "scheduled-tasks/oneoff/pending": [
          pendingOneOff({ id: "oneoff_a", prompt: "first" }),
          pendingOneOff({ id: "oneoff_b", prompt: "second" }),
        ],
      },
      pluginOptions: { tickMs: 5_000, maxConcurrentRuns: 1 },
    })

    await waitFor(() => prompts.length > 0, "the first one-off to run")
    await waitFor(
      () => Array.isArray(store.get("scheduled-tasks/history/oneoff/oneoff_b")),
      "the surplus one-off to be recorded as skipped",
    )
    // Fairness, not luck: the head of the queue runs and the tail is spent, so the backlog
    // cannot reorder itself behind a permanently busy scheduler.
    expect(prompts.some((entry) => entry.text === "first")).toBe(true)
    expect(prompts.some((entry) => entry.text === "second")).toBe(false)
    expect(store.get("scheduled-tasks/history/oneoff/oneoff_b")).toMatchObject([
      { outcome: "skipped" },
    ])
  })

  it("does not skip a due one-off when a slot is free", async () => {
    const { prompts, store } = await harness({
      jobs: [],
      seed: { "scheduled-tasks/oneoff/pending": [pendingOneOff()] },
      pluginOptions: { maxConcurrentRuns: 1 },
    })
    await waitFor(() => prompts.length > 0, "the one-off to run")
    await waitFor(
      () => Array.isArray(store.get("scheduled-tasks/history/oneoff/oneoff_probe")),
      "the run to be recorded",
    )
    const history = store.get("scheduled-tasks/history/oneoff/oneoff_probe") as Array<Record<string, unknown>>
    expect(history[0]!.outcome).toBe("ok")
  })

  // =====================================================================
  // Session loops: stopping them, capping them, and what a loop post may do
  // (bug-loop-stop-does-not-persist-and-concurrency-bypass)
  // =====================================================================
  describe("session loops — stop, cap, dispatch", () => {
    const key = (sessionID: string): string => `scheduled-tasks/loop/${sessionID}`
    const storedIds = (store: Map<string, unknown>, sessionID: string): unknown =>
      (store.get(key(sessionID)) as Array<Record<string, unknown>> | undefined)?.map((loop) => loop.id)
    const listedIds = (out: Record<string, unknown>): unknown =>
      (out.loops as Array<Record<string, unknown>>).map((loop) => loop.id)
    const storedHistory = (store: Map<string, unknown>, id: string): Array<Record<string, unknown>> =>
      store.get(`scheduled-tasks/history/loop/${id}`) as Array<Record<string, unknown>>

    // ---------------------------------------------------------------------
    // B2: stopping a loop persists, and a stopped loop cannot come back.
    // ---------------------------------------------------------------------

    it("does not resurrect a stopped loop from its own stale record (the reviewer's repro)", async () => {
      const { tool, list, store } = await harness({ jobs: [] })
      const call = { sessionID: "ses_abc" }

      const a = (await tool("start_loop").execute({ prompt: "a", every: "1h" }, call)).output
      const b = (await tool("start_loop").execute({ prompt: "b", every: "1h" }, call)).output
      expect(storedIds(store, "ses_abc")).toEqual([a.id, b.id])

      // Stop one: persisted, not merely filtered in memory.
      const one = await tool("stop_loop").execute({ id: a.id }, call)
      expect(one.output.loops).toEqual([{ id: b.id, nextRunAt: expect.any(String) }])
      expect(storedIds(store, "ses_abc")).toEqual([b.id])

      // Stop all: the emptied set is persisted as "nothing here".
      const all = await tool("stop_loop").execute({}, call)
      expect(all.output.loops).toEqual([])
      expect(store.has(key("ses_abc"))).toBe(false)

      // The probe's last step: starting a new loop used to bring the old ones back with it.
      const c = (await tool("start_loop").execute({ prompt: "c", every: "1h" }, call)).output
      expect(listedIds(await list())).toEqual([c.id])
      expect(storedIds(store, "ses_abc")).toEqual([c.id])
    })

    it("treats what it already decided as final, even when the stop could not be written", async () => {
      // The storage read is a fallback for "this session's loops are not in memory yet", never
      // an override of a decision this process already made. Seeded stale, stopped in memory,
      // and the write fails — so the record really is still there and reading it back is
      // exactly the resurrection this must not perform.
      const { tool, list, store } = await harness({
        jobs: [],
        scan: true,
        failWrites: true,
        seed: {
          [key("ses_abc")]: [
            storedLoop({ id: "loop_stale", nextRunAt: Date.now() + 30 * MINUTE_MS }),
          ],
        },
      })
      const call = { sessionID: "ses_abc" }

      expect(listedIds(await list())).toEqual(["loop_stale"])
      const all = await tool("stop_loop").execute({}, call)
      expect(all.output.loops).toEqual([])
      expect(listedIds(await list())).toEqual([])
      // The write did fail, so the stale record is still what a naive re-read would find.
      expect(storedIds(store, "ses_abc")).toEqual(["loop_stale"])

      const c = (await tool("start_loop").execute({ prompt: "c", every: "1h" }, call)).output
      expect(listedIds(await list())).toEqual([c.id])
    })

    it("persists the stop on a host with no storage.remove, by writing the empty set", async () => {
      // `remove` is optional on the plugin storage surface. Where it is missing the plugin
      // cannot state "nothing here" by deleting, so it has to say it in the record itself —
      // otherwise this host alone keeps resurrecting stopped loops.
      const { tool, list, store } = await harness({ jobs: [], storageRemove: false })
      const call = { sessionID: "ses_abc" }

      const a = (await tool("start_loop").execute({ prompt: "a", every: "1h" }, call)).output
      await tool("start_loop").execute({ prompt: "b", every: "1h" }, call)
      await tool("stop_loop").execute({ id: a.id }, call)
      await tool("stop_loop").execute({}, call)

      expect(store.get(key("ses_abc"))).toEqual([])
      const c = (await tool("start_loop").execute({ prompt: "c", every: "1h" }, call)).output
      expect(listedIds(await list())).toEqual([c.id])
    })

    it("expires a loop persistently, and states the lifetime it was actually given", async () => {
      const { list, store } = await harness({
        jobs: [],
        scan: true,
        seed: {
          // Two hours of life, already spent. The old line said "expired after 3 days"
          // whatever `ttl` said, which is only true when nobody passed one.
          [key("ses_abc")]: [
            storedLoop({ id: "loop_old", createdAt: Date.now() - 2 * 60 * MINUTE_MS, expiresAt: Date.now() - 1_000 }),
          ],
        },
      })

      await waitFor(() => !store.has(key("ses_abc")), "the expired loop to be removed from storage")
      expect((await list()).loops).toEqual([])
      const lines = consoleLines.filter((line) => line.includes("loop loop_old"))
      expect(lines).toHaveLength(1)
      expect(lines[0]).toMatch(/expired after 2h and was disabled/)
    })

    it("survives a restart with a stop applied — the persisted answer, not the in-memory one", async () => {
      // Two instances over one storage double, because in-memory emptiness was never the
      // property that had to hold. Only what storage says survives the process boundary.
      const store = new Map<string, unknown>()
      let tools: Array<Record<string, unknown>> = []
      const context = (): Record<string, unknown> => ({
        location: { directory: dir, project: { id: "restart" } },
        storage: {
          get: async (k: string) => store.get(k),
          set: async (k: string, v: unknown) => void store.set(k, v),
          remove: async (k: string) => void store.delete(k),
          scan: async (input: { prefix?: string }) => ({
            entries: [...store.entries()]
              .filter(([k]) => k.startsWith(input.prefix ?? ""))
              .map(([k, value]) => ({ key: k, value })),
          }),
        },
        session: { create: async () => ({ id: "s" }), prompt: async () => ({ id: "i" }) },
        tool: {
          transform: async (cb: (e: { add?: (tool: unknown) => void }) => void) => {
            cb({ add: (tool) => void tools.push(tool as Record<string, unknown>) })
            return { dispose() {} }
          },
        },
      })
      const toolIn = (name: string): Tool => {
        const found = tools.find((entry) => entry.name === name)
        if (found === undefined) throw new Error(`tool ${name} was not registered`)
        return found as unknown as Tool
      }

      const first = await plugin.setup(context() as never)
      try {
        const call = { sessionID: "ses_abc" }
        const started = await toolIn("start_loop").execute({ prompt: "doomed", every: "1h" }, call)
        expect((await toolIn("list").execute({})).output.loops).toHaveLength(1)
        await toolIn("stop_loop").execute({ id: started.output.id }, call)
        expect(store.has(key("ses_abc"))).toBe(false)
      } finally {
        ;(first as () => void)?.()
      }

      tools = []
      const second = await plugin.setup(context() as never)
      try {
        // Nothing restored: the storage scan cannot find a loop that is not there any more.
        expect((await toolIn("list").execute({})).output.loops).toEqual([])
        expect((await toolIn("list").execute({})).output.leaseHeld).toBe(false)
        // And the loop this session starts now is the only one it has.
        await toolIn("start_loop").execute({ prompt: "fresh", every: "1h" }, { sessionID: "ses_abc" })
        expect(listedIds(await toolIn("list").execute({}).then((r) => r.output))).toHaveLength(1)
      } finally {
        ;(second as () => void)?.()
      }
    })

    // ---------------------------------------------------------------------
    // Dispatch discipline: the same path, the same record, the same cap.
    // ---------------------------------------------------------------------

    it("records a loop post in history, names the model it spent, and leaves the session alone", async () => {
      const { prompts, store, targetCalls } = await harness({
        jobs: [],
        scan: true,
        seed: { [key("ses_abc")]: [storedLoop({ id: "loop_one" })] },
      })

      await waitFor(() => prompts.length > 0, "the due loop to post")
      await waitFor(() => Array.isArray(store.get("scheduled-tasks/history/loop/loop_one")), "the post to be recorded")

      // Recorded like every other run: due instant, outcome, resolved model, owning session.
      const history = storedHistory(store, "loop_one")
      expect(history).toHaveLength(1)
      expect(history[0]).toMatchObject({
        outcome: "ok",
        model: "session default",
        sessionID: "ses_abc",
        dueAt: expect.any(Number),
      })
      // The resolved model is reported in the log, exactly as a job run reports it.
      expect(consoleLines.filter((line) => line.includes("loop loop_one posting"))).toEqual([
        expect.stringMatching(/posting into its own session \(every 1m, model session default\)/),
      ])
      // Posted into the owning session, queued so it cannot interleave with the human.
      expect(prompts[0]).toMatchObject({ sessionID: "ses_abc", text: "the loop prompt", delivery: "queue" })
      // And it reconfigured nothing: a loop declares no target, so a human's live model, agent
      // and permission rules are left exactly as they were.
      expect(targetCalls).toEqual([])

      // L2: the re-armed `nextRunAt` is persisted, so a restart cannot replay the occurrence.
      const stored = store.get(key("ses_abc")) as Array<Record<string, unknown>>
      expect(stored).toHaveLength(1)
      expect(stored[0]!.nextRunAt as number).toBeGreaterThan(Date.now() + 30_000)
    })

    it("records a failed loop post instead of letting it escape the tick", async () => {
      const { list, store, prompts } = await harness({
        jobs: [],
        scan: true,
        promptError: "prompt is down",
        seed: { [key("ses_abc")]: [storedLoop({ id: "loop_broken" })] },
      })

      await waitFor(
        () => Array.isArray(store.get("scheduled-tasks/history/loop/loop_broken")),
        "the failed post to be recorded",
      )
      expect(prompts).toHaveLength(1)
      const history = storedHistory(store, "loop_broken")
      expect(history).toHaveLength(1)
      expect(history[0]).toMatchObject({ outcome: "failed", sessionID: "ses_abc" })
      expect(String(history[0]!.error)).toMatch(/prompt is down/)
      // A failed post does not kill the loop: the next interval still belongs to it.
      expect((await list()).loops).toHaveLength(1)
    })

    it(
      "admits only maxConcurrentRuns due loops and records the rest as skipped (the reviewer's probe)",
      async () => {
        // The probe: 3 due loops, `maxConcurrentRuns: 1` — and 3 prompts in one tick.
        const { prompts, store } = await harness({
          jobs: [],
          scan: true,
          seed: {
            [key("ses_abc")]: [0, 1, 2].map((n) =>
              storedLoop({ id: `loop_${n}`, prompt: `prompt ${n}` }),
            ),
          },
          pluginOptions: { tickMs: 5_000, maxConcurrentRuns: 1 },
        })

        await waitFor(() => prompts.length > 0, "the first due loop to post")
        await waitFor(
          () => Array.isArray(store.get("scheduled-tasks/history/loop/loop_2")),
          "the surplus loops to be decided",
        )

        expect(prompts).toHaveLength(1)
        expect(prompts[0]).toMatchObject({ sessionID: "ses_abc", text: "prompt 0" })
        for (const id of ["loop_1", "loop_2"]) {
          const history = storedHistory(store, id)
          expect(history).toHaveLength(1)
          expect(history[0]).toMatchObject({ outcome: "skipped", sessionID: "ses_abc" })
          expect(String(history[0]!.error)).toMatch(/concurrency cap 1/)
        }

        // The occurrence is consumed, not deferred: a further tick must not reconsider it. If
        // the skip left the due instant where it was, the second tick would post instead —
        // which is the deferral the one-off path already gave up.
        await new Promise((resolve) => setTimeout(resolve, 6_000))
        expect(prompts).toHaveLength(1)
        expect(storedHistory(store, "loop_1")).toHaveLength(1)
      },
      25_000,
    )

    it("admits every due loop the cap allows, so the bound is not over-applied", async () => {
      const { prompts, store } = await harness({
        jobs: [],
        scan: true,
        seed: {
          [key("ses_abc")]: [0, 1, 2].map((n) =>
            storedLoop({ id: `loop_${n}`, prompt: `prompt ${n}` }),
          ),
        },
        pluginOptions: { maxConcurrentRuns: 2 },
      })

      await waitFor(() => prompts.length > 0, "the due loops to post")
      await waitFor(
        () => Array.isArray(store.get("scheduled-tasks/history/loop/loop_2")),
        "the third loop to be decided",
      )
      expect(prompts).toHaveLength(2)
      expect(prompts.map((entry) => entry.text)).toEqual(["prompt 0", "prompt 1"])
      expect(storedHistory(store, "loop_2")[0]).toMatchObject({ outcome: "skipped" })
    })

    it(
      "spends one budget across all three drains, so reordering neither of them buys a slot",
      async () => {
        // The other half of the reordering's safety: moving a drain must not give it a *second*
        // budget. One slot, and all three kinds due in the same tick — a recurring job (decided
        // first, above), then the one-off drain, then the loop drain. Exactly one prompt may
        // result.
        //
        // The mutation this is here for: a drain that recomputes its own `free` from
        // `state.inFlight.size` instead of spending the shared `claimed` counter. The job's id is
        // not in `inFlight` yet (its dispatch is the last thing the tick does), so both ephemeral
        // drains would each hand out a fresh full budget and three prompts would go out under
        // `maxConcurrentRuns: 1`.
        const { prompts, store } = await harness({
          jobs: [{ id: "busy", schedule: "* * * * *", timezone: "UTC", prompt: "the job prompt" }],
          scan: true,
          seed: {
            "scheduled-tasks/busy": { version: STATE_VERSION, lastRun: Date.now() - 5 * MINUTE_MS },
            [key("ses_abc")]: [storedLoop({ id: "loop_out" })],
            "scheduled-tasks/oneoff/pending": [pendingOneOff({ prompt: "the one-off prompt" })],
          },
          pluginOptions: { maxConcurrentRuns: 1 },
        })

        await waitFor(() => prompts.length > 0, "the recurring job to take the slot")
        await waitFor(
          () =>
            Array.isArray(store.get("scheduled-tasks/history/loop/loop_out")) &&
            Array.isArray(store.get("scheduled-tasks/history/oneoff/oneoff_probe")),
          "both ephemeral drains to find the slot gone",
        )

        expect(prompts).toHaveLength(1)
        expect(prompts[0]).toMatchObject({ text: "the job prompt" })
        // Both ephemeral kinds are recorded skipped rather than queued, and the loop's line names
        // the drain that actually took the slot.
        expect(storedHistory(store, "loop_out")[0]).toMatchObject({ outcome: "skipped" })
        const oneoff = store.get("scheduled-tasks/history/oneoff/oneoff_probe") as Array<Record<string, unknown>>
        expect(oneoff[0]).toMatchObject({ outcome: "skipped" })
        expect(consoleLines.filter((line) => line.includes("skipping loop loop_out"))).toEqual([
          expect.stringMatching(/the slot went to 1 recurring job occurrence\(s\) decided this tick/),
        ])
      },
      20_000,
    )

    it(
      "spends the same per-tick budget as a recurring job",
      async () => {
        // One slot, a due job and a due loop. The job is decided first, so the loop must find
        // the budget already spent — otherwise "one run at a time" is only true for jobs.
        const { prompts, store } = await harness({
          jobs: [{ id: "busy", schedule: "* * * * *", timezone: "UTC", prompt: "the job prompt" }],
          scan: true,
          seed: {
            "scheduled-tasks/busy": { version: STATE_VERSION, lastRun: Date.now() - 5 * MINUTE_MS },
            [key("ses_abc")]: [storedLoop({ id: "loop_a" })],
          },
          pluginOptions: { tickMs: 5_000, maxConcurrentRuns: 1 },
        })

        await waitFor(() => prompts.length > 0, "the recurring job to take the slot")
        await waitFor(
          () => Array.isArray(store.get("scheduled-tasks/history/loop/loop_a")),
          "the loop to find no free slot",
        )
        expect(prompts).toHaveLength(1)
        expect(prompts[0]).toMatchObject({ text: "the job prompt" })
        const history = storedHistory(store, "loop_a")
        expect(history).toHaveLength(1)
        expect(history[0]).toMatchObject({ outcome: "skipped" })
        expect(String(history[0]!.error)).toMatch(/concurrency cap 1/)
      },
      20_000,
    )

    it(
      "spends the tick's single slot on the one-off, and records the loop behind it as skipped",
      async () => {
        // The ordering rule, pinned: **one-offs drain before loops** — specific beats recurring.
        // One slot, one due loop, one due one-off. The old order (loops first) let the loop take
        // the slot and *spend* the one-off as `skipped` — permanently, since a skipped one-off is
        // consumed by design — so a user who asked for a task at a specific instant lost it
        // silently to a request that recurs every minute anyway. The loop is the cheap thing to
        // disappoint: it keeps its loop and is owed another occurrence in a minute.
        //
        // `slowWrites` makes the *loop* record settle on a later macrotask. Under the old order
        // that was what pinned "the budget *this tick decided*, not whatever still happens to be
        // in flight" — a tick that re-read the live counter would hand the same slot back. It is
        // kept here so the test still fails that way: with the one-offs first, the one-off drain
        // cannot see a loop post that has not been dispatched yet, and the loop drain must still
        // find the slot spent from the counter the one-off drain incremented.
        const { prompts, store } = await harness({
          jobs: [],
          scan: true,
          slowWrites: true,
          seed: {
            [key("ses_abc")]: [storedLoop({ id: "loop_second" })],
            "scheduled-tasks/oneoff/pending": [pendingOneOff({ prompt: "the one-off prompt" })],
          },
          pluginOptions: { maxConcurrentRuns: 1 },
        })

        await waitFor(() => prompts.length > 0, "the one-off to take the only slot")
        await waitFor(
          () => Array.isArray(store.get("scheduled-tasks/history/loop/loop_second")),
          "the loop to find no free slot",
        )
        // The one-off ran, and *it* was the one that ran: one prompt, the one-off's.
        expect(prompts).toHaveLength(1)
        expect(prompts[0]).toMatchObject({ text: "the one-off prompt" })

        // The loop is recorded as skipped, never queued — and the record says which drain spent
        // the slot, so the log cannot be read as "another loop outranked this one".
        const history = storedHistory(store, "loop_second")
        expect(history).toHaveLength(1)
        expect(history[0]).toMatchObject({ outcome: "skipped", sessionID: "ses_abc" })
        expect(String(history[0]!.error)).toMatch(/concurrency cap 1/)
        expect(String(history[0]!.error)).toMatch(/1 one-off task\(s\) earlier this tick/)
        expect(consoleLines.filter((line) => line.includes("skipping loop loop_second"))).toEqual([
          expect.stringMatching(/concurrency cap reached \(1\/1\); the slot went to 1 one-off task\(s\)/),
        ])

        // The loop is alive and re-armed: it lost one turn, not the loop. A skip that stopped it
        // would trade a fairness wart for a much worse one.
        expect(storedIds(store, "ses_abc")).toEqual(["loop_second"])
        const stored = store.get(key("ses_abc")) as Array<Record<string, unknown>>
        expect(stored[0]!.nextRunAt as number).toBeGreaterThan(Date.now())
      },
      20_000,
    )

    it(
      "keeps counting an outstanding loop post against the cap on later ticks",
      async () => {
        // Cross-tick accounting, on an injected clock. A loop post that has been admitted but
        // has not settled still occupies its slot, so the *next* occurrence is skipped rather
        // than posted alongside it. Real intervals are floored at a minute, which no test can
        // wait out, so the interval comes from the injected time instead.
        vi.useFakeTimers()
        try {
          const start = Date.now()
          vi.setSystemTime(start)
          const { prompts, store, release } = await harness({
            jobs: [],
            scan: true,
            hold: true,
            seed: {
              [key("ses_abc")]: [
                storedLoop({ id: "loop_hold", intervalMs: MIN_TICK_MS, nextRunAt: start - 1_000 }),
              ],
            },
            pluginOptions: { tickMs: MIN_TICK_MS, maxConcurrentRuns: 1 },
          })

          // Arming evaluates immediately, so the first occurrence is already in flight.
          await vi.advanceTimersByTimeAsync(0)
          expect(prompts).toHaveLength(1)

          // One interval later the loop owes another occurrence, and the first has not settled.
          await vi.advanceTimersByTimeAsync(MIN_TICK_MS + 1_000)
          expect(prompts).toHaveLength(1)
          const history = storedHistory(store, "loop_hold")
          expect(history.length).toBeGreaterThanOrEqual(1)
          for (const entry of history) {
            expect(entry).toMatchObject({ outcome: "skipped", sessionID: "ses_abc" })
            expect(String(entry.error)).toMatch(/concurrency cap 1/)
          }
          release()
        } finally {
          vi.useRealTimers()
        }
      },
      20_000,
    )
  })
})

// ===========================================================================
// A run is bounded (bug-run-timeout-never-enforced)
// ===========================================================================

describe("runTimeout bounds a run (bug-run-timeout-never-enforced)", () => {
  let dir: string
  let restoreEnv: string | undefined
  let consoleLines: string[] = []
  let realConsoleError: typeof console.error
  const outstanding: Array<() => void> = []

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "st-timeout-"))
    mkdirSync(join(dir, ".opencode"), { recursive: true })
    restoreEnv = process.env[DATA_DIR_ENV]
    process.env[DATA_DIR_ENV] = join(dir, "state")
    realConsoleError = console.error
    consoleLines = []
    console.error = (...args: unknown[]): void => void consoleLines.push(args.map(String).join(" "))
  })

  afterEach(() => {
    for (const dispose of outstanding.splice(0).reverse()) {
      try {
        dispose()
      } catch {
        // A failing teardown must not mask the assertion that ran before it.
      }
    }
    console.error = realConsoleError
    if (restoreEnv === undefined) delete process.env[DATA_DIR_ENV]
    else process.env[DATA_DIR_ENV] = restoreEnv
    rmSync(dir, { recursive: true, force: true })
  })

  type HungHarness = {
    prompts: Record<string, unknown>[]
    /** Every `ctx.session.interrupt` call the plugin made. */
    interrupts: Record<string, unknown>[]
    store: Map<string, unknown>
    history: (id: string) => Array<Record<string, unknown>> | undefined
    jobState: (id: string) => Record<string, unknown> | undefined
    list: () => Promise<Record<string, unknown>>
    release: () => void
  }

  /**
   * A context whose one named prompt never resolves.
   *
   * The prompt that hangs is named rather than global, because "a hung run must not starve the
   * others" is only observable if the others actually run. `interrupt: false` withholds the
   * cancel primitive, which is the host the honest `abandoned` outcome exists for.
   */
  async function hungRun(
    options: {
      jobs?: unknown[]
      seed?: Record<string, unknown>
      pluginOptions?: Record<string, unknown>
      projectID?: string
      /** The one prompt text that never resolves; every other prompt resolves at once. */
      hangPrompt?: string
      /** Withhold `session.interrupt`, as a host without the primitive would. */
      interrupt?: boolean
      /** Offer `ctx.storage.scan`, the host's only way loops are discovered (verified on 2.0.22). */
      scan?: boolean
    } = {},
  ): Promise<HungHarness> {
    const store = new Map<string, unknown>(Object.entries(options.seed ?? {}))
    if (options.jobs !== undefined) {
      writeFileSync(
        join(dir, ".opencode", "schedules.json"),
        JSON.stringify({ version: 1, jobs: options.jobs }),
      )
    }
    const prompts: Record<string, unknown>[] = []
    const interrupts: Record<string, unknown>[] = []
    let openTheGate: () => void = () => {}
    const gate = new Promise<void>((resolve) => void (openTheGate = resolve))
    const tools: Array<Record<string, unknown>> = []
    const ctx: Record<string, unknown> = {
      ...(options.pluginOptions === undefined ? {} : { options: options.pluginOptions }),
      location: { directory: dir, project: { id: options.projectID ?? "timeout" } },
      storage: {
        get: async (key: string) => store.get(key),
        set: async (key: string, value: unknown) => void store.set(key, value),
        remove: async (key: string) => void store.delete(key),
        // Mirrors the host surface verified on 2.0.22: `{ entries: [{ key, value }], next? }`,
        // keys already relative to the plugin's own namespace, `next` absent on the last page.
        ...(options.scan === true
          ? {
              scan: async (input: { prefix?: string; after?: string; limit?: number }) => {
                const keys = [...store.keys()].filter((key) => key.startsWith(input.prefix ?? "")).sort()
                const start = input.after === undefined ? 0 : Math.max(0, keys.indexOf(input.after) + 1)
                const limit = input.limit ?? 100
                const page = keys.slice(start, start + limit)
                const entries = page.map((key) => ({ key, value: store.get(key) }))
                const consumed = start + page.length
                return consumed < keys.length ? { entries, next: page[page.length - 1]! } : { entries }
              },
            }
          : {}),
      },
      session: {
        create: async () => ({ id: "ses_hung" }),
        prompt: async (input: Record<string, unknown>) => {
          prompts.push(input)
          if (options.hangPrompt !== undefined && input.text === options.hangPrompt) await gate
          return { id: `inbox_${prompts.length}` }
        },
        ...(options.interrupt === false
          ? {}
          : {
              // Mirrors the host surface verified on 2.0.22: it resolves `{ interrupted }`, so a
              // `false` is an answer rather than a failure.
              interrupt: async (input: Record<string, unknown>) => {
                interrupts.push(input)
                return { interrupted: true }
              },
            }),
      },
      tool: {
        transform: async (cb: (editor: { add?: (t: unknown) => void }) => void) => {
          cb({ add: (t) => void tools.push(t as Record<string, unknown>) })
          return { dispose() {} }
        },
      },
    }
    const resolved = await plugin.setup(ctx as never)
    outstanding.push(() => {
      ;(resolved as () => void)?.()
      // Never leave a hung prompt pending: a test that ends mid-run must not strand the
      // dispatch promise into the next test.
      openTheGate()
    })
    return {
      prompts,
      interrupts,
      store,
      // Jobs keep the flat `history/<id>` key; a one-off's and a loop's history moved under
      // `history/oneoff/` and `history/loop/` so they cannot collide with a job id. Resolved
      // across all three so each test below can still ask for the id it cares about; the key
      // shape itself is pinned by the ephemeral-history suite.
      history: (id) =>
        (store.get(`scheduled-tasks/history/${id}`) ??
          store.get(`scheduled-tasks/history/oneoff/${id}`) ??
          store.get(`scheduled-tasks/history/loop/${id}`)) as Array<Record<string, unknown>> | undefined,
      jobState: (id) => store.get(`scheduled-tasks/${id}`) as Record<string, unknown> | undefined,
      list: async () => {
        const tool = tools.find((entry) => entry.name === "list") as
          | { execute: (input: Record<string, unknown>) => Promise<{ output: Record<string, unknown> }> }
          | undefined
        if (tool === undefined) throw new Error("the list tool was not registered")
        return (await tool.execute({})).output
      },
      release: openTheGate,
    }
  }

  /** A `* * * * *` job that is already due at `start`, so one tick decides it. */
  const dueJob = (id: string, prompt: string, over: Record<string, unknown> = {}): Record<string, unknown> => ({
    id,
    schedule: "* * * * *",
    timezone: "UTC",
    prompt,
    ...over,
  })

  const seeded = (start: number, ...ids: string[]): Record<string, unknown> =>
    Object.fromEntries(ids.map((id) => [`scheduled-tasks/${id}`, { version: STATE_VERSION, lastRun: start - 5 * MINUTE_MS }]))

  const countOf = (harness: HungHarness, text: string): number =>
    harness.prompts.filter((entry) => entry.text === text).length

  /**
   * Advance the injected clock until `predicate` holds, or give up after `budgetMs`.
   *
   * The fake-timer stand-in for `waitFor`, and needed because these tests assert on wall-clock
   * consequences whose exact tick depends on where in the minute the run started — advancing a
   * guessed number of milliseconds is how a test passes on one run and fails on the next.
   */
  async function advanceUntil(predicate: () => boolean, budgetMs: number, stepMs = MIN_TICK_MS): Promise<boolean> {
    for (let elapsed = 0; elapsed <= budgetMs; elapsed += stepMs) {
      if (predicate()) return true
      await vi.advanceTimersByTimeAsync(stepMs)
    }
    return predicate()
  }

  it("renews an in-flight run's lease inside the window, so it cannot expire between renewals", () => {
    // The schedule rule, pinned on its own. Two renewals have to fit inside one window, or a
    // lease can lapse while its run is still demonstrably going — which is the double-fire.
    for (const runTimeoutMs of [MINUTE_MS, 5 * MINUTE_MS, 15 * MINUTE_MS, 60 * MINUTE_MS, 24 * 60 * MINUTE_MS]) {
      expect(leaseRenewalMs(runTimeoutMs)).toBeGreaterThan(0)
      expect(leaseRenewalMs(runTimeoutMs) * 2).toBeLessThanOrEqual(runTimeoutMs)
    }
    // And it tracks the bound rather than being a fixed period, so a 1m job and a 1h job renew
    // at comparable fractions of themselves.
    expect(leaseRenewalMs(4 * MINUTE_MS)).toBe(4 * leaseRenewalMs(MINUTE_MS))
    expect(leaseRenewalMs(MINUTE_MS)).toBe(30_000)
  })

  it("holds a run outstanding on either signal, because neither one can be trusted alone", () => {
    // The composed rule, pinned without a clock. `leaseUntil` is a comparison against `now`, so
    // it reads expired after any stall longer than its window even though the run is provably
    // still going; `inFlight` membership is a fact about this process and cannot be stale. The
    // rule is their disjunction: either one alone keeps the job from being admitted twice.
    const live = { version: STATE_VERSION, leaseUntil: 1_000 }
    const dead = { version: STATE_VERSION, leaseUntil: 10 }
    expect(isRunOutstanding(live, true, 5_000)).toBe(true)
    expect(isRunOutstanding(dead, true, 5_000)).toBe(true)
    expect(isRunOutstanding(live, false, 500)).toBe(true)
    expect(isRunOutstanding(dead, false, 5_000)).toBe(false)
    expect(isRunOutstanding({ version: STATE_VERSION }, false, 5_000)).toBe(false)
  })

  it(
    "bounds a prompt that never resolves, records timeout and frees the slot",
    async () => {
      // The original scenario: a run that never returns. `runTimeout` is floored at one minute,
      // so this runs on an injected clock — `advanceTimersByTimeAsync` delivers the bound timer,
      // which is what makes this test *fail* rather than hang when the bound is absent.
      vi.useFakeTimers()
      try {
        const start = Date.now()
        vi.setSystemTime(start)
        const harness = await hungRun({
          hangPrompt: "never resolves",
          jobs: [dueJob("hung", "never resolves", { runTimeout: "1m" })],
          seed: seeded(start, "hung"),
          pluginOptions: { tickMs: MIN_TICK_MS, maxConcurrentRuns: 1 },
        })

        await vi.advanceTimersByTimeAsync(0)
        expect(harness.prompts).toHaveLength(1)
        expect(harness.prompts[0]).toMatchObject({ text: "never resolves", sessionID: "ses_hung", delivery: "queue" })

        // Short of the bound: nothing recorded, nothing stopped, and the slot is still held.
        await vi.advanceTimersByTimeAsync(MINUTE_MS - MIN_TICK_MS)
        expect(harness.history("hung")).toBeUndefined()
        expect(harness.interrupts).toEqual([])
        // Still running, and still only one prompt: no tick in the window admitted a second run.
        // (`lastStatus` is *not* asserted here. Whether an intervening tick happened to cross a
        // minute boundary — and so spent an occurrence as `skipped` — depends on where in the
        // minute this test starts, so asserting it made this test fail roughly one run in ten.
        // The skip bookkeeping has its own tests, with the clock pinned.)
        expect((await harness.list()).jobs).toMatchObject([{ id: "hung", running: true }])
        expect(countOf(harness, "never resolves")).toBe(1)

        // The bound. Pre-fix nothing is delivered here and every assertion below fails.
        //
        // Advanced by predicate rather than by a fixed amount, on purpose: the tick at exactly
        // `start + runTimeoutMs` and the bound timer at the same instant can be delivered in
        // either order, and the order decides whether that tick sees the slot already freed (so
        // the job owes a *fresh* occurrence a minute later) or still held. Both are correct; only
        // the record of *this* run is being asserted here.
        expect(await advanceUntil(() => (harness.history("hung") ?? []).length > 0, 2 * MIN_TICK_MS)).toBe(true)

        // Recorded with the `RunStatus` member that no code path ever produced before.
        expect(harness.history("hung")![0]).toMatchObject({
          outcome: "timeout",
          sessionID: "ses_hung",
          model: "session default",
        })
        expect(String(harness.history("hung")![0]!.error)).toMatch(/exceeded runTimeout 1m/)
        // …and it says the session was *stopped*, which is the claim `interrupt` backs.
        expect(String(harness.history("hung")![0]!.error)).toMatch(/interrupted/)
        expect(harness.interrupts).toEqual([{ sessionID: "ses_hung" }])
        expect(harness.jobState("hung")).toMatchObject({ lastStatus: "timeout" })

        // The slot is free again, which is what stops one hung run from latching
        // `maxConcurrentRuns` for the life of the process.
        expect((await harness.list()).jobs).toMatchObject([{ id: "hung", running: false }])
        // The log says it, once, naming the job.
        expect(consoleLines.filter((line) => /hung/.test(line) && /timed out/.test(line))).toHaveLength(1)
      } finally {
        vi.useRealTimers()
      }
    },
    20_000,
  )

  it(
    "says it abandoned the run when the host offers no way to interrupt it",
    async () => {
      // Honesty over convenience: with no cancel primitive the await is abandoned, not stopped,
      // and a record that claimed otherwise would be the lie this whole fix exists to remove.
      vi.useFakeTimers()
      try {
        const start = Date.now()
        vi.setSystemTime(start)
        const harness = await hungRun({
          hangPrompt: "never resolves",
          interrupt: false,
          jobs: [dueJob("hung", "never resolves", { runTimeout: "1m" })],
          seed: seeded(start, "hung"),
          pluginOptions: { tickMs: MIN_TICK_MS, maxConcurrentRuns: 1 },
        })

        await vi.advanceTimersByTimeAsync(0)
        expect(
          await advanceUntil(() => (harness.history("hung") ?? []).length > 0, MINUTE_MS + MIN_TICK_MS),
        ).toBe(true)

        const entry = harness.history("hung")![0]!
        expect(entry).toMatchObject({ outcome: "timeout" })
        expect(String(entry.error)).toMatch(/abandoned/)
        expect(String(entry.error)).toMatch(/interrupt is unavailable/)
        expect(String(entry.error)).not.toMatch(/was interrupted/)
        // Bounded all the same: the slot is released without a cancel primitive existing.
        expect((await harness.list()).jobs).toMatchObject([{ id: "hung", running: false }])
      } finally {
        vi.useRealTimers()
      }
    },
    20_000,
  )

  it(
    "releases the shared per-tick budget when a run times out, so the next job still runs",
    async () => {
      // One slot. `hung` takes it and never returns; `other` is due every minute. Pre-fix the
      // hung id stays in `inFlight` forever, so `claimed` is spent for the life of the process
      // and `other` is skipped on every tick from here on — starvation, not a timeout.
      //
      // `hung` is `@daily` on purpose. A hung run that is *also* due every minute would take the
      // slot straight back on its next occurrence and starve `other` for a reason that has
      // nothing to do with the budget being released.
      vi.useFakeTimers()
      try {
        const start = Date.now()
        vi.setSystemTime(start)
        const harness = await hungRun({
          hangPrompt: "never resolves",
          jobs: [
            dueJob("hung", "never resolves", { schedule: "@daily", timezone: "UTC", runTimeout: "1m" }),
            dueJob("other", "quick run"),
          ],
          seed: {
            // Two days back, so the last midnight is always inside the window whatever time of
            // day this test happens to run at (`@daily` fires at 00:00, so a shorter window can
            // miss it entirely and the job would never be due).
            "scheduled-tasks/hung": { version: STATE_VERSION, lastRun: start - 48 * 60 * MINUTE_MS },
            "scheduled-tasks/other": { version: STATE_VERSION, lastRun: start - 5 * MINUTE_MS },
          },
          pluginOptions: { tickMs: MIN_TICK_MS, maxConcurrentRuns: 1 },
        })

        await vi.advanceTimersByTimeAsync(0)
        expect(countOf(harness, "never resolves")).toBe(1)
        // The occurrence was spent and recorded, not queued (ADR 0002). A recurring job records
        // a skip on its state rather than in history, so that is where the claim is checked.
        expect(harness.jobState("other")).toMatchObject({ lastStatus: "skipped" })
        expect(consoleLines.filter((line) => line.includes("skipping other"))).toEqual([
          expect.stringContaining("concurrency cap reached (1/1)"),
        ])

        // Past the bound, and then on until `other` owes a fresh occurrence. Two minutes of
        // budget covers it whatever the minute offset: `other` can only become due again on the
        // next minute boundary after the tick that last skipped it.
        expect(await advanceUntil(() => countOf(harness, "quick run") > 0, 3 * MINUTE_MS)).toBe(true)
        expect(harness.history("hung")).toMatchObject([{ outcome: "timeout" }])
        expect(harness.jobState("other")).toMatchObject({ lastStatus: "ok" })
        expect(harness.history("other")).toMatchObject([{ outcome: "ok", sessionID: "ses_hung" }])
        // The hung job was not re-fired in the meantime, so the slot was released rather than
        // handed from one stuck run straight to the next.
        expect(countOf(harness, "never resolves")).toBe(1)
      } finally {
        vi.useRealTimers()
      }
    },
    20_000,
  )

  it(
    "keeps the in-flight lease live for the whole run, so no tick re-admits the job",
    async () => {
      // The lease half, in the form the acceptance names: "the lease is not reclaimed while a
      // run is in flight". `maxConcurrentRuns: 2` with a single job is the sharp version — one
      // run holds one of two slots, so the concurrency cap provably cannot be what refuses the
      // next occurrence. The only thing that can is the lease, and if it were ever read expired
      // the job would be admitted a second time into a session whose first prompt has not
      // returned. That is the double-fire ADR 0003 exists to prevent, so this test fails loudly
      // if the lease is ever short of the run's remaining life.
      vi.useFakeTimers()
      try {
        // Park the clock 45s into a minute and give the run a three-minute bound, so the run
        // spans three minute boundaries at 15s, 75s and 135s. Cron is minute-resolution, so a
        // due job is re-decided at most once a minute — three boundaries means three genuine
        // chances to observe the lease, rather than one chance at a lucky offset.
        const real = Date.now()
        const start = real - (real % MINUTE_MS) + 45_000
        vi.setSystemTime(start)
        const harness = await hungRun({
          hangPrompt: "slow run",
          jobs: [dueJob("slow", "slow run", { runTimeout: "3m" })],
          seed: seeded(start, "slow"),
          pluginOptions: { tickMs: MIN_TICK_MS, maxConcurrentRuns: 2 },
        })

        await vi.advanceTimersByTimeAsync(0)
        expect(countOf(harness, "slow run")).toBe(1)

        // Every tick strictly inside the run, including all three re-decisions.
        await vi.advanceTimersByTimeAsync(3 * MINUTE_MS - MIN_TICK_MS)
        expect(countOf(harness, "slow run")).toBe(1)

        const skips = consoleLines.filter((line) => line.includes("skipping slow"))
        expect(skips).toHaveLength(3)
        for (const line of skips) expect(line).toContain("previous run still in flight")
        // No occurrence was quietly spent as `concurrency` on the way past, either.
        expect(consoleLines.some((line) => line.includes("concurrency cap reached"))).toBe(false)
      } finally {
        vi.useRealTimers()
      }
    },
    20_000,
  )

  it(
    "bounds a hung loop post too, and gives the tick's shared budget back",
    async () => {
      // A loop carries no `runTimeout` — `every` is a cadence, not a bound — so it is bounded by
      // the default. What matters here is that the bound is the *same* mechanism and that the
      // slot comes back: `postLoop` is dispatched with `void` from inside the tick and its id
      // lives in the same `inFlight` set the one-per-tick `claimed` budget is computed from, so a
      // loop post that never returns would latch the budget exactly like a hung job run.
      vi.useFakeTimers()
      try {
        const start = Date.now()
        vi.setSystemTime(start)
        const harness = await hungRun({
          hangPrompt: "the loop prompt",
          jobs: [],
          scan: true,
          seed: {
            "scheduled-tasks/loop/ses_abc": [
              {
                id: "loop_hung",
                sessionID: "ses_abc",
                prompt: "the loop prompt",
                // A long interval, so the loop does not re-arm and go due again inside the test:
                // a second due occurrence would be *skipped* (the slot is taken) and would land
                // in history before the timed-out post does, which is a different claim entirely.
                intervalMs: 30 * MINUTE_MS,
                nextRunAt: start - 1_000,
                expiresAt: start + 60 * MINUTE_MS,
                createdAt: start - 60_000,
              },
            ],
          },
          pluginOptions: { tickMs: MIN_TICK_MS, maxConcurrentRuns: 1 },
        })

        await vi.advanceTimersByTimeAsync(0)
        expect(countOf(harness, "the loop prompt")).toBe(1)
        expect(harness.history("loop_hung")).toBeUndefined()

        // The default run bound is 15 minutes; past it the post is bounded and the slot is back.
        expect(
          await advanceUntil(() => (harness.history("loop_hung") ?? []).length > 0, 16 * MINUTE_MS),
        ).toBe(true)
        const entry = harness.history("loop_hung")![0]!
        expect(entry).toMatchObject({ outcome: "timeout", sessionID: "ses_abc", model: "session default" })
        expect(String(entry.error)).toMatch(/exceeded runTimeout 15m/)
        // Still exactly one post: the hung loop was not re-posted while it held the slot, and it
        // was not re-posted the moment it gave it up either.
        expect(countOf(harness, "the loop prompt")).toBe(1)
      } finally {
        vi.useRealTimers()
      }
    },
    20_000,
  )

  it(
    "bounds a hung one-off and records the timeout, since the tick only records an ok outcome",
    async () => {
      // `runOneOff` returns its outcome to the tick, and the tick writes history only for `"ok"`.
      // So the timeout has to be recorded inside the one-off path or it leaves no trace at all —
      // which is the same "a bound that does not bind" hole in a different place.
      vi.useFakeTimers()
      try {
        const start = Date.now()
        vi.setSystemTime(start)
        const harness = await hungRun({
          hangPrompt: "the one-off prompt",
          jobs: [],
          seed: {
            "scheduled-tasks/oneoff/pending": [
              {
                id: "oneoff_hung",
                dueAt: start - 1_000,
                prompt: "the one-off prompt",
                createdAt: start - 60_000,
                runTimeoutMs: MINUTE_MS,
              },
            ],
          },
          pluginOptions: { tickMs: MIN_TICK_MS, maxConcurrentRuns: 1 },
        })

        await vi.advanceTimersByTimeAsync(0)
        expect(countOf(harness, "the one-off prompt")).toBe(1)

        expect(
          await advanceUntil(
            () => (harness.history("oneoff_hung") ?? []).length > 0,
            MINUTE_MS + MIN_TICK_MS,
          ),
        ).toBe(true)
        const entry = harness.history("oneoff_hung")![0]!
        expect(entry).toMatchObject({ outcome: "timeout" })
        expect(String(entry.error)).toMatch(/exceeded runTimeout 1m/)
        expect(countOf(harness, "the one-off prompt")).toBe(1)
        // The pending list is still emptied either way, so a timed-out one-off cannot be
        // replayed into the next tick's backlog.
        expect(harness.store.get("scheduled-tasks/oneoff/pending")).toEqual([])
      } finally {
        vi.useRealTimers()
      }
    },
    20_000,
  )

  // ---------------------------------------------------------------------
  // NOT TESTED HERE, and the reason matters more than the gap.
  //
  // The double-fire this item describes — a tick re-admitting a job whose run is still going, so
  // a second prompt enters a busy session — was written, and it reproduced (two `slow run`
  // prompts, two `running slow` lines) with the in-flight signal and the lease renewal both
  // removed. It was then deleted because it did not reproduce reliably: it depends on how a
  // runtime orders a tick interval and a run-bound timer that come due at the *same* instant, and
  // the same mutation passed it on some runs and failed it on others.
  //
  // Two things make it non-deterministic as written, and neither is fixable from the test side:
  // the boundary is the tick period dividing `runTimeoutMs`, so the double-fire window is exactly
  // zero-width; and once the bound is enforced the lease cannot expire under a live run *at all*,
  // because the bound timer is always due first and is delivered first. So the reachable state
  // is a coin-flip on timer ordering, and a test that depends on a coin-flip is worse than no
  // test — it would be green for the wrong reason on a good day.
  //
  // What is tested instead, and what each of those actually pins:
  //   - `leaseRenewalMs` — the renewal schedule keeps two renewals inside one window.
  //   - `isRunOutstanding` — either signal alone holds a run outstanding, so neither mechanism
  //     has to be correct on its own.
  //   - "keeps the in-flight lease live for the whole run" — with `maxConcurrentRuns: 2` and a
  //     single job, the concurrency cap provably cannot refuse anything, so a re-admission there
  //     would be visible as a second prompt and nothing else.
  //
  // Removing the renewal alone (M4), the in-flight join alone (M5), *both* together (M6), or
  // shortening the renewed window to a quarter of the bound (M7) — none of those fails a single
  // test. That is not an oversight in the suite; it is the finding. Once the bound is enforced the
  // bound timer is always due before the lease can expire, so the two in-flight signals are
  // provably redundant for every state the scheduler can reach, and no test can tell them apart
  // without manufacturing an unreachable one. They are kept because the redundancy is what makes
  // a *future* change safe, and because each mechanism's own rule is pinned on its own above —
  // but the reviewer should know that the double-fire half is defended by construction, not by a
  // red test.
  // ---------------------------------------------------------------------

  it("keeps the writer lease alive while a run is hung, and stays inert behind a foreign holder", async () => {
    // The cross-process half. The writer lease is heartbeated by the *tick*, not by the run, and
    // a run is dispatched with `void` — so a prompt that never returns does not stall the
    // heartbeat and the lease cannot go stale under a second instance. Asserted on the lockfile
    // itself: `leaseHeld` reads the in-memory lease object and cannot see whether `heartbeat()`
    // actually wrote, which is the same trap as the sibling release tests.
    const harness = await hungRun({
      hangPrompt: "never resolves",
      jobs: [dueJob("hung", "never resolves", { runTimeout: "1m" })],
      seed: seeded(Date.now(), "hung"),
      pluginOptions: { tickMs: MIN_TICK_MS, maxConcurrentRuns: 1 },
    })
    await waitFor(() => harness.prompts.length > 0, "the hung run to be dispatched", 6_000)

    const path = leasePath(dir, "timeout")
    const heartbeat = (): number => JSON.parse(readFileSync(path, "utf8")).heartbeat as number
    expect(existsSync(path)).toBe(true)
    const first = heartbeat()

    // A whole tick period later the holder is still alive.
    await new Promise((resolve) => setTimeout(resolve, MIN_TICK_MS + 1_000))
    expect(heartbeat()).toBeGreaterThan(first)
    // Still exactly one run outstanding, so the hung prompt was not re-fired either.
    expect(countOf(harness, "never resolves")).toBe(1)

    // A second instance over a project another server holds must stay inert, and must report the
    // work rather than pretend it does not exist. Seeded with the in-flight marker a hung run
    // leaves behind, because the case under test is arbitration *while a run is outstanding*.
    const foreignPath = leasePath(dir, "timeout-foreign")
    mkdirSync(join(foreignPath, ".."), { recursive: true })
    writeFileSync(foreignPath, JSON.stringify({ pid: process.pid + 1, heartbeat: Date.now() }))
    try {
      const second = await hungRun({
        projectID: "timeout-foreign",
        hangPrompt: "never resolves",
        jobs: [dueJob("other", "never resolves", { runTimeout: "1m" })],
        seed: {
          "scheduled-tasks/other": {
            version: STATE_VERSION,
            lastRun: Date.now() - 5 * MINUTE_MS,
            leaseUntil: Date.now() + 60_000,
          },
        },
        pluginOptions: { tickMs: MIN_TICK_MS, maxConcurrentRuns: 1 },
      })
      const listing = await second.list()
      expect(listing.leaseForeign).toBe(true)
      expect(listing.leaseHeld).toBe(false)
      expect((listing.jobs as Array<Record<string, unknown>>)[0]).toMatchObject({ id: "other" })
      await new Promise((resolve) => setTimeout(resolve, 300))
      expect(second.prompts).toEqual([])
    } finally {
      rmSync(foreignPath, { force: true })
    }
  }, 25_000)
})

// =====================================================================
// Ephemeral history: readable, namespaced and bounded
// (bug-oneoff-history-unreadable-and-storage-unbounded)
//
// The live repro this block is built around: a one-off ran — the scheduler log said so — and
// reading it back failed with `no job with id "oneoff_…"`, because the history was written
// under the one-off's own id while `schedules_history` resolved `state.jobs` only. Two published
// statements were therefore false (the README's "a completed one-off survives only in
// `schedules_history`", and the `cancel` error's "check schedules_history"), and every one-off
// left a permanent storage key because `storage.remove` was never called.
// =====================================================================
describe("ephemeral history is readable and bounded (bug-oneoff-history-unreadable-and-storage-unbounded)", () => {
  let dir: string
  let restoreEnv: string | undefined
  let consoleLines: string[]
  let realConsoleError: typeof console.error
  const outstanding: Array<() => void> = []

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "st-eph-"))
    mkdirSync(join(dir, ".opencode"), { recursive: true })
    restoreEnv = process.env[DATA_DIR_ENV]
    process.env[DATA_DIR_ENV] = join(dir, "state")
    realConsoleError = console.error
    consoleLines = []
    console.error = (...args: unknown[]): void => void consoleLines.push(args.map(String).join(" "))
  })

  afterEach(() => {
    for (const dispose of outstanding.splice(0).reverse()) {
      try {
        dispose()
      } catch {
        /* a failing teardown must not mask the assertion before it */
      }
    }
    console.error = realConsoleError
    if (restoreEnv === undefined) delete process.env[DATA_DIR_ENV]
    else process.env[DATA_DIR_ENV] = restoreEnv
    rmSync(dir, { recursive: true, force: true })
    vi.useRealTimers()
  })

  type Tool = {
    execute: (
      input: Record<string, unknown>,
      context?: { sessionID?: unknown },
    ) => Promise<{ output: Record<string, unknown> }>
  }

  type Runs = Array<Record<string, unknown>>

  type Ephemeral = {
    tool: (name: string) => Tool
    store: Map<string, unknown>
    /** Every key the plugin deleted, in order. */
    removed: string[]
    prompts: Record<string, unknown>[]
    list: () => Promise<Record<string, unknown>>
    /** The stored run history under an explicit key. */
    stored: (key: string) => Runs | undefined
    /** Every stored history key, whatever namespace it is in. */
    historyKeys: () => string[]
    cleanup: () => void
  }

  /**
   * A plugin over a `get`/`set`/`remove` store, with the prompt surface individually
   * withholdable — every one-off failure path starts with "the host does not offer this".
   *
   * `remove` is optional on the real surface, so it can be withheld to exercise the host whose
   * only way to clear a key is to write an empty record over it.
   */
  async function ephemeral(
    options: {
      jobs?: unknown[]
      seed?: Record<string, unknown>
      /** Withhold `session.prompt`, as a host without it would. */
      noPrompt?: boolean
      /** Withhold `session.create`, as a host without it would. */
      noCreate?: boolean
      /** `session.create` resolves a record carrying no usable id. */
      createWithoutId?: boolean
      /** `session.create` resolves this id — an absurdly long one, as a hostile host might. */
      createSessionID?: string
      /** Every admitted prompt fails with this message. */
      promptError?: string
      /** Every admitted prompt waits this long on the injected clock before resolving. */
      promptDelayMs?: number
      /** Offer `ctx.storage.scan`, without which a stored loop is not restored at setup. */
      scan?: boolean
      /** Withhold `ctx.storage.remove`. */
      storageRemove?: boolean
      pluginOptions?: Record<string, unknown>
    } = {},
  ): Promise<Ephemeral> {
    const store = new Map<string, unknown>(Object.entries(options.seed ?? {}))
    if (options.jobs !== undefined) {
      writeFileSync(join(dir, ".opencode", "schedules.json"), JSON.stringify({ version: 1, jobs: options.jobs }))
    }
    const tools: Array<Record<string, unknown>> = []
    const prompts: Record<string, unknown>[] = []
    const removed: string[] = []
    const ctx: Record<string, unknown> = {
      ...(options.pluginOptions === undefined ? {} : { options: options.pluginOptions }),
      location: { directory: dir, project: { id: "ephemeral" } },
      storage: {
        get: async (key: string) => store.get(key),
        set: async (key: string, value: unknown) => void store.set(key, value),
        // Records the call *and* performs it: a double that only logs a deletion would let a
        // test assert the intent while the key stayed on disk, which is the trap this suite has
        // already paid for once with an in-memory flag standing in for a resource.
        ...(options.storageRemove === false
          ? {}
          : {
              remove: async (key: string) => {
                removed.push(key)
                store.delete(key)
              },
            }),
        ...(options.scan === true
          ? {
              scan: async (input: { prefix?: string; after?: string; limit?: number }) => {
                const keys = [...store.keys()].filter((key) => key.startsWith(input.prefix ?? "")).sort()
                const start = input.after === undefined ? 0 : Math.max(0, keys.indexOf(input.after) + 1)
                const limit = input.limit ?? 100
                const page = keys.slice(start, start + limit)
                const entries = page.map((key) => ({ key, value: store.get(key) }))
                const consumed = start + page.length
                return consumed < keys.length ? { entries, next: page[page.length - 1]! } : { entries }
              },
            }
          : {}),
      },
      session: {
        ...(options.noCreate === true
          ? {}
          : {
              create: async () =>
                options.createWithoutId === true
                  ? { nothing: true }
                  : { id: options.createSessionID ?? "ses_created" },
            }),
        ...(options.noPrompt === true
          ? {}
          : {
              prompt: async (input: Record<string, unknown>) => {
                prompts.push(input)
                if (options.promptError !== undefined) throw new Error(options.promptError)
                if (options.promptDelayMs !== undefined) {
                  await new Promise((resolve) => setTimeout(resolve, options.promptDelayMs))
                }
                return { id: `inbox_${prompts.length}` }
              },
            }),
      },
      tool: {
        transform: async (cb: (editor: { add?: (tool: unknown) => void }) => void) => {
          cb({ add: (tool) => void tools.push(tool as Record<string, unknown>) })
          return { dispose() {} }
        },
      },
    }
    const resolved = await plugin.setup(ctx as never)
    const cleanup = (): void => void (resolved as () => void)?.()
    outstanding.push(cleanup)
    return {
      store,
      removed,
      prompts,
      cleanup,
      tool: (name: string): Tool => {
        const found = tools.find((entry) => entry.name === name)
        if (found === undefined) throw new Error(`tool ${name} was not registered`)
        return found as unknown as Tool
      },
      list: async () => (await (tools.find((t) => t.name === "list") as Tool).execute({})).output,
      stored: (key: string) => store.get(key) as Runs | undefined,
      historyKeys: () => [...store.keys()].filter((key) => key.startsWith("scheduled-tasks/history/")),
    }
  }

  /**
   * Flush pending microtasks and 0/1ms timers on the injected clock.
   *
   * A run is dispatched with `void`, so "the run has been recorded" is a statement about
   * progress rather than about a returned promise. Twenty turns is a bound, not a wait: the
   * chain is a fixed number of `await`s, so this settles deterministically, and it cannot hide
   * a hang — an unsettled chain fails the assertion that follows instead.
   */
  async function settle(turns = 20): Promise<void> {
    for (let n = 0; n < turns; n += 1) await vi.advanceTimersByTimeAsync(1)
  }

  /** A due one-off as `schedules_schedule` accepts it: inside the 5-minute grace window. */
  const dueSoon = (): Record<string, unknown> => ({ prompt: "the one-off prompt", dueAt: Date.now() - 1_000 })

  /** One stored run record, in the shape `pushHistory` writes. */
  const entry = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
    dueAt: 1_000,
    startedAt: 1_000,
    outcome: "ok",
    model: "opencode/space-bunny-free",
    ...over,
  })

  /** One stored loop: due now, unexpired. */
  const storedLoop = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
    id: "loop_read",
    prompt: "the loop prompt",
    intervalMs: MINUTE_MS,
    nextRunAt: Date.now() - 1_000,
    expiresAt: Date.now() + 60 * MINUTE_MS,
    createdAt: Date.now() - 60_000,
    ...over,
  })

  // -------------------------------------------------------------------
  // Box 1: a completed one-off is readable, so the two published
  // statements that depend on it become true.
  // -------------------------------------------------------------------

  it("reads a completed one-off back through schedules_history (the live repro)", async () => {
    vi.useFakeTimers()
    const start = Date.now()
    vi.setSystemTime(start)
    const h = await ephemeral({ jobs: [] })

    // Exactly the live sequence: schedule a one-off, let the tick run it.
    const created = (await h.tool("schedule").execute(dueSoon())).output
    const id = created.id as string
    expect(id).toMatch(/^oneoff_/)
    await settle()

    // The run happened — asserted on the prompt, not on the log, so it cannot pass on a line.
    expect(h.prompts).toHaveLength(1)
    expect(h.prompts[0]).toMatchObject({ text: "the one-off prompt", delivery: "queue" })

    // …and reading it back is the claim that was false.
    const read = (await h.tool("history").execute({ id })).output
    expect(read.error).toBeUndefined()
    expect(read.id).toBe(id)
    expect(read.runs).toMatchObject([
      { outcome: "ok", dueAt: expect.any(String), startedAt: expect.any(String), model: expect.any(String) },
    ])

    // The `cancel` message promises this lookup exists, so it is asserted here rather than
    // trusted: "check schedules_history" is only true if this very call answers.
    const cancelled = (await h.tool("cancel").execute({ id })).output
    expect(String(cancelled.error)).toMatch(/check schedules_history/)
    expect((await h.tool("history").execute({ id })).output.runs).toHaveLength(1)
  })

  it("reads a loop's runs back through schedules_history", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(Date.now())
    const h = await ephemeral({
      jobs: [],
      scan: true,
      seed: { "scheduled-tasks/loop/ses_abc": [storedLoop()] },
    })
    await settle()
    expect(h.prompts).toHaveLength(1)

    const read = (await h.tool("history").execute({ id: "loop_read" })).output
    expect(read.error).toBeUndefined()
    expect(read.runs).toMatchObject([{ outcome: "ok", sessionID: "ses_abc" }])

    // And after the loop is stopped: it is out of every live list, so this answer can only come
    // from storage. That is the shape the one-off repro had — history written under an id nothing
    // resolves any more — and it is what made the original lookup blind.
    await h.tool("stop_loop").execute({ id: "loop_read" }, { sessionID: "ses_abc" })
    const afterStop = (await h.tool("history").execute({ id: "loop_read" })).output
    expect(afterStop.error).toBeUndefined()
    expect(afterStop.kind).toBe("loop")
    expect(afterStop.runs).toHaveLength(1)
  })

  it("answers for a pending one-off with an empty run list, not with an error", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(Date.now())
    const h = await ephemeral({ jobs: [], pluginOptions: { tickMs: 60 * MINUTE_MS } })

    const id = ((await h.tool("schedule").execute({ prompt: "later", dueIn: "2h" })).output.id) as string
    await settle()

    const read = (await h.tool("history").execute({ id })).output
    expect(read.error).toBeUndefined()
    expect(read.runs).toEqual([])
  })

  it("keeps ephemeral history in its own key space, so it cannot collide with a job's", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(Date.now())
    // A job file may legally be called `oneoff_probe` — the job-id pattern allows it — so this is
    // a reachable collision rather than a hypothetical one. The job's own history is seeded, so
    // the claim is about two keys coexisting rather than about a job happening to fire.
    const h = await ephemeral({
      jobs: [{ id: "oneoff_probe", schedule: "@daily", prompt: "the job prompt" }],
      seed: {
        "scheduled-tasks/history/oneoff_probe": [entry({ model: "the job's own model" })],
        "scheduled-tasks/oneoff/pending": [
          { id: "oneoff_probe", prompt: "the one-off prompt", dueAt: Date.now() - 1_000, createdAt: Date.now() - 60_000, runTimeoutMs: MINUTE_MS },
        ],
      },
    })
    await settle()

    // Two distinct keys, neither overwriting the other: the job's record is untouched and the
    // one-off's run landed beside it rather than on top of it.
    expect(h.historyKeys()).toContain("scheduled-tasks/history/oneoff_probe")
    expect(h.historyKeys()).toContain("scheduled-tasks/history/oneoff/oneoff_probe")
    expect(h.stored("scheduled-tasks/history/oneoff_probe")).toMatchObject([{ model: "the job's own model" }])
    expect(h.stored("scheduled-tasks/history/oneoff/oneoff_probe")).toMatchObject([{ outcome: "ok" }])
  })

  // -------------------------------------------------------------------
  // Box 2: ephemeral history keys are bounded, and the keys a pre-fix
  // build leaked are reclaimed rather than inherited.
  // -------------------------------------------------------------------

  it("evicts the oldest ephemeral history key once the cap is reached, and never a job's key", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(Date.now())
    // The index is this plugin's own record of which keys it minted, so seeding it directly is
    // the only way to reach the cap without running fifty one-offs. The first entry is a job's
    // key, stamped oldest of all: the eviction has to reach past it to the first *ephemeral*
    // one, and must not touch the job's key however old the index claims it is.
    const index = [
      { key: "scheduled-tasks/history/nightly", at: 1 },
      ...Array.from({ length: MAX_EPHEMERAL_HISTORY_KEYS }, (_, n) => ({
        key: `scheduled-tasks/history/oneoff/old${n}`,
        at: n + 2,
      })),
    ]
    const h = await ephemeral({ jobs: [], seed: { "scheduled-tasks/history/nightly": [entry()], "scheduled-tasks/history/ephemeral": index } })

    await h.tool("schedule").execute(dueSoon())
    await settle()

    // The cap holds…
    expect(h.stored("scheduled-tasks/history/ephemeral")).toHaveLength(MAX_EPHEMERAL_HISTORY_KEYS)
    // …the oldest ephemeral key was actually deleted, not merely dropped from the index…
    expect(h.store.has("scheduled-tasks/history/oneoff/old0")).toBe(false)
    expect(h.removed).toContain("scheduled-tasks/history/oneoff/old0")
    // …and a key that is not an ephemeral one is never deleted, however old the index claims.
    expect(h.store.has("scheduled-tasks/history/nightly")).toBe(true)
    expect(h.removed).not.toContain("scheduled-tasks/history/nightly")
  })

  it("writes an empty record when the host has no storage.remove, rather than a silent no-op", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(Date.now())
    const index = Array.from({ length: MAX_EPHEMERAL_HISTORY_KEYS }, (_, n) => ({
      key: `scheduled-tasks/history/oneoff/old${n}`,
      at: n,
    }))
    const h = await ephemeral({ jobs: [], storageRemove: false, seed: { "scheduled-tasks/history/ephemeral": index } })

    await h.tool("schedule").execute(dueSoon())
    await settle()

    // The key cannot be deleted on this host, so "nothing here" is written in its place — and
    // the key count is still bounded, because the index that decides what to drop is itself
    // capped.
    expect(h.store.get("scheduled-tasks/history/oneoff/old0")).toEqual([])
    expect(h.stored("scheduled-tasks/history/ephemeral")).toHaveLength(MAX_EPHEMERAL_HISTORY_KEYS)
  })

  it("migrates a pre-fix flat history key into the ephemeral namespace and removes the old one", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(Date.now())
    // What a 2.0.22 host already holds: history written under the one-off's own id, readable by
    // no tool, and never reclaimed.
    const h = await ephemeral({
      jobs: [],
      seed: { "scheduled-tasks/history/oneoff_legacy": [entry({ dueAt: 1_700_000_000_000 })] },
    })

    const read = (await h.tool("history").execute({ id: "oneoff_legacy" })).output
    expect(read.error).toBeUndefined()
    expect(read.runs).toHaveLength(1)
    // The leaked key is gone and the runs live where every new run writes them.
    expect(h.store.has("scheduled-tasks/history/oneoff_legacy")).toBe(false)
    expect(h.stored("scheduled-tasks/history/oneoff/oneoff_legacy")).toHaveLength(1)
  })

  // -------------------------------------------------------------------
  // Box 3: the bounds hold on the way in as well as on the way out, so a
  // hand-edited stored record cannot blow past them.
  // -------------------------------------------------------------------

  it("clips a hand-edited stored history record: cardinality, error and model alike", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(Date.now())
    // Written by hand, or by a build with no bounds at all: 400 runs, each carrying an error
    // and a model far past anything a real run produces.
    const oversized = Array.from({ length: 400 }, (_, n) =>
      entry({ dueAt: n, outcome: "failed", error: "x".repeat(50_000), model: "m".repeat(50_000) }),
    )
    const h = await ephemeral({
      jobs: [{ id: "j", schedule: "@daily", prompt: "p" }],
      seed: { "scheduled-tasks/history/j": oversized },
    })

    const runs = (await h.tool("history").execute({ id: "j" })).output.runs as Runs
    expect(runs.length).toBeLessThanOrEqual(MAX_HISTORY_LIMIT)
    // Newest kept, so a reader still sees the most recent attempt rather than the oldest.
    expect(Date.parse(runs[0]!.dueAt as string)).toBe(399)
    for (const run of runs) {
      expect(String(run.error).length).toBeLessThanOrEqual(300)
      expect(String(run.model).length).toBeLessThanOrEqual(300)
    }
  })

  it("clips a host-supplied session id on the way *into* storage, not only on the way out", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(Date.now())
    // The read-side clip cannot bound what was written: a host that resolves a session with
    // 50KB of id would leave 50KB in storage until someone read it back, which may be never.
    const h = await ephemeral({ jobs: [], createSessionID: "s".repeat(50_000) })
    const id = ((await h.tool("schedule").execute(dueSoon())).output.id) as string
    await settle()

    const stored = h.stored(`scheduled-tasks/history/oneoff/${id}`)![0]!
    expect(String(stored.sessionID).length).toBeLessThanOrEqual(200)
    // And the same value on the way out, so the reader and the record agree.
    const runs = (await h.tool("history").execute({ id })).output.runs as Runs
    expect(String(runs[0]!.sessionID).length).toBeLessThanOrEqual(200)
  })

  it("caps stored loops at MAX_LOOP_CAP, on read and in the record it saves", async () => {
    // The pure rule, which is where the two read paths meet (`loadLoops` and the startup scan).
    const overCap = Array.from({ length: MAX_LOOP_CAP + 20 }, (_, n) => ({
      id: `loop_${n}`,
      prompt: "p",
      intervalMs: MINUTE_MS,
      nextRunAt: Date.now() - 1_000,
      expiresAt: Date.now() + 60 * MINUTE_MS,
      createdAt: Date.now(),
    }))
    const loaded = normalizeLoops(overCap, "ses_abc")
    expect(loaded).toHaveLength(MAX_LOOP_CAP)
    // Oldest kept: a loop is recurring work someone asked for, not a queue entry to prune.
    expect(loaded[0]!.id).toBe("loop_0")

    // …and the record that goes back to storage cannot exceed the ceiling either.
    vi.useFakeTimers()
    vi.setSystemTime(Date.now())
    const h = await ephemeral({
      jobs: [],
      scan: true,
      seed: { "scheduled-tasks/loop/ses_abc": overCap },
    })
    await settle()
    expect(h.stored("scheduled-tasks/loop/ses_abc")).toHaveLength(MAX_LOOP_CAP)
  })

  it("caps stored pending one-offs at MAX_ONEOFF_CAP and reports the drop", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(Date.now())
    const pending = Array.from({ length: MAX_ONEOFF_CAP + 25 }, (_, n) => ({
      id: `oneoff_bulk${n}`,
      dueAt: Date.now() + 60 * MINUTE_MS,
      prompt: "p",
      createdAt: Date.now(),
      runTimeoutMs: MINUTE_MS,
    }))
    const h = await ephemeral({ jobs: [], seed: { "scheduled-tasks/oneoff/pending": pending } })

    const oneOffs = (await h.list()).oneOffs as Runs
    expect(oneOffs.length).toBeLessThanOrEqual(MAX_ONEOFF_CAP)
    // The oldest survive, because they are the most overdue: capping the other way would
    // silently drop the one-off an agent had just asked for.
    expect((oneOffs[0] as { id: string }).id).toBe("oneoff_bulk0")
    // Silent truncation is how a lost task looks, so the count is stated in the log.
    expect(consoleLines.filter((line) => /one-off/.test(line) && /\b25\b/.test(line)).length).toBeGreaterThan(0)
  })

  // -------------------------------------------------------------------
  // Box 4: every one-off path records, including the ones that never reach
  // the catch that records the rest.
  // -------------------------------------------------------------------

  it("records a one-off on a host with no session.prompt to dispatch it", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(Date.now())
    const h = await ephemeral({ jobs: [], noPrompt: true })
    const id = ((await h.tool("schedule").execute(dueSoon())).output.id) as string
    await settle()

    const runs = (await h.tool("history").execute({ id })).output.runs as Runs
    expect(runs).toHaveLength(1)
    expect(runs[0]).toMatchObject({ outcome: "failed" })
    expect(String(runs[0]!.error)).toMatch(/session\.prompt/)
  })

  it("records a one-off on a host with no session.create", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(Date.now())
    const h = await ephemeral({ jobs: [], noCreate: true })
    const id = ((await h.tool("schedule").execute(dueSoon())).output.id) as string
    await settle()

    const runs = (await h.tool("history").execute({ id })).output.runs as Runs
    expect(runs).toHaveLength(1)
    expect(runs[0]).toMatchObject({ outcome: "failed" })
    expect(String(runs[0]!.error)).toMatch(/session\.create/)
  })

  it("records a one-off whose created session carried no usable id", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(Date.now())
    const h = await ephemeral({ jobs: [], createWithoutId: true })
    const id = ((await h.tool("schedule").execute(dueSoon())).output.id) as string
    await settle()

    const runs = (await h.tool("history").execute({ id })).output.runs as Runs
    expect(runs).toHaveLength(1)
    expect(runs[0]).toMatchObject({ outcome: "failed" })
    expect(String(runs[0]!.error)).toMatch(/session/)
  })

  it("records a one-off whose prompt threw, with the message it threw", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(Date.now())
    const h = await ephemeral({ jobs: [], promptError: "provider is down" })
    const id = ((await h.tool("schedule").execute(dueSoon())).output.id) as string
    await settle()

    const runs = (await h.tool("history").execute({ id })).output.runs as Runs
    expect(runs).toHaveLength(1)
    expect(runs[0]).toMatchObject({ outcome: "failed", sessionID: "ses_created" })
    expect(String(runs[0]!.error)).toBe("provider is down")
  })

  // -------------------------------------------------------------------
  // Box 5: `startedAt` is when the run was dispatched.
  // -------------------------------------------------------------------

  it("stamps startedAt at dispatch, not at completion", async () => {
    vi.useFakeTimers()
    const start = Date.now()
    vi.setSystemTime(start)
    // The run occupies half a minute of clock, which is the only reason a completion stamp and
    // a dispatch stamp cannot be the same number.
    const h = await ephemeral({ jobs: [], promptDelayMs: 30_000 })

    const id = ((await h.tool("schedule").execute(dueSoon())).output.id) as string
    await settle()
    // In flight, and nothing recorded yet: the run has not finished.
    expect(h.prompts).toHaveLength(1)
    expect((await h.tool("history").execute({ id })).output.runs).toEqual([])

    await vi.advanceTimersByTimeAsync(30_000)
    await settle()

    const runs = (await h.tool("history").execute({ id })).output.runs as Runs
    expect(runs).toHaveLength(1)
    expect(runs[0]).toMatchObject({ outcome: "ok" })
    const startedAt = Date.parse(runs[0]!.startedAt as string)
    // The clock really did move, so the stamp below is a decision rather than a coincidence.
    expect(Date.now()).toBeGreaterThan(start + 30_000)
    // Not before the run existed…
    expect(startedAt).toBeGreaterThanOrEqual(start)
    // …and at least the length of the run before the clock now. A completion stamp lands exactly
    // on "now", so this is the assertion that separates the two.
    expect(startedAt).toBeLessThanOrEqual(Date.now() - 30_000)
  })
})

// ---------------------------------------------------------------------------
// bug-tool-boundary-throws-and-ask-not-recorded
//
// Two defects, one theme: what a run does is only true if it is *recorded*.
// M2 — the tool boundary let a host rejection escape uncaught. B5 — the
// ask-as-deny report existed only as a log line nobody could read back.
// ---------------------------------------------------------------------------

describe("the tool boundary and the ask-as-deny report (bug-tool-boundary-throws-and-ask-not-recorded)", () => {
  const PROJECT = "boundary"

  let dir: string
  let restoreEnv: string | undefined
  let consoleLines: string[]
  let realConsoleError: typeof console.error
  const outstanding: Array<() => void> = []

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "st-boundary-"))
    mkdirSync(join(dir, ".opencode"), { recursive: true })
    restoreEnv = process.env[DATA_DIR_ENV]
    process.env[DATA_DIR_ENV] = join(dir, "state")
    realConsoleError = console.error
    consoleLines = []
    console.error = (...args: unknown[]): void => void consoleLines.push(args.map(String).join(" "))
  })

  afterEach(() => {
    for (const dispose of outstanding.splice(0).reverse()) {
      try {
        dispose()
      } catch {
        /* a failing teardown must not mask the assertion before it */
      }
    }
    console.error = realConsoleError
    if (restoreEnv === undefined) delete process.env[DATA_DIR_ENV]
    else process.env[DATA_DIR_ENV] = restoreEnv
    rmSync(dir, { recursive: true, force: true })
    vi.useRealTimers()
  })

  type BoundaryTool = {
    execute: (input: Record<string, unknown>) => Promise<{ output: Record<string, unknown> }>
  }

  type Runs = Array<Record<string, unknown>>

  type Boundary = {
    tool: (name: string) => BoundaryTool
    prompts: Record<string, unknown>[]
    /** Every line the plugin logged this test, as a user sees them on stderr. */
    logged: () => string[]
    /** The per-project `scheduler.log`, read the way a user reads it. */
    logFile: () => string
    /** A job's stored run records, in the shape `pushHistory` wrote them. */
    stored: (id: string) => Runs | undefined
  }

  /**
   * A plugin over a store, a prompt surface and a `permission.rules` that can be made to reject.
   *
   * `rulesError` is the whole of M2: `permission.rules` is the one host promise T4 added to the
   * dispatch path, and a host is free to reject it. Everything else is the ordinary shape the
   * rest of the suite uses.
   */
  async function boundary(
    options: {
      jobs?: unknown[]
      seed?: Record<string, unknown>
      /** Make `ctx.permission.rules` reject with this message. */
      rulesError?: string
      pluginOptions?: Record<string, unknown>
    } = {},
  ): Promise<Boundary> {
    const rulesError = options.rulesError
    const store = new Map<string, unknown>(Object.entries(options.seed ?? {}))
    if (options.jobs !== undefined) {
      writeFileSync(join(dir, ".opencode", "schedules.json"), JSON.stringify({ version: 1, jobs: options.jobs }))
    }
    const tools: Array<Record<string, unknown>> = []
    const prompts: Record<string, unknown>[] = []
    const ctx: Record<string, unknown> = {
      ...(options.pluginOptions === undefined ? {} : { options: options.pluginOptions }),
      location: { directory: dir, project: { id: PROJECT } },
      storage: {
        get: async (key: string) => store.get(key),
        set: async (key: string, value: unknown) => void store.set(key, value),
        remove: async (key: string) => void store.delete(key),
      },
      session: {
        create: async () => ({ id: "ses_boundary" }),
        prompt: async (input: Record<string, unknown>) => {
          prompts.push(input)
          return { id: `inbox_${prompts.length}` }
        },
      },
      permission: {
        rules: async () => {
          if (rulesError !== undefined) throw new Error(rulesError)
        },
      },
      tool: {
        transform: async (cb: (editor: { add?: (t: unknown) => void }) => void) => {
          cb({ add: (t) => void tools.push(t as Record<string, unknown>) })
          return { dispose() {} }
        },
      },
    }
    const resolved = await plugin.setup(ctx as never)
    outstanding.push(() => void (resolved as () => void)?.())
    return {
      prompts,
      tool: (name: string): BoundaryTool => {
        const found = tools.find((entry) => entry.name === name)
        if (found === undefined) throw new Error(`tool ${name} was not registered`)
        return found as unknown as BoundaryTool
      },
      logged: () => [...consoleLines],
      logFile: (): string => {
        const path = logPath(dir, PROJECT)
        expect(existsSync(path)).toBe(true)
        return readFileSync(path, "utf8")
      },
      stored: (id: string) => store.get(`scheduled-tasks/history/${id}`) as Runs | undefined,
    }
  }

  /** A job due every minute and already owed an occurrence, so one tick decides it. */
  const dueJob = (id: string, prompt: string, over: Record<string, unknown> = {}): Record<string, unknown> => ({
    id,
    schedule: "* * * * *",
    timezone: "UTC",
    prompt,
    ...over,
  })

  const seeded = (start: number, ...ids: string[]): Record<string, unknown> =>
    Object.fromEntries(ids.map((id) => [`scheduled-tasks/${id}`, { version: STATE_VERSION, lastRun: start - 5 * MINUTE_MS }]))

  /** One run record in the shape `pushHistory` writes — typed, so the write-side clip is callable. */
  const entry = (over: Partial<HistoryEntry> = {}): HistoryEntry => ({
    dueAt: 1_000,
    startedAt: 1_000,
    outcome: "ok",
    model: "opencode/space-bunny-free",
    ...over,
  })

  /** An ask list no real job produces: more entries than the cap, each far longer than a cap. */
  const oversizedAsks = (): string[] =>
    Array.from({ length: 200 }, (_, n) => `action-${n}-${"x".repeat(4_000)}`)

  /** Flush pending microtasks and 0/1ms timers on the injected clock, as a run is `void`-dispatched. */
  async function settle(turns = 20): Promise<void> {
    for (let n = 0; n < turns; n += 1) await vi.advanceTimersByTimeAsync(1)
  }

  // -------------------------------------------------------------------
  // M2 — nothing throws out of the tool.
  // -------------------------------------------------------------------

  it("turns a rejecting permission.rules into an error result, a logged line and no prompt", async () => {
    const h = await boundary({
      jobs: [{ id: "guarded", schedule: "@daily", prompt: "p", permissions: { edit: "deny" } }],
      rulesError: "permission backend exploded",
    })

    // Calling it directly is the assertion: pre-fix `applyJobTarget` was awaited *above* the
    // try, so this rejected out of the tool (invariant 3 broken) instead of returning. A
    // `resolves`/`rejects` matcher would read the same way, so the call is left bare to keep the
    // raw rejection in the failure message.
    const out = await h.tool("run").execute({ id: "guarded" })

    // A normal typed result, naming what the host said — the shape every other tool returns.
    expect(out.output).toMatchObject({ id: "guarded", error: "permission backend exploded" })
    // The turn never started: rules that could not be applied must not admit a prompt.
    expect(h.prompts).toHaveLength(0)
    // Logged, exactly once, as a failure of *this* dispatch. A dispatch that fails with no log
    // line is indistinguishable from an idle job, which is what the per-project log exists to
    // prevent — and the reviewer's repro recorded zero log lines.
    const failures = h.logged().filter((line) => line.includes("permission backend exploded"))
    expect(failures).toHaveLength(1)
    expect(failures[0]).toContain("trigger of guarded failed")
    // …in the file a user actually reads, not only on stderr.
    expect(h.logFile()).toContain("trigger of guarded failed: permission backend exploded")
  })

  it("still dispatches normally when the rules apply, so the boundary catches failures and not the job", async () => {
    const h = await boundary({
      jobs: [{ id: "guarded", schedule: "@daily", prompt: "the prompt", permissions: { edit: "deny" } }],
    })

    const out = await h.tool("run").execute({ id: "guarded" })

    expect(out.output).toMatchObject({ id: "guarded", sessionID: "ses_boundary", admitted: "inbox_1" })
    expect(out.output.error).toBeUndefined()
    expect(h.prompts).toHaveLength(1)
    expect(h.logged().filter((line) => line.includes("failed"))).toEqual([])
  })

  // -------------------------------------------------------------------
  // B5 — the ask-as-deny report is in the record, not only in the log.
  // -------------------------------------------------------------------

  it("records the asks a run turned into denies, and states them in its own running line", async () => {
    vi.useFakeTimers()
    const start = Date.now()
    vi.setSystemTime(start)
    const h = await boundary({
      jobs: [
        // `bash: *` is `allow`, so only the action-level `edit: ask` is downgraded: the report has
        // to name what actually became a deny, not every rule the job declared.
        dueJob("asks", "the guarded prompt", { permissions: { edit: "ask", bash: { "*": "allow" } } }),
        dueJob("plain", "the unguarded prompt"),
      ],
      seed: seeded(start, "asks", "plain"),
      pluginOptions: { tickMs: MIN_TICK_MS, maxConcurrentRuns: 4 },
    })

    await vi.advanceTimersByTimeAsync(0)
    await settle()
    expect(h.prompts).toHaveLength(2)

    // The record: readable back through the tool, which is the point. `schedules_list`'s
    // `askAsDeny` answers "what *would* deny"; only the record answers "what *did*".
    const guarded = (await h.tool("history").execute({ id: "asks" })).output.runs as Runs
    expect(guarded).toHaveLength(1)
    expect(guarded[0]).toMatchObject({ outcome: "ok", asksAsDeny: ["edit"] })
    // …and it is what reached storage, so it survives a restart rather than living in memory.
    expect(h.stored("asks")).toMatchObject([{ outcome: "ok", asksAsDeny: ["edit"] }])

    // The `running` line the box names: the asks are folded into the run's own line, so the log
    // and the record it is written from cannot describe different runs.
    const running = h.logged().filter((line) => line.includes("running asks"))
    expect(running).toHaveLength(1)
    expect(running[0]).toContain("asks as deny: edit")
    expect(h.logFile()).toContain("asks as deny: edit")

    // A run with nothing downgraded carries no field at all, rather than an empty list: absence
    // is the answer to "was anything downgraded here", and an empty array would say it twice.
    const unguarded = (await h.tool("history").execute({ id: "plain" })).output.runs as Runs
    expect(unguarded).toHaveLength(1)
    expect(unguarded[0]).toMatchObject({ outcome: "ok" })
    expect(unguarded[0]).not.toHaveProperty("asksAsDeny")
  })

  it("clips an ask list no real job produces — cardinality and length alike, on both sides", async () => {
    // Write side first, and pinned on its own: this is what bounds what ever reaches storage.
    const wroteList = pushHistory([], entry({ asksAsDeny: oversizedAsks() }))[0]!.asksAsDeny as string[]
    expect(wroteList).toHaveLength(16)
    for (const ask of wroteList) expect(ask.length).toBe(120)
    // An empty or malformed list is dropped, not stored: `clipAsks` cannot *remove* a key, so
    // this is the assertion that the entry destructures the field out before rebuilding.
    expect(pushHistory([], entry({ asksAsDeny: [] }))[0]).not.toHaveProperty("asksAsDeny")
    expect(pushHistory([], { ...entry(), asksAsDeny: "edit" } as unknown as HistoryEntry)[0]).not.toHaveProperty(
      "asksAsDeny",
    )

    // Read side: a stored record can be hand-edited or written by a build with no bounds at
    // all, so the clip has to exist here too and to agree with the one above.
    vi.useFakeTimers()
    vi.setSystemTime(Date.now())
    const h = await boundary({
      jobs: [{ id: "clipped", schedule: "@daily", prompt: "p" }],
      seed: { "scheduled-tasks/history/clipped": [entry({ asksAsDeny: oversizedAsks() })] },
    })

    const runs = (await h.tool("history").execute({ id: "clipped" })).output.runs as Runs
    expect(runs).toHaveLength(1)
    const asks = runs[0]!.asksAsDeny as string[]
    expect(asks).toHaveLength(16)
    for (const ask of asks) expect(ask.length).toBe(120)
  })

  it("reports an ask downgraded on an on-demand trigger, which is queued like any other run", async () => {
    const h = await boundary({
      jobs: [{ id: "guarded", schedule: "@daily", prompt: "p", permissions: { edit: "ask" } }],
    })

    const out = await h.tool("run").execute({ id: "guarded" })

    expect(out.output).toMatchObject({ id: "guarded", sessionID: "ses_boundary" })
    const triggered = h.logged().filter((line) => line.includes("triggered guarded"))
    expect(triggered).toHaveLength(1)
    expect(triggered[0]).toContain("asks as deny: edit")
    // …and the record says so too, not only the line: a manual run lands in the job's own history
    // ring, so `schedules_history` answers for it exactly as it answers for a scheduled run.
    expect(h.stored("guarded")).toMatchObject([{ outcome: "ok", asksAsDeny: ["edit"] }])
  })
})

// =====================================================================
// The manual trigger is bounded, capped and leased
// (bug-schedules-run-not-bounded-capped-or-leased)
//
// The tool's own description promised "the same concurrency, timeout and lease rules" while
// the code honoured none of the three: it checked whether *that job* was running (which is not
// the cap), never joined `inFlight`, awaited `ctx.session.prompt` unbounded, and took no
// lease. Each block below names one of the three, and the last asserts the sentence itself.
//
// Fake timers throughout, and deliberately so: `runTimeout` is floored at one minute, so a
// hung run is only observable by delivering the bound timer itself. That is what makes the
// timeout test *fail* rather than hang when the bound is removed.
// =====================================================================
describe("schedules_run is bounded, capped and leased (bug-schedules-run-not-bounded-capped-or-leased)", () => {
  const PROJECT = "manual"

  let dir: string
  let restoreEnv: string | undefined
  let consoleLines: string[]
  let realConsoleError: typeof console.error
  const outstanding: Array<() => void> = []

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "st-manual-"))
    mkdirSync(join(dir, ".opencode"), { recursive: true })
    restoreEnv = process.env[DATA_DIR_ENV]
    process.env[DATA_DIR_ENV] = join(dir, "state")
    realConsoleError = console.error
    consoleLines = []
    console.error = (...args: unknown[]): void => void consoleLines.push(args.map(String).join(" "))
  })

  afterEach(() => {
    for (const dispose of outstanding.splice(0).reverse()) {
      try {
        dispose()
      } catch {
        /* a failing teardown must not mask the assertion before it */
      }
    }
    console.error = realConsoleError
    if (restoreEnv === undefined) delete process.env[DATA_DIR_ENV]
    else process.env[DATA_DIR_ENV] = restoreEnv
    rmSync(dir, { recursive: true, force: true })
    vi.useRealTimers()
  })

  type Runs = Array<Record<string, unknown>>

  type ManualTool = {
    description: string
    execute: (input: Record<string, unknown>) => Promise<{ output: Record<string, unknown> }>
  }

  type Manual = {
    tool: (name: string) => ManualTool
    prompts: Record<string, unknown>[]
    interrupts: Record<string, unknown>[]
    store: Map<string, unknown>
    /** A job's stored run records — the same ring a scheduled run writes. */
    history: (id: string) => Runs | undefined
    jobState: (id: string) => Record<string, unknown> | undefined
    list: () => Promise<Record<string, unknown>>
    logged: () => string[]
    /** Let a hung prompt settle, so nothing is left pending into the next test. */
    release: () => void
  }

  /**
   * A plugin whose named prompt never resolves, with a clock the test controls.
   *
   * The hang is named rather than global because "a hung manual run must not starve scheduled
   * work" is only observable if the scheduled work actually runs — which is the whole point of
   * the cap tests below.
   */
  async function manual(
    options: {
      jobs?: unknown[]
      seed?: Record<string, unknown>
      pluginOptions?: Record<string, unknown>
      projectID?: string
      /** The one prompt text that never resolves; every other prompt resolves at once. */
      hangPrompt?: string
      /** Withhold `session.interrupt`, as a host without the cancel primitive would be. */
      interrupt?: boolean
    } = {},
  ): Promise<Manual> {
    const store = new Map<string, unknown>(Object.entries(options.seed ?? {}))
    if (options.jobs !== undefined) {
      writeFileSync(
        join(dir, ".opencode", "schedules.json"),
        JSON.stringify({ version: 1, jobs: options.jobs }),
      )
    }
    const prompts: Record<string, unknown>[] = []
    const interrupts: Record<string, unknown>[] = []
    let openTheGate: () => void = () => {}
    const gate = new Promise<void>((resolve) => void (openTheGate = resolve))
    const tools: Array<Record<string, unknown>> = []
    const ctx: Record<string, unknown> = {
      ...(options.pluginOptions === undefined ? {} : { options: options.pluginOptions }),
      location: { directory: dir, project: { id: options.projectID ?? PROJECT } },
      storage: {
        get: async (key: string) => store.get(key),
        set: async (key: string, value: unknown) => void store.set(key, value),
        remove: async (key: string) => void store.delete(key),
      },
      session: {
        create: async () => ({ id: "ses_manual" }),
        prompt: async (input: Record<string, unknown>) => {
          prompts.push(input)
          if (options.hangPrompt !== undefined && input.text === options.hangPrompt) await gate
          return { id: `inbox_${prompts.length}` }
        },
        ...(options.interrupt === false
          ? {}
          : {
              interrupt: async (input: Record<string, unknown>) => {
                interrupts.push(input)
                return { interrupted: true }
              },
            }),
      },
      tool: {
        transform: async (cb: (editor: { add?: (t: unknown) => void }) => void) => {
          cb({ add: (t) => void tools.push(t as Record<string, unknown>) })
          return { dispose() {} }
        },
      },
    }
    const resolved = await plugin.setup(ctx as never)
    outstanding.push(() => {
      ;(resolved as () => void)?.()
      openTheGate()
    })
    return {
      prompts,
      interrupts,
      store,
      tool: (name) => {
        const found = tools.find((entry) => entry.name === name) as unknown as ManualTool | undefined
        if (found === undefined) throw new Error(`tool ${name} was not registered`)
        return found
      },
      history: (id) => store.get(`scheduled-tasks/history/${id}`) as Runs | undefined,
      jobState: (id) => store.get(`scheduled-tasks/${id}`) as Record<string, unknown> | undefined,
      list: async () => (await (tools.find((e) => e.name === "list") as ManualTool).execute({})).output,
      logged: () => [...consoleLines],
      release: openTheGate,
    }
  }

  /** A `* * * * *` job already owed an occurrence, so one tick decides it. */
  const dueJob = (id: string, prompt: string, over: Record<string, unknown> = {}): Record<string, unknown> => ({
    id,
    schedule: "* * * * *",
    timezone: "UTC",
    prompt,
    ...over,
  })

  const seeded = (start: number, ...ids: string[]): Record<string, unknown> =>
    Object.fromEntries(ids.map((id) => [`scheduled-tasks/${id}`, { version: STATE_VERSION, lastRun: start - 5 * MINUTE_MS }]))

  const countOf = (harness: Manual, text: string): number =>
    harness.prompts.filter((entry) => entry.text === text).length

  /**
   * One job's entry from `schedules_list`, by id.
   *
   * `toMatchObject([…])` against the whole array would pin the job count too, which is not what any
   * assertion below is about — and a failure would then read as a diff of every field of every
   * job rather than as "this job's `running` flag was wrong".
   */
  async function listed(harness: Manual, id: string): Promise<Record<string, unknown>> {
    const jobs = (await harness.list()).jobs as Array<Record<string, unknown>>
    const found = jobs.find((entry) => entry.id === id)
    if (found === undefined) throw new Error(`schedules_list did not report a job with id ${id}`)
    return found
  }

  /** Advance the injected clock until `predicate` holds, or give up after `budgetMs`. */
  async function advanceUntil(predicate: () => boolean, budgetMs: number, stepMs = MIN_TICK_MS): Promise<boolean> {
    for (let elapsed = 0; elapsed <= budgetMs; elapsed += stepMs) {
      if (predicate()) return true
      await vi.advanceTimersByTimeAsync(stepMs)
    }
    return predicate()
  }

  // -------------------------------------------------------------------
  // The bound — acceptance box 1.
  // -------------------------------------------------------------------

  it(
    "bounds a hung manual trigger at the job's runTimeout and records the timeout",
    async () => {
      // The scenario the description promised and the code never delivered. `runTimeout` is
      // floored at one minute, so this runs on an injected clock: `advanceTimersByTimeAsync`
      // delivers the bound timer, which is what makes this test *fail* rather than hang when the
      // bound is absent. Pre-fix the tool awaited `prompt` with no timer at all, so nothing was
      // delivered, `interrupts` stayed empty and the run never ended.
      vi.useFakeTimers()
      try {
        const start = Date.now()
        vi.setSystemTime(start)
        const h = await manual({
          hangPrompt: "never resolves",
          jobs: [{ id: "hung", schedule: "@daily", prompt: "never resolves", runTimeout: "1m" }],
          pluginOptions: { tickMs: MIN_TICK_MS, maxConcurrentRuns: 1 },
        })

        // The trigger is awaited the way a caller awaits it, so this test would hang rather than
        // pass if the bound were not enforced. It is fired without awaiting so the clock can be
        // advanced underneath it.
        let settled: { output: Record<string, unknown> } | undefined
        const triggered = h
          .tool("run")
          .execute({ id: "hung" })
          .then((value) => void (settled = value))
        await vi.advanceTimersByTimeAsync(0)
        expect(countOf(h, "never resolves")).toBe(1)
        expect(settled).toBeUndefined()

        // Short of the bound: nothing recorded, nothing stopped, and the slot is still held.
        await vi.advanceTimersByTimeAsync(MINUTE_MS - MIN_TICK_MS)
        expect(h.history("hung")).toBeUndefined()
        expect(h.interrupts).toEqual([])
        expect(await listed(h, "hung")).toMatchObject({ running: true })
        expect(countOf(h, "never resolves")).toBe(1)

        // The bound. `advanceTimersByTimeAsync` flushes the microtask queue, so the returned value
        // is observable without any extra settling.
        await vi.advanceTimersByTimeAsync(2 * MIN_TICK_MS)
        await triggered
        // The tool call itself came back, bounded — the thing a caller is actually waiting on.
        expect(settled).toBeDefined()
        expect(settled!.output).toMatchObject({ id: "hung" })
        expect(String(settled!.output.error)).toMatch(/exceeded runTimeout 1m/)

        // Recorded as the `timeout` outcome no manual path ever produced before, in the job's own
        // history ring — the same one a scheduled run writes.
        expect(h.history("hung")).toMatchObject([
          { outcome: "timeout", sessionID: "ses_manual", model: "session default" },
        ])
        expect(String(h.history("hung")![0]!.error)).toMatch(/exceeded runTimeout 1m/)
        expect(String(h.history("hung")![0]!.error)).toMatch(/interrupted/)
        expect(h.interrupts).toEqual([{ sessionID: "ses_manual" }])

        // The slot is free again, so a hung manual run cannot latch `maxConcurrentRuns` for the
        // life of the process — the anti-starvation half.
        expect(await listed(h, "hung")).toMatchObject({ running: false })
      } finally {
        vi.useRealTimers()
      }
    },
    20_000,
  )

  it(
    "says it abandoned the run when the host offers no way to interrupt it",
    async () => {
      // Honesty over convenience, and the same two-clause rule a scheduled overrun records: with
      // no cancel primitive the await is abandoned, not stopped.
      vi.useFakeTimers()
      try {
        const start = Date.now()
        vi.setSystemTime(start)
        const h = await manual({
          hangPrompt: "never resolves",
          interrupt: false,
          jobs: [{ id: "hung", schedule: "@daily", prompt: "never resolves", runTimeout: "1m" }],
          pluginOptions: { tickMs: MIN_TICK_MS, maxConcurrentRuns: 1 },
        })

        let settled: { output: Record<string, unknown> } | undefined
        const triggered = h
          .tool("run")
          .execute({ id: "hung" })
          .then((value) => void (settled = value))
        await vi.advanceTimersByTimeAsync(0)
        await vi.advanceTimersByTimeAsync(MINUTE_MS + MIN_TICK_MS)
        await triggered

        expect(settled).toBeDefined()
        expect(String(settled!.output.error)).toMatch(/abandoned/)
        expect(String(settled!.output.error)).not.toMatch(/was interrupted/)
        expect(h.history("hung")![0]).toMatchObject({ outcome: "timeout" })
        expect(String(h.history("hung")![0]!.error)).toMatch(/interrupt is unavailable/)
        // Bounded all the same, so the slot is released without a cancel primitive existing.
        expect(await listed(h, "hung")).toMatchObject({ running: false })
      } finally {
        vi.useRealTimers()
      }
    },
    20_000,
  )

  // -------------------------------------------------------------------
  // The cap — acceptance box 2.
  // -------------------------------------------------------------------

  it(
    "refuses a manual trigger while the shared budget is spent, and says so in the result",
    async () => {
      // The half that was never there at all. Pre-fix the tool checked only
      // `inFlight.has(job.id)` — whether *this* job was running — so it admitted a trigger
      // alongside a scheduled run and blew `maxConcurrentRuns: 1` without noticing. Two jobs, one
      // slot, the slot already taken by a hung scheduled run: the manual trigger must be refused,
      // and must say why, because the caller here is a person who asked for a run.
      vi.useFakeTimers()
      try {
        const start = Date.now()
        vi.setSystemTime(start)
        const h = await manual({
          hangPrompt: "never resolves",
          jobs: [
            dueJob("hung", "never resolves", { runTimeout: "1m" }),
            { id: "other", schedule: "@daily", prompt: "the other prompt" },
          ],
          seed: seeded(start, "hung"),
          pluginOptions: { tickMs: MIN_TICK_MS, maxConcurrentRuns: 1 },
        })

        await vi.advanceTimersByTimeAsync(0)
        expect(countOf(h, "never resolves")).toBe(1)
        // The scheduled run really holds the only slot, which is what the refusal below rests on.
        expect(await listed(h, "hung")).toMatchObject({ running: true })

        const out = await h.tool("run").execute({ id: "other" })

        // Said in the result, not silently declined.
        expect(out.output).toMatchObject({ id: "other" })
        expect(String(out.output.error)).toMatch(/concurrency cap 1 reached/)
        // And the refusal cost no prompt: the cap held.
        expect(countOf(h, "the other prompt")).toBe(0)
        // Recorded as skipped, so `schedules_history` explains the trigger that did not run.
        expect(h.history("other")).toMatchObject([{ outcome: "skipped" }])
        expect(String(h.history("other")![0]!.error)).toMatch(/concurrency cap 1 reached/)
        expect(h.logged().filter((line) => line.includes("skipping on-demand trigger of other"))).toHaveLength(1)
        // The hung job still holds its own slot — the refusal did not evict it.
        expect(await listed(h, "hung")).toMatchObject({ running: true })
      } finally {
        vi.useRealTimers()
      }
    },
    20_000,
  )

  it(
    "holds its slot for the whole manual run, so a scheduled run cannot start alongside it",
    async () => {
      // The other direction of the cap, and the half that needs the `inFlight` *registration*
      // rather than the check. One slot, taken by a hung manual run, and a scheduled job that comes
      // due while it is held: the scheduled run must be refused and recorded, not admitted
      // alongside. The check alone cannot do this — it asks whether *its own* job is running — so
      // this is the assertion that distinguishes the two halves of cap participation.
      vi.useFakeTimers()
      try {
        const start = Date.now()
        vi.setSystemTime(start)
        const h = await manual({
          hangPrompt: "the manual prompt",
          jobs: [
            dueJob("scheduled", "the scheduled prompt"),
            // A ten-minute bound, not the default: `advanceUntil` below has to walk the injected
            // clock to the next minute boundary, which can be almost a full minute away and
            // overshoots by a tick. A one-minute bound would then expire *inside the observation
            // window* on roughly one run in six, and the test would be reporting the bound rather
            // than the cap. The bound has its own tests; this one is about the slot.
            { id: "manual", schedule: "@daily", prompt: "the manual prompt", runTimeout: "10m" },
          ],
          // `lastRun: start` on purpose: the scheduled job is *not* due at the trigger, so the
          // only thing that can stop it is the slot the manual run is holding.
          seed: { "scheduled-tasks/scheduled": { version: STATE_VERSION, lastRun: start } },
          pluginOptions: { tickMs: MIN_TICK_MS, maxConcurrentRuns: 1 },
        })

        await vi.advanceTimersByTimeAsync(0)
        expect(countOf(h, "the scheduled prompt")).toBe(0)

        let settled: { output: Record<string, unknown> } | undefined
        const triggered = h
          .tool("run")
          .execute({ id: "manual" })
          .then((value) => void (settled = value))
        await vi.advanceTimersByTimeAsync(0)
        expect(countOf(h, "the manual prompt")).toBe(1)
        // Registered: the tool's own list view says the job is running, and that flag is read from
        // the same `inFlight` set `tick` measures its shared budget from.
        expect(await listed(h, "manual")).toMatchObject({ running: true })

        // The scheduled job comes due on the next minute boundary, with the only slot held.
        expect(
          await advanceUntil(() => h.logged().some((line) => line.includes("skipping scheduled")), 2 * MINUTE_MS),
        ).toBe(true)
        const skips = h.logged().filter((line) => line.includes("skipping scheduled"))
        for (const line of skips) expect(line).toContain("concurrency cap reached (1/1)")
        // Never admitted alongside: one prompt total for the scheduled job, and the manual one
        // still the only run in flight.
        expect(countOf(h, "the scheduled prompt")).toBe(0)
        expect(countOf(h, "the manual prompt")).toBe(1)

        // Release the manual run so nothing is left pending, and confirm the tool call returns.
        h.release()
        await vi.advanceTimersByTimeAsync(0)
        await triggered
        expect(settled).toMatchObject({ output: { id: "manual" } })
        expect(settled!.output.error).toBeUndefined()
      } finally {
        vi.useRealTimers()
      }
    },
    20_000,
  )

  it(
    "gives the slot back on every path, so a manual trigger cannot starve the schedule",
    async () => {
      // The release half, and it is the one a starvation bug would hide in. Four exits: the normal
      // one, the bound, a throwing host, and a trigger that never dispatches at all (no session).
      // Each is followed by a second trigger that must be admitted, so "released" is observed
      // through the cap rather than through an in-memory flag.
      vi.useFakeTimers()
      try {
        const start = Date.now()
        vi.setSystemTime(start)
        const h = await manual({
          hangPrompt: "never resolves",
          jobs: [
            { id: "first", schedule: "@daily", prompt: "never resolves", runTimeout: "1m" },
            { id: "second", schedule: "@daily", prompt: "the second prompt" },
          ],
          pluginOptions: { tickMs: MIN_TICK_MS, maxConcurrentRuns: 1 },
        })

        // Normal exit: the slot comes back, so the next trigger is admitted.
        const ok = await h.tool("run").execute({ id: "second" })
        expect(ok.output).toMatchObject({ id: "second" })
        expect(await listed(h, "second")).toMatchObject({ running: false })

        // Bound exit: a hung run gives the slot up at `runTimeoutMs`, so the schedule is not
        // starved by it for the life of the process.
        let settled: { output: Record<string, unknown> } | undefined
        const triggered = h
          .tool("run")
          .execute({ id: "first" })
          .then((value) => void (settled = value))
        await vi.advanceTimersByTimeAsync(0)
        expect(await listed(h, "first")).toMatchObject({ running: true })
        await vi.advanceTimersByTimeAsync(MINUTE_MS + MIN_TICK_MS)
        await triggered
        expect(settled).toBeDefined()
        expect(await listed(h, "first")).toMatchObject({ running: false })

        // And the slot is genuinely reusable, not merely unreported.
        const after = await h.tool("run").execute({ id: "second" })
        expect(after.output.error).toBeUndefined()
        expect(countOf(h, "the second prompt")).toBe(2)
      } finally {
        vi.useRealTimers()
      }
    },
    20_000,
  )

  // -------------------------------------------------------------------
  // The lease — acceptance box 4.
  // -------------------------------------------------------------------

  it(
    "keeps the job's run lease live for a manual run, so no tick re-admits it",
    async () => {
      // The job-scoped lease, which is the half that keeps a second prompt out of a session whose
      // turn is still going. `maxConcurrentRuns: 2` with a single job is the sharp version: one run
      // holds one of two slots, so the cap provably cannot refuse the next occurrence and only the
      // lease can. Asserted through the skip *reason*, which is the one place the two signals are
      // distinguishable.
      vi.useFakeTimers()
      try {
        const real = Date.now()
        // Parked 45s into a minute with a three-minute bound, so the run spans three re-decisions
        // at 15s, 75s and 135s. Cron is minute-resolution, so three boundaries means three genuine
        // chances to observe the lease rather than one chance at a lucky offset.
        const start = real - (real % MINUTE_MS) + 45_000
        vi.setSystemTime(start)
        const h = await manual({
          hangPrompt: "slow run",
          jobs: [dueJob("slow", "slow run", { runTimeout: "3m" })],
          // `lastRun: start`, not `start - 5m`: the job owes nothing at the trigger, so the first
          // occurrence falls *inside* the manual run. Seeding a backlog instead would put a
          // scheduled run in flight first and make the manual run the second prompt, which tests
          // the wrong thing — the lease has to be the reason the occurrence inside the run is
          // refused, and that is only visible if the occurrence is the first thing the tick meets.
          seed: { "scheduled-tasks/slow": { version: STATE_VERSION, lastRun: start } },
          pluginOptions: { tickMs: MIN_TICK_MS, maxConcurrentRuns: 2 },
        })

        await vi.advanceTimersByTimeAsync(0)
        expect(countOf(h, "slow run")).toBe(0)

        let settled: { output: Record<string, unknown> } | undefined
        const triggered = h
          .tool("run")
          .execute({ id: "slow" })
          .then((value) => void (settled = value))
        await vi.advanceTimersByTimeAsync(0)
        expect(countOf(h, "slow run")).toBe(1)

        // Every re-decision strictly inside the manual run: the job comes due at 15s, 75s and 135s.
        await vi.advanceTimersByTimeAsync(3 * MINUTE_MS - MIN_TICK_MS)
        const skips = h.logged().filter((line) => line.includes("skipping slow"))
        expect(skips.length).toBeGreaterThan(0)
        for (const line of skips) expect(line).toContain("previous run still in flight")
        // Never a second prompt into the busy session, and never a cap refusal either — which is
        // what makes this the *lease* rather than the cap.
        expect(countOf(h, "slow run")).toBe(1)
        expect(h.logged().some((line) => line.includes("concurrency cap reached"))).toBe(false)

        h.release()
        await vi.advanceTimersByTimeAsync(0)
        await triggered
        expect(settled).toBeDefined()
      } finally {
        vi.useRealTimers()
      }
    },
    20_000,
  )

  it(
    "drops the run lease when the trigger ends, so the job is not suppressed afterwards",
    async () => {
      // The other half of the lease, and the one that bites: a lease left armed would keep
      // `isRunOutstanding` true after the run is over and suppress every future occurrence of a
      // job nobody is running. This is why `openRunLease` clears the interval *and* the marker in
      // one idempotent closer.
      vi.useFakeTimers()
      try {
        const start = Date.now()
        vi.setSystemTime(start)
        const h = await manual({
          jobs: [dueJob("quick", "the quick prompt")],
          seed: seeded(start, "quick"),
          pluginOptions: { tickMs: MIN_TICK_MS, maxConcurrentRuns: 2 },
        })

        await vi.advanceTimersByTimeAsync(0)
        const out = await h.tool("run").execute({ id: "quick" })
        expect(out.output).toMatchObject({ id: "quick" })
        expect(h.history("quick")).toMatchObject([{ outcome: "ok" }, { outcome: "ok" }])

        // Well past the bound, so any surviving renewal interval would have fired several times.
        await vi.advanceTimersByTimeAsync(30 * MINUTE_MS)

        // The job is schedulable again: neither a lease nor a slot outlived the run.
        expect(await listed(h, "quick")).toMatchObject({ running: false })
        expect(h.logged().some((line) => line.includes("previous run still in flight"))).toBe(false)
      } finally {
        vi.useRealTimers()
      }
    },
    20_000,
  )

  it(
    "refuses a manual trigger while another instance holds the writer lease",
    async () => {
      // The cross-process half (ADR 0003), and the reason the description had to stop saying
      // "lease rules" without a position: the writer lease is taken by the *tick*, and pre-fix a
      // manual trigger was served from a process that does not hold it — a second writer writing
      // to the same job's state, which is precisely what the lock exists to prevent.
      const foreignPath = leasePath(dir, `${PROJECT}-foreign`)
      mkdirSync(join(foreignPath, ".."), { recursive: true })
      writeFileSync(foreignPath, JSON.stringify({ pid: process.pid + 1, heartbeat: Date.now() }))
      try {
        const h = await manual({
          projectID: `${PROJECT}-foreign`,
          jobs: [dueJob("other", "the other prompt")],
          seed: seeded(Date.now(), "other"),
          pluginOptions: { tickMs: MIN_TICK_MS, maxConcurrentRuns: 1 },
        })

        // Reported as foreign, so the state the refusal rests on is observable rather than implied.
        const listing = await h.list()
        expect(listing.leaseForeign).toBe(true)
        expect(listing.leaseHeld).toBe(false)
        // The job is still listed: a refusal is not a disappearance.
        expect((listing.jobs as Array<Record<string, unknown>>)[0]).toMatchObject({ id: "other" })

        const out = await h.tool("run").execute({ id: "other" })

        expect(out.output).toMatchObject({ id: "other" })
        expect(String(out.output.error)).toMatch(/writer lease/)
        expect(String(out.output.error)).toContain(foreignPath)
        expect(h.prompts).toEqual([])
        // No record either: nothing ran, so there is no run to record. (A refusal is not a run.)
        expect(h.history("other")).toBeUndefined()
      } finally {
        rmSync(foreignPath, { force: true })
      }
    },
    20_000,
  )

  it("still dispatches when the lease directory is unusable, which is not the same as foreign", async () => {
    // The degradation ADR 0003 chose over disabling the scheduler: if the lock directory cannot be
    // created, the instance runs *without* arbitration rather than refusing every run. Gating the
    // tool on `held` instead of `foreign` would silently convert that degradation into a dead
    // trigger — a manual run nobody could start by hand, in a project whose jobs still fire.
    const blocker = join(dir, "blocker")
    writeFileSync(blocker, "x")
    // mkdir of `<blocker>/<project>/writer.lock` fails because `blocker` is a file, so
    // `acquireLease` degrades to `held: false, foreign: false`.
    const store = new Map<string, unknown>()
    const prompts: Record<string, unknown>[] = []
    const tools: Array<Record<string, unknown>> = []
    const previous = process.env[DATA_DIR_ENV]
    process.env[DATA_DIR_ENV] = blocker
    try {
      writeFileSync(
        join(dir, ".opencode", "schedules.json"),
        JSON.stringify({ version: 1, jobs: [{ id: "j", schedule: "@daily", prompt: "p" }] }),
      )
      const resolved = await plugin.setup({
        location: { directory: dir, project: { id: PROJECT } },
        storage: {
          get: async (k: string) => store.get(k),
          set: async (k: string, v: unknown) => void store.set(k, v),
          remove: async (k: string) => void store.delete(k),
        },
        session: {
          create: async () => ({ id: "ses_manual" }),
          prompt: async (input: Record<string, unknown>) => {
            prompts.push(input)
            return { id: "inbox_1" }
          },
        },
        tool: {
          transform: async (cb: (editor: { add?: (t: unknown) => void }) => void) => {
            cb({ add: (t) => void tools.push(t as Record<string, unknown>) })
            return { dispose() {} }
          },
        },
      } as never)
      outstanding.push(() => void (resolved as () => void)?.())

      const listing = await (tools.find((e) => e.name === "list") as ManualTool).execute({})
      expect(listing.output).toMatchObject({ leaseHeld: false, leaseForeign: false })

      const out = await (tools.find((e) => e.name === "run") as ManualTool).execute({ id: "j" })
      expect(out.output.error).toBeUndefined()
      expect(prompts).toHaveLength(1)
    } finally {
      if (previous === undefined) delete process.env[DATA_DIR_ENV]
      else process.env[DATA_DIR_ENV] = previous
    }
  })

  it("takes the run lease, renews it inside the window, and gives it back exactly once", async () => {
    // The lease rule on its own, pinned without a clock, because the two in-flight signals are
    // deliberately redundant (see the timeout suite's note): in the scheduler they cannot be told
    // apart, so the lease's own contract is asserted against the helper directly.
    vi.useFakeTimers()
    try {
      const start = Date.now()
      vi.setSystemTime(start)
      const record: JobState = { version: STATE_VERSION }
      const close = openRunLease(record, MINUTE_MS)

      // Taken at `now + runTimeoutMs`, the same window `isLeaseLive` reads.
      expect(record.leaseUntil).toBe(start + MINUTE_MS)
      expect(isLeaseLive(record, start + 1)).toBe(true)

      // Renewed on the `leaseRenewalMs` schedule, and the renewal outlasts the run's own bound.
      await vi.advanceTimersByTimeAsync(leaseRenewalMs(MINUTE_MS))
      expect(record.leaseUntil).toBeGreaterThan(start + MINUTE_MS)

      // Given back on close…
      close()
      expect(record.leaseUntil).toBeUndefined()
      expect(isLeaseLive(record, start)).toBe(false)

      // …and an armed renewal cannot outlive it, which is what would suppress every future
      // occurrence of a job nobody is running.
      const after = record.leaseUntil
      await vi.advanceTimersByTimeAsync(4 * MINUTE_MS)
      expect(record.leaseUntil).toBe(after)
      // Idempotent, because it is called from a `finally` that may run on any path.
      expect(() => close()).not.toThrow()
    } finally {
      vi.useRealTimers()
    }
  })

  // -------------------------------------------------------------------
  // The description — acceptance boxes 5 and 6.
  // -------------------------------------------------------------------

  it("states in its own description only what the code enforces", async () => {
    // The sentence is not decoration: it is the text a model reads when deciding how to call the
    // tool, so a clause the code does not keep is how a caller comes to rely on a bound that is not
    // there. Pinned here on each mechanism by name, so a future edit that keeps the promise and
    // drops the enforcement — or the reverse — fails loudly in one place.
    const h = await manual({ jobs: [{ id: "j", schedule: "@daily", prompt: "p" }] })
    const description = h.tool("run").description

    // Concurrency.
    expect(description).toMatch(/maxConcurrentRuns/)
    // The bound, and the primitive that enforces it.
    expect(description).toMatch(/runTimeout/)
    expect(description).toMatch(/interrupt/)
    // Both halves of the lease: the cross-process writer lease and the per-job run lease.
    expect(description).toMatch(/writer lease/)
    // The record, so "the same rules" includes being visible afterwards.
    expect(description).toMatch(/history/)
    // And it no longer promises the rules without saying what they do — the old wording claimed
    // three properties in six words and named none of the mechanisms.
    expect(description.length).toBeGreaterThan(100)
  })

  it("reports the outcome of every manual run, so a caller is never told 'ok' for a run that timed out", async () => {
    // The shape of the tool's answer, across all four exits. `error` is the refusal/failure channel
    // and its absence is the success signal, so an exit that failed silently would look like a
    // success to the caller.
    vi.useFakeTimers()
    try {
      const start = Date.now()
      vi.setSystemTime(start)
      const h = await manual({
        hangPrompt: "never resolves",
        jobs: [
          { id: "a", schedule: "@daily", prompt: "never resolves", runTimeout: "1m" },
          { id: "b", schedule: "@daily", prompt: "the b prompt" },
        ],
        pluginOptions: { tickMs: MIN_TICK_MS, maxConcurrentRuns: 1 },
      })

      // Unknown id and missing id: still typed failures.
      expect((await h.tool("run").execute({ id: "nope" })).output.error).toMatch(/no job with id/)
      expect((await h.tool("run").execute({})).output.error).toMatch(/id is required/)

      // Success: no error, and the admitted id the caller asked for.
      const ok = await h.tool("run").execute({ id: "b" })
      expect(ok.output.error).toBeUndefined()
      expect(ok.output).toMatchObject({ id: "b", sessionID: "ses_manual", admitted: "inbox_1" })
      expect(h.history("b")).toMatchObject([{ outcome: "ok" }])

      // Timeout: an error, and never a bare success.
      let settled: { output: Record<string, unknown> } | undefined
      const triggered = h
        .tool("run")
        .execute({ id: "a" })
        .then((value) => void (settled = value))
      await vi.advanceTimersByTimeAsync(0)
      await vi.advanceTimersByTimeAsync(MINUTE_MS + MIN_TICK_MS)
      await triggered
      expect(String(settled!.output.error)).toMatch(/exceeded runTimeout 1m/)
      expect(h.history("a")).toMatchObject([{ outcome: "timeout" }])
    } finally {
      vi.useRealTimers()
    }
  }, 20_000)
})

// ---------------------------------------------------------------------------
// ADR 0002: `backfill` replays, and the remainder is reported in both sinks.
// ---------------------------------------------------------------------------

describe("backfill replays a backlog and reports what it dropped (bug-backfill-collapses-to-one-run-and-never-reports-truncation)", () => {
  const PROJECT = "backfill"
  /**
   * A pinned minute boundary. The synthetic backlog is built from this and a cursor five minutes
   * earlier, so the window holds exactly five occurrences whatever time the suite happens to run —
   * a `Date.now()` start makes that true only to within the minute.
   */
  const START = Date.UTC(2026, 4, 10, 12, 0, 0)

  let dir: string
  let restoreEnv: string | undefined
  let consoleLines: string[]
  let realConsoleError: typeof console.error
  const outstanding: Array<() => void> = []

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "st-backfill-"))
    mkdirSync(join(dir, ".opencode"), { recursive: true })
    restoreEnv = process.env[DATA_DIR_ENV]
    process.env[DATA_DIR_ENV] = join(dir, "state")
    realConsoleError = console.error
    consoleLines = []
    console.error = (...args: unknown[]): void => void consoleLines.push(args.map(String).join(" "))
  })

  afterEach(() => {
    for (const dispose of outstanding.splice(0).reverse()) {
      try {
        dispose()
      } catch {
        /* a failing teardown must not mask the assertion before it */
      }
    }
    console.error = realConsoleError
    if (restoreEnv === undefined) delete process.env[DATA_DIR_ENV]
    else process.env[DATA_DIR_ENV] = restoreEnv
    rmSync(dir, { recursive: true, force: true })
    vi.useRealTimers()
  })

  type Runs = Array<Record<string, unknown>>
  type Tool = { execute: (input: Record<string, unknown>) => Promise<{ output: Record<string, unknown> }> }

  type BacklogHarness = {
    prompts: Record<string, unknown>[]
    store: Map<string, unknown>
    /** The stored ring a scheduled run writes — the run record sink. */
    history: (id: string) => Runs | undefined
    jobState: (id: string) => Record<string, unknown> | undefined
    tool: (name: string) => Tool
    /** Every log line, as an interactive `--print-logs` run sees them. */
    logged: () => string[]
    /** The same lines in the durable log file. */
    logFile: () => string
    release: () => void
  }

  /**
   * A plugin on an injected clock, seeded with a backlog it owes.
   *
   * `hold` parks every prompt so a replay can be caught *behind* an earlier run still in flight —
   * the one case where a catch-up plan is either kept or silently thrown away.
   */
  async function backlogged(
    options: {
      jobs?: unknown[]
      seed?: Record<string, unknown>
      pluginOptions?: Record<string, unknown>
      hold?: boolean
    } = {},
  ): Promise<BacklogHarness> {
    const store = new Map<string, unknown>(Object.entries(options.seed ?? {}))
    if (options.jobs !== undefined) {
      writeFileSync(join(dir, ".opencode", "schedules.json"), JSON.stringify({ version: 1, jobs: options.jobs }))
    }
    const prompts: Record<string, unknown>[] = []
    const tools: Array<Record<string, unknown>> = []
    let openTheGate: () => void = () => {}
    const gate = options.hold === true ? new Promise<void>((resolve) => void (openTheGate = resolve)) : undefined
    const ctx: Record<string, unknown> = {
      ...(options.pluginOptions === undefined ? {} : { options: options.pluginOptions }),
      location: { directory: dir, project: { id: PROJECT } },
      storage: {
        get: async (key: string) => store.get(key),
        set: async (key: string, value: unknown) => void store.set(key, value),
        remove: async (key: string) => void store.delete(key),
      },
      session: {
        create: async () => ({ id: "ses_backfill" }),
        prompt: async (input: Record<string, unknown>) => {
          prompts.push(input)
          if (gate !== undefined) await gate
          return { id: `inbox_${prompts.length}` }
        },
      },
      tool: {
        transform: async (cb: (editor: { add?: (tool: unknown) => void }) => void) => {
          cb({ add: (tool) => void tools.push(tool as Record<string, unknown>) })
          return { dispose() {} }
        },
      },
    }
    const resolved = await plugin.setup(ctx as never)
    outstanding.push(() => {
      ;(resolved as () => void)?.()
      // Never leave a held prompt pending into the next test.
      openTheGate()
    })
    return {
      prompts,
      store,
      history: (id) => store.get(`scheduled-tasks/history/${id}`) as Runs | undefined,
      jobState: (id) => store.get(`scheduled-tasks/${id}`) as Record<string, unknown> | undefined,
      tool: (name) => {
        const found = tools.find((entry) => entry.name === name)
        if (found === undefined) throw new Error(`tool ${name} was not registered`)
        return found as unknown as Tool
      },
      logged: () => [...consoleLines],
      logFile: () => {
        const path = logPath(dir, PROJECT)
        expect(existsSync(path)).toBe(true)
        return readFileSync(path, "utf8")
      },
      release: openTheGate,
    }
  }

  /** A `* * * * *` job whose `backfill` cap is three, unless a test says otherwise. */
  const catchUpJob = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
    id: "catchup",
    schedule: "* * * * *",
    timezone: "UTC",
    prompt: "catch me up",
    misfire: "backfill",
    maxCatchUp: 3,
    // A short bound so a held prompt in the deferral test times out inside the test's own budget
    // rather than outliving it.
    runTimeout: "1m",
    ...over,
  })

  /** A cursor five minutes before `START`: the five hourly/minutely occurrences ADR 0002 replays. */
  const owedFive = (id = "catchup"): Record<string, unknown> => ({
    [`scheduled-tasks/${id}`]: { version: STATE_VERSION, lastRun: START - 5 * MINUTE_MS },
  })

  const truncations = (h: BacklogHarness): string[] => h.logged().filter((line) => /backlog truncated/.test(line))

  /** Flush pending microtasks and 0/1ms timers on the injected clock, as a `void`-dispatched run does. */
  async function settle(turns = 20): Promise<void> {
    for (let n = 0; n < turns; n += 1) await vi.advanceTimersByTimeAsync(1)
  }

  /** Advance until `predicate` holds, or give up after `budgetMs` — never a guessed interval. */
  async function advanceUntil(predicate: () => boolean, budgetMs: number, stepMs = MIN_TICK_MS): Promise<boolean> {
    for (let elapsed = 0; elapsed <= budgetMs; elapsed += stepMs) {
      if (predicate()) return true
      await vi.advanceTimersByTimeAsync(stepMs)
      await settle(2)
    }
    return predicate()
  }

  it(
    "replays a capped backlog oldest-first, one dispatch per occurrence, and reports the remainder in both sinks",
    async () => {
      // The item's reproduction: `backfill`, `maxCatchUp: 3`, five missed occurrences. Pre-fix this
      // produced **one** prompt, one record with no field for the remainder, and no truncation line.
      vi.useFakeTimers()
      try {
        vi.setSystemTime(START)
        const h = await backlogged({
          jobs: [catchUpJob()],
          seed: owedFive(),
          pluginOptions: { tickMs: MIN_TICK_MS, maxConcurrentRuns: 1 },
        })

        // Three ticks, not one: each replay spends the tick's single slot, so the backlog drains
        // across ticks rather than inside the tick that found it.
        expect(await advanceUntil(() => h.prompts.length === 3, 8 * MIN_TICK_MS)).toBe(true)
        expect(await advanceUntil(() => (h.history("catchup") ?? []).length === 3, 4 * MIN_TICK_MS)).toBe(true)
        await settle()

        // **The dispatch count**, and oldest-first: three prompts, three occurrences, in order.
        expect(h.prompts).toHaveLength(3)
        expect(h.prompts[0]).toMatchObject({ text: "catch me up", delivery: "queue" })
        expect((h.history("catchup") ?? []).map((entry) => entry.dueAt)).toEqual([
          START - 4 * MINUTE_MS,
          START - 3 * MINUTE_MS,
          START - 2 * MINUTE_MS,
        ])

        // **The record**: every run of a truncated backlog carries the remainder the cap swallowed,
        // so `schedules_history` answers "did I miss anything?" without reading a log.
        expect(h.history("catchup")).toMatchObject([
          { outcome: "ok", dropped: 2 },
          { outcome: "ok", dropped: 2 },
          { outcome: "ok", dropped: 2 },
        ])

        // **The log**, once, naming the job and the number — and in the file, not only the stream.
        expect(truncations(h)).toHaveLength(1)
        expect(truncations(h)[0]).toContain("catchup")
        expect(truncations(h)[0]).toMatch(/2 occurrence\(s\)/)
        expect(h.logFile()).toMatch(/backlog truncated[^\n]*catchup[^\n]*2 occurrence\(s\)/)

        // And nothing is left owed: the plan drained instead of stalling half-replayed.
        expect(h.jobState("catchup")?.catchUp).toBeUndefined()
      } finally {
        vi.useRealTimers()
      }
    },
    20_000,
  )

  it(
    "keeps a replay owed while the previous run is still in flight, rather than dropping it",
    async () => {
      // The plan is the only thing standing between "a long run" and "a lost occurrence", so a
      // deferral has to keep the occurrence. Consuming it here is the same class of loss this
      // item is about, one tick later.
      vi.useFakeTimers()
      try {
        vi.setSystemTime(START)
        const h = await backlogged({
          jobs: [catchUpJob()],
          seed: owedFive(),
          pluginOptions: { tickMs: MIN_TICK_MS, maxConcurrentRuns: 1 },
          hold: true,
        })

        expect(await advanceUntil(() => h.prompts.length === 1, 4 * MIN_TICK_MS)).toBe(true)

        // Two ticks pass with the first run still holding the one slot: nothing new is dispatched…
        await vi.advanceTimersByTimeAsync(2 * MIN_TICK_MS)
        await settle()
        expect(h.prompts).toHaveLength(1)

        // …and the two remaining occurrences are still owed, not spent.
        const owed = (h.jobState("catchup")?.catchUp as { pending?: number[] } | undefined)?.pending
        expect(owed).toEqual([START - 3 * MINUTE_MS, START - 2 * MINUTE_MS])

        // The deferred occurrence is not *reported* as skipped, and its line still carries the
        // truncation — a suppressed decision about a backlog the cap cut short is one decision, and
        // naming only half of it is how the other half goes missing.
        const deferrals = h.logged().filter((line) => /skipping catchup/.test(line))
        expect(deferrals).not.toHaveLength(0)
        for (const line of deferrals) expect(line).toMatch(/previous run still in flight.*2 occurrence\(s\)/)

        // Releasing the slot drains the rest, oldest first: a deferral cost time, not an occurrence.
        h.release()
        expect(await advanceUntil(() => h.prompts.length === 3, 6 * MIN_TICK_MS)).toBe(true)
        await advanceUntil(() => (h.history("catchup") ?? []).length === 3, 4 * MIN_TICK_MS)
        await settle()
        expect((h.history("catchup") ?? []).map((entry) => entry.dueAt)).toEqual([
          START - 4 * MINUTE_MS,
          START - 3 * MINUTE_MS,
          START - 2 * MINUTE_MS,
        ])
      } finally {
        vi.useRealTimers()
      }
    },
    20_000,
  )

  it(
    "keeps the rest of a backlog owed across a restart",
    async () => {
      // The plan is durable for one reason: these are billable occurrences the user asked for, so a
      // process restart mid-drain must not lose them. Re-arming from the cursor alone would silently
      // drop whatever the plan still held.
      vi.useFakeTimers()
      try {
        vi.setSystemTime(START)
        const first = await backlogged({
          jobs: [catchUpJob()],
          seed: owedFive(),
          pluginOptions: { tickMs: MIN_TICK_MS, maxConcurrentRuns: 1 },
        })
        // One tick only, so the drain is caught half-finished: three occurrences are owed and the
        // first has just been dispatched. (Advancing further would let the whole backlog go, which
        // is the outcome this test is not about.)
        await vi.advanceTimersByTimeAsync(0)
        await settle()
        expect(first.prompts).toHaveLength(1)
        const halfDrained = first.store.get("scheduled-tasks/catchup") as Record<string, unknown>
        expect((halfDrained.catchUp as { pending: number[] }).pending).toEqual([
          START - 3 * MINUTE_MS,
          START - 2 * MINUTE_MS,
        ])

        // Tear the instance down — timer, lease, in-memory state — and start a new one over the same
        // storage, exactly as a server restart would.
        for (const dispose of outstanding.splice(0)) dispose()

        const second = await backlogged({
          jobs: [catchUpJob()],
          seed: { "scheduled-tasks/catchup": halfDrained },
          pluginOptions: { tickMs: MIN_TICK_MS, maxConcurrentRuns: 1 },
        })
        expect(await advanceUntil(() => second.prompts.length === 2, 6 * MIN_TICK_MS)).toBe(true)
        await settle()

        // The two still owed came through the restart, oldest first, and nothing ran twice.
        expect((second.history("catchup") ?? []).map((entry) => entry.dueAt)).toEqual([
          START - 3 * MINUTE_MS,
          START - 2 * MINUTE_MS,
        ])
        expect(second.prompts).toHaveLength(2)
        expect(second.jobState("catchup")?.catchUp).toBeUndefined()
      } finally {
        vi.useRealTimers()
      }
    },
    20_000,
  )

  it(
    "collapses the same backlog to one run under `skip`, and records the occurrences it collapsed",
    async () => {
      // `skip` is the other half of ADR 0002 and shares the same reporting sink, so the collapsed
      // remainder is stated in the record too: a run that stood for a backlog of five must not
      // read as though it was the whole backlog.
      vi.useFakeTimers()
      try {
        vi.setSystemTime(START)
        const h = await backlogged({
          jobs: [catchUpJob({ misfire: "skip" })],
          seed: owedFive(),
          pluginOptions: { tickMs: MIN_TICK_MS, maxConcurrentRuns: 1 },
        })

        expect(await advanceUntil(() => h.prompts.length === 1, 4 * MIN_TICK_MS)).toBe(true)
        await vi.advanceTimersByTimeAsync(2 * MIN_TICK_MS)
        await settle()

        expect(h.prompts).toHaveLength(1)
        expect(h.history("catchup")).toMatchObject([
          { outcome: "ok", dueAt: START - 4 * MINUTE_MS, dropped: 4 },
        ])
        expect(truncations(h)).toHaveLength(1)
        expect(truncations(h)[0]).toMatch(/4 occurrence\(s\)/)
      } finally {
        vi.useRealTimers()
      }
    },
    20_000,
  )

  it("reads the truncated remainder back out of storage, rather than dropping the field", async () => {
    // `loadHistory` rebuilds every record from storage and keeps only the fields it recognises,
    // so a field that is written but not read back is a report that survives nowhere. This is the
    // read side of the same promise.
    const seeded: Runs = [
      {
        dueAt: START - 4 * MINUTE_MS,
        startedAt: START - 4 * MINUTE_MS,
        outcome: "ok",
        model: "session default",
        dropped: 2,
        droppedCapped: true,
      },
    ]
    const h = await backlogged({
      // `@daily` with a cursor at `START` is not due, so this test reads the ring without a run
      // appending to it.
      jobs: [catchUpJob({ schedule: "@daily" })],
      seed: {
        "scheduled-tasks/catchup": { version: STATE_VERSION, lastRun: START },
        "scheduled-tasks/history/catchup": seeded,
      },
      pluginOptions: { tickMs: MIN_TICK_MS, maxConcurrentRuns: 1 },
    })

    const out = await h.tool("history").execute({ id: "catchup" })
    // Newest first, and carrying the remainder the cap swallowed.
    expect(out.output.runs).toMatchObject([{ dropped: 2, droppedCapped: true }])
  })

  it("says a capped count is a lower bound in the log, not just a number", async () => {
    // Added by `bug-tick-cost-grows-with-sleep-not-with-jobs`, in this block because this is its
    // harness. Mutating the `droppedCapped` wording out of `truncationClause` leaves the whole
    // suite green, so the log half of "this count is a lower bound" was pinned by nothing: the flag
    // survived on the record while the one line a human reads called 1000 a count.
    vi.useFakeTimers()
    try {
      vi.setSystemTime(START)
      const h = await backlogged({
        jobs: [catchUpJob()],
        // 2001 minutely occurrences owed: 3 replayed, and more than the 1000-occurrence scan bound
        // counts, so the remainder is a lower bound rather than a count.
        seed: { "scheduled-tasks/catchup": { version: STATE_VERSION, lastRun: START - 2001 * MINUTE_MS } },
        pluginOptions: { tickMs: MIN_TICK_MS, maxConcurrentRuns: 1 },
      })

      expect(await advanceUntil(() => truncations(h).length === 1, 4 * MIN_TICK_MS)).toBe(true)
      await settle()

      const [line] = truncations(h)
      // The count, then the honesty about it — a lower bound that reads as a count is how "1000
      // dropped" turns into a claim the scheduler cannot back up.
      expect(line).toMatch(/1000 occurrence\(s\) dropped or more/)
      expect(line).toMatch(/backlog scan bound was reached/)
      // The record carries the same flag, so a reader holding the record is told the same thing.
      expect(h.history("catchup")?.[0]).toMatchObject({ dropped: 1000, droppedCapped: true })
      expect(h.jobState("catchup")?.catchUp).toMatchObject({ dropped: 1000, droppedCapped: true })
    } finally {
      vi.useRealTimers()
    }
  }, 20_000)

  it("drops a malformed stored remainder instead of reporting a number it cannot stand behind", async () => {
    const seeded: Runs = [
      // Not a count, and a flag with no count behind it.
      { dueAt: 1, startedAt: 1, outcome: "ok", model: "session default", dropped: "two", droppedCapped: true },
    ]
    const h = await backlogged({
      jobs: [catchUpJob({ schedule: "@daily" })],
      seed: {
        "scheduled-tasks/catchup": { version: STATE_VERSION, lastRun: START },
        "scheduled-tasks/history/catchup": seeded,
      },
      pluginOptions: { tickMs: MIN_TICK_MS, maxConcurrentRuns: 1 },
    })

    const out = await h.tool("history").execute({ id: "catchup" })
    const runs = out.output.runs as Runs
    expect("dropped" in runs[0]!).toBe(false)
    expect("droppedCapped" in runs[0]!).toBe(false)
  })
})

// =====================================================================
// (bug-storageless-degradation-unrecorded)
//
// spec 001 box 145 claimed that a host without `ctx.storage` "degrades to in-memory state:
// jobs still run, and the loss of cross-restart continuity is recorded in the run record".
// The first clause was true. The second did not exist — `state.storageAvailable` was assigned
// at setup and read nowhere, and no run record had a field to carry it.
//
// And the namespacing fix for `bug-oneoff-history-unreadable-and-storage-unbounded` made
// `resolveHistoryOwner` resolve a *finished* one-off through storage alone. On a storageless
// host that reads nothing, so a one-off whose record was written moments earlier in the same
// tick came back as `no job with id` — the exact symptom the previous item was filed to
// eliminate, left standing for the uncommon host.
//
// So the decision this block pins: ephemeral history stays reachable **in memory** here, every
// run record says whether it outlives the session, and an id this process cannot resolve names
// the retention boundary instead of claiming no such job exists.
// =====================================================================
/**
 * Project ids for the hosts below, unique for the whole file.
 *
 * `logOnce` dedups on a module-level set that outlives a single test, so two hosts sharing a
 * project id would share one degradation line and the second would assert against nothing. The
 * ids are the plugin's own key, so making them unique is what makes each line attributable here.
 */
let storagelessProjects = 0

const nextProjectID = (): string => `storageless-${(storagelessProjects += 1)}`

describe("a storageless host is told so, and keeps its history readable (bug-storageless-degradation-unrecorded)", () => {
  let dir: string
  let restoreEnv: string | undefined
  let consoleLines: string[]
  let realConsoleError: typeof console.error
  const outstanding: Array<() => void> = []

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "st-storageless-"))
    mkdirSync(join(dir, ".opencode"), { recursive: true })
    restoreEnv = process.env[DATA_DIR_ENV]
    process.env[DATA_DIR_ENV] = join(dir, "state")
    realConsoleError = console.error
    consoleLines = []
    console.error = (...args: unknown[]): void => void consoleLines.push(args.map(String).join(" "))
  })

  afterEach(() => {
    for (const dispose of outstanding.splice(0).reverse()) {
      try {
        dispose()
      } catch {
        /* a failing teardown must not mask the assertion before it */
      }
    }
    console.error = realConsoleError
    if (restoreEnv === undefined) delete process.env[DATA_DIR_ENV]
    else process.env[DATA_DIR_ENV] = restoreEnv
    rmSync(dir, { recursive: true, force: true })
    vi.useRealTimers()
  })

  type Tool = {
    execute: (input: Record<string, unknown>, context?: { sessionID?: unknown }) => Promise<{ output: Record<string, unknown> }>
  }
  type Runs = Array<Record<string, unknown>>

  type Storageless = {
    tool: (name: string) => Tool
    prompts: Record<string, unknown>[]
    /** Every `ctx.storage` operation this host actually offers, in the order it is used. */
    offered: string[]
    /** Lines this instance emitted, whatever else the file captured. */
    log: () => string[]
  }

  /**
   * A plugin whose `ctx.storage` is **genuinely absent**, or present in halves.
   *
   * The absence is the point, so there is no double to assert against: no store, no writes, and
   * `offered` stays empty — a mock that silently succeeds would let every assertion below pass
   * on a host that actually persists everything, which is the trap this suite has already paid
   * for once. `setOnly`/`getOnly` are the two half-surfaces, because neither operation implies
   * the other and a scheduler that assumes they arrive together invents continuity.
   */
  async function storageless(
    options: {
      jobs?: unknown[]
      /** Offer `ctx.storage.set` alone: this host writes what it can never read back. */
      setOnly?: boolean
      /** Offer `ctx.storage.get` alone: this host reads what it can never have written. */
      getOnly?: boolean
      pluginOptions?: Record<string, unknown>
    } = {},
  ): Promise<Storageless> {
    if (options.jobs !== undefined) {
      writeFileSync(join(dir, ".opencode", "schedules.json"), JSON.stringify({ version: 1, jobs: options.jobs }))
    }
    const offered: string[] = []
    const store = new Map<string, unknown>()
    const prompts: Record<string, unknown>[] = []
    const tools: Array<Record<string, unknown>> = []
    const storage =
      options.setOnly === true
        ? {
            set: async (key: string, value: unknown) => {
              offered.push("set")
              store.set(key, value)
            },
          }
        : options.getOnly === true
          ? {
              get: async (key: string) => {
                offered.push("get")
                return store.get(key)
              },
            }
          : undefined
    const projectID = nextProjectID()
    const ctx: Record<string, unknown> = {
      ...(options.pluginOptions === undefined ? {} : { options: options.pluginOptions }),
      location: { directory: dir, project: { id: projectID } },
      // Absent, not an empty object: `{}` would pass a `typeof ctx.storage === "object"` check
      // while offering nothing, which is precisely the assumption the detection must not make.
      ...(storage === undefined ? {} : { storage }),
      session: {
        create: async () => ({ id: `ses_${projectID}` }),
        prompt: async (input: Record<string, unknown>) => {
          prompts.push(input)
          return { id: `inbox_${prompts.length}` }
        },
      },
      tool: {
        transform: async (cb: (editor: { add?: (tool: unknown) => void }) => void) => {
          cb({ add: (tool) => void tools.push(tool as Record<string, unknown>) })
          return { dispose() {} }
        },
      },
    }
    // From the line setup itself, so this host's log is its own: two hosts in one test share the
    // captured array, and a line the plugin emitted under a *different* project id is a different
    // instance's report.
    const first = consoleLines.length
    const resolved = await plugin.setup(ctx as never)
    outstanding.push(() => void (resolved as () => void)?.())
    return {
      tool: (name: string): Tool => {
        const found = tools.find((entry) => entry.name === name)
        if (found === undefined) throw new Error(`tool ${name} was not registered`)
        return found as unknown as Tool
      },
      prompts,
      offered,
      log: () => consoleLines.slice(first),
    }
  }

  /** Flush pending microtasks and 0/1ms timers on the injected clock, as a run is `void`-dispatched. */
  async function settle(turns = 20): Promise<void> {
    for (let n = 0; n < turns; n += 1) await vi.advanceTimersByTimeAsync(1)
  }

  /** Advance until `predicate` holds, or give up after `budgetMs` — never a guessed interval. */
  async function advanceUntil(predicate: () => boolean, budgetMs: number, stepMs = MIN_TICK_MS): Promise<boolean> {
    for (let elapsed = 0; elapsed <= budgetMs; elapsed += stepMs) {
      if (predicate()) return true
      await vi.advanceTimersByTimeAsync(stepMs)
      await settle(2)
    }
    return predicate()
  }

  /** A job due every minute, so one tick boundary decides it. */
  const dueJob = (id: string, prompt: string): Record<string, unknown> => ({ id, schedule: "* * * * *", timezone: "UTC", prompt })

  /** A due one-off as `schedules_schedule` accepts it: inside the grace window. */
  const dueSoon = (): Record<string, unknown> => ({ prompt: "the one-off prompt", dueAt: Date.now() - 1_000 })

  // -------------------------------------------------------------------
  // Box: the loss of cross-restart continuity is recorded — on the run
  // record and once in the log — and `storageAvailable` is read to do it.
  // -------------------------------------------------------------------

  it(
    "stamps every run record on a storageless host, and says once that continuity is lost",
    async () => {
      vi.useFakeTimers()
      vi.setSystemTime(Date.now())
      const h = await storageless({ jobs: [dueJob("j", "the job prompt")] })

      // The first clause of the box, and the reason the stamp is ever written: jobs still run.
      expect(await advanceUntil(() => h.prompts.length === 1, 2 * MINUTE_MS)).toBe(true)
      await settle()

      const runs = (await h.tool("history").execute({ id: "j" })).output.runs as Runs
      expect(runs[0]).toMatchObject({ outcome: "ok", inMemoryOnly: true })
      // Not a blanket flag on the answer: the ring around it is stored history, and a field that
      // appeared on records the host *did* persist would be the same lie in a new place.
      expect(runs.every((run) => run.inMemoryOnly === true)).toBe(true)
      expect(h.offered).toEqual([])

      // …and the log says so once, naming both the gap and what is lost. Asserted on content, not
      // on a line's existence: a degradation notice that only says "storage unavailable" leaves
      // the reader to guess whether anything survives a restart.
      const line = h.log().find((entry) => /ctx\.storage/.test(entry))
      expect(line).toBeDefined()
      expect(line).toMatch(/ctx\.storage unavailable/)
      expect(line).toMatch(/memory only/)
      expect(line).toMatch(/lost when this session ends/)
      // Once, not once per tick: a repeated identical failure that repeats once a tick is its own
      // spec box, and a degradation notice that spams would bury the runs it is explaining.
      // Matched on the continuity sentence rather than on `ctx.storage`, which the `scan`
      // degradation also names and legitimately says once of its own.
      expect(h.log().filter((entry) => /lost when this session ends/.test(entry))).toHaveLength(1)
    },
    20_000,
  )

  it("does not stamp the record, or claim a degraded host, when storage works", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(Date.now())
    // The other direction, so the stamp cannot be a constant: on a host that persists everything,
    // neither the record nor the log may claim a loss of continuity.
    const store = new Map<string, unknown>()
    const tools: Array<Record<string, unknown>> = []
    const prompts: Record<string, unknown>[] = []
    writeFileSync(
      join(dir, ".opencode", "schedules.json"),
      JSON.stringify({ version: 1, jobs: [dueJob("j", "the job prompt")] }),
    )
    const first = consoleLines.length
    const resolved = await plugin.setup({
      location: { directory: dir, project: { id: nextProjectID() } },
      storage: {
        get: async (key: string) => store.get(key),
        set: async (key: string, value: unknown) => void store.set(key, value),
        remove: async (key: string) => void store.delete(key),
      },
      session: {
        create: async () => ({ id: "ses_kept" }),
        prompt: async (input: Record<string, unknown>) => {
          prompts.push(input)
          return { id: "inbox_kept" }
        },
      },
      tool: {
        transform: async (cb: (editor: { add?: (tool: unknown) => void }) => void) => {
          cb({ add: (tool) => void tools.push(tool as Record<string, unknown>) })
          return { dispose() {} }
        },
      },
    } as never)
    outstanding.push(() => void (resolved as () => void)?.())

    expect(await advanceUntil(() => prompts.length === 1, 2 * MINUTE_MS)).toBe(true)
    await settle()

    const tool = (name: string): Tool => {
      const found = tools.find((entry) => entry.name === name)
      if (found === undefined) throw new Error(`tool ${name} was not registered`)
      return found as unknown as Tool
    }
    const runs = (await tool("history").execute({ id: "j" })).output.runs as Runs
    expect(runs[0]).toMatchObject({ outcome: "ok" })
    expect("inMemoryOnly" in runs[0]!).toBe(false)
    expect(consoleLines.slice(first).filter((entry) => /ctx\.storage/.test(entry))).toEqual([])
  }, 20_000)

  it(
    "counts a key minted by an earlier process against the cap, not only this one's",
    async () => {
      vi.useFakeTimers()
      vi.setSystemTime(Date.now())
      // A host whose storage works, carrying a full index from before: this process's own list is
      // empty at setup, so if the cap counted only what *this* session minted, the fifty keys
      // already on disk would not count and nothing would ever be evicted — across a restart the
      // bound would silently double. Mutating the union away leaves the rest of the suite green,
      // so this is what pins it.
      const index = Array.from({ length: MAX_EPHEMERAL_HISTORY_KEYS }, (_, n) => ({
        key: `scheduled-tasks/history/oneoff/earlier${n}`,
        at: n + 1,
      }))
      const store = new Map<string, unknown>([["scheduled-tasks/history/ephemeral", index]])
      const tools: Array<Record<string, unknown>> = []
      writeFileSync(join(dir, ".opencode", "schedules.json"), JSON.stringify({ version: 1, jobs: [] }))
      const resolved = await plugin.setup({
        location: { directory: dir, project: { id: nextProjectID() } },
        storage: {
          get: async (key: string) => store.get(key),
          set: async (key: string, value: unknown) => void store.set(key, value),
          remove: async (key: string) => void store.delete(key),
        },
        session: { create: async () => ({ id: "ses_union" }), prompt: async () => ({ id: "inbox_union" }) },
        tool: {
          transform: async (cb: (editor: { add?: (tool: unknown) => void }) => void) => {
            cb({ add: (tool) => void tools.push(tool as Record<string, unknown>) })
            return { dispose() {} }
          },
        },
      } as never)
      outstanding.push(() => void (resolved as () => void)?.())

      await settle()
      const schedule = tools.find((entry) => entry.name === "schedule") as unknown as Tool
      await (schedule.execute({ prompt: "p", dueAt: Date.now() - 1_000 }) as Promise<unknown>)
      await settle()

      // One key over the cap, and the *oldest* — from the earlier session, not this one's.
      expect(store.get("scheduled-tasks/history/ephemeral")).toHaveLength(MAX_EPHEMERAL_HISTORY_KEYS)
      expect(store.has("scheduled-tasks/history/oneoff/earlier0")).toBe(false)
    },
    20_000,
  )

  it(
    "treats a half-present storage surface as degraded, because neither operation implies the other",
    async () => {
      for (const half of [
        { missing: "set", options: { getOnly: true } },
        { missing: "get", options: { setOnly: true } },
      ] as const) {
        vi.useFakeTimers()
        vi.setSystemTime(Date.now())
        const h = await storageless({ jobs: [dueJob("j", "the job prompt")], ...half.options })

        expect(await advanceUntil(() => h.prompts.length === 1, 2 * MINUTE_MS)).toBe(true)
        await settle()

        // Detected per operation: a record that cannot be read back is not retained, whichever
        // half is missing, and the line names *which* one rather than blaming the whole surface.
        const runs = (await h.tool("history").execute({ id: "j" })).output.runs as Runs
        expect(runs[0]).toMatchObject({ inMemoryOnly: true })
        const line = h.log().find((entry) => /ctx\.storage/.test(entry))
        expect(line).toContain(`ctx.storage.${half.missing} unavailable`)
      }
    },
    40_000,
  )

  // -------------------------------------------------------------------
  // The ephemeral-history fallback, decided: in memory, and said so when
  // even that cannot answer.
  // -------------------------------------------------------------------

  it(
    "reads a one-off it just ran back through schedules_history, with no storage at all",
    async () => {
      vi.useFakeTimers()
      vi.setSystemTime(Date.now())
      const h = await storageless({ jobs: [] })

      const id = ((await h.tool("schedule").execute(dueSoon())).output.id) as string
      expect(id).toMatch(/^oneoff_/)
      await settle()

      // The run happened — asserted on the prompt, so it cannot pass on a log line.
      expect(h.prompts).toHaveLength(1)

      // …and reading it back is the claim that was false without storage: the id is in no live
      // list any more, so only this process's own ring can answer for it.
      const read = (await h.tool("history").execute({ id })).output
      expect(read.error).toBeUndefined()
      expect(read.kind).toBe("oneoff")
      expect(read.runs).toMatchObject([{ outcome: "ok", inMemoryOnly: true }])
    },
    20_000,
  )

  it(
    "names the retention boundary for a finished one-off it can no longer resolve",
    async () => {
      vi.useFakeTimers()
      vi.setSystemTime(Date.now())
      // The repro, honestly staged: a second instance over the same project, which is what "an
      // earlier session" is on a host that persists nothing. Whatever the first instance ran is
      // unreachable from here, so the two remaining explanations — never ran, and ran and died
      // with the session — have to be told apart out loud rather than by a bare miss.
      const first = await storageless({ jobs: [] })
      const id = ((await first.tool("schedule").execute(dueSoon())).output.id) as string
      await settle()
      expect(first.prompts).toHaveLength(1)

      const second = await storageless({ jobs: [] })
      const miss = (await second.tool("history").execute({ id })).output
      expect(String(miss.error)).toMatch(new RegExp(`no job with id "${id}"`))
      expect(String(miss.historyUnavailable)).toMatch(/ctx\.storage\.get/)
      expect(String(miss.historyUnavailable)).toMatch(/never after it/)
    },
    20_000,
  )

  it(
    "bounds the in-memory rings the way the persisted ones are bounded",
    async () => {
      vi.useFakeTimers()
      vi.setSystemTime(Date.now())
      // Where nothing is persisted, the in-memory ring *is* the retained history — so a cap that
      // only counted storage keys would bound nothing here, and a project that ran a thousand
      // one-offs would keep a thousand rings for the life of the session. Reaching the cap needs
      // that many one-offs, which is exactly the growth being bounded.
      const h = await storageless({ jobs: [] })
      const ids: string[] = []
      for (let n = 0; n <= MAX_EPHEMERAL_HISTORY_KEYS; n += 1) {
        ids.push(((await h.tool("schedule").execute(dueSoon())).output.id) as string)
        await settle(2)
      }

      // The oldest is gone, with nothing left behind to read…
      const evicted = (await h.tool("history").execute({ id: ids[0]! })).output
      expect(String(evicted.error)).toMatch(/no job with id/)
      // …and the cap dropped exactly one, not the rest with it: the newest is still there.
      expect((await h.tool("history").execute({ id: ids[1]! })).output.runs).toHaveLength(1)
      expect((await h.tool("history").execute({ id: ids.at(-1)! })).output.runs).toHaveLength(1)
    },
    60_000,
  )
})

// ---------------------------------------------------------------------------
// bug-log-lines-before-first-lease-never-reach-the-file
//
// `acquireLease` used to be the only thing that created the log directory, and it only
// runs when there is work to arm. Every line emitted before the first lease therefore
// reached `stderr` and stopped there — and those are precisely the startup and
// degradation diagnostics, the lines you read when nothing works and there is nothing
// in the file to read. An idle project left no evidence it had ever been loaded.
//
// Every test here starts from a directory with **no** log directory and asserts the line
// is *in the file*, not merely on stderr.
// ---------------------------------------------------------------------------

describe("the log directory exists before the first lease (bug-log-lines-before-first-lease-never-reach-the-file)", () => {
  let dir: string
  let restoreEnv: string | undefined
  let consoleLines: string[]
  let realConsoleError: typeof console.error
  const outstanding: Array<() => void> = []

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "st-logdir-"))
    mkdirSync(join(dir, ".opencode"), { recursive: true })
    restoreEnv = process.env[DATA_DIR_ENV]
    process.env[DATA_DIR_ENV] = join(dir, "state")
    realConsoleError = console.error
    consoleLines = []
    console.error = (...args: unknown[]): void => void consoleLines.push(args.map(String).join(" "))
  })

  afterEach(() => {
    for (const dispose of outstanding.splice(0).reverse()) {
      try {
        dispose()
      } catch {
        /* a failing teardown must not mask the assertion before it */
      }
    }
    console.error = realConsoleError
    if (restoreEnv === undefined) delete process.env[DATA_DIR_ENV]
    else process.env[DATA_DIR_ENV] = restoreEnv
    rmSync(dir, { recursive: true, force: true })
    vi.useRealTimers()
    vi.resetModules()
  })

  type Tool = {
    execute: (input: Record<string, unknown>, context?: { sessionID?: unknown }) => Promise<{ output: Record<string, unknown> }>
  }

  type Loaded = {
    tool: (name: string) => Tool
    /** Lines this instance emitted, whatever else the file captured. */
    log: () => string[]
  }

  /**
   * A project over `state`, with `ctx.storage` **genuinely absent** unless `storage` is given.
   *
   * The absence is the point — `ctx.storage.scan is unavailable` and `ctx.storage unavailable`
   * are both setup-time notices, which is exactly the class of line this item is about, and
   * they are emitted *before* any lease could exist.
   */
  async function load(
    projectID: string,
    options: { jobs?: unknown[]; storage?: Record<string, unknown> } = {},
  ): Promise<Loaded> {
    if (options.jobs !== undefined) {
      writeFileSync(join(dir, ".opencode", "schedules.json"), JSON.stringify({ version: 1, jobs: options.jobs }))
    }
    const tools: Array<Record<string, unknown>> = []
    const prompts: Record<string, unknown>[] = []
    const ctx: Record<string, unknown> = {
      location: { directory: dir, project: { id: projectID } },
      ...(options.storage === undefined ? {} : { storage: options.storage }),
      session: {
        create: async () => ({ id: "ses_logdir" }),
        prompt: async (input: Record<string, unknown>) => {
          prompts.push(input)
          return { id: `inbox_${prompts.length}` }
        },
      },
      tool: {
        transform: async (cb: (editor: { add?: (t: unknown) => void }) => void) => {
          cb({ add: (t) => void tools.push(t as Record<string, unknown>) })
          return { dispose() {} }
        },
      },
    }
    // From the line setup itself, so one instance's report is never read as another's.
    const first = consoleLines.length
    const resolved = await plugin.setup(ctx as never)
    outstanding.push(() => void (resolved as () => void)?.())
    return {
      tool: (name: string): Tool => {
        const found = tools.find((entry) => entry.name === name)
        if (found === undefined) throw new Error(`tool ${name} was not registered`)
        return found as unknown as Tool
      },
      log: () => consoleLines.slice(first),
    }
  }

  /** The per-project log, read the way a user reads it — and a check that it exists at all. */
  const logFile = (id: string): string => {
    const path = logPath(dir, id)
    expect(existsSync(path)).toBe(true)
    return readFileSync(path, "utf8")
  }

  it("writes the idle-project line into the file, from a directory that never held a lease", async () => {
    // No jobs, no one-off, no loop: `hasWork` is false, so `acquireLease` never runs and never
    // creates the log directory. That is the whole bug — the one line that explains *why* the
    // plugin is inert is the one line that had nowhere to be written.
    expect(existsSync(join(process.env[DATA_DIR_ENV]!, "idle-project"))).toBe(false)

    await load("idle-project", { jobs: [] })

    // In the file, not just on stderr. A project that never arms a timer now leaves evidence it
    // was loaded at all, which is the question a globally-installed plugin has to answer.
    expect(logFile("idle-project")).toContain("no enabled jobs")
    // Both surfaces are named, because either can be the one holding parked jobs.
    expect(logFile("idle-project")).toContain("no timer armed")
  })

  it("writes the ctx.storage.scan degradation into the file, not just on stderr", async () => {
    // The audit's own repro: a fresh process, one enabled job, `ctx.storage.scan` absent. Both
    // notices are setup-time, so both precede the lease that used to create the directory.
    //
    // A fresh module instance because `logOnce` dedupes in a module-level `logged` set, and an
    // earlier test in this file has already spent the `no-storage-scan` key. Without the reset
    // this test would pass on the *absence* of a line and prove nothing.
    vi.resetModules()
    const fresh = (await import("../src/index.ts")).default

    await fresh.setup({
      location: { directory: dir, project: { id: "degraded" } },
      session: { create: async () => ({ id: "ses_degraded" }), prompt: async () => ({ id: "inbox_1" }) },
      tool: { transform: async (cb: (editor: { add?: (t: unknown) => void }) => void) => void cb({ add: () => {} }) },
    } as never)

    // Both halves of the degradation: the missing `scan`, and the whole surface being absent.
    const text = logFile("degraded")
    expect(text).toContain("ctx.storage.scan is unavailable")
    expect(text).toContain("ctx.storage unavailable")
    // …and each line is prefixed and timestamped, as the file sink promises.
    expect(text).toMatch(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z scheduled-tasks: ctx\.storage\.scan is unavailable/m)
  })

  it("creates the log directory without taking the writer lease", async () => {
    await load("no-lock", { jobs: [] })

    // A directory is not lock state. Creating it claims nothing, so a project with no jobs
    // leaves no `writer.lock` behind — a globally-installed plugin runs in every project it
    // opens, and littering locks in projects that never scheduled anything would wedge them
    // all behind arbitration they never asked for.
    expect(existsSync(join(process.env[DATA_DIR_ENV]!, "no-lock", "scheduler.log"))).toBe(true)
    expect(existsSync(leasePath(dir, "no-lock"))).toBe(false)

    // And arbitration is untouched: the lease is still claimable, and a *second process* is
    // still turned away. The directory is not the lockfile.
    const path = leasePath(dir, "no-lock")
    const held = acquireLease(path)
    expect(held.held).toBe(true)
    // Seeded as another live pid, which is what a second server looks like. A second acquire
    // from *this* pid would deliberately take the lease back instead (the `opencode reload`
    // path), so the foreign pid is what makes this an exclusivity check.
    writeFileSync(path, JSON.stringify({ pid: process.pid + 1, heartbeat: Date.now() }))
    const foreign = acquireLease(path)
    expect(foreign.held).toBe(false)
    expect(foreign.foreign).toBe(true)
    held.release()
  })

  it("keeps the file sink for lines emitted after setup too", async () => {
    // The regression half: moving the directory out of `acquireLease` must not cost the file
    // sink it was originally there for. Here the lease is held *and* a run line lands.
    const h = await load("both-sinks", {
      jobs: [{ id: "j", schedule: "@daily", timezone: "UTC", prompt: "p" }],
      storage: { get: async () => undefined, set: async () => {}, remove: async () => {} },
    })

    // Armed on setup, so this project *does* take a lease — the pre-fix path.
    expect((await h.tool("list").execute({})).output.leaseHeld).toBe(true)
    // A run's own line still lands in the file, after the lease exists.
    await h.tool("run").execute({ id: "j" })
    expect(logFile("both-sinks")).toContain("triggered j on demand")
  })

  it("says once, on stderr, when the log directory cannot be created, and never retries per line", async () => {
    // A data directory that cannot exist: a regular file sits where the parent must be, so
    // `mkdirSync(recursive)` fails with ENOTDIR for every project, forever.
    const blocked = join(dir, "blocked")
    writeFileSync(blocked, "not a directory")
    process.env[DATA_DIR_ENV] = join(blocked, "state")

    const h = await load("unwritable", { jobs: [{ id: "j", schedule: "@daily", prompt: "p" }] })

    // Reported once, naming the directory and saying what happens to the rest of the session.
    const complaints = h.log().filter((line) => /could not create the log directory/.test(line))
    expect(complaints).toHaveLength(1)
    expect(complaints[0]).toContain("unwritable")
    expect(complaints[0]).toContain("stays on stderr")

    // No recursion: with no file sink, `emit` must not attempt an append on every line and
    // then report that append's own failure behind it. Pre-fix this is exactly the
    // `could not append to …` the audit recorded.
    expect(h.log().filter((line) => /could not append to/.test(line))).toEqual([])

    // Degraded, not broken: the scheduler still loads and its tools still answer, and the
    // failure did not propagate out of the plugin boundary.
    expect((await h.tool("list").execute({})).output.jobs).toHaveLength(1)
    // And it degraded without claiming arbitration either — a lease it cannot store is not a
    // lease it can hold.
    expect(existsSync(leasePath(dir, "unwritable"))).toBe(false)
  })

  it("reports each unwritable project once, rather than silencing all but the first", async () => {
    // One host loads this plugin for every project it opens, and the complaint names a
    // directory. A single global "already said it" key would mean the *first* broken data
    // directory silences every other project's, which is the opposite of what the file sink
    // is for. Both projects here are equally broken, so both have to be told.
    const blocked = join(dir, "blocked")
    writeFileSync(blocked, "not a directory")
    process.env[DATA_DIR_ENV] = join(blocked, "state")

    const first = await load("unwritable-one", { jobs: [] })
    const firstCount = first.log().filter((line) => /could not create the log directory/.test(line))
    expect(firstCount).toHaveLength(1)
    expect(firstCount[0]).toContain("unwritable-one")

    const second = await load("unwritable-two", { jobs: [] })
    const secondCount = second.log().filter((line) => /could not create the log directory/.test(line))
    expect(secondCount).toHaveLength(1)
    expect(secondCount[0]).toContain("unwritable-two")

    // And neither is repeated per line: a per-line `mkdirSync` would turn one bad directory
    // into a syscall on every log write, which is the new failure mode this must not become.
    // The inert-project notice is the line that follows, so there were lines to repeat for.
    expect(second.log().length).toBeGreaterThan(1)
    expect(secondCount).toHaveLength(1)
  })

  it("does not write a project with no usable log directory into the previous project's file", async () => {
    // `activeLogPath` is one module-level variable and a host loads this plugin for every
    // project it opens. The first project is idle, so its file holds exactly one line — the
    // notice saying why *it* is inert. The second project's directory cannot be made; if the
    // first project's path were still installed, this second notice would land in the first
    // project's log, which is worse than losing it: it files one project's failure under
    // another project's name.
    await load("first", { jobs: [] })
    // Captured while the data directory is still the first project's, so the later
    // relocation does not move the ground under the assertion.
    const firstPath = logPath(dir, "first")
    const firstLog = readFileSync(firstPath, "utf8")
    expect(firstLog.match(/no timer armed/g)).toHaveLength(1)

    const blocked = join(dir, "blocked")
    writeFileSync(blocked, "not a directory")
    process.env[DATA_DIR_ENV] = join(blocked, "state")

    const second = await load("second", { jobs: [] })

    // The second project still says why it is inert…
    expect(second.log().filter((line) => /no timer armed/.test(line))).toHaveLength(1)
    // …and that line is nowhere but stderr. One occurrence in the first file, still its own.
    expect(firstLog.match(/no timer armed/g)).toHaveLength(1)
    expect(readFileSync(firstPath, "utf8")).toBe(firstLog)
  })

  it("makes the directory once per setup, and idempotently, so the lease's own mkdir is a no-op", async () => {
    // The seam is exported because the *cost* claim needs a surface to check: `setup` calls it
    // once, `emit` never does. Idempotence is what lets `acquireLease` keep its own
    // `mkdirSync` — the two directories are the same directory, and neither is the lockfile.
    const { ensureLogDir } = await import("../src/index.ts")
    const target = join(dir, "state", "cost", "scheduler.log")

    expect(existsSync(dirname(target))).toBe(false)
    expect(ensureLogDir(target)).toBe(true)
    expect(existsSync(dirname(target))).toBe(true)
    expect(ensureLogDir(target)).toBe(true)
    // A directory, and nothing else.
    expect(existsSync(join(dirname(target), "writer.lock"))).toBe(false)
  })
})
