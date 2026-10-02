---
id: 0004
title: Markdown task files alongside the JSON array
status: Accepted
date: 2026-10-02
deciders: arggon
---

# ADR 0004: Markdown task files alongside the JSON array

## Context

[ADR 0001](0001-tick-loop-over-declarative-jobs.md) fixed one declarative source of truth:
`.opencode/schedules.json`. It did not say what *shape* that truth takes.

Authoring prompts in JSON forces escaping — newlines become `\n`, quotes are doubled, and a
five-line prompt is one unreadable line in a diff. `opencode-tasks` (see
[Attribution](0007-attribution-and-lineage.md)) solves this by making a job a **markdown
file whose body is the prompt**, with YAML frontmatter for the fields. That gives clean
per-job diffs and lets a prompt be read as prose.

Rejecting that for the same reason one rejects any good idea because it is not ours is not
an option; the idea is simply better for large prompts. But replacing the JSON array outright
would break every existing job file for no gain in capability.

## Decision

**Support both, as a union. Markdown wins on conflict.**

- `.opencode/schedules.json` — unchanged, still fully supported.
- `.opencode/tasks/<id>.md` — YAML frontmatter + body-as-prompt. The filename stem is the
  job id, matching the markdown convention already in use elsewhere.
- Both are loaded and merged. **If the same id appears in both, the markdown file wins**, and
  the shadowing is reported through `schedules_list` (never silent).

Precedence is by id rather than by "a whole source wins", so adopting markdown one job at a
time is supported: a JSON array and a directory of `.md` files coexist during a migration.

## Consequences

- Two config surfaces to document, validate and test — the real cost of this decision.
- Both go through the **same** validation path, so a malformed markdown job produces the same
  named, per-job error as a malformed JSON one (ADR 0001's rule: refuse one job, never the
  file).
- Frontmatter parsing needs a YAML reader. That is the first dependency this plugin has ever
  had, and it is accepted deliberately: the alternative is a hand-rolled subset parser, which
  is the kind of clever that produces a CVE-shaped bug. The reader must stay **optional at
  import time**: with no markdown file present the plugin must still load with zero
  dependencies (invariant 4).
- Frontmatter is data, so it is treated as untrusted: bounded field sizes, no custom tags, and
  never interpolated into a prompt.

## Alternatives considered

- **Markdown only** — best authoring, but a breaking format change to a just-shipped v1.
- **Keep JSON only** — smallest diff, keeps the escaping problem forever.
- **A hand-rolled YAML subset** — no dependency, but silently misparses anything it does not
  cover. Rejected.