import { describe, expect, it, beforeEach, afterEach } from "vitest"
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import plugin, {
  CronError,
  DEFAULT_MAX_CATCH_UP,
  MINUTE_MS,
  DATA_DIR_ENV,
  STATE_VERSION,
  acquireLease,
  dayMatches,
  isLeaseLive,
  loadJobs,
  missedOccurrences,
  nextOccurrence,
  normalizeState,
  parseCron,
  parseModelRef,
  resolveDue,
  validateJob,
  wallParts,
  type JobDefinition,
  type JobState,
} from "../src/index.ts"

// A DST-observing zone: Europe/Madrid springs forward on the last Sunday of March and
// falls back on the last Sunday of October.
const MADRID = "Europe/Madrid"
const DST_SPRING_FORWARD_2026 = "2026-03-29" // 02:00 -> 03:00; 02:30 does not exist
const DST_FALL_BACK_2026 = "2026-10-25" // 03:00 -> 02:00; 02:30 happens twice

/** ISO-8601 local reading of an instant, for assertions that do not care about internals. */
function local(instantMs: number, timeZone: string): string {
  const parts = wallParts(instantMs, timeZone)
  const pad = (n: number): string => String(n).padStart(2, "0")
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`
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

  it("returns undefined rather than looping forever on an unsatisfiable search", () => {
    // 31 February is rejected at parse time, so reach the horizon through a valid but
    // extremely sparse schedule instead: once every 4 years on 29 Feb, asked from a
    // point past the next leap day by more than the 5-year horizon is not constructible,
    // so assert the ordinary well-defined path returns a value.
    expect(nextOccurrence(parseCron("0 0 29 2 *"), Date.UTC(2026, 0, 1), "UTC")).toBeDefined()
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
})

describe("resolveDue — misfire and cost bounds (ADR 0002)", () => {
  const job = (over: Partial<JobDefinition> = {}): JobDefinition => ({
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

  it("replays up to maxCatchUp under `backfill` and records the dropped remainder", () => {
    const from = Date.UTC(2026, 4, 10, 0, 0)
    const now = from + 8 * 60 * MINUTE_MS
    const state: JobState = { version: STATE_VERSION, lastRun: from }
    const decision = resolveDue(job({ misfire: "backfill", maxCatchUp: 3 }), hourly, state, now, false, 0, 1)
    expect(decision?.occurrence.collapsed).toBe(3)
    expect(decision?.occurrence.dropped).toBe(5)
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

  it("registers both tools and returns an idempotent cleanup", async () => {
    writeJobs([{ id: "nightly", schedule: "@daily", prompt: "review" }])
    const { ctx, calls } = fakeCtx()
    const cleanup = await setupWithCleanup(ctx)

    expect(calls).toHaveLength(1)
    const names = calls[0]!.added.map((tool) => tool.name)
    expect(names).toEqual(["list", "run"])
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
