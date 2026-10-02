---
type: task
status: in_progress
id: task-t2-markdown-task-files
title: Markdown task files alongside the JSON array
assignee: arggon
parent: config-surface-markdown-task-files-durations
labels: []
created: "2026-10-02"
updated: "2026-10-02"
claimed_at: "2026-10-02T16:23:53.351Z"
depends_on: [task-t1-durations-and-format-tool]
---
<!--
  Placement (v0): ArggonManager/scheduled-tasks-v2/v2-features-inspired-by-opencode-tasks/config-surface-markdown-task-files-durations/task-t2-markdown-task-files.md
  Leaves live only under a story. id is the filename stem: task-t2-markdown-task-files.
  CLI `arggon create task t2-markdown-task-files` adds the task- prefix (do not pass it twice).
  parent MUST be the story id. Omit assignee when unassigned. Omit blocked_reason unless status is blocked.
-->

# Markdown task files alongside the JSON array

## Context

Loads `.opencode/tasks/<id>.md` (YAML frontmatter + body-as-prompt) and merges it with the JSON
array by id, markdown winning. Implements ADR 0004.

See plan 002 §T2 and spec 002 § "Config surface".

## Acceptance

- [x] A markdown job loads and fires; the body is the prompt with frontmatter stripped and
      surrounding blank lines trimmed.
- [x] A duplicate id across surfaces yields exactly one job plus one **reported** shadow.
- [x] Bad YAML, a missing schedule, a bad id or a missing body refuses **only** that job, with a
      named reason, through the same validation path as JSON.
- [x] With no `.opencode/tasks/` directory the plugin imports **nothing** new and behaves
      identically to v1 (asserted by a load-time test — invariant 4).
- [x] Frontmatter is treated as untrusted: field sizes and collection cardinality bounded, and
      no frontmatter value interpolated into a prompt.



## Notes

Plan 002, spec 002 and the cited ADRs are the authority; this body is the
done-gate checklist (ADR 0015).

### 2026-10-02 @arggon
## Implementation evidence (branch `feat/task-t2-markdown-task-files`, commit `c7a5ae2`)

### What changed
- `src/index.ts` (+~500): a new "Markdown job files (ADR 0004)" section — `splitFrontmatter`,
  `YamlReader`/`setYamlReader`/`loadYamlReader`, `loadMarkdownJobs`, `mergeJobSources`, the
  `TASKS_DIR`/`MAX_MARKDOWN_*`/`MAX_FRONTMATTER_CHARS` constants. `reloadJobs` became async and
  merges both surfaces; `setup` awaits it. Header docblock updated (it claimed "dependency-free";
  it now names the one optional dependency and why it is unreachable from the JSON path).
- `test/index.test.ts` (+~700, +33 tests).
- `package.json`/`package-lock.json`: `yaml` added as an **optionalDependency** (`^2.9.1`),
  lockfile updated with `--package-lock-only` (node_modules untouched — this worktree's is a
  symlink to the primary checkout's install).

### How invariant 4 is satisfied
`yaml` is reached only via `await import(specifier)` inside `loadYamlReader()`, called only after
`loadMarkdownJobs` has found `.opencode/tasks` to contain `.md` files. No static import; no
hand-rolled YAML subset. Two tests pin it:
1. **every static import in the plugin is a node builtin** — scans `src/index.ts`, asserts exactly
   `["node:fs","node:os","node:path"]` (a bare `import "yaml"` is caught too; a dynamic
   `import(x)` is not).
2. **loads and runs a JSON-only project without resolving any package** — a real child process
   imports the plugin and calls `setup` under an ESM `module.register` resolve hook that writes
   `EXTERNAL:<spec>` to stderr for any non-builtin. Asserts it never appears.
   A third test asserts the hook *does* fire (`EXTERNAL:yaml`) once a markdown job exists, so
   test 2 cannot pass vacuously.

Mutation-checked: adding `import { parse } from "yaml"` makes the suite fail loudly; adding a bare
`import "/typescript/lib/typescript.js"` is caught by test 1's regex (verified against four
mutations).

### Exact degradation when the reader is absent
- `loadYamlReader()` returns `undefined`, logs **once** (`scheduled-tasks: no YAML reader: yaml is
  not installed, so .opencode/tasks/*.md jobs are refused and .opencode/schedules.json jobs are
  unaffected. Install yaml (an optionalDependency) to enable them.`).
- Every `.md` file is refused **by name** in the existing `invalid` array:
  `.opencode/tasks/nightly.md: no YAML reader available (yaml is not installed and none was
  provided); install it, or move this job to .opencode/schedules.json`
- `setup` resolves normally, tools register, JSON jobs load/fire/lease as before. No throw.

### Test counts
- before: **119 passed**
- after: **150 passed, 2 skipped** (152 total). The 2 skipped need the real `yaml` and are declared
  with `it.runIf`; they *do not exist* in a tree without it rather than passing vacuously.

### Gates (all green)
- `npx tsc --noEmit` → exit 0
- `npx vitest run` → 150 passed | 2 skipped
- `npx tsx harness/smoke.ts` → PASS (real clock, 45.9 s window)
- `arggon validate` → ok (0 warnings, convention v5)
- `arggon spec analyze` → clean (2 specs)

### Verification of the real reader, out of tree
This worktree's `node_modules` is a symlink to the primary checkout's install, so installing
`yaml` here would have mutated a tree I do not own. Instead `yaml@2.9.1` was installed into
`/tmp/opencode/yamlprobe` and the plugin driven against it (that scratch dir is outside the repo
and nothing about it is committed). The spec 002 synopsis frontmatter parsed correctly — comment
after a quoted cron, `session: reuse   # reuse | fresh`, `runTimeout: 30m` → 1800000 ms, nested
`permissions.bash` resource map intact — and a 200-byte anchor bomb was refused with
`Excessive alias count indicates a resource exhaustion attack`. The two skipped tests assert
exactly these two outcomes, so they will pass wherever `yaml` is installed.

### Bugs found while building this
1. **A FIFO named `x.md` in `.opencode/tasks/` would hang the server forever** — `readFileSync`
   on a FIFO blocks, and it would block inside `setup`. Now only regular files are opened
   (`statSync().isFile()`), which also picks up symlinked task files. Tested with a real
   `mkfifo`.
2. `readdir` order is filesystem-defined, so job order in `schedules_list` would have depended on
   inode layout. Files are now sorted by name.
3. With two surfaces, a **corrupt `schedules.json` was being swallowed** whenever markdown jobs
   loaded. v1 only reported a read failure when nothing loaded at all; a read failure is now
   reported whenever the file exists and is broken (an *absent* file stays quiet when something
   else defines a job).
4. Two bugs in my own first draft, caught by the tests: the filename stem was never injected as
   `record.id` (every job refused with "has no id"), and CRLF was not actually normalized despite
   the docblock claiming it.

### Reviewer notes / deliberate calls
- `MAX_MARKDOWN_JOBS` is a **per-surface** cap (100), so a mid-migration project can load 200. A
  combined cap was rejected: one surface's contents refusing another's jobs would be worse.
- A `.md` file in the tasks directory that has no frontmatter (a stray `README.md`) is **refused
  by name**, not ignored — "not a job file" and "a job file we cannot read" are different answers
  and only the second should ever happen by accident.
- A frontmatter `id` that disagrees with the filename stem is ignored **and reported**; a silently
  ignored id is a job that never fires under the name its author expects.
- `InvalidJob` keeps its exact `{ id, schedule, reason }` shape; the source is encoded in the
  reason text rather than adding a field.
- Line endings are normalized CRLF→LF in the body; trailing spaces on a *content* line are kept
  (only whole blank lines at the edges go).
- Jobs are reloaded at setup only, so editing a `.md` needs `opencode reload` — same as v1 JSON.
- **T7 needs to know:** `yaml` must be documented as an *optional* dependency (npm install gives it
  to package consumers; a `cp src/index.ts` vendored install only gets it if the user's own project
  already has `yaml`). `JOB_FORMAT_REFERENCE` (the `schedules_format` output, written in T1) already
  names both surfaces and the precedence rule and was left untouched; it may now deserve a short
  worked example plus the degradation note. README was not edited, per instructions.

### handoff 2026-10-02 @arggon (session: ses_f02bf259cffe6cQ2eSBhSu63tJ) — next: Coordinator: review commit c7a5ae2 (5 files: src/index.ts, test/index.test.ts, package.json, package-lock.json, item checklist), then merge and mark done. Nothing left to implement.
- branch: feat/task-t2-markdown-task-files
- open questions: Document `yaml` as an OPTIONAL dependency (T7/README): vendored `cp src/index.ts` gets it only if the user's project already has it. Was: should a stray .md with no frontmatter (README.md) be refused…
