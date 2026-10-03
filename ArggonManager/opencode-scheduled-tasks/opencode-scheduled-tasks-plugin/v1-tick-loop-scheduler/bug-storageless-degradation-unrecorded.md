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

### 2026-10-03 @arggon-worker
## Worker report — branch `fix/bug-storageless-degradation-unrecorded` (commit f4a0569)

### What I decided for each half

**Half 1 (the recording did not exist) — recorded, not amended.** Two sinks, because the box named one and an operator needs the other:

- `HistoryEntry.inMemoryOnly`, stamped in `recordRun` (src/index.ts:3178) — the one funnel every run of every kind goes through, so the stamp cannot be forgotten by a path that added its own kind later — and passed through by `schedules_history` (src/index.ts:4318). Presence-only, matching `asksAsDeny`/`dropped`: absence means the record *was* stored.
- `logOnce(`no-storage:<project>`)` at setup (src/index.ts:4580), naming the missing surface and what is lost. Keyed per project like the lease lines, so a second project's log is not silent.

I ticked box 145 rather than amending it. The claim was worth keeping and is now true.

`storageAvailable` is read in two places (the stamp and the setup guard). Its detection was also widened: it was `get` alone, now `get` **and** `set`, since neither operation implies the other — a host that only writes keeps nothing readable, one that only reads keeps nothing at all. Mutating the detection to an object-presence check turns a test red.

**Half 2 (the important one) — in memory, decided, not deferred.** `resolveHistoryOwner` now reads this process's rings first and storage second (src/index.ts:3224). Storage is what survives a restart and the only copy once the process is gone; the rings are what a run that happened *just now* left behind, and on a storageless host they are the only copy there will ever be. Storage alone — the shape the namespacing fix left — returned `no job with id` for a one-off recorded moments earlier in the same tick.

Where even memory cannot answer (an id this process never minted), the error carries `historyUnavailable`, naming the retention boundary rather than a bare miss.

**A consequence I had to handle.** Making the in-memory ring the retained copy means the cap has to apply to it. `retainEphemeralHistoryKey` previously counted storage keys only, so on a storageless host it evicted nothing and a thousand one-offs would keep a thousand rings for the session's life — the unbounded half of `bug-oneoff-history-unreadable-and-storage-unbounded`, reintroduced in memory. It now mirrors the index in `state.ephemeralKeys`, unions it with the persisted one so a key minted before a restart still counts, and evicts the ring as well as the storage key.

### What `schedules_history` returns on a storageless host

- A one-off it just ran: `{ id, kind: "oneoff", runs: [{ …, inMemoryOnly: true }], limit }`.
- A job it just ran: the same, with `inMemoryOnly: true`.
- An id from an earlier session: `error: no job with id "…"` **plus** `historyUnavailable: "this host offers no ctx.storage.get, so a finished one-off or loop is found from this session's memory only, and never after it"`.
- A host with working storage: unchanged, and `inMemoryOnly` absent.

### Mutations, and what each caught

Nine, each turning the suite red:

| Mutation | Caught by |
| --- | --- |
| Drop the `inMemoryOnly` stamp in `recordRun` | 3 tests |
| Drop its passthrough in `schedules_history` | 3 tests |
| Drop the setup `logOnce` | 2 tests |
| `resolveHistoryOwner` reads storage only (pre-fix shape) | 2 tests |
| Evict the index entry but not the in-memory ring | 1 test |
| Ignore the in-memory index entirely | 1 test |
| Drop the persisted half of the index union | 3 (2 pre-existing) |
| Drop the `historyUnavailable` note | 1 test |
| Detect storage by object presence, not per operation | 1 test |

The 6th and 7th initially left the suite green; I added "counts a key minted by an earlier process against the cap" rather than leave them.

### Untestable black-box, disclosed

`inMemoryOnly` on the `loadHistory` read side. The stamp is applied only when the host cannot write, so a record that arrived from storage was written by a host that *had* storage — a test would have to assert a state the plugin cannot produce. `loadHistory` rebuilds from storage and drops it deliberately, with the reason in a comment. I found and removed an earlier version of that comment's claim once the mutation proved nothing caught it.

### Tests and gates

252 -> **259** (7 added). The storageless host omits `ctx.storage` entirely rather than passing `{}` — an empty object passes an object-presence check while offering nothing, which is the assumption the detection must not make — plus one `get`-only and one `set`-only host.

- `npx tsc --noEmit` — clean
- `npx vitest run` — 259 passed
- `npx tsx harness/smoke.ts` — PASS
- `arggon validate` — ok, 0 warnings
- `arggon spec analyze` — clean

### Boxes

spec 001 box 145 **ticked**, with the verdict recording what each clause is pinned by and the one unpinned sub-clause (the stamp cannot survive a storage round-trip, by construction). No box left unticked by me. Boxes 309/318/322/284 remain unticked and untouched — they belong to `task-audit-spec-001-acceptance-boxes`.

Item file edited and committed on the branch (not via arggon write commands, which would have landed on the primary's main).

### handoff 2026-10-03 @arggon-worker (session: ses_f00f24d89ffel6R8moRzSN3oT0) — next: Code-review commit f4a0569 in the worktree, then merge. Focus: resolveHistoryOwner memory-first order and the state.ephemeralKeys cap.
- branch: fix/bug-storageless-degradation-unrecorded
- open questions: inMemoryOnly on the loadHistory read side is untestable by design (disclosed); accept, or file a follow-up? README not touched (T7).
