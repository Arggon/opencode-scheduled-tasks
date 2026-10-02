---
# arggon:generated template="opencode/commands/arggon-playbook.md"
description: Create or refresh a technology playbook with dated research
---

Handle the technology playbook for $ARGUMENTS (pipeline: explore → ADR →
playbook, details in `references/methodology.md` in the `arggon-cli` skill).

1. Create `ArggonManager/docs/playbooks/<tech>.md` directly with your
   write/edit tools (no scaffolding command); follow the structure of an
   existing playbook in `ArggonManager/docs/playbooks/`. Research is your job:
   current version and best practices with dated sources.
2. Fill the sections: Setup, Conventions, Testing, Security, Upgrade policy,
   plus the `playbook_id` / `version` / `researched` / `status` frontmatter.
3. Freshness: playbooks older than the threshold (default 90 days,
   `x-playbooks.max-age-days` in the tracker config) go stale — check the
   `researched` dates in the directory, and file one re-research task per stale
   playbook with `tools.arggon.create`.
4. After re-researching, update only the frontmatter — `version`, `researched`
   (today) and `status: current` — the body keeps the curated content.
5. Report the path, the pinned version and the freshness state.
