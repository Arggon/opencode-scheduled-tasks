<!-- arggon:generated template="skills/arggon-cli/references/orchestration.md" -->
# Orchestration — multi-agent work

Part of the `arggon-cli` skill (`SKILL.md`). Non-trivial items are **orchestrated
by default**: the delivery lead delegates them to subagents instead of working
them inline. Trivial items (one-line fixes, doc tweaks) stay inline. Full rules:
`ArggonManager/docs/agents.md` §Orchestration.

## The roles (named by what they decide)

Authoritative table, with the software analogue marked non-normative:
`ArggonManager/docs/engineering.md` §Roles and authority (ADR 0021 §6.1).

| Shipped id                  | Role                 | Decides                                                                                                        |
| --------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------- |
| `arggon-delivery-lead`      | Delivery lead        | what is built next and in what order; who is dispatched; tracker state; merge verification and the `done` flip |
| `arggon-standards-reviewer` | Practice & standards | whether a change is right by the project's own bar; asks for refactor                                          |
| `arggon-maker`              | Maker                | producing the change, keeping it on the item                                                                   |
| `arggon-verifier`           | Verifier             | whether the delivered thing does what was specified, by executing the project's gates                          |

Two boundaries the roles must not blur: the delivery lead **sequences** and
recommends priority — the product owner (human) sets the `priority` field; and
the verifier **reports** observed-versus-expected without deciding the verdict.
Each id names its **role** (ADR 0021 §6.2a′) — never the software title, never
the process verb — so cite the role, which is what the table above states.

Everywhere else the loop is **parity**: any human and any agent may claim, work,
review, comment and merge under the same kernel rules and the same JSON
contracts. Only the irreversible overrides are structurally human-only — steal,
waive, force, reopen — and they are the product owner's (ADR 0021 §1/§2).

## Delivery lead duties

- **Wave planning by file-disjointness:** group claimable items into waves whose
  members touch disjoint files/modules; items that would collide go in different
  waves.
- **Claim before dispatch:** claim every item you are about to delegate —
  `tools.arggon.start({ id, assignee: "arggon-delivery-lead", worktree: true })`
  (CLI: `arggon start <id> --worktree`) — **before** launching its maker, then
  launch into the path the claim returned. `assignee` is **your role id**, never
  the product owner's login: a claim identifies its writer, and the writer is not
  the owner (`@me` resolves the human login, so an agent claim correctly does not
  appear under `--assignee @me`). That call is the worktree step: it takes the
  single-writer stamp, creates `../<repo>-<id>`, pre-builds the packages that copy
  owns and records `branch` + `worktree_path`. Never hand-roll `git worktree add`
  for a claim, never dispatch a maker as the first claimant, never claim an item
  you are not dispatching (unclaim it **and release it** —
  `tools.arggon.cleanup({ release: id })` / `arggon cleanup --release <id>`: the
  unclaim clears the assignee but leaves the claim's worktree, `.arggon.env` and
  claim stamp behind, and `--prune` cannot reap a `todo` item; the unclaim's own
  `claimFootprint` receipt names the release command), and read a start **refusal**
  as evidence,
  not a retry — `start` has no `--force`, and no refusal is a licence to route
  around it by hand.
- **Per-item worktrees:** one maker per item, each in its own worktree — the
  recorded `worktree_path` on the item, never a `../<repo>-<id>` convention
  guess; no two makers share a working tree.
- **Code review (practice & standards):** review **every** subagent PR before merge
  against the bar the **project's engineering docs declare** (this project's
  `ArggonManager/docs/engineering.md` §Review bar: architecture-first,
  conventions first, quality/security bar, evidence travels with the change, docs
  travel with code, scope stays on the item, **blocking end-to-end check** — whose
  software worked example is the probe evidence and the browser drive the review
  bar describes) plus the
  coordination specifics: surgical staging, no cross-item files, no unrelated
  reformatting, acceptance ticks honest. Change requests and verdicts go back via
  `arggon comment <item-id>` on the item — never as GitHub PR comments.
- **Merge verification:** after each maker's change, verify the merge; resolve
  cross-item conflicts when waves overlap.
- **Tracker ownership:** claim conflicts, blocked items, follow-up filing, and
  final wave verification (`arggon validate` ok, `arggon doctor` clean).
- **Sequencing ≠ priority:** decide what is built next and in what order, and
  recommend `priority` changes — the product owner sets the field (ADR 0021 §6.1).
- **Bring decisions to the product owner (the decision brief):** when a decision
  owes the owner's answer, write a bounded, plain-language brief **on the item** —
  a comment headed `decide:` with six fields: 1. the question (one sentence, any
  specialist term translated into what it changes for the product); 2. why it
  matters, in outcome terms; 3. two or three options, never one, each with its
  consequence in plain words; 4. the recommendation, and why; 5. the strongest
  argument against it; 6. the default, and its **absolute** date. The owner answers
  with a comment headed `decided:` (or `decided: other`, a first-class reply).
  **This is the request side, not a new authority:** the map — what the owner
  decides, what the lead recommends, and which decisions owe a brief — is
  `ArggonManager/docs/engineering.md` §Roles and authority → The decision brief.
  Briefs are owed **only** for the authority-map rows (direction and priority,
  container acceptance, residual risk, claim takeover, release) and for
  hard-to-reverse calls; everything else the lead decides and records as a plain
  comment. Report-only, never a gate: `show --json` carries the additive
  `decision_brief` field and `spec analyze` one opt-in finding (`report`/`sync`
  unchanged). ADR 0026.

## Subagent rules

- Work an item inside the worktree you were handed, and only when the item is
  **already claimed** — a delivery lead that dispatches work claims it first, so
  confirm with `tools.arggon.show({ id, meta: true })` and never re-claim, never
  take over the stamp and never hand-roll a worktree. Claim it through `start`
  (never a bare `update --status in_progress`) only when you picked the item up
  yourself and no claim exists — stamping your own role id, never a human login.
- Never flip your item `done` — completion is the delivery lead's call after merge
  verification — and never reopen `done`/`cancelled` or steal a claim. Those
  irreversible overrides are the product owner's, structurally.
- Expect the delivery lead's code review on your change and address change
  requests before it merges.
- Come with evidence for behavior changes: **the gates this project declares**,
  executed end-to-end against the specification and reported as
  expected-vs-observed (in software: changed commands probed on a fixture, UI
  changes browser-driven per ADR 0008) — the smoke gate blocks merge.
- Keep the item's acceptance checklist honest: it is the **done contract** and
  the domain-invariant — a non-software project checks it with its own gates, a
  software project with tests, lint and a smoke.
- Report findings back to the delivery lead instead of filing tracker items — the
  delivery lead consolidates and files.

## Worktrees in practice

`arggon start <id> --worktree` claims, creates (or attaches to) the worktree at
`../<repo-name>-<id>`, runs the claim commit/push inside it, and records
`worktree_path` on the item. Start prepares the worktree first — it mirrors the
primary checkout's `node_modules` as a per-worktree link farm when the worktree
lacks an install, so the repo's pre-commit gate can run (start never commits the
install; it is removed before a configured `x-worktree.post-start` hook runs, so
`npm ci` cannot reify through it and empty the primary install) — and a failure
after creation keeps the worktree and branch instead of deleting them (the error
names the failing step, path and remediation; re-running attaches). The workspace
packages the worktree also carries (`node_modules/@arggondev/lib -> ../../lib`) are
pointed at the worktree copy and pre-built with the package's own `build` script
before the claim commit when their declared entry is missing, so the spawned
CLI/tests run the branch's build; a copy that could not be built keeps the
primary's copy and is named by `linkedWorkspaces` in `--json` (re-read after the
hook). A worktree that must use a full local install can run `npm ci` (e.g. via
`x-worktree.post-start: npm ci`). Move the session into that path
(`session_move` in OpenCode V2) so every later command runs there. When the work
is merged, `arggon cleanup` lists stale worktrees and `--prune` removes them.

The claim, branch, PR and validate rules apply to subagents **unchanged**: same
commands, same gates, same never-list. The kernel enforces the rules; neither
role forks them.

One goal per claimed item: `arggon goal <id>` (rendered from inside the item's
worktree) turns the item's acceptance checklist into the goal-mode contract an
agent loop runs on — objective, verification, boundaries — and takes "is there
work left" from the DONE GATE, so it never contradicts what `done` would refuse.
It refuses an unresolvable identity, a foreign claim, a closed item and any
checkout that is not the item's recorded `worktree_path` (no override flag), and
a goal never spans worktrees or items.

Opt-in automations (ZCode seam): `arggon init` vendors two read-only scan
contracts under `.zcode-marketplace/arggon/templates/automations/` — a daily
spec-drift scan (`spec analyze`, `doctor --agents`) and a weekly stale-claim
sweep (`arggon list --stale`). Nothing is scheduled: an adopter wires a
contract into their own scheduler, and deleting it is the off switch. Both
refuse to run anywhere but the primary checkout on the default branch with a
clean tree and no claim held; the scan is pure read and the only permitted
write is `arggon create` — one finding item per NEW drift or stale claim, with
the evidence commented on the new item. Neither ever touches the items it
scans (no update, no comment there, no claim release) and the kernel
invariants outrank the contract.
