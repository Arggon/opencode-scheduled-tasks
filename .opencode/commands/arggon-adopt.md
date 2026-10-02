---
# arggon:generated template="opencode/commands/arggon-adopt.md"
description: Adopt ArggonManager in this repo as a tracked, agent-executable migration
agent: arggon-coordinator
---

Adopt ArggonManager in this repository ($ARGUMENTS; default: the current repo),
following the adoption procedure in the `arggon-cli` skill §Adoption.

1. Complete the bootstrap first with the headless adapter (no model needed):
   `npx arggon-manager init [--full]` — it never overwrites adopter files and
   records provenance; this is the one sanctioned CLI step.
2. File the tracked migration task with the native tool — a `task` titled
   "Adopt ArggonManager in this repo" under the story
   (`tools.arggon.create({ type: "task", parent: "<story-id>", title: ... })`),
   with the checklist below as its acceptance body; create the
   initiative/epic/story chain first when the tree has none.
3. Execute the checklist as work on that item:
   - read the generated docs (`AGENTS.md`,
     `ArggonManager/docs/convention.md`, `engineering.md`, `playbooks/`);
   - sweep the existing repo docs and **extract** the project description,
     conventions, workflows and stack into the generated docs (never wholesale
     copy);
   - archive docs you replaced to `backup/<YYYY-MM-DD>/` preserving relative
     paths; never archive `README.md` — merge into it instead;
   - detect the stack from the manifests and create/refresh a playbook per
     technology with dated research;
   - leave the `SECURITY.md` contact for a human, never invent it.
4. Baseline sanctioned edits with `npx arggon-manager adopt --ack` (headless
   adapter), then verify: `tools.arggon.validate({})` green.
5. Report on the adoption item with `tools.arggon.comment` — extracted content,
   archived files, created playbooks — and hand it to the human for review
   before flipping it `done`.
