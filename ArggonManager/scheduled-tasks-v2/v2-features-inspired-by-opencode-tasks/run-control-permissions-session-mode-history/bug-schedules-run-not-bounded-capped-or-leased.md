---
type: bug
status: in_progress
id: bug-schedules-run-not-bounded-capped-or-leased
title: "schedules_run claims concurrency, timeout and lease rules and honours none of the three"
assignee: arggon
branch: fix/bug-schedules-run-not-bounded-capped-or-leased
parent: run-control-permissions-session-mode-history
labels: []
priority: p1
created: "2026-10-02"
updated: "2026-10-02"
claimed_at: "2026-10-02T20:59:08.620Z"
depends_on: [bug-tool-boundary-throws-and-ask-not-recorded]
---
<!--
  Placement (v0): ArggonManager/scheduled-tasks-v2/v2-features-inspired-by-opencode-tasks/run-control-permissions-session-mode-history/bug-schedules-run-not-bounded-capped-or-leased.md
  Leaves live only under a story. id is the filename stem: bug-schedules-run-not-bounded-capped-or-leased.
  CLI `arggon create bug schedules-run-not-bounded-capped-or-leased` adds the bug- prefix (do not pass it twice).
  parent MUST be the story id. Omit assignee when unassigned. Omit blocked_reason unless status is blocked.
-->

# schedules_run claims concurrency, timeout and lease rules and honours none of the three

## Context

**Reported twice by two workers and dropped by the coordinator once.** The `runTimeout` worker
flagged it ("`schedules_run` still awaits `prompt` unbounded and never enters `inFlight`") and the
tool-boundary worker flagged it again from the other side. I filed neither. It is recorded here with
both reports intact rather than as a fresh discovery, because a finding that survives two reports
without being tracked is a coordinator failure, not a new bug.

Verified against `main`:

```ts
description: "Trigger one scheduled job now, obeying the same concurrency, timeout and lease rules."
...
if (state.inFlight.has(job.id)) {
  return { output: { id: job.id, error: "job is already running" } }
}
...
const admitted = await ctx.session.prompt({ ... })   // no bound, no registration
```

**All three claims in that sentence are false.**

- **Concurrency** — it checks whether *that job* is running, which is not the cap. It never tests
  `maxConcurrentRuns`, never tests the shared `claimed` budget, and never adds itself to
  `inFlight`. So a manual trigger starts a run *alongside* a scheduled one and exceeds
  `maxConcurrentRuns: 1`. The cap the README documents is silently bypassed by the tool that
  description says obeys it.
- **Timeout** — the scheduled path goes through `boundRun`, which races the dispatch against the
  bound, calls `ctx.session.interrupt` on overrun and releases the slot. The tool path calls
  `ctx.session.prompt` directly, so a hung manual run is unbounded. It hangs the *tool call*
  rather than the scheduler, which is why this was rated lower than the p0 — but it is still
  unbounded, and the description says otherwise.
- **Lease** — no lease is taken or renewed. ADR 0003's single-writer guarantee covers scheduled
  dispatch; a manual trigger is entirely outside it.

The description is not decoration: it is the text the model reads when deciding how to call the
tool. A description that promises three safety properties the code does not have is how a caller
comes to rely on a bound that is not there.

## Acceptance

- [x] A manual trigger goes through the same bound as a scheduled run: `boundRun`, with
      `runTimeoutMs`, `ctx.session.interrupt` on overrun, and a recorded `timeout` outcome.
- [x] It participates in the concurrency cap — admitted only when the shared budget allows, and it
      registers for the duration so a scheduled run cannot start alongside it and blow the cap.
- [x] Its history lands in the same ring a scheduled run writes, with `startedAt` at dispatch.
- [x] Either it takes a lease, or the ADR/spec position on manual triggers is written down
      explicitly and the description stops claiming it. Decide deliberately; do not leave the
      sentence as-is.
- [x] **The description matches the code.** If any part of "the same concurrency, timeout and lease
      rules" cannot be delivered, the sentence is corrected — and the correction is stated in the
      report rather than left implicit.
- [x] Tests cover: a hung manual trigger bounded at `runTimeoutMs`; the cap refusing a second
      admission; and a description assertion or comment tying the sentence to the behaviour.
- [x] Mutation-check the cap and the bound.

## Notes

Filed by the coordinator after `bug-tool-boundary-throws-and-ask-not-recorded` landed, whose worker
found this while deliberately keeping it out of scope. Sequence it before
`task-tick-drain-order-oneoffs-before-loops` — this is a correctness hole in a documented promise,
that one is a fairness wart.

Note for whoever picks this up: `boundRun` already exists and already clears its timer on every
path, so the timeout half is mostly reuse. The genuinely new work is cap participation and the
lease decision.

### 2026-10-02 @ses_f0195142fffea0T5V01mum916y
## Evidence — all gates green on `fix/bug-schedules-run-not-bounded-capped-or-leased`

```
npx tsc --noEmit            # clean (no output)
npx vitest run              # 233 passed (233)   [was 221; +12 new, 1 existing rewritten]
npx tsx harness/smoke.ts    # PASS
node .../dist/cli.js validate     # ok (0 warnings, convention v5)
node .../dist/cli.js spec analyze # clean (2 specs scanned)
```
Suite run 6x end-to-end: 233/233 every time (see the flakiness note below).

### Existing test rewritten, not deleted
`records a run's outcome, model and session, and survives a storage round-trip` asserted
`expect(keys).toEqual([])` with the comment "No scheduled run happened, so nothing should be
stored yet" — after awaiting a `schedules_run` call. It pinned the defect (box 3). It now asserts
the record is written, well-formed, and stamped at dispatch.

### Flakiness found and fixed in my own test
`holds its slot for the whole manual run` failed ~1 run in 8 in the full suite. Cause: the manual
job's `runTimeout: "1m"` expired *inside* the `advanceUntil` window, so the test was reporting the
bound, not the cap. Fixed by giving that job a 10m bound (the bound has its own tests), with the
reason in a comment. Then 10/10 on the block and 6/6 on the suite.

### Mutation checks — each mutation, and the named test that failed
| Mutation | Caught by |
|---|---|
| M1 bound dropped (await `prompt` directly, the pre-fix shape) | 4 tests fail **by timeout, not by hanging**: "bounds a hung manual trigger…", "says it abandoned the run…", "gives the slot back on every path…", "reports the outcome of every manual run…" |
| M2 cap check dropped (`if (false && …)`) | "refuses a manual trigger while the shared budget is spent, and says so in the result" |
| M3 `inFlight` registration dropped | "bounds a hung manual trigger…", "holds its slot for the whole manual run…", "gives the slot back on every path…" |
| M4 writer-lease gate dropped | "refuses a manual trigger while another instance holds the writer lease" |
| M6 lease taken but never released | "drops the run lease when the trigger ends, so the job is not suppressed afterwards" |
| M7 timeout recorded as `failed` | "bounds a hung manual trigger…", "says it abandoned the run…", "reports the outcome of every manual run…" |
| M8 `asksAsDeny` dropped from a manual record | "reports an ask downgraded on an on-demand trigger…" (in the dependency item's block — the record assertion I added there) |

M1 was written and confirmed to fail by timeout before the fix, as required.

### M5: a real gap, reported rather than papered over
`openRunLease` not called at all in the tool path is caught by **nothing**. It is provably
indistinguishable from M3 through the plugin's surfaces: `isRunOutstanding(record, inFlight.has(id),
now)` is the disjunction of the two signals, and `inFlight` alone keeps the job outstanding for the
whole run — the same redundancy the existing run-timeout suite documents for the scheduled path. So
the *scheduler-observable* lease behaviour is pinned (M6 catches a leaked lease; the
`openRunLease` unit test pins take/renew/release/idempotence), but "the manual path calls
`openRunLease`" is a code fact, not a behavioural one. Flagging it rather than adding a test that
would have to manufacture an unreachable state to go red.

### handoff 2026-10-02 @ses_f0195142fffea0T5V01mum916y (session: ses_f0195142fffea0T5V01mum916y) — next: Code-review the branch (7 boxes should now all be true), then merge. Open question: README line 116 still says "obeying the same concurrency, timeout and lease rules" with no detail — T7 owns docs; t…
- branch: fix/bug-schedules-run-not-bounded-capped-or-leased
- open questions: M5 gap: dropping openRunLease from the tool path fails no test (redundant with inFlight by design). Is code-review acceptance of that OK, or should I add a structural assertion?
