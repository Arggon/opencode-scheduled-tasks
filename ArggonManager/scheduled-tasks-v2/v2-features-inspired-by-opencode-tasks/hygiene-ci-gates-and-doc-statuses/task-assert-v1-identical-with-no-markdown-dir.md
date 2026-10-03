---
type: task
status: in_progress
id: task-assert-v1-identical-with-no-markdown-dir
title: No test asserts a v1 job file behaves identically when no markdown directory exists
assignee: arggon
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

- [ ] A test states the v1 contract positively, covering admission, `nextRun` in a negative-offset zone,
      the cap, misfire, the malformed-file invariant, the run-record shape, and key layout.
- [ ] Each assertion is mutation-checked. Report the mutation and whether it went red.
- [ ] The claim is scoped honestly in the note: this asserts the **v1 contract as specified**, not a
      diff against a v1 binary, because none exists. Say that in the box note so nobody later reads it
      as a regression suite against a build we do not have.
- [ ] Close `task-t7-attribution-docs-and-v2-gate`'s remaining box by reference, with this test named.

## Notes

Filed by the coordinator from the T7 worker's report, which declined to write the test because
`test/index.test.ts` belonged to the other worker in that wave. It is free now.

Do **not** regress the markdown surface or the two tests that pin the static imports and the
zero-external-resolution property — they are the additive half of exactly this claim, and the new test
sits beside them rather than replacing them.
