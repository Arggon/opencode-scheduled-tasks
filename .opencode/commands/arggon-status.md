---
# arggon:generated template="opencode/commands/arggon-status.md"
description: Summarize tracker state (progress, blockers, stale claims)
---

Summarize the tracker with the read-only native tools: `tools.arggon.report({})`
for per-container progress and `tools.arggon.list({ status: "blocked" })` /
`tools.arggon.list({ stale: true })` for blockers and stale claims (the native
input takes the structured fields; the string DSL stays available as
`filter: "status:blocked"`). $ARGUMENTS

Keep it bounded: counts and the few items that need attention, not a full dump.
