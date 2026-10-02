---
# arggon:generated template="opencode/commands/arggon-next.md"
description: Show the next claimable item and how to claim it
---

Use the native `arggon` tools (Code Mode: `tools.arggon.*`) to find the next
claimable item — `tools.arggon.next({})`; pass `{ ready: true }` to restrict the
pool to items whose dependencies are all terminal. $ARGUMENTS

Report, bounded: item id, title, priority, why it ranks first, its parent chain,
blocked-by/unblocks counts, and the exact claim step
(`tools.arggon.update({ id, status: "in_progress", assignee: "<login>" })`). Do
not claim anything without being asked.
