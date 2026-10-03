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

- [ ] `JOB_FORMAT_REFERENCE` advertises only values the parser actually accepts, **or** states the
      clamp next to the example so the reader knows `30s` becomes `60s`.
- [ ] `permissions` and `session` appear in the field table with their defaults and the consequence of
      each (permissions change what a run may do; session decides whether a run joins an existing session
      or gets a fresh one).
- [ ] A test asserts the reference's example values against `parseDuration`, so the two cannot drift
      again. This is the assertion that was missing: the reference and the parser have been free to
      disagree because nothing compared them.
- [ ] `schedules_format` remains the single source of truth — prefer deriving the bounds from the same
      constants the parser uses rather than restating them as literals.
- [ ] Check whether the spec 002 acceptance wording needs amending, or whether the code catching up is
      sufficient. State which.

## Notes

Filed by the coordinator from the T7 worker's report. p2 — it is documentation the tool hands a user,
not a runtime fault, but it is *machine-readable* documentation, which makes a wrong example worse than
a wrong prose one: it looks authoritative to anything that reads it.

**Do not regress** the markdown surface: `.opencode/tasks/<id>.md` with YAML frontmatter, markdown winning
per-id, and `yaml` as an optionalDependency reached only by a guarded dynamic import. The reference
documents both surfaces, so it must stay accurate about both.
