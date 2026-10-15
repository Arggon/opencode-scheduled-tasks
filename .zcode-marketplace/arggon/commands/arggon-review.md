---
# arggon:generated template="zcode/arggon/commands/arggon-review.md"
description: Review a maker's changes against the engineering review bar
argument-hint: "<item-id or PR>"
---

Review $ARGUMENTS by dispatching the standards-reviewer subagent
(`arggon:arggon-standards-reviewer`
in the Agent tool) — the plugin's hook gate keeps that dispatch read-only while
it runs. Give it the item id, the diff/branch and the review bar. The reviewer
reads the item with `mcp__arggon__arggon_show` (`body: true`), the diff and the project
rules (`ArggonManager/docs/engineering.md`, `ArggonManager/docs/agents.md`),
judges it against **the blocking bar the project's engineering docs declare**,
and posts a severity-ordered verdict with file references and evidence **on the
item** with `mcp__arggon__arggon_comment` (never a
GitHub PR comment), ending with a merge / no-merge recommendation. The final
verdict is yours: relay it, never re-review silently.
