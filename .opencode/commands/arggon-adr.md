---
# arggon:generated template="opencode/commands/arggon-adr.md"
description: Record a cross-cutting decision as a Proposed ADR
---

Record the decision behind $ARGUMENTS as an ADR.

The process and the minimum template live in `ArggonManager/docs/engineering.md`
§ADR process — read it first and follow it; do not invent a new format or
location. Write the file directly with your write/edit tools (no scaffolding
command):

1. Confirm the decision qualifies (stack/package layout, identity model,
   claim/concurrency, reserved namespaces or breaking schema changes, a new
   top-level package). Typos, pure refactors and local implementation choices
   do not need an ADR.
2. Number it 4-digit monotonic under `ArggonManager/docs/adr/NNNN-short-title.md`
   (check the directory for the next free number) and keep the template
   sections: Status / Date / Deciders, Context, Decision, Consequences,
   Alternatives considered.
3. Ground it in the exploration or spec that produced it
   (`ArggonManager/docs/explorations/`) and link that evidence.
4. Status starts `Proposed` and becomes `Accepted` on merge; a landed ADR is
   never rewritten — supersede it with a new one.
5. Report the path, the status and the follow-up work the decision unblocks.
