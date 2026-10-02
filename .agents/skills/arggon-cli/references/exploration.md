<!-- arggon:generated template="skills/arggon-cli/references/exploration.md" -->
# Greenfield exploration — the six-phase protocol

Part of the `arggon-cli` skill (`SKILL.md`). The default first phase for
greenfield work — a new project, subsystem, or interface others will depend on
(ADR 0017, greenfield exploration gate): classify before building, end with the
edge cases already solved on paper, and gate implementation behind a spec.
Thinking is the deliverable — keep every artifact lean.

## Phase 0 — Classify (the gate)

Before any work, classify the task. The ratchet is one-way: complexity
discovered mid-flight upgrades the classification, nothing downgrades it.

| Classification | Meaning                                        | Route                                                                        |
| -------------- | ---------------------------------------------- | ---------------------------------------------------------------------------- |
| **Spike**      | One open question, throwaway answer            | Time-boxed prototype or an `arggon stack explore` record; feeds a bounded task. |
| **Bounded**    | An existing flow to read and extend            | `references/methodology.md` — spec first for non-trivial features.            |
| **Greenfield** | No existing flow to read; others will depend on it | This protocol, every phase.                                                  |

## Phase 1 — Stance

Thinking, not building: read-only on code. The only permitted writes are
methodology artifacts — the exploration doc, specs, ADRs, plans, tracker
items. If asked to implement, name the handoff instead: where the spec will
be and what it will settle.

## Phase 2 — Ground

Inspect the repo before asking anyone anything: code, specs, ADRs, playbooks,
product docs. Never ask the user for a fact you can verify yourself.

## Phase 3 — Frontier rounds

Interview in whole-frontier rounds: each round asks every question whose
prerequisites are settled, across domains in dependency order:

outcome/users → scope/decomposition → constraints → data → interfaces →
failure/edge → ops/security → rollout

- A round ends when the frontier is empty: every branch visited, nothing
  silently assumed. Log each round in the exploration doc.
- "I don't know" routes to a spike item, never a guess.
- Rounds ballooning? The scope is too large — decompose first, then grill
  each piece.

## Phase 4 — Edge-case hunt

An adversarial pass over the settled design, one checklist per dimension:

input validation & hostile input · empty/loading/error states · concurrency &
idempotency · failure/retry/timeout · authn/authz · limits/quota/perf ·
time/timezones/locale · persistence/migration/rollback ·
observability/debuggability · security/threat model · environment/platform
differences · upgrade/data-loss

Every hunted case resolves into exactly one of: a **spec acceptance
criterion**, an **explicit non-goal**, or a **spike item** — nothing stays
"unknown". This is the mechanism that solves edge cases before they arrive.
Record them in the exploration doc's edge-case table (dimension / hunted case
/ resolution — pre-seeded in the project-exploration template).

## Phase 5 — Approaches, artifacts, gate

- **Approaches:** 2–3 candidates with trade-offs and a recommendation. YAGNI
  ruthlessly; a multi-subsystem proposal decomposes first.
- **Artifacts, in order:** the greenfield exploration doc
  (`templates/exploration-project.md`) → ADRs for cross-cutting decisions →
  the spec, with the hunted cases as its acceptance criteria → plan + tasks
  with `depends_on`.
- **Hard gate:** no implementation task may be claimed before the spec exists
  and `arggon spec analyze` reports no NEW findings — the scanner is the
  automated grill.
- **Self-review before handoff:** placeholder scan, internal consistency,
  scope check, ambiguity check.
