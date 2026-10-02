---
# arggon:generated template="zcode/arggon/commands/arggon-handoff.md"
description: Write a structured handoff for an in-flight item
argument-hint: "<item-id>"
---

Write a bounded handoff on $ARGUMENTS with the native tool `mcp__arggon__arggon_handoff`:

- `next`: the first concrete step for the resuming agent (≤200 chars).
- `open_questions`: unresolved questions, `;`-separated.
- `branch` only when it differs from the recorded one.

Then report the item id and the handoff summary. Handoffs are history: never
rewrite earlier sections.
