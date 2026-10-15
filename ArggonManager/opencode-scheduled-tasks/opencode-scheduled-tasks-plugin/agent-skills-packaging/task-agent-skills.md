---
type: task
status: done
id: task-agent-skills
title: Convert the repo into Agent Skills under skills/
assignee: Arggon
branch: feat/task-agent-skills
parent: agent-skills-packaging
labels: []
created: "2026-10-15"
updated: "2026-10-15"
---
<!--
  Placement (v0): ArggonManager/opencode-scheduled-tasks/opencode-scheduled-tasks-plugin/agent-skills-packaging/task-agent-skills.md
  Leaves live only under a story. id is the filename stem: task-agent-skills.
  CLI `arggon create task agent-skills` adds the task- prefix (do not pass it twice).
  parent MUST be the story id. Omit assignee when unassigned. Omit blocked_reason unless status is blocked.
-->

# Convert the repo into Agent Skills under skills/

## Context

Implements the story: split the plugin documentation into three skills (setup, jobs, runtime) with references, example assets and an offline validator script.

## Acceptance

- [x] `skills/scheduled-tasks-setup`, `skills/scheduled-tasks-jobs`, `skills/scheduled-tasks-runtime` exist with valid frontmatter.
- [x] `scripts/validate-jobs.ts` runs the plugin's own `loadJobs`/`loadMarkdownJobs`/`mergeJobSources`/`nextOccurrence`, makes no network calls and writes nothing.
- [x] Both example job files under `assets/` validate with it; impossible or malformed jobs are refused.
- [x] README Skills section added; `npm run check` green locally and in CI.

## Notes

Evidence (local, 2026-10-15): validator accepted `assets/schedules.example.json` + `assets/nightly-audit.md` (markdown shadow reported as designed) and refused `0 0 30 2 *`, a bad id and `runTimeout: "0s"` with exit 1.

Merged in PR #5 (merge commit 8010ad6 2026-10-15T13:13:19Z). CI on the merged head: plugin check pass, tasks-validate pass.
