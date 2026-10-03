---
type: task
status: in_progress
id: task-assert-v1-identical-with-no-markdown-dir
title: No test asserts a v1 job file behaves identically when no markdown directory exists
assignee: arggon
branch: test/task-assert-v1-identical-with-no-markdown-dir
parent: hygiene-ci-gates-and-doc-statuses
labels: []
priority: p1
created: "2026-10-03"
updated: "2026-10-03"
claimed_at: "2026-10-03T05:56:37.208Z"
depends_on: [bug-job-format-reference-contradicts-spec-002]
---
<!--
  Placement (v0): ArggonManager/scheduled-tasks-v2/v2-features-inspired-by-opencode-tasks/hygiene-ci-gates-and-doc-statuses/task-assert-v1-identical-with-no-markdown-dir.md
  Leaves live only under a story. id is the filename stem: task-assert-v1-identical-with-no-markdown-dir.
  CLI `arggon create task assert-v1-identical-with-no-markdown-dir` adds the task- prefix (do not pass it twice).
  parent MUST be the story id. Omit assignee when unassigned. Omit blocked_reason unless status is blocked.
-->

# No test asserts a v1 job file behaves identically when no markdown directory exists

## Context

The remaining unticked box on `task-t7-attribution-docs-and-v2-gate`: *"a v1 job file with no markdown
directory behaves identically"*. It is split across two items because the **docs** half and the **test**
half are different work, and only one of them is docs.

**What already exists (the additive half), and it is good.** `test/index.test.ts`:
- `loads and runs a JSON-only project without resolving any package` — runs the **real**
  `plugin.setup` over a JSON-only project with no `.opencode/tasks/`, under an ESM loader hook that
  reports every non-builtin resolution. Zero `EXTERNAL:`, the job loads, exit 0.
- `every static import in the plugin is a node builtin` — pins the import list to exactly
  `["node:fs","node:os","node:path"]`.
- `a missing directory is the v1 state, not an error` — pins `loadMarkdownJobs` to
  `{ jobs: [], invalid: [] }`.

**What does not exist (the half the box asks for): any behavioural equivalence assertion.** Nothing runs
the same project as v1 and as v2 and compares the result. There is no v1 build to compare against — it
was never kept — so "behaves identically" has to be constructed rather than diffed.

## What to build

A test that states the v1 contract **positively**, without needing a v1 binary: define a v1 job file
(a plain `.opencode/schedules.json` with the fields v1 had), load it through the current plugin with no
markdown directory, and assert the observable behaviour a v1 user depends on:

- the job is admitted, parses, and produces the same `nextRun` the v1 arithmetic would — including a
  **negative-offset timezone**, since the p0 that landed today was exactly a v1 behaviour that silently
  changed (a minutely job in `America/New_York` firing every ~301 minutes)
- the tick admits it under the same concurrency cap and the same misfire rules
- a malformed file leaves the project inert **and reported** (spec 001 box 89, amended — pin the reachable
  invariant, not the unreachable one)
- the run record has the fields v1 wrote: `dueAt`, `startedAt`, `outcome`, `model`, `sessionID`, and
  **nothing v2-only that a v1 reader would choke on**
- state and history keys land where v1 put them, so an **upgrade in place** does not orphan a v1 user's
  existing history — spec 001 box 184 already claims this; pin it

## The standard

The acceptance audit's rule: **a claim is only credited when mutating the named behaviour turns a test
red.** Break each behaviour, confirm red, restore, confirm green. Nine branches in a row shipped tests
that passed while asserting nothing, and this repo now holds itself to that bar.

## Acceptance

- [x] A test states the v1 contract positively, covering admission, `nextRun` in a negative-offset zone,
      the cap, misfire, the malformed-file invariant, the run-record shape, and key layout.

> **Ticked** — `test/index.test.ts` → `describe("the v1 contract, stated positively
> (task-assert-v1-identical-with-no-markdown-dir)")`, 15 tests, 967 lines, **`src/index.ts` untouched**.
> 304 → 319 tests (318 pass + the one win32-gated skip), suite runtime unchanged at ~36 s.
>
> The premise is stated in the block's own header, and it is the premise the task set: **there is no v1
> binary, so this is a contract, not a diff.** Every clause is sourced — spec 001's synopsis for the ten
> v1 job fields (and every job in the block is drawn from those ten and no other), § Time for the zone
> arithmetic, § Limits for the cap and both misfire policies, § Persistence/§ Upgrade for the keys, and
> spec 001's own audit verdict for the run-record shape, which it names verbatim as
> `{dueAt, startedAt, outcome, model, sessionID}`.
>
> **Admission** — a plain v1 file with no `.opencode/tasks/` lists every job, refuses nothing, and
> applies the v1 defaults (`enabled: true`, `misfire: "skip"`, `maxCatchUp: 5`, `runTimeoutMs: 900000`,
> zone defaulting to the host's). The defaults are asserted as **literals, not as the constants that
> define them**, so the test cannot move with the change it is meant to catch. The harness asserts
> `.opencode/tasks/` is absent on every project it builds, so the premise is checked rather than assumed.
>
> **`nextRun`** — seven cases, each a hand-derived literal instant plus the same answer read in the job's
> own clock: `America/New_York` at `UTC-5` and `UTC-4`, and `America/St_Johns` at `UTC-3:30` and
> `UTC-2:30`, each in a minutely and a daily form, plus a weekday-restricted row so the walk's **day
> branch** is exercised. The same `0 3 * * *` job is due at **08:00Z** (NY standard), **07:00Z** (NY
> daylight), **06:30Z** (St. Johns standard) and **05:30Z** (St. Johns daylight) — three distinct answers
> from zone and season alone, which is what a whole-hour-only matrix cannot see. A separate test asserts
> the **cadence**: five consecutive reported `nextRun`s in New York are exactly 60 000 ms apart in *both*
> seasons, because the p0 that landed on 2026-10-03 was a cadence defect (241 minutes in summer, 301 in
> winter) and no single-instant assertion would have shown it.
>
> **The cap** — two jobs due on one occurrence, one global budget, **no** `maxConcurrentRuns` option, so
> the documented default of 1 is being *read*: exactly one prompt, the second recorded `skipped` with
> `concurrency cap reached (1/1)`, and four further ticks inside the same minute replay nothing — skipped,
> never queued. A sibling test raises the cap to 2 on the same jobs, cursors and minute, so the default
> cannot be mistaken for a hard-coded constant.
>
> **Misfire** — under the v1 default `skip`, eight owed occurrences produce one run whose record carries
> `dropped: 7`, and the next run is the *new* occurrence rather than a replay of the backlog. Under
> `backfill` with `maxCatchUp: 3`, six owed produce three prompts oldest-first one per tick, the remainder
> `dropped: 3` riding **every** record, and the plan left durable on the job's own state record between
> ticks. **The owed-not-spent half is its own test**: a `backfill` job that loses the slot keeps its
> occurrence on the plan (asserted in storage, under its own v1 key), is *not* marked `skipped`, and runs
> that occurrence at its **original** `dueAt` on the next tick. The old simplification — one tick folding
> a backlog into a single dispatch — is not asserted anywhere.
>
> **The malformed file** — the **amended** box 89 invariant, pinned at both ends. A file that cannot be
> read, and a file that reads but is not a job file (`{"version": 1}`): in both cases the project keeps
> its tools, reports the failure on `schedules_list` with what went wrong, names it **exactly once** in
> the log (and says it once across four further ticks), arms no timer and takes no writer lease. The
> "nor its jobs" half is pinned by the third case: a file with one good job and one bad cron runs the
> good one and reports the bad one **by id with its reason**.
>
> **The run record** — a plain run's record has exactly the five v1 keys, correct values, and **none** of
> `asksAsDeny` / `inMemoryOnly` / `dropped` / `droppedCapped`; the same five keys in **storage**, before any
> surface renders them as ISO strings. A failed run adds `error` — the sixth v1 field, which is what makes
> a failed run attributable. Where a later addition *does* have something to say (a truncated backlog), the
> key set is the v1 five **plus `dropped` and nothing else**.
>
> **Key layout** — after a run, the store holds exactly `scheduled-tasks/<id>` and
> `scheduled-tasks/history/<id>`, spelled out. Then the **upgrade in place**: a store seeded by hand with
> what a v1 install wrote (a v1-shaped state record and a five-field history record at those keys) is read
> back whole — `lastRun`/`lastStatus` intact, the history record surviving `loadHistory` — and the next
> run **appends to that ring at that key** rather than starting a fresh one. Both records in one ring is
> the assertion; an orphan would look identical from the tool's point of view.

- [x] Each assertion is mutation-checked. Report the mutation and whether it went red.

> **Ticked** — 17 mutations of `src/index.ts`, each applied, run against the whole 319-test suite, and
> reverted. **Every one turned something red, and 14 of the 17 turned a test in this block red.** The
> three that did not are reported below with what caught them, because a mutation that only your own
> test catches is the weaker claim.
>
> | # | Clause | Mutation | Result |
> |---|---|---|---|
> | M01 | admission | `validateJob`: `enabled: record.enabled !== false` → `=== true`, so a v1 file that omits `enabled` is not admitted | **RED** — 50 failed, 10 of them here |
> | M02 | `nextRun` in the job's zone | `resolveDue`: both `nextOccurrence(spec, nowMs, job.timezone)` → `"UTC"` | **RED** — **1 failed in 319, and it is the `nextRun` table here.** The plugin passing the job's zone to the walk was untested before this |
> | M03 | the 2026-10-03 frame | `walkFrom`: `wallParts(afterMs, timeZone)` → `wallParts(afterMs, "UTC")` — the p0's own shape, and bounded, so it terminates | **RED** — 28 failed, 6 here (the `nextRun` table, the cadence, the dispatch, admission, and both cap tests) |
> | M05 | the cap defaults to 1 | `DEFAULT_MAX_CONCURRENT_RUNS = 1` → `2` | **RED** — 3 failed, 2 here |
> | M06 | the cap is enforced | `running >= maxConcurrentRuns` → `>` | **RED** — 7 failed, 2 here |
> | M07 | `skip` consumes the window | `consume()`: `state.lastRun = nowMs` → `occurrence.dueAt`, so the backlog is no longer collapsed | **RED** — 8 failed, 2 here |
> | M08 | `backfill` takes the occurrence | add `take()` to `defer()`, so a deferred occurrence is spent | **RED** — 3 failed, 1 here (the owed-not-spent test) |
> | M10b | a broken file is reported | `reloadJobs` early return: `state.fileError = failure` → `undefined` | **RED** — 2 failed, 1 here |
> | M10c | a file that parses but is not a job file is reported | drop `loaded.error` from `problems` | **RED** — **1 failed in 319, and it is here.** The second broken shape was added to the test *because* M10c showed the first one did not reach this path |
> | M11 | a v1 record field is present | drop `sessionID` from the job run record | **RED** — 6 failed, 4 here |
> | M12 | nothing v2-only on the record | `recordRun` always stamps `inMemoryOnly: state.storageAvailable` | **RED** — 7 failed, 3 here |
> | M15 | the same, via `asksAsDeny` | stamp `asksAsDeny` on every record **and** stop `clipAsks` dropping an empty list (two sites, reported as such) | **RED** — 5 failed, 3 here |
> | M13 | history key layout | `history/<id>` → `history/v2/<id>` | **RED** — 24 failed, 3 here |
> | M14 | state key layout | `scheduled-tasks/<id>` → `scheduled-tasks/state/<id>` | **RED** — 10 failed, 3 here |
> | M16 | one bad job does not refuse the file | `loadJobs`: `return { jobs, invalid }` → `jobs: invalid.length > 0 ? [] : jobs` | **RED** — 4 failed, 1 here |
> | M17 | half-hour offsets honoured | `zoneOffsetMs` truncated to whole hours | **RED** — 9 failed, 1 here — the `nextRun` table, which is the only reason `America/St_Johns` is in it: a whole-minute schedule in a `:30` zone lands on the same UTC minute as every other whole-minute zone, so only the daily rows can see it |
>
> **Three that did not turn a test here red, reported rather than buried:**
>
> - **M10** (`readProblem` dropped from `problems`) went red on exactly one test — "still reports a corrupt
>   schedules.json when markdown jobs are carrying the schedule". That is the **cross-surface** case, which
>   needs a `.opencode/tasks/` directory, so a JSON-only block cannot reach it. It is pinned, by the test
>   that owns that surface; this block says so in a comment instead of pretending otherwise.
> - **M12/M15 are the interesting negative.** The obvious mutation — stamp `asksAsDeny` unconditionally —
>   turns **nothing** red anywhere, because `pushHistory`'s `clipAsks` already strips an empty list. So the
>   `not.toHaveProperty("asksAsDeny")` assertion is **masked by a second layer** and is not on its own
>   load-bearing. That is why the `inMemoryOnly` mutation (M12, which does go red) was tried as well: the
>   record's key set is pinned at both the write and the storage layer, and the storage-layer assertion is
>   what catches a field the write path spreads unconditionally.
> - **M02 and M10c each turned exactly one test red in the whole suite, and in both cases it is a test
>   added here.** Those are the two clauses that were genuinely untested rather than merely unpinned, and
>   they are the strongest evidence this block is not asserting nothing.

- [x] The claim is scoped honestly in the note: this asserts the **v1 contract as specified**, not a
      diff against a v1 binary, because none exists. Say that in the box note so nobody later reads it
      as a regression suite against a build we do not have.

> **Ticked** — stated three times on purpose, so it cannot be skimmed past: in the **block's header comment**
> in `test/index.test.ts` (which opens "*There is no v1 binary to diff against… Read it as the v1 contract as
> specified, never as a regression suite against a build we do not have. If someone later finds a v1 binary,
> the honest thing is to diff it against this block*"), in the **box above** ("this is a contract, not a
> diff"), and here. It also says what the block is *not*: the two clauses a JSON-only project cannot reach
> are named where they are not asserted, not papered over.
>
> **Two honest limits inside the claim itself:**
>
> 1. **"V1" is drawn at a line, and the line is sourced.** The five fields are the ones spec 001's own audit
>    verdict names verbatim; `error` joins them because § Failure requires the message on the record. The
>    claim is that **the v1 fields are all present, correctly valued and unchanged** — *not* that v2 added
>    nothing. The four later additions (`asksAsDeny` from ADR 0005; `dropped`/`droppedCapped` from ADR 0002;
>    `inMemoryOnly` from `bug-storageless-degradation-unrecorded`) are all optional and presence-only, and
>    the test asserts each is **absent when it has nothing to say** and **the only addition** when it does.
> 2. **The `backfill` clause asserts the corrected contract, not the box as first written.** One
>    occurrence per tick and the durable plan came from
>    `bug-backfill-collapses-to-one-run-and-never-reports-truncation`, which found the box false and fixed
>    the code to the decision (ADR 0002). The test asserts that corrected shape, and the owed-not-spent
>    half explicitly does **not** assert the old simplification.

- [x] Close `task-t7-attribution-docs-and-v2-gate`'s remaining box by reference, with this test named.

> **Done** — `task-t7-attribution-docs-and-v2-gate` → "*a v1 job file with no markdown directory behaves
> identically*" is closed by reference to `test/index.test.ts` → `describe("the v1 contract, stated
> positively (task-assert-v1-identical-with-no-markdown-dir)")`, with the honest caveat carried across: the
> behavioural half is closed by this block's 15 tests, and the scope is the **specified contract**, not a
> diff against a v1 build that does not exist. `src/index.ts` was not touched — the item's spirit is that
> v1 behaviour is unchanged, and it was.

## Notes

Filed by the coordinator from the T7 worker's report, which declined to write the test because
`test/index.test.ts` belonged to the other worker in that wave. It is free now.

Do **not** regress the markdown surface or the two tests that pin the static imports and the
zero-external-resolution property — they are the additive half of exactly this claim, and the new test
sits beside them rather than replacing them.

---

**Worker's report (2026-10-03).**

**Nothing regressed, and nothing in `src/index.ts` changed.** The diff is `test/index.test.ts` alone:
967 lines added, one new `describe`, 15 tests. 304 → 319 tests (318 pass + 1 win32-gated skip), the
suite still finishes in ~36 s, and `harness/smoke.ts` still passes. The additive half is untouched and
still green: "every static import in the plugin is a node builtin", "loads and runs a JSON-only project
without resolving any package" and "a missing directory is the v1 state, not an error".

**No box is left unticked.** All four acceptance boxes are made, with the mutation table and the honest
scoping above. What is *limited* is stated inside the ticked boxes rather than hidden in here: the
cross-surface malformed-file case belongs to the markdown test, and the block says so at the assertion.

**Two findings the coordinator should know about, because they are claims about the claim and not about
the code:**

1. **The malformed-file invariant has three reporting paths, and a JSON-only project reaches two of
   them.** M10b and M10c turned a test here red; M10 — the path where a *read* failure is reported
   alongside jobs that something else is still carrying — is unreachable without a markdown directory
   and is pinned by "still reports a corrupt schedules.json when markdown jobs are carrying the
   schedule". So the amended box 89 is fully pinned, but by two tests in two places, not by one.
2. **`asksAsDeny` is not the load-bearing witness for "nothing v2-only on the record".** Stamping it
   unconditionally turns nothing red, because `pushHistory`'s `clipAsks` strips an empty list. The
   load-bearing witness is `inMemoryOnly` (M12). Anyone who later writes a v1-equivalence assertion
   against the presence-only fields should use that one, or check both layers.

**Gates, all run from the worktree on this branch:** `npx tsc --noEmit` clean · `npx vitest run`
318 passed / 1 skipped (319), finished in 36.2 s · `npx tsx harness/smoke.ts` PASS ·
`arggon validate` ok (0 warnings, convention v5) · `arggon spec analyze` clean (2 specs).
