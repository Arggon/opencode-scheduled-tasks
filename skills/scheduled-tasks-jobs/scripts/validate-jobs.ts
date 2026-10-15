// Validate a project's scheduled jobs with the plugin's own loaders, offline.
// Usage (from a clone of https://github.com/Arggon/opencode-scheduled-tasks, after `npm install`):
//   npx tsx skills/scheduled-tasks-jobs/scripts/validate-jobs.ts <project-dir> [path/to/index.ts]
// Reads <project-dir>/.opencode/schedules.json and <project-dir>/.opencode/tasks/*.md.
// No network access, no writes. Exit code 1 if any job or file is refused.
import { readFileSync, existsSync } from "node:fs"
import { join, resolve } from "node:path"
import { pathToFileURL } from "node:url"

const [projectArg, pluginArg] = process.argv.slice(2)
if (!projectArg) {
  console.error("usage: validate-jobs.ts <project-dir> [path/to/plugin/index.ts]")
  process.exit(2)
}
const project = resolve(projectArg)
const pluginPath = resolve(pluginArg ?? join(import.meta.dirname, "../../../src/index.ts"))
if (!existsSync(pluginPath)) {
  console.error(`plugin source not found at ${pluginPath}; pass its path as the 2nd argument`)
  process.exit(2)
}
const p = await import(pathToFileURL(pluginPath).href)

let json = { jobs: [], invalid: [] } as any
const jsonPath = join(project, ".opencode", "schedules.json")
if (existsSync(jsonPath)) {
  try {
    json = p.loadJobs(JSON.parse(readFileSync(jsonPath, "utf8")))
  } catch (e) {
    json = { jobs: [], invalid: [], error: `schedules.json is not valid JSON: ${(e as Error).message}` }
  }
}
const md = await p.loadMarkdownJobs(join(project, ".opencode", "tasks"))
const merged = p.mergeJobSources(json, md)

let bad = false
for (const err of [json.error, md.error, merged.error].filter(Boolean)) {
  bad = true
  console.log(`FILE ERROR: ${err}`)
}
const now = Date.now()
for (const job of merged.jobs) {
  const next = p.nextOccurrence(p.parseCron(job.schedule), now, job.timezone)
  console.log(
    `OK  ${job.id}  "${job.schedule}" ${job.timezone}  model=${job.model ? JSON.stringify(job.model) : "(session default!)"}  ` +
      `misfire=${job.misfire} maxCatchUp=${job.maxCatchUp} runTimeoutMs=${job.runTimeoutMs} ` +
      `session=${job.session} enabled=${job.enabled}  next=${next === undefined ? "none" : new Date(next).toISOString()}`,
  )
}
for (const inv of merged.invalid) {
  if (!String(inv.reason ?? "").includes("shadow")) bad = true
  console.log(`REFUSED/REPORTED  ${JSON.stringify(inv)}`)
}
if (merged.jobs.length === 0 && !bad) console.log("no jobs found")
process.exit(bad ? 1 : 0)
