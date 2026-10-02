<!-- arggon:generated template="skills/arggon-upgrade/SKILL.md" -->
---
name: arggon-upgrade
description: Update the ArggonManager-generated docs and bundled skills in this repo when ArggonManager ships a new version. Use when `arggon doctor` reports `outdated` docs, when ArggonManager's CHANGELOG shows a release newer than the version in `ArggonManager/.convention.yml`, or when the user asks to update/upgrade/sync ArggonManager here.
version: 1.0.0
author: Arggon (Arggon), Hermes Agent
license: MIT
platforms: [linux, macos, windows]
---

# Upgrading ArggonManager in this repo

This repo was initialized by `arggon init`: its governing docs and bundled
skills are **generated artifacts with provenance** (checksums recorded in
`ArggonManager/.convention.yml` under `x-generated:`). When ArggonManager releases a
new version, its templates and this bundled skill move ahead of your copies.
This skill is the safe update flow — mechanical steps plus explicit judgment
calls. It was proven on the first real adopter upgrade (ArggonStores-am,
2026-09-17).

## What you are updating

Generated docs (AGENTS.md, ArggonManager/docs/convention.md, ArggonManager/docs/engineering.md, …), the
bundled skills under `.agents/skills/`, and tracked templates. **Never** your
own curated content: docs you completed and acked (`arggon adopt --ack`) are
yours — updates arrive as *proposals you judge*, not overwrites.

## The flow

0. **Sync the tool.** Update your ArggonManager checkout (git pull; the CLI
   runs from that repo). `arggon --version` should print the new release —
   check ArggonManager's `CHANGELOG.md` for what the release changes for
   adopters before deciding it is worth it.
1. **Measure**: `arggon doctor --json` → the `docs.outdated` bucket lists
   generated docs whose current-template render differs from disk. From any
   checkout — comparisons are EOL-normalized (eol=crlf working trees are
   supported).
2. **Preview**: `arggon init --full --dry-run` — the per-destination plan
   (created / would-update / acked-skip / modified-skip), writes nothing.
3. **Propose**: `arggon init --full --propose` — writes side files
   `<dest>.proposed-<version>` next to each outdated doc. Section-level by
   default: only the template regions that changed since the doc was
   generated, with anchors. Originals stay byte-untouched; nothing is
   committed. (`--propose-whole-file` opts into full renders; a brand-new
   managed file in the new version is not a proposal — a plain `arggon init`
   re-run creates it as `created[]`.)
4. **File the work**: `arggon create task "absorb ArggonManager <version>"`,
   claim it, cut a branch (worktree), and review each proposal:
   - **Apply** a region when it is upstream guidance you want (new sections,
     methodology updates) — insert at the quoted anchors.
   - **Skip** when your content is deliberate divergence (curated docs,
     real owners, project-specific conventions) — that is the "acked is
     yours" contract working; the `outdated` signal honestly remains.
   - **Never** accept a whole-file render over a completed doc without
     reading every line — that is how curated content gets destroyed.
   - Delete each side file after handling it.
5. **Re-baseline**: `arggon adopt --ack` — the merged docs become the new
   sanctioned baseline (checksums refreshed; `acknowledgedDrifted` clears).
6. **Gates + PR**: `arggon validate` ok + `arggon doctor` 0 modified /
   0 drifted; commit with explicit paths; PR referencing the work item; merge;
   flip the item done.

## Judgment rules

- Proposals are SUGGESTIONS. The review step is the product — a wholesale
  template render over a completed doc is almost always a regression.
- Skip without guilt: deliberate divergence is a feature (the `outdated`
  signal stays as honest bookkeeping).
- Conflicts between upstream conventions and this repo's own (e.g. upstream
  `end_of_line = lf` vs a local `eol=crlf` .gitattributes): this repo wins.
- Comparisons are EOL-normalized — worktrees and renamed clones see the same
  results as the canonical checkout.
- `init --propose` never commits and never overwrites; if something looks
  wrong, deleting the side files is always a safe undo.
