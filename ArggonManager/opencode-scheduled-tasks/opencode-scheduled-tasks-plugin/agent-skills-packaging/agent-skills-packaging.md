---
type: story
status: in_progress
id: agent-skills-packaging
title: Agent Skills packaging
assignee: Arggon
parent: opencode-scheduled-tasks-plugin
labels: []
created: "2026-10-15"
updated: "2026-10-15"
---
<!--
  Placement (v0): ArggonManager/opencode-scheduled-tasks/opencode-scheduled-tasks-plugin/agent-skills-packaging/agent-skills-packaging.md (story index; required).
  parent MUST be the epic id. Optional style prefixes (e.g. story-) are not type discriminators.
-->

# Agent Skills packaging

## Context

Gonzalo asked for the plugin to ship as skills that follow the open Agent Skills standard (agentskills.io/specification), so an agent can install, author and operate the scheduler without guessing.

## Acceptance

- [ ] `skills/` holds spec-valid skills (name = directory, lowercase-hyphen, description under 1024 chars).
- [ ] Every claim in the skills is backed by `src/index.ts` or the README.
- [ ] README has a Skills section; tests and CI stay green.

## Notes
