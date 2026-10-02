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

- [x] `schedules_run` cannot throw out of the tool: every failure is caught, reported in the tool
      output, and logged. (Scope stated rather than left to the reader: the pre-flight refusals —
      unknown id, already running, no `session.prompt` — stay unlogged, because that is exactly how
      every other tool in the file declines and a declined call is not a dispatch failure. Every
      failure from admission onwards is caught, returned as `{ output: { error } }` and logged.)
- [x] Either the run record and history carry the ask-as-deny report, or the T4 box and spec 002 are
      amended to match the code — with the reason stated. (Option 1: the code carries it. See Notes.)
- [x] Tests cover a rejecting `permission.rules` and assert no throw escapes the tool.

## Notes

Filed by the coordinator from the T3–T6 lead-architect review. A ticked box that does not describe
the code must not stay ticked.

### 2026-10-02 — M2 fixed, B5 resolved by making the code carry it

**M2 — why the throw escaped.** In the `schedules_run` tool, `sessionFor` and `applyJobTarget` were
awaited *above* the `try`, and `applyJobTarget` awaits four host promises: `session.create`,
`switchAgent`, `switchModel` and — the one T4 added — `permission.rules`. The tool's `try` began one
line lower, around `ctx.session.prompt` alone. Any of those four rejecting therefore had no handler
at all: the rejection propagated out of `execute`, which is invariant 3 (never break a session)
broken, and because the escape happened before any `logLine` there was nothing in `scheduler.log`
to show the dispatch had failed. The prompt `catch` also returned the error but never logged it,
so even a prompt failure was invisible in the per-project log. Fix: everything that can reject on
the host now sits inside the `try`, and the `catch` logs `trigger of <id> failed: <message>`
before returning the clipped error. The pre-flight guards above the `try` are untouched and stay
unlogged — see the scope note on the first box.

**B5 — option 1, the run record carries it.** The reasoning, since the item asks for it: an `ask`
that becomes a deny is a safety-relevant event, and it happens *by construction* — nobody is
present to answer it, so it cannot be reported by asking. `schedules_list`'s `askAsDeny` is a
**config** view and answers "what *would* deny"; after the job file changes, or for a run that
predates the ask, it does not answer "what *did* deny", and `schedules_history` answered nothing
at all. A record a user can read back is worth more here than a log line they must go hunting
for. The cost is bounded and small: `applyJobTarget` now returns `{ model, asksAsDeny }` instead of
a bare model string (its four call sites adapted, one line each), `HistoryEntry` gains an optional
`asksAsDeny?: string[]`, and the ask list is folded into the `running` / `running one-off` /
`triggered` line the box names instead of being emitted beside it — one line per dispatch, so the
log and the record it is written from cannot describe different runs. `schedules_list` keeps its
config view; both surfaces now answer different questions.

**Bounding the new field.** `asksAsDeny` is clipped on *both* sides by one shared `clipAsks`, to 16
entries of 120 characters each (`HISTORY_ASK_ENTRIES_MAX` / `HISTORY_ASK_LEN_MAX`). That bound is
necessary rather than tidy: `error` and `model` are single strings, but the ask list is an array
whose length nothing upstream bounds — `validatePermissions` caps the *actions* a job may
constrain and not the resource patterns under each one, so one action can expand into an unbounded
number of asks, and a stored record can be edited from outside entirely. The write side in
`pushHistory` destructures the field out before rebuilding the entry, because a spread cannot
*remove* a key: an empty or malformed list comes back without the field rather than with the raw
one attached. An absent field means "nothing was downgraded"; an empty array would say it twice.

**Tests: 216 → 221.** Five new tests in a dedicated describe. M2 is covered black-box through the
real tool on a host whose `ctx.permission.rules` rejects: the test asserts the call *resolves*
(the call is left bare rather than wrapped in a matcher so the raw rejection stays in the failure
message), returns `{ id, error }` naming the host's message, admits no prompt, and logs the
failure exactly once — checked on stderr *and* by reading the per-project `scheduler.log` the way
a user would. A companion test pins that a job whose rules apply still dispatches normally, so the
boundary catches failures and not the job. B5 is covered by a real scheduled run on the injected
clock: the record read back through `schedules_history` carries `asksAsDeny: ["edit"]`, the stored
record carries it (so it survives a restart), the `running` line says `asks as deny: edit`, and a
job with no asks carries no field at all. The clip is pinned on both sides against a 200-entry,
4 KB-per-entry list.

**Mutations run, five, all caught.** (1) moving `sessionFor`/`applyJobTarget` back above the `try`
→ the M2 test fails with the raw `permission backend exploded` thrown through `execute`, the
reviewer's repro exactly. (2) dropping `asksAsDeny` from `runJob`'s record → the B5 test fails on
the missing field. (3) un-folding the ask clause out of the `running` line → the B5 test fails on
`expected '…running asks…' to contain 'asks as deny: edit'`. (4) removing the read-side clip in
`loadHistory` → the clip test fails `expected [ …(200) ] to have a length of 16`. (5) removing the
write-side clip in `pushHistory` → the same, which is what pins that the two sides cannot be
regressed independently.

**Untouched deliberately.** `postLoop` keeps discarding the ask list: a `SessionLoop` carries no
`permissions`, so `applyJobTarget` can only ever return an empty list for it, and adding a
parameter that is always `[]` would be dead weight. README is T7's. The `yaml` optional-dependency
seam and its tests were not disturbed. No box is left unticked.

**Spec 002.** The § Permissions wording was already correct and is now true, so it stands. § Run
history listed what an entry records; the asks are added there so the spec describes the shipped
record. T4's box is likewise now true; a provenance note was added to its body (body text only —
its `status` is untouched and it was not reopened).

