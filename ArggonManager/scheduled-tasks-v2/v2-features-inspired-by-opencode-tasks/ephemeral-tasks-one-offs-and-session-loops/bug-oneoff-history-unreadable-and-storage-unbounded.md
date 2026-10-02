---
type: bug
status: in_progress
id: bug-oneoff-history-unreadable-and-storage-unbounded
title: One-off history is unreadable and storage keys accumulate
assignee: arggon
branch: fix/bug-oneoff-history-unreadable-and-storage-unbounded
parent: ephemeral-tasks-one-offs-and-session-loops
labels: []
created: "2026-10-02"
updated: "2026-10-02"
claimed_at: "2026-10-02T19:37:55.739Z"
depends_on: [bug-run-timeout-never-enforced]
---
<!--
  Placement (v0): ArggonManager/scheduled-tasks-v2/v2-features-inspired-by-opencode-tasks/ephemeral-tasks-one-offs-and-session-loops/bug-oneoff-history-unreadable-and-storage-unbounded.md
  Leaves live only under a story. id is the filename stem: bug-oneoff-history-unreadable-and-storage-unbounded.
  CLI `arggon create bug oneoff-history-unreadable-and-storage-unbounded` adds the bug- prefix (do not pass it twice).
  parent MUST be the story id. Omit assignee when unassigned. Omit blocked_reason unless status is blocked.
-->

# One-off history is unreadable and storage keys accumulate

## Context

Review findings B4 + M4 + M5 against `26be6d5`, verdict **changes requested**.

**B4 — one-off history is written but can never be read, and keys accumulate.** History was written
under `task.id` (src/index.ts:2131-2141) but `schedules_history` resolved only `state.jobs`
(src/index.ts:2424-2429). Reproduced: `schedules_history` on a completed one-off returns
`no job with id "oneoff_…"`. Two published statements were therefore false — the README ("a
completed one-off survives only in `schedules_history`") and the `cancel` error message ("check
schedules_history"). `storage.remove` was never called anywhere, so every one-off left a permanent
key.

**M4 — bounds are write-side only.** `loadOneOffs` (1396-1421) and `loadLoops` (1498-1522)
returned the whole stored array uncapped; `loadHistory` (1845-1866) capped cardinality but copied
`error`/`model` unclipped — the clip lives only in `pushHistory` (1123), so its "bounded on read as
well as on write" comment overstates. `MAX_LOOP_CAP` (1454) was exported and never used while its
comment claimed a hard ceiling.

**M5 — silent failure paths record nothing.** The early returns at 1884-1891 and 1898 bypassed the
catch, and the tick recorded only `ok`. The success path also stamped `startedAt` at *completion*
(2136) rather than dispatch.

- **Added by the loop fix** — `postLoop` records under `history/<id>` too, so a loop shares the
  `history/<id>` key space with jobs and one-offs. Practically unreachable (ids are generated with a
  random suffix), but it is the same key-space question this item already raises for one-offs, so it
  is resolved here rather than filed twice.

## Acceptance

- [ ] `schedules_history` reads a completed one-off, and the README + `cancel` message become true.
- [ ] One-off history keys are removed once read or superseded, or namespaced so they are bounded.
- [ ] `loadOneOffs` / `loadLoops` cap on read as well as on write; `MAX_LOOP_CAP` is used or
      removed.
- [ ] Every one-off path — missing prompt surface, missing session, throw, success — records a
      history entry.
- [ ] `startedAt` is the dispatch instant, not the completion instant.
- [ ] Tests assert each, including a hand-edited oversized stored record.

## Notes

Filed by the coordinator from the T3–T6 lead-architect review.

### 2026-10-02 @ses_f037cc89cffeOo07JPEJShqzJw
**Live reproduction on the real host** (v2.0.22, deployed build, run from a session), which confirms B4 exactly as the reviewer predicted:

`schedules.schedule({ prompt: "E2E probe…", dueIn: "20s" })` → `oneoff_sn7ndgh4murd4ea5`.

The run **happened** — the scheduler log records:

```
19:35:37.103  running one-off oneoff_sn7ndgh4murd4ea5 (due 2026-10-02T19:35:27.085Z, model session default, runTimeout 15m)
```

…but reading it back fails:

```
schedules_history({ id: "oneoff_sn7ndgh4murd4ea5" })
→ { error: 'no job with id "oneoff_sn7ndgh4murd4ea5"', ids: ["dogfood-smoke"] }
```

So the history was written under the one-off's own id while `schedules_history` resolves only `state.jobs`. This is now confirmed against a real host, not only under a fake `ctx`, and it makes two published statements false: the README ("a completed one-off survives only in `schedules_history`") and the `cancel` error message ("check schedules_history"). It also confirms `storage.remove` is never called, so every one-off leaves a permanent key.

### handoff 2026-10-02 @ses_f01df884affeb0gIJWfPeR009z (session: ses_f01df884affeb0gIJWfPeR009z) — next: Coordinator: review + merge 4bc026a on fix/bug-oneoff-history-unreadable-and-storage-unbounded (216 tests, all gates green)
- branch: main
- open questions: README L110-112 (schedules_history now also takes one-off/loop ids) and L225 (now true; bounded ring) are T7's to edit — untouched here. No item filed for the evictions; check M8/M11 dead code was ri…

### 2026-10-02 @ses_f01df884affeb0gIJWfPeR009z
## Implementation evidence (worker: fix branch `fix/bug-oneoff-history-unreadable-and-storage-unbounded`, commit `4bc026a`)

Note: the auto-appended handoff above reports `branch: main` — that is the tool reading the primary checkout. The work lives on the fix branch, worktree `../opencode-scheduled-tasks-bug-oneoff-history`. Also in this comment: mutations, untestable claims, and two README sentences for T7 (untouched, as instructed).

### Storage shape chosen: namespaced **and** bounded by a capped index

Namespacing alone fixes the collision but not the accumulation, so both halves are present:

| kind | key | retained |
|---|---|---|
| job | `scheduled-tasks/history/<jobId>` (unchanged) | that job's ring, <= 50 |
| one-off | `scheduled-tasks/history/oneoff/<id>` | index-capped, `MAX_EPHEMERAL_HISTORY_KEYS` = 50 |
| loop | `scheduled-tasks/history/loop/<id>` | same index |

`storage.remove` is now reached three ways: the eviction, the pre-fix legacy migration, and the loop-set teardown it always had. The index (`scheduled-tasks/history/ephemeral`) is a list of `{ key, at }` capped at 50, evicting oldest-first; it works with `get`/`set` alone, unlike the feature-detected `scan`. Re-recording a key on each write (rather than appending) keeps an active loop's history at the young end.

### How `schedules_history` resolves a one-off and a loop

`resolveHistoryOwner`, in order: `state.jobs` (in-memory, unchanged) -> `state.oneOffs` (pending, `runs: []`) -> `state.dispatching` (**new**: a one-off running right now, `runs: []`) -> `state.loops` per session -> **storage** `history/oneoff/<id>` then `history/loop/<id>` -> a pre-fix flat key, gated on the id looking generated (`oneoff_*` / `loop_*`), which is copied into the namespace and deleted.

Two consequences worth naming: the storage branch is where the bug lived (a finished one-off is in no live list), and the legacy branch means a 2.0.22 host's already-leaked keys become readable **and** get reclaimed rather than inherited. `dispatching` is a new `SchedulerState` set: without it an in-flight one-off's id was named nowhere, so the same `no job with id` came back for a run that was plainly happening. Output gained `kind`; `session` is omitted when there is none; the `ids` list on a miss now names jobs and pending one-offs. The error text is unchanged, so no existing assertion had to move.

`cancel`'s message needed **no edit** — it became true by fixing the lookup. That is the honest way to repair a message that was wrong, and the test asserts the round trip (`cancel` -> error naming the hint -> `history` -> the run) rather than trusting the string.

### Read-side caps; `MAX_LOOP_CAP`

- `loadHistory` now clips `error` (300) and `model`/`sessionID` (200) as well as capping cardinality at 50 — the comment's claim is now true. Clipped on the write side too, in `pushHistory`, so a host returning a 50KB session id cannot store 50KB.
- `loadOneOffs` caps at `MAX_ONEOFF_CAP` (200) on read and logs the drop count. Keeps the **oldest**: the list is due-ordered, so the oldest are the most overdue, and capping the other way would silently drop the one-off an agent had just asked for.
- `normalizeLoops` caps at `MAX_LOOP_CAP` (50), which both read paths share. `MAX_LOOP_CAP` was exported and unused; it is now the enforcement point its comment claims. `saveLoops` got a defensive slice too — **then it was deleted**, see M11.

### One-off paths that now record, and what `startedAt` means

`runOneOff` returns `void` and records every exit through one closure: no `session.create`, no `session.prompt`, `create` with no usable id, the throw, the timeout, and the success. The tick's old `.then` block (which recorded only `"ok"`) is gone, so there is no outcome a path can forget. `startedAt` is the instant dispatch begins, taken before anything is awaited; it is paired with the `boundRun` outcome, so a timeout genuinely reports a start earlier than its end. The skip path keeps the tick instant, commented, because nothing was dispatched. The recorded `model` is now the resolved one from `applyJobTarget`, which is what the `running` line said.

### Mutations (each applied, suite run, file restored)

M1 ephemeral lookup removed (9 tests) / M2 `storage.remove` -> `set(undefined)` in the eviction (2) / M3 read-side caps dropped (1) / M4 `startedAt` back to completion (1) / M5 one recording removed (1) / M6 `MAX_LOOP_CAP` read cap removed (1) / M7 `MAX_ONEOFF_CAP` read cap removed (1) / M8 namespace guard removed from the eviction loop (**nothing**) / M8b namespace filter removed from the index reader (1) / M9 legacy copied but not reclaimed (1) / M10 `dispatching` marker removed (1) / M11 `MAX_LOOP_CAP` write slice removed (**nothing**) / M12 namespacing collapsed to flat (6) / M13 write-side clip removed (1).

**The two that caught nothing were both my own additions, and both are deleted rather than documented as defence.** M8's re-check was unreachable because `isEphemeralHistoryKeyRecord` already refuses non-ephemeral entries on the way in — the rule now lives in the filter, which M8b proves load-bearing. M11's second slice was unreachable while the read cap held. Same class of mistake the suite exists to catch, caught by the same method.

The live repro was written first and failed with exactly the reported error: `expected 'no job with id "oneoff_4oz603zumurdjs..."' to be undefined`. All 16 new tests failed before the fix.

### Untestable black-box

- `isEphemeralId` gating the legacy migration: a test would have to assert that a *deleted job's* flat history is **not** adopted, i.e. that it stays unreadable. That is arguably the worse behaviour, so pinning it would enshrine a choice rather than a requirement.
- `storage.remove` failing during eviction (falls back to an empty record). The fallback is `storageRemove`, shared with the loop teardown, which is covered; its failure branch is one `logOnce`.
- One pre-existing assertion of mine was initially flaky-by-construction (an exact `Date.now()` equality against a fake clock that `settle()` advances). Rewritten as two inequalities that still fail a completion stamp; worth knowing the shape of the trap.

### Gates

`npx tsc --noEmit` clean / `npx vitest run` **216 passed** (200 pre-existing, all green, + 16 new) / `npx tsx harness/smoke.ts` PASS / `arggon validate` ok, 0 warnings / `arggon spec analyze` clean. Scope: `src/index.ts` + `test/index.test.ts` only.

### For T7 (README untouched, as instructed)

- **L110-112** — still says "one job's recent runs" and "Job id, as reported by schedules_list". Both now understate the tool: it also takes a one-off id (`schedules_schedule`) and a loop id (`schedules_start_loop`), and returns `kind`.
- **L225** — "A completed one-off survives only in `schedules_history`, then is discarded" is now **true** and needs no correction, but the "then is discarded" half is worth qualifying: the run record survives until its key is evicted by the 50-key index, so "survives in `schedules_history` until the newest 50 ephemeral runs push it out" is the precise statement.
