---
id: 0007
title: Attribution and design lineage
status: Proposed
date: 2026-10-02
deciders: arggon
---

# ADR 0007: Attribution and design lineage

## Context

This plugin was built after an investigation concluded that OpenCode V2 ships no scheduler,
and from a design that was worked out independently — tick loop over a declarative job file,
misfire and cost bounds, a cross-process writer lease, DST-correct cron arithmetic, zero
dependencies.

That investigation was **correct about OpenCode core and wrong about the ecosystem**. A
public plugin, [`jdormit/opencode-tasks`](https://github.com/jdormit/opencode-tasks) (MIT,
Jeremy Dormitzer), had been solving the same problem since March 2026 and was at v0.5.3. It
should have been found before any of this was written.

Several of its ideas are better than ours and were adopted. Absorbing them silently would be
both dishonest and, in a plugin ecosystem, the kind of thing that loses the one thing that
makes independent work worth doing.

## Decision

**Name the lineage wherever a reader would reasonably look for it**, and be specific about
what came from where.

- `README.md` carries an **Acknowledgements** section naming `opencode-tasks` and its author,
  listing the ideas adopted from it.
- The affected ADRs (0004, 0005, 0006) cite it inline at the point of influence.
- Spec 002 carries the same attribution in its Purpose.
- Code comments credit an idea **only** where the implementation follows that project's
  approach rather than ours — specifically the permission-semantics warnings in ADR 0005, which
  were learned from its README and are reproduced because they are correct.

Where we deliberately diverge, the ADR says so and says why (ADR 0004 keeps JSON; ADR 0006
narrows rather than copies its loop model). Attribution is not a substitute for an honest
divergence record.

## Consequences

- A reader who prefers that plugin can find it in one hop, and we lose nothing by admitting
  the comparison.
- The ideas adopted are recorded as *inspired by*, never as *copied from*, because the
  implementations are ours and differ in storage, engine and API surface.
- This commits us to checking the ecosystem before claiming a gap in future. The failure this
  ADR exists to correct was not the design; it was the search that preceded it.

## Alternatives considered

- **No attribution** — rejected. It is both inaccurate and needlessly adversarial.
- **Attribution only in the README** — rejected: an ADR reader deciding whether to trust the
  permission model should not have to go looking for the source.
- **Contributing our improvements back upstream** — desirable and worth proposing to the
  author; out of scope here, and it is their call whether to take them.