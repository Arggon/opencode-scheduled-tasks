---
type: bug
status: in_progress
id: bug-schedules-run-not-bounded-capped-or-leased
title: "schedules_run claims concurrency, timeout and lease rules and honours none of the three"
assignee: arggon
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

- [ ] A manual trigger goes through the same bound as a scheduled run: `boundRun`, with
      `runTimeoutMs`, `ctx.session.interrupt` on overrun, and a recorded `timeout` outcome.
- [ ] It participates in the concurrency cap — admitted only when the shared budget allows, and it
      registers for the duration so a scheduled run cannot start alongside it and blow the cap.
- [ ] Its history lands in the same ring a scheduled run writes, with `startedAt` at dispatch.
- [ ] Either it takes a lease, or the ADR/spec position on manual triggers is written down
      explicitly and the description stops claiming it. Decide deliberately; do not leave the
      sentence as-is.
- [ ] **The description matches the code.** If any part of "the same concurrency, timeout and lease
      rules" cannot be delivered, the sentence is corrected — and the correction is stated in the
      report rather than left implicit.
- [ ] Tests cover: a hung manual trigger bounded at `runTimeoutMs`; the cap refusing a second
      admission; and a description assertion or comment tying the sentence to the behaviour.
- [ ] Mutation-check the cap and the bound.

## Notes

Filed by the coordinator after `bug-tool-boundary-throws-and-ask-not-recorded` landed, whose worker
found this while deliberately keeping it out of scope. Sequence it before
`task-tick-drain-order-oneoffs-before-loops` — this is a correctness hole in a documented promise,
that one is a fairness wart.

Note for whoever picks this up: `boundRun` already exists and already clears its timer on every
path, so the timeout half is mostly reuse. The genuinely new work is cap participation and the
lease decision.
