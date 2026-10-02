---
type: task
status: todo
id: task-t7-attribution-docs-and-v2-gate
title: "Attribution, README docs, and the v2 gate"
parent: config-surface-markdown-task-files-durations
labels: []
created: "2026-10-02"
updated: "2026-10-02"
depends_on: [task-pin-twelve-untested-spec-001-behaviours]
---
<!--
  Placement (v0): ArggonManager/scheduled-tasks-v2/v2-features-inspired-by-opencode-tasks/config-surface-markdown-task-files-durations/task-t7-attribution-docs-and-v2-gate.md
  Leaves live only under a story. id is the filename stem: task-t7-attribution-docs-and-v2-gate.
  CLI `arggon create task t7-attribution-docs-and-v2-gate` adds the task- prefix (do not pass it twice).
  parent MUST be the story id. Omit assignee when unassigned. Omit blocked_reason unless status is blocked.
-->

# Attribution, README docs, and the v2 gate

## Context

Credits and documents v2. This task spans all three stories — it is filed under
config-surface because that is where the work starts.

See plan 002 §T7, spec 002, and ADR 0007.

## Acceptance

- [ ] README **Acknowledgements** names `jdormit/opencode-tasks` and its author, and lists the
      ideas adopted from it.
- [ ] README documents: markdown authoring and precedence, permission semantics (rule order,
      unattended `ask`, `external_directory`), session mode, one-offs, loops, history.
- [ ] `opencode-tasks` and its author are also named in spec 002 and cited inline in ADRs
      0004/0005/0006.
- [ ] A **v1 job file with no markdown directory behaves identically** — the upgrade is
      additive, asserted by a test rather than claimed.
- [ ] README's documented commands are executed verbatim by the dogfood run.
- [ ] Package metadata notes the lineage.



## Notes

Plan 002, spec 002 and the cited ADRs are the authority; this body is the
done-gate checklist (ADR 0015).
