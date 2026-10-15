// arggon:generated template="zcode/arggon/hooks/gate.mjs"
/**
 * ArggonManager gate hooks for the ZCode plugin seam (ADR 0014,
 * task-zcode-plugin-seam). Zero dependencies (node: stdlib only), one file,
 * three modes passed as argv[2]:
 *
 *   pre  — PreToolUse: global git gates (never `git push --force`, never
 *          `git commit --no-verify`) for every session, plus the
 *          dispatch-scoped reviewer backstop (below).
 *   post — PostToolUse: closes a reviewer dispatch's backstop window.
 *   stop — Stop: clears the session's reviewer state (belt and braces for a
 *          dispatch that never returned).
 *
 * Reviewer backstop: ZCode hook input carries `session_id` + `tool_input` but
 * no agent identity, and ZCode has no per-agent permission DSL — so the gate
 * marks the session when a subagent dispatch names the plugin's standards
 * reviewer (`arggon-standards-reviewer`, optionally plugin-qualified — pinned
 * to the shipped id by cli/src/init-zcode.test.ts, which reads the id out of
 * `templates/docs/zcode/arggon/agents/` and asserts this matcher matches it)
 * and, while the dispatch is
 * in flight (PreToolUse(Agent) → PostToolUse(Agent)), denies for that session:
 * Write/Edit, mutating `arggon` shell invocations, git history commands, and
 * the mutating `mcp__arggon__*` tools. The reviewer keeps the read tools and
 * `arggon_comment` (the verdict channel).
 *
 * State is a small JSON counter under the OS temp dir keyed by a hash of the
 * project dir + session id — never inside the repo, never a tracker file.
 *
 * Failure posture (deliberate): an unparseable or empty hook payload is
 * fail-open (exit 0) — this gate is defense-in-depth behind the kernel
 * invariants (no reopen, no steal), and deny-on-bad-payload would brick every
 * gated tool on one malformed event. The marker counter is lock-free
 * last-writer-wins: two truly-parallel dispatch hooks can lose an increment,
 * worst case the window closes one dispatch early — bounded by the
 * session-scoped key and the 2h TTL. If the client skips PostToolUse(Agent)
 * for an errored dispatch, Stop (or the TTL) clears the marker; whether that
 * skip happens at all is on the live-client checklist.
 *
 * Deny-pattern scope (bug-gate-deny-pattern-matches-quoted-text-blocking-
 * benign-writes), decided: the shell gates match the command's WORDS, not its
 * quoted arguments. Text inside single or double quotes is documentation —
 * the payload of an `arggon comment` documenting a probe, a commit message
 * citing a denied form — and a deny pattern occurring only inside such a span
 * denies nothing (the old whole-string scan denied exactly those benign
 * writes, and this repo's methodology tells agents to document gate
 * behavior). Quoted text the shell will still EXECUTE is never exempted: a
 * span that is the command payload of a sh-family shell — wherever the
 * shell sits, wrapper prefixes included (`sudo sh -c "…"`,
 * `ls | xargs sh -c '…'`), the payload flag in combined short form included
 * (`bash -lc "…"`, `sh -ec '…'` — any final flag word containing `c`) — or
 * the argument of `eval`, a span carrying a command
 * substitution (`$( … )` or backticks — the substituted text runs), and the
 * tail of an unterminated quote all stay in the scan. The shell test accepts
 * fail-closed OVER-denial of inert look-alikes (`echo sh -c "…"` is denied).
 * Recorded residual, accepted for this gate's accidental-use threat model:
 * variable indirection is NOT caught — `X='<denied form>'; $X` keeps the
 * assignment value exempt (inert text at scan time) while the unquoted
 * expansion executes later; this gate is not a shell parser, and the old
 * whole-string regex was equally evadable (e.g. a split flag like `--for"ce"`).
 * Real invocations are unquoted at their head, so the deny matrix (force
 * push, --no-verify, refspec-plus) is unchanged. Concretely: the gates run
 * against `scanText` below, which blanks inert quoted spans
 * (length-preserving) and keeps everything else verbatim.
 *
 * Output contract: exit 0 = allow (silent), exit 2 = deny (stderr is the
 * reason the client shows), anything else = hook error.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const MODE = process.argv[2];
const STATE_DIR = join(tmpdir(), "arggon-zcode-hooks");
/** A dispatch that never returned must not pin the session forever. */
const MARKER_TTL_MS = 2 * 60 * 60 * 1000;

/** The mutating MCP tools; `arggon_comment` stays allowed (verdict channel). */
const MUTATING_MCP_TOOLS = new Set([
  "mcp__arggon__arggon_create",
  "mcp__arggon__arggon_update",
  "mcp__arggon__arggon_start",
  "mcp__arggon__arggon_branch",
  "mcp__arggon__arggon_cleanup",
  "mcp__arggon__arggon_priority",
  "mcp__arggon__arggon_sync",
  "mcp__arggon__arggon_import_issues",
]);

/**
 * Shell subcommands that mutate the tracker or the history, matched as words
 * anywhere in the command (covers `arggon update …`, `npm run arggon -- …`,
 * `npx arggon-manager update …`, and the dist bin directly).
 */
const MUTATING_ARGGON_WORDS =
  /\b(?:arggon|arggon-manager)\s+(?:--?[a-z-]+\s+)*(?:update|create|branch|start|cleanup|priority|sync|import-issues|migrate)\b/;

/** Git history mutations the reviewer never runs (W4 reviewer shell gates). */
const REVIEWER_SHELL_GATES = [
  { re: /\bgit\b[^;&|]*\spush\b/, why: "git push" },
  { re: /\bgit\b[^;&|]*\scommit\b/, why: "git commit" },
  { re: /\bgit\b[^;&|]*\smerge\b/, why: "git merge" },
  { re: /\bgit\b[^;&|]*\srebase\b/, why: "git rebase" },
];

/** Global gates: every session, every mode of work (W4 seam defaults). */
const GLOBAL_SHELL_GATES = [
  {
    re: /\bgit\b[^;&|]*\spush\b(?=[^;&|]*\s(?:--force\b|-f[a-z]*|\+\S))/,
    why: "force push (git push --force / -f<letters>, incl. -fu / refspec-plus +ref)",
  },
  { re: /\bgit\b[^;&|]*\scommit\b[^;&|]*--no-verify\b/, why: "git commit --no-verify" },
];

function deny(why) {
  process.stderr.write(`arggon gate: denied — ${why}\n`);
  process.exit(2);
}

function allow() {
  process.exit(0);
}

function readInput() {
  const raw = readFileSync(0, "utf8");
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

/** Project dir: ZCode injects it as an env var; fall back to the cwd. */
function projectDir(input) {
  return (
    process.env.ZCODE_PROJECT_DIR ??
    process.env.CLAUDE_PROJECT_DIR ??
    (typeof input.cwd === "string" && input.cwd) ??
    process.cwd()
  );
}

function statePath(input) {
  const key = createHash("sha256")
    .update(`${projectDir(input)}\n${String(input.session_id ?? "")}`)
    .digest("hex")
    .slice(0, 24);
  return join(STATE_DIR, `${key}.json`);
}

function readMarker(input) {
  try {
    const parsed = JSON.parse(readFileSync(statePath(input), "utf8"));
    if (typeof parsed.count !== "number" || typeof parsed.ts !== "number") return 0;
    if (Date.now() - parsed.ts > MARKER_TTL_MS) return 0;
    return Math.max(0, parsed.count);
  } catch {
    return 0;
  }
}

function writeMarker(input, count) {
  mkdirSync(STATE_DIR, { recursive: true });
  if (count <= 0) {
    rmSync(statePath(input), { force: true });
    return;
  }
  writeFileSync(statePath(input), JSON.stringify({ count, ts: Date.now() }), "utf8");
}

function reviewerActive(input) {
  return readMarker(input) > 0;
}

/** True for the plugin's standards-reviewer agent id, plain or plugin-qualified. */
function isReviewerDispatch(input) {
  const type = input?.tool_input?.subagent_type;
  return typeof type === "string" && /(^|:)arggon-standards-reviewer$/.test(type);
}

function bashCommand(input) {
  const command = input?.tool_input?.command;
  return typeof command === "string" ? command : "";
}

/**
 * [start, end) spans of shell-quoted text in `command`: single- and
 * double-quoted regions, honoring backslash escapes outside quotes and inside
 * double quotes (none inside single quotes, per POSIX). An unterminated quote
 * yields NO span for its tail, so that text stays in the scan (fail-closed).
 */
function quotedSpans(command) {
  const spans = [];
  let quote = null;
  let start = -1;
  for (let i = 0; i < command.length; i++) {
    const ch = command[i];
    if (quote !== null) {
      if (ch === quote) {
        spans.push([start, i + 1]);
        quote = null;
      } else if (quote === '"' && ch === "\\") {
        i++;
      }
    } else if (ch === "\\") {
      i++;
    } else if (ch === "'" || ch === '"') {
      quote = ch;
      start = i;
    }
  }
  return spans;
}

/**
 * True when the quoted span [start, end) will still be EXECUTED rather than
 * printed or stored: it is the command payload of a sh-family shell —
 * wherever that shell sits in the command, wrapper prefixes included
 * (`sh -c "…"`, `sudo sh -c "…"`, `ls | xargs sh -c '…'`), the payload flag
 * in combined short form included (`bash -lc "…"`, `sh -ec '…'`: the final
 * flag word only needs to CONTAIN `c` — requiring exactly `-c` let `-lc` /
 * `-ec` payloads blank as inert and run, a deny→allow regression the R2
 * standards review probed) — or the argument of `eval`, or it carries a
 * command substitution (`$( … )` / backticks — the substituted text runs).
 * A gate match inside such a span is a real invocation and must still deny
 * (the reviewer backstop relies on `sh -c "arggon update …"` staying
 * denied, wrappers and all). The shell test is deliberately UNANCHORED in
 * the head, so inert look-alikes are over-denied fail-closed (`echo sh -c
 * "…"`); and this is deliberately NOT a shell parser: a quoted assignment
 * value that a later unquoted `$var` expansion runs (`X='…'; $X`) is inert
 * at scan time and stays exempt — a recorded residual, see "Deny-pattern
 * scope" in the header.
 */
function quotedSpanExecutes(command, start, end) {
  if (/\$\(|`/.test(command.slice(start, end))) return true;
  const head = command.slice(0, start);
  return /\S*sh\s+(?:-\S+\s+)*-\S*c\S*\s*$/.test(head) || /\beval\s+$/.test(head);
}

/**
 * The command with inert quoted spans blanked (same length, spaces in place,
 * so nothing shifts): the text the shell gates scan. Quoted spans that still
 * execute and unterminated quote tails are kept verbatim — see
 * "Deny-pattern scope" in the header.
 */
function scanText(command) {
  let out = command;
  for (const [start, end] of quotedSpans(command).reverse()) {
    if (quotedSpanExecutes(command, start, end)) continue;
    out = out.slice(0, start) + " ".repeat(end - start) + out.slice(end);
  }
  return out;
}

function pre(input) {
  const tool = typeof input.tool_name === "string" ? input.tool_name : "";
  if (tool === "Agent") {
    if (isReviewerDispatch(input)) {
      writeMarker(input, readMarker(input) + 1);
    }
    allow();
  }
  if (tool === "Bash") {
    // Scan the command's words, not its quoted arguments (see "Deny-pattern
    // scope" in the header): inert quoted text is blanked before matching.
    const scanned = scanText(bashCommand(input));
    for (const gate of GLOBAL_SHELL_GATES) {
      if (gate.re.test(scanned)) deny(`${gate.why} is denied by the arggon plugin gate`);
    }
    if (reviewerActive(input)) {
      if (MUTATING_ARGGON_WORDS.test(scanned)) {
        deny(
          "a reviewer dispatch is in flight — tracker mutations are denied (post the verdict with arggon_comment)",
        );
      }
      for (const gate of REVIEWER_SHELL_GATES) {
        if (gate.re.test(scanned)) deny(`reviewer dispatch in flight — ${gate.why} is denied`);
      }
    }
    allow();
  }
  if (tool === "Write" || tool === "Edit") {
    if (reviewerActive(input)) {
      deny("a reviewer dispatch is in flight — the reviewer is read-only");
    }
    allow();
  }
  if (MUTATING_MCP_TOOLS.has(tool)) {
    if (reviewerActive(input)) {
      deny(
        `a reviewer dispatch is in flight — ${tool} is denied (read with arggon_show, post the verdict with arggon_comment)`,
      );
    }
    allow();
  }
  allow();
}

function post(input) {
  if (input.tool_name === "Agent" && isReviewerDispatch(input)) {
    writeMarker(input, readMarker(input) - 1);
  }
  process.exit(0);
}

function stop(input) {
  writeMarker(input, 0);
  process.exit(0);
}

if (MODE === "pre") pre(readInput());
else if (MODE === "post") post(readInput());
else if (MODE === "stop") stop(readInput());
else {
  process.stderr.write("arggon gate: mode required (pre | post | stop)\n");
  process.exit(1);
}
