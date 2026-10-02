---
type: story
status: done
id: config-surface-markdown-task-files-durations
title: "Config surface: markdown task files, durations"
assignee: arggon
parent: v2-features-inspired-by-opencode-tasks
labels: []
created: "2026-10-02"
updated: "2026-10-02"
---
<!--
  Placement (v0): ArggonManager/scheduled-tasks-v2/v2-features-inspired-by-opencode-tasks/config-surface-markdown-task-files-durations/config-surface-markdown-task-files-durations.md (story index; required).
  parent MUST be the epic id. Optional style prefixes (e.g. story-) are not type discriminators.
-->

# Config surface: markdown task files, durations

## Context

Two ways to author a job was the v2 config-surface bet, taken from
[`jdormit/opencode-tasks`](https://github.com/jdormit/opencode-tasks) and settled by
[ADR 0004](../../../docs/adr/0004-markdown-task-files-alongside-json.md): keep the JSON array
and add `.opencode/tasks/<id>.md` beside it, merging by id with **markdown winning** — so a
prompt can live in version control as prose instead of a JSON string escape. The second half of
the story is the boring prerequisite that made it authorable at all: `runTimeout` and loop
intervals take duration strings (`30s`, `5m`, `1h30m`, `1d`) instead of raw milliseconds, with a
bare number meaning seconds, and `schedules_format` returns the whole reference so an agent can
author a correct job without guessing.

## Acceptance

What actually shipped, as of 2026-10-02 — recorded after the fact, not a re-open:

- [x] Duration strings on `runTimeout` and loop intervals; a bare number is seconds; a malformed
      or non-positive duration is refused with a named reason (`task-t1`).
- [x] The millisecond field `runTimeoutMs` still works, unchanged, and the new field loses to it
      only when the old one is absent.
- [x] `schedules_format` returns the job-file reference — both config surfaces, the precedence
      rule, and the fields that carry a cost or permission consequence.
- [ ] `.opencode/tasks/<id>.md` is **not** loaded. `schedules_format` documents the surface and
      the precedence rule, but `src/index.ts` reads only `.opencode/schedules.json`; there is no
      directory scan, no frontmatter parser and no merge. `task-t2` is the honest record.

## Notes

Frontmatter `status` is left as-is on purpose: this story is half delivered (durations yes,
markdown files no), so it is a coordinator call whether it closes as done or waits on T2.
Recorded by `task-chore-ci-and-doc-statuses-for-plugin-and-v2`, which was scoped to docs and
tracker statuses only.
