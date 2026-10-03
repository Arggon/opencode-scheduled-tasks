---
type: bug
status: in_progress
id: bug-project-id-dotdot-escapes-lease-base
title: "A project id of \"..\" composes outside the lease directory — the sanitizer keeps dots"
assignee: arggon
branch: fix/bug-project-id-dotdot-escapes-lease-base
parent: v1-tick-loop-scheduler
labels: []
priority: p2
created: "2026-10-03"
updated: "2026-10-03"
claimed_at: "2026-10-03T06:53:31.863Z"
depends_on: [task-assert-v1-identical-with-no-markdown-dir]
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

- [x] An id that sanitises to `.` or `..` is rejected or escaped, so `leasePath` and `logPath` cannot
      compose outside their base directory. Assert the resolved absolute path, not the joined string —
      `join` normalising `..` away is exactly what makes the joined form look safe.
- [x] The same holds for `logPath`.
- [x] Consider an allowlist rather than a denylist: the id does not need `.` at all, and ids of `..`,
      `.`, and any run of dots become unrepresentable by construction rather than by check.
- [x] Tests cover `..`, `.`, and a leading-dot id, and **assert containment** — that the result starts
      with the base directory — rather than asserting a specific string.
- [ ] Decide and document the trust boundary in the README's threat-model section: is the project id
      treated as untrusted input or as a host-provided value? That sentence should match what the code
      actually does.
      **Left unticked on purpose:** `README.md` was rewritten recently and is outside this branch's
      lane. The decision and the exact wording to apply are in the fix's handoff for the coordinator to
      apply; the code already behaves as the sentence will say.

## Resolution

**Allowlist, not a denylist** — `safeProjectId` maps everything outside `[A-Za-z0-9_-]` to `_`, so `..`
and `.` are unrepresentable rather than rejected. A denylist would enumerate `.`, `..` and whatever a
later reader worried about; the allowlist leaves no character `join` can read as a separator or a parent
reference. A real host mints an opaque 32-char hex id (`ctx.location.project.id`), so this is the
identity on every id a normal host produces and no user's lease directory moves.

Both paths now go through one composer, `underLeaseBase`, which was the defect's real shape: the
sanitizer existed in **two copies** and both were wrong the same way. The composer checks its own
result on the **resolved** path — contained in the base *and* exactly one component below it, because
containment alone accepts `.` (it lands on the base root, which has no per-project directory at all).
A composition failing either check is recomposed from an escaped id (`..` → `_2e_2e_`) rather than
thrown: both callers run in `setup` before any work is decided, and a `throw` there breaks the session
(spec 002). The fallback is unreachable while the allowlist holds; it exists so widening the allowlist
cannot quietly reopen this.

Before → after (resolved, for both `leasePath` and `logPath`; base `<base>`):

| id | before | after |
| --- | --- | --- |
| `..` | `<parent-of-base>/writer.lock` — **outside** | `<base>/__/writer.lock` |
| `.` | `<base>/writer.lock` — the base root | `<base>/_/writer.lock` |
| `.hidden` | `<base>/.hidden/…` | `<base>/_hidden/…` |
| `proj-1.2_3` | `<base>/proj-1.2_3/…` | `<base>/proj-1_2_3/…` |
| `abc123`, and a real hex id | unchanged | unchanged |

`ensureLogDir`'s once-guard is keyed by the path, and a path is still a function of the id alone, so
the guard still collapses per project — asserted, because this fix *moves* the key for a traversing
id. A hostile id no longer makes `ensureLogDir` create a directory beside the base either; a test
asserts that on disk, not only on the string.

Tests: `323` (4 new, in their own `describe`, `test/index.test.ts`). The existing box-178 hostile-id
test was **not** weakened and **not** made false — one of its lines re-derived the sanitizer
(`join(base, hostile.replace(/[^A-Za-z0-9._-]/g, "_"))`), which is a tautology about spelling that
passed for the escaping form; it is now "exactly one component below the base", the same claim stated so
it cannot pass by agreeing with itself. That test is still green against the pre-fix code, which is
precisely why the defect survived: its id list has no dot id in it.

Mutation-checked: restoring the old class turns the allowlist assertion red; restoring the literal
pre-fix code (both denylist copies, no composer, no check) turns all four new tests red.

## Notes

Filed by the coordinator from the pin-twelve worker's report. It noticed this, wrote a test that
**deliberately does not assert the escaping form as if it were correct**, and escalated rather than
widening a src-excluded diff — which is the right call and is why this exists as an item.

Box 178 (Windows path behaviour) was platform-gated in the same area and left unverified on Linux; see
that box's note. Do not regress the hostile-id confinement test that already exists.
