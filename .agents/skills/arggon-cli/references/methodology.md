<!-- arggon:generated template="skills/arggon-cli/references/methodology.md" -->
# Engineering methodology — what does this work need?

Part of the `arggon-cli` skill (`SKILL.md`). Before implementing, classify the
work: size and risk decide the paperwork, and the paperwork is created in the
same PR as the change — never as a follow-up TODO.

| Work is...                                                                                                                      | Required process                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Trivial** (typo, one-line fix, copy tweak)                                                                                    | Just the task. No spec, no ADR.                                                                                                                                                                                                                                                                                                                                |
| **A non-trivial feature** (new behavior, endpoint, scene or module)                                                             | **Spec first** (`arggon spec new <slug>` → `ArggonManager/docs/specs/`): purpose, synopsis, invariants, acceptance criteria. Then a **plan** (`--plan`) breaking it into ordered tasks with verifiable criteria that link back to the spec. Then implement — and flip spec/plan status to `implemented` in the same PR as the landing feature.                 |
| **Greenfield** (a new project, subsystem, or interface others will depend on — no existing flow to read)                        | **Exploration first** (`references/exploration.md`, ADR 0017): the six-phase protocol — classify, stance, ground, frontier rounds, edge-case hunt — then the greenfield exploration doc, ADRs, and a spec with the hunted cases as acceptance criteria. **Hard gate:** no implementation task claimed before the spec passes `arggon spec analyze` with no NEW findings. |
| **A cross-cutting or hard-to-reverse decision** (stack choice, schema/convention change, identity model, new top-level package) | **Exploration spike** (`arggon stack explore <topic>`): candidates, criteria, findings with dated sources. Then an **ADR** in `ArggonManager/docs/adr/` (NNNN-title, Proposed → Accepted on merge; supersede, never rewrite). Only then implement.                                                                                                             |
| **Introducing or upgrading a technology** (new dependency, framework, major version)                                            | **Playbook** (`arggon playbook new <tech> --version <v>`): researched current version + best practices with dated sources; the project's AGENTS.md points agents at it. `arggon playbook status` flags stale ones (>90d or `x-playbooks.max-age-days`) — re-research, `arggon playbook refresh`, and file the re-research task in the tracker (`--file-task`). |
| **Operational/infra behavior someone has to run or debug** (deploy, alerting, data migration, recovery)                         | **Runbook** in `ArggonManager/docs/runbooks/`: trigger → diagnosis → mitigation → escalation → rollback. Write steps individually automatable.                                                                                                                                                                                                                 |
| **A finding from review/audit/incident**                                                                                        | A tracked follow-up (`arggon create task                                                                                                                                                                                                                                                                                                                       | bug ... --parent <story-id>`) with context and acceptance — never only a PR comment. |

When in doubt between two levels, take the heavier one — but keep the artifacts
lean. A 40-line spec beats a 4-page one nobody reads.

## Scope and ordering

- Check `arggon next --ready` before picking work; declare `--depends-on` when your
  task orders after another (the graph is the plan — keep it true).
- One claimable item per branch/PR; keep PRs small; reference the item id.
- If the work reveals more work, file it (`arggon create task|bug`) — don't grow
  the PR's scope, and don't leave it only in code comments.

## Quality bar (every PR, no exceptions)

- **Architecture is part of done:** code being cheap to WRITE never excuses
  structural debt — boundaries, small surfaces, and tests are the deliverable,
  never deferred as "refactor later".
- **Conventions first:** read the project's `ArggonManager/docs/convention.md`,
  `ArggonManager/docs/engineering.md`, and the relevant `ArggonManager/docs/playbooks/<tech>.md` before
  writing code. If project docs disagree with what you're about to do, fix the
  docs in the same PR or file a blocking follow-up — never fork silently.
- **Tests are part of the change** when behavior changes; run the full suite plus
  lint/typecheck gates the project defines, and keep every acceptance checkbox in
  the item body honest — the done gate enforces it (ADR 0015): a task/bug with
  unchecked boxes refuses `--status done` unless a HUMAN passes
  `--waive "<reason>"` (recorded in the body).
- **Docs travel with code:** any change that makes a doc statement false updates
  that doc in the same PR (change-type → doc mapping in `ArggonManager/docs/agents.md`
  §Documentation maintenance).
- **Handoffs are written:** blocked work, out-of-scope discoveries and decisions go
  in `arggon comment` on the item — the next agent should never re-derive your
  context. Close a session with a structured handoff
  (`arggon handoff <id> --next "<step>"`). Review verdicts also land on the item
  via `arggon comment <id>`, never as GitHub PR comments.
- **Leave it cleaner:** release expired claims (`--status todo`), prune merged
  worktrees (`arggon cleanup --prune`), flag stale playbooks, and keep the tree
  validating before every commit.

## Pipeline references

- **Specs/plans:** `ArggonManager/docs/specs/spec-<slug>-NNN.md` + `ArggonManager/docs/plans/plan-<slug>-NNN.md`.
  `arggon spec validate` is the structural gate; `arggon spec analyze` is a
  report-only ambiguity/consistency scan (resolve findings by editing the spec).
  Multi-wave refactors gate each wave with `spec analyze --baseline <file>`.
- **ADRs:** the process and minimum template live in `ArggonManager/docs/engineering.md`
  §ADR process — 4-digit id, kebab-case title, Status/Date/Deciders + Context /
  Decision / Consequences / Alternatives considered.
- **Playbooks:** `ArggonManager/docs/playbooks/<tech>.md`, pinned version + Setup / Conventions /
  Testing / Security / Upgrade policy.
- **Adoption:** `arggon adopt` requires an initialized tree and files the tracked
  migration task; the executing agent follows `ArggonManager/docs/agents.md` §Adoption sweep.
- **OpenCode V2:** the generated commands `/arggon-spec`, `/arggon-adr`,
  `/arggon-explore`, `/arggon-playbook` drive these same scaffolds from a session.
