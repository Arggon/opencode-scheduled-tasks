---
id: 0005
title: Per-job permission rules
status: Proposed
date: 2026-10-02
deciders: arggon
---

# ADR 0005: Per-job permission rules

## Context

A scheduled run is **unattended**. Spec 001 acknowledges the consequence obliquely: it bounds
`runTimeoutMs` so an unanswerable `ask` prompt cannot hang the scheduler. That is a mitigation,
not a design.

Today a job inherits the target session's permissions wholesale. That is wrong in both
directions: a job that only reads a log inherits write access, and a job that legitimately
needs to commit inherits whatever a human's interactive session happened to allow.

`opencode-tasks` (see [Attribution](0007-attribution-and-lineage.md)) goes further and carries
a **declarative `permission:` block** in each task's frontmatter, plus two warnings earned the
hard way: an `"ask"` is effectively a deny with nobody to answer it, and `external_directory`
defaults to `ask` so any path outside the job's cwd silently fails.

V2 makes this **implementable properly**: `ctx.permission.rules({ sessionID, permissions })`
lets a plugin replace a session's permission rules. The V1-era plugin could only write a
permission block into a config file and hope.

## Decision

**A job may declare its own permission rules, and they are applied to the session before the
prompt is admitted.**

- `permissions` is an optional job field mirroring OpenCode's own `permissions` schema
  (action objects with glob `resource` patterns and `allow`/`ask`/`deny` effects). Reusing the
  host schema means one vocabulary, not two.
- Rules are applied via `ctx.permission.rules()` at dispatch, immediately before
  `session.prompt` — the same ordering discipline already used for `agent` and `model`.
- **A job that declares no permissions inherits the session default, unchanged.** No implicit
  tightening. Silent privilege reduction would be its own surprise.
- An `"ask"` in a scheduled context is documented as a **deny** and is *reported as such* in
  the run record and the `running` log line, rather than being left to time out.
- `external_directory` gets the same explicit treatment, because it is the default that fails
  most quietly.
- Rule-order semantics are documented verbatim: **the last matching rule wins**, so a
  catch-all belongs first and specific overrides after. This inverts what most permission
  systems do and is a documented footgun, not an implementation detail.

## Consequences

- A scheduled job's blast radius becomes **declared in the job file and reviewable in a PR**,
  which is the whole point: the security posture of an unattended job is now visible.
- Applying rules mutates session state. It is therefore applied per dispatch and re-applied on
  every run, never assumed to persist.
- On a host without `ctx.permission.rules` the job runs with session defaults and the
  degradation is logged once, on the same terms as ADR 0001's feature-detection rule.
- This is the one place where the V2 API is strictly better than what is possible on V1.

## Alternatives considered

- **Hard-deny everything not explicitly allowed for jobs** — safer, but silently breaks jobs
  on upgrade and hides the intent.
- **Leave permissions to the session only** — rejected: it is the current weakness, and it
  makes an unattended job's reach unbounded and invisible.
- **A plugin-specific permission vocabulary** — rejected: two vocabularies for one concept.