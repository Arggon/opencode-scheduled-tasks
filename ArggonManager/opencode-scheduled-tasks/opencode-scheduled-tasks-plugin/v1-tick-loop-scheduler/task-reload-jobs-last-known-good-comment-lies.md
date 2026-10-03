---
type: task
status: done
id: task-reload-jobs-last-known-good-comment-lies
title: "reloadJobs' last-known-good branch has no caller and its comment promises mid-edit resilience that cannot happen"
assignee: arggon
branch: chore/task-reload-jobs-last-known-good-comment-lies
parent: v1-tick-loop-scheduler
labels: []
priority: p2
created: "2026-10-03"
updated: "2026-10-03"
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

- [x] Decide which is true and make the code and comment agree: either jobs **are** reloaded mid-session
      (in which case this branch becomes reachable and needs a test), or they are not (in which case the
      comment states what actually happens — a broken file at startup leaves the project with no jobs and
      a reported error).
- [x] If the decision is "no reload", consider whether the **branch itself** should go. Dead code with a
      reassuring comment is the worst of both; and spec 001 box 89 was already amended by the audit
      worker to the reachable invariant, so the spec no longer depends on it.
- [x] Whatever is decided, the README's statement about needing `opencode reload` after editing a job
      file should be checked against it. That sentence is user-facing and currently true.


## Forward-looking constraint (was a conditional box; the condition is false)

**If reload is ever implemented**, it must: bound it, and remember the tick's writer lease and armed timer
are decided from `state.jobs` — a reload that adds or disables jobs has to re-decide arming, or a
project will sit idle with work it does not know about. That is the
`bug-ephemeral-work-never-arms-tick` shape again.

**Not ticked — deliberately: the condition is false.** Reload was **not** implemented (decision
below), so there is nothing to bound and nothing to re-decide arming for. Ticking it would tick a
claim about work that does not exist. Hot-reload deserves its own item with its own acceptance;
it is not claimed, filed or promised here.

## Decision: (a) no reload, and the branch is gone

Jobs are **not** reloaded mid-session. `reloadJobs` has exactly one call site — `await reloadJobs(ctx,
directory, state)` in `setup` (src/index.ts:5085) — reached with `state.jobs === []`, and `state.jobs`
/ `state.specs` are assigned **nowhere else in the file** (grep: the only writes are inside `reloadJobs`
itself, src/index.ts:3333-3334). So the set it writes is the only set a session ever has, and there was
never a previous one to retain. That matches ADR 0001 ("changing a job means editing the file and
reloading; there is no runtime mutation path"), which is the architecture's own statement.

**(b) was not taken deliberately, and its size is the reason.** A reload changes *when* `state.jobs` can
change, and `arm` derives both the writer lease (ADR 0003) and the timer from `state.jobs` plus the
ephemeral drains — so a reload that adds or disables jobs must re-decide arming, or a project sits idle
with work it does not know about. That is `bug-ephemeral-work-never-arms-tick` again, and it shipped
once already. Bounding it (watcher cost, debounce, what happens to a job removed mid-session, history
and cursor retention) is a feature of its own, not a drive-by on a comment fix. **Recommendation to the
coordinator: file it separately if it is wanted at all** — the plugin is correct without it, and the
README gap below is the only user-visible consequence.

### What was removed, and why it was safe

The branch was **removed**, not re-commented:

```ts
if (payload === undefined && markdown.jobs.length === 0 && markdown.invalid.length === 0) {
  // Nothing loaded at all: retain the last-known-good set and report only the reason.
  // Tearing down running jobs because a file was deleted mid-edit would be worse than the
  // bug it reports.
  state.fileError = failure
  return
}
```

Checked before removing it:

- **Its rationale was unreachable.** "Retain the last-known-good set" needs a populated `state.jobs`;
  the only caller has `[]`.
- **Its assignment was not a no-op, and that is why removing it is right.** `state.fileError` is read in
  exactly two places: `schedules_list` (src/index.ts:4515) and the idle-project log line
  (src/index.ts:5185-5188).
  In every case where the branch fired, the fall-through already computes the *same string*: with
  `payload === undefined`, `loadJobs` is never called (so `loaded.error` is empty), and
  `readProblem = failure` because `loaded.jobs.length === 0`. The branch was a second path to a result
  the code below it always produced — except that it **dropped** the other surface's reason: when
  `.opencode/tasks` could not be read, `markdown.error` was discarded and the project was told only
  "no .opencode/schedules.json". `mergeJobSources` is documented and pinned to "report both surfaces'
  errors rather than dropping one", so the branch contradicted a pinned invariant.
- **`state.jobs` / `state.specs` / `state.invalid` were already initialised** to `[]` / `new Map()` /
  `[]` in `setup`'s state literal, so the branch's skipping of those three assignments changed identity,
  not content. Nothing anywhere reads any of the three by identity.
- **Mutation, both directions.** Restoring the branch verbatim: **322 of the 323 pre-existing tests
  still pass and only the new one goes red** — so no pre-existing expectation depended on it. Removing
  it: 323 pass. The suite is 324 now (one added).
- **The two tests that already pinned the malformed-file case pass unchanged**, in both directions:
  `names a broken schedules.json once, and stays loaded and inert` (spec 001 box 89 as amended) and
  `surfaces the error on malformed JSON, with no last-known-good set to fall back on`, plus
  `still reports a corrupt schedules.json when markdown jobs are carrying the schedule`. **No test
  expectation changed when the branch was removed** — the whole suite is green with and without it,
  except for the one test added to pin the delta.

### What the comment says now, verbatim

On `reloadJobs` (src/index.ts:3284-3290), replacing the branch's two sentences:

> **Read once per session, from `setup`, and never again** — no watcher, no second call site
> (ADR 0001: "changing a job means editing the file and reloading"). So the job set this writes
> is the only set the session has, and there is no last-known-good one to fall back on: a
> malformed or missing `schedules.json` leaves the project with **no jobs and a named reason**,
> which is the whole of the guarantee. What that costs the project is *not* its silence — the
> reason reaches `schedules_list` and the one idle-project log line — and it is never a torn-down
> running job, because a running job exists only if this same read already admitted it.

And where the branch was, so the next reader knows the history (src/index.ts:3309-3313):

> Nothing short-circuits here. An earlier revision returned early when neither surface yielded
> anything, on the promise of "retaining the last-known-good set" — a set that cannot exist here
> (see the note above), and whose only real effect was to *drop* a second surface's reason: an
> unreadable `.opencode/tasks` was reported as a missing `schedules.json` and nothing else. The
> merge below reports both, which is what `mergeJobSources` already promised.

Plus one clause at the call site (`setup`, src/index.ts:5082-5083), because that is where a reader
asks "why is this not reloaded?":

> The only read of either surface in this session, which is why an edit to a job file
> lands on the next `opencode reload` and not on the next tick — see `reloadJobs`.

### README: the premise does not hold, and there is a real (small) gap — **not edited, out of lane**

`README.md` has **four** `opencode reload` mentions (lines 37, 52-53, 60, 505) and **none of them is
about editing a job file**: three are about the plugins directory being scanned at startup, one is the
lease being reclaimable so `reload` does not strand the plugin. Grepped for `take effect`, `restart`,
`picked up`, `re-read`, `at startup`, `Editing`, `changes` — nothing tells a user that a job-file edit
needs a reload either.

So: the sentence is **not** present, and under decision (a) **nothing in the README becomes false**. What
is missing is the sentence in the other direction — a user who edits `schedules.json` mid-session and
sees nothing happen is currently told nothing. Suggested line for whoever owns README.md, in the
"Jobs are per project, the plugin is not" section next to the idle-project notice:

> Job files are read **once**, at startup. Editing `.opencode/schedules.json` or
> `.opencode/tasks/*.md` takes effect after `opencode reload` — nothing re-reads them mid-session, so a
> fix to a broken file needs that reload too.

The idle-project log line the README quotes (line 88) is the **no-error** wording; the broken-file
wording is `no enabled jobs (<reason>); no timer armed (…)`. Unchanged by this item, and quoted on
purpose: the reason is what makes the line fixable.

### Not corrected, deliberately: a test name that promises the same thing

`surfaces the error on malformed JSON, with no last-known-good set to fall back on` is the same promise in a test
title, and the same body it always had — its own comment says "Malformed on a cold read: nothing to
retain, but the error is reported, not hidden." **Left as is on purpose**: that name is cited by name in
spec 001's box-89 verdict (twice) and in the *done* item `task-pin-twelve-untested-spec-001-behaviours`
(twice), and renaming it would mean rewriting a discharged record. Flagging it for the coordinator
instead: if the name is worth fixing, it should be renamed in one change that touches all four
citations, not silently in a comment-fix PR.

## Evidence

- `npx tsc --noEmit` — clean.
- `npx vitest run` — **323 passed | 1 skipped (324)**, finishes in ~36s. Baseline before this change:
  322 passed | 1 skipped (323).
- `npx tsx harness/smoke.ts` — `PASS: the scheduler admitted a scheduled prompt on a real clock and
  recorded it`.
- `node …/ArggonManager/dist/cli.js validate` — `ok (0 warning(s), convention v5)`.
- `node …/ArggonManager/dist/cli.js spec analyze` — `clean (2 spec(s) scanned)`.

Mutations run (each reverted; the tree is the intended one):

| Mutation | Expected | Observed |
| --- | --- | --- |
| Restore the removed branch verbatim | only the new test red | 1 failed / 322 passed / 1 skipped — the failure is `expected 'no .opencode/schedules.json' to match /\.opencode\/tasks/` |
| `readProblem` drops its `loaded.jobs.length === 0` disjunct | the new test's second assertion red | 1 failed — `expected '.opencode/tasks: EACCES…' to match /no \.opencode\/schedules\.json/` |

Untestable, and why: the *comment* is the fix and cannot be asserted by a test — the two doc-block claims
(one call site; `state.jobs`/`state.specs` written only there) were verified by grep over the file, and
are recorded above so a reviewer can re-run them. The new test also cannot run as root or on Windows
(`chmod` withholds nothing there); it is declared with `it.runIf` rather than passing vacuously, and the
run-local and GitHub-hosted runs are both non-root POSIX, so it is exercised in both.

## Notes

Filed by the coordinator from the pin-twelve worker's report, which declined to tick box 89 because
doing so would have ticked dead code, and amended it instead. **That was the right call and is the
reason this is visible.**

Do not implement hot-reload as a drive-by: it changes when `state.jobs` can change, which interacts with
arming, the writer lease and the concurrency budget. If you do implement it, treat it as its own item
with its own acceptance.
