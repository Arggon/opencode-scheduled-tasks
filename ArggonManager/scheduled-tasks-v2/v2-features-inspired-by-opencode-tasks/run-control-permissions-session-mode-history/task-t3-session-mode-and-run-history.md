---
type: task
status: done
id: task-t3-session-mode-and-run-history
title: Session mode (reuse/fresh) and bounded run history
assignee: arggon
branch: feat/task-t3-session-mode-and-run-history
parent: run-control-permissions-session-mode-history
labels: []
created: "2026-10-02"
updated: "2026-10-02"
depends_on: [task-t1-durations-and-format-tool]
---
<!--
  Placement (v0): ArggonManager/scheduled-tasks-v2/v2-features-inspired-by-opencode-tasks/run-control-permissions-session-mode-history/task-t3-session-mode-and-run-history.md
  Leaves live only under a story. id is the filename stem: task-t3-session-mode-and-run-history.
  CLI `arggon create task t3-session-mode-and-run-history` adds the task- prefix (do not pass it twice).
  parent MUST be the story id. Omit assignee when unassigned. Omit blocked_reason unless status is blocked.
-->

# Session mode (reuse/fresh) and bounded run history

## Context

`session: reuse|fresh` and a bounded per-job run-history ring buffer with a `schedules_history`
tool. See plan 002 §T3 and spec 002 § "Session mode" / "Run history".

## Acceptance

- [x] `reuse` (default) preserves v1 behaviour; `fresh` creates a new session per run.
- [x] A `session` value other than `reuse`/`fresh` is refused with a named reason.
- [x] Resolved mode appears in `schedules_list` and in the `running` log line.
- [x] History is capped and evicts oldest-first; it can never grow unbounded.
- [x] Each entry records due instant, start, outcome, resolved model and a bounded error string.
- [x] `schedules_history` returns newest-first; an unknown id returns a typed error naming it,
      not an empty success.



## Notes

Plan 002, spec 002 and the cited ADRs are the authority; this body is the
done-gate checklist (ADR 0015).

### 2026-10-02 @ses_f02bdeb4cffejd923dpf4pjWci
**Review verdict: approve with comments** (lead-architect review, run after merge; read-only, no edits made).

Commit `0f2eeab`. Judge: engineering.md review bar, spec 002 § "Session mode" / "Run history", plan 002 §T3.

### Verified working
- **Ordering claim holds.** `schedules_list` reports the resolved mode (src/index.ts:2177) and the `running` line names it (src/index.ts:2010) — verified by driving the plugin.
- **`reuse`/`fresh` semantics are right.** `fresh` creates per run and caches nothing; `reuse` caches the job's first session (src/index.ts:1803-1822). `schedules_run` goes through the same `sessionFor`, so the manual path cannot bypass the mode.
- **An unrecognised `session` is refused by name, not defaulted** (src/index.ts:830-833). Right call, and the comment explains why.
- **The ring is bounded on every write path.** `pushHistory` (src/index.ts:1117) is called from all three record paths (job run `finally`, one-off catch, one-off success), and `loadHistory` re-caps at `MAX_HISTORY_LIMIT` on read (src/index.ts:1865). Oldest-first eviction is tested (test/index.test.ts:1040) and a persisted `outcome` outside the four literals is dropped rather than crashing the load (src/index.ts:1853).
- **`schedules_history` newest-first, typed error naming an unknown id** — covered (test/index.test.ts:1106) and re-verified by probe.
- Harness coverage for the scheduled path recording history is the right instinct and matches the commit message.

### Findings (non-blocking for this item; file as follow-ups)

**1. History *field sizes* are bounded on write but not on read.** `pushHistory` clips `error` to `HISTORY_ERROR_MAX` (src/index.ts:1123), but `loadHistory` copies `error` and `model` through `asString` unclipped (src/index.ts:1854-1861). The comment at src/index.ts:1863-1864 says "Bounded on read as well as on write" — that is true of cardinality only. A hand-edited or corrupted storage record can push an arbitrarily long string into memory and back out to storage on the next save.
*Fix:* clip `error` to `HISTORY_ERROR_MAX` and bound `model` in `loadHistory`; soften the comment to say what is actually bounded.

**2. `outcome: "timeout"` and `outcome: "skipped"` are unreachable in `HistoryEntry`.** spec 002 § Run history lists `timeout` and `skipped` as entry outcomes; `runJob` only ever writes `"failed"` or `"ok"` (src/index.ts:1991-2022), and a skipped occurrence is recorded on `state.lastStatus` only (src/index.ts:1065, 1070). spec 001 § "…is recorded as skipped, never queued" is satisfied via state + log, so this is a spec-002 wording mismatch rather than a behavioural bug — but the type advertises two states the code cannot produce. Either write them (a skipped occurrence as a history entry would also make `schedules_history` show *why* a job missed runs) or drop them from the spec's list.

**3. Changing a job from `reuse` to `fresh` leaves the old session cached** in `state.sessions` for the life of the process (src/index.ts:1804-1816). Harmless (nothing reads it for a `fresh` job) but it is stale state with no owner; worth clearing on reload.

**4. Docs: the README's `running` line samples predate this change.** README:130 and README:157-158 show `running <id> (schedule "…" <tz>)` without the `session <mode>` field T3 added at src/index.ts:2010. T3 updated the harness but not these two samples. (README:76 also has a duplicated heading, `## Job reference## Job reference`, introduced by 93df968 — separate trivial fix.)

**5. Minor smells in this diff:** `applyJobTarget` computes `const asks = job.permissions === undefined ? [] : collectAsks(...)` *before* the guard that uses it (src/index.ts:1957-1958) — dead work on the no-permissions path; and `SchedulerState.storageAvailable` (src/index.ts:1703, 2529) is written and never read (pre-existing, from 366fd53).

### Not verified here
Real-host behaviour of `ctx.session.create`/`prompt`/`permission.rules`; no OpenCode server was started, so session-mode behaviour was exercised against a fake context only. `arggon validate` green; `npm run typecheck` clean; 119/119 tests pass locally — but see my note on T5/T6 that the tick half of the ephemeral features has no test coverage at all.
