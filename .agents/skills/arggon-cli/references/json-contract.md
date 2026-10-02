<!-- arggon:generated template="skills/arggon-cli/references/json-contract.md" -->
# JSON contract and output surfaces

Part of the `arggon-cli` skill (`SKILL.md`). Read this before parsing CLI output
or building filters.

## Envelopes

- Success: `{ok, schemaVersion: 1, conventionVersion, command, ...payload}` on stdout.
- Failure (with `--json`): `{ok: false, error: {message, code}}` + non-zero exit.
- Human output (no `--json`) is for eyes only — never parse it; re-run with `--json`.
- Error codes: `INIT_FAILED, CREATE_FAILED, LIST_FAILED, UPDATE_FAILED, VALIDATE_FAILED,
BRANCH_FAILED, START_FAILED, BOARD_FAILED, SYNC_FAILED, NEXT_FAILED, REPORT_FAILED,
TREND_FAILED, DOCTOR_FAILED, ADOPT_FAILED, SPEC_FAILED, INSTRUCTIONS_FAILED,
EXPLORE_FAILED, PLAYBOOK_FAILED, COMMENT_FAILED, IMPORT_FAILED, CLEANUP_FAILED,
PRIORITY_FAILED`.
- `WorkItem.path` is posix relative to the repo root. Run inside the repo tree —
  outside it every command fails fast (`LIST_FAILED` etc.).
- `conventionVersion` rides every envelope (v4 current; v0–v3 rules live in
  `ArggonManager/docs/convention.md`).

## Filters and queries

- `list` filters compose with AND; unknown `--status`/`--type` values fail.
  Predicates: `status:`, `type:`, `assignee:`, `label:`, `parent:`,
  `depends-on:`, `blocked-by:`; `!` negates.
- `list --assignee @me` resolves the current GitHub user (honors `GITHUB_USER`).
- "What should I work on" = `next --json` — one envelope ~67x smaller than
  `list --json`, which is for full scans. `next` suggests leaf work only by
  default; `--include-stories` opts unclaimed stories back in.
- Empty `items[]` on a filtered `list` is success, not an error.
- `show <id>` is bounded (ADR 0006): frontmatter + last comments; `--body` is the
  explicit opt-in for the full body — prefer it over reading whole item files.
- Label at creation with `create --labels <csv>` (same kebab-case rules as
  `update --labels`); no follow-up update needed.

## Views and reports

- `board` without `--out` writes `board.html` at the repo root (where the tracker
  lives). `--tui` needs an interactive terminal; `--serve` binds 127.0.0.1 only
  and is incompatible with `--github`/`--tui`. `--serve --json` emits the standard
  envelope once (`serving: true` plus `url` and `port`) and then keeps serving.
- Priority (convention v4): `p0|p1|p2|p3` (absent = unprioritized), set with
  `create/update --priority` (empty clears) and filtered with `priority:p1` /
  `priority:none` / `!priority:p1`. `priority migrate` moves legacy `pN` labels
  into the field once and never auto-commits.
- `doctor` is report-only (exit 0 always): installation + docs + tracker health.
  Use `--budget` for the context-budget surfaces (report-only).

## Verification

- `validate --json` on a healthy tree → `{"ok": true, ...}`; on a broken tree →
  `ok:false` + `error.code: "VALIDATE_FAILED"` + non-zero exit. Fix the tree,
  don't work around it, and keep it green before committing.
- `board --json` → `{ok, command: "board", path, itemCount}` and the file exists.

## Native tools (OpenCode V2)

The vendored plugin registers the same operations as native `arggon` tools in
Code Mode (`tools.arggon.list`, `create`, `update`, `show`, `next`, `report`,
`validate`, `comment`, `handoff`, `priority`, `sync`, `import_issues`) plus the
worktree lifecycle tools (`tools.arggon.start`, `branch`, `cleanup`; W4: the
worktree domain owns the item worktree, the kernel keeps the claim/branch/
`worktree_path` records, and `cleanup` classifies with the same kernel rule as
the CLI). Tool
outputs are the documented `--json` envelopes verbatim (byte parity pinned by
the plugin contract tests); a kernel failure throws a typed tool error carrying
the failure code and the `ok:false` envelope instead of exiting the process.
`comment`/`handoff` default their author/session to the calling session id, and
the session keeps running after a tool error.

## MCP surface

`arggon mcp` is the optional stdio MCP server — it is **not** part of the
OpenCode V2 default path (the native tools replace it); agents that want it
register it through their MCP client (`.mcp.json`), never by typing it. For
clients with no code-mode tool API (ZCode, ADR 0014) it IS the native tool
surface. **Fifteen tools**: the core nine `arggon_list`, `arggon_create`,
`arggon_update`, `arggon_comment`, `arggon_handoff`, `arggon_show`,
`arggon_next`, `arggon_report`, `arggon_validate`, plus `arggon_priority`,
`arggon_sync`, `arggon_import_issues` (kernel operations, in-process) and the
worktree lifecycle `arggon_start`, `arggon_branch`, `arggon_cleanup` (each
spawns the arggon CLI — argv array, no shell — and returns its `--json`
envelope; `start` pushes and may hit the network, with a 10-minute budget per
spawned flow).
Results are the documented `--json` envelopes serialized as text content; kernel
failures surface as tool errors with the CLI's message text, and a spawned
child that dies without an envelope surfaces a tool error with a clipped
stderr tail — the session keeps running either way. An MCP caller cannot
reopen `done`/`cancelled` items and cannot steal a claim (there is no `force`
parameter anywhere on the surface) — the CLI and MCP share one rules module.
Tool schemas mirror the CLI options both ways; the standing invariant is
`mcp-parity.test.ts` (exceptions documented there, `--json` always excepted).
