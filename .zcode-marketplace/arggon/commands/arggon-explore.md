---
# arggon:generated template="zcode/arggon/commands/arggon-explore.md"
description: Classify the work, then run a stack spike or the greenfield exploration protocol
---

Explore $ARGUMENTS as a recorded decision — not a chat summary.

1. Classify first: **spike** (one open question, throwaway answer),
   **bounded** (an existing flow to read and extend), or **greenfield** (a new
   project, subsystem or interface others will depend on). The ratchet is
   one-way — complexity found later upgrades the classification, nothing
   downgrades it.
2. **Greenfield** → run the six-phase protocol in
   `.agents/skills/arggon-cli/references/exploration.md` (stance, ground,
   frontier rounds, edge-case hunt, approaches) and record it with
   `templates/exploration-project.md`. Hard gate: no implementation task
   before a spec passes `spec analyze` with no NEW findings (ADR 0017).
3. **Spike / bounded (stack decision)** → create
   `ArggonManager/docs/explorations/exploration-<slug>-NNN.md` directly with
   your write/edit tools (next free number; no scaffolding command),
   following `templates/exploration.md`.
4. Research the candidates yourself: current versions and best practices with
   dated sources, recorded under the template's candidates / criteria / findings
   / recommendation sections.
5. End with one recommendation and its trade-offs. If the decision is
   cross-cutting, the follow-up is an ADR (`/arggon-adr`) that links this
   exploration; file any follow-up work as a tracked item with `mcp__arggon__arggon_create`.
6. Report the path, the classification and any follow-up work.
