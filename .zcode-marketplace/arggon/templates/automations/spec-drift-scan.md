---
# arggon:generated template="zcode/arggon/templates/automations/spec-drift-scan.md"
name: arggon-spec-drift-scan
description: OPT-IN daily spec-drift scan — a read-only sweep over the methodology specs, the generated docs and the tracker that files every NEW drift finding as a bug/task via `arggon create`. Nothing is scheduled or runs until the adopter wires this contract into their own scheduler; this file is the contract, not a running job.
---

# Daily spec-drift scan (opt-in)

Cadence: **daily**. This is an opt-in automation: `arggon init` only vendors this
contract — it schedules nothing and runs nothing. To adopt it, wire this file
into your own scheduler (cron, CI timer, agent loop) at the cadence you chose;
to decline, ignore or delete the file. Deleting it is the off switch.

## Preconditions — claim and branch (hold or refuse to run)

Refuse to run (and say why in the run log) unless ALL hold:

1. **No claim held.** The scan is nobody's item work: it holds no
   `arggon start` claim, runs inside no item's `worktree_path`, and never
   claims, branches or checks out anything (`git branch`/`git checkout`/
   `git switch` are forbidden to it).
2. **Primary checkout, default branch.** It runs from the primary checkout on
   the default branch with a **clean tree** (`git status --porcelain` empty).
   Filing appends the tracker's auto-commit, and that commit must never land on
   an item's feature branch.
3. **Read-only budget.** Every scan step below is a pure read. The ONLY write
   this automation may ever make is `arggon create` in the filing step.

## Scan — read-only steps, in order

Run each step, collect its output, and never act on a finding in-flight:

1. `arggon validate --json` — tracker integrity (refuse to file anything if it
   errors; a broken tracker is itself the first finding, reported, not fixed).
2. `arggon spec validate --json` — spec/plan frontmatter and section structure.
3. `arggon spec analyze --json` — checklist-driven ambiguity scan + spec/task
   consistency report (`findings.ambiguity|consistency|decisions|…`; report-only).
4. `arggon doctor --agents --json` — per-agent seam drift (present / stale /
   adopter-edited / orphaned) and capability-matrix gap rows.
5. `git status --porcelain` — must still be empty; anything the scan itself
   wrote is a bug in the scan, stop and report it.

## Filing — `arggon create` only

- File ONE item per **NEW** finding: a drift is new when no open tracker item
  already describes it (check with `arggon list --json` over the same area) and
  it is not a known-accepted baseline row. Cap the run (10 findings) and say so
  when the cap binds.
- File with
  `arggon create bug "<finding> (spec-drift-scan <date>)" --parent <story>` —
  the parent story is the one whose spec drifted (specs live under
  `docs/specs/`; the story id is in the spec's tracking references). A finding
  whose spec has no identifiable story falls back to the story whose id stem
  matches the spec's topic (`spec-<topic>-NNN` → `story-<topic>`); when even
  that does not resolve, the finding is skipped and logged in the run log —
  never filed under a guessed parent (`arggon create` refuses unknown parents
  anyway, and a wrong-parent finding is worse than a logged one). Then
  `arggon comment <new-id>` with the evidence: the exact command,
  the finding JSON, and the file/line.
- NEVER `arggon update`/`comment`/`start` a scanned item, never edit a spec,
  doc or seam file to "fix" drift inline, and never `git commit`/`push` by
  hand — the tracker auto-commit of `arggon create` is the whole write surface.
- The kernel stays the enforcement of record: this contract is a prompt, and
  `arggon validate` + the tracker invariants (no reopen, no steal) outrank it.
