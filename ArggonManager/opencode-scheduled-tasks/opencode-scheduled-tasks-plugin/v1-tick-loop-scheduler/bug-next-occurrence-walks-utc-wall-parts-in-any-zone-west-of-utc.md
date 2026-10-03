---
type: bug
status: todo
id: bug-next-occurrence-walks-utc-wall-parts-in-any-zone-west-of-utc
title: nextOccurrence advances by |offset|+1 minutes in any zone west of UTC — a minutely job in New York fires every 4 hours
parent: v1-tick-loop-scheduler
labels: []
priority: p0
created: "2026-10-03"
updated: "2026-10-03"
---
<!--
  Placement (v0): ArggonManager/opencode-scheduled-tasks/opencode-scheduled-tasks-plugin/v1-tick-loop-scheduler/bug-next-occurrence-walks-utc-wall-parts-in-any-zone-west-of-utc.md
  Leaves live only under a story. id is the filename stem: bug-next-occurrence-walks-utc-wall-parts-in-any-zone-west-of-utc.
  CLI `arggon create bug next-occurrence-walks-utc-wall-parts-in-any-zone-west-of-utc` adds the bug- prefix (do not pass it twice).
  parent MUST be the story id. Omit assignee when unassigned. Omit blocked_reason unless status is blocked.
-->

# nextOccurrence advances by |offset|+1 minutes in any zone west of UTC — a minutely job in New York fires every 4 hours

## Context

**Escalated by the worker on `task-measure-first-tick-stall-after-long-sleep`, and independently
confirmed by the coordinator against `main`. This is the most severe defect found in this project.**
It survived 271 passing tests because **every timezone test in the suite uses a zone with a
non-negative UTC offset**.

### Reproduction (coordinator, against `main`, via the exported `nextOccurrence`)

```
const spec = parseCron("* * * * *")
for (const tz of [...]) { /* step between consecutive occurrences, minutes */ }

UTC / Europe/Madrid / Asia/Kolkata / Pacific/Kiritimati   1, 1, 1, 1     correct
America/New_York                                       241, 241, 241   WRONG
America/Buenos_Aires                                   181, 181, 181   WRONG
```

Exactly `|offset| + 1` minutes.

### Root cause

`nextOccurrence` (src/index.ts:648) walks the cursor with `wallFromUtc(wall)` — **UTC** wall parts —
and then hands those parts to `wallToInstant`, which reads them as **`timeZone`** wall parts:

```ts
let wall = Math.floor(afterMs / MINUTE_MS) * MINUTE_MS + MINUTE_MS   // a UTC instant
while (wall < horizon) {
  const parts = wallFromUtc(wall)      // UTC wall parts
  ... wallToInstant(parts, timeZone)    // read as timeZone wall parts
```

Those two frames agree **only at offset 0**. Inverting `local = UTC + offset` by adding `offset` back
round-trips correctly for `offset >= 0`, which is why Madrid (+2) and Kolkata (+5.5) look fine. For a
negative offset the same code **adds** the magnitude instead of subtracting it, so each cursor step
lands `|offset| + 1` minutes late.

### Why it is p0 — this is not only a reporting error

The same function computes `nextRun` for **every** job. So in any zone west of UTC:

- **A `* * * * *` job in `America/New_York` fires roughly every 4 hours, not every minute.** The
  cadence of the most common schedule in the most common timezone is wrong. This is not a subtle
  counting artefact; it is the scheduler not doing its job.
- Backlog counts are wildly wrong: a 24 h window reports **4 dropped** instead of ~1439, and
  `droppedCapped` is absent because the walk finishes early. That is a straight **ADR 0002**
  violation — *the count disagrees with the instants it is reported beside* — on top of the cadence bug.
- `missedOccurrences` inherits it, so misfire decisions (`skip` vs `backfill`) are made on a wrong
  picture of the backlog.
- Any job whose schedule is denser than its UTC offset is affected. Hourly jobs are fine; minutely and
  sub-hourly jobs are not.

### Why 271 tests missed it

Every timezone test in the suite pins `Europe/Madrid` (+2) or `UTC` (+0). Both are in the range where
the frame error cancels out. There is no test with a **negative** offset anywhere, and that is the
whole gap — not a logic error in the tests, a missing axis in what they vary.

The measurement task hit this by accident: it had to pin `timezone: "UTC"` or a minutely job on this
host would have looked like a non-event, because a New York job owes ~6 occurrences per hour instead of
60.

## Acceptance

- [ ] `nextOccurrence` walks the cursor in the **target zone's** wall parts, not UTC's — or converts
      correctly at the boundary. Whichever way it is done, the round-trip holds for negative offsets.
- [ ] A test pins **consecutive minutely occurrences in a negative-offset zone** and asserts a step of
      exactly one minute. `America/New_York` and one fixed-offset zone (e.g. `America/St_Johns`,
      UTC-3:30, which also catches half-hour offsets) are both worth having.
- [ ] The timezone matrix in the suite spans **both signs of offset**. Add a table-driven case so a
      future zone cannot silently fall outside the tested range again — this is the axis whose absence
      let the bug through.
- [ ] DST behaviour is re-verified **in a negative-offset zone**, not only Madrid: spring-forward and
      fall-back are where a frame error is most likely to hide. The Americas are where DST transitions
      happen, so this is the realistic case, not an exotic one.
- [ ] The backlog count agrees with the occurrences: a 24 h minutely backlog west of UTC reports the
      right `dropped`, and `droppedCapped` appears only when the walk really was cut short.
- [ ] Existing DST tests re-run **unchanged** in Madrid, and the new negative-offset tests are added
      alongside rather than replacing them.
- [ ] Mutation-check: reintroduce the UTC-frame walk and confirm the new tests go red.

## Notes

Filed by the coordinator, p0, from the `task-measure-first-tick-stall-after-long-sleep` worker's
escalation — it found this while measuring and correctly declined to grow its diff into a fix this far
from local.

Sequence this **immediately**, ahead of every remaining item. It is a scheduling-correctness bug in the
most common timezone, it is user-visible on every run rather than only under a backlog, and it is the
kind of thing that makes the whole test count look like reassurance when it is not.

**Do not regress** `bug-tick-cost-grows-with-sleep-not-with-jobs`, which now yields to the event loop
and bounds the *longest block*: its measurements and its `MAX_BACKLOG_SCAN` decisions were all taken
under `timezone: "UTC"`, so re-measure after this fix lands.
