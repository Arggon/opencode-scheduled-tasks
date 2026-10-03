---
type: bug
status: in_progress
id: bug-next-occurrence-walks-utc-wall-parts-in-any-zone-west-of-utc
title: nextOccurrence advances by |offset|+1 minutes in any zone west of UTC — a minutely job in New York fires every 4 hours
assignee: arggon
branch: fix/bug-next-occurrence-walks-utc-wall-parts-in-any-zone-west-of-utc
parent: v1-tick-loop-scheduler
labels: []
priority: p0
created: "2026-10-03"
updated: "2026-10-03"
claimed_at: "2026-10-03T01:59:19.706Z"
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

### 2026-10-03 @ses_f0035738fffes53RQOsmuSALKx
Evidence for the acceptance audit — every claim below was measured, not inferred.

**The fix is one line.** Ran `HEAD`'s test file (271 tests) against a `HEAD` source with only
`let wall = wallAsNaive(wallParts(afterMs, timeZone)) + MINUTE_MS` changed: **271 passed**. So the
behaviour is the cursor seed; the rest of the `src/index.ts` diff is rename + docs + two jump
branches rewritten to call the named helper (arithmetically the same `Date.UTC`).

**Typecheck error**: `test/index.test.ts:368` — the cases table destructured a field literally named
`expect`, shadowing the callable binding in the same scope, so `expect(...)` became `Type 'String'
has no call signatures`. Renamed the field to `want`. That was the only compile error.

**A leftover mutant was still in the uncommitted tree**: the day-jump branch carried
`+ zoneOffsetMs(afterMs, timeZone)  // MUTANT`. In New York that makes the jump land on the previous
evening at 20:00, whose day does not match either, so `wall` returns to the identical value and
`nextOccurrence` **never returns**. Removed.

**Step table after the fix** (`* * * * *`, consecutive occurrences) — before was `|offset|+1`:
UTC 1 · Madrid 1 · Kolkata 1 · Kiritimati 1 · **St_Johns 1** (was 211/151) · Buenos_Aires 1 (was 181)
· **New_York 1** (was 301/241) · Chicago 1 (was 361/301) · Honolulu 1 (was 601).

**24 h backlog, `missedOccurrences(…, limit 1)`** — the ADR 0002 violation verbatim:
St_Johns **8 uncapped** -> 1000 capped · Buenos_Aires **6 uncapped** -> 1000 capped ·
**New_York 4 uncapped** -> 1000 capped. UTC/Madrid/Kolkata unchanged. A 10-minute St_Johns window
returned **1** instant before; it returns **10**, one minute apart.

**New tests fail against the old code with the exact symptom**, not an incidental error —
`expected 14_460_000 to be 60_000` (241 minutes), `[241,241,241,241]` in the step table,
`dropped: 4, droppedCapped: false`, `nextRun` 241 min out. **11 tests red.** Three do not
discriminate and are reported as such in the item file: the matrix guard (asserts the test axis, not
behaviour) and the two single-transition DST policy tests (they pass on the old walk; a sweep of 2960
(schedule, zone, instant) triples found 14.7 % differ, but none of them at these two fixtures).

**DST dates are American, verified from tzdata**: NY springs forward 2026-03-08T07:00Z and falls back
2026-11-01T06:00Z; St_Johns 05:30Z / 04:30Z. Madrid's are 2026-03-29 and 2026-10-25 — three weeks
later, so a Madrid date really does not exercise New York's. Fixtures now assert their own
gap/overlap/ordinary classification (`possibleInstants`), so a tzdata move fails loudly.

**The old walk lost a whole day at a transition** — found by sweeping, not assumed. NY
`30 3 * * *` after 2026-03-08T04:00Z: old 2026-03-09T07:30Z, correct 2026-03-08T07:30Z. NY
`30 1 * * *` after 2026-11-01T01:30Z: old 2026-11-02T06:30Z, correct 2026-11-01T05:30Z (both passes
of the repeated hour skipped). Every expected instant cross-checked against a brute-force oracle
sharing no code with `nextOccurrence`.

**Re-measured event loop** (UTC, 24 h backlog, real `tick` via `setup`):
one capped walk 6012 -> **7014** lookups (~25 -> **~31 ms**); one search 6 -> **7** lookups;
100-job tick 601 800 -> **702 100** lookups (~2.47 -> **~2.97 s**); **longest stretch with no callback
~48 ms** (next four 40/38/36/34), vs 30 ms before. Yield **not** regressed: still one job's walk plus
loop overhead, never the 2.45 s the turn was added for. `MAX_BACKLOG_SCAN` stays 1000, unexported.
A minutely New York job used to owe ~6 occurrences/hour instead of 60, so the backlog it could
accumulate was itself wrong; that is now 60.

**One existing expectation changed**: `LOOKUPS_PER_SEARCH` 12 -> 14. A matching search costs seven
lookups not six, so an ordinary `resolveDue` measures exactly 14 and `<= 12` is a real failure —
verified directly against `HEAD`'s test file. Same relationship (2x per-search), and 14 is *exact*
where 12 was loose, so the constant got stricter. **Nothing deleted**: all 271 pre-existing `it()`
names still present, and both Madrid DST test bodies are **byte-identical** to HEAD.

**Six mutations run**: HEAD -> 11 red; cursor from UTC getters (renames kept) -> 11 red; read
`afterMs` in `"UTC"` -> 11 red; day-jump re-offset -> **hangs**; `instant > afterMs` dropped -> 1 red
(that guard was pinned by **nothing** before, which the new docblock's claim made worth closing);
equivalent rewrite of `naiveToWall`'s weekday read -> 285 green (equivalent mutant, correctly).

**Untestable black-box, stated**: the matrix guard cannot fail on a broken walk — it asserts the test
axis, not `nextOccurrence`. Said so in the report rather than claimed as a passing behaviour test.

**Gates**: `tsc --noEmit` clean · `vitest run` **285 passed** (271 + 14) · `harness/smoke.ts` PASS ·
`arggon validate` ok (0 warnings, v5) · `arggon spec analyze` clean. No box left unticked.

**context7 findings** are in the item file and cited in the source. Headline: the frame has a standard
name (RFC 9557 *plain* date-time, `Temporal.PlainDateTime`) and `Temporal` reproduces this walk
exactly — including the index of the fall-back's 61-minute step — but **CI pins Node 22**, where
`typeof Temporal === "undefined`, reachable only behind `--harmony-temporal`; even unflagged on
Node 26 it shipped **without `getPossibleInstantsFor`**. Hand-rolled per ADR 0004. On the DST policy:
overlap -> earlier is `compatible` and unanimous; **gap -> skip is ours alone** — `compatible`
shifts forward by the gap length, `node-cron` rewinds to just after the change, `cron-parser`
compensates to the landing hour. Spec 001 boxes 131/133 commit us, so it stands, now documented.

### handoff 2026-10-03 @ses_f0035738fffes53RQOsmuSALKx (session: ses_f0035738fffes53RQOsmuSALKx) — next: Coordinator review + merge. Optional follow-up: file a task for the one gap this item found but did not close.
- branch: fix/bug-next-occurrence-walks-utc-wall-parts-in-any-zone-west-of-utc
- open questions: Spec divergence to confirm: gap->skip is the outlier vs Temporal/node-cron/cron-parser; and whether the day-jump non-termination risk deserves its own bound test.
