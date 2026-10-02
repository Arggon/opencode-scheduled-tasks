---
# arggon:generated template="zcode/arggon/commands/arggon-review.md"
description: Review a worker's changes against the engineering review bar
argument-hint: "<item-id or PR>"
---

Review $ARGUMENTS by dispatching the reviewer subagent (`arggon:arggon-reviewer`
in the Agent tool) — the plugin's hook gate keeps that dispatch read-only while
it runs. Give it the item id, the diff/branch and the review bar. The reviewer
reads the item with `mcp__arggon__arggon_show` (`body: true`), the diff and the project
rules (`ArggonManager/docs/engineering.md`, `ArggonManager/docs/agents.md`),
runs the project gates, and posts a severity-ordered verdict with file
references and smoke evidence **on the item** with `mcp__arggon__arggon_comment` (never a
GitHub PR comment), ending with a merge / no-merge recommendation. The final
verdict is yours: relay it, never re-review silently.
