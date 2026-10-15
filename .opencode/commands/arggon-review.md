---
# arggon:generated template="opencode/commands/arggon-review.md"
description: Review a maker's changes against the engineering review bar
agent: arggon-standards-reviewer
subagent: true
---

Review $ARGUMENTS. Read the item with `tools.arggon.show({ id, body: true })`,
the diff and the project rules (`ArggonManager/docs/engineering.md`,
`ArggonManager/docs/agents.md`), judge the change against **the blocking bar the
project's engineering docs declare**, and post a
severity-ordered verdict with file references and evidence **on the item**
with `tools.arggon.comment` (never a GitHub PR comment). End with a merge /
no-merge recommendation.
