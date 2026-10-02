---
# arggon:generated template="zcode/arggon/commands/arggon-status.md"
description: Summarize tracker state (progress, blockers, stale claims)
---

Summarize the tracker with the read-only arggon MCP tools: `mcp__arggon__arggon_report` for
per-container progress and `mcp__arggon__arggon_list` with `status: "blocked"` /
`stale: true` for blockers and stale claims (the structured fields are the
input; the string DSL stays available as `filter: "status:blocked"`).
$ARGUMENTS

Keep it bounded: counts and the few items that need attention, not a full dump.
