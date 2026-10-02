/**
 * Real-time integration harness: drives the actual plugin against a fake context and a
 * real `.opencode/schedules.json`, on a real clock. This is the check that unit tests with
 * an injected `now` cannot make — that the setInterval loop, the storage round-trip and the
 * `session.prompt` call actually happen together, over wall-clock time.
 *
 * Run: npx tsx harness/smoke.ts   (or: node --experimental-strip-types harness/smoke.ts)
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import plugin, { DATA_DIR_ENV } from "../src/index.ts"

const TICK_MS = Number(process.env.SMOKE_TICK_MS ?? 5_000)

/**
 * How long to wait: to the next minute boundary, plus one tick, plus slack.
 *
 * A fixed wait made this harness flaky — the job only becomes due at a minute boundary, so
 * a 25s window passed and a 30s window failed purely by where in the minute it started.
 * Deriving the window from the clock makes it deterministic.
 */
function waitForFirstOccurrence(): number {
  const toNextMinute = 60_000 - (Date.now() % 60_000)
  const override = Number(process.env.SMOKE_WAIT_MS)
  return Number.isFinite(override) && override > 0 ? override : toNextMinute + TICK_MS + 5_000
}

const WAIT_MS = waitForFirstOccurrence()
const dir = mkdtempSync(join(tmpdir(), "st-smoke-"))
mkdirSync(join(dir, ".opencode"), { recursive: true })
process.env[DATA_DIR_ENV] = join(dir, "state")

writeFileSync(
  join(dir, ".opencode", "schedules.json"),
  JSON.stringify({
    version: 1,
    jobs: [
      {
        id: "dogfood-smoke",
        schedule: "* * * * *",
        timezone: "Europe/Madrid",
        prompt: "Reply with exactly: SCHEDULER-OK.",
      },
    ],
  }),
)

const prompts: Record<string, unknown>[] = []
const store = new Map<string, unknown>()

const ctx = {
  // A short tick so the harness observes a decision within its window.
  options: { tickMs: TICK_MS },
  location: { directory: dir, project: { id: "smoke" } },
  storage: {
    get: async (key: string) => store.get(key),
    set: async (key: string, value: unknown) => void store.set(key, value),
    remove: async (key: string) => void store.delete(key),
  },
  session: {
    create: async () => ({ id: "ses_smoke_1" }),
    prompt: async (input: Record<string, unknown>) => {
      prompts.push(input)
      console.log(`[harness] prompt admitted -> ${JSON.stringify(input)}`)
      return { id: `inbox_${prompts.length}` }
    },
  },
  tool: {
    transform: async (cb: (editor: { add?: (t: unknown) => void }) => void) => {
      const added: Array<Record<string, unknown>> = []
      cb({ add: (t) => added.push(t as Record<string, unknown>) })
      console.log(`[harness] tools registered: ${added.map((t) => t.name).join(", ")}`)
      return { dispose: () => {} }
    },
  },
}

const started = Date.now()
const cleanup = await plugin.setup(ctx as never)
console.log(`[harness] setup done at ${new Date(started).toISOString()}; waiting ${WAIT_MS}ms`)

await new Promise((resolve) => setTimeout(resolve, WAIT_MS))

console.log(`[harness] prompts admitted: ${prompts.length}`)
console.log(`[harness] storage keys: ${[...store.keys()].join(", ") || "(none)"}`)
console.log(`[harness] stored state: ${JSON.stringify([...store.values()])}`)

;(cleanup as () => void)?.()
rmSync(dir, { recursive: true, force: true })

if (prompts.length === 0) {
  console.error("[harness] FAIL: no prompt was admitted; the loop never fired")
  process.exit(1)
}
console.log("[harness] PASS: the scheduler admitted a scheduled prompt on a real clock")
process.exit(0)