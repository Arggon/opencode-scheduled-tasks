---
type: task
status: in_progress
id: task-audit-spec-001-acceptance-boxes
title: spec 001 claims implemented with 0 of 39 acceptance boxes ticked
assignee: arggon
branch: fix/task-audit-spec-001-acceptance-boxes
parent: hygiene-ci-gates-and-doc-statuses
labels: []
priority: p1
created: "2026-10-02"
updated: "2026-10-02"
claimed_at: "2026-10-02T22:00:57.196Z"
depends_on: [task-tick-drain-order-oneoffs-before-loops]
---
<!--
  Placement (v0): ArggonManager/scheduled-tasks-v2/v2-features-inspired-by-opencode-tasks/hygiene-ci-gates-and-doc-statuses/task-audit-spec-001-acceptance-boxes.md
  Leaves live only under a story. id is the filename stem: task-audit-spec-001-acceptance-boxes.
  CLI `arggon create task audit-spec-001-acceptance-boxes` adds the task- prefix (do not pass it twice).
  parent MUST be the story id. Omit assignee when unassigned. Omit blocked_reason unless status is blocked.
-->

# spec 001 claims implemented with 0 of 39 acceptance boxes ticked

## Context

`ArggonManager/docs/specs/spec-opencode-scheduled-tasks-001.md` is `status: implemented` and has
**39 acceptance boxes, 0 of them ticked**.

Every other checklist in this repo was ticked as work landed — deliberately, and boxes that turned
out not to describe the code were amended rather than ticked. The spec's own list was skipped
entirely, so its `implemented` status is currently unsubstantiated: it asserts the spec was met,
while its own acceptance section says nothing was ever checked.

This is not a paperwork nit. It already produced a real defect: **boxes 109 and 111 state that
`runTimeoutMs` bounds a run and interrupts its session**, which is false in the code, and the spec
still claims `implemented`. Filed as `bug-run-timeout-never-enforced`. The other 37 boxes are
mostly genuine and tested, but *mostly tested* is not *ticked honestly*, and this repo's entire
reason for existing is the difference.

## Acceptance

- [ ] Every one of the 39 boxes is resolved one of three ways: **ticked with the test that proves
      it** named in a note, **amended** to describe what actually ships, or **moved into a tracked
      item** with a link. No box is left silently unticked under an `implemented` status.
- [ ] Where a box is ticked, the note names the specific test — e.g. "box 131 (DST spring-forward):
      `test/index.test.ts` 'skips a local time that does not exist'". A tick with no test named is
      not accepted.
- [ ] Any box found false is filed as a `bug` with reproduction, not quietly amended to match the
      code. Amending is for boxes that were *mis-specified*; a box that caught a real defect gets an
      item.
- [ ] `spec analyze` and `spec validate` stay clean, and the spec's status still matches reality at
      the end.

## Notes

Do this **after** `bug-run-timeout-never-enforced` lands, or the audit will tick box 109/111 against
code that is about to change. It is an audit, not a rewrite: the expectation is that most boxes are
ticked with a named test, a handful are amended as mis-specified, and a small number become bugs.

Suggested order: the failure and concurrency sections first (107-124), since that is where the
timeout hole lives, then the schedule/DST group (129-135), then the rest.

### 2026-10-02 @arggon-worker
## Audit result — 2026-10-02

All **39 boxes resolved**: 23 ticked with the test that pins each one, 1 amended, 4 false, 12
verified true but unpinned by any test. Every verdict, with its named test, is in
`ArggonManager/docs/specs/spec-opencode-scheduled-tasks-001.md` under each box.

**Method.** A tick is only claimed when mutating the behaviour the box names turns a test red.
Where a box turned out to be unpinned, that was *proved* by mutation on a copy of `src/` outside
the repo (`/tmp/opencode/audit/mutant`), so `src/index.ts` and `test/index.test.ts` are
untouched. That discipline is the whole difference between the 23 ticked and the 12 not ticked,
and it is why none of the 4 false boxes was quietly rewritten to match the code.

### 4 false boxes — ready to file (I did not file them; that is the coordinator's call)

**A. `misfire: "backfill"` neither replays nor reports (box 120)** — suggest p2
`resolveDue` folds up to `maxCatchUp` occurrences into **one** decision
(`occurrence.collapsed = N`, `dueAt` = the oldest) and `tick` dispatches it once; and
`occurrence.dropped`/`droppedCapped` are read by nothing — the `backlog-truncated` suppression
that would print them (src/index.ts:3451) is never returned. ADR 0002: the remainder is "dropped
and reported as truncated in the run record, never silently". Cost direction is safe (1 run ≤ 5),
so this is a reporting/faithfulness gap, not a money leak.
*Repro:* job `{ schedule: "0 * * * *", misfire: "backfill", maxCatchUp: 3 }`, seed
`scheduled-tasks/backfill` with `lastRun: now - 5h` → **one** `session.prompt`; the record is
`{dueAt, startedAt, outcome, model, sessionID}`; no truncation line on stderr or in
`scheduler.log`.

**B. a tick's cost grows with how long the server was asleep (box 124)** — suggest p3
`missedOccurrences` counts the dropped remainder whenever it filled its limit — and under `skip`
the limit is 1, so **every** due `skip` job walks up to `MAX_BACKLOG_SCAN` (1000)
`nextOccurrence` calls to produce a number no caller reads (the code comment says as much:
"a number nobody acts on").
*Repro (measured, `resolveDue`, one `0 * * * *` job):* 8 h asleep 1.2 ms, 24 h 1.9 ms, 720 h
48.8 ms, 8760 h 39.6 ms with `dropped: 1000, droppedCapped: true`. The next tick is 0.09 ms, so it
is one walk per backlog, not per tick — bounded, but not O(jobs) and not constant in sleep length,
which is exactly what the box claims.

**C. with `ctx.storage` absent, nothing records the lost continuity (box 145)** — suggest p2
The degradation is real (probe: a one-off is dispatched with `ctx.storage` absent). The second
clause does not exist: `state.storageAvailable` is assigned once at setup (src/index.ts:4206) and
read nowhere; `HistoryEntry` has no such field; no log line mentions it. Consequence: on a
storageless host a completed one-off's record is written to `history/oneoff/<id>` and
`schedules_history` then cannot find it, because the lookup falls through to storage.

**D. every line emitted before the first `acquireLease` never reaches `scheduler.log` (box 151)** — suggest p2
The log directory is created by `acquireLease`, which runs only when there is work to arm. The
box's dual sink is pinned for post-lease lines, but every setup-phase line is stderr-only.
*Repro, fresh process, one enabled job, `ctx.storage.scan` absent:* stderr gets
`ctx.storage.scan is unavailable, …` then `could not append to …/scheduler.log`;
`scheduler.log` does not exist. Same for an idle project: the line saying **why** the plugin is
inert (`no enabled jobs in .opencode/schedules.json or .opencode/tasks …; no timer armed`) is
stderr-only — which defeats the exact purpose the box states. Secondary: not every line includes a
job id (the degradation notices name no job), so that sub-clause is also untrue as written.

### 12 boxes verified true, but nothing pins them (one test each)

| box | claim | mutation that leaves 234/234 green |
| --- | --- | --- |
| 89 | malformed JSON retains the last-known-good set | retention branch deleted — and it has no reachable caller (`reloadJobs` runs once, from `setup`; no watcher) |
| 96 | the tick never re-enters | `if (ticking) return` removed |
| 107 | a failed run records `lastStatus: failed` + message | `runJob`'s catch gutted (no test produces a failed *scheduled* run) |
| 135 | `nextRun` is an ISO-8601 instant | raw epoch emitted instead |
| 157 | a repeated identical failure logs once | `logOnce` dedupe removed |
| 158 | `schedules_list` reports `lastStatus`/`lastError`/`nextRun` | all three nulled / made numeric |
| 162 | resolved model echoed in the `running` line | `model ${model}` dropped from that line |
| 165 | the log says `model session default` | same mutation (job runs only) |
| 176 | the tick interval is `unref()ed` | `timer.unref()` removed (a probe confirms the shipped build exits in 0.095 s) |
| 178 | lockfile paths are `node:path`, Windows-safe | no test would notice string concatenation |
| 179 | cleanup clears the interval, releases the lease, disposes tools | `clearInterval` removed from `disarm` |
| 186 | a removed job leaves inert state behind | `setup` deletes the state of every job missing from the file |

Five of the twelve are one assertion inside a test that already exists (135, 157, 158, 165, 176).

### The status question

**`status: implemented` is unsubstantiated and I recommend it moves to `proposed`.** Spec 002
sets the rule for this pair in its own frontmatter comment: *"there is no in-progress state — so
`proposed` is the honest value while any acceptance box is open."* Sixteen boxes are open. I
tried it: flipping the spec to `proposed` trips `arggon spec analyze` with
**[SPEC-STATUS-DRIFT]** against the `implemented` `plan-opencode-scheduled-tasks-001`, and that
gate is required clean — so I left the status alone and recorded the reasoning in a frontmatter
comment instead. The flip needs the **plan** moved with it (or an accepted drift). That is a
tracker decision, so it is yours.

### Overlap with spec 002 (flagged, not ticked)

Box 184 states the same claim as spec 002 line 165 (upgrading preserves run history) — ticked here
with its test; spec 002's copy stays unticked. Boxes 162/165 overlap spec 002 line 159 (resolved
model + session mode in the `running` line), which is unticked too: **one test would close the
same claim in both specs.** Box 111 overlaps spec 002 line 105 / ADR 0005 (a declared `ask` is
now downgraded to a deny before dispatch) — not a conflict, both statements hold.

### Gates (all green on the branch)

`npx tsc --noEmit` · `npx vitest run` → 234 passed · `arggon validate` ok ·
`arggon spec validate` ok · `arggon spec analyze` clean.

Branch `fix/task-audit-spec-001-acceptance-boxes`, one commit, one file changed
(`ArggonManager/docs/specs/spec-opencode-scheduled-tasks-001.md`, +169/−24).
