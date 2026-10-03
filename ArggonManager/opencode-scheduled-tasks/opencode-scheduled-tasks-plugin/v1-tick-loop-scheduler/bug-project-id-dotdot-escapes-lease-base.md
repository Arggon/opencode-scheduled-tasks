---
type: bug
status: done
id: bug-project-id-dotdot-escapes-lease-base
title: "A project id of \"..\" composes outside the lease directory — the sanitizer keeps dots"
assignee: arggon
branch: fix/bug-project-id-dotdot-escapes-lease-base
parent: v1-tick-loop-scheduler
labels: []
priority: p2
created: "2026-10-03"
updated: "2026-10-03"
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
- [x] Decide and document the trust boundary in the README's threat-model section: is the project id
      treated as untrusted input or as a host-provided value? That sentence should match what the code
      actually does.
      **Left unticked on purpose:** `README.md` was rewritten recently and is outside this branch's
      lane. The decision and the exact wording to apply are in the fix's handoff for the coordinator to
      apply; the code already behaves as the sentence will say.
      **Applied by the coordinator** (README was out of the worker's lane). § Threat model now states
      the id is host-provided and not attacker-controlled, that it is still sanitised because a corrupt
      or hostile host value should not place a lockfile or log outside its directory, and that the
      sanitiser is an allowlist so `..` and `.` are unrepresentable rather than checked for - with the
      allowlist-is-the-identity argument and the fail-safe collision behaviour.

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

### handoff 2026-10-03 @ses_eff74efdaffezTu0PXysBLCQHu (session: ses_eff74efdaffezTu0PXysBLCQHu) — next: Code-review branch fix/bug-project-id-dotdot-escapes-lease-base (2 commits, src+test only), then apply the README threat-model sentence quoted in my comment and merge.
- branch: fix/bug-project-id-dotdot-escapes-lease-base
- open questions: README threat-model wording is in the comment for you to apply; keep the allowlist over a denylist.

### 2026-10-03 @ses_eff74efdaffezTu0PXysBLCQHu
## Fix report (worker)

Branch `fix/bug-project-id-dotdot-escapes-lease-base`, 2 commits, `src/index.ts` + `test/index.test.ts`
+ the item file only. README untouched (out of lane).

### Allowlist, and why not a denylist

`safeProjectId` maps everything outside `[A-Za-z0-9_-]` to `_`. `..` and `.` are then not
*rejected* — they are **unrepresentable**, because no character left in the alphabet means anything to
`join`. A denylist would have to enumerate `.`, `..` and whatever a later reader worried about, and
the denylist route also needs an error path through two call sites that both run in `setup`; a third
caller would forget it.

The id does not need `.`: a real host mints an opaque 32-char hex token
(`ctx.location.project.id`; the dirs under `~/.local/share/opencode/scheduled-tasks/` on this host are
exactly that), so the allowlist is the **identity** on every id a normal host produces — no lease
directory moves, no lockfile is stranded. Sanitisation is lossy and already was (`a/b` and `a?` have
always shared a directory); a collision is fail-safe — the loser meets a live foreign lease, logs why
and stays inert (ADR 0003).

The defect's real shape was **duplication**: two copies of the sanitizer, both wrong the same way. Both
callers now go through one composer, `underLeaseBase`.

### Before → after (resolved; identical for `leasePath` and `logPath`, leaf aside)

| id | before | after |
| --- | --- | --- |
| `..` | `<parent-of-base>/writer.lock` — **outside the base** | `<base>/__/writer.lock` |
| `.` | `<base>/writer.lock` — the base root, no project dir | `<base>/_/writer.lock` |
| `.hidden` | `<base>/.hidden/writer.lock` | `<base>/_hidden/writer.lock` |
| `proj-1.2_3` | `<base>/proj-1.2_3/writer.lock` | `<base>/proj-1_2_3/writer.lock` |
| `abc123`, `a/b`, `../../etc`, real hex ids | already correct | unchanged |

### How the containment assertion works

`underLeaseBase` checks its **own composed result on the resolved absolute path**, with two conditions:
`isInsideBase(root, composed)` **and** `dirname(dirname(composed)) === root`. Asserting the joined
string could not work: `join` collapses `..` *before* a caller can inspect it, so the joined form of a
traversing path already reads as a finished, normalised path — `join(base, "..", "writer.lock")` **is**
`<parent>/writer.lock`. Comparing one `join` against another (what box 178's old line did) compares the
defect against itself. Containment is a question about the base, so it needs a resolved comparison.

The second condition is not redundancy: `.` does **not** escape — `isInsideBase` accepts it, because it
lands *on* the base root. Only "exactly one component below the base" rejects it. A composition failing
either check is recomposed from an escaped id (`..` → `_2e_2e_`) rather than thrown, because both
callers run in `setup` before any work is decided and a `throw` there breaks the session (spec 002). The
fallback is unreachable while the allowlist holds; it is there so widening the allowlist cannot quietly
reopen this. Lexical, not `realpath`: the base need not exist yet.

### The existing hostile-id test

Not weakened, not made false — **one line did need changing**. `expect(dirname(lock)).toBe(join(base,
hostile.replace(/[^A-Za-z0-9._-]/g, "_")))` re-derived the sanitizer inside the test, so it asserted
agreement with a second copy of the bug. It is now `dirname(dirname(lock)) === resolve(base)` — the same
claim (exactly one component, directly under the base) stated so it cannot pass by agreeing with itself.
Every other expectation is untouched and still green.

### `ensureLogDir`'s path-keyed once-guard

Checked, not assumed: the path is still a pure function of the id (no clock, no counter), so repeated
calls key identically and the guard still says "once" per project; distinct ids still key distinctly, so
one unwritable project cannot silence another's report. What *did* change is the key for a traversing id —
it now points inside the base rather than beside it, which is the fix. The on-disk consequence is
asserted too: with the base never created, `ensureLogDir(logPath(dir, ".."))` creates the base and its
child and **nothing beside the base** (before: it created the parent and stopped there).

### Mutation results

| mutation | red |
| --- | --- |
| restore the class to `[^A-Za-z0-9._-]` (keep composer+check) | 1 test — the allowlist assertion. The composer's check absorbs the escape, which is the second layer working |
| restore the literal pre-fix code (both denylist copies, no composer, no check) | **all 4** new tests; the box-178 test stays green, which is why the defect survived — its id list has no dot id |

### Gates

`npx tsc --noEmit` exit 0 · `npx vitest run` **323 tests, 322 pass, 1 win32-gated skip, finishes in ~36s** ·
`npx tsx harness/smoke.ts` PASS · `arggon validate` ok (0 warnings, v5) · `arggon spec analyze` clean.
Baseline was 319 (318 + 1 skip): +4 tests.

### README wording to apply (trust-boundary box — left unticked, reason on the item)

Add to the threat-model section:

> The plugin treats the host-provided project id as **host-provided, not attacker-controlled**: OpenCode
> derives it from the project itself, so a third party cannot choose it. It still sanitises it to a
> single path component under its data directory, because a corrupt or hostile host value should not be
> able to place a lockfile or a log outside the directory meant to hold them — the same reason a
> half-written id is never trusted to be well-formed.

If you would rather not concede the trust, the equivalent honest sentence is: "the project id is
**untrusted input**; `leasePath` and `logPath` reduce it to one dotless component and verify the composed
path resolves inside the data directory." The code supports both readings; it is defensive either way.
