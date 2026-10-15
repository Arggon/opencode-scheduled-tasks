---
type: task
status: done
id: task-arggon-0-10-upgrade
title: Upgrade ArggonManager to 0.10.0
assignee: Arggon
branch: chore/arggon-0.10.0
parent: hygiene-ci-gates-and-doc-statuses
labels: []
created: "2026-10-15"
updated: "2026-10-15"
---
<!--
  Placement (v0): ArggonManager/scheduled-tasks-v2/v2-features-inspired-by-opencode-tasks/hygiene-ci-gates-and-doc-statuses/task-arggon-0-10-upgrade.md
  Leaves live only under a story. id is the filename stem: task-arggon-0-10-upgrade.
  CLI `arggon create task arggon-0-10-upgrade` adds the task- prefix (do not pass it twice).
  parent MUST be the story id. Omit assignee when unassigned. Omit blocked_reason unless status is blocked.
-->

# Upgrade ArggonManager to 0.10.0

## Context

The seam and CI pin were on 0.5.0 while 0.10.0 is the latest release.

## Acceptance

- [x] `arggon init --backup` (0.10.0) regenerated the seam; local `plugin-check` job and `.gitignore` kept
- [x] `ARGGON_VERSION` pinned to 0.10.0
- [x] `arggon validate` ok; CI green

## Notes

## Evidence

- `arggon validate: ok (0 warning(s), convention v5)` locally with arggon 0.10.0
- Branch chore/arggon-0.10.0; CI on the PR
