---
# arggon:generated template="zcode/arggon/commands/arggon-board.md"
description: Serve the read-only tracker board and share the local URL
---

Serve the tracker board for $ARGUMENTS (optional filter expression, e.g.
`status:todo`):

1. Start `arggon board --serve` as a background process — it serves until
   stopped and writes nothing after the first line. With `--json`, that first
   line is the one-shot serving envelope: `{serving: true, url, port}`.
2. Hand the user the loopback URL as a markdown link (the ZCode client opens
   local URLs), e.g. [board](http://127.0.0.1:<port>).
3. The board is read-only: it renders the tracker from git files; cards match
   `arggon list`. Filters run client-side via the page's filter lens.
4. Leave the server running for the user; if they ask to stop it, kill the
   background process. Never block the session waiting on the server.
