---
# arggon:generated template="opencode/commands/arggon-spec.md"
description: Write a spec (and plan) following the methodology, then verify it
---

Turn $ARGUMENTS into a reviewable spec following the pipeline in
`ArggonManager/docs/agents.md` §Documentation maintenance (decision table:
`references/methodology.md` in the `arggon-cli` skill):

1. Classify the work: trivial changes need no spec; non-trivial features get a
   spec, and multi-wave work a plan too.
2. Create the files directly with your write/edit tools — do not shell out to a
   scaffolding command: `ArggonManager/docs/specs/spec-<slug>-NNN.md` (and with
   a plan, `ArggonManager/docs/plans/plan-<slug>-NNN.md`), using
   `templates/spec.md` / `templates/plan.md` as the structure and the next free
   number for `NNN` (check the directory).
3. Write the spec sections: purpose, synopsis, invariants, flags/JSON shapes,
   acceptance criteria; the plan breaks implementation into ordered tasks that
   link back to the spec.
4. Verify mechanically: re-read the created files against `templates/spec.md` /
   `templates/plan.md` (frontmatter + required sections) and keep
   `tools.arggon.validate({})` green; when the work lives in a tracked item,
   keep its acceptance checklist in sync with the spec.
5. Report the created paths, the validate result and any open findings.
