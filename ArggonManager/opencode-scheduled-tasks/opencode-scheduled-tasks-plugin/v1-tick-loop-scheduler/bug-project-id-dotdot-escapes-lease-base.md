---
type: bug
status: todo
id: bug-project-id-dotdot-escapes-lease-base
title: "A project id of \"..\" composes outside the lease directory — the sanitizer keeps dots"
parent: v1-tick-loop-scheduler
labels: []
priority: p2
created: "2026-10-03"
updated: "2026-10-03"
depends_on: [task-pin-twelve-untested-spec-001-behaviours]
---
<!--
  Placement (v0): ArggonManager/opencode-scheduled-tasks/opencode-scheduled-tasks-plugin/v1-tick-loop-scheduler/bug-project-id-dotdot-escapes-lease-base.md
  Leaves live only under a story. id is the filename stem: bug-project-id-dotdot-escapes-lease-base.
  CLI `arggon create bug project-id-dotdot-escapes-lease-base` adds the bug- prefix (do not pass it twice).
  parent MUST be the story id. Omit assignee when unassigned. Omit blocked_reason unless status is blocked.
-->

# A project id of ".." composes outside the lease directory — the sanitizer keeps dots

## Context

Found by `task-pin-twelve-untested-spec-001-behaviours`, confirmed by the coordinator against `main`.

`leasePath` sanitizes the project id like this:

```ts
const safe = id.replace(/[^A-Za-z0-9._-]/g, "_")
return join(leaseBaseDir(), safe, "writer.lock")
```

The character class **keeps `.`**, so an id of exactly `..` survives sanitisation intact and
`join(base, "..", "writer.lock")` resolves one level **above** the lease base directory.

Probed on this host:

```
id="abc123"       ->  ~/.local/share/opencode/scheduled-tasks/abc123/writer.lock
id=".."           ->  ~/.local/share/opencode/writer.lock          <-- outside the base
id="."            ->  ~/.local/share/opencode/scheduled-tasks/writer.lock   <-- at the base root
id="a/b"          ->  ~/.local/share/opencode/scheduled-tasks/a_b/writer.lock   (correct)
id="../../etc"    ->  ~/.local/share/opencode/scheduled-tasks/.._.._etc/writer.lock   (correct)
```

`logPath` has the same shape, so both the writer lockfile and `scheduler.log` can land outside the
directory that is supposed to contain them.

## Honest severity

This needs a **hostile or corrupt project id** — `id` comes from `ctx.location.project.id`, which a
normal OpenCode host derives from the project itself. So in the ordinary threat model this is not
reachable by a third party.

It is filed anyway because the code is already defending against exactly this class: the sanitizer
exists, so the intent to confine the id is established, and a half-finished defence is worse than none
because it reads as complete. `..` and `.` are the two values that defeat it, and neither is exotic.

## Acceptance

- [ ] An id that sanitises to `.` or `..` is rejected or escaped, so `leasePath` and `logPath` cannot
      compose outside their base directory. Assert the resolved absolute path, not the joined string —
      `join` normalising `..` away is exactly what makes the joined form look safe.
- [ ] The same holds for `logPath`.
- [ ] Consider an allowlist rather than a denylist: the id does not need `.` at all, and ids of `..`,
      `.`, and any run of dots become unrepresentable by construction rather than by check.
- [ ] Tests cover `..`, `.`, and a leading-dot id, and **assert containment** — that the result starts
      with the base directory — rather than asserting a specific string.
- [ ] Decide and document the trust boundary in the README's threat-model section: is the project id
      treated as untrusted input or as a host-provided value? That sentence should match what the code
      actually does.

## Notes

Filed by the coordinator from the pin-twelve worker's report. It noticed this, wrote a test that
**deliberately does not assert the escaping form as if it were correct**, and escalated rather than
widening a src-excluded diff — which is the right call and is why this exists as an item.

Box 178 (Windows path behaviour) was platform-gated in the same area and left unverified on Linux; see
that box's note. Do not regress the hostile-id confinement test that already exists.
