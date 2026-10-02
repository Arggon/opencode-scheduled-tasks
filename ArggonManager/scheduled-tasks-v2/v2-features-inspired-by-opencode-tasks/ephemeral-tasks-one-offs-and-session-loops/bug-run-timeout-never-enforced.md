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

- [x] A run exceeding `runTimeoutMs` is genuinely bounded: either the prompt is aborted or the run is
      abandoned, and the outcome is recorded as `timeout` — using the `RunStatus` member that
      already exists and is currently dead.
- [x] `inFlight` is released when a run is abandoned, so one hung run cannot permanently consume
      `maxConcurrentRuns` and starve every other job.
- [x] The writer lease is **refreshed for as long as a run is legitimately in flight**, so a slow but
      healthy run cannot have its lease reclaimed underneath it and cause a double-fire. Decide
      explicitly whether lease renewal is tied to run liveness or to the tick heartbeat, and say why
      in a comment.
      *Done, and the reason is in the comment on `isRunOutstanding`: renewal is tied to **run
      liveness**, not the tick heartbeat, because the tick heartbeat is the cross-process writer
      lease's mechanism (ADR 0003) and cannot see runs. Note the limit of this box — the renewal is
      in the code and its schedule rule is unit-tested, but it is **not** separately observable
      black-box. See the unticked box 7.*
- [x] The false comment in `runJob` ("bounded by the lease the tick refreshes") is corrected.
      *Corrected, and the replacement is specific: the bound is the timer in `boundRun`, and the
      lease is renewed from run liveness. The old comment was wrong in both clauses.*
- [ ] README states what `runTimeout` actually does. If bounding is not achievable with the
      available host primitives, say that plainly and document the real limit instead of promising a
      bound.
      *Left to T7 / the coordinator, as instructed — but this fix **changes what the bound is**, so
      the box cannot close by deleting the "Known gap" paragraph. Two corrections are needed, and
      the second one is not this item's doing:*
      1. *`runTimeout` is now enforced: the run is interrupted (or the wait abandoned), the outcome
      is recorded as `timeout`, and the slot is released. The paragraph's "nothing interrupts a
      prompt that never resolves" is no longer true.*
      2. *The paragraph's claim that a hung run lets "its writer lease expire mid-run, which a
      second OpenCode instance can then reclaim" **was already false before this fix**. The
      cross-process writer lease is a lockfile heartbeated on every tick, and a run is dispatched
      with `void`, so a hung prompt does not stall the heartbeat — a new test asserts the lockfile's
      `heartbeat` keeps advancing while a run is hung, and that a foreign holder keeps a second
      instance inert. The lease that genuinely expired mid-run was the **per-job** in-flight lease
      (`record.leaseUntil`), and its consequence was the *same instance* admitting the job again,
      not a second instance. Correcting that distinction matters: the current wording points at
      cross-process arbitration, which was never the broken part.*
- [x] A test reproduces the original scenario: a prompt that never resolves. It must fail (not hang)
      within a bounded time, leave `inFlight` clean, and record `timeout`.
      *Reproduced, and verified failing before the fix: with the bound removed the test fails in
      ~15ms rather than hanging, because the test advances an injected clock instead of waiting on
      the wall clock. `runTimeoutMs` is floored at one minute, so a real-clock test of this would
      have to run for a minute to fail.*
- [ ] A test proves the lease is not reclaimed while a run is in flight, and that a *hung* run does
      not leave the project double-fireable.
      *Half, and the half that is missing is not closeable — stated rather than ticked.*
      - *Done: a hung run does not leave the project double-fireable. Asserted on the lockfile
      itself (its `heartbeat` advancing across a tick while the prompt is outstanding) and on a
      foreign holder keeping a second instance inert while a hung run's in-flight marker is in
      storage. The lockfile, not `leaseHeld`, because `leaseHeld` reads the in-memory lease object.*
      - *Not done: "a test proves the lease is not reclaimed while a run is in flight". There is a
      test with that intent — `maxConcurrentRuns: 2` and a single job, so the cap provably cannot
      refuse anything and a re-admission would show up as a second prompt — but it does not prove
      *the lease* is what refuses it. Mutations M4 (renewal deleted), M5 (the clock-independent
      in-flight signal dropped), M6 (both) and M7 (the renewed window cut to a quarter of the
      bound) all leave the whole suite green.*

        *The reason is a finding, not a gap in effort: **once the bound is enforced the two
        in-flight signals are provably redundant for every reachable state**, because the bound
        timer is always due before the lease can expire and is delivered first. A test that
        separated them would have to manufacture a state the scheduler cannot reach. A
        double-fire test *was* written and did reproduce with both signals removed (two prompts,
        two `running` lines) — but it depended on how a runtime orders a tick interval and a
        run-bound timer that come due at the same instant, and the same mutation passed it on some
        runs and failed it on others, so it was deleted rather than shipped. What is tested
        instead: `leaseRenewalMs`'s schedule rule, `isRunOutstanding`'s disjunction, the
        lease-live-for-the-whole-run regression guard, and the two cross-process claims above.*

## Notes

Filed by the coordinator. This is a cost-bound hole in the invariant that made the plugin safe to
leave running unattended, so it is `p0` regardless of how small the diff looks. `runTimeoutMs` is
already plumbed end to end (parse -> clamp -> store -> log), so the fix is enforcement, not plumbing.

One design question the fix must answer rather than dodge: OpenCode's `session.prompt` may not offer
cancellation on this host surface. **Feature-detect it.** If there is no abort primitive, the honest
answer is to abandon the await, record `timeout`, release `inFlight` and keep the lease alive — not
to keep the promise in the README that cannot be kept.

## Resolution (2026-10-02)

**A cancel primitive does exist on this host, and it was detected by probing the live surface, not
by reading a type.** A temporary probe plugin was loaded into a real `opencode run` (v2.0.22) and
dumped the context it is actually handed: `ctx.session` carries
`command, compact, context, create, generate, get, hook, interrupt, move, prompt, remove,
switchAgent, switchModel, synthetic, update, wait`. `interrupt` is a function; calling it with
`{}` throws `Missing key at ["sessionID"]`, with a non-string throws `Expected string`, and with a
well-formed id it resolves `{ interrupted: boolean }` — so a `false` is an answer, not a failure.
It is still feature-detected at every call, like `ctx.storage.remove`, because the surface varies by
version. The probe was removed afterwards; nothing outside `src/index.ts` and its test file changed.

The same probe corrected the Context section's second bullet: the cross-process writer lease is a
lockfile heartbeated on every tick, and runs are dispatched with `void`, so a hung run does not stall
the heartbeat. The lease that really did expire mid-run was the per-job `record.leaseUntil`.

Bounded paths: `runJob`, `runOneOff` (by `task.runTimeoutMs`) and `postLoop` (by the default run
bound — a loop has no `runTimeout` field and `every` is a cadence, not a bound).
