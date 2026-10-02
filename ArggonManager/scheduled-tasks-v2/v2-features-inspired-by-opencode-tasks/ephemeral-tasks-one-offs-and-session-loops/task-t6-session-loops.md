---
type: task
status: done
id: task-t6-session-loops
title: Session loops
assignee: arggon
branch: feat/task-t6-session-loops
parent: ephemeral-tasks-one-offs-and-session-loops
labels: []
created: "2026-10-02"
updated: "2026-10-02"
depends_on: [task-t5-one-off-tasks]
---
<!--
  Placement (v0): ArggonManager/scheduled-tasks-v2/v2-features-inspired-by-opencode-tasks/ephemeral-tasks-one-offs-and-session-loops/task-t6-session-loops.md
  Leaves live only under a story. id is the filename stem: task-t6-session-loops.
  CLI `arggon create task t6-session-loops` adds the task- prefix (do not pass it twice).
  parent MUST be the story id. Omit assignee when unassigned. Omit blocked_reason unless status is blocked.
-->

# Session loops

## Context

`schedules_start_loop` / `schedules_stop_loop` for in-session recurring prompts with a default
three-day expiry. Implements ADR 0006.

See plan 002 §T6 and spec 002 § "Session loops".

## Acceptance

- [x] A loop posts into **the session that created it** and nowhere else.
- [x] Intervals are durations, not cron; a sub-minute interval is refused with a named reason.
- [x] A loop auto-disables at its three-day expiry and the expiry is reported.
- [x] Per-session cap (default 10) is enforced and reported when reached.
- [x] Stopping an unknown id returns a typed error naming it; stopping with no id stops all.
- [x] A loop cannot outlive its session, and loops are cleared when the session is gone.



## Notes

Plan 002, spec 002 and the cited ADRs are the authority; this body is the
done-gate checklist (ADR 0015).

### 2026-10-02 @ses_f02bdeb4cffejd923dpf4pjWci
**Review verdict: changes requested** (lead-architect review, run after merge; read-only, no edits made).

Commit `f24250a`. Judge: engineering.md review bar, ADR 0006, spec 002 § "Session loops", plan 002 §T6.

### Session scoping: enforced by construction, not by a check — good
`loadLoops` re-derives `sessionID` from the **storage key** and ignores whatever the record claims (src/index.ts:1516), and `tick` posts to the map key, not to a record field (src/index.ts:2104). A stored record that lies about its owner therefore cannot redirect a post — this is the right construction, and it is why the guarantee survives. `sessionToken` (1666-1670) also rejects anything that is not a short opaque token, so a hostile session id cannot become a storage key. `schedules_stop_loop` is scoped the same way and cannot cross sessions (covered at test/index.test.ts:1604, which I agree with).

### Blocking

**1. `stop_loop` does not actually stop anything, and the stopped loops come back.** `saveLoops` writes **only when the array is non-empty** (src/index.ts:1524-1529: `if (first !== undefined)`). So every "remove the last loop" call is a silent no-op on storage, while still reporting success. Worse, `start_loop` restores from storage whenever the in-memory array is empty (`existing.length > 0 ? existing : await loadLoops(...)`, src/index.ts:2255-2256) — it uses "empty" as a proxy for "not yet loaded", so the load resurrects what was just stopped.
Probe, one session, all tool calls: start a, start b, then stop a (logged `stopped loop a`, stored `["loop_b"]`), then stop-all (returns `{loops: [], cap: 10}`, stored **still `["loop_b"]`**), then start c. `schedules_list.loops` then returns **`[loop_b, loop_c]`**. The user asked to stop everything, was told everything stopped, and loop b is live again and will post.
The same no-write hits the expiry path (src/index.ts:2110-2113): when the last loop expires, `saveLoops` writes nothing and the expired loop stays in storage forever.
*Fix:* write the empty array (or call `ctx.storage.remove(key)` — `StorageContext.remove` is already declared at src/index.ts:1538 and never used anywhere), and track "loaded" per session instead of inferring it from length.

**2. Loops never resume after a restart; `state.loops` is never populated at setup.** `setup` loads jobs, states, history and one-offs (src/index.ts:2554-2557) but **not loops**; `loadLoops` is only called from the two tool handlers (2256, 2301). So a stored, due loop is invisible to `tick`. Probe: seeded a due loop in storage, set up with one enabled job and `tickMs: 5000`, waited 7s: **no prompt into the session**, and `schedules_list.loops` = `[]`. An expired stored loop is never examined either, so its expiry is never reported.
The comment at src/index.ts:2252-2254 — *"Restore this session's loops from storage FIRST, so a loop survives a reload"* — is true only of the tool path and false for the only behaviour that matters. README:183-185 tells the user loops "live in plugin storage keyed by session", which implies exactly this durability.
*Fix:* persist an index of session keys (e.g. `scheduled-tasks/loop-index`) and load every session's loops at setup, or — if the cost is not worth it — make loops explicitly process-lifetime-only, say so in README and in the tool description, and stop implying reload survival. Either is defensible; the current silent gap is not.

**3. Loops bypass the concurrency cap and every run bound.** The loop block in `tick` (src/index.ts:2089-2114) never consults `maxConcurrent` or `state.inFlight`, and posts **once per due loop per tick**. Probe: three due loops, `maxConcurrentRuns` at its default of 1, and **three prompts were admitted in the same tick**. With the documented cap of 10 loops per session and several sessions, one tick can admit an unbounded number of billable turns. That contradicts invariant 1 (spec 002: "backlog, concurrency and retries stay bounded") and README:140-141 ("At most one run is in flight at a time").
Loops also skip `applyJobTarget` entirely: no model, no `permissions`, no `runTimeout`, no history record, no `lastStatus`. A loop therefore runs on whatever model the user happens to have selected, in a **human's** session, with the human's full session permissions, on a timer, and leaves no run record.
*Fix:* count loop posts against a budget (reuse `maxConcurrent`, or a separate documented per-tick loop budget) and either route them through the bounded dispatch path or state the exemptions explicitly in the README. A loop posting into a live user session is the highest-consequence thing this plugin does and it currently has the weakest bounds of the three run paths.

**4. A loop never fires in a project with no enabled recurring job.** Same root cause as the T5 one-off finding: `hasWork` counts only file-defined jobs (src/index.ts:2559, 2573) and the loop drain lives inside `tick`. In a job-less project — the natural home for an in-session loop — no timer is armed, so a loop silently never posts.

### Non-blocking

**5. The expiry log hardcodes a three-day lifetime.** src/index.ts:2094 logs "loop <id> expired after 3 days and was disabled", but T6 supports `ttl` (test/index.test.ts:1516 asserts it), so the line is false for any loop with an explicit ttl. Log the actual expiry.

**6. `saveLoops` applies no cap and `MAX_LOOP_CAP` is dead.** `MAX_LOOP_CAP` (src/index.ts:1454) is exported and **never referenced anywhere in src or test**, while its doc comment claims "Hard ceiling on loops per session, whatever the cap is configured to". `loadLoops` (1498-1522) returns the whole stored array with no cap and `saveLoops` writes it unfiltered, so an oversized stored record is loaded, counted against the cap, and written back. Either enforce it or delete the constant — a bounded-storage claim that is a comment and nothing else is exactly what the review bar exists to catch.

**7. Re-arming is not persisted.** `loop.nextRunAt` is mutated in memory (src/index.ts:2100) but `saveLoops` only runs when a loop is removed (2110-2113), so a restart inside the interval re-posts immediately. The comment at 2099 ("a crash must not double-post on the next tick") is true in-process and not across a restart.

**8. `schedules_list` exposes every session's loop ids to any session** (src/index.ts:2208-2215) while `stop_loop` correctly cannot touch another session's loops. Defensible as a read-only view, but it is an information flow nobody chose on purpose — worth a one-line decision.

**9. Tick-box honesty.** Three of the six boxes are genuinely met and tested: duration-not-cron with sub-minute refusal (test/index.test.ts:1497-1514), per-session cap reported with ids (1634), cross-session stop refused (1604). The rest are the findings above: "auto-disables at its three-day expiry and the expiry is reported" is unreachable for a stored loop (finding 2); "a loop cannot outlive its session, and loops are cleared when the session is gone" is true only by unreachability and never by clearing; "stopping with no id stops all" does not stop all.

**10. Zero coverage of the loop post path.** Nothing in test/index.test.ts drives src/index.ts:2089-2114 — no test sets `tickMs` at all. The only assertions on loops are tool return values. Findings 1-4 are all invisible to a 119-green suite, and T6 added nothing to harness/smoke.ts.
