---
type: bug
status: in_progress
id: bug-run-timeout-never-enforced
title: "runTimeout bounds nothing: a hung run latches the concurrency cap and lets a second instance double-fire"
assignee: arggon
branch: fix/bug-run-timeout-never-enforced
parent: ephemeral-tasks-one-offs-and-session-loops
labels: []
priority: p0
created: "2026-10-02"
updated: "2026-10-02"
claimed_at: "2026-10-02T17:38:49.829Z"
---
<!--
  Placement (v0): ArggonManager/scheduled-tasks-v2/v2-features-inspired-by-opencode-tasks/ephemeral-tasks-one-offs-and-session-loops/bug-run-timeout-never-enforced.md
  Leaves live only under a story. id is the filename stem: bug-run-timeout-never-enforced.
  CLI `arggon create bug run-timeout-never-enforced` adds the bug- prefix (do not pass it twice).
  parent MUST be the story id. Omit assignee when unassigned. Omit blocked_reason unless status is blocked.
-->

# runTimeout bounds nothing: a hung run latches the concurrency cap and lets a second instance double-fire

## Context

Found by the coordinator while reviewing `bug-loop-stop-does-not-persist-and-concurrency-bypass`,
which surfaced `runTimeoutMs` as unenforced. Verified directly in `src/index.ts`.

**`runTimeout` / `runTimeoutMs` is parsed, clamped and stored — and never enforced.** There is no
`Promise.race`, no `AbortController` and no `setTimeout` anywhere in the file. `runJob` does:

```ts
record.leaseUntil = now + job.runTimeoutMs
...
// `prompt` admits the turn; the run itself is bounded by the lease the tick refreshes.
await ctx.session.prompt({ sessionID, text: job.prompt, delivery: "queue" })
```

That comment is false in both clauses:

1. **Nothing bounds the run.** `await ctx.session.prompt(...)` waits indefinitely. The spec's own
   motivating scenario — a prompt that triggers a permission request nobody will ever answer —
   hangs forever.
2. **Nothing refreshes the lease.** `leaseUntil` is set once before the prompt (line 2771) and
   cleared in the `finally` (2811). Line 2844 only *clears* it when it has already expired.

`RunStatus` includes `"timeout"` (line 1395), but no code path ever produces it.

### Why this is p0 — it breaks the single-writer invariant

A hung run causes two independent failures:

- **The concurrency cap is consumed permanently.** The job stays in `inFlight`, so with
  `maxConcurrentRuns: 1` (the default) *no other job ever runs again* for the life of the server.
- **The lease expires mid-run and a second instance takes over.** `leaseUntil` is not refreshed, so
  after `runTimeoutMs` the lock is reclaimable. A second OpenCode instance acquires it and starts
  firing **the same jobs** — a double-fire, which is exactly what ADR 0003 exists to prevent. The
  lease is only as strong as the run timeout, and there is no run timeout.

### Published claims that are false today

- **README:157** — "`runTimeout` bounds every run, which is also what makes a job safe when its
  prompt triggers a permission request nobody will ever answer." This is on a public repository.
- **spec 001 acceptance, boxes 109 and 111** — "A run exceeding `runTimeoutMs` has its session
  interrupted and records `lastStatus: timeout`" and "An unanswerable permission prompt inside a
  run is bounded by `runTimeoutMs` and cannot hang the scheduler indefinitely." Both **unticked**,
  while the spec is `status: implemented`. See `task-audit-spec-001-acceptance-boxes`.
- **T1 (`runTimeout` durations) delivered the config surface only** — parsing, clamping and the
  `schedules_format` reference. Its own ticked box ("`runTimeoutMs` behaves exactly as in v1") is
  honest about that, but the feature reads as shipped end to end.

## Acceptance

- [ ] A run exceeding `runTimeoutMs` is genuinely bounded: either the prompt is aborted or the run is
      abandoned, and the outcome is recorded as `timeout` — using the `RunStatus` member that
      already exists and is currently dead.
- [ ] `inFlight` is released when a run is abandoned, so one hung run cannot permanently consume
      `maxConcurrentRuns` and starve every other job.
- [ ] The writer lease is **refreshed for as long as a run is legitimately in flight**, so a slow but
      healthy run cannot have its lease reclaimed underneath it and cause a double-fire. Decide
      explicitly whether lease renewal is tied to run liveness or to the tick heartbeat, and say why
      in a comment.
- [ ] The false comment in `runJob` ("bounded by the lease the tick refreshes") is corrected.
- [ ] README states what `runTimeout` actually does. If bounding is not achievable with the
      available host primitives, say that plainly and document the real limit instead of promising a
      bound.
- [ ] A test reproduces the original scenario: a prompt that never resolves. It must fail (not hang)
      within a bounded time, leave `inFlight` clean, and record `timeout`.
- [ ] A test proves the lease is not reclaimed while a run is in flight, and that a *hung* run does
      not leave the project double-fireable.

## Notes

Filed by the coordinator. This is a cost-bound hole in the invariant that made the plugin safe to
leave running unattended, so it is `p0` regardless of how small the diff looks. `runTimeoutMs` is
already plumbed end to end (parse -> clamp -> store -> log), so the fix is enforcement, not plumbing.

One design question the fix must answer rather than dodge: OpenCode's `session.prompt` may not offer
cancellation on this host surface. **Feature-detect it.** If there is no abort primitive, the honest
answer is to abandon the await, record `timeout`, release `inFlight` and keep the lease alive — not
to keep the promise in the README that cannot be kept.
