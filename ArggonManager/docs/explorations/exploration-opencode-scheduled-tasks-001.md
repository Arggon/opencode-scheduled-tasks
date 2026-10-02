---
exploration_id: 001
title: Cron-style scheduled agent tasks for OpenCode V2
status: complete
created: 2026-10-02
---

# Project exploration: Cron-style scheduled agent tasks for OpenCode V2 (001)

Greenfield record (the six-phase protocol, `.agents/skills/arggon-cli/references/exploration.md`
— ADR 0017). Decisions land in ADRs 0001–0003; hunted edge cases leave this doc as spec
acceptance criteria or explicit non-goals.

## Grounded facts (verified, not assumed)

| Fact | How it was established |
| --- | --- |
| OpenCode V2 has no scheduler: no CLI subcommand, no config field, no API path | 116-path OpenAPI from the live 2.0.22 server; the 50-page V2 docs index; binary string scan (`cronjob` hits are OpenTelemetry `k8s.cronjob.*` attributes, `scheduleTask` is the Effect runtime's fiber scheduler) |
| `warming` is not a scheduler | [Warming](https://opencode.ai/v2/docs/warming/) only sends a discarded keep-alive request to hold provider prompt caches |
| A plugin may `setup(ctx)` → cleanup, and register tools via `ctx.tool.transform` | V2 plugin guide |
| `@opencode/plugin` **static import fails** to load an auto-discovered plugin in a dependency-less tree on 2.0.7/2.0.8/2.0.10/2.0.12 | ArggonManager playbook, confirmed in `opencode/plugins/arggon/index.ts:4356` |
| Every `ctx` API must be feature-detected (`ctx.session.rename` absent on 2.0.7; `ctx.session.update` is the fallback) | same file, lines 1135–1150 |
| A plugin tool receives **no directory** — only `sessionID` | same file, lines 1310–1314 |
| `ctx.storage` has **no HTTP endpoint** — it is plugin-internal | live OpenAPI has no storage path |
| `ctx.storage` scoping across two server processes is **unverified** | no docs, no endpoint |

## Classification

**Greenfield.** A new project; no existing flow to extend; other repos will depend on the
job-file schema. Full protocol; the ADR 0017 hard gate applies before implementation.

## Frontier-rounds log

**R1 — outcome/users.** A single developer on a workstation, with an OpenCode server up
most of the day. Not a multi-tenant production scheduler. Settles: single-writer safety
matters (two servers = double spend) but full distributed scheduling does not; "must fire
even when the server is down" stays a documented escape hatch (OS cron), not a v1 feature.

**R2 — scope/decomposition.** v1 = declarative job file + tick engine + one persistent
session per job + two read/trigger tools. Runtime job CRUD is **out**: it would split the
source of truth between a reviewed file and mutable runtime state.

**R3 — constraints.** Grounded from the ArggonManager plugin: dependency-free, single-file,
Node builtins only, **no** `@opencode/plugin` import, plain default-export definition
object, structural (not imported) context types, every path feature-detected and
failure-isolated so the plugin can never break a session.

**R4 — data.** Job schema is a versioned `.opencode/schedules.json` in the repo. Mutable run
state (`lastRun`/`nextRun`/`leaseUntil`/`lastStatus`) lives in `ctx.storage` under a
namespaced prefix, never in the job file.

**R5 — interfaces.** Two tools: `schedules_list` (pure read: computed `nextRun`, `lastRun`,
`lastStatus`) and `schedules_run` (ad-hoc trigger, returns the admitted inbox id).

**R6 — failure/edge.** Resolved in the hunt table below.

**R7 — ops/security.** Threat model: a job runs with the target session's existing agent,
model and permissions. The plugin adds **no** new authority and no sandbox; a hostile repo
that adds a job inherits exactly the power that repo's own `permissions` config already
grants it. Documented, not engineered around.

**R8 — rollout.** Single repo. Ships as an npm package plus the vendored-single-file
install pattern ArggonManager already proves works with zero `node_modules`.

## Edge cases

| Dimension | Hunted case | Resolution |
| --- | --- | --- |
| input validation / hostile input | Malformed cron; a schedule that can never match (`0 0 30 2 *`); duplicate job ids; a job id used as a path component | Invalid cron disables that job with a named error at load — never silently skipped; impossible-schedule detected at parse; ids validated `^[a-z0-9][a-z0-9._-]*$`; job cap enforced |
| empty/loading/error states | No job file; invalid JSON; zero enabled jobs | Absent file → inert but tools still registered and list empty; invalid JSON → last-known-good retained, error logged once, tools report it; zero enabled → no timer armed |
| concurrency / idempotency | Two servers; overlapping ticks; a run still in flight at the next occurrence; tick re-entrancy | Cross-process lockfile (ADR 0003); single in-flight tick promise; per-job in-flight set — an overlapping occurrence is skipped and recorded; overlapping occurrences are **not** queued |
| failure/retry/timeout | Model call fails; a run hangs awaiting an unanswerable permission | `lastStatus=failed`, **no** retry within the occurrence (no cost storm); `runTimeoutMs` bounds the run and interrupts the session |
| authn/authz | A scheduled prompt triggers a permission prompt no human will ever answer | Same `runTimeoutMs` bound + interrupt; documented that unattended jobs must not need interactive approval |
| limits/quota/perf | Every tick is a real, billable model call; tick cost must not grow with wall-clock | `misfire` cap + global max-concurrent-runs; `nextRun` advanced arithmetically (no re-scan of elapsed time) so a tick is O(jobs), not O(missed minutes) |
| time/timezones/locale | DST spring-forward (a local time that does not exist); fall-back (a local time twice); host `TZ` leaking into behavior | Per-job IANA timezone, default = server local. Nonexistent local time → that day is skipped. Repeated local time → fires once, at the first occurrence. Correctness never depends on the `TZ` env var |
| persistence/migration/rollback | Storage absent on some host; corrupt state entry; a newer plugin version's state | `ctx.storage` feature-detected: absent → in-memory state, jobs still run, cross-restart continuity lost (documented). Corrupt entry → dropped, `nextRun` recomputed. State carries a schema version; an unknown version is ignored and re-initialized |
| observability/debuggability | A job silently not firing | Every fire/skip/error logs one bounded `console.error` line; `schedules_list` exposes `nextRun`/`lastRun`/`lastStatus` per job |
| security/threat model | A hostile repo adds a job that runs arbitrary tools on a schedule | Documented as inherited authority (R7). The plugin grants nothing and sandboxes nothing — non-goal |
| environment/platform | Timer holding the process open; Windows paths | `unref()` the interval so it never keeps the server alive; lockfile path built with `node:path` |
| upgrade/data-loss | Upgrading wipes run history; key collision with another plugin | Storage keys namespaced under one prefix; an upgrade never deletes run history; uninstall leaves inert state behind |

## Approaches considered

**A — Single tick loop over a declarative job file.** One `unref()`ed `setInterval` at a
fixed cadence; each tick evaluates every enabled job's `nextRun` and fires the due ones.
*Trade-offs:* accuracy is bounded by the cadence (default 30 s), which is irrelevant for
work whose unit is a multi-second model call. In exchange: one timer, trivially testable
with an injected clock, disposal is a single `clearInterval`, and catch-up is one
expression instead of N re-armed timers.

**B — Per-job chained `setTimeout`.** Each job arms its own timer for its exact next
occurrence. *Trade-offs:* marginally tighter timing, but N timers, a re-arm path on every
fire and every reload, and the same timezone/DST arithmetic either way. More failure modes
for accuracy nobody needs.

**C — Delegate to OS cron / systemd timers** shelling `opencode run`. *Trade-offs:* survives
server downtime and is OS-native — but it is not a plugin, it is platform-specific, it
loses session continuity, and it cannot see OpenCode state.

**Recommendation: A**, with **C documented as the documented escape hatch** for a job that
must fire while the server is down. B is rejected outright.

## Decision

- [ADR 0001](../adr/0001-tick-loop-over-declarative-jobs.md) — tick loop; declarative job
  file is the source of truth; `ctx.storage` holds only mutable run state.
- [ADR 0002](../adr/0002-misfire-and-cost-bounds.md) — misfire policies and the cost bounds
  that keep a sleeping server from becoming a cost incident.
- [ADR 0003](../adr/0003-cross-process-writer-lock.md) — lockfile-based single-writer lease,
  which also removes the dependence on the unverified `ctx.storage` cross-process scoping.

Then: the [spec](../specs/spec-opencode-scheduled-tasks-001.md) with every hunted case above
as an acceptance criterion, and the
[plan](../plans/plan-opencode-scheduled-tasks-001.md).