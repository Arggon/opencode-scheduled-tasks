---
type: bug
status: done
id: bug-oneoff-history-unreadable-and-storage-unbounded
title: One-off history is unreadable and storage keys accumulate
assignee: arggon
branch: fix/bug-oneoff-history-unreadable-and-storage-unbounded
parent: ephemeral-tasks-one-offs-and-session-loops
labels: []
created: "2026-10-02"
updated: "2026-10-02"
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

- [x] `schedules_history` reads a completed one-off, and the README + `cancel` message become true.
- [x] One-off history keys are removed once read or superseded, or namespaced so they are bounded.
- [x] `loadOneOffs` / `loadLoops` cap on read as well as on write; `MAX_LOOP_CAP` is used or
      removed.
- [x] Every one-off path — missing prompt surface, missing session, throw, success — records a
      history entry.
- [x] `startedAt` is the dispatch instant, not the completion instant.
- [x] Tests assert each, including a hand-edited oversized stored record.

## Notes

Filed by the coordinator from the T3–T6 lead-architect review.

### Shape chosen, and why

Ephemeral history is **namespaced and bounded by a capped index**, which is option 2 with the
bounding made real:

| kind   | key                        | retained |
| ------ | -------------------------- | -------- |
| job    | `scheduled-tasks/history/<jobId>` (unchanged) | that job's ring, ≤ 50 |
| one-off | `scheduled-tasks/history/oneoff/<id>` | index-capped at `MAX_EPHEMERAL_HISTORY_KEYS` (50) |
| loop   | `scheduled-tasks/history/loop/<id>`   | same index |

Namespacing alone fixes the collision but not the accumulation, so the index
(`scheduled-tasks/history/ephemeral`, an array of `{ key, at }`) is what bounds the key count:
it works with `get`/`set` alone, unlike `scan`, which is feature-detected and often absent.
Re-recording a key on each write (rather than appending) keeps an active loop's history at the
young end, so a loop that keeps posting is never evicted in favour of a one-off that ran once.

`storage.remove` is now reached three ways: the eviction, the pre-fix legacy migration below, and
the loop-set teardown it always had.

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

### How `schedules_history` resolves an ephemeral id

`resolveHistoryOwner` tries, in order, and answers `undefined` only when all four miss:

1. `state.jobs` → `kind: "job"`, session from the job (unchanged behaviour, in-memory).
2. `state.oneOffs` → a **pending** one-off: `kind: "oneoff"`, `runs: []`.
3. `state.dispatching` → a one-off **running right now**: `kind: "oneoff"`, `runs: []`. This set
   is new; without it the id of an in-flight one-off was in no list at all (consumed from
   `oneOffs` before dispatch, recorded only at the end), so the same "no job with id" answer
   came back for a run that was plainly happening.
4. `state.loops`, per session → `kind: "loop"` with the owning session.
5. **Storage**, namespaced: `history/oneoff/<id>` then `history/loop/<id>`. This is the case the
   bug lived in — a finished one-off is in no live list, so this is where its record is read.
6. A pre-fix flat key, **only** for an id shaped like a generated one (`oneoff_*` / `loop_*`):
   the runs are copied to `history/oneoff/<id>` and the flat key is deleted. A host on 2.0.22
   already holds keys in that shape, so the migration both makes them readable for the first time
   and reclaims the leak rather than inheriting it.

Output gained `kind` (`job` | `oneoff` | `loop`); `session` is now omitted when there is none, and
the `ids` list on a miss names jobs **and** pending one-offs, which are the ids a caller can
actually name. The error text `no job with id "…"` is unchanged, so no existing assertion had to
move — it is still literally true.

`cancel`'s message needed no edit: "check schedules_history" became true by making the lookup
work, which is the honest way to fix a message that was wrong.

### Mutation results

Each mutation applied, the suite run, the file restored (`/tmp/opencode/mutate.py`).

| # | mutation | caught by |
| - | -------- | --------- |
| M1 | ephemeral lookup removed from the reader | 9 tests (the live repro, the loop read, the migration, all four one-off recording paths, `startedAt`) |
| M2 | `storage.remove` → `storage.set(undefined)` in the eviction | the eviction test, and the no-`remove`-host test |
| M3 | read-side cardinality + string caps dropped from `loadHistory` | the oversized-record test |
| M4 | `startedAt` moved back to completion | the dispatch-instant test |
| M5 | the missing-`session.create` record removed | that one recording test |
| M6 | `MAX_LOOP_CAP` read cap removed from `normalizeLoops` | the loop-cap test |
| M7 | `MAX_ONEOFF_CAP` read cap removed from `loadOneOffs` | the one-off-cap test |
| M8 | the namespace guard removed from the eviction loop | **nothing** — dead code, see below |
| M8b | the namespace filter removed from the index reader | the eviction test |
| M9 | legacy key copied but not reclaimed | the migration test |
| M10 | the `dispatching` marker removed | the dispatch-instant test (in-flight assertion) |
| M11 | the `MAX_LOOP_CAP` write-side slice removed from `saveLoops` | **nothing** — dead code, see below |
| M12 | ephemeral namespacing collapsed back to flat | 6 tests |
| M13 | write-side string clip removed from `pushHistory` | the host-session-id test |

**Two mutations caught nothing, and both were deleted rather than documented as "defence".**

- M8: the eviction re-checked `isEphemeralHistoryKey` before deleting, but `isEphemeralHistoryKeyRecord`
  had already refused every non-ephemeral entry on the way in, so the check was unreachable. It is
  gone; the rule now lives in the filter, which M8b proves is load-bearing.
- M11: a second `MAX_LOOP_CAP` slice in `saveLoops` was unreachable while the read cap held (every
  array reaching it came from `normalizeLoops` or from `schedules_start_loop`). It is gone, and the
  ceiling is enforced at the one place that can be reached.

Both were my own additions in this change, so this is the same class of mistake the suite was
written to catch, caught by the same method.

### Not tested black-box, and why

- `isEphemeralId` gating the legacy migration. It only decides whether a *flat* key whose id is not
  ephemeral-shaped may be adopted into the one-off namespace. A test would have to assert that a
  deleted job's flat history is *not* adopted — i.e. that it stays unreadable. That is arguably the
  worse behaviour, so pinning it would enshrine a choice rather than a requirement.
- `storage.remove` failing during eviction (falls back to writing an empty record). The fallback is
  `storageRemove`, shared with the loop teardown, which is covered; its failure branch is one
  `logOnce`.

### 2026-10-02 @ses_f037cc89cffeOo07JPEJShqzJw
**Live after-fix verification on the real host** (OpenCode v2.0.22, redeployed byte-identical, `opencode reload`, run from this session). This is the exact call that failed before.

Before — one-off created, tick fired it, log recorded:
```
19:35:37.103  running one-off oneoff_sn7ndgh4murd4ea5 (…)
schedules_history({ id: "oneoff_sn7ndgh4murd4ea5" })
→ { error: 'no job with id "oneoff_sn7ndgh4murd4ea5"', ids: ["dogfood-smoke"] }
```

After — same sequence, new id:
```
20:17:19.430  running one-off oneoff_7fsc77yqmurem030 (due …, runTimeout 15m)
20:17:18.410  lease armed on creation, and released once the work drained

schedules_history({ id: "oneoff_7fsc77yqmurem030" })
→ { id: "oneoff_7fsc77yqmurem030",
     kind: "oneoff",
     runs: [{ dueAt: "2026-10-02T20:17:08.108Z",
              startedAt: "2026-10-02T20:17:18.410Z",
              outcome: "ok",
              model: "session default",
              sessionID: "ses_f01bc65b5ffetv2739kgwImUlJ" }],
     limit: 10 }
```

Three things this confirms on a real host, not just under a fake `ctx`:

1. **B4 is fixed** — a finished one-off is readable through `schedules_history`, so the README
   ("a completed one-off survives only in `schedules_history`") and the `cancel` message are now
   true. `cancel` needed no text change; it became true by fixing the lookup.
2. **`startedAt` is the dispatch instant**, not completion — `startedAt` (20:17:18.410) precedes
   the `running` log line (20:17:19.430) by about a second, which is the dispatch, and the run
   finished after that.
3. **The arming/lease-handing-back fix still holds** with the new history path: `leaseHeld` went
   `false → true` on `schedules_schedule` and back to `false` once the one-off drained.

The item was already closed as `done` before this ran; this comment is the after-fix evidence, not a
reopen.
