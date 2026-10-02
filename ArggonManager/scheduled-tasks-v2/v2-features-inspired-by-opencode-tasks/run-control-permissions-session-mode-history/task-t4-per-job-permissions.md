---
type: task
status: done
id: task-t4-per-job-permissions
title: Per-job permission rules
assignee: arggon
branch: feat/task-t4-per-job-permissions
parent: run-control-permissions-session-mode-history
labels: []
created: "2026-10-02"
updated: "2026-10-02"
depends_on: [task-t3-session-mode-and-run-history]
---
<!--
  Placement (v0): ArggonManager/scheduled-tasks-v2/v2-features-inspired-by-opencode-tasks/run-control-permissions-session-mode-history/task-t4-per-job-permissions.md
  Leaves live only under a story. id is the filename stem: task-t4-per-job-permissions.
  CLI `arggon create task t4-per-job-permissions` adds the task- prefix (do not pass it twice).
  parent MUST be the story id. Omit assignee when unassigned. Omit blocked_reason unless status is blocked.
-->

# Per-job permission rules

## Context

Per-job `permissions` in OpenCode's own schema, applied via `ctx.permission.rules()` immediately
before `session.prompt`. Implements ADR 0005; the semantics warnings originate from
`opencode-tasks` (see ADR 0007).

See plan 002 §T4 and spec 002 § "Permissions".

## Acceptance

- [x] Declared rules are applied before dispatch, in the tested order alongside `agent`/`model`.
- [x] A job with **no** `permissions` leaves the session rules untouched — no implicit tightening.
- [x] An `"ask"` in a scheduled context is reported as a deny in the run record and the
      `running` log line, never left to time out.
- [x] A host without `ctx.permission.rules` degrades to session defaults and logs once.
- [x] README documents last-match-wins ordering with a correct and an incorrect example, and
      names `external_directory` as the quiet default that fails.
- [x] An invalid permission shape refuses the job with a named reason.



## Notes

Plan 002, spec 002 and the cited ADRs are the authority; this body is the
done-gate checklist (ADR 0015).

### 2026-10-02 @ses_f02bdeb4cffejd923dpf4pjWci
**Review verdict: changes requested** (lead-architect review, run after merge; read-only, no edits made).

Commit `6344ce4`. Judge: engineering.md review bar, ADR 0005, spec 002 § "Permissions", plan 002 §T4.

### The core of ADR 0005 is correct — I drove it, not just read it
Ordering, with a fake host recording every call on one `schedules_run`:
`switchAgent(build)` → `switchModel(space-bunny-free)` → `permission.rules(sessionID)` → `session.prompt`.
- **An exception in `switchAgent`/`switchModel`/`permission.rules` cannot let a prompt through** — the failure aborts before the prompt, both in `runJob` (src/index.ts:2007-2019, inside the `try`) and on the tool path. The specific worry does not exist.
- **No implicit tightening**: `permission.rules` is called only when `job.permissions !== undefined` (src/index.ts:1958). Re-applied every run, never assumed to persist, as ADR 0005 requires.
- **Blast radius is contained**: `sessionFor` gives the job its own session (`scheduled: <id>`), so replacing that session's rules cannot silently re-scope a human's session.
- Validation is the right shape for untrusted input (bounded action count, effects restricted to the three literals, no nested objects) and the degradation path logs once (src/index.ts:1962). README's last-match-wins section with a wrong/right example and the `external_directory` call-out is present and correct (README:217-265). Test coverage for the ordering, the absent-permissions case, the cap and the degradation is genuine (test/index.test.ts:1141-1328).

### Blocking for the done gate

**1. The `"ask"`-as-deny report is not "in the run record and the `running` log line", as this item's own checkbox claims.** The checkbox reads *"An `"ask"` in a scheduled context is reported as a deny in the run record and the `running` log line, never left to time out"*, and spec 002 § Permissions says the same. What actually ships:
- a **separate** log line emitted before dispatch: `job nightly declares "ask" permissions with nobody to answer them; treated as deny: bash:*, external_directory` (src/index.ts:1966-1968). Observed on a real run — the `running`/`triggered` line itself contains nothing about the asks.
- `schedules_list` exposes `askAsDeny` (src/index.ts:2180-2181) — a *config* view, not a run record.
- `HistoryEntry` (src/index.ts:653-663) has **no** field for it, and `runJob`'s recorded entry (src/index.ts:2029-2039) carries no trace of which rules denied. So `schedules_history` cannot answer "did this unattended run hit an ask?", which is the whole point of the feature.

*Fix:* fold the ask list into the `running` line (src/index.ts:2009-2011) and add e.g. `asksAsDeny: string[]` to `HistoryEntry` + the run record; a regression test asserting it appears in both. If you decide the separate line plus `askAsDeny` is the intended reporting surface, then **amend the checkbox and spec 002 wording** instead — do not leave the tick claiming something the code does not do.

### Non-blocking, but should not ship as-is

**2. `schedules_run` throws out of the tool when `applyJobTarget` rejects.** `await applyJobTarget(ctx, job, sessionID)` sits **outside** the `try` that begins on the next line (src/index.ts:2484-2485). With a host whose `ctx.permission.rules` rejects, the probe gave `THREW out of the tool: "permission backend exploded"` and **zero log lines**. That breaks invariant 3 ("no throw out of the plugin"), produces no `scheduler.log` line for a real dispatch failure, and is inconsistent with every other tool in the file, which returns `{ output: { error } }`. T4 widened the surface that can throw here (the new `rules` await). *Fix:* move the call inside the existing `try`; return the clipped error in `output`.

**3. Dead export.** `MAX_PERMISSION_ACTIONS` is used; `collectAsks` is used. No dead code from this diff — noting the negative explicitly.

### Process
- No harness/smoke.ts coverage and no recorded end-to-end evidence for the ordering or the ask behaviour; the ordering evidence in this verdict comes from my own probe, not from anything committed. engineering.md § Smoke gate requires expected-vs-observed recorded **in the verdict** — which is what this is, but it should have been produced before merge.
- ADR 0005 is still `status: Proposed` after the feature landed (engineering.md § ADR: `Proposed` in the PR, `Accepted` on merge). Same for 0006 and for v1's 0001-0003, so this is project-wide rather than T4-specific, but it should be swept.
- `npm run typecheck` clean; 119/119 tests pass locally.

### 2026-10-02 — provenance: the `"ask"`-as-deny box was untrue here, and is now true

`bug-tool-boundary-throws-and-ask-not-recorded` (the M2 + B5 item filed from this verdict) resolved
B5 by making the code carry what this box claims, rather than by amending the box. As of
`6344ce4` the claim above was **false** — the ask report was a separate log line, and neither
`HistoryEntry` nor `runJob`'s record kept any trace of it, so `schedules_history` could not answer
"did this unattended run hit an ask?". Now `HistoryEntry` carries `asksAsDeny`, clipped to 16
entries of 120 characters on both the write and the read side, the ask list is folded into the
`running` log line the box names, and both halves are pinned by tests. The box is ticked and
describes the shipped code; nothing else in this item was reopened, and this note is provenance
only — `status` stays `done`.
