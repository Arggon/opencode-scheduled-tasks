---
type: bug
status: done
id: bug-validate-jobs-esm-outside-repo
title: validate-jobs.ts fails with top-level await when the skill is copied outside the repo
assignee: Arggon
branch: fix/bug-validate-jobs-esm-outside-repo
parent: agent-skills-packaging
labels: []
created: "2026-10-15"
updated: "2026-10-15"
---
<!--
  Placement (v0): ArggonManager/opencode-scheduled-tasks/opencode-scheduled-tasks-plugin/agent-skills-packaging/bug-validate-jobs-esm-outside-repo.md
  Leaves live only under a story. id is the filename stem: bug-validate-jobs-esm-outside-repo.
  CLI `arggon create bug validate-jobs-esm-outside-repo` adds the bug- prefix (do not pass it twice).
  parent MUST be the story id. Omit assignee when unassigned. Omit blocked_reason unless status is blocked.
-->

# validate-jobs.ts fails with top-level await when the skill is copied outside the repo

## Context

`skills/scheduled-tasks-jobs/scripts/validate-jobs.ts` uses top-level await. Inside the repo `package.json` has `"type": "module"`, so tsx loads it as ESM. Copied into a skills folder elsewhere (the way skills are installed), tsx treats `.ts` as CJS and fails: `Top-level await is currently not supported with the "cjs" output format`.

## Acceptance

- [x] Script renamed to `validate-jobs.mts` and every reference updated (skill SKILL.md, README).
- [x] Runs inside the repo and when the skill folder is copied outside it.
- [x] `npm run check` passes in CI.

## Notes

Evidence (local, 2026-10-15): the old `.ts` copied outside reproduces the top-level-await error. The `.mts` validates the example jobs both inside the repo (exit 0) and copied to a temp folder with the plugin file passed explicitly (exit 0).

Merged in PR #8 (merge commit 5d123fb). CI on #8: plugin check pass, tasks-validate pass.
