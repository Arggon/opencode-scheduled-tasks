---
type: bug
status: in_progress
id: bug-storageless-degradation-unrecorded
title: "Storage-absent degradation is recorded nowhere, and ephemeral history is unreachable without storage"
assignee: arggon
branch: fix/bug-storageless-degradation-unrecorded
parent: v1-tick-loop-scheduler
labels: []
priority: p1
created: "2026-10-02"
updated: "2026-10-02"
claimed_at: "2026-10-02T23:57:02.918Z"
depends_on: [bug-tick-cost-grows-with-sleep-not-with-jobs]
---
<!--
  Placement (v0): ArggonManager/opencode-scheduled-tasks/opencode-scheduled-tasks-plugin/v1-tick-loop-scheduler/bug-storageless-degradation-unrecorded.md
  Leaves live only under a story. id is the filename stem: bug-storageless-degradation-unrecorded.
  CLI `arggon create bug storageless-degradation-unrecorded` adds the bug- prefix (do not pass it twice).
  parent MUST be the story id. Omit assignee when unassigned. Omit blocked_reason unless status is blocked.
-->

# Storage-absent degradation is recorded nowhere, and ephemeral history is unreachable without storage

## Context

Found by `task-audit-spec-001-acceptance-boxes`: **spec 001 box 145 is false.** The audit's verdict is
recorded on the box in the spec.

The box claims two things when `ctx.storage` is absent (feature-detected):

1. jobs still run — **true**, confirmed by probe
2. "the loss of cross-restart continuity is recorded in the run record" — **there is no code for it**

`state.storageAvailable` is assigned once at setup (src/index.ts:4206) and **read nowhere in the
file**. `HistoryEntry` has no such field and no log line mentions continuity.

**Second half, and this one is new.** On a storageless host the *recently landed* ephemeral-history
work cannot function: `resolveHistoryOwner` finds a finished one-off in no live list and falls
through to storage — so a completed one-off's record, written moments earlier in the same tick, is
unreachable through `schedules_history`. The fix for `bug-oneoff-history-unreadable-and-storage-unbounded`
works only when storage exists, which is the common case but not the only one. **Nothing warns about
this on a storageless host.**

So on such a host the plugin: runs jobs, keeps in-memory history, cannot read back an ephemeral
record it just wrote, and never says any of this.

## Acceptance

- [x] Either the loss of cross-restart continuity is recorded — a `HistoryEntry` field and/or one log
      line at setup — or spec 001 box 145 is amended to drop the claim.
      **Both:** `HistoryEntry.inMemoryOnly` (stamped in `recordRun`, passed through by
      `schedules_history`) and `logOnce("no-storage:<project>")` at setup. Box 145 is ticked, not
      amended — the claim was worth keeping.
- [x] `storageAvailable` is either read somewhere meaningful or removed. A field assigned once and
      never read is a lie about what the code knows.
      **Read in two places:** it gates the stamp in `recordRun` and the setup line. Detection
      widened from `get` alone to `get` **and** `set`, since neither implies the other.
- [x] **The ephemeral-history fallback is decided explicitly.** If a storageless host cannot read
      ephemeral history, either keep it in memory so `schedules_history` still answers, or say so in
      the tool output and the log — but do not return `no job with id` for a run that demonstrably
      happened, which is the exact symptom this repo just spent an item eliminating.
      **Decision: keep it in memory.** `resolveHistoryOwner` reads `state.history` first and
      storage second, so a one-off whose record was written moments earlier in the same tick is
      found. Where even memory cannot answer, the error carries `historyUnavailable` naming the
      retention boundary — never a bare `no job with id` for a run that happened.
      Consequence handled: on such a host the in-memory ring *is* the retained history, so the
      ephemeral cap had to be mirrored in memory (`state.ephemeralKeys`) and eviction had to drop
      the ring too, or "the last fifty" would have been true only on hosts that did not need it.
- [x] A test covers the storageless path with `ctx.storage` absent, asserting the behaviour that is
      chosen rather than leaving it unspecified.
      Seven tests, `test/index.test.ts` → `describe("a storageless host is told so, and keeps its
      history readable (bug-storageless-degradation-unrecorded)")`. The host omits `ctx.storage`
      entirely (not an empty object, which would pass an object-presence check while offering
      nothing), plus one `get`-only and one `set`-only host.

## Verification

`npx tsc --noEmit` clean; `npx vitest run` 259 passed (252 before, 7 added);
`npx tsx harness/smoke.ts` PASS; `arggon validate` ok; `arggon spec analyze` clean.

Mutations run, each turning the suite red:

| Mutation | Caught by |
| --- | --- |
| Drop the `inMemoryOnly` stamp in `recordRun` | 3 tests |
| Drop the passthrough of `inMemoryOnly` in `schedules_history` | 3 tests |
| Drop the `logOnce` at setup | 2 tests |
| `resolveHistoryOwner` reads storage only (the pre-fix shape) | 2 tests |
| Evict the index entry but not the in-memory ring | 1 test |
| Ignore the in-memory index entirely | 1 test |
| Drop the persisted half of the index union | 3 tests (2 pre-existing) |
| Drop the `historyUnavailable` note | 1 test |
| Detect storage by object presence instead of per operation | 1 test |

Untestable black-box, disclosed: `inMemoryOnly` on the `loadHistory` read side. A record is only
stamped when the host could not write it, so one that arrived from storage cannot legitimately
carry it — a test asserting the round-trip would have to assert a state the plugin cannot produce.
Deliberately left out rather than pinned.

## Notes

Filed by the coordinator from the spec 001 audit. The second half is a **consequence of the
namespacing fix**, not a pre-existing defect — the lookup now needs storage where it previously
read an in-memory map. Worth fixing deliberately rather than discovering later on a host that has no
storage.
