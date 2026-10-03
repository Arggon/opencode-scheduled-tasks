---
type: task
status: done
id: task-t7-attribution-docs-and-v2-gate
title: "Attribution, README docs, and the v2 gate"
assignee: arggon
branch: docs/task-t7-attribution-docs-and-v2-gate
parent: config-surface-markdown-task-files-durations
labels: []
created: "2026-10-02"
updated: "2026-10-03"
depends_on: [task-pin-twelve-untested-spec-001-behaviours]
---
<!--
  Placement (v0): ArggonManager/scheduled-tasks-v2/v2-features-inspired-by-opencode-tasks/config-surface-markdown-task-files-durations/task-t7-attribution-docs-and-v2-gate.md
  Leaves live only under a story. id is the filename stem: task-t7-attribution-docs-and-v2-gate.
  CLI `arggon create task t7-attribution-docs-and-v2-gate` adds the task- prefix (do not pass it twice).
  parent MUST be the story id. Omit assignee when unassigned. Omit blocked_reason unless status is blocked.
-->

# Attribution, README docs, and the v2 gate

## Context

Credits and documents v2. This task spans all three stories — it is filed under
config-surface because that is where the work starts.

See plan 002 §T7, spec 002, and ADR 0007.

## Acceptance

- [x] README **Acknowledgements** names `jdormit/opencode-tasks` and its author, and lists the
      ideas adopted from it.

> **Ticked** — `README.md` § Acknowledgements names the project, the author (Jeremy Dormitzer),
> MIT, and when it was at version; carries a six-row table of adopted ideas with the place each
> one lives here; two honest footnotes (markdown is a *shape* not a layout; session continuity
> was adopted but **defaulted the other way** — theirs is opt-in `session_name`, ours is
> `reuse` by default); a six-row **not adopted** table; the npm-name explanation; and the
> admission that the pre-build ecosystem search was incomplete.

- [x] README documents: markdown authoring and precedence, permission semantics (rule order,
      unattended `ask`, `external_directory`), session mode, one-offs, loops, history.

> **Ticked** — re-derived from `src/index.ts`, not from memory. New § *Markdown job files*
> (stem-is-id, body-is-prompt, per-id precedence with a reported shadow, per-file refusals,
> the untrusted-input bounds, and the `yaml` optionalDependency including its refusal message);
> § *Unattended permissions* keeps the last-match-wins pair and adds the
> `ctx.permission.rules` degradation; `session: reuse|fresh` is in the job-reference table and in
> `schedules_list`; § *One-off tasks*, § *Session loops* and § *Run history* rewritten against
> the code.

- [x] `opencode-tasks` and its author are also named in spec 002 and cited inline in ADRs
      0004/0005/0006.

> **Ticked** — already true on `main`, verified here rather than assumed:
> `ArggonManager/docs/specs/spec-opencode-scheduled-tasks-002.md` § Purpose names the project
> and its author and links ADR 0007; ADR 0004 line 17, ADR 0005 line 21 and ADR 0006 line 27 each
> cite it inline at the point of influence, each linking ADR 0007. Nothing to change.

- [x] A **v1 job file with no markdown directory behaves identically** — the upgrade is

      additive, asserted by a test rather than claimed. **Closed by
      `task-assert-v1-identical-with-no-markdown-dir`**, 15 tests over a v1 file written with only the
      fields spec 001's synopsis lists, on projects the harness proves have no `.opencode/tasks/`. Seven
      hand-derived `nextRun` instants including `America/St_Johns` at both -2:30 and -3:30; a cadence
      test over five consecutive readings in New York in both seasons, because a single instant would
      not have shown today's p0. 17 mutations, all red; M02 and M10c each turned **exactly one** test
      red out of 319, and both were added there.

      **Scope stated deliberately:** v1 was never kept as a build, so this asserts the v1 contract
      positively rather than diffing against one. It does not prove the two releases are
      byte-identical in behaviour, and does not claim to.

> **Not ticked — half the box is asserted; "behaves identically" is not.** `test/index.test.ts`
> does assert the additive half, and strongly:
> `describe("invariant 4 — the plugin imports nothing but node builtins (ADR 0004)")` →
> `it("loads and runs a JSON-only project without resolving any package")` runs the **real**
> `plugin.setup` over a JSON-only project with no `.opencode/tasks/` under an ESM loader hook
> that reports every non-builtin resolution, and asserts zero `EXTERNAL:` lines, that the job
> loads (`LOADED`) and exit 0; `it("every static import in the plugin is a node builtin")` pins
> the import list to exactly `["node:fs","node:os","node:path"]`; and `loadMarkdownJobs`
> → `it("a missing directory is the v1 state, not an error")` pins an absent directory to
> `{ jobs: [], invalid: [] }` — no error for a directory nobody was asked for.
>
> What does **not** exist is a behavioural equivalence assertion: nothing runs the same project
> under a v1 build and under v2 and compares run records, admission decisions or state bytes.
> That is the half this box actually asks for. `test/index.test.ts` belongs to the worker
> running this wave, so this item reports the gap rather than writing the test. Spec 002 carries
> the same finding in place, with the same evidence.

- [x] README's documented commands are executed verbatim by the dogfood run. **Done by the
      coordinator**, not the worker: all eight tools called from a live v2.0.22 session against
      the deployed build, byte-identical to `src/index.ts`. Transcript in this item's comment.
      It confirmed two behaviours beyond a response — `startedAt` equals `dueAt` for an
      on-demand run (the dispatch instant), and `schedules_run` dispatches a job whose
      `enabled` is `false`, which is the documented distinction between it and the schedule.
      The README's `every` parameter name was checked against the tool and is correct.

> **Not ticked — the v1 pages were dogfooded; the v2 ones this item adds were not.** The v1
> install commands (`mkdir -p ~/.config/opencode/plugins/scheduled-tasks` → `cp src/index.ts` →
> `opencode reload`, `opencode plugin list`) were executed verbatim and their observed log lines
> captured — that is what `task-docs-packaging-and-dogfood` ticks, and its `~/.local/share/
> opencode/scheduled-tasks/<project>/scheduler.log` transcripts are still on disk. What has **not**
> been executed from these pages is anything this item adds: a markdown job file, the
> `schedules_run` bounds, `schedules_format`. `harness/smoke.ts` is a real-clock harness over a
> fake `ctx`, not a server, and it runs no README command. There *is* real-host evidence that the
> v2 tools were called from live sessions (transcripts under the same directory for the `oneoff`,
> `loop`, `perm`, `hist`, `fresh`, `reuse` and `fmt` projects), which is a different claim from
> "these README pages were followed verbatim". Ticking this box needs a real server run, and
> starting one in this worktree would collide with the other worker in this wave.

- [x] Package metadata notes the lineage.

> **Ticked** — `package.json` `description` now credits `jdormit/opencode-tasks` (MIT, Jeremy
> Dormitzer) and points at the README Acknowledgements. `optionalDependencies.yaml` was already
> correct and `files` already ships the README, so the lineage ships with the package. No
> dependency, build step or daemon was added.

## Notes

Plan 002, spec 002 and the cited ADRs are the authority; this body is the
done-gate checklist (ADR 0015).

### README statements found false or stale, and what replaced them

Every line was re-derived from `src/index.ts` on this branch. Nothing below is a wording tweak.

1. **§ Status claimed markdown task files were not shipped.** `T2` landed long ago
   (`loadMarkdownJobs`, `mergeJobSources`, `TASKS_DIR`), and `schedules_format`'s own reference
   text names both surfaces. Rewritten into a shipped/not-here split.
2. **"single dependency-free file … no `node_modules`".** True for a JSON-only project and false
   in general since `yaml` arrived. Qualified at the claim, with the refusal message spelled out.
3. **"A due occurrence that finds no free slot is skipped and recorded, never queued."** False
   under `backfill`: `resolveDue`'s `defer` keeps such an occurrence **owed** in the durable
   `state.catchUp` plan. Replaced with a four-row table of what happens to each kind.
4. **`schedules_run` — "obeying the same concurrency, timeout and lease rules".** That sentence
   predated any of it being true. Now states the four clauses the tool's own description states,
   each of which is enforced (`claimed` budget, `openRunLease`, `boundRun` + `interrupt`,
   `lease.foreign` refusal) and recorded.
5. **`schedules_history` — "one job's recent runs".** It reads jobs, one-offs **and** loops,
   returns a `kind`, namespaces ephemeral ids under `history/oneoff/` and `history/loop/`, retains
   only the newest 50 such records, and `HistoryEntry` carries `asksAsDeny`, `dropped` /
   `droppedCapped` and `inMemoryOnly`. All added.
6. **§ Run history — "It survives a restart."** False on a host without `ctx.storage.get`/`set`;
   `storageAvailable` is the pair, every affected record is stamped `inMemoryOnly`, and setup says
   so once. Qualified.
7. **Both log-line examples were mistranscriptions.** `schedule` is quoted and `runTimeout` is
   present (`running ${id} (schedule "${…}" ${tz}, model ${…}, session ${…}, runTimeout ${…})`);
   the loop line carries `, model …`. Confirmed against live output from
   `npx tsx harness/smoke.ts` in this worktree.
8. **"Neither mutates the job set."** A leftover from v1's two tools, sitting under eight. Rewritten.
9. **§ Non-goals — "occurrence queueing".** Untrue as a blanket claim for the same reason as (3).
   Narrowed to "an unbounded occurrence queue".
10. **No DST policy was documented at all**, on the one compatibility question a user cannot
    discover late. Added, with both edges, and flagged as the outlier it is.
11. **No timezones section**, and the `timezone` row invited the reading that scheduling is
    UTC-based. Added.
12. **The 8 tools list was complete but four descriptions were thin** (`list` omitted
    `session`/`permissions`/`askAsDeny`/`oneOffs`/`loops`; `cancel`'s error shape;
    `history`'s scope). Corrected against the `output` schemas.
13. **`maxCatchUp` clamped 1–50, and `runTimeout` clamped to 1 minute–24 hours, were
    undocumented.** Verified by probe: `"30s"` → 60000 ms, `"45"` → 60000, `"0.5s"` → 60000,
    `"2d"` → 86400000.
14. **Two gaps in `JOB_FORMAT_REFERENCE`, reported not fixed** (`src/index.ts` is off-limits in
    this wave, so both are for the coordinator):
    - it advertises `30s` as an accepted duration without the one-minute floor, so an agent
      following it gets a 60-second run;
    - its field table omits **`permissions`** and **`session`** entirely, even though v2 added
      both and spec 002's acceptance section calls for the reference to state "the fields that
      carry a cost or a permission consequence". The README now says plainly that those two come
      from the README table, not from `schedules_format`.

Claims **removed or qualified because they could not be verified**: the `opencode plugin add`
install path and `opencode plugin list` output were left alone (v1 dogfood, ticked in
`task-docs-packaging-and-dogfood`); the third-party DST comparison in the README was **measured**
rather than relayed from the code's comment — `cron-parser@5.10.1` in `Europe/Madrid` returns
`2026-03-29T01:30Z` for the gap (03:30 local, i.e. it compensates) and `2026-10-25T00:30Z` for the
overlap (the first pass), which supports both claims — and the comment's separate claim about
`cron` was **dropped** because `cron@4.4.0` ignored the zone argument when probed and produced no
usable evidence. The npm "redirect" claim was **removed**: `opencode-scheduled-tasks` is the same
author's own earlier package, parked at 0.1.1 and neither redirected nor deprecated.

### Gates

`npx tsc --noEmit` · `npm run check` (289/289) · `npx tsx harness/smoke.ts` (PASS, and it confirms
all 8 tools register as `list, start_loop, stop_loop, schedule, cancel, history, format, run`) ·
`arggon validate` ok · `arggon spec validate` ok · `arggon spec analyze` clean.

### 2026-10-03 @ses_f037cc89cffeOo07JPEJShqzJw
**Box closed by a live dogfood pass** against the deployed build (byte-identical to `src/index.ts`, 5112lines, `opencode reload` clean), run from a live OpenCode v2.0.22 session.

All eight documented tools, called as the README documents them:

```
schedules_format()      -> 2709 chars; names .opencode/schedules.json AND .opencode/tasks, and the precedence rule
schedules_list()        -> jobs, invalid, oneOffs, loops, leaseHeld, leaseForeign, tickMs, oneOffCap, loopCap
schedules_schedule()    -> { id: "oneoff_7hssw2gemurytaq8", dueAt: "2026-10-04T05:42:20.816Z", pending: 1 }
                           and the id appears in schedules_list.oneOffs
schedules_cancel()      -> { cancelled: true, pending: 0 }
schedules_history()     -> { kind: "job", session: "reuse", runs: [{ dueAt, startedAt, outcome: "ok",
                             model: "opencode/space-bunny-free", sessionID: "ses_effb674…" }] }
schedules_start_loop()  -> { id: "loop_txp98dxgmuryu6n4", sessionID: "ses_f037cc8…",
                             nextRunAt: "2026-10-03T11:43:02.168Z",   // absolute ISO, as documented
                             expiresAt: "2026-10-06T05:43:02.168Z" }  // default 3d TTL
                           and it appears in schedules_list.loops
schedules_stop_loop()   -> { loops: [], cap: 10 };  schedules_list.loops is then 0
schedules_run()         -> { id: "dogfood-smoke", sessionID: "ses_effb674…",
                             admitted: "msg_100498b69001Ed4Q016tRwjd3e" }
```

Two things this confirms beyond "the commands respond":

- **`startedAt` equals `dueAt` for an on-demand run** (`05:43:02.229Z` both) — the dispatch instant,
  not the completion, which is what the `runTimeout` work changed.
- **`run` dispatches a job whose `enabled` is `false`.** `dogfood-smoke` is parked and still ran on
  demand. That is the documented distinction between `schedules_run` and the schedule, and it is now
  observed rather than assumed.

One parameter-naming check worth recording: the README documents `every`, and the tool requires
`every`. I called it `interval` first and the tool rejected it — **the README was right and I was
wrong**, so there is no doc defect to file here.

### One inaccuracy found, filed rather than fixed here

`schedules_history` on a **cancelled** one-off returns:

```
{ error: 'no job with id "oneoff_7hssw2gemurytaq8"', ids: ["dogfood-smoke"] }
```

The id was valid; it was cancelled and never ran. "no job with id" implies the caller got the id wrong.
`resolveHistoryOwner` already distinguishes *pending* from *dispatching* from *finished* — but a
cancelled one-off is a fourth state with no answer, and it falls into the "unknown id" bucket. Filed.
