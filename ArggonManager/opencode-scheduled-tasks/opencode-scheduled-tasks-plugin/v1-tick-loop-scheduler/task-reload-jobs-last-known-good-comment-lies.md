---
type: task
status: in_progress
id: task-reload-jobs-last-known-good-comment-lies
title: "reloadJobs' last-known-good branch has no caller and its comment promises mid-edit resilience that cannot happen"
assignee: arggon
branch: chore/task-reload-jobs-last-known-good-comment-lies
parent: v1-tick-loop-scheduler
labels: []
priority: p2
created: "2026-10-03"
updated: "2026-10-03"
claimed_at: "2026-10-03T10:45:42.526Z"
depends_on: [bug-project-id-dotdot-escapes-lease-base]
---
<!--
  Placement (v0): ArggonManager/opencode-scheduled-tasks/opencode-scheduled-tasks-plugin/v1-tick-loop-scheduler/task-reload-jobs-last-known-good-comment-lies.md
  Leaves live only under a story. id is the filename stem: task-reload-jobs-last-known-good-comment-lies.
  CLI `arggon create task reload-jobs-last-known-good-comment-lies` adds the task- prefix (do not pass it twice).
  parent MUST be the story id. Omit assignee when unassigned. Omit blocked_reason unless status is blocked.
-->

# reloadJobs' last-known-good branch has no caller and its comment promises mid-edit resilience that cannot happen

## Context

Found by `task-pin-twelve-untested-spec-001-behaviours` while pinning spec 001 box 89, and confirmed by
the coordinator. **The finding is that a test cannot be written, because the behaviour has no caller.**

Box 89 claimed that malformed JSON in the job file "retains the **last-known-good** job set". The code
does contain a branch that looks like it does that:

```ts
if (payload === undefined && markdown.jobs.length === 0 && markdown.invalid.length === 0) {
  // Nothing loaded at all: retain the last-known-good set and report only the reason.
  // Tearing down running jobs because a file was deleted mid-edit would be worse than the
  // bug it reports.
  state.fileError = failure
  return
}
```

But `reloadJobs` has **exactly one call site** — `setup`, at a point where `state.jobs` is still `[]`.
So "retain the last-known-good set" retains an **empty** set. There is no last-known-good set to retain,
because jobs are loaded once at startup and **never reloaded during a session**.

The second comment sentence is the real problem: *"Tearing down running jobs because a file was deleted
mid-edit would be worse than the bug it reports"* describes a mid-edit deletion resilience that **cannot
occur**, because nothing reloads the file mid-session. Editing `.opencode/schedules.json` and expecting
the change to take effect requires `opencode reload` — which is true, and is documented elsewhere, but it
is not what this comment says.

So this is a comment promising a property the architecture cannot deliver. A future reader trusting that
comment would assume hot-reload resilience exists and might build on it.

## Acceptance

- [ ] Decide which is true and make the code and comment agree: either jobs **are** reloaded mid-session
      (in which case this branch becomes reachable and needs a test), or they are not (in which case the
      comment states what actually happens — a broken file at startup leaves the project with no jobs and
      a reported error).
- [ ] If the decision is "no reload", consider whether the **branch itself** should go. Dead code with a
      reassuring comment is the worst of both; and spec 001 box 89 was already amended by the audit
      worker to the reachable invariant, so the spec no longer depends on it.
- [ ] Whatever is decided, the README's statement about needing `opencode reload` after editing a job
      file should be checked against it. That sentence is user-facing and currently true.
- [ ] If reload is implemented instead: bound it, and remember the tick's writer lease and armed timer
      are decided from `state.jobs` — a reload that adds or disables jobs has to re-decide arming, or a
      project will sit idle with work it does not know about. That is the
      `bug-ephemeral-work-never-arms-tick` shape again.

## Notes

Filed by the coordinator from the pin-twelve worker's report, which declined to tick box 89 because
doing so would have ticked dead code, and amended it instead. **That was the right call and is the
reason this is visible.**

Do not implement hot-reload as a drive-by: it changes when `state.jobs` can change, which interacts with
arming, the writer lease and the concurrency budget. If you do implement it, treat it as its own item
with its own acceptance.
