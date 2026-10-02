<!-- arggon:generated template="docs/convention.md" -->
# Convention (opencode-scheduled-tasks)

Work in this repo is tracked as Markdown work items under `ArggonManager/`, managed by [`arggon`](https://github.com/Arggon/ArggonManager). Humans and agents follow the same rules. This file is **project-owned**: it describes how opencode-scheduled-tasks applies the arggon convention. (The full v0 spec lives in the ArggonManager repository; this template is the adopter-local summary.)

## Folder layout

```text
ArggonManager/
  .convention.yml                 # tree version + branch_patterns
  docs/                           # product docs (convention, engineering, ADRs, specs, plans, ...)
  <initiative-id>/
    <initiative-id>.md            # REQUIRED index
    <epic-id>/
      <epic-id>.md                # REQUIRED index
      <story-id>/
        <story-id>.md             # REQUIRED index
        task-<inner-slug>.md
        bug-<inner-slug>.md
```

On legacy trees the tracker root is still `tasks/` and the product docs live at
`docs/`; `arggon validate` reports the legacy location and
`arggon migrate --layout` moves both under `ArggonManager/`.

<!-- Adjust to this project's actual initiatives and naming habits; add project-specific
     folder rules (e.g. which initiatives exist, where spikes live). -->

## Frontmatter schema

Every work item is a Markdown file with YAML frontmatter:

| Field            | Required | Notes                                                         |
| ---------------- | -------- | ------------------------------------------------------------- |
| `type`           | yes      | `initiative` \| `epic` \| `story` \| `task` \| `bug`          |
| `status`         | yes      | `todo` \| `in_progress` \| `blocked` \| `done` \| `cancelled` |
| `id`             | yes      | Filename stem, globally unique under `ArggonManager/`         |
| `title`          | yes      | Human-readable summary                                        |
| `parent`         | yes*     | Container id; ArggonManager/bugs live only under a story      |
| `labels`         | no       | Kebab-case list                                               |
| `priority`       | no       | `p0` \| `p1` \| `p2` \| `p3` (v4)                             |
| `created`        | yes      | `YYYY-MM-DD`                                                  |
| `updated`        | yes      | `YYYY-MM-DD`                                                  |
| `assignee`       | no       | Required when `status: in_progress` (claimable types)         |
| `blocked_reason` | no       | Required when `status: blocked`                               |

<!-- Document any project-local conventions here: label vocabulary, initiative ids in use,
     which stories are active. Do not invent frontmatter keys outside the convention. -->

## Status rules

- Claim = claimable type + `assignee` + `status: in_progress`. Never steal a claim.
- `todo` → `done` directly is not allowed: claim first, then complete.
- Agents never reopen `done`/`cancelled`; file a follow-up with `arggon create`.

## Priority (v4)

Every item type carries an optional judgment priority — set it at filing time and
`arggon next` ranks suggestions by it:

```yaml
priority: p1
```

- Values: `p0` (drop everything) | `p1` | `p2` | `p3`. Omit = unprioritized.
- `arggon create <type> <title> --priority p1` / `arggon update <id> --priority p2`.
- `arggon list --filter "status:todo priority:none"` finds unprioritized work.
- Legacy `pN` labels migrate into the field: `arggon priority migrate`.

## Namespaced extensions

`ArggonManager/.convention.yml` supports `x-*` namespaced extension keys (older tools ignore them). The generated file documents each one-line; the full normative reference lives in the ArggonManager repository (`ArggonManager/docs/convention.md`):

| Extension     | What it does                                                                                                                                        | Where                                         |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `x-views`     | Saved list/board views: a mapping of `name: "<predicate expression>"` using the filter predicate language (`arggon list --filter`)                  | ArggonManager repo § Saved views              |
| `x-playbooks` | Playbook staleness options for `arggon playbook status` (`max-age-days`)                                                                            | ArggonManager repo § Technology playbooks     |
| `x-tracker`   | Tracker hygiene options: `auto-commit`, `allow-steal`                                                                                               | ArggonManager repo § Tracker hygiene          |
| `x-import`    | `arggon import-issues` options, e.g. `label-types` (GitHub label → work-item type mapping)                                                          | ArggonManager repo § Import type mapping      |
| `x-github`    | GitHub issue round-trip: with `issue-roundtrip: true` (default OFF), flipping an item with an `issue:` field to done closes the linked GitHub issue | ArggonManager repo § Issue round-trip         |
| `x-worktree`  | Worktree bootstrap for `arggon start --worktree`: `post-start` / `post-start-shell` commands, and `env: false` to opt out of the per-worktree `.arggon.env` identity/state contract (gitignored; never committed) | ArggonManager repo § Worktree bootstrap       |
| `x-generated` | Checksum/provenance state for arggon-generated docs (drives `arggon doctor` modified/stale reporting)                                               | ArggonManager repo § Generated-doc provenance |

## Validation

`arggon validate` checks the tree (run in pre-commit and CI — see [`AGENTS.md`](../../AGENTS.md)).

---

Generated by `arggon init` 2026 — edit freely; `arggon init` never overwrites existing files.
