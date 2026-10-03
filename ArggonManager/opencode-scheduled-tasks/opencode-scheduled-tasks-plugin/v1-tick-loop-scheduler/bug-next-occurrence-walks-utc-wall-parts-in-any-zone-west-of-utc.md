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

- [x] `nextOccurrence` walks the cursor in the **target zone's** wall parts, not UTC's — or converts
      correctly at the boundary. Whichever way it is done, the round-trip holds for negative offsets.
- [x] A test pins **consecutive minutely occurrences in a negative-offset zone** and asserts a step of
      exactly one minute. `America/New_York` and one fixed-offset zone (e.g. `America/St_Johns`,
      UTC-3:30, which also catches half-hour offsets) are both worth having.
- [x] The timezone matrix in the suite spans **both signs of offset**. Add a table-driven case so a
      future zone cannot silently fall outside the tested range again — this is the axis whose absence
      let the bug through.
- [x] DST behaviour is re-verified **in a negative-offset zone**, not only Madrid: spring-forward and
      fall-back are where a frame error is most likely to hide. The Americas are where DST transitions
      happen, so this is the realistic case, not an exotic one.
- [x] The backlog count agrees with the occurrences: a 24 h minutely backlog west of UTC reports the
      right `dropped`, and `droppedCapped` appears only when the walk really was cut short.
- [x] Existing DST tests re-run **unchanged** in Madrid, and the new negative-offset tests are added
      alongside rather than replacing them.
- [x] Mutation-check: reintroduce the UTC-frame walk and confirm the new tests go red.

## Report (worker of record)

**The fix is one line.** `nextOccurrence` seeded its cursor from `afterMs` read through `Date`'s UTC
getters and then walked it as if those were the job's wall parts. Changing exactly that seed to
`wallToNaive(wallParts(afterMs, timeZone))` makes **all 271 pre-existing tests plus the 14 new ones
pass** — verified by running `HEAD`'s test file against a one-line-patched `HEAD` source. The rest of
the `src/index.ts` diff is a rename and its documentation: `wallAsUtc`/`wallFromUtc` become
`wallToNaive`/`naiveToWall` (identical bodies), and the two jump branches are rewritten to call the
named helper, which is arithmetically the same `Date.UTC` call. The rename is the deliverable, not
decoration: after it, seeding the cursor from a UTC reading reads as a frame error at a glance.

The frame has a name in the standard, and `Temporal` implements it — RFC 9557's **plain date-time**,
"a date and time without a specific time zone or UTC offset", which is what cron expressions are
written in. It is hand-rolled here anyway, with evidence: **CI pins Node 22**
(`.github/workflows/arggon.yml`), and on Node 22.23.3 / V8 12.4 `typeof Temporal === "undefined"`,
reachable only behind `--harmony-temporal` — a V8 flag a plugin cannot set on the host that loads it.
It is present unflagged on Node 26 / V8 14.6, but even there `PlainDateTime` shipped **without
`getPossibleInstantsFor`**. ADR 0004 keeps the dependency-free core intact.

Walking `Temporal.PlainDateTime` with "skip the gap, take the earlier instant" reproduces this file's
behaviour exactly, **including the index at which the fall-back's 61-minute step falls** — that
independent implementation agrees with the test's own expectation. Recorded in the `wallToNaive`
docblock.

### On the two DST policies

`wallToInstant` now cites the standard's disambiguation vocabulary. A wall reading is classified by
how many instants carry it: **zero** in a gap, one ordinarily, **two** in an overlap.

- **Overlap → earlier**: identical to RFC 9557's `compatible`, and to what `node-cron` and
  `cron-parser` do. Not a local choice.
- **Gap → skip**: **not** `compatible`, and **not** what the ecosystem does. `compatible` shifts
  forward by the length of the gap (02:30 → 03:30); `node-cron` "rewinds to just after the offset
  change"; `cron-parser` compensates to the landing hour. **This plugin is the outlier** — it is the
  only one of the four that reports the run as not having happened. Spec 001 boxes 131/133 commit us
  to that, so it stands unchanged; the divergence is now written down at `wallToInstant` instead of
  being implicit.

### What the bug did at a transition — worse than a slow cadence

Because `wallToInstant` re-renders whatever wall parts it is handed in the job's own zone, a daily job
still *read* as the right local clock time on the old walk. What it got wrong was the **date**. On a
transition night it lost a whole day: a New York `30 3 * * *` job asked at 23:00 the night before the
spring-forward was told its next run was **2026-03-09**, skipping 2026-03-08 entirely; and on the
fall-back night `30 1 * * *` was told **2026-11-02**, stepping over *both* passes of the repeated
hour. No test caught either, because both fixtures were chosen on the wrong side of the transition.
`loses no whole day at a transition west of UTC` now pins them, in New York and in `America/St_Johns`,
with every expected instant cross-checked against a brute-force oracle that shares no code with
`nextOccurrence`.

### Fixtures are classified, not assumed

`possibleInstants(reading, zone)` counts the instants that render as a given local reading — the
standard's own gap/overlap/ordinary classification — by scanning with raw `Intl`. Every DST fixture
asserts its count (0 for the gap, 2 for the overlaps, 1 for the ordinary readings), so a tzdata
release that moves a transition fails loudly instead of leaving a test that no longer describes what
it says. The offset matrix is likewise **derived**: two seasons, then sign / magnitude / half-hour
part / DST-observing-vs-fixed all computed from `Intl` rather than tabulated.

The two-season derivation turned out to matter: a negative-offset zone's offset is a property of an
*instant*, so New York is `-5` in January and `-4` in May — the same job was 301 minutes slow in
winter and 241 in summer. **The May-only reproduction understated the defect by an hour.**

### Untestable black-box, stated plainly

- `varies the sign of the UTC offset` **cannot fail** against a broken walk: it asserts the shape of
  the test matrix, not the behaviour of `nextOccurrence`. It is a guard on the axis, and it is
  reported here as such rather than as a passing claim.
- Both policy tests at a single transition (`skips a local time that does not exist… west of UTC`,
  `fires once, at the first occurrence… west of UTC`) **pass on the old walk too**. They pin the
  DST policy, which is what the acceptance box asks for, but they are not discriminators for this
  bug. Reported as behaviour pins, not as regression pins.

### Numbers, after the fix

Steps between consecutive `* * * * *` occurrences (was `|offset| + 1`):

| zone | offset (Jan) | before | after | offset (May) | before | after |
|---|---|---|---|---|---|---|
| `UTC` | 0 | 1 | **1** | 0 | 1 | **1** |
| `Europe/Madrid` | +60 | 1 | **1** | +120 | 1 | **1** |
| `Asia/Kolkata` | +330 | 1 | **1** | +330 | 1 | **1** |
| `Pacific/Kiritimati` | +840 | 1 | **1** | +840 | 1 | **1** |
| `America/St_Johns` | −210 | 211 | **1** | −150 | 151 | **1** |
| `America/Buenos_Aires` | −180 | 181 | **1** | −180 | 181 | **1** |
| `America/New_York` | −300 | 301 | **1** | −240 | 241 | **1** |
| `America/Chicago` | −360 | 361 | **1** | −300 | 301 | **1** |
| `Pacific/Honolulu` | −600 | 601 | **1** | −600 | 601 | **1** |

A 24 h minutely backlog, `missedOccurrences(…, limit 1)` — the ADR 0002 violation, verbatim:

| zone | before | after |
|---|---|---|
| `UTC` / `Madrid` / `Kolkata` | 1000, `droppedCapped: true` | unchanged |
| `America/St_Johns` | **8, `droppedCapped: false`** | 1000, `true` |
| `America/Buenos_Aires` | **6, `droppedCapped: false`** | 1000, `true` |
| `America/New_York` | **4, `droppedCapped: false`** | 1000, `true` |

A 10-minute window in `America/St_Johns` returned **1** instant on the old walk (the next was 151
minutes away); it returns **10**, one minute apart.

### Re-measured event-loop numbers

All under `timezone: "UTC"` and a 24 h minutely backlog, as before, with the real `tick` driven
through `setup`. The yield is **not** regressed.

| | before | after |
|---|---|---|
| one capped walk (`missedOccurrences`) | 6012 lookups, ~25 ms | 7014 lookups, ~31 ms |
| one occurrence search | 6 lookups, ~0.02 ms | 7 lookups, ~0.03 ms |
| 100 jobs, whole tick | 601 800 lookups, ~2.47 s | 702 100 lookups, ~2.97 s |
| **longest stretch with no callback at all** | 30 ms | **~48 ms** (next four: 40/38/36/34 ms) |

The tick is ~20 % dearer because a matching search costs seven timezone lookups instead of six — the
cursor now reads `afterMs` in the job's own zone. That is the whole price. `MAX_BACKLOG_SCAN` stayed
at **1000** and is still unexported: the bound buys *one job's walk* as a block, which is unchanged in
kind, and the longest uninterrupted run is still one walk plus the loop's per-job overhead rather than
the 2.45 s the turn was added for. Separately, a minutely job in New York used to owe ~6 occurrences
an hour instead of 60, so **the backlog it could accumulate was itself wrong**; that is now 60.

### Every mutation run, and what it caught

| mutant | result |
|---|---|
| **`HEAD` restored** (the two-frame walk) | **11 red**, with the exact symptom: `America/New_York: [241,241,241,241]` in the step table; `expected 14_460_000 to be 60_000` (241 min) in the 200-occurrence walk; `dropped: 4, droppedCapped: false` for New York; `nextRun` 241 minutes out |
| cursor seeded from `afterMs` through UTC getters (renames kept) | **11 red**, same set — isolates the single behavioural line |
| `wallParts(afterMs, "UTC")` instead of the job's zone | **11 red**, same set |
| `instant > afterMs` guard dropped | **1 red** — the new `never returns an instant at or before the cursor` test. It was **0 red** before that test existed; the new docblock's claim about the guard was true but untested |
| day-jump re-offset by `afterMs`'s zone offset | **does not terminate.** In New York the jump lands on the previous evening at 20:00, whose day does not match either, so `wall` returns to the identical value and the loop spins. Caught as a suite timeout, not as an assertion — the weakest of the six signals, and the reason it is worth reporting separately. **This line was still sitting in the uncommitted tree as `// MUTANT`** when work resumed; it is removed. In the fixed code the day jump is unconditionally increasing (midnight of the next day exceeds any minute of the current day), which is what makes the walk terminate at all |
| `naiveToWall`'s weekday read rewritten to an equivalent expression | 285 green — an equivalent mutant, correctly not caught; the helper is private and its behaviour is pinned through `nextOccurrence` |

### Existing expectations changed

**One**, and it was arithmetic, not a preference: `LOOKUPS_PER_SEARCH` 12 → 14. A matching search now
costs seven lookups rather than six, so an ordinary no-backlog `resolveDue` measures exactly 14 —
`≤ 12` is a real failure, not slack. The relationship is unchanged (2× the per-search cost) and the
new value is *exact* where the old one was loose, so the constant got **stricter**. Verified
directly: `HEAD`'s test file against the one-line fix fails on exactly this assertion and nothing
else. Nothing was deleted. All 271 pre-existing tests are still present by name, and the two Madrid
DST tests are **byte-identical** to `HEAD` — verified by diffing their extracted bodies.

### Gates

`npx tsc --noEmit` clean · `npx vitest run` **285 passed** (271 pre-existing + 14 new) ·
`npx tsx harness/smoke.ts` **PASS** · `arggon validate` **ok** (0 warnings, convention v5) ·
`arggon spec analyze` **clean** (2 specs).

No box is left unticked.

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
