---
type: bug
status: todo
id: bug-oneoff-history-unreadable-and-storage-unbounded
title: One-off history is unreadable and storage keys accumulate
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
