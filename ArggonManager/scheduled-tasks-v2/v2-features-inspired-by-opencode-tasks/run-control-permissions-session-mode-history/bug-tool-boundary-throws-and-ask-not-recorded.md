---
type: bug
status: in_progress
id: bug-tool-boundary-throws-and-ask-not-recorded
title: "schedules_run throws out of the tool, and the ask-report misses the run record"
assignee: arggon
branch: fix/bug-tool-boundary-throws-and-ask-not-recorded
parent: run-control-permissions-session-mode-history
labels: []
created: "2026-10-02"
updated: "2026-10-02"
claimed_at: "2026-10-02T20:18:39.749Z"
depends_on: [bug-oneoff-history-unreadable-and-storage-unbounded]
---
<!--
  Placement (v0): ArggonManager/scheduled-tasks-v2/v2-features-inspired-by-opencode-tasks/run-control-permissions-session-mode-history/bug-tool-boundary-throws-and-ask-not-recorded.md
  Leaves live only under a story. id is the filename stem: bug-tool-boundary-throws-and-ask-not-recorded.
  CLI `arggon create bug tool-boundary-throws-and-ask-not-recorded` adds the bug- prefix (do not pass it twice).
  parent MUST be the story id. Omit assignee when unassigned. Omit blocked_reason unless status is blocked.
-->

# schedules_run throws out of the tool, and the ask-report misses the run record

## Context

Review findings M2 + B5 against `6344ce4` / `0f2eeab`, verdict **changes requested**.

**M2 — `schedules_run` can throw out of the tool.** `applyJobTarget` was awaited **outside** the try
block (src/index.ts:2484 vs 2485). Reproduced: `permission.rules` rejects → `THREW out of the
tool`, with **zero log lines**. This breaks invariant 3 (never breaks a session) and is inconsistent
with every other tool, which catches and reports.

**B5 — T4's ticked acceptance box is not what ships.** The box says an unattended `"ask"` is
"reported as a deny in the run record **and** the `running` log line". It is only a separate log
line (src/index.ts:1966-1968): `HistoryEntry` (653-663) has no field for it and `runJob`'s record
(2029-2039) keeps no trace. Either the code records it or the box and spec 002 are amended — the box
is currently ticked and untrue, which is exactly what the done gate exists to prevent. **A ticked
box that does not describe the code must not stay ticked**, whichever way it is resolved.

## Acceptance

- [ ] `schedules_run` cannot throw out of the tool: every failure is caught, reported in the tool
      output, and logged.
- [ ] Either the run record and history carry the ask-as-deny report, or the T4 box and spec 002 are
      amended to match the code — with the reason stated.
- [ ] Tests cover a rejecting `permission.rules` and assert no throw escapes the tool.

## Notes

Filed by the coordinator from the T3–T6 lead-architect review. A ticked box that does not describe
the code must not stay ticked.

### handoff 2026-10-02 @ses_f01ba5d69ffePxLIcicQ2v651x (session: ses_f01ba5d69ffePxLIcicQ2v651x) — next: Review 7dae3d9: 5 mutations each caught by a named test; 221/221 tests, tsc clean, smoke PASS.
- branch: main
- open questions: B5 chose option 1 (code carries it); if you prefer amending T4 instead, revert the HistoryEntry field. Tool path is unbounded (no boundRun) - separate finding, not in scope.

### handoff 2026-10-02 @ses_f01ba5d69ffePxLIcicQ2v651x (session: ses_f01ba5d69ffePxLIcicQ2v651x) — next: Code review 7dae3d9 on fix/bug-tool-boundary-throws-and-ask-not-recorded (221/221 tests, tsc clean, smoke PASS).
- branch: fix/bug-tool-boundary-throws-and-ask-not-recorded
- open questions: B5 chose option 1 (code carries it) - revert the HistoryEntry field if you prefer amending T4. Out of scope: the tool path is unbounded (no boundRun).

### 2026-10-02 @ses_f01ba5d69ffePxLIcicQ2v651x
## Worker report — commit 7dae3d9 on `fix/bug-tool-boundary-throws-and-ask-not-recorded`

**Correction to the handoff above it:** the first `handoff` block records `branch: main`. That is wrong — `arggon handoff` auto-detects the branch from the *server's* git cwd, which is the primary checkout, not the item worktree. It is a detection artifact, not the branch the work is on. The second block carries the right one. Worth fixing in the tool: a worktree handoff that names the wrong branch is the same class of lie as a ticked box that does not describe the code.

### Why the throw escaped (M2)
In `buildTools`' `run` tool, `sessionFor` and `applyJobTarget` were awaited **above** the `try`, which began one line lower around `ctx.session.prompt` alone. `applyJobTarget` awaits four host promises — `session.create`, `switchAgent`, `switchModel`, and the `permission.rules` T4 added — so any of them rejecting had no handler anywhere: the rejection propagated out of `execute` (invariant 3 broken) and, because the escape preceded every `logLine`, `scheduler.log` got nothing. The prompt `catch` also returned the error but never logged it.

Fix: every call that can reject on the host is now inside the `try`; the `catch` logs `trigger of <id> failed: <message>` before returning the clipped error. The pre-flight refusals above the `try` (unknown id, already running, no `session.prompt`) stay unlogged — that is how every other tool in the file declines, and a declined call is not a dispatch failure. I stated that scope on the box rather than ticking it silently.

### B5 — option 1, the code carries it
An `ask` that becomes a deny is safety-relevant and happens *by construction* — nobody is present to answer it, so it cannot be reported by asking. `schedules_list`'s `askAsDeny` is a config view ("what *would* deny"); it does not answer "what *did* deny", and after a job-file edit it answers a different question than the run did. A record you can read back beats a log line you have to hunt for.

Cost: `applyJobTarget` returns `{ model, asksAsDeny }` instead of a bare model (4 call sites, one line each), `HistoryEntry` gains optional `asksAsDeny?: string[]`, and the ask list is folded into the `running` / `running one-off` / `triggered` line the box names instead of being emitted beside it — one line per dispatch, so the log and the record written from it cannot describe different runs.

Bounding it: `clipAsks` clips to 16 entries × 120 chars on **both** `pushHistory` and `loadHistory`. Necessary rather than tidy — nothing upstream bounds that list's length, because `validatePermissions` caps actions and not the resource patterns under each. `pushHistory` destructures the field out before rebuilding, since a spread cannot remove a key and an empty list must not be stored.

### Tests 216 → 221 · five mutations, each caught
| mutation | caught by | observed failure |
|---|---|---|
| `applyJobTarget` moved back above the `try` | M2 test | raw `permission backend exploded` thrown through `execute` — the reviewer's repro |
| `asksAsDeny` dropped from `runJob`'s record | B5 test | missing field in the record |
| ask clause un-folded from the `running` line | B5 test | `expected '…running asks…' to contain 'asks as deny: edit'` |
| read-side clip removed from `loadHistory` | clip test | `expected [ …(200) ] to have a length of 16` |
| write-side clip removed from `pushHistory` | clip test | same — which is what pins the two sides independently |

The M2 test calls the tool bare rather than through `resolves`, so a rejection fails with the raw error instead of a matcher message. It asserts the typed result, **no admitted prompt**, and the failure logged exactly once — checked on stderr *and* by reading the per-project `scheduler.log` the way a user would. A companion test pins that a job whose rules apply still dispatches, so the boundary catches failures and not the job. B5 is covered by a real scheduled run on the injected clock (record, stored record, `running` line, and a no-asks job carrying no field).

### Gates
`npx tsc --noEmit` clean · `npx vitest run` 221/221 · `npx tsx harness/smoke.ts` PASS · `arggon validate` ok (0 warnings) · `arggon spec analyze` clean.

### Untouched / out of scope
`postLoop` still discards the ask list — a `SessionLoop` carries no `permissions`, so a parameter that is always `[]` would be dead weight. README is T7's. `boundRun`'s timer discipline untouched. The `yaml` seam untouched.

**New finding, not filed as an item (yours to route):** the `run` tool's description claims it obeys "the same concurrency, timeout and lease rules", but the tool path checks only `state.inFlight` — it never calls `boundRun` and never sets a lease. A manual trigger is therefore unbounded and un-leased, unlike the scheduled path it is documented to mirror. Separate from M2/B5, so I did not grow the diff.
