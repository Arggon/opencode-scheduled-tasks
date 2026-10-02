---
type: bug
status: todo
id: bug-storageless-degradation-unrecorded
title: "Storage-absent degradation is recorded nowhere, and ephemeral history is unreachable without storage"
parent: v1-tick-loop-scheduler
labels: []
priority: p1
created: "2026-10-02"
updated: "2026-10-02"
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

- [ ] Either the loss of cross-restart continuity is recorded — a `HistoryEntry` field and/or one log
      line at setup — or spec 001 box 145 is amended to drop the claim.
- [ ] `storageAvailable` is either read somewhere meaningful or removed. A field assigned once and
      never read is a lie about what the code knows.
- [ ] **The ephemeral-history fallback is decided explicitly.** If a storageless host cannot read
      ephemeral history, either keep it in memory so `schedules_history` still answers, or say so in
      the tool output and the log — but do not return `no job with id` for a run that demonstrably
      happened, which is the exact symptom this repo just spent an item eliminating.
- [ ] A test covers the storageless path with `ctx.storage` absent, asserting the behaviour that is
      chosen rather than leaving it unspecified.

## Notes

Filed by the coordinator from the spec 001 audit. The second half is a **consequence of the
namespacing fix**, not a pre-existing defect — the lookup now needs storage where it previously
read an in-memory map. Worth fixing deliberately rather than discovering later on a host that has no
storage.
