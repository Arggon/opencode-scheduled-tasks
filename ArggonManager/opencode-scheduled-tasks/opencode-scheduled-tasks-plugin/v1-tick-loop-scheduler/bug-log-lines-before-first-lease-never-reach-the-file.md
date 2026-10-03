---
type: bug
status: done
id: bug-log-lines-before-first-lease-never-reach-the-file
title: "The first diagnostic lines never reach scheduler.log, because only acquireLease creates the log directory"
assignee: arggon
branch: fix/bug-log-lines-before-first-lease-never-reach-the-file
parent: v1-tick-loop-scheduler
labels: []
priority: p2
created: "2026-10-02"
updated: "2026-10-03"
depends_on: [bug-storageless-degradation-unrecorded]
---
<!--
  Placement (v0): ArggonManager/opencode-scheduled-tasks/opencode-scheduled-tasks-plugin/v1-tick-loop-scheduler/bug-log-lines-before-first-lease-never-reach-the-file.md
  Leaves live only under a story. id is the filename stem: bug-log-lines-before-first-lease-never-reach-the-file.
  CLI `arggon create bug log-lines-before-first-lease-never-reach-the-file` adds the bug- prefix (do not pass it twice).
  parent MUST be the story id. Omit assignee when unassigned. Omit blocked_reason unless status is blocked.
-->

# The first diagnostic lines never reach scheduler.log, because only acquireLease creates the log directory

## Context

Found by `task-audit-spec-001-acceptance-boxes`: **spec 001 box 151 is false.** The audit's verdict is
recorded on the box in the spec.

The box requires every fire/skip/error to reach **both** `stderr` **and**
`~/.local/share/opencode/scheduled-tasks/<project>/scheduler.log`, and justifies the file sink by
noting plugin `console.error` is not captured into OpenCode's own log.

The dual sink works — pinned by tests that read `scheduler.log` back — **for every line emitted after
the first lease**. But the log directory is created by `acquireLease`, which only runs when there is
work to arm. So **every line emitted before it never reaches the file.**

**Reproduction:** fresh process, one enabled job, `ctx.storage.scan` absent. `stderr` receives
`ctx.storage.scan is unavailable, …` and then `could not append to …/scheduler.log`;
`scheduler.log` does not exist. Same for an idle project: the line explaining *why* the plugin is
inert — `no enabled jobs in .opencode/schedules.json or .opencode/tasks …; no timer armed` — is
stderr-only.

That is the wrong way round. The lines lost are exactly the **startup and degradation diagnostics**,
which are the ones you need when nothing is working and there is nothing in the file to read. A
project that never arms a timer leaves no evidence it was ever loaded.

Secondary, noted by the audit: the box says every line includes the job id, and the degradation
notices (missing `scan`, no YAML reader, lease unavailable, loop-scan cap) name no job — correctly,
since they are not about one. Fold that clarification into the box wording when you touch it.

## Acceptance

- [x] The log directory is created independently of `acquireLease`, so **any** line can reach
      `scheduler.log` — including the inert-project notice and every degradation notice.
      `ensureLogDir(logPath(directory, projectID))` runs in `setup` where `activeLogPath` is
      assigned: after `ctx.location.directory` is read (so the project id the path needs is
      known) and before `reloadJobs` / `loadStates` / the storage notice (so their lines have a
      file to land in). `acquireLease` keeps its own `mkdirSync` and still arbitrates alone.
- [x] A test starts from a directory with no log dir and asserts a startup line is in the file, not
      just on stderr. Cover the idle-project case, since that is the one that currently leaves no
      evidence at all.
      "writes the idle-project line into the file, from a directory that never held a lease" and
      "writes the ctx.storage.scan degradation into the file, not just on stderr". Both read the
      file back; reverting the fix turns six of this item's tests red.
- [x] Failure to create the directory is itself reported once, clearly, and does not recurse.
      Reported on a bare `console.error` — not through `emit`, which would try to append into the
      directory that just failed and report a second failure behind it — and the caller leaves
      `activeLogPath` unset so no later line attempts an append. Once per **path**, not once per
      process, because one host loads this plugin for every project it opens.
- [x] The "every line includes the job id" clause is amended to say job-scoped lines carry the id
      and host-level notices do not.
      Spec 001 box 151 now says so, and also states the one line that stays `stderr`-only — the
      `ctx.location.directory is unavailable` notice, which has no `<project>` to log under.

## Notes

Filed by the coordinator from the spec 001 audit. p2 because it costs observability rather than
correctness — but it is the kind of gap that makes the *next* outage take twice as long to diagnose,
which is exactly what the file sink was added to prevent.

### 2026-10-03 @ses_f00da35beffeyGcWtSNGMGYWTD
## Fix — `f679415` on `fix/bug-log-lines-before-first-lease-never-reach-the-file`

### Where the log directory is now created

`ensureLogDir(logPath(directory, projectID))` in `setup`, at the old `activeLogPath = logPath(...)`
line (src/index.ts:4620-4633). It runs **after** `ctx.location.directory` is read — so the project id
the path depends on is already known, which was the ordering problem in the brief — and **before**
`reloadJobs` / `loadStates` / `loadAllHistory` / the storage notice, so every one of those lines has a
file to land in. `acquireLease` keeps its own `mkdirSync` and still does all the arbitrating.

### Still stderr-only

Exactly one line: `ctx.location.directory is unavailable; the scheduler is inert`. It is emitted *before*
`ctx.location` yields a directory, so there is no `<project>` to log under. I did not paper over this —
spec 001 box 151 now names it as the one exception rather than claiming a universal dual sink.

### Failed log writes

A failed `mkdirSync` is reported on a bare `console.error` from `ensureLogDir`, deliberately **not**
through `emit`: `emit` would try to append into the directory that just failed to appear and report a
second failure behind it — for whichever project the module was last loaded for. The caller leaves
`activeLogPath` unset, so `emit` short-circuits and no later line attempts an append. Nothing in the
failure path calls back into the log, so it cannot recurse. Once-guard keyed by **path**, not globally:
one host loads this plugin per project and the line names a directory, so a second unwritable project
reports its own instead of being silenced.

### Log dir vs lease lockfile

`ensureLogDir` only calls `mkdirSync(dirname(path), { recursive: true })`. It writes no file. An idle
project gets `scheduler.log` and **no** `writer.lock` — pinned by "creates the log directory without
taking the writer lease", which also re-asserts that `acquireLease` is still exclusive afterwards
(seeded foreign pid, since a same-pid re-acquire deliberately takes the lease back). ADR 0003's single
writer is untouched: `acquireLease` remains the only thing that arbitrates.

### Box wording

Spec 001 box 151 now reads: job-scoped lines (fires, skips, run failures, loop and one-off outcomes)
carry the job/loop/task id; **host-level notices do not**, because they are not about one job — missing
`ctx.storage` surface, missing `ctx.storage.scan`, missing YAML reader, unavailable writer lease, the
loop-scan cap, and the inert-project notice. Box ticked with a note pinning each claim by test name.

### Mutations (each run against the whole suite)

| Mutation | Caught by |
|---|---|
| M1 revert to lease-only `mkdirSync` (the original defect) | **6 tests red** |
| M4 `ensureLogDir` also writes `writer.lock` | 2 of mine + 6 existing |
| M3 global once-guard instead of path-scoped | 2 red |
| M6 swallow the mkdir failure silently | 2 red |
| M5 drop the `activeLogPath = undefined` pre-clear | 1 red |
| M2 route the mkdir failure through `emit()` | **not caught — see below** |

M1/M3/M4/M6 all red when my describe runs alone, so none of them depends on test order.

**M2 not caught, and why:** with the pre-clear in place, `emit` inside `ensureLogDir`'s catch sees
`activeLogPath === undefined` and returns before attempting an append, so routing through `emit` is
not behaviourally observable *given* that fix. The raw-`console.error` choice is therefore defensive
rather than pinned. What is pinned is the property: "says once, on stderr, … never retries per line"
asserts no `could not append to …` ever appears. M5 shows the two are load-bearing together — drop the
pre-clear *and* route through `emit` and the complaint lands in the previous project's file.

### Test count

**259 -> 267.** All 259 pre-existing tests still pass untouched.

### Gates

```
npx tsc --noEmit                      clean
npx vitest run                        267 passed (267)
npx tsx harness/smoke.ts              PASS
arggon validate                       ok (0 warning(s), convention v5)
arggon spec analyze                   clean (2 spec(s) scanned)
```

### Unticked boxes

None in this item — all four acceptance boxes are made and ticked. Spec 001 still has 4 unticked boxes;
box 151 is now ticked (it was the false one the audit recorded).

### One thing worth the coordinator's eye

The **existing** test at test/index.test.ts:6037 already blocks the data dir with a regular file to make
`acquireLease` degrade. It now also trips `ensureLogDir`, so it spends a log-directory failure. That is
harmless (my once-guard is path-scoped) but it is why an early version of my test failed for a
cross-test reason rather than a real one — worth knowing before someone makes that guard global again.

### handoff 2026-10-03 @ses_f00da35beffeyGcWtSNGMGYWTD (session: ses_f00da35beffeyGcWtSNGMGYWTD) — next: Coordinator to code-review f679415 and merge; then flip the item to done. No follow-up work outstanding.
- branch: fix/bug-log-lines-before-first-lease-never-reach-the-file
- open questions: M2 (routing the mkdir failure through emit) is not mutation-caught because the activeLogPath pre-clear makes it unobservable; acceptable? Box 151 now names one stderr-only line (no project) — check t…
