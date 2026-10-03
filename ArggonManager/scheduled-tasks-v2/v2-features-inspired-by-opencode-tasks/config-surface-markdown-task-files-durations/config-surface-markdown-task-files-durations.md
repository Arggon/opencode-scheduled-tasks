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
- [x] `.opencode/tasks/<id>.md` is loaded and merged by id with markdown winning, so a prompt can
      live in version control as prose (`task-t2`, ADR 0004). `TASKS_DIR`, `loadMarkdownJobs` and
      `mergeJobSources` are on `main`; verified live on a real host — `schedules_format` names both
      surfaces and the precedence rule, and a JSON-only project resolves **no** package at all
      (pinned by two tests: the static import list is exactly `["node:fs","node:os","node:path"]`,
      and `setup` runs under an ESM resolve hook reporting every non-builtin resolution).

      *This box was written on 2026-10-02 saying markdown was **not** loaded, which was true when
      `task-chore-ci-and-doc-statuses-for-plugin-and-v2` wrote it and false once `task-t2` landed.
      Nobody had updated it, so a `done` story carried a box asserting the feature was absent —
      the exact failure the acceptance audit exists to catch, sitting in a closed item.*

## Notes

This story is **fully delivered** and closed `done`: durations by `task-t1`, markdown task files by
`task-t2`.

*History, kept because it explains the correction above.* When
`task-chore-ci-and-doc-statuses-for-plugin-and-v2` wrote this body, markdown files had not shipped,
so it recorded the story as half delivered and deliberately left the frontmatter `status` alone as a
coordinator call. `task-t2` then landed and closed; the body was never revisited, which left a
`done` story asserting in its own acceptance list that the feature it exists to deliver was absent.
