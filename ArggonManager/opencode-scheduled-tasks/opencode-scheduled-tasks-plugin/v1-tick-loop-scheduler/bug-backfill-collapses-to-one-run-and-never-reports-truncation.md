---
type: bug
status: in_progress
id: bug-backfill-collapses-to-one-run-and-never-reports-truncation
title: misfire backfill collapses every missed occurrence into one run and reports truncation nowhere
assignee: arggon
branch: fix/bug-backfill-collapses-to-one-run-and-never-reports-truncation
parent: v1-tick-loop-scheduler
labels: []
priority: p1
created: "2026-10-02"
updated: "2026-10-02"
claimed_at: "2026-10-02T22:42:34.046Z"
---
<!--
  Placement (v0): ArggonManager/opencode-scheduled-tasks/opencode-scheduled-tasks-plugin/v1-tick-loop-scheduler/bug-backfill-collapses-to-one-run-and-never-reports-truncation.md
  Leaves live only under a story. id is the filename stem: bug-backfill-collapses-to-one-run-and-never-reports-truncation.
  CLI `arggon create bug backfill-collapses-to-one-run-and-never-reports-truncation` adds the bug- prefix (do not pass it twice).
  parent MUST be the story id. Omit assignee when unassigned. Omit blocked_reason unless status is blocked.
-->

# misfire backfill collapses every missed occurrence into one run and reports truncation nowhere

## Context

Found by `task-audit-spec-001-acceptance-boxes`: **spec 001 box 120 is false.** The audit's verdict is
recorded on the box in the spec, with the reproduction.

`misfire: "backfill"` neither replays what the box says nor reports what it dropped.

- `resolveDue` folds up to `maxCatchUp` occurrences into **one** decision
  (`occurrence.collapsed = N`, `dueAt` = the oldest), and `tick` dispatches it **once**. The box says
  "replays at most `maxCatchUp` occurrences, oldest first".
- `occurrence.dropped` / `droppedCapped` are read by **nothing at all**. The `backlog-truncated`
  suppression that would print them (src/index.ts:3451) is never returned, so the second clause —
  "reports the dropped remainder as truncated in the run record" — has no code behind it either.

**Reproduction:** a job with `misfire: "backfill"`, `maxCatchUp: 3`, and five missed hourly
occurrences produces **one** `session.prompt`, one history record
`{dueAt, startedAt, outcome, model, sessionID}` with no collapsed/dropped field, and no truncation
line in the log or the file.

ADR 0002 promises the remainder is "dropped and reported as truncated in the run record, **never
silently**". Today it is exactly that: silently. A user who slept through five hourly runs and set
backfill to catch up is told nothing about the four that were not replayed.

## Acceptance

- [ ] `backfill` replays up to `maxCatchUp` occurrences oldest-first, **each dispatched**, or the
      spec and ADR 0002 are amended to state the collapse deliberately — with the reason.
- [ ] Whatever is dropped is reported: a `backlog-truncated` line **and** a field in the run record
      carrying `dropped` / `droppedCapped`, so "never silently" is true of both sinks.
- [ ] A test pins it end to end with an injected clock: five missed occurrences, `maxCatchUp: 3`,
      assert the number of dispatches **and** the reported remainder.
- [ ] Decide whether `collapsed` should survive into the record. If a collapsed N is genuinely the
      desired behaviour, the record must say so rather than looking like a single occurrence.

## Notes

Filed by the coordinator from the spec 001 audit. Do not resolve this by amending the box away: the
box describes what ADR 0002 decided, and ADR 0002 is Accepted. Either the code catches up or the ADR
is reopened with a stated reason.

### 2026-10-02 @ses_f013665f9ffely2FIi15oCRuFJ
## Option 1: replay each occurrence. ADR 0002 stands.

The box and ADR 0002 say the same thing and the code said a third thing, so the code changed. I did not
amend ADR 0002 (Accepted) or the box, and I do not think it is wrong — see "On the ADR" below.

**Five-occurrence backlog, `maxCatchUp: 3`, end to end.** The tick that finds the backlog dispatches the
**oldest** occurrence only, writes `schedules-tasks/<job>` with a `catchUp` plan holding the two it did not
run plus `dropped: 2`, and logs `backlog truncated for <job>: backlog truncated, 2 occurrence(s) dropped`.
The next two ticks each dispatch one occurrence oldest-first. Result: **3 `session.prompt` calls**, **3 run
records** `{dueAt, startedAt, outcome, model, sessionID, dropped: 2}`, one truncation line, plan drained
(`catchUp` absent). Not three prompts at once — one per tick, so one tick's cost is still one run and the
shared `claimed` budget still governs admission across all three drains.

**Both sinks.** Log: the line above, once per backlog (`occurrence.backlogFound` gates it so a 3-occurrence
replay does not repeat it three times), plus the clause appended to any `skipping <job>` line when that
decision also had a remainder. Record: `dropped`/`droppedCapped` on **every** record of that backlog —
each of those records is an occurrence of a cut-short backlog, so a reader holding any one is owed the fact.
Survives the storage round-trip (`loadHistory` preserves it) and `schedules_history` projects it. Absent
when there was no remainder, so absence answers "this run was the whole backlog".

**`collapsed` survives, as 1.** A decision is one occurrence now, and `dropped` carries what it did not
run. Keeping the field means "this run stood for a backlog" is answerable; its honest value is no longer
"several".

**Two consequences worth the coordinator's eye, both deliberate:**
- A replay that finds no free slot is now **deferred, not spent** (`lastStatus` is left alone — nothing was
  skipped). `skip` still spends it; collapsing the window is that policy's whole decision. Cost is time, not work.
- `skip` shares the reporting sink: a collapsed run records `dropped` too. ADR 0002 Consequences already
  promise "the run record says so" for dropped occurrences, so this is the same promise, paid.

**Cost item (`bug-tick-cost-grows-with-sleep-not-with-jobs`): I did NOT remove the discarded computation.**
`missedOccurrences` still walks up to `MAX_BACKLOG_SCAN`. The walk is now *load-bearing* — it produces the
number ADR 0002 requires in the record — so that item's premise ("walks 1000 occurrences to log a number
nobody reads") no longer holds and **its remedy must change**: the fix there is no longer "stop computing
it", it is "compute it without the walk" (an arithmetic/iterative estimate, or counting only while a
remainder is actually owed). Measured after this fix (one `0 * * * *` job, `skip`, real clock): 1h 11.9ms,
8h 1.0ms, 24h 1.0ms, 720h 25.4ms, 8760h 30.3ms with `dropped: 1000, droppedCapped: true`; draining a 720h
backlog costs 25-41ms **once**, and the next ordinary tick is 0.17-0.19ms. **Do not merge these intents blind** —
tell that item's worker the walk is now load-bearing.

**Mutation checks.** Every one of these turned a test red (each applied to the fixed tree, then reverted):
1. restore the silent collapse (plan never created) → 3 red
2. drop `dropped`/`droppedCapped` from the record → 2 red
3. drop the truncation log line → 2 red
4. drop the clause from the `skipping` line → 1 red (needed a second assertion first — see "test weakness")
5. `loadHistory` stops preserving the stored remainder → 1 red
6. suppression spends the replayed occurrence → 1 red
7. replay newest-first instead of oldest-first → 3 red
8. ignore `maxCatchUp` (replay the whole window) → 3 red
9. plan not restored on load → 1 red

**Test weakness found and closed.** Mutation 4 initially passed 7/7 — the suppression-line clause had no
test at all. I added one (the deferral test now asserts `skipping catchup: previous run still in flight; … 2
occurrence(s)`) and M4 then went red. Flagging it because it is exactly the failure mode the audit's
standard exists to prevent, and it was in a line I had just written.

**Untestable / limits.**
- The `droppedCapped` lower bound is pinned at the unit level (1010-minute minutely backlog → `dropped: 1000,
  droppedCapped: true`). Not driven end to end: it needs a >1000-occurrence backlog, which means a tick loop
  replaying 50 capped runs under a fake clock — real minutes, and slow. The unit test covers the arithmetic;
  the path from it to the record is covered by the ordinary remainder tests.
- `MAX_BACKLOG_SCAN` is not exported, so the bound is asserted as a literal 1000.
- Restart durability is tested by disposing the instance and re-`setup`ing over the same storage map, not a
  separate process. It exercises the load path (`normalizeState` → `catchUp`), which is the part that can
  regress; a real process boundary would additionally test the storage serializer, which is the host's.
- Spec 001 **box 120 is still unticked.** T7/you own the spec; I touched no spec, ADR, README or tracker file.

**Gates.** `npx tsc --noEmit` clean · `npx vitest run` **245 passed** (234 + 11; full suite run 4× plus the
new suite 8× — no flakiness, all fake-clock with predicate advances) · `npx tsx harness/smoke.ts` PASS ·
`arggon validate` ok (0 warnings) · `arggon spec analyze` clean. Branch `fix/bug-backfill-collapses-to-one-run-and-never-reports-truncation`, one commit, `src/index.ts` + `test/index.test.ts` only.

**On the ADR.** I do not think ADR 0002 is wrong. Replaying N times is the literal decision, and `maxCatchUp`
(default 5, hard max 50) plus the shared `claimed` budget are the cost bound it already promised — five billable
runs is what a user who explicitly opted into catch-up asked for. What the ADR lacked was the *mechanism* for
"one occurrence per dispatch without a tick blocking on N runs", and that mechanism is the plan this adds.
Cost observation for whoever re-opens it: a `maxCatchUp: 50` job now spends up to 50 billable runs where it
previously spent 1 — but only if the user set 50, and only `backfill`, which is opt-in per job and is
`skip`'s default sibling. That is the trade the ADR made deliberately; I would not reopen it on that basis.

### handoff 2026-10-02 @ses_f013665f9ffely2FIi15oCRuFJ (session: ses_f013665f9ffely2FIi15oCRuFJ) — next: Coordinator: review + merge, then tick spec 001 box 120; tell bug-tick-cost-grows-with-sleep-not-with-jobs that the MAX_BACKLOG_SCAN walk is now load-bearing, so its fix must cheapen the count, not r…
- branch: fix/bug-backfill-collapses-to-one-run-and-never-reports-truncation
- open questions: Is deferred-not-spent right for a backfill replay, or should a full budget still spend it? Spec 001 box 120 left unticked (spec owned by T7); skip-policy truncation reporting is a scope judgement to …
