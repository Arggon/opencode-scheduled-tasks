<!-- arggon:generated template="zcode/arggon/README.md" -->
# arggon — ArggonManager native seam for ZCode

This directory is the vendored declarative plugin `arggon init` generates for
ZCode (ADR 0014): the `mcpServers` registration of `arggon mcp`, the
`/arggon-*` commands rewritten against the arggon **MCP** surface, the
dispatchable subagents below, the goal-mode and automation contract templates,
and the hook gates (global git gates + the dispatch-scoped reviewer backstop).
Install it once via Plugin Marketplace → Add → Add Plugin Marketplace, pointed
at this repo's `.zcode-marketplace/` directory; the arggon CLI must be on
`PATH`.

## The delivery lead is the main session, not a subagent

ZCode can only surface plugin agents as **dispatchable subagents** (Settings →
Subagents; the Agent tool) — it has no primary/session-agent concept. The
delivery lead is the opposite position in the role model: the lead is who the
product owner interacts with, the primary worker. Shipping the lead as a plugin
agent would invite the main session to spawn a lead-child with no product-owner
channel and nobody above it to take decision briefs from.

So this seam ships **only the subagent roles** — `arggon-maker` and
`arggon-standards-reviewer` — and **the main session IS the delivery lead**:

- Do not dispatch a "lead": there is no `arggon-delivery-lead` agent here, and
  no surface of this plugin asks you to create one.
- The lead's contract rides the instruction carriers instead of a prompt file:
  `AGENTS.md` → `ArggonManager/docs/agents.md` §Orchestration (wave planning,
  claim before dispatch, one maker per item, lead review, merge verification)
  and `ArggonManager/docs/engineering.md` §Roles and authority (the role table
  and the product-owner boundary).
- The OpenCode seam keeps the lead as its selectable session agent
  (`mode: primary`); per-client seams materialize only the roles the client can
  express. A client whose plugin agents are all subagents (ZCode today; Claude
  Code plugins likewise) carries the lead role in its instruction material.

Dispatch `arggon-maker` for item work and `arggon-standards-reviewer` for the
read-only review pass; everything the lead decides — sequencing, claims, the
verdict, merge verification and the `done` flip — belongs to the main session
itself.
