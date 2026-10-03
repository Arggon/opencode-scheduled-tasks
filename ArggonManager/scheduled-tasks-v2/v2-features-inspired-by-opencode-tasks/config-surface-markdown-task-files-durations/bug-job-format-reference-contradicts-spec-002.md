---
type: bug
status: in_progress
id: bug-job-format-reference-contradicts-spec-002
title: schedules_format advertises a runTimeout the parser rejects and omits permissions and session
assignee: arggon
branch: fix/bug-job-format-reference-contradicts-spec-002
parent: config-surface-markdown-task-files-durations
labels: []
priority: p2
created: "2026-10-03"
updated: "2026-10-03"
claimed_at: "2026-10-03T05:40:58.156Z"
depends_on: [task-t7-attribution-docs-and-v2-gate]
---
<!--
  Placement (v0): ArggonManager/scheduled-tasks-v2/v2-features-inspired-by-opencode-tasks/config-surface-markdown-task-files-durations/bug-job-format-reference-contradicts-spec-002.md
  Leaves live only under a story. id is the filename stem: bug-job-format-reference-contradicts-spec-002.
  CLI `arggon create bug job-format-reference-contradicts-spec-002` adds the bug- prefix (do not pass it twice).
  parent MUST be the story id. Omit assignee when unassigned. Omit blocked_reason unless status is blocked.
-->

# schedules_format advertises a runTimeout the parser rejects and omits permissions and session

## Context

Found by `task-t7-attribution-docs-and-v2-gate`, which could not fix it because `src/index.ts` belongs to
the other worker in that wave. Two defects in `JOB_FORMAT_REFERENCE` — the string `schedules_format`
returns.

**1. It advertises a value the parser rejects.** The reference lists `30s` as an example
`runTimeout` duration. `runTimeout` is clamped to a **1-minute minimum**
(`MINUTE_MS`..`24 * 60 * MINUTE_MS`, src/index.ts:919-920). Probed while writing the docs:

```
"30s" -> 60000      "45" -> 60000      "2d" -> 86400000
```

So `30s` parses to 60 s, not 30 s. A user copying the example out of the reference gets a value that is
silently multiplied by two — and the reference is the **machine-readable** answer to "what is valid?", so
it is the last place this should be wrong.

**2. It omits two fields that exist.** `permissions` and `session` are absent from its field table
entirely, even though both are implemented, both are documented in the README, and both were landed in
v2 (ADR 0005, and the session-continuity decision). A user who asks the tool what the format is gets a
list that predates v2.

This second one **contradicts spec 002's own acceptance wording**, which asserts the reference names
both config surfaces and the precedence rule without qualifying it as v1-only. So the spec is currently
claiming something false about the code — the same class of defect the spec 001 audit found four of.

## Acceptance

- [x] `JOB_FORMAT_REFERENCE` advertises only values the parser actually accepts, **or** states the
      clamp next to the example so the reader knows `30s` becomes `60s`.
- [x] `permissions` and `session` appear in the field table with their defaults and the consequence of
      each (permissions change what a run may do; session decides whether a run joins an existing session
      or gets a fresh one).
- [x] A test asserts the reference's example values against `parseDuration`, so the two cannot drift
      again. This is the assertion that was missing: the reference and the parser have been free to
      disagree because nothing compared them.
- [x] `schedules_format` remains the single source of truth — prefer deriving the bounds from the same
      constants the parser uses rather than restating them as literals.
- [x] Check whether the spec 002 acceptance wording needs amending, or whether the code catching up is
      sufficient. State which.

## What was done

**The reference is now derived, not restated.** `MIN_RUN_TIMEOUT_MS` / `MAX_RUN_TIMEOUT_MS` are new
named constants (`MINUTE_MS` and `24 * 60 * MINUTE_MS`, unchanged values) and every one of the five
clamp sites uses them, so `JOB_FORMAT_REFERENCE` interpolates the window and the default straight out
of them. Moving the clamp moves the text; there is no second copy to forget.

The `runTimeout` row, before and after:

```
before  | `runTimeout` | no | Duration: `30s`, `5m`, `1h30m`, `1d`. A bare number means seconds. |
after   | `runTimeout` | no | Duration; a bare number means seconds. Clamped to `1m`–`24h`, default
        `15m`. Every value here is inside that window, so it is used exactly as written: `1m`, `5m`,
        `1h30m`, `1d`. Shorter or longer is clamped to the window, never refused. |
```

Both halves of the first box are satisfied: no advertised value is clamped, *and* the clamp is stated
next to the examples with "never refused" so the reader knows `30s` becomes `1m` rather than being
rejected. `runTimeoutMs` gained the precedence rule it was missing ("`runTimeout` wins when both are
set"), and `maxCatchUp`'s default is now `${DEFAULT_MAX_CATCH_UP}` rather than a typed `5`.

`session`: "`reuse` (the default) keeps one session per job, so runs build on prior context; `fresh`
starts a new session per run, for stateless work. Any other value is refused by name."

`permissions`: "Per-job rules in OpenCode's own schema: an action mapped to `allow`/`ask`/`deny`, or to
a map of glob `resource` → effect. Absent ⇒ the session default is inherited unchanged." The
"Unattended permission rules (v2)" section now says *where* the field goes ("in the job file, in the
host's own schema, on either surface") instead of "declare `permissions`", which named no surface.

Reference length 2478 → 3366 chars, against the suite's existing `< 4000` bound.

## The drift test

`test/index.test.ts` → `describe("schedules_format reference cannot drift from the parser")`, five
tests. The load-bearing one pulls every backticked token out of the reference's `runTimeout` row,
keeps the ones `parseDuration` accepts, and asserts each resolves through `validateJob` to *exactly*
`parseDuration(token).ms` — i.e. no clamp moved it. A guard on the count (`>= 4`) stops the row from
passing vacuously by advertising nothing.

The others tie documented claims to the code that has to be true: the window's endpoints and default
resolve to `MIN_RUN_TIMEOUT_MS`/`MAX_RUN_TIMEOUT_MS`/`DEFAULT_RUN_TIMEOUT_MS` and out-of-window values
clamp rather than fail; `session`'s named modes are the modes `validateJob` accepts and an unlisted
one is refused; `permissions`' named effects and both rule shapes are what `validatePermissions`
accepts; and `session` + `permissions` are honoured on the **markdown** surface too (loaded through
`loadMarkdownJobs` with a stub reader, asserting stem→id and body→prompt too).

Mutation checks, one red test each, reverted after:

| Mutation | Red test |
| --- | --- |
| put `30s` back as an advertised example | advertises only runTimeout values the parser uses exactly as written |
| delete the `permissions` row | documents `permissions` with the schema the validator accepts… |
| delete the `session` row | documents `session` with both modes, the default… |
| `MIN_RUN_TIMEOUT_MS` → `30_000` | states the clamp as the parser applies it… |
| drop the clamp on an explicit `runTimeout` | states the clamp as the parser applies it… |
| markdown loader drops `session` | honours `session` and `permissions` on the markdown surface too… |

## Spec 002 — my recommendation

**The code catching up is sufficient for the box this item was filed against; spec 002 does not need
amending for it.** `spec-opencode-scheduled-tasks-002.md:192` reads "`schedules_format` returns the
job-file reference so an agent can author jobs correctly" — unqualified, and now true: both surfaces,
the precedence rule, the cost-bearing fields and the permission-bearing fields. The story box it came
from (`config-surface-markdown-task-files-durations.md:39`) claims "the fields that carry a cost or
permission consequence", which is likewise true now of `permissions` in the table rather than only in
prose.

**One thing I did find, which is the coordinator's call and not this item's.** Spec 002's Durations
section (`:107`) reads "`runTimeout` and loop intervals accept duration strings — `30s`, `5m`, `2h`,
`1d`, and compounds like `1h30m` — and plain numbers as seconds", and **no box anywhere in the spec
mentions the 1-minute–24-hour clamp that `runTimeout`/`runTimeoutMs` have always applied.** The box is
literally true — the parser does accept `30s` — but read alone it implies a 30-second run, which is
the same misreading this item is about, one level up. I recommend a coordinator decision to add a box
(or amend `:107`) naming the clamp window and that out-of-window values are clamped, not refused. The
clamp is currently documented in the README (`:116`-`:119`) and, as of this fix, in the reference; the
spec is the only surface that does not state it.

## Findings not fixed here (out of this item's lane)

- **`README.md:145`-`:147` is now false.** It reads "Its field table does **not** list `permissions` or
  `session`, so read those two in the table above." That sentence documented the bug as intended
  behaviour. README was rewritten by the T7 worker and is not in this item's lane, so it is reported,
  not edited.
- **The reference's `schedule` row omits `@midnight`, `@yearly` and `@annually`.** All three parse
  (`MACROS`, `src/index.ts:355`). That is an incompleteness, not a false claim — an agent writing
  `0 0 * * *` instead of `@midnight` gets identical behaviour — so it was left alone rather than
  spending reference budget on it. It cannot be fixed by interpolation either: `MACROS` is declared
  *after* `JOB_FORMAT_REFERENCE`, so deriving from it would mean moving the reference down the file.
- **No CHANGELOG entry added.** The file is still the untouched `arggon init` template with five empty
  sections and no other worker has added one; putting this item's line there first would be a
  convention question, not a fix.

## Gates

`npx tsc --noEmit` clean · `npx vitest run` **304 tests, 303 passed, 1 win32-gated skip, 35.7 s and
finished** (299 before) · `npx tsx harness/smoke.ts` PASS · `arggon validate` ok (0 warnings, v5) ·
`arggon spec analyze` clean. Not touched: the markdown surface's loader, the `yaml` seam, the static
import list, and every pinned behaviour in the do-not-regress list.

## Notes

Filed by the coordinator from the T7 worker's report. p2 — it is documentation the tool hands a user,
not a runtime fault, but it is *machine-readable* documentation, which makes a wrong example worse than
a wrong prose one: it looks authoritative to anything that reads it.

**Do not regress** the markdown surface: `.opencode/tasks/<id>.md` with YAML frontmatter, markdown winning
per-id, and `yaml` as an optionalDependency reached only by a guarded dynamic import. The reference
documents both surfaces, so it must stay accurate about both.
