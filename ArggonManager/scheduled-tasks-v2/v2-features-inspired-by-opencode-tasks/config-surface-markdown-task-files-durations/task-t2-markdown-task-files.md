---
type: task
status: todo
id: task-t2-markdown-task-files
title: Markdown task files alongside the JSON array
parent: config-surface-markdown-task-files-durations
labels: []
created: "2026-10-02"
updated: "2026-10-02"
depends_on: [task-t1-durations-and-format-tool]
---
<!--
  Placement (v0): ArggonManager/scheduled-tasks-v2/v2-features-inspired-by-opencode-tasks/config-surface-markdown-task-files-durations/task-t2-markdown-task-files.md
  Leaves live only under a story. id is the filename stem: task-t2-markdown-task-files.
  CLI `arggon create task t2-markdown-task-files` adds the task- prefix (do not pass it twice).
  parent MUST be the story id. Omit assignee when unassigned. Omit blocked_reason unless status is blocked.
-->

# Markdown task files alongside the JSON array

## Context

Loads `.opencode/tasks/<id>.md` (YAML frontmatter + body-as-prompt) and merges it with the JSON
array by id, markdown winning. Implements ADR 0004.

See plan 002 §T2 and spec 002 § "Config surface".

## Acceptance

- [x] A markdown job loads and fires; the body is the prompt with frontmatter stripped and
      surrounding blank lines trimmed.
- [x] A duplicate id across surfaces yields exactly one job plus one **reported** shadow.
- [x] Bad YAML, a missing schedule, a bad id or a missing body refuses **only** that job, with a
      named reason, through the same validation path as JSON.
- [x] With no `.opencode/tasks/` directory the plugin imports **nothing** new and behaves
      identically to v1 (asserted by a load-time test — invariant 4).
- [x] Frontmatter is treated as untrusted: field sizes and collection cardinality bounded, and
      no frontmatter value interpolated into a prompt.



## Notes

Plan 002, spec 002 and the cited ADRs are the authority; this body is the
done-gate checklist (ADR 0015).
