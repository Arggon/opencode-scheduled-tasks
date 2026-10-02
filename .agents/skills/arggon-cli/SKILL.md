<!-- arggon:generated template="skills/arggon-cli/SKILL.md" -->
---
name: arggon-cli
description: Work in an ArggonManager repo — run the find → claim → work → PR loop and follow the engineering methodology (specs, ADRs, explorations, playbooks) with the native arggon tools (OpenCode V2) or the arggon CLI.
version: 0.4.0
author: Arggon (Arggon), Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [CLI, Tasks, Agents, JSON]
    related_skills: []
---

# Arggon CLI Skill

Drive the `arggon` task CLI and follow the engineering methodology it encodes.
Work lives as Markdown under the tracker root — `ArggonManager/` on the v5 layout
(legacy `tasks/` trees are auto-detected and keep working) — with the product
docs under `ArggonManager/docs/`; GitHub
is for PRs only. This umbrella covers **when** to use the skill, install/update,
and the work loop. The operational detail lives in the references beside this
file — read the one that matches the task **before** acting:

| Reference                     | Read it for                                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `references/json-contract.md` | **JSON contract**: `--json` envelopes, error codes, filters, output surfaces, native tools, MCP              |
| `references/methodology.md`   | **Methodology**: what the work needs — spec, plan, ADR, exploration, playbook, runbook — and the quality bar |
| `references/exploration.md`   | **Greenfield exploration**: the six-phase protocol — classify, stance, ground, frontier rounds, edge-case hunt, artifacts + hard gate (ADR 0017) |
| `references/orchestration.md` | **Orchestration**: coordinator/subagent waves, review bar, smoke gate, worktrees                             |
| `references/pitfalls.md`      | **Pitfalls**: claim, cascade, tracker-merge and commit-staging traps                                         |

The full workflow rules are `ArggonManager/docs/agents.md`; the review bar is
`ArggonManager/docs/engineering.md`.

## Native surface (OpenCode V2)

Inside OpenCode V2 the same rules run through native primitives — use them
first, and treat the CLI below as the headless adapter for bootstrap, gates and
CI:

- **Tools** (Code Mode, namespace `arggon`): `tools.arggon.list`, `create`,
  `update`, `show`, `next`, `report`, `validate`, `comment`, `handoff`,
  `priority`, `sync`, `import_issues`, plus the worktree lifecycle
  `tools.arggon.start` (claim + branch + `../<repo>-<id>` worktree through the
  OpenCode worktree domain; push and the `gh` PR step stay explicit),
  `tools.arggon.branch` (branch bookkeeping) and `tools.arggon.cleanup`
  (list/`prune: true` reaps merged worktrees and clears `worktree_path`). Each
  returns exactly its documented `--json` envelope; kernel failures are typed
  tool errors and never kill the session.
- **Commands**: `/arggon-{next,start,done,handoff,review,status,spec,adr,explore,playbook,adopt}`.
- **Permissions**: the generated seam + shipped agents add minimal gates
  (force-push and `--no-verify` denied; the reviewer cannot edit or push) that
  complement — never replace — the kernel invariants. Never steal a claim,
  never reopen `done`/`cancelled`: the kernel refuses both whatever the
  permissions say.
- **Plugin**: vendored single-file at `.opencode/plugins/arggon/index.ts` (no
  `node_modules` needed); `arggon init` refreshes it with provenance.
- The CLI (`npm run arggon -- …`) stays for `init`/`validate`/`doctor` and
  model-less CI; there is no MCP stanza in the generated config by default.

## When to Use

- Any task involving work items in a repo with `ArggonManager/.convention.yml`: list, claim, create, update, validate, visualize.
- Starting a NEW project ("set up task management here") → `arggon init`.
- Adopting an EXISTING repo ("start using ArggonManager here") → `arggon adopt` — the tracked, agent-executable migration checklist.
- Checking project health / installation state → `arggon doctor`.
- Don't use for: editing convention rules (`ArggonManager/docs/convention.md` is the source of truth for the schema).

## Install / update

```bash
# fresh install
git clone https://github.com/Arggon/ArggonManager ../ArggonManager
cd ../ArggonManager && npm install && npm run build   # dist/cli.js is the bin
# update an existing checkout
git -C ../ArggonManager pull --ff-only && npm -C ../ArggonManager run build
```

- The `arggon` bin is `dist/cli.js` (gitignored): **run `npm run build` after every
  pull** before using it — a stale dist fails with `unknown option` on new flags.
- `npm run arggon -- <command>` runs from TypeScript source (no build needed, slower).
- Invoke from anywhere inside the target repo — the CLI walks up to find the tracker root (`ArggonManager/`, or legacy `tasks/`).
- Init/adopt never overwrite existing files (not even with `--force`); re-running
  regenerates untouched generated docs silently, skips and reports modified ones,
  and `--backup` archives them to `backup/<date>/`. The generated AGENTS.md routes
  agents back here.

## 1. Start or adopt a project

```bash
<!-- arggon:generated-commands start: init,adopt -->
arggon init [dir]  # Scaffold the tracker convention (+ templates + governing docs) in a repo (ArggonManager/; legacy tasks/ trees upgrade in place)
arggon adopt  # Inventory the repo's governing docs and create the tracked, agent-executable adoption task (requires init)
<!-- arggon:generated-commands end -->
```

- `init --full` adds the tier-2 doc set (ARCHITECTURE.md, ArggonManager/docs/convention.md +
  engineering.md, CHANGELOG, SUPPORT, runbooks) and the OpenCode V2 seam, and
  bundles this skill — `SKILL.md` plus `references/` — at
  `.agents/skills/arggon-cli/`.
- `adopt --dry-run` inventories only; the migration task body carries the agent
  checklist (sweep docs → complete generated docs → archive originals → playbooks
  from the detected stack → verify → report). Full procedure:
  `ArggonManager/docs/agents.md` §Adoption sweep.
- Issue management stays in-tree: GitHub is for PRs only.

## 2. Run the work loop

The command lines below are GENERATED from the live CLI between the
`arggon:generated-commands` markers (run `npm run skills:sync` after any
command/flag/description change; cli/src/skill-generated-commands.test.ts fails
on drift). Curated nuances live in `references/`.

```bash
<!-- arggon:generated-commands start: list,next,branch,start,update,comment,show,handoff,create,validate -->
arggon list  # List work items under the tracker root with optional filters
arggon next  # Suggest the next claimable leaf item (task/bug leaves; ready items rank first, by downstream weight — unblocks count; lexicographic id on ties; --include-stories opts stories back in)
arggon branch <id>  # Check out the working branch for an item (generated from branch_patterns)
arggon start <id>  # Claim an item, check out its branch, commit, push, and optionally open a draft PR
arggon update <id>  # Update frontmatter fields of a work item
arggon comment <id> [text]  # Append a timestamped, author-attributed comment section to an item's body
arggon show <id>  # Read one item with bounded output (ADR 0006): frontmatter + last comments; full body is an explicit opt-in
arggon handoff <id>  # Append a structured, bounded handoff section (branch, next step, open questions) to an item's body
arggon create <type> <title>  # Create a work item under the tracker root (label at creation with --labels <csv>)
arggon validate  # Validate tracker frontmatter and tree integrity
<!-- arggon:generated-commands end -->
```

1. **Find work:** `next --json` — the point query (NOT `list --json`; that is for
   full scans) → see `references/json-contract.md`. Empty is success.
2. **Claim:** `start <id> --assignee <login> [--worktree] [--open-pr]` claims,
   branches, commits, pushes and (with `--worktree`) moves everything into
   `../<repo-name>-<id>`. `--worktree` prepares a fresh worktree before the claim
   commit: it mirrors the primary checkout's install as a per-worktree link farm
   (reported as `linkedNodeModules`), points every workspace package the worktree
   also carries (e.g. `@arggondev/lib`) at the **worktree copy**, and pre-builds that
   copy with the package's own `build` script when its declared entry is missing —
   so the pre-commit gate loads the branch's kernel (the built names are printed
   on stdout). A copy that could not be built keeps the primary's copy and is
   reported as `linkedWorkspaces` (`--json`, re-read after a configured
   `x-worktree.post-start` hook, so a hook that installs locally reports `[]`);
   the install is never committed by start and is removed before the hook so
   `npm ci` cannot empty the primary install. A failure never rolls the worktree
   back: fix the reported cause and re-run `start --worktree` to attach. Claim
   taken (`START_FAILED`) → pick another item; never `--force`, never steal.
   Manual fallback:
   `update <id> --status in_progress --assignee <login>` + `branch <id>`.
3. **Record findings:** `create task|bug "<title>" --parent <story-id>` — file new
   work instead of growing the PR.
4. **Verify:** `validate --json` must be `ok:true` before committing.
5. **Hand off / finish:** `comment` / `handoff` put context on the item (body-only;
   bounded fields); done criteria and the never-reopen/steal rules are enforced by
   the CLI — traps in `references/pitfalls.md`.

Non-trivial items are orchestrated per `references/orchestration.md`.

## 3. Views and tooling

```bash
<!-- arggon:generated-commands start: board,report,doctor,sync,import-issues,instructions,cleanup,priority migrate,migrate -->
arggon board  # Write a static read-only HTML board from the tracker (git files stay the source of truth)
arggon report  # Aggregate leaf statuses per container, grouped by epic (display only)
arggon doctor  # Report installation state: convention version, generated-doc provenance, tracker counts (pure read); with --budget, also the ADR 0006 context-budget surfaces incl. the live MCP tool-schema size (report-only)
arggon sync  # Reconcile task branch fields with open GitHub PRs
arggon import-issues  # One-shot import of GitHub issues into the tracker as task/bug items (idempotent; x-import maps labels to types)
arggon instructions  # Print the agent wiring (install, pre-commit, CI) extracted from the agent playbook
arggon cleanup  # List worktrees of done/cancelled items whose branches are merged (--prune removes them)
arggon priority migrate  # Move legacy pN labels into the priority field on all items (highest label wins, all pN labels removed, non-priority labels kept; idempotent; never auto-commits — review and commit once)
arggon migrate  # Move a legacy tasks/ tracker (and its product docs) to the ArggonManager/ layout (ADR 0012, convention v5; idempotent, never auto-commits)
<!-- arggon:generated-commands end -->
```

Board/JSON specifics (`--serve`, `--tui`, priority filters) and the internal
`arggon mcp` surface: `references/json-contract.md`.

## 4. Planning documents

```bash
<!-- arggon:generated-commands start: spec validate,spec analyze,spec audit,spec new,spec import,stack explore,playbook new,playbook status,playbook refresh -->
arggon spec validate  # Validate spec/plan frontmatter and section structure (pure read)
arggon spec analyze  # Checklist-driven ambiguity scan + spec/task consistency report (report-only, never edits; exit 0 with findings)
arggon spec audit  # Pairwise duplication detection over the product-docs specs/*.md (Jaccard + shared titles) — report only, never edits
arggon spec new <slug>  # Scaffold ArggonManager/docs/specs/spec-<slug>-NNN.md (and ArggonManager/docs/plans/plan-<slug>-NNN.md with --plan); never overwrites
arggon spec import <format> <path>  # Migrate a foreign spec corpus into Arggon spec docs with a per-file zero-loss assertion; all-or-nothing per run, never overwrites (formats: openspec)
arggon stack explore <topic>  # Scaffold ArggonManager/docs/explorations/exploration-<slug>-NNN.md (candidates, criteria, findings, recommendation); never overwrites
arggon playbook new <tech>  # Scaffold ArggonManager/docs/playbooks/<tech>.md pinning the chosen version; never overwrites (research is the caller's job)
arggon playbook status  # Report playbook freshness: age since `researched` vs the stale threshold (default 90, x-playbooks.max-age-days)
arggon playbook refresh <tech>  # After re-research: set version + researched: today + status: current (frontmatter-only, body untouched)
<!-- arggon:generated-commands end -->
```

Pipeline: **explore → ADR → playbook → status/refresh**, with a spec (and plan)
before non-trivial implementation. Greenfield work is exploration-first
(`references/exploration.md`): the six-phase protocol runs before any spec, and
no implementation task is claimed before a spec with clean `spec analyze`
(ADR 0017). What the work needs — and when a playbook must be re-researched —
is in `references/methodology.md`; the generated AGENTS.md
points agents at `ArggonManager/docs/playbooks/`.

OpenCode V2 sessions get the same pipeline as commands: `/arggon-spec`,
`/arggon-adr`, `/arggon-explore`, `/arggon-playbook`.
