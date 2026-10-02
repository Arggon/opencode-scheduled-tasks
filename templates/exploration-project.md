---
exploration_id: {{ID}}
title: {{TITLE}}
status: open
created: {{DATE}}
---

# Project exploration: {{TITLE}} ({{ID}})

Greenfield record (the six-phase protocol, `skills/arggon-cli/references/exploration.md`
— ADR 0017): the decision lands in an ADR (`ArggonManager/docs/adr/`) — link it
under Decision. Edge cases leave this doc as spec acceptance criteria, explicit
non-goals, or spike items — nothing stays "unknown".

## Classification

<!-- spike / bounded / greenfield + why. The ratchet is one-way: complexity found mid-flight upgrades the classification, never downgrades. -->

## Frontier-rounds log

<!-- One entry per round (outcome/users → scope/decomposition → constraints → data → interfaces → failure/edge → ops/security → rollout): the questions asked and how each settled. "I don't know" routes to a spike item, never a guess; ballooning rounds decompose first. Rounds end when the frontier is empty — nothing silently assumed. -->

## Edge cases

<!-- Adversarial pass over the settled design, one row per dimension. Every hunted case resolves into exactly one of: a spec acceptance criterion (→ the spec), an explicit non-goal (→ recorded here), or a spike item (→ a tracked task). A dimension with no plausible case records `none — <why>`. -->

| Dimension                       | Hunted case | Resolution |
| ------------------------------- | ----------- | ---------- |
| input validation / hostile input |             |            |
| empty/loading/error states      |             |            |
| concurrency / idempotency       |             |            |
| failure/retry/timeout           |             |            |
| authn/authz                     |             |            |
| limits/quota/perf               |             |            |
| time/timezones/locale           |             |            |
| persistence/migration/rollback  |             |            |
| observability/debuggability     |             |            |
| security/threat model           |             |            |
| environment/platform            |             |            |
| upgrade/data-loss               |             |            |

## Approaches considered

<!-- 2–3 candidate approaches with trade-offs and a recommendation. YAGNI ruthlessly; decompose multi-subsystem proposals first. -->

## Decision

<!-- ADR reference placeholder: ArggonManager/docs/adr/0000-<slug>.md once the ADR lands. Artifacts follow in order: this doc → ADRs → spec (hunted cases as acceptance criteria) → plan/tasks with depends_on. No implementation task before the spec passes arggon spec analyze with no NEW findings. -->
