---
type: task
status: todo
id: task-audit-spec-001-acceptance-boxes
title: spec 001 claims implemented with 0 of 39 acceptance boxes ticked
parent: hygiene-ci-gates-and-doc-statuses
labels: []
priority: p1
created: "2026-10-02"
updated: "2026-10-02"
depends_on: [task-tick-drain-order-oneoffs-before-loops]
---
<!--
  Placement (v0): ArggonManager/scheduled-tasks-v2/v2-features-inspired-by-opencode-tasks/hygiene-ci-gates-and-doc-statuses/task-audit-spec-001-acceptance-boxes.md
  Leaves live only under a story. id is the filename stem: task-audit-spec-001-acceptance-boxes.
  CLI `arggon create task audit-spec-001-acceptance-boxes` adds the task- prefix (do not pass it twice).
  parent MUST be the story id. Omit assignee when unassigned. Omit blocked_reason unless status is blocked.
-->

# spec 001 claims implemented with 0 of 39 acceptance boxes ticked

## Context

`ArggonManager/docs/specs/spec-opencode-scheduled-tasks-001.md` is `status: implemented` and has
**39 acceptance boxes, 0 of them ticked**.

Every other checklist in this repo was ticked as work landed — deliberately, and boxes that turned
out not to describe the code were amended rather than ticked. The spec's own list was skipped
entirely, so its `implemented` status is currently unsubstantiated: it asserts the spec was met,
while its own acceptance section says nothing was ever checked.

This is not a paperwork nit. It already produced a real defect: **boxes 109 and 111 state that
`runTimeoutMs` bounds a run and interrupts its session**, which is false in the code, and the spec
still claims `implemented`. Filed as `bug-run-timeout-never-enforced`. The other 37 boxes are
mostly genuine and tested, but *mostly tested* is not *ticked honestly*, and this repo's entire
reason for existing is the difference.

## Acceptance

- [ ] Every one of the 39 boxes is resolved one of three ways: **ticked with the test that proves
      it** named in a note, **amended** to describe what actually ships, or **moved into a tracked
      item** with a link. No box is left silently unticked under an `implemented` status.
- [ ] Where a box is ticked, the note names the specific test — e.g. "box 131 (DST spring-forward):
      `test/index.test.ts` 'skips a local time that does not exist'". A tick with no test named is
      not accepted.
- [ ] Any box found false is filed as a `bug` with reproduction, not quietly amended to match the
      code. Amending is for boxes that were *mis-specified*; a box that caught a real defect gets an
      item.
- [ ] `spec analyze` and `spec validate` stay clean, and the spec's status still matches reality at
      the end.

## Notes

Do this **after** `bug-run-timeout-never-enforced` lands, or the audit will tick box 109/111 against
code that is about to change. It is an audit, not a rewrite: the expectation is that most boxes are
ticked with a named test, a handful are amended as mis-specified, and a small number become bugs.

Suggested order: the failure and concurrency sections first (107-124), since that is where the
timeout hole lives, then the schedule/DST group (129-135), then the rest.
