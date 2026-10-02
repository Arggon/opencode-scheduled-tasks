---
type: task
status: todo
id: task-chore-ci-and-doc-statuses-for-plugin-and-v2
title: "No CI runs the plugin's tests; v2 docs statuses were never flipped"
branch: chore/task-chore-ci-and-doc-statuses-for-plugin-and-v2
parent: hygiene-ci-gates-and-doc-statuses
labels: []
created: "2026-10-02"
updated: "2026-10-02"
---
<!--
  Placement (v0): ArggonManager/scheduled-tasks-v2/v2-features-inspired-by-opencode-tasks/hygiene-ci-gates-and-doc-statuses/task-chore-ci-and-doc-statuses-for-plugin-and-v2.md
  Leaves live only under a story. id is the filename stem: task-chore-ci-and-doc-statuses-for-plugin-and-v2.
  CLI `arggon create task chore-ci-and-doc-statuses-for-plugin-and-v2` adds the task- prefix (do not pass it twice).
  parent MUST be the story id. Omit assignee when unassigned. Omit blocked_reason unless status is blocked.
-->

# No CI runs the plugin's tests; v2 docs statuses were never flipped

## Context

## Context

Review finding (L3), verdict **changes requested**.

**No CI runs the plugin's tests or typecheck.** `.github/workflows/arggon.yml` only runs the
tracker gate. So "tests green in CI" was never true for the plugin, and nothing on GitHub would
have caught a regression — which is how five blocking defects reached `main`.

**Statuses were not flipped at landing.** spec 002 and plan 002 are still `status: proposed` and
ADRs 0004–0007 are still `Proposed` despite shipping. ADRs 0001–0003 are the same — a
project-wide drift. The methodology requires flipping spec/plan status in the landing PR.

**Two story items were cascaded to `done` with empty template bodies.** `config-surface-…` and
`ephemeral-tasks-…` have no Context/Acceptance text, so there is no record of what they were
meant to deliver.

## Acceptance

- [ ] CI runs `npm run check` (typecheck + tests) on push/PR and fails on a failure.
- [ ] The harness (`npx tsx harness/smoke.ts`) is exercised in CI, or its exclusion is
      deliberate and documented.
- [ ] spec 002, plan 002 and ADRs 0004–0007 are `implemented`/`Accepted`; ADRs 0001–0003 too.
- [ ] Both v2 story bodies state their scope and acceptance instead of template stubs.


## Notes

Filed by the coordinator from the T3–T6 lead-architect review.

Filed by the coordinator from the T3–T6 lead-architect review.

Also fold in the README defects the review listed — duplicated `## Job reference` heading,
stale `running` samples predating the `session` field, `schedules_start_loop`/`stop_loop`
missing from the Tools list, and the Cost safety / Threat model sections not updated for
features that post into live sessions — **unless T7 already covered them**; check before editing,
and do not collide with T7 if it is running.



## Notes

Filed by the coordinator from the T3–T6 lead-architect review.
