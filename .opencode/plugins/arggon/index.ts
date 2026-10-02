// arggon:generated template="opencode/plugins/arggon/index.bundle.ts"
// ArggonManager plugin bundle — GENERATED, do not edit, do not vendor by hand.
// Build: npm run build:plugin (opencode/plugins/arggon/index.ts graph + @arggondev/lib inlined).
// OpenCode V2 loads the vendored copy at .opencode/plugins/arggon/index.ts.
import { createRequire as __arggonCreateRequire } from "node:module"

const __arggonNodeRequire = __arggonCreateRequire(import.meta.url)
const __arggonModules = new Map()
const __arggonCache = new Map()
const __arggonEdges = new Map()
__arggonEdges.set("lib/src/comment.ts\u0000./atomic.js", "lib/src/atomic.ts")
__arggonEdges.set("lib/src/comment.ts\u0000./dates.js", "lib/src/dates.ts")
__arggonEdges.set("lib/src/comment.ts\u0000./frontmatter.js", "lib/src/frontmatter.ts")
__arggonEdges.set("lib/src/comment.ts\u0000./items.js", "lib/src/items.ts")
__arggonEdges.set("lib/src/comment.ts\u0000./list.js", "lib/src/list.ts")
__arggonEdges.set("lib/src/comment.ts\u0000./lock.js", "lib/src/lock.ts")
__arggonEdges.set("lib/src/comment.ts\u0000./paths.js", "lib/src/paths.ts")
__arggonEdges.set("lib/src/comment.ts\u0000./tracker-commit.js", "lib/src/tracker-commit.ts")
__arggonEdges.set("lib/src/contract.ts\u0000./json.js", "lib/src/json.ts")
__arggonEdges.set("lib/src/convention.ts\u0000./ids.js", "lib/src/ids.ts")
__arggonEdges.set("lib/src/convention.ts\u0000./paths.js", "lib/src/paths.ts")
__arggonEdges.set("lib/src/create.ts\u0000./atomic.js", "lib/src/atomic.ts")
__arggonEdges.set("lib/src/create.ts\u0000./dates.js", "lib/src/dates.ts")
__arggonEdges.set("lib/src/create.ts\u0000./frontmatter.js", "lib/src/frontmatter.ts")
__arggonEdges.set("lib/src/create.ts\u0000./ids.js", "lib/src/ids.ts")
__arggonEdges.set("lib/src/create.ts\u0000./items.js", "lib/src/items.ts")
__arggonEdges.set("lib/src/create.ts\u0000./paths.js", "lib/src/paths.ts")
__arggonEdges.set("lib/src/create.ts\u0000./priority.js", "lib/src/priority.ts")
__arggonEdges.set("lib/src/create.ts\u0000./relations.js", "lib/src/relations.ts")
__arggonEdges.set("lib/src/create.ts\u0000./status.js", "lib/src/status.ts")
__arggonEdges.set("lib/src/create.ts\u0000./tracker-commit.js", "lib/src/tracker-commit.ts")
__arggonEdges.set("lib/src/get-open-prs.ts\u0000./detect-repo.js", "lib/src/detect-repo.ts")
__arggonEdges.set("lib/src/handoff.ts\u0000./comment.js", "lib/src/comment.ts")
__arggonEdges.set("lib/src/import-issues.ts\u0000./convention.js", "lib/src/convention.ts")
__arggonEdges.set("lib/src/import-issues.ts\u0000./create.js", "lib/src/create.ts")
__arggonEdges.set("lib/src/import-issues.ts\u0000./get-open-prs.js", "lib/src/get-open-prs.ts")
__arggonEdges.set("lib/src/import-issues.ts\u0000./ids.js", "lib/src/ids.ts")
__arggonEdges.set("lib/src/import-issues.ts\u0000./items.js", "lib/src/items.ts")
__arggonEdges.set("lib/src/import-issues.ts\u0000./paths.js", "lib/src/paths.ts")
__arggonEdges.set("lib/src/import-issues.ts\u0000./tracker-commit.js", "lib/src/tracker-commit.ts")
__arggonEdges.set("lib/src/import-issues.ts\u0000./update.js", "lib/src/update.ts")
__arggonEdges.set("lib/src/index.ts\u0000./atomic.js", "lib/src/atomic.ts")
__arggonEdges.set("lib/src/index.ts\u0000./cleanup.js", "lib/src/cleanup.ts")
__arggonEdges.set("lib/src/index.ts\u0000./comment.js", "lib/src/comment.ts")
__arggonEdges.set("lib/src/index.ts\u0000./contract.js", "lib/src/contract.ts")
__arggonEdges.set("lib/src/index.ts\u0000./convention.js", "lib/src/convention.ts")
__arggonEdges.set("lib/src/index.ts\u0000./create.js", "lib/src/create.ts")
__arggonEdges.set("lib/src/index.ts\u0000./dates.js", "lib/src/dates.ts")
__arggonEdges.set("lib/src/index.ts\u0000./filter.js", "lib/src/filter.ts")
__arggonEdges.set("lib/src/index.ts\u0000./frontmatter.js", "lib/src/frontmatter.ts")
__arggonEdges.set("lib/src/index.ts\u0000./get-open-prs.js", "lib/src/get-open-prs.ts")
__arggonEdges.set("lib/src/index.ts\u0000./handoff.js", "lib/src/handoff.ts")
__arggonEdges.set("lib/src/index.ts\u0000./ids.js", "lib/src/ids.ts")
__arggonEdges.set("lib/src/index.ts\u0000./import-issues.js", "lib/src/import-issues.ts")
__arggonEdges.set("lib/src/index.ts\u0000./items.js", "lib/src/items.ts")
__arggonEdges.set("lib/src/index.ts\u0000./json.js", "lib/src/json.ts")
__arggonEdges.set("lib/src/index.ts\u0000./list.js", "lib/src/list.ts")
__arggonEdges.set("lib/src/index.ts\u0000./lock.js", "lib/src/lock.ts")
__arggonEdges.set("lib/src/index.ts\u0000./next.js", "lib/src/next.ts")
__arggonEdges.set("lib/src/index.ts\u0000./operations.js", "lib/src/operations.ts")
__arggonEdges.set("lib/src/index.ts\u0000./paths.js", "lib/src/paths.ts")
__arggonEdges.set("lib/src/index.ts\u0000./priority.js", "lib/src/priority.ts")
__arggonEdges.set("lib/src/index.ts\u0000./relations.js", "lib/src/relations.ts")
__arggonEdges.set("lib/src/index.ts\u0000./report.js", "lib/src/report.ts")
__arggonEdges.set("lib/src/index.ts\u0000./rules.js", "lib/src/rules.ts")
__arggonEdges.set("lib/src/index.ts\u0000./sanitize.js", "lib/src/sanitize.ts")
__arggonEdges.set("lib/src/index.ts\u0000./show.js", "lib/src/show.ts")
__arggonEdges.set("lib/src/index.ts\u0000./status.js", "lib/src/status.ts")
__arggonEdges.set("lib/src/index.ts\u0000./sync-command.js", "lib/src/sync-command.ts")
__arggonEdges.set("lib/src/index.ts\u0000./tracker-commit.js", "lib/src/tracker-commit.ts")
__arggonEdges.set("lib/src/index.ts\u0000./trend.js", "lib/src/trend.ts")
__arggonEdges.set("lib/src/index.ts\u0000./update.js", "lib/src/update.ts")
__arggonEdges.set("lib/src/index.ts\u0000./validate.js", "lib/src/validate.ts")
__arggonEdges.set("lib/src/index.ts\u0000./verdict.js", "lib/src/verdict.ts")
__arggonEdges.set("lib/src/index.ts\u0000./view-model.js", "lib/src/view-model.ts")
__arggonEdges.set("lib/src/index.ts\u0000./worktree.js", "lib/src/worktree.ts")
__arggonEdges.set("lib/src/issue-roundtrip.ts\u0000./detect-repo.js", "lib/src/detect-repo.ts")
__arggonEdges.set("lib/src/items.ts\u0000./frontmatter.js", "lib/src/frontmatter.ts")
__arggonEdges.set("lib/src/items.ts\u0000./ids.js", "lib/src/ids.ts")
__arggonEdges.set("lib/src/items.ts\u0000./paths.js", "lib/src/paths.ts")
__arggonEdges.set("lib/src/items.ts\u0000./status.js", "lib/src/status.ts")
__arggonEdges.set("lib/src/json.ts\u0000./convention.js", "lib/src/convention.ts")
__arggonEdges.set("lib/src/list.ts\u0000./convention.js", "lib/src/convention.ts")
__arggonEdges.set("lib/src/list.ts\u0000./filter.js", "lib/src/filter.ts")
__arggonEdges.set("lib/src/list.ts\u0000./ids.js", "lib/src/ids.ts")
__arggonEdges.set("lib/src/list.ts\u0000./items.js", "lib/src/items.ts")
__arggonEdges.set("lib/src/list.ts\u0000./paths.js", "lib/src/paths.ts")
__arggonEdges.set("lib/src/list.ts\u0000./priority.js", "lib/src/priority.ts")
__arggonEdges.set("lib/src/list.ts\u0000./sanitize.js", "lib/src/sanitize.ts")
__arggonEdges.set("lib/src/list.ts\u0000./status.js", "lib/src/status.ts")
__arggonEdges.set("lib/src/next.ts\u0000./filter.js", "lib/src/filter.ts")
__arggonEdges.set("lib/src/next.ts\u0000./items.js", "lib/src/items.ts")
__arggonEdges.set("lib/src/next.ts\u0000./paths.js", "lib/src/paths.ts")
__arggonEdges.set("lib/src/next.ts\u0000./priority.js", "lib/src/priority.ts")
__arggonEdges.set("lib/src/next.ts\u0000./status.js", "lib/src/status.ts")
__arggonEdges.set("lib/src/operations.ts\u0000./comment.js", "lib/src/comment.ts")
__arggonEdges.set("lib/src/operations.ts\u0000./contract.js", "lib/src/contract.ts")
__arggonEdges.set("lib/src/operations.ts\u0000./convention.js", "lib/src/convention.ts")
__arggonEdges.set("lib/src/operations.ts\u0000./create.js", "lib/src/create.ts")
__arggonEdges.set("lib/src/operations.ts\u0000./handoff.js", "lib/src/handoff.ts")
__arggonEdges.set("lib/src/operations.ts\u0000./import-issues.js", "lib/src/import-issues.ts")
__arggonEdges.set("lib/src/operations.ts\u0000./json.js", "lib/src/json.ts")
__arggonEdges.set("lib/src/operations.ts\u0000./list.js", "lib/src/list.ts")
__arggonEdges.set("lib/src/operations.ts\u0000./next.js", "lib/src/next.ts")
__arggonEdges.set("lib/src/operations.ts\u0000./priority.js", "lib/src/priority.ts")
__arggonEdges.set("lib/src/operations.ts\u0000./report.js", "lib/src/report.ts")
__arggonEdges.set("lib/src/operations.ts\u0000./show.js", "lib/src/show.ts")
__arggonEdges.set("lib/src/operations.ts\u0000./sync-command.js", "lib/src/sync-command.ts")
__arggonEdges.set("lib/src/operations.ts\u0000./tracker-commit.js", "lib/src/tracker-commit.ts")
__arggonEdges.set("lib/src/operations.ts\u0000./trend.js", "lib/src/trend.ts")
__arggonEdges.set("lib/src/operations.ts\u0000./update.js", "lib/src/update.ts")
__arggonEdges.set("lib/src/operations.ts\u0000./validate.js", "lib/src/validate.ts")
__arggonEdges.set("lib/src/priority.ts\u0000./atomic.js", "lib/src/atomic.ts")
__arggonEdges.set("lib/src/priority.ts\u0000./dates.js", "lib/src/dates.ts")
__arggonEdges.set("lib/src/priority.ts\u0000./frontmatter.js", "lib/src/frontmatter.ts")
__arggonEdges.set("lib/src/priority.ts\u0000./items.js", "lib/src/items.ts")
__arggonEdges.set("lib/src/priority.ts\u0000./paths.js", "lib/src/paths.ts")
__arggonEdges.set("lib/src/report.ts\u0000./items.js", "lib/src/items.ts")
__arggonEdges.set("lib/src/report.ts\u0000./paths.js", "lib/src/paths.ts")
__arggonEdges.set("lib/src/report.ts\u0000./sanitize.js", "lib/src/sanitize.ts")
__arggonEdges.set("lib/src/report.ts\u0000./status.js", "lib/src/status.ts")
__arggonEdges.set("lib/src/rules.ts\u0000./status.js", "lib/src/status.ts")
__arggonEdges.set("lib/src/show.ts\u0000./items.js", "lib/src/items.ts")
__arggonEdges.set("lib/src/show.ts\u0000./paths.js", "lib/src/paths.ts")
__arggonEdges.set("lib/src/show.ts\u0000./sanitize.js", "lib/src/sanitize.ts")
__arggonEdges.set("lib/src/sync-command.ts\u0000./get-open-prs.js", "lib/src/get-open-prs.ts")
__arggonEdges.set("lib/src/sync-command.ts\u0000./items.js", "lib/src/items.ts")
__arggonEdges.set("lib/src/sync-command.ts\u0000./paths.js", "lib/src/paths.ts")
__arggonEdges.set("lib/src/sync-command.ts\u0000./sync-types.js", "lib/src/sync-types.ts")
__arggonEdges.set("lib/src/sync-command.ts\u0000./update.js", "lib/src/update.ts")
__arggonEdges.set("lib/src/sync-command.ts\u0000./verdict.js", "lib/src/verdict.ts")
__arggonEdges.set("lib/src/tracker-commit.ts\u0000./convention.js", "lib/src/convention.ts")
__arggonEdges.set("lib/src/tracker-commit.ts\u0000./lock.js", "lib/src/lock.ts")
__arggonEdges.set("lib/src/tracker-commit.ts\u0000./sanitize.js", "lib/src/sanitize.ts")
__arggonEdges.set("lib/src/trend.ts\u0000./items.js", "lib/src/items.ts")
__arggonEdges.set("lib/src/trend.ts\u0000./paths.js", "lib/src/paths.ts")
__arggonEdges.set("lib/src/update.ts\u0000./atomic.js", "lib/src/atomic.ts")
__arggonEdges.set("lib/src/update.ts\u0000./convention.js", "lib/src/convention.ts")
__arggonEdges.set("lib/src/update.ts\u0000./dates.js", "lib/src/dates.ts")
__arggonEdges.set("lib/src/update.ts\u0000./frontmatter.js", "lib/src/frontmatter.ts")
__arggonEdges.set("lib/src/update.ts\u0000./ids.js", "lib/src/ids.ts")
__arggonEdges.set("lib/src/update.ts\u0000./issue-roundtrip.js", "lib/src/issue-roundtrip.ts")
__arggonEdges.set("lib/src/update.ts\u0000./items.js", "lib/src/items.ts")
__arggonEdges.set("lib/src/update.ts\u0000./lock.js", "lib/src/lock.ts")
__arggonEdges.set("lib/src/update.ts\u0000./paths.js", "lib/src/paths.ts")
__arggonEdges.set("lib/src/update.ts\u0000./priority.js", "lib/src/priority.ts")
__arggonEdges.set("lib/src/update.ts\u0000./relations.js", "lib/src/relations.ts")
__arggonEdges.set("lib/src/update.ts\u0000./rules.js", "lib/src/rules.ts")
__arggonEdges.set("lib/src/update.ts\u0000./sanitize.js", "lib/src/sanitize.ts")
__arggonEdges.set("lib/src/update.ts\u0000./status.js", "lib/src/status.ts")
__arggonEdges.set("lib/src/update.ts\u0000./tracker-commit.js", "lib/src/tracker-commit.ts")
__arggonEdges.set("lib/src/validate.ts\u0000./convention.js", "lib/src/convention.ts")
__arggonEdges.set("lib/src/validate.ts\u0000./ids.js", "lib/src/ids.ts")
__arggonEdges.set("lib/src/validate.ts\u0000./items.js", "lib/src/items.ts")
__arggonEdges.set("lib/src/validate.ts\u0000./paths.js", "lib/src/paths.ts")
__arggonEdges.set("lib/src/validate.ts\u0000./priority.js", "lib/src/priority.ts")
__arggonEdges.set("lib/src/validate.ts\u0000./relations.js", "lib/src/relations.ts")
__arggonEdges.set("lib/src/validate.ts\u0000./sanitize.js", "lib/src/sanitize.ts")
__arggonEdges.set("lib/src/validate.ts\u0000./status.js", "lib/src/status.ts")
__arggonEdges.set("lib/src/view-model.ts\u0000./filter.js", "lib/src/filter.ts")
__arggonEdges.set("lib/src/view-model.ts\u0000./ids.js", "lib/src/ids.ts")
__arggonEdges.set("lib/src/view-model.ts\u0000./next.js", "lib/src/next.ts")
__arggonEdges.set("lib/src/view-model.ts\u0000./priority.js", "lib/src/priority.ts")
__arggonEdges.set("lib/src/view-model.ts\u0000./status.js", "lib/src/status.ts")
__arggonEdges.set("opencode/plugins/arggon/board.ts\u0000@arggondev/lib", "lib/src/index.ts")
__arggonEdges.set("opencode/plugins/arggon/index.ts\u0000./board.js", "opencode/plugins/arggon/board.ts")
__arggonEdges.set("opencode/plugins/arggon/index.ts\u0000@arggondev/lib", "lib/src/index.ts")

function __arggonRequire(id, from) {
  const resolved = from === undefined ? id : (__arggonEdges.get(from + "\u0000" + id) ?? id)
  if (!__arggonModules.has(resolved)) return __arggonNodeRequire(resolved)
  const cached = __arggonCache.get(resolved)
  if (cached !== undefined) return cached.exports
  const module = { exports: {} }
  __arggonCache.set(resolved, module)
  __arggonModules.get(resolved)(module.exports, (child) => __arggonRequire(child, resolved), module)
  return module.exports
}

__arggonModules.set("lib/src/atomic.ts", (exports, require, module) => {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeFileAtomic = writeFileAtomic;
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
function writeFileAtomic(path, content) {
    const tmpPath = (0, node_path_1.join)((0, node_path_1.dirname)(path), `.${(0, node_crypto_1.randomBytes)(6).toString("hex")}.tmp-${process.pid}`);
    try {
        const mode = existingTargetMode(path);
        (0, node_fs_1.writeFileSync)(tmpPath, content, "utf8");
        if (mode !== null)
            (0, node_fs_1.chmodSync)(tmpPath, mode);
        const tmpStat = (0, node_fs_1.statSync)(tmpPath);
        (0, node_fs_1.renameSync)(tmpPath, path);
        verifyOnDisk(path, tmpStat, Buffer.byteLength(content, "utf8"));
    }
    catch (err) {
        try {
            (0, node_fs_1.unlinkSync)(tmpPath);
        }
        catch {
        }
        throw err;
    }
}
function existingTargetMode(path) {
    try {
        return (0, node_fs_1.statSync)(path).mode & 0o7777;
    }
    catch {
        return null;
    }
}
function verifyOnDisk(path, tmpStat, expected) {
    let written;
    try {
        written = (0, node_fs_1.statSync)(path);
    }
    catch (err) {
        if (err.code === "ENOENT")
            return;
        throw err;
    }
    if (written.size === expected)
        return;
    const ours = tmpStat.ino !== 0 && written.ino === tmpStat.ino && written.dev === tmpStat.dev;
    if (!ours)
        return;
    throw new Error(`shrink guard: wrote ${expected} bytes but ${path} has ${written.size} bytes on disk — ` +
        `refusing to leave a truncated doc`);
}
})

__arggonModules.set("lib/src/cleanup.ts", (exports, require, module) => {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLEANUP_TERMINAL_STATUSES = void 0;
exports.defaultCleanupGit = defaultCleanupGit;
exports.findMergedPr = findMergedPr;
exports.classifyCleanupEntry = classifyCleanupEntry;
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
exports.CLEANUP_TERMINAL_STATUSES = new Set(["done", "cancelled"]);
const defaultExecGh = (file, args, options) => (0, node_child_process_1.execFileSync)(file, args, options);
function git(args, cwd) {
    try {
        return (0, node_child_process_1.execFileSync)("git", args, {
            encoding: "utf8",
            cwd,
            stdio: ["ignore", "pipe", "pipe"],
        }).trim();
    }
    catch (err) {
        const stderr = err !== null && typeof err === "object" && "stderr" in err ? String(err.stderr).trim() : "";
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`git ${args.join(" ")} failed${stderr ? `: ${stderr}` : ` (${message})`}`);
    }
}
function defaultCleanupGit() {
    return {
        isRepo(cwd) {
            try {
                (0, node_child_process_1.execFileSync)("git", ["rev-parse", "--git-dir"], {
                    encoding: "utf8",
                    cwd,
                    stdio: ["ignore", "pipe", "ignore"],
                });
                return true;
            }
            catch {
                return false;
            }
        },
        worktreeList(cwd) {
            const out = git(["worktree", "list", "--porcelain"], cwd);
            return out
                .split("\n")
                .filter((line) => line.startsWith("worktree "))
                .map((line) => line.slice("worktree ".length).trim())
                .filter((path) => path.length > 0);
        },
        defaultBranch(cwd) {
            try {
                const ref = git(["symbolic-ref", "--short", "refs/remotes/origin/HEAD"], cwd);
                if (ref)
                    return ref;
            }
            catch {
            }
            for (const name of ["main", "master"]) {
                try {
                    git(["show-ref", "--verify", "--quiet", `refs/heads/${name}`], cwd);
                    return name;
                }
                catch {
                }
            }
            throw new Error("could not detect the default branch (no origin/HEAD, main, or master); " +
                "run `git remote set-head origin -a` or create the base branch first");
        },
        isAncestor(cwd, branch, base) {
            try {
                git(["merge-base", "--is-ancestor", branch, base], cwd);
                return true;
            }
            catch {
                return false;
            }
        },
        remoteBranchExists(cwd, branch) {
            try {
                git(["show-ref", "--verify", "--quiet", `refs/remotes/origin/${branch}`], cwd);
                return true;
            }
            catch {
                return false;
            }
        },
        removeWorktree(cwd, path) {
            git(["worktree", "remove", path], cwd);
        },
        deleteBranch(cwd, branch) {
            git(["branch", "-d", branch], cwd);
        },
        deleteBranchForce(cwd, branch) {
            git(["branch", "-D", branch], cwd);
        },
        branchExists(cwd, name) {
            try {
                git(["show-ref", "--verify", "--quiet", `refs/heads/${name}`], cwd);
                return true;
            }
            catch {
                return false;
            }
        },
    };
}
function findMergedPr(branch, cwd, execGh = defaultExecGh) {
    let out;
    try {
        const runOpts = {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
            timeout: 30_000,
            cwd,
        };
        out = execGh("gh", [
            "pr",
            "list",
            "--state",
            "merged",
            "--head",
            branch,
            "--json",
            "number,url,mergedAt",
            "--limit",
            "5",
        ], runOpts);
    }
    catch (err) {
        if (err !== null &&
            typeof err === "object" &&
            "code" in err &&
            (err.code === "ENOENT" || err.code === -2)) {
            throw new Error("gh not found (install gh and run `gh auth login`)");
        }
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`gh pr list failed (${message}; check \`gh auth status\`)`);
    }
    try {
        const data = JSON.parse(out);
        if (!Array.isArray(data))
            throw new Error("not an array");
        for (const pr of data) {
            if (typeof pr.number === "number") {
                return {
                    number: pr.number,
                    url: typeof pr.url === "string" ? pr.url : "",
                    mergedAt: typeof pr.mergedAt === "string" ? pr.mergedAt : null,
                };
            }
        }
        return null;
    }
    catch {
        throw new Error("gh pr list returned unparseable JSON (check `gh auth status`)");
    }
}
function classifyCleanupEntry(item, root, base, gitRunner, deps = {}) {
    const path = item.worktreePath ? (0, node_path_1.resolve)(item.worktreePath) : "";
    const entry = {
        id: item.id,
        status: item.status,
        branch: item.branch ?? null,
        path,
        removable: false,
        reason: null,
        action: null,
    };
    if (!exports.CLEANUP_TERMINAL_STATUSES.has(item.status)) {
        entry.reason = `item is ${item.status} (only done/cancelled items are pruned)`;
        return entry;
    }
    if (!item.branch) {
        entry.reason = "no branch recorded (cannot verify it is merged)";
        return entry;
    }
    if (!gitRunner.isAncestor(root, item.branch, base)) {
        if (deps.noGh) {
            entry.reason = `branch '${item.branch}' is not fully merged into '${base}'`;
            return entry;
        }
        try {
            const pr = findMergedPr(item.branch, root, deps.gh);
            if (!pr) {
                entry.reason = "branch not merged and no merged PR found";
                return entry;
            }
            entry.via = `squash-merged PR #${pr.number}`;
        }
        catch {
            entry.reason = "ancestry check failed and gh is unavailable to check for squash-merged PRs";
            return entry;
        }
    }
    if (entry.via === undefined &&
        gitRunner.remoteBranchExists(root, item.branch) &&
        !gitRunner.isAncestor(root, `origin/${item.branch}`, base)) {
        entry.reason =
            `remote branch divergent or behind (origin/${item.branch}) — ` +
                `push or delete the remote branch first`;
        return entry;
    }
    if (!(0, node_fs_1.existsSync)(path)) {
        entry.action = "clear stale worktree_path record (path missing on disk)";
    }
    else if (!gitRunner
        .worktreeList(root)
        .map((p) => (0, node_path_1.resolve)(p))
        .includes(path)) {
        entry.reason = "path exists but is not a git worktree of this repo (remove it manually)";
        return entry;
    }
    else {
        entry.action = "remove worktree and delete the merged branch";
    }
    entry.removable = true;
    return entry;
}
})

__arggonModules.set("lib/src/comment.ts", (exports, require, module) => {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runComment = runComment;
const node_fs_1 = require("node:fs");
const atomic_js_1 = require("./atomic.js");
const frontmatter_js_1 = require("./frontmatter.js");
const dates_js_1 = require("./dates.js");
const items_js_1 = require("./items.js");
const lock_js_1 = require("./lock.js");
const paths_js_1 = require("./paths.js");
const list_js_1 = require("./list.js");
const tracker_commit_js_1 = require("./tracker-commit.js");
function runComment(opts) {
    const id = opts.id.trim();
    if (!id)
        throw new Error("id is required");
    if (opts.file !== undefined && opts.text.trim() !== "") {
        throw new Error("pass either the comment text or --file <path>, not both");
    }
    const source = opts.file !== undefined ? readCommentSource(opts.file) : opts.text;
    const text = source.replace(/\r\n/g, "\n").replace(/\s+$/g, "").replace(/^\n+/, "");
    if (!text.trim()) {
        throw new Error("comment text must not be empty");
    }
    const tasksDir = (0, paths_js_1.findTasksDir)(opts.cwd);
    const item = locateItem(tasksDir, id);
    const author = opts.author?.trim() || resolveAuthor(opts);
    if (!author) {
        throw new Error(authorGapMessage(opts));
    }
    const now = opts.now ?? new Date();
    const date = (0, dates_js_1.formatDate)(now);
    const lines = text.split("\n");
    const heading = opts.heading ? opts.heading(date, author) : `### ${date} @${author}`;
    let filePath = item.filePath;
    (0, lock_js_1.withItemLock)(item.filePath, () => {
        const fresh = (0, items_js_1.itemsById)((0, items_js_1.loadItems)(tasksDir)).get(id);
        if (!fresh) {
            throw new Error(`id '${id}' not found under the tracker`);
        }
        filePath = fresh.filePath;
        const base = fresh.body.endsWith("\n") || fresh.body.length === 0 ? fresh.body : `${fresh.body}\n`;
        const newBody = `${base}\n${heading}\n${lines.join("\n")}\n`;
        (0, atomic_js_1.writeFileAtomic)(fresh.filePath, (0, frontmatter_js_1.stringifyFrontmatter)(fresh.data, newBody));
    });
    const root = (0, paths_js_1.repoRootFromTasks)(tasksDir);
    const commit = (0, tracker_commit_js_1.commitTrackerMutation)(root, [filePath], {
        message: (0, tracker_commit_js_1.trackerCommitMessage)("commented", [id]),
        commit: (0, tracker_commit_js_1.resolveAutoCommit)(opts.commit, (0, tracker_commit_js_1.readAutoCommitConfig)(root)),
    });
    return {
        id,
        path: filePath,
        root,
        comment: { author, date, lines },
        commit,
    };
}
const LOCATE_ATTEMPTS = 5;
const LOCATE_RETRY_MS = 20;
function locateItem(tasksDir, id) {
    for (let attempt = 1;; attempt++) {
        const item = (0, items_js_1.itemsById)((0, items_js_1.loadItems)(tasksDir)).get(id);
        if (item)
            return item;
        if (attempt >= LOCATE_ATTEMPTS) {
            throw new Error(`id '${id}' not found under the tracker`);
        }
        sleepSync(LOCATE_RETRY_MS);
    }
}
function sleepSync(ms) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}
function resolveAuthor(opts) {
    if (opts.resolveMe)
        return opts.resolveMe();
    return (0, list_js_1.resolveCurrentLogin)(opts.env ?? process.env);
}
function authorGapMessage(opts) {
    const remedies = "pass --author <login>, or set GITHUB_USER or GITHUB_ACTOR, or authenticate gh: gh api user";
    if (opts.resolveMe) {
        return `could not resolve comment author: no author source available (GITHUB_USER / GITHUB_ACTOR unset, gh unavailable or unauthenticated, no local git identity) (${remedies})`;
    }
    const resolution = (0, list_js_1.resolveCurrentLoginDetailed)(opts.env ?? process.env);
    const cause = "gap" in resolution && resolution.gap === "gh-not-found"
        ? "'gh' not found on PATH (no GITHUB_USER or GITHUB_ACTOR set, no local git identity)"
        : "gh is not authenticated ('gh api user' failed; no GITHUB_USER or GITHUB_ACTOR set, no local git identity)";
    return `could not resolve comment author: ${cause} (${remedies})`;
}
function readCommentSource(file) {
    if (file === "-") {
        try {
            return (0, node_fs_1.readFileSync)(0, "utf8");
        }
        catch {
            throw new Error("--file -: could not read stdin (pipe the comment text in)");
        }
    }
    try {
        return (0, node_fs_1.readFileSync)(file, "utf8");
    }
    catch (err) {
        const code = err?.code;
        const codeText = typeof code === "string" ? code : "unknown";
        if (codeText === "ENOENT") {
            throw new Error(`--file '${file}': file not found (pass a readable UTF-8 file, or - for stdin)`);
        }
        if (codeText === "EISDIR") {
            throw new Error(`--file '${file}': is a directory (pass a UTF-8 file, or - for stdin)`);
        }
        throw new Error(`--file '${file}': could not read file (${codeText})`);
    }
}
})

__arggonModules.set("lib/src/contract.ts", (exports, require, module) => {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toContractWorkItem = toContractWorkItem;
const node_path_1 = require("node:path");
const json_js_1 = require("./json.js");
function toContractWorkItem(item, rootDir, opts = {}) {
    const full = {
        id: item.id,
        type: item.type,
        status: item.status,
        title: item.title ?? null,
        assignee: item.assignee ?? null,
        branch: item.branch ?? null,
        parent: item.parent ?? null,
        labels: [...item.labels],
        priority: item.priority ?? null,
        created: item.created ?? null,
        updated: item.updated ?? null,
        path: (0, node_path_1.relative)(rootDir, item.filePath).split(node_path_1.sep).join("/"),
        blocked_reason: item.blockedReason ?? null,
        milestone: item.milestone ?? null,
        depends_on: [...item.dependsOn],
        claimed_at: item.claimedAt ?? null,
        worktree_path: item.worktreePath ?? null,
        issue: item.issue ?? null,
    };
    return opts.full === false ? (0, json_js_1.compactWorkItem)(full) : full;
}
})

__arggonModules.set("lib/src/convention.ts", (exports, require, module) => {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_BRANCH_PATTERNS = exports.CONVENTION_VERSION_DEFAULT = exports.CONVENTION_VERSION = void 0;
exports.readConventionVersion = readConventionVersion;
exports.parseConventionConfig = parseConventionConfig;
exports.readConventionConfig = readConventionConfig;
exports.readGeneratedState = readGeneratedState;
exports.readGeneratedProjectName = readGeneratedProjectName;
exports.parseGeneratedProjectName = parseGeneratedProjectName;
exports.serializeGeneratedSection = serializeGeneratedSection;
exports.updateGeneratedSection = updateGeneratedSection;
exports.resolveBranchName = resolveBranchName;
const node_fs_1 = require("node:fs");
const ids_js_1 = require("./ids.js");
const paths_js_1 = require("./paths.js");
exports.CONVENTION_VERSION = 5;
exports.CONVENTION_VERSION_DEFAULT = 0;
function readConventionVersion(dir) {
    const path = (0, paths_js_1.conventionPathForRoot)(dir);
    if (!(0, node_fs_1.existsSync)(path))
        return exports.CONVENTION_VERSION_DEFAULT;
    try {
        const raw = (0, node_fs_1.readFileSync)(path, "utf8");
        const match = raw.match(/^version\s*:\s*(\d+)/m);
        if (!match)
            return exports.CONVENTION_VERSION_DEFAULT;
        const parsed = Number.parseInt(match[1] ?? "", 10);
        return Number.isFinite(parsed) ? parsed : exports.CONVENTION_VERSION_DEFAULT;
    }
    catch {
        return exports.CONVENTION_VERSION_DEFAULT;
    }
}
exports.DEFAULT_BRANCH_PATTERNS = {
    initiative: "feat/{id}",
    epic: "feat/{id}",
    story: "feat/{id}",
    task: "feat/{id}",
    bug: "fix/{id}",
};
const DOUBLE_QUOTED_ESCAPES = {
    "0": "\0",
    a: "\x07",
    b: "\b",
    t: "\t",
    n: "\n",
    v: "\v",
    f: "\f",
    r: "\r",
    e: "\x1b",
    " ": " ",
    '"': '"',
    "/": "/",
    "\\": "\\",
    N: "\u0085",
    _: "\u00a0",
    L: "\u2028",
    P: "\u2029",
};
function unescapeDoubleQuoted(raw) {
    let out = "";
    for (let i = 0; i < raw.length; i++) {
        const ch = raw[i];
        if (ch !== "\\") {
            out += ch;
            continue;
        }
        const next = raw[i + 1];
        if (next === undefined) {
            out += ch;
            break;
        }
        if (next === "x" || next === "u" || next === "U") {
            const width = next === "x" ? 2 : next === "u" ? 4 : 8;
            const hex = raw.slice(i + 2, i + 2 + width);
            if (hex.length === width && /^[0-9a-fA-F]+$/.test(hex)) {
                const code = Number.parseInt(hex, 16);
                try {
                    out += String.fromCodePoint(code);
                    i += 1 + width;
                    continue;
                }
                catch {
                }
            }
            out += ch + next;
            i += 1;
            continue;
        }
        const mapped = DOUBLE_QUOTED_ESCAPES[next];
        if (mapped !== undefined) {
            out += mapped;
            i += 1;
            continue;
        }
        out += ch + next;
        i += 1;
    }
    return out;
}
function stripQuotes(value) {
    if (value.startsWith('"') && value.endsWith('"')) {
        return unescapeDoubleQuoted(value.slice(1, -1));
    }
    if (value.startsWith("'") && value.endsWith("'")) {
        return value.slice(1, -1).replaceAll("''", "'");
    }
    return value;
}
function parseConventionConfig(raw, sourcePath = `${paths_js_1.TRACKER_DIR_NAME}/.convention.yml`) {
    const branchPatterns = { ...exports.DEFAULT_BRANCH_PATTERNS };
    const views = {};
    const playbooks = { maxAgeDays: null };
    const tracker = {
        autoCommit: null,
        allowSteal: null,
        strictGateBins: null,
        strictWorktreeWrites: null,
    };
    const generated = {};
    let generatedProjectName = null;
    const importLabelTypes = {};
    let importHasLabelTypes = false;
    const worktree = {
        postStart: null,
        postStartShell: null,
        env: null,
        services: null,
    };
    const github = { issueRoundtrip: false };
    let version = exports.CONVENTION_VERSION_DEFAULT;
    let section = null;
    let generatedDest = null;
    let importOption = null;
    for (const line of raw.split(/\r?\n/)) {
        if (!line.trim() || line.trimStart().startsWith("#"))
            continue;
        const indent = line.length - line.trimStart().length;
        const idx = line.indexOf(":");
        if (idx === -1) {
            throw new Error(`${sourcePath}: invalid line ${JSON.stringify(line)}`);
        }
        const key = line.slice(0, idx).trim();
        const value = line.slice(idx + 1).trim();
        if (indent === 0) {
            section = null;
            generatedDest = null;
            importOption = null;
            if (key === "version") {
                const parsed = Number.parseInt(value, 10);
                if (Number.isFinite(parsed))
                    version = parsed;
            }
            else if (key === "branch_patterns") {
                if (value !== "") {
                    throw new Error(`${sourcePath}: 'branch_patterns' must be a mapping, one type per line`);
                }
                section = "branch_patterns";
            }
            else if (key === "x-views") {
                if (value !== "") {
                    throw new Error(`${sourcePath}: 'x-views' must be a mapping, one view per line`);
                }
                section = "x-views";
            }
            else if (key === "x-playbooks") {
                if (value !== "") {
                    throw new Error(`${sourcePath}: 'x-playbooks' must be a mapping, one option per line`);
                }
                section = "x-playbooks";
            }
            else if (key === "x-tracker") {
                if (value !== "") {
                    throw new Error(`${sourcePath}: 'x-tracker' must be a mapping, one option per line`);
                }
                section = "x-tracker";
            }
            else if (key === "x-import") {
                if (value !== "") {
                    throw new Error(`${sourcePath}: 'x-import' must be a mapping, one option per line`);
                }
                section = "x-import";
            }
            else if (key === "x-worktree") {
                if (value !== "") {
                    throw new Error(`${sourcePath}: 'x-worktree' must be a mapping, one option per line`);
                }
                section = "x-worktree";
            }
            else if (key === "x-github") {
                if (value !== "") {
                    throw new Error(`${sourcePath}: 'x-github' must be a mapping, one option per line`);
                }
                section = "x-github";
            }
            else if (key === "x-generated") {
                if (value !== "") {
                    throw new Error(`${sourcePath}: 'x-generated' must be a mapping, one destination per line`);
                }
                section = "x-generated";
            }
            continue;
        }
        if (section === "x-generated") {
            if (indent <= 2) {
                if (key === "projectName") {
                    generatedProjectName = stripQuotes(value) || null;
                    continue;
                }
                const dest = stripQuotes(key);
                generatedDest = dest !== "" ? dest : null;
                if (generatedDest !== null && !(generatedDest in generated)) {
                    generated[generatedDest] = {
                        template: "",
                        checksum: "",
                        arggonVersion: "",
                        generatedAt: "",
                    };
                }
                continue;
            }
            if (generatedDest === null)
                continue;
            const entry = generated[generatedDest];
            if (key === "template")
                entry.template = stripQuotes(value);
            else if (key === "checksum")
                entry.checksum = stripQuotes(value);
            else if (key === "arggonVersion")
                entry.arggonVersion = stripQuotes(value);
            else if (key === "generatedAt")
                entry.generatedAt = stripQuotes(value);
            else if (key === "acknowledged")
                entry.acknowledged = value === "true";
            continue;
        }
        if (section === "x-playbooks") {
            if (key !== "max-age-days")
                continue;
            if (!/^\d+$/.test(value) || Number.parseInt(value, 10) <= 0) {
                throw new Error(`${sourcePath}: 'max-age-days' must be a positive integer (got ${JSON.stringify(value)})`);
            }
            playbooks.maxAgeDays = Number.parseInt(value, 10);
            continue;
        }
        if (section === "x-tracker") {
            if (key === "allow-steal") {
                if (value !== "true" && value !== "false") {
                    throw new Error(`${sourcePath}: 'allow-steal' must be a boolean (got ${JSON.stringify(value)})`);
                }
                tracker.allowSteal = value === "true";
                continue;
            }
            if (key === "strict-gate-bins") {
                if (value !== "true" && value !== "false") {
                    throw new Error(`${sourcePath}: 'strict-gate-bins' must be a boolean (got ${JSON.stringify(value)})`);
                }
                tracker.strictGateBins = value === "true";
                continue;
            }
            if (key === "strict-worktree-writes") {
                if (value !== "true" && value !== "false") {
                    throw new Error(`${sourcePath}: 'strict-worktree-writes' must be a boolean (got ${JSON.stringify(value)})`);
                }
                tracker.strictWorktreeWrites = value === "true";
                continue;
            }
            if (key !== "auto-commit")
                continue;
            if (value !== "true" && value !== "false") {
                throw new Error(`${sourcePath}: 'auto-commit' must be a boolean (got ${JSON.stringify(value)})`);
            }
            tracker.autoCommit = value === "true";
            continue;
        }
        if (section === "x-import") {
            if (indent <= 2) {
                importOption = key === "label-types" ? "label-types" : null;
                if (importOption !== null) {
                    importHasLabelTypes = true;
                    if (value !== "") {
                        throw new Error(`${sourcePath}: 'label-types' must be a mapping, one label per line`);
                    }
                }
                continue;
            }
            if (importOption !== "label-types")
                continue;
            const label = stripQuotes(key);
            if (!label) {
                throw new Error(`${sourcePath}: invalid x-import entry ${JSON.stringify(line)}`);
            }
            if (label in importLabelTypes) {
                throw new Error(`${sourcePath}: duplicate label '${label}' in x-import.label-types`);
            }
            const mapped = stripQuotes(value);
            if (!(0, ids_js_1.isItemType)(mapped)) {
                throw new Error(`${sourcePath}: 'label-types' values must be work-item types ` +
                    `(initiative | epic | story | task | bug), got ${JSON.stringify(value)} for label '${label}'`);
            }
            importLabelTypes[label] = mapped;
            importHasLabelTypes = true;
            continue;
        }
        if (section === "x-worktree") {
            if (key === "post-start-shell") {
                const shell = stripQuotes(value);
                if (shell !== "inherit" && shell !== "login") {
                    throw new Error(`${sourcePath}: 'post-start-shell' must be "inherit" or "login" (got ${JSON.stringify(value)})`);
                }
                worktree.postStartShell = shell;
                continue;
            }
            if (key === "env") {
                if (value !== "true" && value !== "false") {
                    throw new Error(`${sourcePath}: 'env' must be a boolean (got ${JSON.stringify(value)})`);
                }
                worktree.env = value === "true";
                continue;
            }
            if (key === "services") {
                if (value === "true") {
                    worktree.services = "true";
                    continue;
                }
                if (value === "false") {
                    worktree.services = null;
                    continue;
                }
                const base = stripQuotes(value);
                if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(base)) {
                    throw new Error(`${sourcePath}: 'services' must be true, false, or a Compose project base name ` +
                        `([A-Za-z0-9][A-Za-z0-9_-]*, got ${JSON.stringify(value)})`);
                }
                worktree.services = base;
                continue;
            }
            if (key !== "post-start")
                continue;
            const command = stripQuotes(value);
            if (!command) {
                throw new Error(`${sourcePath}: 'post-start' must be a non-empty string (got ${JSON.stringify(value)})`);
            }
            worktree.postStart = command;
            continue;
        }
        if (section === "x-github") {
            if (key !== "issue-roundtrip")
                continue;
            if (value !== "true" && value !== "false") {
                throw new Error(`${sourcePath}: 'issue-roundtrip' must be a boolean (got ${JSON.stringify(value)})`);
            }
            github.issueRoundtrip = value === "true";
            continue;
        }
        if (section === "x-views") {
            if (!key) {
                throw new Error(`${sourcePath}: invalid x-views entry ${JSON.stringify(line)}`);
            }
            if (key in views) {
                throw new Error(`${sourcePath}: duplicate view '${key}' in x-views`);
            }
            const expr = stripQuotes(value);
            if (!expr) {
                throw new Error(`${sourcePath}: empty expression for view '${key}'`);
            }
            views[key] = expr;
            continue;
        }
        if (section !== "branch_patterns")
            continue;
        if (!(0, ids_js_1.isItemType)(key)) {
            throw new Error(`${sourcePath}: unknown type '${key}' in branch_patterns (expected: initiative | epic | story | task | bug)`);
        }
        const pattern = stripQuotes(value);
        if (!pattern) {
            throw new Error(`${sourcePath}: empty pattern for type '${key}'`);
        }
        if (!pattern.includes("{id}")) {
            throw new Error(`${sourcePath}: pattern for type '${key}' must contain an {id} placeholder (got ${JSON.stringify(pattern)})`);
        }
        branchPatterns[key] = pattern;
    }
    return {
        version,
        branchPatterns,
        views,
        playbooks,
        tracker,
        import: { labelTypes: importHasLabelTypes ? importLabelTypes : null },
        worktree,
        github,
        generated,
        generatedProjectName,
    };
}
function readConventionConfig(dir) {
    const path = (0, paths_js_1.conventionPathForRoot)(dir);
    if (!(0, node_fs_1.existsSync)(path)) {
        return {
            version: exports.CONVENTION_VERSION_DEFAULT,
            branchPatterns: { ...exports.DEFAULT_BRANCH_PATTERNS },
            views: {},
            playbooks: { maxAgeDays: null },
            tracker: {
                autoCommit: null,
                allowSteal: null,
                strictGateBins: null,
                strictWorktreeWrites: null,
            },
            import: { labelTypes: null },
            worktree: { postStart: null, postStartShell: null, env: null, services: null },
            github: { issueRoundtrip: false },
            generated: {},
            generatedProjectName: null,
        };
    }
    return parseConventionConfig((0, node_fs_1.readFileSync)(path, "utf8"), path);
}
function readGeneratedState(dir) {
    const path = (0, paths_js_1.conventionPathForRoot)(dir);
    if (!(0, node_fs_1.existsSync)(path))
        return {};
    try {
        return parseConventionConfig((0, node_fs_1.readFileSync)(path, "utf8"), path).generated;
    }
    catch {
        return {};
    }
}
function readGeneratedProjectName(dir) {
    const path = (0, paths_js_1.conventionPathForRoot)(dir);
    if (!(0, node_fs_1.existsSync)(path))
        return null;
    try {
        return parseConventionConfig((0, node_fs_1.readFileSync)(path, "utf8"), path).generatedProjectName;
    }
    catch {
        return null;
    }
}
function parseGeneratedProjectName(raw) {
    try {
        return parseConventionConfig(raw).generatedProjectName;
    }
    catch {
        return null;
    }
}
function yamlQuote(value) {
    return JSON.stringify(value)
        .replaceAll("\u007f", "\\x7F")
        .replaceAll("\u2028", "\\L")
        .replaceAll("\u2029", "\\P");
}
function yamlKey(key) {
    return /^[A-Za-z0-9._/-]+$/.test(key) ? key : yamlQuote(key);
}
function serializeGeneratedSection(entries, projectName = null) {
    const dests = Object.keys(entries).sort();
    if (dests.length === 0 && projectName === null)
        return [];
    const lines = ["x-generated:"];
    if (projectName !== null)
        lines.push(`  projectName: ${yamlQuote(projectName)}`);
    for (const dest of dests) {
        const entry = entries[dest];
        lines.push(`  ${yamlKey(dest)}:`);
        lines.push(`    template: ${yamlQuote(entry.template)}`);
        lines.push(`    checksum: ${yamlQuote(entry.checksum)}`);
        lines.push(`    arggonVersion: ${yamlQuote(entry.arggonVersion)}`);
        lines.push(`    generatedAt: ${yamlQuote(entry.generatedAt)}`);
        if (entry.acknowledged)
            lines.push(`    acknowledged: true`);
    }
    return lines;
}
function updateGeneratedSection(raw, entries, projectName) {
    const lines = raw.split(/\r?\n/);
    const start = lines.findIndex((line) => /^x-generated:\s*$/.test(line));
    if (start !== -1) {
        let end = start + 1;
        while (end < lines.length &&
            (lines[end] === "" || lines[end].length - lines[end].trimStart().length > 0)) {
            end++;
        }
        lines.splice(start, end - start);
    }
    while (lines.length > 0 && lines[lines.length - 1] === "")
        lines.pop();
    const section = serializeGeneratedSection(entries, projectName ?? null);
    if (section.length === 0) {
        return lines.length > 0 ? `${lines.join("\n")}\n` : "";
    }
    if (lines.length > 0)
        lines.push("");
    return `${[...lines, ...section].join("\n")}\n`;
}
function resolveBranchName(pattern, item) {
    return pattern.replaceAll("{id}", item.id).replaceAll("{type}", item.type);
}
})

__arggonModules.set("lib/src/create.ts", (exports, require, module) => {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCreate = runCreate;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const atomic_js_1 = require("./atomic.js");
const frontmatter_js_1 = require("./frontmatter.js");
const ids_js_1 = require("./ids.js");
const items_js_1 = require("./items.js");
const priority_js_1 = require("./priority.js");
const paths_js_1 = require("./paths.js");
const relations_js_1 = require("./relations.js");
const status_js_1 = require("./status.js");
const dates_js_1 = require("./dates.js");
const tracker_commit_js_1 = require("./tracker-commit.js");
function runCreate(opts) {
    if (!(0, ids_js_1.isItemType)(opts.type)) {
        throw new Error(`Unknown type '${opts.type}'. Expected: initiative, epic, story, task, bug`);
    }
    const type = opts.type;
    const title = opts.title.trim();
    if (!title)
        throw new Error("title is required");
    const statusRaw = opts.status ?? "todo";
    (0, status_js_1.assertStatus)(statusRaw);
    const status = statusRaw;
    (0, status_js_1.assertCreatableStatus)(status);
    if (opts.assignee !== undefined)
        (0, status_js_1.assertAssignee)(opts.assignee);
    if (opts.labels !== undefined)
        (0, ids_js_1.assertLabels)(opts.labels);
    const priority = opts.priority?.trim() ? opts.priority.trim() : undefined;
    if (priority !== undefined)
        (0, priority_js_1.assertPriority)(priority);
    (0, status_js_1.assertClaimAndBlocked)({
        type,
        status,
        assignee: opts.assignee,
        blockedReason: opts.blockedReason,
    });
    const requiredParent = (0, relations_js_1.expectedParentType)(type);
    if (requiredParent === null) {
        if (opts.parent)
            throw new Error("initiative cannot have --parent");
    }
    else if (!opts.parent) {
        throw new Error(`${type} requires --parent <${requiredParent} id>`);
    }
    const tasksDir = (0, paths_js_1.findTasksDir)(opts.cwd);
    const byId = (0, items_js_1.itemsById)((0, items_js_1.loadItems)(tasksDir));
    const stem = opts.id ? opts.id.trim() : (0, ids_js_1.slugify)(title);
    if (!stem)
        throw new Error("id is required");
    const id = (0, ids_js_1.itemId)(type, stem);
    const existing = byId.get(id);
    if (existing) {
        throw new Error(`id '${id}' already exists at ${existing.filePath}`);
    }
    let parentItem;
    if (opts.parent) {
        parentItem = byId.get(opts.parent);
        if (!parentItem) {
            throw new Error(`parent '${opts.parent}' not found under the tracker`);
        }
        (0, relations_js_1.assertParentEdge)(type, parentItem.type);
    }
    const filePath = (0, paths_js_1.newItemPath)({
        tasksDir,
        type,
        id,
        parentContainerDir: parentItem?.containerDir,
    });
    if ((0, node_fs_1.existsSync)(filePath)) {
        throw new Error(`File already exists: ${filePath}`);
    }
    const today = (0, dates_js_1.formatDate)(opts.now ?? new Date());
    const templatePath = resolveTemplate(tasksDir, type, opts.templatesDir);
    const template = (0, node_fs_1.readFileSync)(templatePath, "utf8");
    const body = opts.body !== undefined
        ? opts.body
        : fillTemplateBody(stripFrontmatterBody(template), {
            type,
            id,
            title,
            parent: parentItem,
            byId,
        });
    const data = {
        type,
        status,
        id,
        title,
        labels: opts.labels ?? [],
        created: today,
        updated: today,
    };
    if (opts.assignee)
        data.assignee = opts.assignee;
    if (parentItem)
        data.parent = parentItem.id;
    if (priority !== undefined)
        data.priority = priority;
    if (opts.issue !== undefined) {
        if (!Number.isInteger(opts.issue) || opts.issue <= 0) {
            throw new Error("issue must be a positive integer (the GitHub issue number)");
        }
        data.issue = opts.issue;
    }
    if (status === "blocked" && opts.blockedReason) {
        data.blocked_reason = opts.blockedReason.trim();
    }
    (0, node_fs_1.mkdirSync)((0, node_path_1.dirname)(filePath), { recursive: true });
    (0, atomic_js_1.writeFileAtomic)(filePath, (0, frontmatter_js_1.stringifyFrontmatter)(data, body));
    const created = (0, items_js_1.tryLoadItem)(filePath);
    if (!created) {
        throw new Error(`Created item is unreadable: ${filePath}`);
    }
    const root = (0, paths_js_1.repoRootFromTasks)(tasksDir);
    const commit = (0, tracker_commit_js_1.commitTrackerMutation)(root, [filePath], {
        message: (0, tracker_commit_js_1.trackerCommitMessage)("created", [id]),
        commit: (0, tracker_commit_js_1.resolveAutoCommit)(opts.commit, (0, tracker_commit_js_1.readAutoCommitConfig)(root)),
    });
    return { id, path: filePath, root, item: created, commit };
}
function resolveTemplate(tasksDir, type, templatesDir) {
    const name = `${type}.md`;
    const local = (0, node_path_1.join)((0, paths_js_1.repoRootFromTasks)(tasksDir), "templates", name);
    if ((0, node_fs_1.existsSync)(local))
        return local;
    if (templatesDir !== undefined) {
        const bundled = (0, node_path_1.join)(templatesDir, name);
        if ((0, node_fs_1.existsSync)(bundled))
            return bundled;
    }
    throw new Error(`Template not found: ${name}`);
}
function stripFrontmatterBody(raw) {
    const end = raw.indexOf("\n---", 3);
    if (end === -1)
        return raw;
    let body = raw.slice(end + 4);
    if (body.startsWith("\n"))
        body = body.slice(1);
    return body;
}
function fillTemplateBody(body, ctx) {
    const tokens = {
        title: ctx.title,
        id: ctx.id,
        "inner-slug": (0, ids_js_1.innerSlug)(ctx.id),
    };
    if (ctx.parent) {
        if (ctx.type === "epic")
            tokens["initiative-id"] = ctx.parent.id;
        if (ctx.type === "story") {
            tokens["epic-id"] = ctx.parent.id;
            if (ctx.parent.parent)
                tokens["initiative-id"] = ctx.parent.parent;
        }
        if (ctx.type === "task" || ctx.type === "bug") {
            tokens["story-id"] = ctx.parent.id;
            const epic = ctx.parent.parent ? ctx.byId.get(ctx.parent.parent) : undefined;
            if (epic) {
                tokens["epic-id"] = epic.id;
                if (epic.parent)
                    tokens["initiative-id"] = epic.parent;
            }
        }
    }
    let out = body;
    out = out.replaceAll("task-<inner-slug>", ctx.type === "task" ? ctx.id : "task-<inner-slug>");
    out = out.replaceAll("bug-<inner-slug>", ctx.type === "bug" ? ctx.id : "bug-<inner-slug>");
    const keys = Object.keys(tokens).sort((a, b) => b.length - a.length);
    for (const key of keys) {
        out = out.replaceAll(`<${key}>`, tokens[key]);
    }
    return out;
}
})

__arggonModules.set("lib/src/dates.ts", (exports, require, module) => {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDate = formatDate;
exports.formatDateTime = formatDateTime;
function formatDate(d) {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}
function formatDateTime(d) {
    return d.toISOString();
}
})

__arggonModules.set("lib/src/detect-repo.ts", (exports, require, module) => {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectRepo = detectRepo;
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const GITHUB_REMOTE_RE = /github\.com[:\/]([^/]+)\/([^/]+?)(\.git)?$/;
function defaultExecGit(file, args, options) {
    const opts = options ?? {};
    return (0, node_child_process_1.execFileSync)(file, args, {
        cwd: opts.cwd ?? process.cwd(),
        encoding: opts.encoding ?? "utf8",
        stdio: opts.stdio ?? ["ignore", "pipe", "ignore"],
        timeout: opts.timeout ?? 10_000,
    });
}
function detectRepo(cwd, execGit = defaultExecGit) {
    const repoRoot = findRepoRoot(cwd);
    if (!repoRoot)
        return null;
    const origin = getOriginRemote(repoRoot, execGit);
    if (!origin)
        return null;
    const match = GITHUB_REMOTE_RE.exec(origin);
    if (!match)
        return null;
    const [, owner, repo] = match;
    return { owner, repo };
}
function findRepoRoot(cwd) {
    let dir = (0, node_path_1.isAbsolute)(cwd) ? cwd : process.cwd();
    while (dir) {
        try {
            (0, node_fs_1.statSync)((0, node_path_1.join)(dir, ".git"));
            return dir;
        }
        catch {
        }
        const parent = (0, node_path_1.dirname)(dir);
        if (parent === dir)
            break;
        dir = parent;
    }
    return null;
}
function getOriginRemote(repoRoot, execGit) {
    try {
        const url = execGit("git", ["remote", "get-url", "origin"], {
            cwd: repoRoot,
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
            timeout: 10_000,
        });
        return url.trim() || null;
    }
    catch {
        return null;
    }
}
})

__arggonModules.set("lib/src/filter.ts", (exports, require, module) => {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FILTER_FIELDS = void 0;
exports.splitFilterTokens = splitFilterTokens;
exports.unquoteFilterValue = unquoteFilterValue;
exports.parseFilter = parseFilter;
exports.buildBlockedByIndex = buildBlockedByIndex;
exports.buildAncestorIndex = buildAncestorIndex;
exports.matchesPredicate = matchesPredicate;
exports.FILTER_FIELDS = [
    "status",
    "type",
    "assignee",
    "label",
    "parent",
    "depends-on",
    "blocked-by",
    "ancestor",
    "priority",
];
function isFilterField(field) {
    return exports.FILTER_FIELDS.includes(field);
}
function splitFilterTokens(expr) {
    const tokens = [];
    let current = "";
    let quote = null;
    for (const ch of expr) {
        if (quote) {
            current += ch;
            if (ch === quote)
                quote = null;
        }
        else if (ch === '"' || ch === "'") {
            quote = ch;
            current += ch;
        }
        else if (/\s/.test(ch)) {
            if (current) {
                tokens.push(current);
                current = "";
            }
        }
        else {
            current += ch;
        }
    }
    if (quote)
        throw new Error(`unterminated quote in filter expression: ${expr}`);
    if (current)
        tokens.push(current);
    return tokens;
}
function unquoteFilterValue(value, expr) {
    if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
        return value.slice(1, -1);
    }
    if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
        return value.slice(1, -1);
    }
    if (value.includes('"') || value.includes("'")) {
        throw new Error(`mismatched quotes in filter expression: ${expr}`);
    }
    return value;
}
function parseFilter(expr) {
    const tokens = splitFilterTokens(expr.trim());
    return tokens.map((token) => {
        let negated = false;
        let rest = token;
        if (rest.startsWith("!")) {
            negated = true;
            rest = rest.slice(1);
        }
        const colon = rest.indexOf(":");
        if (colon <= 0) {
            throw new Error(`bad filter token "${token}" (expected [!]field:value with field in ${exports.FILTER_FIELDS.join(", ")})`);
        }
        const field = rest.slice(0, colon);
        if (!isFilterField(field)) {
            throw new Error(`unknown filter field "${field}". Allowed: ${exports.FILTER_FIELDS.join(", ")}`);
        }
        const value = unquoteFilterValue(rest.slice(colon + 1), expr);
        if (!value)
            throw new Error(`empty value in filter token "${token}"`);
        return { field, value, negated };
    });
}
function buildBlockedByIndex(items) {
    const index = new Map();
    for (const item of items) {
        for (const depId of item.dependsOn ?? []) {
            const bucket = index.get(depId);
            if (bucket)
                bucket.push(item.id);
            else
                index.set(depId, [item.id]);
        }
    }
    return index;
}
function buildAncestorIndex(items) {
    const parentOf = new Map();
    for (const item of items) {
        if (item.id !== undefined && item.parent)
            parentOf.set(item.id, item.parent);
    }
    const index = new Map();
    for (const item of items) {
        if (item.id === undefined)
            continue;
        const chain = [];
        const visited = new Set([item.id]);
        let cur = parentOf.get(item.id);
        while (cur !== undefined && !visited.has(cur)) {
            chain.push(cur);
            visited.add(cur);
            cur = parentOf.get(cur);
        }
        index.set(item.id, chain);
    }
    return index;
}
function matchesPredicate(item, pred, blockedByIndex, ancestorIndex) {
    let hit;
    switch (pred.field) {
        case "status":
            hit = item.status === pred.value;
            break;
        case "type":
            hit = item.type === pred.value;
            break;
        case "assignee":
            hit = (item.assignee ?? null) === pred.value;
            break;
        case "label":
            hit = item.labels.includes(pred.value);
            break;
        case "parent":
            hit = (item.parent ?? null) === pred.value;
            break;
        case "depends-on":
            hit = (item.dependsOn ?? []).includes(pred.value);
            break;
        case "blocked-by":
            hit = (blockedByIndex?.get(pred.value) ?? []).includes(item.id ?? "");
            break;
        case "ancestor":
            hit = (ancestorIndex?.get(item.id ?? "") ?? []).includes(pred.value);
            break;
        case "priority":
            hit =
                pred.value === "none"
                    ? (item.priority ?? null) === null
                    : (item.priority ?? null) === pred.value;
            break;
    }
    return pred.negated ? !hit : hit;
}
})

__arggonModules.set("lib/src/frontmatter.ts", (exports, require, module) => {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseFrontmatter = parseFrontmatter;
exports.stringifyFrontmatter = stringifyFrontmatter;
exports.stringField = stringField;
exports.numberField = numberField;
exports.stringArrayField = stringArrayField;
const FENCE = "---";
function parseFrontmatter(raw) {
    const normalized = raw.replace(/^\uFEFF/, "");
    if (!normalized.startsWith(`${FENCE}\n`) && !normalized.startsWith(`${FENCE}\r\n`)) {
        throw new Error("missing YAML frontmatter (expected file to start with ---)");
    }
    const rest = normalized.slice(normalized.indexOf("\n") + 1);
    const endMatch = rest.match(/\r?\n---\r?\n?/);
    if (!endMatch || endMatch.index === undefined) {
        throw new Error("unterminated YAML frontmatter");
    }
    const yaml = rest.slice(0, endMatch.index);
    const body = rest.slice(endMatch.index + endMatch[0].length);
    const data = {};
    for (const line of yaml.split(/\r?\n/)) {
        if (!line.trim() || line.trimStart().startsWith("#"))
            continue;
        const idx = line.indexOf(":");
        if (idx === -1) {
            throw new Error(`invalid frontmatter line: ${JSON.stringify(line)}`);
        }
        const key = line.slice(0, idx).trim();
        const value = line.slice(idx + 1).trim();
        data[key] = parseValue(value);
    }
    return { data, body };
}
function parseValue(raw) {
    if (raw === "" || raw === "null" || raw === "~")
        return null;
    if (raw === "true")
        return true;
    if (raw === "false")
        return false;
    if (raw.startsWith("[") && raw.endsWith("]")) {
        const inner = raw.slice(1, -1).trim();
        if (!inner)
            return [];
        return inner.split(",").map((part) => parseScalar(part.trim()));
    }
    return parseScalar(raw);
}
function parseScalar(raw) {
    if (raw.startsWith('"') && raw.endsWith('"')) {
        return unescapeDoubleQuoted(raw.slice(1, -1));
    }
    if (raw.startsWith("'") && raw.endsWith("'")) {
        return raw.slice(1, -1).replaceAll("''", "'");
    }
    if (/^-?\d+$/.test(raw))
        return Number(raw);
    return raw;
}
const DOUBLE_QUOTED_ESCAPES = {
    "0": "\0",
    a: "\x07",
    b: "\b",
    t: "\t",
    n: "\n",
    v: "\v",
    f: "\f",
    r: "\r",
    e: "\x1b",
    " ": " ",
    '"': '"',
    "/": "/",
    "\\": "\\",
    N: "\u0085",
    _: "\u00a0",
    L: "\u2028",
    P: "\u2029",
};
function unescapeDoubleQuoted(raw) {
    let out = "";
    for (let i = 0; i < raw.length; i++) {
        const ch = raw[i];
        if (ch !== "\\") {
            out += ch;
            continue;
        }
        const next = raw[i + 1];
        if (next === undefined) {
            out += ch;
            break;
        }
        if (next === "x" || next === "u" || next === "U") {
            const width = next === "x" ? 2 : next === "u" ? 4 : 8;
            const hex = raw.slice(i + 2, i + 2 + width);
            if (hex.length === width && /^[0-9a-fA-F]+$/.test(hex)) {
                const code = Number.parseInt(hex, 16);
                try {
                    out += String.fromCodePoint(code);
                    i += 1 + width;
                    continue;
                }
                catch {
                }
            }
            out += ch + next;
            i += 1;
            continue;
        }
        const mapped = DOUBLE_QUOTED_ESCAPES[next];
        if (mapped !== undefined) {
            out += mapped;
            i += 1;
            continue;
        }
        out += ch + next;
        i += 1;
    }
    return out;
}
const OFFICIAL_ORDER = [
    "type",
    "status",
    "id",
    "title",
    "assignee",
    "branch",
    "parent",
    "labels",
    "priority",
    "created",
    "updated",
    "blocked_reason",
];
const OFFICIAL_KEYS = new Set(OFFICIAL_ORDER);
function stringifyFrontmatter(data, body) {
    const lines = [FENCE];
    const seen = new Set();
    for (const key of OFFICIAL_ORDER) {
        if (!(key in data) || data[key] === undefined)
            continue;
        if (key === "assignee" && (data[key] === null || data[key] === ""))
            continue;
        if (key === "branch" && (data[key] === null || data[key] === ""))
            continue;
        if (key === "parent" && data[key] === null)
            continue;
        if (key === "blocked_reason" && (data[key] === null || data[key] === ""))
            continue;
        lines.push(`${key}: ${formatValue(key, data[key])}`);
        seen.add(key);
    }
    const extras = Object.keys(data)
        .filter((k) => !seen.has(k) && !OFFICIAL_KEYS.has(k) && data[k] !== undefined)
        .sort();
    for (const key of extras) {
        lines.push(`${key}: ${formatValue(key, data[key])}`);
    }
    lines.push(FENCE);
    const bodyOut = body.startsWith("\n") || body.length === 0 ? body : `\n${body}`;
    return `${lines.join("\n")}${bodyOut.endsWith("\n") ? bodyOut : `${bodyOut}\n`}`;
}
function formatValue(key, value) {
    if (Array.isArray(value)) {
        if (value.length === 0)
            return "[]";
        return `[${value
            .map((v) => (typeof v === "number" ? String(v) : formatScalar(String(v), false)))
            .join(", ")}]`;
    }
    if (value === null)
        return "null";
    if (typeof value === "boolean")
        return value ? "true" : "false";
    if (typeof value === "number")
        return String(value);
    const text = String(value);
    const forceQuote = key === "created" || key === "updated" || /^\d{4}-\d{2}-\d{2}$/.test(text);
    return formatScalar(text, forceQuote);
}
const AMBIGUOUS_TOKEN = /^(?:~|null|true|false|-?\d+)$/;
function formatScalar(value, forceQuote) {
    if (forceQuote ||
        AMBIGUOUS_TOKEN.test(value) ||
        /[\u0000-\u001f\u007f\u2028\u2029]|[:#{}[\],&*?!'"\\]|^\s|\s$|^$/.test(value)) {
        return JSON.stringify(value)
            .replaceAll("\u007f", "\\x7F")
            .replaceAll("\u2028", "\\L")
            .replaceAll("\u2029", "\\P");
    }
    return value;
}
function stringField(data, key) {
    const v = data[key];
    if (v === undefined || v === null)
        return undefined;
    return String(v);
}
function numberField(data, key) {
    const v = data[key];
    if (v === undefined || v === null)
        return undefined;
    const n = typeof v === "number" ? v : Number(String(v).trim());
    return Number.isFinite(n) ? n : undefined;
}
function stringArrayField(data, key) {
    const v = data[key];
    if (v === undefined || v === null)
        return [];
    if (Array.isArray(v))
        return v.map((x) => String(x));
    throw new Error(`frontmatter '${key}' must be a list`);
}
})

__arggonModules.set("lib/src/get-open-prs.ts", (exports, require, module) => {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseRepoSlug = parseRepoSlug;
exports.ghPrListJson = ghPrListJson;
exports.getOpenPRs = getOpenPRs;
exports.getOpenPRsForRepo = getOpenPRsForRepo;
const node_child_process_1 = require("node:child_process");
const detect_repo_js_1 = require("./detect-repo.js");
const defaultExecGit = (file, args, options) => (0, node_child_process_1.execFileSync)(file, args, options);
function parseRepoSlug(slug) {
    const parts = slug.split("/");
    if (parts.length !== 2 || !parts[0] || !parts[1] || /\s/.test(slug)) {
        throw new Error(`Invalid --repo "${slug}": expected "owner/name" (e.g. --repo octocat/hello-world)`);
    }
    return { owner: parts[0], repo: parts[1] };
}
function ghPrListJson(opts) {
    const execGh = opts.execGh ?? node_child_process_1.execFileSync;
    const args = ["pr", "list", "--limit", String(opts.limit ?? 100), "--json", opts.fields];
    if (opts.repo)
        args.push("--repo", opts.repo);
    let out;
    try {
        const runOpts = {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
            timeout: 30_000,
        };
        if (opts.cwd !== undefined)
            runOpts.cwd = opts.cwd;
        out = execGh("gh", args, runOpts);
    }
    catch (err) {
        if (err !== null &&
            typeof err === "object" &&
            "code" in err &&
            (err.code === "ENOENT" || err.code === -2)) {
            throw new Error("gh not found (install gh and run `gh auth login`)");
        }
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`gh pr list failed (${message}; check \`gh auth status\`)`);
    }
    try {
        const data = JSON.parse(out);
        if (!Array.isArray(data))
            throw new Error("not an array");
        return data;
    }
    catch {
        throw new Error("gh pr list returned unparseable JSON (check `gh auth status`)");
    }
}
function getOpenPRs(repo, cwd, execGh = node_child_process_1.execFileSync, execGit = defaultExecGit) {
    const detected = repo ? parseRepoSlug(repo) : (0, detect_repo_js_1.detectRepo)(cwd, execGit);
    if (!detected) {
        throw new Error("Cannot determine GitHub repository. Pass --repo or ensure origin is a GitHub remote.");
    }
    return getOpenPRsForRepo(detected.owner, detected.repo, execGh);
}
function getOpenPRsForRepo(owner, repo, execGh) {
    try {
        const data = ghPrListJson({
            repo: `${owner}/${repo}`,
            fields: "number,title,headRefName,url",
            execGh,
        });
        return data.map((pr) => ({
            number: pr.number,
            headRefName: pr.headRefName,
            title: pr.title,
            url: pr.url,
        }));
    }
    catch {
        try {
            const json = execGh("gh", ["api", `repos/${owner}/${repo}/pulls?state=open&per_page=100`], {
                encoding: "utf8",
                stdio: ["ignore", "pipe", "ignore"],
                timeout: 30_000,
            });
            const data = JSON.parse(json);
            return data.map((pr) => ({
                number: pr.number,
                headRefName: pr.headRefName,
                title: pr.title,
                url: pr.url,
            }));
        }
        catch (apiError) {
            throw new Error(`GitHub API error: ${apiError.message}`);
        }
    }
}
})

__arggonModules.set("lib/src/handoff.ts", (exports, require, module) => {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HANDOFF_SESSION_CAP = exports.HANDOFF_FIELD_CAP = void 0;
exports.runHandoff = runHandoff;
const node_child_process_1 = require("node:child_process");
const comment_js_1 = require("./comment.js");
exports.HANDOFF_FIELD_CAP = 200;
exports.HANDOFF_SESSION_CAP = 64;
const MARKER = "…";
const LONE_SURROGATE = /\p{Cs}/gu;
function capUnits(token, cap) {
    const clean = token.replace(LONE_SURROGATE, "");
    if (clean.length <= cap)
        return clean;
    let end = cap - MARKER.length;
    const last = clean.charCodeAt(end - 1);
    if (last >= 0xd800 && last <= 0xdbff)
        end -= 1;
    return clean.slice(0, end) + MARKER;
}
function capField(value) {
    const trimmed = value?.trim();
    if (!trimmed)
        return undefined;
    return capUnits(trimmed, exports.HANDOFF_FIELD_CAP) || undefined;
}
function capSession(value) {
    const trimmed = value?.trim();
    if (!trimmed)
        return undefined;
    return capUnits(trimmed, exports.HANDOFF_SESSION_CAP) || undefined;
}
function detectBranch(cwd) {
    try {
        return (0, node_child_process_1.execFileSync)("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
            cwd,
            stdio: ["ignore", "pipe", "ignore"],
            encoding: "utf8",
        }).trim();
    }
    catch {
        return "unknown";
    }
}
function runHandoff(opts) {
    const next = capField(opts.next);
    if (!next) {
        throw new Error('handoff requires --next "<next step>" (the first thing the resuming agent should do)');
    }
    const branch = capField(opts.branch) ?? detectBranch(opts.cwd);
    const openQuestions = capField(opts.openQuestions);
    const session = capSession(opts.session);
    const lines = [`- branch: ${branch}`];
    if (openQuestions)
        lines.push(`- open questions: ${openQuestions}`);
    const result = (0, comment_js_1.runComment)({
        cwd: opts.cwd,
        id: opts.id,
        text: lines.join("\n"),
        author: opts.author,
        commit: opts.commit,
        now: opts.now,
        env: opts.env,
        resolveMe: opts.resolveMe,
        heading: (date, author) => `### handoff ${date} @${author}${session ? ` (session: ${session})` : ""} — next: ${next}`,
    });
    return {
        ...result,
        handoff: {
            branch,
            next,
            ...(openQuestions ? { openQuestions } : {}),
            ...(session ? { session } : {}),
        },
    };
}
})

__arggonModules.set("lib/src/ids.ts", (exports, require, module) => {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BRANCH_PATTERN = exports.ITEM_TYPES = exports.MAX_ID_LENGTH = void 0;
exports.isItemType = isItemType;
exports.slugify = slugify;
exports.assertValidId = assertValidId;
exports.itemId = itemId;
exports.innerSlug = innerSlug;
exports.firstDuplicateId = firstDuplicateId;
exports.assertLabels = assertLabels;
exports.assertBranchName = assertBranchName;
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
exports.MAX_ID_LENGTH = 64;
exports.ITEM_TYPES = ["initiative", "epic", "story", "task", "bug"];
const LEAF_PREFIX = {
    task: "task-",
    bug: "bug-",
};
function isItemType(value) {
    return exports.ITEM_TYPES.includes(value);
}
function slugify(text) {
    const slug = text
        .normalize("NFKD")
        .replace(/[^\w\s-]/g, "")
        .trim()
        .toLowerCase()
        .replace(/[_\s]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    if (!slug) {
        throw new Error(`Cannot derive id from ${JSON.stringify(text)}`);
    }
    return slug;
}
function assertValidId(id) {
    if (id.length > exports.MAX_ID_LENGTH) {
        throw new Error(`id '${id}' exceeds ${exports.MAX_ID_LENGTH} characters`);
    }
    if (!ID_PATTERN.test(id)) {
        throw new Error(`id '${id}' must be kebab-case ASCII (a-z, 0-9, hyphens)`);
    }
}
function itemId(type, stem) {
    if (type === "task" || type === "bug") {
        const prefix = LEAF_PREFIX[type];
        const id = stem.startsWith(prefix) ? stem : `${prefix}${stem}`;
        assertValidId(id);
        return id;
    }
    if (stem.startsWith("task-") || stem.startsWith("bug-")) {
        throw new Error(`Container id '${stem}' must not start with task- or bug-`);
    }
    assertValidId(stem);
    return stem;
}
function innerSlug(id) {
    return id.replace(/^(?:task|bug)-/, "");
}
function firstDuplicateId(ids) {
    const seen = new Set();
    for (const id of ids) {
        if (seen.has(id))
            return id;
        seen.add(id);
    }
    return undefined;
}
const LABEL_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function assertLabels(labels) {
    const seen = new Set();
    for (const label of labels) {
        if (!LABEL_PATTERN.test(label)) {
            throw new Error(`label '${label}' must be kebab-case ASCII (a-z, 0-9, hyphens)`);
        }
        if (seen.has(label)) {
            throw new Error(`duplicate label '${label}'`);
        }
        seen.add(label);
    }
}
exports.BRANCH_PATTERN = /^\S+$/;
function assertBranchName(branch) {
    if (!exports.BRANCH_PATTERN.test(branch)) {
        throw new Error(`invalid branch name ${JSON.stringify(branch)} (must be a single non-blank token)`);
    }
}
})

__arggonModules.set("lib/src/import-issues.ts", (exports, require, module) => {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BUILTIN_IMPORT_LABEL_TYPES = exports.IMPORTED_STORY_ID = void 0;
exports.resolveImportType = resolveImportType;
exports.ghIssueListJson = ghIssueListJson;
exports.normalizeGhLabels = normalizeGhLabels;
exports.mapIssueState = mapIssueState;
exports.importedBody = importedBody;
exports.runImportIssues = runImportIssues;
const node_child_process_1 = require("node:child_process");
const convention_js_1 = require("./convention.js");
const create_js_1 = require("./create.js");
const get_open_prs_js_1 = require("./get-open-prs.js");
const ids_js_1 = require("./ids.js");
const items_js_1 = require("./items.js");
const paths_js_1 = require("./paths.js");
const tracker_commit_js_1 = require("./tracker-commit.js");
const update_js_1 = require("./update.js");
const defaultExecGh = (file, args, options) => (0, node_child_process_1.execFileSync)(file, args, options);
exports.IMPORTED_STORY_ID = "story-imported-issues";
const TITLE_PREFIX = "issue";
const IMPORT_CLAIMANT = "github-import";
exports.BUILTIN_IMPORT_LABEL_TYPES = {
    bug: "bug",
};
function resolveImportType(labels, labelTypes) {
    for (const label of labels) {
        const mapped = labelTypes[label];
        if (mapped === "bug" || mapped === "task")
            return mapped;
    }
    return "task";
}
function ghIssueListJson(opts) {
    const execGh = opts.execGh ?? defaultExecGh;
    const args = [
        "issue",
        "list",
        "--state",
        "all",
        "--limit",
        "200",
        "--json",
        "number,title,state,body,labels",
    ];
    if (opts.repo)
        args.push("--repo", opts.repo);
    let out;
    try {
        const runOpts = {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
            timeout: 30_000,
        };
        if (opts.cwd !== undefined)
            runOpts.cwd = opts.cwd;
        out = execGh("gh", args, runOpts);
    }
    catch (err) {
        if (err !== null &&
            typeof err === "object" &&
            "code" in err &&
            (err.code === "ENOENT" || err.code === -2)) {
            throw new Error("gh not found (install gh and run `gh auth login`)");
        }
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`gh issue list failed (${message}; check \`gh auth status\`)`);
    }
    try {
        const data = JSON.parse(out);
        if (!Array.isArray(data))
            throw new Error("not an array");
        return data;
    }
    catch {
        throw new Error("gh issue list returned unparseable JSON (check `gh auth status`)");
    }
}
const LABEL_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function normalizeGhLabels(raw) {
    const labels = [];
    const seen = new Set();
    let skipped = 0;
    for (const entry of raw ?? []) {
        const name = typeof entry === "string" ? entry : (entry?.name ?? "");
        let slug;
        try {
            slug = (0, ids_js_1.slugify)(name);
        }
        catch {
            skipped += 1;
            continue;
        }
        if (!LABEL_PATTERN.test(slug)) {
            skipped += 1;
            continue;
        }
        if (!seen.has(slug)) {
            seen.add(slug);
            labels.push(slug);
        }
    }
    return { labels, skipped };
}
function mapIssueState(state) {
    return state.trim().toLowerCase() === "closed" ? "done" : "todo";
}
function importedBody(issue) {
    const body = (issue.body ?? "").replace(/\r\n/g, "\n").trimEnd();
    return `${body ? `${body}\n` : ""}> imported from issue #${issue.number}\n`;
}
function runImportIssues(opts) {
    if (opts.repo !== undefined)
        (0, get_open_prs_js_1.parseRepoSlug)(opts.repo);
    const config = (0, convention_js_1.readConventionConfig)(opts.cwd);
    let labelTypes = exports.BUILTIN_IMPORT_LABEL_TYPES;
    if (config.import.labelTypes !== null) {
        labelTypes = {};
        for (const [label, mapped] of Object.entries(config.import.labelTypes)) {
            if (mapped !== "task" && mapped !== "bug") {
                throw new Error(`x-import.label-types maps '${label}' to '${mapped}' — imported issues are leaves ` +
                    "under the target story, so mapped types may only be 'task' or 'bug' " +
                    "(stories are containers); fix the tracker .convention.yml");
            }
            labelTypes[label] = mapped;
        }
    }
    const tasksDir = (0, paths_js_1.findTasksDir)(opts.cwd);
    const issues = ghIssueListJson({ repo: opts.repo, cwd: opts.cwd, execGh: opts.execGh });
    const dryRun = Boolean(opts.dryRun);
    const now = opts.now ?? new Date();
    const byId = (0, items_js_1.itemsById)((0, items_js_1.loadItems)(tasksDir));
    const writtenPaths = [];
    let storyId;
    let storyCreated = false;
    if (opts.parent !== undefined) {
        const parent = byId.get(opts.parent);
        if (!parent) {
            throw new Error(`--parent '${opts.parent}' does not resolve to an existing item in the tracker`);
        }
        if (parent.type !== "story") {
            throw new Error(`--parent '${opts.parent}' is a ${parent.type}, not a story — imported tasks need a story parent`);
        }
        storyId = parent.id;
    }
    else if (byId.has(exports.IMPORTED_STORY_ID)) {
        const existing = byId.get(exports.IMPORTED_STORY_ID);
        if (existing.type !== "story") {
            throw new Error(`id '${exports.IMPORTED_STORY_ID}' already exists as a ${existing.type} — pass --parent <story-id> to choose the target story`);
        }
        storyId = exports.IMPORTED_STORY_ID;
    }
    else {
        const epics = [...byId.values()]
            .filter((item) => item.type === "epic")
            .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
        if (epics.length === 0) {
            throw new Error("no epic found in the tracker — imported tasks need a parent story (stories live under an epic). " +
                "Create one with `arggon create epic <title> --parent <initiative-id>` or pass --parent <story-id>");
        }
        if (!dryRun) {
            const story = (0, create_js_1.runCreate)({
                cwd: opts.cwd,
                type: "story",
                title: "Imported GitHub issues",
                id: exports.IMPORTED_STORY_ID,
                parent: epics[0].id,
                commit: false,
                templatesDir: opts.templatesDir,
                now,
            });
            storyCreated = true;
            writtenPaths.push(story.path);
        }
        storyId = exports.IMPORTED_STORY_ID;
    }
    const entries = [];
    let created = 0;
    let skipped = 0;
    let labelsMapped = 0;
    let labelsSkipped = 0;
    for (const issue of issues) {
        if (!Number.isInteger(issue?.number) || issue.number <= 0) {
            throw new Error("gh issue list returned an entry without a valid issue number");
        }
        const number = issue.number;
        const { labels, skipped: badLabels } = normalizeGhLabels(issue.labels);
        const type = resolveImportType(labels, labelTypes);
        const id = (0, ids_js_1.itemId)(type, `issue-${number}`);
        const status = mapIssueState(issue.state ?? "");
        const title = `${TITLE_PREFIX} #${number}: ${(issue.title ?? "").trim()}`;
        if (byId.has(id)) {
            skipped += 1;
            entries.push({ issue: number, id, title, status, action: dryRun ? "would-skip" : "skipped" });
            continue;
        }
        labelsMapped += labels.length;
        labelsSkipped += badLabels;
        if (!dryRun) {
            const createdItem = (0, create_js_1.runCreate)({
                cwd: opts.cwd,
                type,
                title,
                parent: storyId,
                id: `issue-${number}`,
                labels,
                body: importedBody(issue),
                issue: number,
                commit: false,
                templatesDir: opts.templatesDir,
                now,
            });
            writtenPaths.push(createdItem.path);
            if (status === "done") {
                (0, update_js_1.runUpdate)({
                    cwd: opts.cwd,
                    id,
                    status: "in_progress",
                    assignee: IMPORT_CLAIMANT,
                    now,
                });
                const needsWaive = !(0, items_js_1.acceptanceComplete)(createdItem.item.body) &&
                    (createdItem.item.type === "task" || createdItem.item.type === "bug");
                const closed = (0, update_js_1.runUpdate)({
                    cwd: opts.cwd,
                    id,
                    status: "done",
                    unassign: true,
                    ...(needsWaive ? { waive: `imported as closed from GitHub issue #${number}` } : {}),
                    now,
                });
                writtenPaths.push(...closed.changedPaths);
            }
        }
        created += 1;
        entries.push({
            issue: number,
            id,
            title,
            status,
            action: dryRun ? "would-create" : "created",
        });
    }
    const root = (0, paths_js_1.repoRootFromTasks)(tasksDir);
    const commit = !dryRun && writtenPaths.length > 0
        ? (0, tracker_commit_js_1.commitTrackerMutation)(root, writtenPaths, {
            message: `chore(tasks): imported ${created} issues`,
            commit: (0, tracker_commit_js_1.resolveAutoCommit)(opts.commit, (0, tracker_commit_js_1.readAutoCommitConfig)(root)),
        })
        : undefined;
    return {
        root,
        dryRun,
        story: { id: storyId, created: storyCreated },
        entries,
        created,
        skipped,
        labelsMapped,
        labelsSkipped,
        commit,
    };
}
})

__arggonModules.set("lib/src/index.ts", (exports, require, module) => {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.repoRootFromTasks = exports.newItemPath = exports.findTrackerLocation = exports.findTasksDir = exports.docsDirForRoot = exports.conventionPathForRoot = exports.conventionPathForLayout = exports.TRACKER_DIR_NAME = exports.LEGACY_TRACKER_DIR_NAME = exports.CONVENTION_FILE_NAME = exports.slugify = exports.itemId = exports.isItemType = exports.innerSlug = exports.firstDuplicateId = exports.assertValidId = exports.assertLabels = exports.assertBranchName = exports.MAX_ID_LENGTH = exports.ITEM_TYPES = exports.BRANCH_PATTERN = exports.expectedParentType = exports.assertParentEdge = exports.PARENT_TYPE = exports.unclaim = exports.isClaimed = exports.isClaimable = exports.canTransition = exports.assertStatus = exports.assertCreatableStatus = exports.assertClaimAndBlocked = exports.assertAssignee = exports.TRANSITIONS = exports.STATUSES = exports.CREATE_STATUSES = exports.CLAIMABLE_TYPES = exports.ASSIGNEE_PATTERN = exports.assertUpdateRules = exports.toContractWorkItem = exports.stringifyFrontmatter = exports.stringField = exports.stringArrayField = exports.parseFrontmatter = exports.numberField = exports.walkTasksTree = exports.tryLoadItem = exports.softTryLoadItem = exports.loadItems = exports.itemsById = exports.acceptanceComplete = void 0;
exports.compactWorkItem = exports.JSON_SCHEMA_VERSION = exports.visibleItems = exports.treeEntries = exports.statusCounts = exports.sortByPriority = exports.sortByNextRank = exports.sortById = exports.readyTodoCount = exports.priorityTier = exports.priorityCounts = exports.openDependencyIds = exports.matchesSubstringFilter = exports.itemsForStatus = exports.isReadyTodo = exports.hasOpenDependencies = exports.groupItemsBy = exports.buildStatusIndex = exports.applyViewLens = exports.applyViewFilter = exports.runPriorityMigrate = exports.priorityRank = exports.isPriority = exports.assertPriority = exports.PRIORITY_LABEL_PATTERN = exports.PRIORITIES = exports.withItemLock = exports.lockFilePathFor = exports.formatDateTime = exports.formatDate = exports.runNext = exports.openDependencies = exports.isReady = exports.downstreamWeight = exports.unquoteFilterValue = exports.splitFilterTokens = exports.parseFilter = exports.matchesPredicate = exports.buildBlockedByIndex = exports.buildAncestorIndex = exports.FILTER_FIELDS = exports.resolveBranchName = exports.readConventionVersion = exports.readConventionConfig = exports.parseConventionConfig = exports.DEFAULT_BRANCH_PATTERNS = exports.CONVENTION_VERSION_DEFAULT = exports.CONVENTION_VERSION = exports.trackerNonItemDirs = exports.trackerAt = void 0;
exports.strictWorktreeWriteFailure = exports.strictGateBinViolations = exports.strictGateBinFailure = exports.readWorktreeClaimStamp = exports.prepareWorktreeEnv = exports.prepareWorktreeDependencies = exports.pointWorkspaceAtLocal = exports.parseTrackedModifications = exports.packageEntryPaths = exports.packageEntryExists = exports.packageBuildScript = exports.localWorkspacePackages = exports.linkedWorkspacePackages = exports.linkNodeModulesDetailed = exports.linkNodeModules = exports.inspectGateBinResolution = exports.inspectDeclaredDependencies = exports.freshWorktreeInstallRefusal = exports.detectWorktreeForeignWrites = exports.buildLocalWorkspaces = exports.findMergedPr = exports.defaultCleanupGit = exports.classifyCleanupEntry = exports.CLEANUP_TERMINAL_STATUSES = exports.parseVerdicts = exports.classifyVerdicts = exports.runSync = exports.runHandoff = exports.HANDOFF_SESSION_CAP = exports.HANDOFF_FIELD_CAP = exports.runComment = exports.parseCsvList = exports.maybeCommitUpdate = exports.runUpdate = exports.runValidate = exports.parseOlderThan = exports.parseSince = exports.parseLog = exports.isoWeekKey = exports.runTrend = exports.runReport = exports.completedOf = exports.aggregateReport = exports.showBoundedParts = exports.runShow = exports.runList = exports.runCreate = exports.commitPayload = exports.successEnvelope = exports.failEnvelope = void 0;
exports.updateCommitMessage = exports.trackerGitLockKey = exports.trackerCommitMessage = exports.resolveCommonGitDir = exports.resolveAutoCommit = exports.readAutoCommitConfig = exports.formatCommitLine = exports.commitTrackerMutation = exports.updateGeneratedSection = exports.serializeGeneratedSection = exports.readGeneratedState = exports.readGeneratedProjectName = exports.parseGeneratedProjectName = exports.sanitizeHumanValue = exports.sanitizeHumanTextUncapped = exports.sanitizeHumanText = exports.sanitizeHumanError = exports.MAX_HUMAN_VALUE_CHARS = exports.MAX_HUMAN_ERROR_CHARS = exports.writeFileAtomic = exports.validateOperation = exports.updateOperation = exports.syncOperation = exports.showOperation = exports.reportOperation = exports.priorityOperation = exports.nextOperation = exports.listOperation = exports.importIssuesOperation = exports.handoffOperation = exports.createOperation = exports.commentOperation = exports.resolveImportType = exports.normalizeGhLabels = exports.mapIssueState = exports.importedBody = exports.ghIssueListJson = exports.runImportIssues = exports.WORKTREE_ENV_KEYS = exports.MAX_PREP_STEPS = exports.MAX_GATE_BINS = exports.MAX_MISSING_DEPENDENCIES = exports.MAX_CLAIM_TAKEOVERS = exports.worktreeStateBase = exports.worktreeComposeProject = exports.worktreeTakeoverWarning = exports.worktreeForeignWriteWarning = exports.worktreeCacheBase = exports.unlinkWorktreeEnv = exports.unlinkNodeModulesLink = void 0;
exports.successJson = exports.jsonEnabled = exports.failJson = exports.emitJson = exports.bindJsonProgram = exports.ghPrListJson = exports.formatValidateHuman = exports.formatTrendTable = exports.formatTrendMarkdown = exports.formatReportTable = exports.formatReportMarkdown = exports.renderShowText = exports.DEFAULT_TAIL_COMMENTS = exports.resolveCurrentLogin = exports.formatListTable = void 0;
var items_js_1 = require("./items.js");
Object.defineProperty(exports, "acceptanceComplete", { enumerable: true, get: function () { return items_js_1.acceptanceComplete; } });
Object.defineProperty(exports, "itemsById", { enumerable: true, get: function () { return items_js_1.itemsById; } });
Object.defineProperty(exports, "loadItems", { enumerable: true, get: function () { return items_js_1.loadItems; } });
Object.defineProperty(exports, "softTryLoadItem", { enumerable: true, get: function () { return items_js_1.softTryLoadItem; } });
Object.defineProperty(exports, "tryLoadItem", { enumerable: true, get: function () { return items_js_1.tryLoadItem; } });
Object.defineProperty(exports, "walkTasksTree", { enumerable: true, get: function () { return items_js_1.walkTasksTree; } });
var frontmatter_js_1 = require("./frontmatter.js");
Object.defineProperty(exports, "numberField", { enumerable: true, get: function () { return frontmatter_js_1.numberField; } });
Object.defineProperty(exports, "parseFrontmatter", { enumerable: true, get: function () { return frontmatter_js_1.parseFrontmatter; } });
Object.defineProperty(exports, "stringArrayField", { enumerable: true, get: function () { return frontmatter_js_1.stringArrayField; } });
Object.defineProperty(exports, "stringField", { enumerable: true, get: function () { return frontmatter_js_1.stringField; } });
Object.defineProperty(exports, "stringifyFrontmatter", { enumerable: true, get: function () { return frontmatter_js_1.stringifyFrontmatter; } });
var contract_js_1 = require("./contract.js");
Object.defineProperty(exports, "toContractWorkItem", { enumerable: true, get: function () { return contract_js_1.toContractWorkItem; } });
var rules_js_1 = require("./rules.js");
Object.defineProperty(exports, "assertUpdateRules", { enumerable: true, get: function () { return rules_js_1.assertUpdateRules; } });
var status_js_1 = require("./status.js");
Object.defineProperty(exports, "ASSIGNEE_PATTERN", { enumerable: true, get: function () { return status_js_1.ASSIGNEE_PATTERN; } });
Object.defineProperty(exports, "CLAIMABLE_TYPES", { enumerable: true, get: function () { return status_js_1.CLAIMABLE_TYPES; } });
Object.defineProperty(exports, "CREATE_STATUSES", { enumerable: true, get: function () { return status_js_1.CREATE_STATUSES; } });
Object.defineProperty(exports, "STATUSES", { enumerable: true, get: function () { return status_js_1.STATUSES; } });
Object.defineProperty(exports, "TRANSITIONS", { enumerable: true, get: function () { return status_js_1.TRANSITIONS; } });
Object.defineProperty(exports, "assertAssignee", { enumerable: true, get: function () { return status_js_1.assertAssignee; } });
Object.defineProperty(exports, "assertClaimAndBlocked", { enumerable: true, get: function () { return status_js_1.assertClaimAndBlocked; } });
Object.defineProperty(exports, "assertCreatableStatus", { enumerable: true, get: function () { return status_js_1.assertCreatableStatus; } });
Object.defineProperty(exports, "assertStatus", { enumerable: true, get: function () { return status_js_1.assertStatus; } });
Object.defineProperty(exports, "canTransition", { enumerable: true, get: function () { return status_js_1.canTransition; } });
Object.defineProperty(exports, "isClaimable", { enumerable: true, get: function () { return status_js_1.isClaimable; } });
Object.defineProperty(exports, "isClaimed", { enumerable: true, get: function () { return status_js_1.isClaimed; } });
Object.defineProperty(exports, "unclaim", { enumerable: true, get: function () { return status_js_1.unclaim; } });
var relations_js_1 = require("./relations.js");
Object.defineProperty(exports, "PARENT_TYPE", { enumerable: true, get: function () { return relations_js_1.PARENT_TYPE; } });
Object.defineProperty(exports, "assertParentEdge", { enumerable: true, get: function () { return relations_js_1.assertParentEdge; } });
Object.defineProperty(exports, "expectedParentType", { enumerable: true, get: function () { return relations_js_1.expectedParentType; } });
var ids_js_1 = require("./ids.js");
Object.defineProperty(exports, "BRANCH_PATTERN", { enumerable: true, get: function () { return ids_js_1.BRANCH_PATTERN; } });
Object.defineProperty(exports, "ITEM_TYPES", { enumerable: true, get: function () { return ids_js_1.ITEM_TYPES; } });
Object.defineProperty(exports, "MAX_ID_LENGTH", { enumerable: true, get: function () { return ids_js_1.MAX_ID_LENGTH; } });
Object.defineProperty(exports, "assertBranchName", { enumerable: true, get: function () { return ids_js_1.assertBranchName; } });
Object.defineProperty(exports, "assertLabels", { enumerable: true, get: function () { return ids_js_1.assertLabels; } });
Object.defineProperty(exports, "assertValidId", { enumerable: true, get: function () { return ids_js_1.assertValidId; } });
Object.defineProperty(exports, "firstDuplicateId", { enumerable: true, get: function () { return ids_js_1.firstDuplicateId; } });
Object.defineProperty(exports, "innerSlug", { enumerable: true, get: function () { return ids_js_1.innerSlug; } });
Object.defineProperty(exports, "isItemType", { enumerable: true, get: function () { return ids_js_1.isItemType; } });
Object.defineProperty(exports, "itemId", { enumerable: true, get: function () { return ids_js_1.itemId; } });
Object.defineProperty(exports, "slugify", { enumerable: true, get: function () { return ids_js_1.slugify; } });
var paths_js_1 = require("./paths.js");
Object.defineProperty(exports, "CONVENTION_FILE_NAME", { enumerable: true, get: function () { return paths_js_1.CONVENTION_FILE_NAME; } });
Object.defineProperty(exports, "LEGACY_TRACKER_DIR_NAME", { enumerable: true, get: function () { return paths_js_1.LEGACY_TRACKER_DIR_NAME; } });
Object.defineProperty(exports, "TRACKER_DIR_NAME", { enumerable: true, get: function () { return paths_js_1.TRACKER_DIR_NAME; } });
Object.defineProperty(exports, "conventionPathForLayout", { enumerable: true, get: function () { return paths_js_1.conventionPathForLayout; } });
Object.defineProperty(exports, "conventionPathForRoot", { enumerable: true, get: function () { return paths_js_1.conventionPathForRoot; } });
Object.defineProperty(exports, "docsDirForRoot", { enumerable: true, get: function () { return paths_js_1.docsDirForRoot; } });
Object.defineProperty(exports, "findTasksDir", { enumerable: true, get: function () { return paths_js_1.findTasksDir; } });
Object.defineProperty(exports, "findTrackerLocation", { enumerable: true, get: function () { return paths_js_1.findTrackerLocation; } });
Object.defineProperty(exports, "newItemPath", { enumerable: true, get: function () { return paths_js_1.newItemPath; } });
Object.defineProperty(exports, "repoRootFromTasks", { enumerable: true, get: function () { return paths_js_1.repoRootFromTasks; } });
Object.defineProperty(exports, "trackerAt", { enumerable: true, get: function () { return paths_js_1.trackerAt; } });
Object.defineProperty(exports, "trackerNonItemDirs", { enumerable: true, get: function () { return paths_js_1.trackerNonItemDirs; } });
var convention_js_1 = require("./convention.js");
Object.defineProperty(exports, "CONVENTION_VERSION", { enumerable: true, get: function () { return convention_js_1.CONVENTION_VERSION; } });
Object.defineProperty(exports, "CONVENTION_VERSION_DEFAULT", { enumerable: true, get: function () { return convention_js_1.CONVENTION_VERSION_DEFAULT; } });
Object.defineProperty(exports, "DEFAULT_BRANCH_PATTERNS", { enumerable: true, get: function () { return convention_js_1.DEFAULT_BRANCH_PATTERNS; } });
Object.defineProperty(exports, "parseConventionConfig", { enumerable: true, get: function () { return convention_js_1.parseConventionConfig; } });
Object.defineProperty(exports, "readConventionConfig", { enumerable: true, get: function () { return convention_js_1.readConventionConfig; } });
Object.defineProperty(exports, "readConventionVersion", { enumerable: true, get: function () { return convention_js_1.readConventionVersion; } });
Object.defineProperty(exports, "resolveBranchName", { enumerable: true, get: function () { return convention_js_1.resolveBranchName; } });
var filter_js_1 = require("./filter.js");
Object.defineProperty(exports, "FILTER_FIELDS", { enumerable: true, get: function () { return filter_js_1.FILTER_FIELDS; } });
Object.defineProperty(exports, "buildAncestorIndex", { enumerable: true, get: function () { return filter_js_1.buildAncestorIndex; } });
Object.defineProperty(exports, "buildBlockedByIndex", { enumerable: true, get: function () { return filter_js_1.buildBlockedByIndex; } });
Object.defineProperty(exports, "matchesPredicate", { enumerable: true, get: function () { return filter_js_1.matchesPredicate; } });
Object.defineProperty(exports, "parseFilter", { enumerable: true, get: function () { return filter_js_1.parseFilter; } });
Object.defineProperty(exports, "splitFilterTokens", { enumerable: true, get: function () { return filter_js_1.splitFilterTokens; } });
Object.defineProperty(exports, "unquoteFilterValue", { enumerable: true, get: function () { return filter_js_1.unquoteFilterValue; } });
var next_js_1 = require("./next.js");
Object.defineProperty(exports, "downstreamWeight", { enumerable: true, get: function () { return next_js_1.downstreamWeight; } });
Object.defineProperty(exports, "isReady", { enumerable: true, get: function () { return next_js_1.isReady; } });
Object.defineProperty(exports, "openDependencies", { enumerable: true, get: function () { return next_js_1.openDependencies; } });
Object.defineProperty(exports, "runNext", { enumerable: true, get: function () { return next_js_1.runNext; } });
var dates_js_1 = require("./dates.js");
Object.defineProperty(exports, "formatDate", { enumerable: true, get: function () { return dates_js_1.formatDate; } });
Object.defineProperty(exports, "formatDateTime", { enumerable: true, get: function () { return dates_js_1.formatDateTime; } });
var lock_js_1 = require("./lock.js");
Object.defineProperty(exports, "lockFilePathFor", { enumerable: true, get: function () { return lock_js_1.lockFilePathFor; } });
Object.defineProperty(exports, "withItemLock", { enumerable: true, get: function () { return lock_js_1.withItemLock; } });
var priority_js_1 = require("./priority.js");
Object.defineProperty(exports, "PRIORITIES", { enumerable: true, get: function () { return priority_js_1.PRIORITIES; } });
Object.defineProperty(exports, "PRIORITY_LABEL_PATTERN", { enumerable: true, get: function () { return priority_js_1.PRIORITY_LABEL_PATTERN; } });
Object.defineProperty(exports, "assertPriority", { enumerable: true, get: function () { return priority_js_1.assertPriority; } });
Object.defineProperty(exports, "isPriority", { enumerable: true, get: function () { return priority_js_1.isPriority; } });
Object.defineProperty(exports, "priorityRank", { enumerable: true, get: function () { return priority_js_1.priorityRank; } });
Object.defineProperty(exports, "runPriorityMigrate", { enumerable: true, get: function () { return priority_js_1.runPriorityMigrate; } });
var view_model_js_1 = require("./view-model.js");
Object.defineProperty(exports, "applyViewFilter", { enumerable: true, get: function () { return view_model_js_1.applyViewFilter; } });
Object.defineProperty(exports, "applyViewLens", { enumerable: true, get: function () { return view_model_js_1.applyViewLens; } });
Object.defineProperty(exports, "buildStatusIndex", { enumerable: true, get: function () { return view_model_js_1.buildStatusIndex; } });
Object.defineProperty(exports, "groupItemsBy", { enumerable: true, get: function () { return view_model_js_1.groupItemsBy; } });
Object.defineProperty(exports, "hasOpenDependencies", { enumerable: true, get: function () { return view_model_js_1.hasOpenDependencies; } });
Object.defineProperty(exports, "isReadyTodo", { enumerable: true, get: function () { return view_model_js_1.isReadyTodo; } });
Object.defineProperty(exports, "itemsForStatus", { enumerable: true, get: function () { return view_model_js_1.itemsForStatus; } });
Object.defineProperty(exports, "matchesSubstringFilter", { enumerable: true, get: function () { return view_model_js_1.matchesSubstringFilter; } });
Object.defineProperty(exports, "openDependencyIds", { enumerable: true, get: function () { return view_model_js_1.openDependencyIds; } });
Object.defineProperty(exports, "priorityCounts", { enumerable: true, get: function () { return view_model_js_1.priorityCounts; } });
Object.defineProperty(exports, "priorityTier", { enumerable: true, get: function () { return view_model_js_1.priorityTier; } });
Object.defineProperty(exports, "readyTodoCount", { enumerable: true, get: function () { return view_model_js_1.readyTodoCount; } });
Object.defineProperty(exports, "sortById", { enumerable: true, get: function () { return view_model_js_1.sortById; } });
Object.defineProperty(exports, "sortByNextRank", { enumerable: true, get: function () { return view_model_js_1.sortByNextRank; } });
Object.defineProperty(exports, "sortByPriority", { enumerable: true, get: function () { return view_model_js_1.sortByPriority; } });
Object.defineProperty(exports, "statusCounts", { enumerable: true, get: function () { return view_model_js_1.statusCounts; } });
Object.defineProperty(exports, "treeEntries", { enumerable: true, get: function () { return view_model_js_1.treeEntries; } });
Object.defineProperty(exports, "visibleItems", { enumerable: true, get: function () { return view_model_js_1.visibleItems; } });
var json_js_1 = require("./json.js");
Object.defineProperty(exports, "JSON_SCHEMA_VERSION", { enumerable: true, get: function () { return json_js_1.JSON_SCHEMA_VERSION; } });
Object.defineProperty(exports, "compactWorkItem", { enumerable: true, get: function () { return json_js_1.compactWorkItem; } });
Object.defineProperty(exports, "failEnvelope", { enumerable: true, get: function () { return json_js_1.failEnvelope; } });
Object.defineProperty(exports, "successEnvelope", { enumerable: true, get: function () { return json_js_1.successEnvelope; } });
var tracker_commit_js_1 = require("./tracker-commit.js");
Object.defineProperty(exports, "commitPayload", { enumerable: true, get: function () { return tracker_commit_js_1.commitPayload; } });
var create_js_1 = require("./create.js");
Object.defineProperty(exports, "runCreate", { enumerable: true, get: function () { return create_js_1.runCreate; } });
var list_js_1 = require("./list.js");
Object.defineProperty(exports, "runList", { enumerable: true, get: function () { return list_js_1.runList; } });
var show_js_1 = require("./show.js");
Object.defineProperty(exports, "runShow", { enumerable: true, get: function () { return show_js_1.runShow; } });
Object.defineProperty(exports, "showBoundedParts", { enumerable: true, get: function () { return show_js_1.showBoundedParts; } });
var report_js_1 = require("./report.js");
Object.defineProperty(exports, "aggregateReport", { enumerable: true, get: function () { return report_js_1.aggregateReport; } });
Object.defineProperty(exports, "completedOf", { enumerable: true, get: function () { return report_js_1.completedOf; } });
Object.defineProperty(exports, "runReport", { enumerable: true, get: function () { return report_js_1.runReport; } });
var trend_js_1 = require("./trend.js");
Object.defineProperty(exports, "runTrend", { enumerable: true, get: function () { return trend_js_1.runTrend; } });
var trend_js_2 = require("./trend.js");
Object.defineProperty(exports, "isoWeekKey", { enumerable: true, get: function () { return trend_js_2.isoWeekKey; } });
Object.defineProperty(exports, "parseLog", { enumerable: true, get: function () { return trend_js_2.parseLog; } });
Object.defineProperty(exports, "parseSince", { enumerable: true, get: function () { return trend_js_2.parseSince; } });
var list_js_2 = require("./list.js");
Object.defineProperty(exports, "parseOlderThan", { enumerable: true, get: function () { return list_js_2.parseOlderThan; } });
var validate_js_1 = require("./validate.js");
Object.defineProperty(exports, "runValidate", { enumerable: true, get: function () { return validate_js_1.runValidate; } });
var update_js_1 = require("./update.js");
Object.defineProperty(exports, "runUpdate", { enumerable: true, get: function () { return update_js_1.runUpdate; } });
Object.defineProperty(exports, "maybeCommitUpdate", { enumerable: true, get: function () { return update_js_1.maybeCommitUpdate; } });
Object.defineProperty(exports, "parseCsvList", { enumerable: true, get: function () { return update_js_1.parseCsvList; } });
var comment_js_1 = require("./comment.js");
Object.defineProperty(exports, "runComment", { enumerable: true, get: function () { return comment_js_1.runComment; } });
var handoff_js_1 = require("./handoff.js");
Object.defineProperty(exports, "HANDOFF_FIELD_CAP", { enumerable: true, get: function () { return handoff_js_1.HANDOFF_FIELD_CAP; } });
Object.defineProperty(exports, "HANDOFF_SESSION_CAP", { enumerable: true, get: function () { return handoff_js_1.HANDOFF_SESSION_CAP; } });
Object.defineProperty(exports, "runHandoff", { enumerable: true, get: function () { return handoff_js_1.runHandoff; } });
var sync_command_js_1 = require("./sync-command.js");
Object.defineProperty(exports, "runSync", { enumerable: true, get: function () { return sync_command_js_1.runSync; } });
var verdict_js_1 = require("./verdict.js");
Object.defineProperty(exports, "classifyVerdicts", { enumerable: true, get: function () { return verdict_js_1.classifyVerdicts; } });
Object.defineProperty(exports, "parseVerdicts", { enumerable: true, get: function () { return verdict_js_1.parseVerdicts; } });
var cleanup_js_1 = require("./cleanup.js");
Object.defineProperty(exports, "CLEANUP_TERMINAL_STATUSES", { enumerable: true, get: function () { return cleanup_js_1.CLEANUP_TERMINAL_STATUSES; } });
Object.defineProperty(exports, "classifyCleanupEntry", { enumerable: true, get: function () { return cleanup_js_1.classifyCleanupEntry; } });
Object.defineProperty(exports, "defaultCleanupGit", { enumerable: true, get: function () { return cleanup_js_1.defaultCleanupGit; } });
Object.defineProperty(exports, "findMergedPr", { enumerable: true, get: function () { return cleanup_js_1.findMergedPr; } });
var worktree_js_1 = require("./worktree.js");
Object.defineProperty(exports, "buildLocalWorkspaces", { enumerable: true, get: function () { return worktree_js_1.buildLocalWorkspaces; } });
Object.defineProperty(exports, "detectWorktreeForeignWrites", { enumerable: true, get: function () { return worktree_js_1.detectWorktreeForeignWrites; } });
Object.defineProperty(exports, "freshWorktreeInstallRefusal", { enumerable: true, get: function () { return worktree_js_1.freshWorktreeInstallRefusal; } });
Object.defineProperty(exports, "inspectDeclaredDependencies", { enumerable: true, get: function () { return worktree_js_1.inspectDeclaredDependencies; } });
Object.defineProperty(exports, "inspectGateBinResolution", { enumerable: true, get: function () { return worktree_js_1.inspectGateBinResolution; } });
Object.defineProperty(exports, "linkNodeModules", { enumerable: true, get: function () { return worktree_js_1.linkNodeModules; } });
Object.defineProperty(exports, "linkNodeModulesDetailed", { enumerable: true, get: function () { return worktree_js_1.linkNodeModulesDetailed; } });
Object.defineProperty(exports, "linkedWorkspacePackages", { enumerable: true, get: function () { return worktree_js_1.linkedWorkspacePackages; } });
Object.defineProperty(exports, "localWorkspacePackages", { enumerable: true, get: function () { return worktree_js_1.localWorkspacePackages; } });
Object.defineProperty(exports, "packageBuildScript", { enumerable: true, get: function () { return worktree_js_1.packageBuildScript; } });
Object.defineProperty(exports, "packageEntryExists", { enumerable: true, get: function () { return worktree_js_1.packageEntryExists; } });
Object.defineProperty(exports, "packageEntryPaths", { enumerable: true, get: function () { return worktree_js_1.packageEntryPaths; } });
Object.defineProperty(exports, "parseTrackedModifications", { enumerable: true, get: function () { return worktree_js_1.parseTrackedModifications; } });
Object.defineProperty(exports, "pointWorkspaceAtLocal", { enumerable: true, get: function () { return worktree_js_1.pointWorkspaceAtLocal; } });
Object.defineProperty(exports, "prepareWorktreeDependencies", { enumerable: true, get: function () { return worktree_js_1.prepareWorktreeDependencies; } });
Object.defineProperty(exports, "prepareWorktreeEnv", { enumerable: true, get: function () { return worktree_js_1.prepareWorktreeEnv; } });
Object.defineProperty(exports, "readWorktreeClaimStamp", { enumerable: true, get: function () { return worktree_js_1.readWorktreeClaimStamp; } });
Object.defineProperty(exports, "strictGateBinFailure", { enumerable: true, get: function () { return worktree_js_1.strictGateBinFailure; } });
Object.defineProperty(exports, "strictGateBinViolations", { enumerable: true, get: function () { return worktree_js_1.strictGateBinViolations; } });
Object.defineProperty(exports, "strictWorktreeWriteFailure", { enumerable: true, get: function () { return worktree_js_1.strictWorktreeWriteFailure; } });
Object.defineProperty(exports, "unlinkNodeModulesLink", { enumerable: true, get: function () { return worktree_js_1.unlinkNodeModulesLink; } });
Object.defineProperty(exports, "unlinkWorktreeEnv", { enumerable: true, get: function () { return worktree_js_1.unlinkWorktreeEnv; } });
Object.defineProperty(exports, "worktreeCacheBase", { enumerable: true, get: function () { return worktree_js_1.worktreeCacheBase; } });
Object.defineProperty(exports, "worktreeForeignWriteWarning", { enumerable: true, get: function () { return worktree_js_1.worktreeForeignWriteWarning; } });
Object.defineProperty(exports, "worktreeTakeoverWarning", { enumerable: true, get: function () { return worktree_js_1.worktreeTakeoverWarning; } });
Object.defineProperty(exports, "worktreeComposeProject", { enumerable: true, get: function () { return worktree_js_1.worktreeComposeProject; } });
Object.defineProperty(exports, "worktreeStateBase", { enumerable: true, get: function () { return worktree_js_1.worktreeStateBase; } });
Object.defineProperty(exports, "MAX_CLAIM_TAKEOVERS", { enumerable: true, get: function () { return worktree_js_1.MAX_CLAIM_TAKEOVERS; } });
Object.defineProperty(exports, "MAX_MISSING_DEPENDENCIES", { enumerable: true, get: function () { return worktree_js_1.MAX_MISSING_DEPENDENCIES; } });
Object.defineProperty(exports, "MAX_GATE_BINS", { enumerable: true, get: function () { return worktree_js_1.MAX_GATE_BINS; } });
Object.defineProperty(exports, "MAX_PREP_STEPS", { enumerable: true, get: function () { return worktree_js_1.MAX_PREP_STEPS; } });
Object.defineProperty(exports, "WORKTREE_ENV_KEYS", { enumerable: true, get: function () { return worktree_js_1.WORKTREE_ENV_KEYS; } });
var import_issues_js_1 = require("./import-issues.js");
Object.defineProperty(exports, "runImportIssues", { enumerable: true, get: function () { return import_issues_js_1.runImportIssues; } });
var import_issues_js_2 = require("./import-issues.js");
Object.defineProperty(exports, "ghIssueListJson", { enumerable: true, get: function () { return import_issues_js_2.ghIssueListJson; } });
Object.defineProperty(exports, "importedBody", { enumerable: true, get: function () { return import_issues_js_2.importedBody; } });
Object.defineProperty(exports, "mapIssueState", { enumerable: true, get: function () { return import_issues_js_2.mapIssueState; } });
Object.defineProperty(exports, "normalizeGhLabels", { enumerable: true, get: function () { return import_issues_js_2.normalizeGhLabels; } });
Object.defineProperty(exports, "resolveImportType", { enumerable: true, get: function () { return import_issues_js_2.resolveImportType; } });
var operations_js_1 = require("./operations.js");
Object.defineProperty(exports, "commentOperation", { enumerable: true, get: function () { return operations_js_1.commentOperation; } });
Object.defineProperty(exports, "createOperation", { enumerable: true, get: function () { return operations_js_1.createOperation; } });
Object.defineProperty(exports, "handoffOperation", { enumerable: true, get: function () { return operations_js_1.handoffOperation; } });
Object.defineProperty(exports, "importIssuesOperation", { enumerable: true, get: function () { return operations_js_1.importIssuesOperation; } });
Object.defineProperty(exports, "listOperation", { enumerable: true, get: function () { return operations_js_1.listOperation; } });
Object.defineProperty(exports, "nextOperation", { enumerable: true, get: function () { return operations_js_1.nextOperation; } });
Object.defineProperty(exports, "priorityOperation", { enumerable: true, get: function () { return operations_js_1.priorityOperation; } });
Object.defineProperty(exports, "reportOperation", { enumerable: true, get: function () { return operations_js_1.reportOperation; } });
Object.defineProperty(exports, "showOperation", { enumerable: true, get: function () { return operations_js_1.showOperation; } });
Object.defineProperty(exports, "syncOperation", { enumerable: true, get: function () { return operations_js_1.syncOperation; } });
Object.defineProperty(exports, "updateOperation", { enumerable: true, get: function () { return operations_js_1.updateOperation; } });
Object.defineProperty(exports, "validateOperation", { enumerable: true, get: function () { return operations_js_1.validateOperation; } });
var atomic_js_1 = require("./atomic.js");
Object.defineProperty(exports, "writeFileAtomic", { enumerable: true, get: function () { return atomic_js_1.writeFileAtomic; } });
var sanitize_js_1 = require("./sanitize.js");
Object.defineProperty(exports, "MAX_HUMAN_ERROR_CHARS", { enumerable: true, get: function () { return sanitize_js_1.MAX_HUMAN_ERROR_CHARS; } });
Object.defineProperty(exports, "MAX_HUMAN_VALUE_CHARS", { enumerable: true, get: function () { return sanitize_js_1.MAX_HUMAN_VALUE_CHARS; } });
Object.defineProperty(exports, "sanitizeHumanError", { enumerable: true, get: function () { return sanitize_js_1.sanitizeHumanError; } });
Object.defineProperty(exports, "sanitizeHumanText", { enumerable: true, get: function () { return sanitize_js_1.sanitizeHumanText; } });
Object.defineProperty(exports, "sanitizeHumanTextUncapped", { enumerable: true, get: function () { return sanitize_js_1.sanitizeHumanTextUncapped; } });
Object.defineProperty(exports, "sanitizeHumanValue", { enumerable: true, get: function () { return sanitize_js_1.sanitizeHumanValue; } });
var convention_js_2 = require("./convention.js");
Object.defineProperty(exports, "parseGeneratedProjectName", { enumerable: true, get: function () { return convention_js_2.parseGeneratedProjectName; } });
Object.defineProperty(exports, "readGeneratedProjectName", { enumerable: true, get: function () { return convention_js_2.readGeneratedProjectName; } });
Object.defineProperty(exports, "readGeneratedState", { enumerable: true, get: function () { return convention_js_2.readGeneratedState; } });
Object.defineProperty(exports, "serializeGeneratedSection", { enumerable: true, get: function () { return convention_js_2.serializeGeneratedSection; } });
Object.defineProperty(exports, "updateGeneratedSection", { enumerable: true, get: function () { return convention_js_2.updateGeneratedSection; } });
var tracker_commit_js_2 = require("./tracker-commit.js");
Object.defineProperty(exports, "commitTrackerMutation", { enumerable: true, get: function () { return tracker_commit_js_2.commitTrackerMutation; } });
Object.defineProperty(exports, "formatCommitLine", { enumerable: true, get: function () { return tracker_commit_js_2.formatCommitLine; } });
Object.defineProperty(exports, "readAutoCommitConfig", { enumerable: true, get: function () { return tracker_commit_js_2.readAutoCommitConfig; } });
Object.defineProperty(exports, "resolveAutoCommit", { enumerable: true, get: function () { return tracker_commit_js_2.resolveAutoCommit; } });
Object.defineProperty(exports, "resolveCommonGitDir", { enumerable: true, get: function () { return tracker_commit_js_2.resolveCommonGitDir; } });
Object.defineProperty(exports, "trackerCommitMessage", { enumerable: true, get: function () { return tracker_commit_js_2.trackerCommitMessage; } });
Object.defineProperty(exports, "trackerGitLockKey", { enumerable: true, get: function () { return tracker_commit_js_2.trackerGitLockKey; } });
Object.defineProperty(exports, "updateCommitMessage", { enumerable: true, get: function () { return tracker_commit_js_2.updateCommitMessage; } });
var list_js_3 = require("./list.js");
Object.defineProperty(exports, "formatListTable", { enumerable: true, get: function () { return list_js_3.formatListTable; } });
Object.defineProperty(exports, "resolveCurrentLogin", { enumerable: true, get: function () { return list_js_3.resolveCurrentLogin; } });
var show_js_2 = require("./show.js");
Object.defineProperty(exports, "DEFAULT_TAIL_COMMENTS", { enumerable: true, get: function () { return show_js_2.DEFAULT_TAIL_COMMENTS; } });
Object.defineProperty(exports, "renderShowText", { enumerable: true, get: function () { return show_js_2.renderShowText; } });
var report_js_2 = require("./report.js");
Object.defineProperty(exports, "formatReportMarkdown", { enumerable: true, get: function () { return report_js_2.formatReportMarkdown; } });
Object.defineProperty(exports, "formatReportTable", { enumerable: true, get: function () { return report_js_2.formatReportTable; } });
var trend_js_3 = require("./trend.js");
Object.defineProperty(exports, "formatTrendMarkdown", { enumerable: true, get: function () { return trend_js_3.formatTrendMarkdown; } });
Object.defineProperty(exports, "formatTrendTable", { enumerable: true, get: function () { return trend_js_3.formatTrendTable; } });
var validate_js_2 = require("./validate.js");
Object.defineProperty(exports, "formatValidateHuman", { enumerable: true, get: function () { return validate_js_2.formatValidateHuman; } });
var get_open_prs_js_1 = require("./get-open-prs.js");
Object.defineProperty(exports, "ghPrListJson", { enumerable: true, get: function () { return get_open_prs_js_1.ghPrListJson; } });
var json_js_2 = require("./json.js");
Object.defineProperty(exports, "bindJsonProgram", { enumerable: true, get: function () { return json_js_2.bindJsonProgram; } });
Object.defineProperty(exports, "emitJson", { enumerable: true, get: function () { return json_js_2.emitJson; } });
Object.defineProperty(exports, "failJson", { enumerable: true, get: function () { return json_js_2.failJson; } });
Object.defineProperty(exports, "jsonEnabled", { enumerable: true, get: function () { return json_js_2.jsonEnabled; } });
Object.defineProperty(exports, "successJson", { enumerable: true, get: function () { return json_js_2.successJson; } });
})

__arggonModules.set("lib/src/issue-roundtrip.ts", (exports, require, module) => {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roundtripComment = roundtripComment;
exports.closeLinkedIssue = closeLinkedIssue;
const node_child_process_1 = require("node:child_process");
const detect_repo_js_1 = require("./detect-repo.js");
function roundtripComment(itemId) {
    return `Resolved via tracker item \`${itemId}\` (arggon tracker; item flipped to done).`;
}
function closeLinkedIssue(root, itemId, issue, execGh = node_child_process_1.execFileSync) {
    const repo = (0, detect_repo_js_1.detectRepo)(root);
    if (!repo) {
        return {
            closed: false,
            issue,
            skipped: "github repo not detected (origin is missing or not a GitHub remote)",
        };
    }
    const slug = `${repo.owner}/${repo.repo}`;
    const opts = {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 30_000,
    };
    try {
        execGh("gh", ["issue", "close", String(issue), "--repo", slug, "--comment", roundtripComment(itemId)], opts);
    }
    catch (err) {
        if (err !== null &&
            typeof err === "object" &&
            "code" in err &&
            (err.code === "ENOENT" || err.code === -2)) {
            return { closed: false, issue, skipped: "gh not found (install gh and run `gh auth login`)" };
        }
        const message = err instanceof Error ? err.message : String(err);
        return { closed: false, issue, skipped: `gh issue close failed (${message})` };
    }
    return { closed: true, issue, repo: slug };
}
})

__arggonModules.set("lib/src/items.ts", (exports, require, module) => {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walkTasksTree = walkTasksTree;
exports.softTryLoadItem = softTryLoadItem;
exports.loadItems = loadItems;
exports.tryLoadItem = tryLoadItem;
exports.itemsById = itemsById;
exports.acceptanceComplete = acceptanceComplete;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const frontmatter_js_1 = require("./frontmatter.js");
const ids_js_1 = require("./ids.js");
const paths_js_1 = require("./paths.js");
const status_js_1 = require("./status.js");
const OFFICIAL_KEYS = new Set([
    "type",
    "status",
    "id",
    "title",
    "assignee",
    "branch",
    "parent",
    "labels",
    "priority",
    "created",
    "updated",
    "blocked_reason",
]);
const PROTOTYPE_KEYS = new Set(["milestone", "depends_on", "claimed_at", "worktree_path", "issue"]);
function walkTasksTree(dir, opts) {
    const files = [];
    const dirs = [];
    if (!(0, node_fs_1.existsSync)(dir))
        return { files, dirs };
    const skip = new Set((opts?.skipDirs ?? (0, paths_js_1.trackerNonItemDirs)(dir)).map((d) => (0, node_path_1.resolve)(d)));
    const stack = [dir];
    while (stack.length > 0) {
        const cur = stack.pop();
        for (const name of (0, node_fs_1.readdirSync)(cur)) {
            if (name.startsWith("."))
                continue;
            const full = (0, node_path_1.join)(cur, name);
            if (skip.has((0, node_path_1.resolve)(full)))
                continue;
            const st = (0, node_fs_1.statSync)(full);
            if (st.isDirectory()) {
                dirs.push(full);
                stack.push(full);
            }
            else {
                files.push(full);
            }
        }
    }
    return { files, dirs };
}
function softTryLoadItem(filePath) {
    let raw;
    try {
        raw = (0, node_fs_1.readFileSync)(filePath, "utf8");
    }
    catch (err) {
        return {
            kind: "fatal",
            issues: [{ code: "READ_FAILED", message: err instanceof Error ? err.message : String(err) }],
        };
    }
    if (!raw.startsWith("---"))
        return { kind: "skip" };
    let data;
    let body;
    try {
        ({ data, body } = (0, frontmatter_js_1.parseFrontmatter)(raw));
    }
    catch (err) {
        return {
            kind: "fatal",
            issues: [{ code: "BROKEN_YAML", message: err instanceof Error ? err.message : String(err) }],
        };
    }
    const typeRaw = (0, frontmatter_js_1.stringField)(data, "type");
    if (!typeRaw)
        return { kind: "skip" };
    if (!(0, ids_js_1.isItemType)(typeRaw)) {
        return {
            kind: "fatal",
            issues: [{ code: "UNKNOWN_TYPE", message: `unknown type '${typeRaw}'` }],
        };
    }
    const issues = [];
    const id = (0, frontmatter_js_1.stringField)(data, "id");
    if (!id) {
        return {
            kind: "fatal",
            issues: [{ code: "MISSING_ID", message: "missing required field id" }],
        };
    }
    const statusRaw = (0, frontmatter_js_1.stringField)(data, "status");
    if (!statusRaw) {
        return {
            kind: "fatal",
            issues: [{ code: "MISSING_STATUS", message: "missing required field status" }],
        };
    }
    if (!(0, status_js_1.isStatus)(statusRaw)) {
        return {
            kind: "fatal",
            issues: [{ code: "UNKNOWN_STATUS", message: `unknown status '${statusRaw}'` }],
        };
    }
    let labels = [];
    try {
        labels = (0, frontmatter_js_1.stringArrayField)(data, "labels");
    }
    catch (err) {
        issues.push({
            code: "INVALID_LABELS",
            message: err instanceof Error ? err.message : String(err),
        });
    }
    let dependsOn = [];
    try {
        dependsOn = (0, frontmatter_js_1.stringArrayField)(data, "depends_on");
    }
    catch (err) {
        issues.push({
            code: "INVALID_DEPENDS_ON",
            message: err instanceof Error ? err.message : String(err),
        });
    }
    const priority = (0, frontmatter_js_1.stringField)(data, "priority") ?? null;
    const extras = {};
    const unknownKeys = [];
    for (const [k, v] of Object.entries(data)) {
        if (!OFFICIAL_KEYS.has(k)) {
            extras[k] = v;
            if (!k.startsWith("x-") && k !== "extensions" && !PROTOTYPE_KEYS.has(k)) {
                unknownKeys.push(k);
            }
        }
    }
    const item = {
        type: typeRaw,
        status: statusRaw,
        id,
        title: (0, frontmatter_js_1.stringField)(data, "title"),
        assignee: (0, frontmatter_js_1.stringField)(data, "assignee") ?? null,
        branch: (0, frontmatter_js_1.stringField)(data, "branch"),
        parent: (0, frontmatter_js_1.stringField)(data, "parent") ?? null,
        labels,
        priority,
        created: (0, frontmatter_js_1.stringField)(data, "created"),
        updated: (0, frontmatter_js_1.stringField)(data, "updated"),
        blockedReason: (0, frontmatter_js_1.stringField)(data, "blocked_reason"),
        milestone: (0, frontmatter_js_1.stringField)(data, "milestone") ?? null,
        dependsOn,
        claimedAt: (0, frontmatter_js_1.stringField)(data, "claimed_at") ?? null,
        worktreePath: (0, frontmatter_js_1.stringField)(data, "worktree_path") ?? null,
        issue: (0, frontmatter_js_1.numberField)(data, "issue") ?? null,
        extras,
        filePath,
        containerDir: (0, node_path_1.dirname)(filePath),
        data,
        body,
    };
    return { kind: "item", item, issues, unknownKeys };
}
function loadItems(tasksDir, opts) {
    const items = [];
    walk(tasksDir, items, new Set((opts?.skipDirs ?? (0, paths_js_1.trackerNonItemDirs)(tasksDir)).map((d) => (0, node_path_1.resolve)(d))));
    return items;
}
function walk(dir, items, skip) {
    if (!(0, node_fs_1.existsSync)(dir))
        return;
    for (const name of (0, node_fs_1.readdirSync)(dir)) {
        if (name.startsWith("."))
            continue;
        const full = (0, node_path_1.join)(dir, name);
        if (skip.has((0, node_path_1.resolve)(full)))
            continue;
        const st = (0, node_fs_1.statSync)(full);
        if (st.isDirectory()) {
            walk(full, items, skip);
            continue;
        }
        if (!name.endsWith(".md"))
            continue;
        const item = tryLoadItem(full);
        if (item)
            items.push(item);
    }
}
function tryLoadItem(filePath) {
    const result = softTryLoadItem(filePath);
    if (result.kind === "skip")
        return null;
    if (result.kind === "fatal") {
        if (result.issues.some((i) => i.code === "UNKNOWN_TYPE"))
            return null;
        throw new Error(`${filePath}: ${result.issues[0]?.message ?? "invalid work item"}`);
    }
    if (result.issues.length > 0) {
        const strictErr = result.issues.find((i) => i.code === "INVALID_LABELS" || i.code === "INVALID_DEPENDS_ON");
        if (strictErr)
            throw new Error(`${filePath}: ${strictErr.message}`);
    }
    return result.item;
}
function itemsById(items) {
    const map = new Map();
    for (const item of items) {
        const prev = map.get(item.id);
        if (prev) {
            throw new Error(`Duplicate id '${item.id}' under the tracker (${prev.filePath} and ${item.filePath})`);
        }
        map.set(item.id, item);
    }
    return map;
}
function acceptanceComplete(body) {
    const criteria = [...body.matchAll(/^[ \t]*[-*] \[( |x|X)\][ \t]*[^\s]/gm)];
    if (criteria.length === 0)
        return true;
    return criteria.every((match) => match[1] !== " ");
}
})

__arggonModules.set("lib/src/json.ts", (exports, require, module) => {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JSON_SCHEMA_VERSION = void 0;
exports.bindJsonProgram = bindJsonProgram;
exports.jsonEnabled = jsonEnabled;
exports.compactWorkItem = compactWorkItem;
exports.emitJson = emitJson;
exports.failEnvelope = failEnvelope;
exports.failJson = failJson;
exports.successEnvelope = successEnvelope;
exports.successJson = successJson;
const convention_js_1 = require("./convention.js");
exports.JSON_SCHEMA_VERSION = 1;
let boundProgram;
function bindJsonProgram(program) {
    boundProgram = program;
}
function jsonEnabled(cmdOpts) {
    if (cmdOpts && cmdOpts.json)
        return true;
    return Boolean(boundProgram?.opts().json);
}
const COMPACT_OMIT_WHEN_NULL = [
    "blocked_reason",
    "milestone",
    "worktree_path",
    "issue",
    "priority",
];
const COMPACT_OMIT_WHEN_EMPTY = ["depends_on", "labels"];
function compactWorkItem(item) {
    const out = { ...item };
    for (const key of COMPACT_OMIT_WHEN_NULL) {
        if (out[key] === null)
            delete out[key];
    }
    for (const key of COMPACT_OMIT_WHEN_EMPTY) {
        if (Array.isArray(out[key]) && out[key].length === 0)
            delete out[key];
    }
    return out;
}
function emitJson(obj) {
    process.stdout.write(`${JSON.stringify(obj)}\n`);
}
function failEnvelope(opts) {
    const error = { message: opts.message };
    if (opts.code !== undefined) {
        error.code = opts.code;
    }
    return {
        ok: false,
        schemaVersion: exports.JSON_SCHEMA_VERSION,
        conventionVersion: opts.conventionVersion ?? convention_js_1.CONVENTION_VERSION_DEFAULT,
        command: opts.command,
        error,
    };
}
function failJson(opts) {
    emitJson(failEnvelope(opts));
    process.exitCode = 1;
}
function successEnvelope(command, payload = {}, conventionVersion = convention_js_1.CONVENTION_VERSION_DEFAULT) {
    return {
        ok: true,
        schemaVersion: exports.JSON_SCHEMA_VERSION,
        conventionVersion,
        command,
        ...payload,
    };
}
function successJson(command, payload = {}, conventionVersion = convention_js_1.CONVENTION_VERSION_DEFAULT) {
    emitJson(successEnvelope(command, payload, conventionVersion));
}
})

__arggonModules.set("lib/src/list.ts", (exports, require, module) => {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveCurrentLoginDetailed = resolveCurrentLoginDetailed;
exports.resolveCurrentLogin = resolveCurrentLogin;
exports.parseOlderThan = parseOlderThan;
exports.runList = runList;
exports.formatListTable = formatListTable;
const node_child_process_1 = require("node:child_process");
const convention_js_1 = require("./convention.js");
const filter_js_1 = require("./filter.js");
const ids_js_1 = require("./ids.js");
const items_js_1 = require("./items.js");
const priority_js_1 = require("./priority.js");
const paths_js_1 = require("./paths.js");
const sanitize_js_1 = require("./sanitize.js");
const status_js_1 = require("./status.js");
function ghLogin(env) {
    try {
        const out = (0, node_child_process_1.execFileSync)("gh", ["api", "user", "-q", ".login"], {
            encoding: "utf8",
            timeout: 15_000,
            stdio: ["ignore", "pipe", "ignore"],
            env,
        }).trim();
        return out ? { login: out } : { gap: "gh-failed" };
    }
    catch (err) {
        const code = err?.code;
        return code === "ENOENT" ? { gap: "gh-not-found" } : { gap: "gh-failed" };
    }
}
function gitIdentity(env) {
    try {
        return ((0, node_child_process_1.execFileSync)("git", ["config", "user.name"], {
            encoding: "utf8",
            timeout: 5_000,
            stdio: ["ignore", "pipe", "ignore"],
            env,
        }).trim() || undefined);
    }
    catch {
        return undefined;
    }
}
function resolveCurrentLoginDetailed(env = process.env) {
    const user = env.GITHUB_USER?.trim();
    if (user)
        return { login: user, source: "GITHUB_USER" };
    const actor = env.GITHUB_ACTOR?.trim();
    if (actor)
        return { login: actor, source: "GITHUB_ACTOR" };
    const childEnv = { ...process.env, ...env };
    const gh = ghLogin(childEnv);
    if ("login" in gh)
        return { login: gh.login, source: "gh" };
    const local = gitIdentity(childEnv);
    if (local)
        return { login: local, source: "git-config" };
    return { login: undefined, gap: gh.gap };
}
function resolveCurrentLogin(env = process.env) {
    return resolveCurrentLoginDetailed(env).login;
}
const OLDER_THAN_PATTERN = /^(\d+)([dhm])$/;
const UNIT_MS = { d: 86_400_000, h: 3_600_000, m: 60_000 };
function parseOlderThan(raw) {
    const match = OLDER_THAN_PATTERN.exec(raw.trim());
    if (!match) {
        throw new Error(`invalid --older-than duration "${raw}" (expected <number><d|h|m>, e.g. 7d, 12h, 30m)`);
    }
    return Number(match[1]) * UNIT_MS[match[2]];
}
function runList(opts, deps = {}) {
    if (opts.type !== undefined && !(0, ids_js_1.isItemType)(opts.type)) {
        throw new Error(`unknown type "${opts.type}". Allowed: ${ids_js_1.ITEM_TYPES.join(", ")}`);
    }
    if (opts.status !== undefined && !(0, status_js_1.isStatus)(opts.status)) {
        throw new Error(`unknown status "${opts.status}". Allowed: ${status_js_1.STATUSES.join(", ")}`);
    }
    let staleMs;
    if (opts.stale === true || opts.olderThan !== undefined) {
        if (opts.stale !== true) {
            throw new Error("--older-than requires --stale (list stale claims)");
        }
        if (opts.olderThan === undefined) {
            throw new Error('--stale requires --older-than <duration> (e.g. "7d", "12h", "30m")');
        }
        staleMs = parseOlderThan(opts.olderThan);
    }
    const env = deps.env ?? process.env;
    const resolveMe = deps.resolveMe ?? (() => resolveCurrentLogin(env));
    let assigneeFilter = opts.assignee;
    if (assigneeFilter === "@me") {
        const login = resolveMe();
        if (!login) {
            throw new Error("could not resolve @me (set GITHUB_USER or GITHUB_ACTOR, or authenticate gh: gh api user)");
        }
        assigneeFilter = login;
    }
    const validatePredicates = (preds) => {
        for (const pred of preds) {
            if (pred.field === "type" && !(0, ids_js_1.isItemType)(pred.value)) {
                throw new Error(`unknown type "${pred.value}". Allowed: ${ids_js_1.ITEM_TYPES.join(", ")}`);
            }
            if (pred.field === "status" && !(0, status_js_1.isStatus)(pred.value)) {
                throw new Error(`unknown status "${pred.value}". Allowed: ${status_js_1.STATUSES.join(", ")}`);
            }
            if (pred.field === "priority" && pred.value !== "none" && !(0, priority_js_1.isPriority)(pred.value)) {
                throw new Error(`unknown priority "${pred.value}". Allowed: ${priority_js_1.PRIORITIES.join(", ")}, none`);
            }
            if (pred.field === "assignee" && pred.value === "@me") {
                const login = resolveMe();
                if (!login) {
                    throw new Error("could not resolve @me (set GITHUB_USER or GITHUB_ACTOR, or authenticate gh: gh api user)");
                }
                pred.value = login;
            }
        }
        return preds;
    };
    const tasksDir = (0, paths_js_1.findTasksDir)(opts.cwd);
    const repoRoot = (0, paths_js_1.repoRootFromTasks)(tasksDir);
    const predicates = [];
    if (opts.view !== undefined) {
        const { views } = (0, convention_js_1.readConventionConfig)(repoRoot);
        const expr = views[opts.view];
        if (expr === undefined) {
            const known = Object.keys(views);
            throw new Error(known.length === 0
                ? `unknown view "${opts.view}" (no saved views defined in the tracker .convention.yml x-views)`
                : `unknown view "${opts.view}". Known views: ${known.join(", ")}`);
        }
        predicates.push(...validatePredicates((0, filter_js_1.parseFilter)(expr)));
    }
    if (opts.filter !== undefined) {
        predicates.push(...validatePredicates((0, filter_js_1.parseFilter)(opts.filter)));
    }
    const allItems = (0, items_js_1.loadItems)(tasksDir);
    if (opts.parent !== undefined && !allItems.some((item) => item.id === opts.parent)) {
        throw new Error(`unknown parent "${opts.parent}" (no work item with that id in the tracker)`);
    }
    const blockedByIndex = (0, filter_js_1.buildBlockedByIndex)(allItems);
    const ancestorIndex = (0, filter_js_1.buildAncestorIndex)(allItems);
    const nowMs = (opts.now ?? new Date()).getTime();
    const items = allItems
        .filter((item) => {
        if (opts.type !== undefined && item.type !== opts.type)
            return false;
        if (opts.status !== undefined && item.status !== opts.status)
            return false;
        if (assigneeFilter !== undefined && (item.assignee ?? null) !== assigneeFilter)
            return false;
        if (opts.parent !== undefined && (item.parent ?? null) !== opts.parent)
            return false;
        if (staleMs !== undefined) {
            if (!(0, status_js_1.isClaimed)(item.type, item.status, item.assignee))
                return false;
            const claimedMs = item.claimedAt ? Date.parse(item.claimedAt) : Number.NaN;
            const isStale = Number.isNaN(claimedMs) || nowMs - claimedMs > staleMs;
            if (!isStale)
                return false;
        }
        for (const pred of predicates) {
            if (!(0, filter_js_1.matchesPredicate)(item, pred, blockedByIndex, ancestorIndex))
                return false;
        }
        return true;
    })
        .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    return { root: repoRoot, items };
}
function formatListTable(items) {
    const headers = ["id", "type", "status", "assignee", "branch", "title"];
    const rows = items.map((item) => [
        (0, sanitize_js_1.sanitizeHumanTextUncapped)(item.id),
        item.type,
        item.status,
        (0, sanitize_js_1.sanitizeHumanTextUncapped)(item.assignee ?? "-"),
        (0, sanitize_js_1.sanitizeHumanTextUncapped)(item.branch ?? "-"),
        (0, sanitize_js_1.sanitizeHumanTextUncapped)(item.title ?? item.id),
    ]);
    const all = [headers.map((h) => h), ...rows];
    const widths = headers.map((_, col) => Math.max(...all.map((row) => row[col].length)));
    const lines = all.map((row) => row.map((cell, i) => (i === row.length - 1 ? cell : cell.padEnd(widths[i]))).join("  "));
    return `${lines.join("\n")}\n`;
}
})

__arggonModules.set("lib/src/lock.ts", (exports, require, module) => {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOCK_STALE_MS = exports.LOCK_TIMEOUT_MS = void 0;
exports.lockFilePathFor = lockFilePathFor;
exports.withItemLock = withItemLock;
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
exports.LOCK_TIMEOUT_MS = 10_000;
exports.LOCK_STALE_MS = 60_000;
const RETRY_MS = 75;
function lockFilePathFor(itemFilePath) {
    const abs = (0, node_path_1.resolve)(itemFilePath);
    const hash = (0, node_crypto_1.createHash)("sha1").update(abs).digest("hex");
    return (0, node_path_1.join)((0, node_os_1.tmpdir)(), `arggon-lock-${hash}.lock`);
}
function readLockInfo(lockPath) {
    try {
        const parsed = JSON.parse((0, node_fs_1.readFileSync)(lockPath, "utf8"));
        if (typeof parsed.pid === "number" && typeof parsed.acquiredAt === "string") {
            return { pid: parsed.pid, acquiredAt: parsed.acquiredAt };
        }
    }
    catch {
    }
    return null;
}
function sleepSync(ms) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}
function withItemLock(itemFilePath, fn, opts = {}) {
    const timeoutMs = opts.timeoutMs ?? exports.LOCK_TIMEOUT_MS;
    const now = opts.now ?? (() => Date.now());
    const lockPath = lockFilePathFor(itemFilePath);
    const held = readLockInfo(lockPath);
    if (held && held.pid === process.pid)
        return fn();
    const deadline = now() + timeoutMs;
    for (;;) {
        let fd;
        try {
            fd = (0, node_fs_1.openSync)(lockPath, "wx");
        }
        catch (err) {
            if (err.code !== "EEXIST")
                throw err;
        }
        if (fd !== undefined) {
            try {
                (0, node_fs_1.writeFileSync)(fd, JSON.stringify({ pid: process.pid, acquiredAt: new Date(now()).toISOString() }));
                return fn();
            }
            finally {
                try {
                    (0, node_fs_1.unlinkSync)(lockPath);
                }
                catch {
                }
                try {
                    (0, node_fs_1.closeSync)(fd);
                }
                catch {
                }
            }
        }
        let acquiredMs;
        try {
            const info = readLockInfo(lockPath);
            acquiredMs = info ? Date.parse(info.acquiredAt) : (0, node_fs_1.statSync)(lockPath).mtimeMs;
        }
        catch {
            continue;
        }
        const age = now() - acquiredMs;
        if (Number.isNaN(age) || age > exports.LOCK_STALE_MS) {
            try {
                (0, node_fs_1.unlinkSync)(lockPath);
            }
            catch {
            }
            continue;
        }
        if (now() >= deadline) {
            throw new Error(`failed to acquire lock for ${(0, node_path_1.basename)(itemFilePath)} after ${Math.round(timeoutMs / 1000)}s ` +
                `(another arggon process may hold it)`);
        }
        sleepSync(RETRY_MS);
    }
}
})

__arggonModules.set("lib/src/next.ts", (exports, require, module) => {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openDependencies = openDependencies;
exports.isReady = isReady;
exports.downstreamWeight = downstreamWeight;
exports.runNext = runNext;
const status_js_1 = require("./status.js");
const items_js_1 = require("./items.js");
const paths_js_1 = require("./paths.js");
const filter_js_1 = require("./filter.js");
const priority_js_1 = require("./priority.js");
const TERMINAL_STATUSES = new Set(["done", "cancelled"]);
function openDependencies(item, byId) {
    return item.dependsOn.filter((depId) => {
        const dep = byId.get(depId);
        return !dep || !TERMINAL_STATUSES.has(dep.status);
    });
}
function isReady(item, byId) {
    return openDependencies(item, byId).length === 0;
}
function downstreamWeight(id, blockedByIndex) {
    const seen = new Set([id]);
    const stack = [id];
    let count = 0;
    while (stack.length > 0) {
        const current = stack.pop();
        for (const dependent of blockedByIndex.get(current) ?? []) {
            if (seen.has(dependent))
                continue;
            seen.add(dependent);
            count += 1;
            stack.push(dependent);
        }
    }
    return count;
}
function runNext(opts) {
    const tasksDir = (0, paths_js_1.findTasksDir)(opts.cwd);
    const root = (0, paths_js_1.repoRootFromTasks)(tasksDir);
    const items = (0, items_js_1.loadItems)(tasksDir);
    const byId = (0, items_js_1.itemsById)(items);
    const blockedByIndex = (0, filter_js_1.buildBlockedByIndex)(items);
    const lexicographic = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    const todos = items
        .filter((item) => (0, status_js_1.isClaimable)(item.type) &&
        item.status === "todo" &&
        (item.assignee ?? null) === null &&
        (opts.includeStories || item.type !== "story"))
        .sort(lexicographic);
    const ready = todos.filter((item) => openDependencies(item, byId).length === 0);
    const blocked = todos.filter((item) => openDependencies(item, byId).length > 0);
    const priorityTier = (item) => item.priority ? (0, priority_js_1.priorityRank)(item.priority) : (0, priority_js_1.priorityRank)("p3");
    const rankedReady = ready
        .map((item) => ({ item, weight: downstreamWeight(item.id, blockedByIndex) }))
        .sort((a, b) => priorityTier(a.item) - priorityTier(b.item) ||
        b.weight - a.weight ||
        lexicographic(a.item, b.item))
        .map((entry) => entry.item);
    const pool = opts.ready ? rankedReady : [...rankedReady, ...blocked];
    if (pool.length === 0)
        return { root, suggestion: null };
    const item = pool[0];
    const chain = [];
    const seen = new Set([item.id]);
    let parentId = item.parent ?? null;
    while (parentId && !seen.has(parentId)) {
        seen.add(parentId);
        const parent = byId.get(parentId);
        if (!parent)
            break;
        chain.unshift(parent);
        parentId = parent.parent ?? null;
    }
    const parentChain = chain.map((p) => p.id);
    const parentChainDisplay = chain.map((p) => `${p.id} (${p.title ?? p.id})`);
    const where = parentChainDisplay.length > 0 ? ` under ${parentChainDisplay.join(" > ")}` : "";
    const blockedBy = openDependencies(item, byId);
    const unblocks = downstreamWeight(item.id, blockedByIndex);
    const blockedNote = blockedBy.length > 0
        ? `no ready candidate ranks above it; blocked by ${blockedBy.join(", ")} (open dependencies); `
        : "";
    const priorityNote = item.priority
        ? `priority ${item.priority} first, `
        : `unprioritized (ranks with the p3 tier), `;
    const weightNote = blockedBy.length === 0 && unblocks > 0
        ? `unblocks ${unblocks} item${unblocks === 1 ? "" : "s"} downstream; `
        : "";
    const readyNote = opts.ready
        ? `; --ready limits the pool to items whose depends_on are all terminal`
        : "";
    const storiesNote = opts.includeStories
        ? `; stories included via --include-stories`
        : `; stories excluded by default (--include-stories to include them)`;
    const reason = `unclaimed todo ${item.type}${where}; ${priorityNote}${weightNote}${blockedNote}` +
        `ranking: priority first (unprioritized with p3), downstream weight within a priority, ` +
        `lexicographic id on ties, among ${pool.length} candidate(s) ` +
        `(skipped claimed, non-claimable, and non-todo items${storiesNote}${readyNote})`;
    return {
        root,
        suggestion: {
            item,
            parentChain,
            parentChainDisplay,
            reason,
            poolSize: pool.length,
            blockedBy,
            unblocks,
        },
    };
}
})

__arggonModules.set("lib/src/operations.ts", (exports, require, module) => {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listOperation = listOperation;
exports.showOperation = showOperation;
exports.nextOperation = nextOperation;
exports.reportOperation = reportOperation;
exports.validateOperation = validateOperation;
exports.createOperation = createOperation;
exports.updateOperation = updateOperation;
exports.commentOperation = commentOperation;
exports.handoffOperation = handoffOperation;
exports.priorityOperation = priorityOperation;
exports.syncOperation = syncOperation;
exports.importIssuesOperation = importIssuesOperation;
const node_path_1 = require("node:path");
const convention_js_1 = require("./convention.js");
const contract_js_1 = require("./contract.js");
const create_js_1 = require("./create.js");
const comment_js_1 = require("./comment.js");
const handoff_js_1 = require("./handoff.js");
const import_issues_js_1 = require("./import-issues.js");
const json_js_1 = require("./json.js");
const list_js_1 = require("./list.js");
const next_js_1 = require("./next.js");
const priority_js_1 = require("./priority.js");
const report_js_1 = require("./report.js");
const show_js_1 = require("./show.js");
const sync_command_js_1 = require("./sync-command.js");
const tracker_commit_js_1 = require("./tracker-commit.js");
const trend_js_1 = require("./trend.js");
const update_js_1 = require("./update.js");
const validate_js_1 = require("./validate.js");
function succeed(command, payload, conventionVersion) {
    return {
        ok: true,
        envelope: (0, json_js_1.successEnvelope)(command, payload, conventionVersion),
        exitCode: 0,
    };
}
function fail(command, cwd, code, err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return {
        ok: false,
        envelope: (0, json_js_1.failEnvelope)({
            command,
            message: error.message,
            code,
            conventionVersion: (0, convention_js_1.readConventionVersion)(cwd),
        }),
        exitCode: 1,
        error,
    };
}
function listOperation(opts) {
    try {
        const result = (0, list_js_1.runList)(opts);
        return succeed("list", {
            items: result.items.map((item) => (0, contract_js_1.toContractWorkItem)(item, result.root, { full: opts.full === true })),
        }, (0, convention_js_1.readConventionVersion)(result.root));
    }
    catch (err) {
        return fail("list", opts.cwd, "LIST_FAILED", err);
    }
}
function showOperation(opts) {
    try {
        const result = (0, show_js_1.runShow)(opts);
        return succeed("show", {
            item: (0, contract_js_1.toContractWorkItem)(result.item, result.root),
            path: result.path,
            ...(opts.body === true
                ? { body: result.item.body, comments: result.allComments.map((c) => ({ ...c })) }
                : { comments: result.comments.map((c) => ({ ...c })) }),
        }, (0, convention_js_1.readConventionVersion)(result.root));
    }
    catch (err) {
        return fail("show", opts.cwd, "SHOW_FAILED", err);
    }
}
function nextOperation(opts) {
    try {
        const result = (0, next_js_1.runNext)(opts);
        const suggestion = result.suggestion
            ? {
                item: (0, contract_js_1.toContractWorkItem)(result.suggestion.item, result.root),
                parentChain: result.suggestion.parentChain,
                reason: result.suggestion.reason,
                blockedBy: result.suggestion.blockedBy,
                unblocks: result.suggestion.unblocks,
            }
            : null;
        return succeed("next", { suggestion }, (0, convention_js_1.readConventionVersion)(result.root));
    }
    catch (err) {
        return fail("next", opts.cwd, "NEXT_FAILED", err);
    }
}
function reportOperation(opts) {
    try {
        if (opts.since !== undefined && opts.trend !== true) {
            throw new Error("--since requires --trend");
        }
        let trend = null;
        if (opts.trend === true) {
            try {
                trend = (0, trend_js_1.runTrend)({ cwd: opts.cwd, since: opts.since });
            }
            catch (err) {
                return fail("report", opts.cwd, "TREND_FAILED", err);
            }
        }
        const result = (0, report_js_1.runReport)({ cwd: opts.cwd });
        const payload = { groups: result.groups };
        if (trend)
            payload.trend = trend;
        return succeed("report", payload, (0, convention_js_1.readConventionVersion)(result.root));
    }
    catch (err) {
        return fail("report", opts.cwd, "REPORT_FAILED", err);
    }
}
function validateOperation(opts) {
    try {
        const result = (0, validate_js_1.runValidate)({ cwd: opts.cwd });
        const payload = {
            ok: result.errors.length === 0,
            layout: result.layout,
            errors: result.errors,
            warnings: result.warnings,
        };
        const envelope = (0, json_js_1.successEnvelope)("validate", {
            ...payload,
            ...(result.errors.length > 0
                ? {
                    error: {
                        message: `validate failed with ${result.errors.length} error(s)`,
                        code: "VALIDATE_FAILED",
                    },
                }
                : {}),
        }, result.conventionVersion);
        return result.errors.length === 0
            ? { ok: true, envelope: envelope, exitCode: 0 }
            : { ok: false, envelope: envelope, exitCode: 1 };
    }
    catch (err) {
        return fail("validate", opts.cwd, "VALIDATE_FAILED", err);
    }
}
function createOperation(opts) {
    try {
        const result = (0, create_js_1.runCreate)(opts);
        return succeed("create", {
            path: relativePath(result.root, result.path),
            item: (0, contract_js_1.toContractWorkItem)(result.item, result.root, { full: opts.full === true }),
            commit: (0, tracker_commit_js_1.commitPayload)(result.commit),
        }, (0, convention_js_1.readConventionVersion)(result.root));
    }
    catch (err) {
        return fail("create", opts.cwd, "CREATE_FAILED", err);
    }
}
function updateOperation(opts) {
    try {
        const result = (0, update_js_1.runUpdate)(opts);
        const commit = (0, update_js_1.maybeCommitUpdate)(result, opts.commit);
        return succeed("update", {
            item: (0, contract_js_1.toContractWorkItem)(result.item, result.root, { full: opts.full === true }),
            autoCompleted: result.autoCompleted,
            cascadeLevels: result.cascadeLevels,
            ...(result.movedFrom ? { movedFrom: result.movedFrom } : {}),
            ...(result.renamedFrom ? { renamedFrom: result.renamedFrom } : {}),
            cascadeSkipped: result.cascadeSkipped,
            ...(result.issueRoundtrip ? { issueRoundtrip: result.issueRoundtrip } : {}),
            ...(commit ? { commit: (0, tracker_commit_js_1.commitPayload)(commit) } : {}),
        }, (0, convention_js_1.readConventionVersion)(result.root));
    }
    catch (err) {
        return fail("update", opts.cwd, "UPDATE_FAILED", err);
    }
}
function commentOperation(opts) {
    try {
        const result = (0, comment_js_1.runComment)(opts);
        return succeed("comment", {
            id: result.id,
            path: result.path,
            comment: result.comment,
            commit: (0, tracker_commit_js_1.commitPayload)(result.commit),
        }, (0, convention_js_1.readConventionVersion)(result.root));
    }
    catch (err) {
        return fail("comment", opts.cwd, "COMMENT_FAILED", err);
    }
}
function handoffOperation(opts) {
    try {
        const result = (0, handoff_js_1.runHandoff)(opts);
        return succeed("handoff", {
            id: result.id,
            path: result.path,
            comment: result.comment,
            handoff: result.handoff,
            commit: (0, tracker_commit_js_1.commitPayload)(result.commit),
        }, (0, convention_js_1.readConventionVersion)(result.root));
    }
    catch (err) {
        return fail("handoff", opts.cwd, "COMMENT_FAILED", err);
    }
}
function priorityOperation(opts) {
    try {
        const result = (0, priority_js_1.runPriorityMigrate)(opts);
        return succeed("priority", {
            dryRun: result.dryRun,
            scanned: result.scanned,
            changed: result.changed,
            entries: result.entries,
        }, (0, convention_js_1.readConventionVersion)(result.root));
    }
    catch (err) {
        return fail("priority", opts.cwd, "PRIORITY_FAILED", err);
    }
}
function syncOperation(opts) {
    try {
        const result = (0, sync_command_js_1.runSync)(opts);
        const payload = {
            mode: result.mode,
            matched: result.matched,
            unmatched: result.unmatched,
            pending: result.pending,
            ambiguous: result.ambiguous,
            suggestions: result.suggestions,
            filled: result.filled,
            verdicts: result.verdicts,
            errors: result.errors,
            exit_code: result.exit_code,
        };
        if (result.errors.length > 0) {
            const error = new Error(result.errors.join("; "));
            return {
                ok: false,
                envelope: (0, json_js_1.failEnvelope)({
                    command: "sync",
                    message: error.message,
                    code: "SYNC_FAILED",
                    conventionVersion: (0, convention_js_1.readConventionVersion)(opts.cwd),
                }),
                exitCode: result.exit_code === 0 ? 0 : 1,
                error,
            };
        }
        return {
            ok: true,
            envelope: (0, json_js_1.successEnvelope)("sync", payload, (0, convention_js_1.readConventionVersion)(opts.cwd)),
            exitCode: result.exit_code === 0 ? 0 : 1,
        };
    }
    catch (err) {
        return fail("sync", opts.cwd, "SYNC_FAILED", err);
    }
}
function importIssuesOperation(opts) {
    try {
        const result = (0, import_issues_js_1.runImportIssues)(opts);
        return succeed("import-issues", {
            dryRun: result.dryRun,
            story: result.story,
            entries: result.entries,
            created: result.created,
            skipped: result.skipped,
            labels: { mapped: result.labelsMapped, skipped: result.labelsSkipped },
            ...(result.commit ? { commit: (0, tracker_commit_js_1.commitPayload)(result.commit) } : {}),
        }, (0, convention_js_1.readConventionVersion)(result.root));
    }
    catch (err) {
        return fail("import-issues", opts.cwd, "IMPORT_FAILED", err);
    }
}
function relativePath(root, path) {
    return (0, node_path_1.relative)(root, path).split(node_path_1.sep).join("/");
}
})

__arggonModules.set("lib/src/paths.ts", (exports, require, module) => {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONVENTION_FILE_NAME = exports.LEGACY_TRACKER_DIR_NAME = exports.TRACKER_DIR_NAME = void 0;
exports.trackerAt = trackerAt;
exports.findTrackerLocation = findTrackerLocation;
exports.findTasksDir = findTasksDir;
exports.repoRootFromTasks = repoRootFromTasks;
exports.docsDirForRoot = docsDirForRoot;
exports.conventionPathForRoot = conventionPathForRoot;
exports.conventionPathForLayout = conventionPathForLayout;
exports.trackerNonItemDirs = trackerNonItemDirs;
exports.newItemPath = newItemPath;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
exports.TRACKER_DIR_NAME = "ArggonManager";
exports.LEGACY_TRACKER_DIR_NAME = "tasks";
exports.CONVENTION_FILE_NAME = ".convention.yml";
function locationAt(repoRoot, name, layout) {
    const dir = (0, node_path_1.join)(repoRoot, name);
    return {
        dir,
        repoRoot,
        name,
        layout,
        legacy: layout === "legacy",
        docsDir: layout === "legacy" ? (0, node_path_1.join)(repoRoot, "docs") : (0, node_path_1.join)(dir, "docs"),
        conventionPath: (0, node_path_1.join)(dir, exports.CONVENTION_FILE_NAME),
    };
}
function trackerAt(root) {
    if ((0, node_fs_1.existsSync)((0, node_path_1.join)(root, exports.TRACKER_DIR_NAME, exports.CONVENTION_FILE_NAME))) {
        return locationAt(root, exports.TRACKER_DIR_NAME, "arggon-manager");
    }
    if ((0, node_fs_1.existsSync)((0, node_path_1.join)(root, exports.LEGACY_TRACKER_DIR_NAME, exports.CONVENTION_FILE_NAME))) {
        return locationAt(root, exports.LEGACY_TRACKER_DIR_NAME, "legacy");
    }
    return null;
}
function findTrackerLocation(startDir) {
    let dir = (0, node_path_1.resolve)(startDir);
    for (;;) {
        const found = trackerAt(dir);
        if (found)
            return found;
        const parent = (0, node_path_1.dirname)(dir);
        if (parent === dir) {
            throw new Error(`No ${exports.TRACKER_DIR_NAME}/ convention found (legacy ${exports.LEGACY_TRACKER_DIR_NAME}/ also checked). ` +
                "Run `arggon init` first.");
        }
        dir = parent;
    }
}
function findTasksDir(startDir) {
    return findTrackerLocation(startDir).dir;
}
function repoRootFromTasks(tasksDir) {
    return (0, node_path_1.dirname)(tasksDir);
}
function docsDirForRoot(root) {
    return trackerAt(root)?.docsDir ?? (0, node_path_1.join)(root, "docs");
}
function conventionPathForRoot(root) {
    return (trackerAt(root)?.conventionPath ?? (0, node_path_1.join)(root, exports.LEGACY_TRACKER_DIR_NAME, exports.CONVENTION_FILE_NAME));
}
function conventionPathForLayout(root, layout) {
    const name = layout === "legacy" ? exports.LEGACY_TRACKER_DIR_NAME : exports.TRACKER_DIR_NAME;
    return (0, node_path_1.join)(root, name, exports.CONVENTION_FILE_NAME);
}
function trackerNonItemDirs(trackerDir) {
    const loc = trackerAt((0, node_path_1.dirname)(trackerDir));
    if (loc && loc.dir === trackerDir && loc.docsDir.startsWith(`${loc.dir}${node_path_1.sep}`)) {
        return [loc.docsDir];
    }
    return [];
}
function newItemPath(opts) {
    const { tasksDir, type, id, parentContainerDir } = opts;
    if (type === "initiative") {
        return (0, node_path_1.join)(tasksDir, id, `${id}.md`);
    }
    if (!parentContainerDir) {
        throw new Error(`${type} requires a parent path`);
    }
    if (type === "task" || type === "bug") {
        return (0, node_path_1.join)(parentContainerDir, `${id}.md`);
    }
    return (0, node_path_1.join)(parentContainerDir, id, `${id}.md`);
}
})

__arggonModules.set("lib/src/priority.ts", (exports, require, module) => {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRIORITY_LABEL_PATTERN = exports.PRIORITIES = void 0;
exports.isPriority = isPriority;
exports.assertPriority = assertPriority;
exports.priorityRank = priorityRank;
exports.runPriorityMigrate = runPriorityMigrate;
const dates_js_1 = require("./dates.js");
const frontmatter_js_1 = require("./frontmatter.js");
const atomic_js_1 = require("./atomic.js");
const items_js_1 = require("./items.js");
const paths_js_1 = require("./paths.js");
const node_path_1 = require("node:path");
exports.PRIORITIES = ["p0", "p1", "p2", "p3"];
exports.PRIORITY_LABEL_PATTERN = /^p[0-9]$/;
function isPriority(value) {
    return exports.PRIORITIES.includes(value);
}
function assertPriority(value) {
    if (!isPriority(value)) {
        throw new Error(`invalid priority '${value}' (expected one of: ${exports.PRIORITIES.join(", ")})`);
    }
}
function priorityRank(priority) {
    return exports.PRIORITIES.indexOf(priority);
}
function runPriorityMigrate(opts) {
    const tasksDir = (0, paths_js_1.findTasksDir)(opts.cwd);
    const root = (0, paths_js_1.repoRootFromTasks)(tasksDir);
    const items = (0, items_js_1.loadItems)(tasksDir).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const entries = [];
    for (const item of items) {
        const pLabels = item.labels.filter((label) => exports.PRIORITY_LABEL_PATTERN.test(label));
        if (pLabels.length === 0)
            continue;
        const labelPriority = pLabels.reduce((best, label) => (priorityRank(label) < priorityRank(best) ? label : best), pLabels[0]);
        const explicit = (item.priority ?? null);
        const keptExplicit = explicit !== null;
        const finalPriority = keptExplicit ? explicit : labelPriority;
        const entry = {
            id: item.id,
            type: item.type,
            path: (0, node_path_1.relative)(root, item.filePath).split(node_path_1.sep).join("/"),
            priority: finalPriority,
            labelsRemoved: [...pLabels].sort(),
            prioritySource: keptExplicit ? "kept-explicit" : "label",
            ...(keptExplicit && explicit !== labelPriority ? { conflictLabel: labelPriority } : {}),
        };
        entries.push(entry);
        if (opts.dryRun)
            continue;
        const data = { ...item.data };
        if (!keptExplicit)
            data.priority = finalPriority;
        data.labels = item.labels.filter((label) => !exports.PRIORITY_LABEL_PATTERN.test(label));
        data.updated = (0, dates_js_1.formatDate)(opts.now ?? new Date());
        (0, atomic_js_1.writeFileAtomic)(item.filePath, (0, frontmatter_js_1.stringifyFrontmatter)(data, item.body));
    }
    return {
        root,
        dryRun: opts.dryRun === true,
        scanned: items.length,
        changed: entries.length,
        entries,
    };
}
})

__arggonModules.set("lib/src/relations.ts", (exports, require, module) => {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PARENT_TYPE = void 0;
exports.expectedParentType = expectedParentType;
exports.assertParentEdge = assertParentEdge;
exports.PARENT_TYPE = {
    initiative: null,
    epic: "initiative",
    story: "epic",
    task: "story",
    bug: "story",
};
function expectedParentType(type) {
    return exports.PARENT_TYPE[type];
}
function assertParentEdge(childType, parentType) {
    const expected = expectedParentType(childType);
    if (expected === null) {
        if (parentType) {
            throw new Error("initiative cannot have a parent");
        }
        return;
    }
    if (!parentType) {
        throw new Error(`${childType} requires parent type ${expected}`);
    }
    if (parentType !== expected) {
        throw new Error(`${childType} must live under a ${expected} (got ${parentType})`);
    }
}
})

__arggonModules.set("lib/src/report.ts", (exports, require, module) => {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emptyCounts = emptyCounts;
exports.aggregateReport = aggregateReport;
exports.runReport = runReport;
exports.completedOf = completedOf;
exports.formatReportTable = formatReportTable;
exports.formatReportMarkdown = formatReportMarkdown;
const items_js_1 = require("./items.js");
const paths_js_1 = require("./paths.js");
const sanitize_js_1 = require("./sanitize.js");
const status_js_1 = require("./status.js");
function emptyCounts() {
    return { todo: 0, in_progress: 0, blocked: 0, done: 0, cancelled: 0, total: 0 };
}
function titleOf(item) {
    return item.title ?? item.id;
}
function aggregateReport(items) {
    const byId = (0, items_js_1.itemsById)(items);
    const children = new Map();
    for (const item of items) {
        if (!item.parent)
            continue;
        const list = children.get(item.parent) ?? [];
        list.push(item);
        children.set(item.parent, list);
    }
    const groups = items
        .filter((item) => item.type === "epic")
        .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
        .map((epic) => {
        const stories = (children.get(epic.id) ?? [])
            .filter((child) => child.type === "story")
            .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
        const containers = stories.map((story) => {
            const counts = emptyCounts();
            const leaves = (children.get(story.id) ?? []).filter((child) => child.type === "task" || child.type === "bug");
            for (const leaf of leaves) {
                counts[leaf.status] += 1;
                counts.total += 1;
            }
            return {
                id: story.id,
                title: titleOf(story),
                type: story.type,
                counts,
                empty: leaves.length === 0,
            };
        });
        const totals = emptyCounts();
        for (const c of containers) {
            for (const status of status_js_1.STATUSES)
                totals[status] += c.counts[status];
            totals.total += c.counts.total;
        }
        const initiative = epic.parent ? (byId.get(epic.parent) ?? null) : null;
        return {
            epic: { id: epic.id, title: titleOf(epic) },
            initiative: initiative ? { id: initiative.id, title: titleOf(initiative) } : null,
            containers,
            totals,
            empty: stories.length === 0,
        };
    });
    const blocked = items
        .filter((item) => (item.type === "task" || item.type === "bug") &&
        item.status === "blocked" &&
        Boolean(item.blockedReason))
        .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
        .map((leaf) => {
        const story = leaf.parent ? byId.get(leaf.parent) : undefined;
        const epic = story?.parent ? byId.get(story.parent) : undefined;
        return {
            id: leaf.id,
            type: leaf.type,
            title: titleOf(leaf),
            storyId: story?.id ?? null,
            epicId: epic?.id ?? null,
            blockedReason: leaf.blockedReason,
        };
    });
    return { groups, blocked };
}
function runReport(opts) {
    const tasksDir = (0, paths_js_1.findTasksDir)(opts.cwd);
    const root = (0, paths_js_1.repoRootFromTasks)(tasksDir);
    const { groups, blocked } = aggregateReport((0, items_js_1.loadItems)(tasksDir));
    return { root, groups, blocked };
}
function completedOf(counts) {
    return counts.done + counts.cancelled;
}
function formatReportTable(groups) {
    const lines = [];
    for (const group of groups) {
        const scope = group.initiative ? ` [${(0, sanitize_js_1.sanitizeHumanTextUncapped)(group.initiative.id)}]` : "";
        lines.push(`epic: ${(0, sanitize_js_1.sanitizeHumanTextUncapped)(group.epic.id)} — ${(0, sanitize_js_1.sanitizeHumanTextUncapped)(group.epic.title)}${scope}`);
        if (group.empty) {
            lines.push(`  (empty — no stories)`);
        }
        for (const c of group.containers) {
            lines.push(`  ${(0, sanitize_js_1.sanitizeHumanTextUncapped)(c.id)}: ${formatCounts(c.counts)}${c.empty ? " (empty — no leaves)" : ""}`);
        }
        lines.push(`  totals: ${formatCounts(group.totals)}`);
    }
    return lines.length > 0 ? `${lines.join("\n")}\n` : "arggon report: no epics.\n";
}
function formatCounts(counts) {
    const parts = status_js_1.STATUSES.map((status) => `${status}=${counts[status]}`);
    return `${parts.join(" ")} (total ${counts.total})`;
}
function formatReportMarkdown(result, opts = {}) {
    const date = opts.date ?? new Date().toISOString().slice(0, 10);
    const lines = [`# Progress report — ${date}`, ""];
    for (const group of result.groups) {
        const scope = group.initiative ? ` (${(0, sanitize_js_1.sanitizeHumanTextUncapped)(group.initiative.id)})` : "";
        lines.push(`## ${(0, sanitize_js_1.sanitizeHumanTextUncapped)(group.epic.id)} — ${(0, sanitize_js_1.sanitizeHumanTextUncapped)(group.epic.title)}${scope}`, "");
        if (group.empty) {
            lines.push("_Empty — no stories._", "");
            continue;
        }
        for (const c of group.containers) {
            const done = completedOf(c.counts);
            const id = (0, sanitize_js_1.sanitizeHumanTextUncapped)(c.id);
            const title = (0, sanitize_js_1.sanitizeHumanTextUncapped)(c.title);
            const line = c.empty
                ? `- **${id}** — ${title}: empty (no leaves)`
                : `- **${id}** — ${title}: ${done}/${c.counts.total} complete (${c.counts.in_progress} in progress, ${c.counts.blocked} blocked)`;
            lines.push(line);
        }
        const totalDone = completedOf(group.totals);
        lines.push("", `- **totals**: ${totalDone}/${group.totals.total} complete`, "");
    }
    lines.push("## Blocked", "");
    if (result.blocked.length === 0) {
        lines.push("_Nothing blocked._", "");
    }
    else {
        for (const b of result.blocked) {
            const where = [b.storyId, b.epicId]
                .filter((part) => Boolean(part))
                .map((part) => (0, sanitize_js_1.sanitizeHumanTextUncapped)(part))
                .join(" ← ");
            const scope = where ? ` (${where})` : "";
            lines.push(`- **${(0, sanitize_js_1.sanitizeHumanTextUncapped)(b.id)}**${scope} — ${(0, sanitize_js_1.sanitizeHumanTextUncapped)(b.blockedReason)}`);
        }
        lines.push("");
    }
    return `${lines.join("\n")}\n`;
}
})

__arggonModules.set("lib/src/rules.ts", (exports, require, module) => {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertUpdateRules = assertUpdateRules;
const status_js_1 = require("./status.js");
function assertUpdateRules(intent, caller) {
    if (caller === "agent" && intent.force) {
        throw new Error("agents must not steal a claim; --force is a human-only escape hatch (ArggonManager/docs/agents.md)");
    }
    if (caller === "agent" && intent.steal) {
        throw new Error("agents must not steal a claim; --steal is a human-only supervised escape hatch (ArggonManager/docs/agents.md)");
    }
    if (intent.requestedStatus !== undefined &&
        intent.requestedStatus !== intent.currentStatus &&
        !(0, status_js_1.canTransition)(intent.currentStatus, intent.requestedStatus)) {
        const allowed = status_js_1.TRANSITIONS[intent.currentStatus];
        throw new Error(`cannot transition status ${intent.currentStatus} -> ${intent.requestedStatus} (allowed: ${allowed.join(", ")})`);
    }
    if (caller === "agent" &&
        intent.requestedStatus === "todo" &&
        (intent.currentStatus === "done" || intent.currentStatus === "cancelled")) {
        throw new Error(`agents must not reopen ${intent.currentStatus} items (ArggonManager/docs/agents.md); ask a human to reopen '${intent.id}'`);
    }
    if ((0, status_js_1.isClaimed)(intent.type, intent.currentStatus, intent.currentAssignee) &&
        intent.requestedAssignee !== undefined &&
        intent.requestedAssignee !== intent.currentAssignee &&
        !intent.force &&
        !intent.steal) {
        throw new Error(`claim conflict: '${intent.id}' is claimed by '${intent.currentAssignee}' (status in_progress). ` +
            `Unclaim first (\`arggon update ${intent.id} --status todo\`), coordinate, or pass --force.`);
    }
}
})

__arggonModules.set("lib/src/sanitize.ts", (exports, require, module) => {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_HUMAN_ERROR_CHARS = exports.MAX_HUMAN_VALUE_CHARS = void 0;
exports.sanitizeHumanValue = sanitizeHumanValue;
exports.sanitizeHumanText = sanitizeHumanText;
exports.sanitizeHumanError = sanitizeHumanError;
exports.sanitizeHumanTextUncapped = sanitizeHumanTextUncapped;
exports.MAX_HUMAN_VALUE_CHARS = 200;
exports.MAX_HUMAN_ERROR_CHARS = 2000;
const HUMAN_SAFE_TOKEN = /^[A-Za-z0-9._-]+$/;
const HUMAN_UNSAFE = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g;
function escapeUnsafeCodePoint(ch) {
    return `\\u${ch.charCodeAt(0).toString(16).padStart(4, "0")}`;
}
function clipHumanValue(value, maxChars) {
    if (value.length <= maxChars)
        return value;
    let end = maxChars;
    const last = value.charCodeAt(end - 1);
    if (last >= 0xd800 && last <= 0xdbff)
        end -= 1;
    return `${value.slice(0, end)}…`;
}
function escapeHumanText(value) {
    return JSON.stringify(value).slice(1, -1).replace(HUMAN_UNSAFE, escapeUnsafeCodePoint);
}
function sanitizeHumanValue(value) {
    const clipped = clipHumanValue(value, exports.MAX_HUMAN_VALUE_CHARS);
    return HUMAN_SAFE_TOKEN.test(clipped) ? clipped : `"${escapeHumanText(clipped)}"`;
}
function sanitizeHumanText(value) {
    return escapeHumanText(clipHumanValue(value, exports.MAX_HUMAN_VALUE_CHARS));
}
function sanitizeHumanError(message) {
    return escapeHumanText(clipHumanValue(message, exports.MAX_HUMAN_ERROR_CHARS));
}
function sanitizeHumanTextUncapped(value) {
    return value.replace(HUMAN_UNSAFE, escapeUnsafeCodePoint);
}
})

__arggonModules.set("lib/src/show.ts", (exports, require, module) => {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_TAIL_COMMENTS = void 0;
exports.parseComments = parseComments;
exports.showBoundedParts = showBoundedParts;
exports.runShow = runShow;
exports.renderShowText = renderShowText;
const paths_js_1 = require("./paths.js");
const items_js_1 = require("./items.js");
const sanitize_js_1 = require("./sanitize.js");
exports.DEFAULT_TAIL_COMMENTS = 3;
function parseComments(body) {
    const headingRe = /^### (\d{4}-\d{2}-\d{2}) @(\S+)\s*$/gm;
    const comments = [];
    const marks = [];
    for (const match of body.matchAll(headingRe)) {
        marks.push({ index: match.index, date: match[1], author: match[2] });
    }
    if (marks.length === 0) {
        return { prose: body, comments };
    }
    const prose = body.slice(0, marks[0].index).replace(/\n+$/, "\n");
    for (let i = 0; i < marks.length; i++) {
        const start = marks[i].index + body.slice(marks[i].index).indexOf("\n") + 1;
        const end = i + 1 < marks.length ? marks[i + 1].index : body.length;
        const lines = body
            .slice(start, end)
            .replace(/\n+$/, "")
            .split("\n")
            .filter((line, idx, arr) => !(idx === arr.length - 1 && line.trim() === ""));
        comments.push({ date: marks[i].date, author: marks[i].author, lines });
    }
    return { prose, comments };
}
function showBoundedParts(item, tailComments = exports.DEFAULT_TAIL_COMMENTS) {
    const { prose, comments } = parseComments(item.body);
    return {
        prose,
        allComments: comments,
        comments: comments.slice(Math.max(0, comments.length - tailComments)),
    };
}
function runShow(opts) {
    const id = opts.id.trim();
    if (!id)
        throw new Error("id is required");
    const tasksDir = (0, paths_js_1.findTasksDir)(opts.cwd);
    const item = (0, items_js_1.itemsById)((0, items_js_1.loadItems)(tasksDir)).get(id);
    if (!item) {
        throw new Error(`id '${id}' not found under the tracker`);
    }
    const meta = opts.meta === true;
    const full = !meta && opts.body === true;
    const bounded = showBoundedParts(item, opts.tailComments ?? exports.DEFAULT_TAIL_COMMENTS);
    const included = meta ? [] : full ? bounded.allComments : bounded.comments;
    return {
        id,
        path: item.filePath,
        root: (0, paths_js_1.repoRootFromTasks)(tasksDir),
        item,
        prose: bounded.prose,
        allComments: bounded.allComments,
        comments: included,
        includeBody: !meta,
    };
}
function renderShowText(result) {
    const item = result.item;
    const lines = [];
    lines.push(`arggon show: ${(0, sanitize_js_1.sanitizeHumanTextUncapped)(item.id)} — ${(0, sanitize_js_1.sanitizeHumanTextUncapped)(item.title ?? item.id)}`);
    lines.push(`  type: ${item.type} · status: ${item.status} · parent: ${(0, sanitize_js_1.sanitizeHumanTextUncapped)(item.parent ?? "(none)")}`);
    if (item.assignee)
        lines.push(`  assignee: ${(0, sanitize_js_1.sanitizeHumanTextUncapped)(item.assignee)}`);
    if (item.branch)
        lines.push(`  branch: ${(0, sanitize_js_1.sanitizeHumanTextUncapped)(item.branch)}`);
    if (item.labels.length > 0)
        lines.push(`  labels: ${(0, sanitize_js_1.sanitizeHumanTextUncapped)(item.labels.join(", "))}`);
    if (item.priority)
        lines.push(`  priority: ${(0, sanitize_js_1.sanitizeHumanTextUncapped)(item.priority)}`);
    if (item.dependsOn.length > 0)
        lines.push(`  depends_on: ${(0, sanitize_js_1.sanitizeHumanTextUncapped)(item.dependsOn.join(", "))}`);
    if (item.blockedReason)
        lines.push(`  blocked_reason: ${(0, sanitize_js_1.sanitizeHumanTextUncapped)(item.blockedReason)}`);
    if (item.milestone)
        lines.push(`  milestone: ${(0, sanitize_js_1.sanitizeHumanTextUncapped)(item.milestone)}`);
    if (item.claimedAt)
        lines.push(`  claimed_at: ${(0, sanitize_js_1.sanitizeHumanTextUncapped)(item.claimedAt)}`);
    if (item.worktreePath)
        lines.push(`  worktree: ${(0, sanitize_js_1.sanitizeHumanTextUncapped)(item.worktreePath)}`);
    if (item.issue !== null)
        lines.push(`  issue: #${item.issue}`);
    lines.push(`  path: ${(0, sanitize_js_1.sanitizeHumanTextUncapped)(result.path)}`);
    if (!result.includeBody)
        return lines;
    const prose = result.prose.trim();
    if (prose) {
        lines.push("");
        lines.push(prose);
    }
    const comments = result.comments;
    if (comments.length > 0) {
        const hidden = result.allComments.length - comments.length;
        if (hidden > 0) {
            lines.push("");
            lines.push(`  … ${hidden} earlier comment(s) omitted (use --body for the full history)`);
        }
        for (const comment of comments) {
            lines.push("");
            lines.push(`### ${comment.date} @${(0, sanitize_js_1.sanitizeHumanTextUncapped)(comment.author)}`);
            lines.push(...comment.lines);
        }
    }
    return lines;
}
})

__arggonModules.set("lib/src/status.ts", (exports, require, module) => {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CREATE_STATUSES = exports.TRANSITIONS = exports.ASSIGNEE_PATTERN = exports.CLAIMABLE_TYPES = exports.STATUSES = void 0;
exports.isStatus = isStatus;
exports.assertStatus = assertStatus;
exports.assertCreatableStatus = assertCreatableStatus;
exports.assertAssignee = assertAssignee;
exports.isClaimable = isClaimable;
exports.isClaimed = isClaimed;
exports.unclaim = unclaim;
exports.assertClaimAndBlocked = assertClaimAndBlocked;
exports.canTransition = canTransition;
exports.STATUSES = ["todo", "in_progress", "blocked", "done", "cancelled"];
exports.CLAIMABLE_TYPES = new Set(["story", "task", "bug"]);
exports.ASSIGNEE_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
exports.TRANSITIONS = {
    todo: ["in_progress", "cancelled"],
    in_progress: ["blocked", "done", "cancelled", "todo"],
    blocked: ["in_progress", "cancelled"],
    done: ["todo"],
    cancelled: ["todo"],
};
function isStatus(value) {
    return exports.STATUSES.includes(value);
}
function assertStatus(value) {
    if (!isStatus(value)) {
        throw new Error(`Invalid status '${value}'. Expected: ${exports.STATUSES.join(", ")}`);
    }
}
exports.CREATE_STATUSES = ["todo", "in_progress", "blocked", "cancelled"];
function assertCreatableStatus(status) {
    if (!exports.CREATE_STATUSES.includes(status)) {
        throw new Error(`cannot create with status ${status} (claim first, then complete via update)`);
    }
}
function assertAssignee(assignee) {
    if (assignee === "") {
        throw new Error("assignee must not be an empty string (omit it when unassigned)");
    }
    if (!exports.ASSIGNEE_PATTERN.test(assignee)) {
        throw new Error(`Invalid assignee '${assignee}' (GitHub login or agent id)`);
    }
}
function isClaimable(type) {
    return exports.CLAIMABLE_TYPES.has(type);
}
function isClaimed(type, status, assignee) {
    return isClaimable(type) && status === "in_progress" && Boolean(assignee);
}
function unclaim(status) {
    if (status !== "in_progress") {
        throw new Error("unclaim is only valid from in_progress (v0 update default)");
    }
    if (!canTransition(status, "todo")) {
        throw new Error("cannot unclaim from this status");
    }
    return { status: "todo", assignee: null };
}
function assertClaimAndBlocked(opts) {
    const assignee = opts.assignee?.trim() ? opts.assignee : null;
    const reason = opts.blockedReason?.trim() ? opts.blockedReason.trim() : null;
    if (opts.status === "in_progress" && exports.CLAIMABLE_TYPES.has(opts.type) && !assignee) {
        throw new Error(`${opts.type} with status in_progress requires --assignee`);
    }
    if (opts.status === "blocked" && !reason) {
        throw new Error("status blocked requires --blocked-reason");
    }
    if (opts.status !== "blocked" && reason) {
        throw new Error("blocked_reason is only valid when status is blocked");
    }
}
function canTransition(from, to) {
    return exports.TRANSITIONS[from].includes(to);
}
})

__arggonModules.set("lib/src/sync-command.ts", (exports, require, module) => {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSync = runSync;
const node_child_process_1 = require("node:child_process");
const items_js_1 = require("./items.js");
const paths_js_1 = require("./paths.js");
const get_open_prs_js_1 = require("./get-open-prs.js");
const sync_types_js_1 = require("./sync-types.js");
const update_js_1 = require("./update.js");
const verdict_js_1 = require("./verdict.js");
function runSync(opts, execGh = node_child_process_1.execFileSync) {
    if (opts.check && opts.write) {
        throw new Error("pass either --check or --write, not both");
    }
    const mode = opts.write ? "write" : "check";
    const cwd = opts.cwd || process.cwd();
    let items;
    let prs;
    try {
        const tasksDir = (0, paths_js_1.findTasksDir)(cwd);
        items = (0, items_js_1.loadItems)(tasksDir);
        prs = (0, get_open_prs_js_1.getOpenPRs)(opts.repo || null, cwd, execGh);
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return (0, sync_types_js_1.toSyncResult)([], mode, null, [msg]);
    }
    const byId = new Map(items.map((i) => [i.id, i]));
    const reported = items
        .map((item) => (0, sync_types_js_1.matchItem)({ id: item.id, branch: item.branch ?? null }, prs))
        .filter((m) => {
        const item = byId.get(m.itemId);
        if (item.branch)
            return true;
        if (m.status === "no_pr")
            return false;
        return item.type === "task" || item.type === "bug";
    });
    let filled = null;
    const updateErrors = [];
    if (mode === "write") {
        for (const match of reported) {
            if (match.status !== "fillable")
                continue;
            try {
                (0, update_js_1.runUpdate)({ cwd, id: match.itemId, branch: match.branch });
                if (!filled)
                    filled = {};
                filled[match.itemId] = match.branch;
            }
            catch (err) {
                updateErrors.push(err instanceof Error ? err.message : String(err));
            }
        }
    }
    const verdicts = {};
    for (const match of reported) {
        if (match.status === "no_pr")
            continue;
        const item = byId.get(match.itemId);
        verdicts[match.itemId] = (0, verdict_js_1.classifyVerdicts)(item.body);
    }
    return (0, sync_types_js_1.toSyncResult)(reported, mode, filled, updateErrors, verdicts);
}
})

__arggonModules.set("lib/src/sync-types.ts", (exports, require, module) => {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.branchReferencesItem = branchReferencesItem;
exports.matchItem = matchItem;
exports.toSyncResult = toSyncResult;
function branchReferencesItem(branch, id) {
    const token = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?:^|/)${token}(?![a-z0-9])`).test(branch);
}
function matchItem(item, prs) {
    if (item.branch) {
        const matching = prs.filter((pr) => pr.headRefName === item.branch);
        if (matching.length === 0) {
            return { status: "no_pr", itemId: item.id };
        }
        if (matching.length > 1) {
            return {
                status: "ambiguous",
                itemId: item.id,
                branch: item.branch,
                prNumbers: matching.map((p) => p.number),
            };
        }
        return {
            status: "matched",
            itemId: item.id,
            branch: item.branch,
            prNumber: matching[0].number,
        };
    }
    const candidates = prs.filter((pr) => branchReferencesItem(pr.headRefName, item.id));
    if (candidates.length === 0) {
        return { status: "no_pr", itemId: item.id };
    }
    if (candidates.length === 1) {
        const pr = candidates[0];
        return { status: "fillable", itemId: item.id, branch: pr.headRefName, prNumber: pr.number };
    }
    const branches = new Set(candidates.map((p) => p.headRefName));
    if (branches.size === 1) {
        return {
            status: "ambiguous",
            itemId: item.id,
            branch: candidates[0].headRefName,
            prNumbers: candidates.map((p) => p.number),
        };
    }
    return { status: "pending", itemId: item.id };
}
function toSyncResult(matches, mode, filled = null, errors = [], verdicts = {}) {
    const matched = [];
    const unmatched = [];
    const pending = [];
    const ambiguous = [];
    const suggestions = [];
    for (const m of matches) {
        switch (m.status) {
            case "matched":
                matched.push(m.itemId);
                break;
            case "fillable":
                suggestions.push({ id: m.itemId, branch: m.branch, pr: m.prNumber });
                if (mode === "write") {
                    matched.push(m.itemId);
                }
                else {
                    pending.push(m.itemId);
                }
                break;
            case "pending":
                pending.push(m.itemId);
                break;
            case "no_pr":
                unmatched.push(m.itemId);
                break;
            case "ambiguous":
                ambiguous.push({ id: m.itemId, branch: m.branch, prs: m.prNumbers });
                break;
        }
    }
    return {
        command: "sync",
        mode,
        matched,
        unmatched,
        pending,
        ambiguous,
        suggestions,
        filled,
        verdicts,
        errors,
        exit_code: mode === "check"
            ? (pending.length > 0 || ambiguous.length > 0 || errors.length > 0 ? 1 : 0)
            : ambiguous.length > 0 || errors.length > 0
                ? 1
                : 0,
    };
}
})

__arggonModules.set("lib/src/tracker-commit.ts", (exports, require, module) => {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMMIT_RETRY_MS = exports.COMMIT_RETRY_TIMEOUT_MS = void 0;
exports.trackerCommitMessage = trackerCommitMessage;
exports.updateCommitMessage = updateCommitMessage;
exports.resolveAutoCommit = resolveAutoCommit;
exports.readAutoCommitConfig = readAutoCommitConfig;
exports.resolveCommonGitDir = resolveCommonGitDir;
exports.trackerGitLockKey = trackerGitLockKey;
exports.commitTrackerMutation = commitTrackerMutation;
exports.commitPayload = commitPayload;
exports.formatCommitLine = formatCommitLine;
const node_child_process_1 = require("node:child_process");
const convention_js_1 = require("./convention.js");
const lock_js_1 = require("./lock.js");
const node_path_1 = require("node:path");
const sanitize_js_1 = require("./sanitize.js");
function trackerCommitMessage(verb, ids) {
    return `chore(tasks): ${verb} ${ids.join(", ")}`;
}
function updateCommitMessage(verb, id, cascadeIds) {
    const base = trackerCommitMessage(verb, [id]);
    return cascadeIds.length > 0 ? `${base} (cascade: ${cascadeIds.join(", ")})` : base;
}
function resolveAutoCommit(flag, configValue) {
    if (flag !== undefined)
        return flag;
    if (configValue !== null)
        return configValue;
    return true;
}
function readAutoCommitConfig(root) {
    try {
        return (0, convention_js_1.readConventionConfig)(root).tracker.autoCommit;
    }
    catch {
        return null;
    }
}
exports.COMMIT_RETRY_TIMEOUT_MS = 10_000;
exports.COMMIT_RETRY_MS = 75;
const COMMIT_RETRY_MAX_SLEEP_MS = 1_000;
function sleepSync(ms) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}
function isIndexLockContention(run) {
    return /index\.lock/.test(run.err) || /index\.lock/.test(run.out);
}
function warnGitSkip(skipReason) {
    if (/^git (add|commit) failed|^git index locked|staged entry lost/.test(skipReason)) {
        process.stderr.write(`arggon: warning: commit skipped: ${(0, sanitize_js_1.sanitizeHumanError)(skipReason)}\n`);
    }
}
function runGit(args, cwd, input) {
    try {
        const out = (0, node_child_process_1.execFileSync)("git", args, {
            encoding: "utf8",
            cwd,
            stdio: input !== undefined ? ["pipe", "pipe", "pipe"] : ["ignore", "pipe", "pipe"],
            ...(input !== undefined ? { input } : {}),
        });
        return { code: 0, out: String(out ?? ""), err: "", missing: false };
    }
    catch (err) {
        if (err !== null &&
            typeof err === "object" &&
            "code" in err &&
            (err.code === "ENOENT" || err.code === -2)) {
            return { code: -1, out: "", err: "", missing: true };
        }
        const e = err;
        return {
            code: typeof e.status === "number" ? e.status : 1,
            out: String(e.stdout ?? ""),
            err: String(e.stderr ?? ""),
            missing: false,
        };
    }
}
function firstLine(text) {
    return (text
        .split("\n")
        .find((line) => line.trim().length > 0)
        ?.trim() ?? "git failed");
}
function findIgnoredPaths(root, paths) {
    const ignored = [];
    for (const path of paths) {
        const run = runGit(["check-ignore", "--stdin", "-z"], root, `${path}\0`);
        if (run.missing)
            return null;
        if (run.code === 0) {
            if (run.out.split("\0").includes(path))
                ignored.push(path);
        }
        else if (run.code !== 1)
            return null;
    }
    return ignored;
}
function rootRelativePaths(root, paths) {
    return paths.map((p) => (0, node_path_1.relative)(root, (0, node_path_1.resolve)(root, p)).split(node_path_1.sep).join("/")).sort();
}
function normalizeTrackerPaths(root, filePaths) {
    const rootAbs = (0, node_path_1.resolve)(root);
    const paths = [];
    for (const input of filePaths) {
        if (input.length === 0)
            continue;
        if (input.startsWith(":"))
            return { paths: [], error: "pathspec magic" };
        const absolute = (0, node_path_1.resolve)(rootAbs, input);
        const rel = (0, node_path_1.relative)(rootAbs, absolute);
        if (rel === "" || (0, node_path_1.isAbsolute)(rel))
            return { paths: [], error: "outside-root" };
        if (rel === ".." || rel.startsWith(`..${node_path_1.sep}`) || rel.startsWith("../")) {
            return { paths: [], error: "outside-root" };
        }
        const normalized = rel.split(node_path_1.sep).join("/");
        if (normalized.startsWith(":"))
            return { paths: [], error: "pathspec magic" };
        paths.push(normalized);
    }
    return { paths: [...new Set(paths)].sort() };
}
function resolveCommonGitDir(root) {
    const abs = runGit(["rev-parse", "--path-format=absolute", "--git-common-dir"], root);
    if (abs.code === 0 && abs.out.trim().length > 0)
        return abs.out.trim();
    const rel = runGit(["rev-parse", "--git-common-dir"], root);
    if (rel.code === 0 && rel.out.trim().length > 0)
        return (0, node_path_1.resolve)(root, rel.out.trim());
    return null;
}
function trackerGitLockKey(commonGitDir) {
    return (0, node_path_1.join)(commonGitDir, "arggon-tracker-git.lock");
}
function commitTrackerMutation(root, filePaths, opts) {
    if (opts.commit === false) {
        return { committed: false, skipReason: "auto-commit disabled" };
    }
    const normalized = normalizeTrackerPaths(root, filePaths);
    if (normalized.error === "pathspec magic") {
        return { committed: false, skipReason: "pathspec magic is not allowed" };
    }
    if (normalized.error === "outside-root") {
        return { committed: false, skipReason: "mutated path escapes repository root" };
    }
    const paths = normalized.paths;
    if (paths.length === 0) {
        return { committed: false, skipReason: "no mutated files" };
    }
    const probe = runGit(["rev-parse", "--git-dir"], root);
    if (probe.missing)
        return { committed: false, skipReason: "git not found" };
    if (probe.code !== 0)
        return { committed: false, skipReason: "not a git repository" };
    const ignoredRun = findIgnoredPaths(root, paths);
    const ignoredPaths = ignoredRun ?? [];
    const ignoredSet = new Set(ignoredPaths);
    const stagePaths = ignoredPaths.length === 0 ? paths : paths.filter((p) => !ignoredSet.has(p));
    if (stagePaths.length === 0) {
        return {
            committed: false,
            skipReason: "all mutated paths are ignored by .gitignore",
            ignored: rootRelativePaths(root, ignoredPaths),
        };
    }
    const ignoredPayload = ignoredPaths.length > 0 ? rootRelativePaths(root, ignoredPaths) : undefined;
    const budget = opts.commitRetryTimeoutMs ?? exports.COMMIT_RETRY_TIMEOUT_MS;
    const commonGitDir = resolveCommonGitDir(root);
    let result;
    const attempt = () => {
        const deadline = Date.now() + budget;
        let locked = null;
        let add;
        let commit;
        for (let attempt = 1;; attempt++) {
            if (attempt > 1)
                sleepSync(Math.min(exports.COMMIT_RETRY_MS * (attempt - 1), COMMIT_RETRY_MAX_SLEEP_MS));
            add = runGit(["--literal-pathspecs", "add", "--", ...stagePaths], root);
            if (add.code !== 0) {
                if (isIndexLockContention(add)) {
                    locked = "git index locked";
                    if (Date.now() >= deadline)
                        break;
                    continue;
                }
                warnGitSkip(`git add failed: ${firstLine(add.err || add.out)}`);
                result = {
                    committed: false,
                    skipReason: `git add failed: ${firstLine(add.err || add.out)}`,
                };
                return;
            }
            commit = runGit(["--literal-pathspecs", "commit", "--only", "-m", opts.message, "--", ...stagePaths], root);
            if (commit.code !== 0) {
                const detail = `${commit.out}\n${commit.err}`;
                if (/nothing to commit|nothing added/.test(detail)) {
                    const residue = runGit(["--literal-pathspecs", "status", "--porcelain", "--", ...stagePaths], root);
                    if (residue.code === 0 && residue.out.trim().length > 0) {
                        const lost = "nothing to commit (staged entry lost under contention)";
                        warnGitSkip(lost);
                        result = { committed: false, skipReason: lost };
                        return;
                    }
                    result = { committed: false, skipReason: "nothing to commit" };
                    return;
                }
                if (isIndexLockContention(commit)) {
                    locked = "git index locked";
                    if (Date.now() >= deadline)
                        break;
                    continue;
                }
                warnGitSkip(`git commit failed: ${firstLine(commit.err || commit.out)}`);
                result = {
                    committed: false,
                    skipReason: `git commit failed: ${firstLine(commit.err || commit.out)}`,
                };
                return;
            }
            locked = null;
            break;
        }
        if (locked !== null || commit === undefined) {
            warnGitSkip(locked ?? "git commit failed");
            result = { committed: false, skipReason: locked ?? "git commit failed" };
            return;
        }
        if (commit.code !== 0) {
            warnGitSkip(`git commit failed: ${firstLine(commit.err || commit.out)}`);
            result = {
                committed: false,
                skipReason: `git commit failed: ${firstLine(commit.err || commit.out)}`,
            };
            return;
        }
        const hash = runGit(["rev-parse", "--short", "HEAD"], root);
        result = {
            committed: true,
            hash: hash.code === 0 && hash.out.trim() ? hash.out.trim() : "(unknown)",
            message: opts.message,
        };
    };
    if (commonGitDir !== null) {
        try {
            (0, lock_js_1.withItemLock)(trackerGitLockKey(commonGitDir), attempt, { timeoutMs: budget });
        }
        catch {
            warnGitSkip("git index locked");
            result = { committed: false, skipReason: "git index locked" };
        }
    }
    else {
        attempt();
    }
    const outcome = result ?? { committed: false, skipReason: "git commit failed" };
    return ignoredPayload !== undefined ? { ...outcome, ignored: ignoredPayload } : outcome;
}
function commitPayload(result) {
    if (!result)
        return undefined;
    const ignored = result.ignored && result.ignored.length > 0 ? { ignored: result.ignored } : {};
    if (result.committed && result.hash) {
        return { hash: result.hash, message: result.message ?? "", ...ignored };
    }
    return { skipped: result.skipReason ?? "skipped", ...ignored };
}
function formatCommitLine(result) {
    if (!result)
        return null;
    const suffix = result.ignored && result.ignored.length > 0
        ? ` (${result.ignored.length} ignored path(s) skipped)`
        : "";
    if (result.committed) {
        return (0, sanitize_js_1.sanitizeHumanError)(`committed: ${result.hash} ${result.message}${suffix}`);
    }
    if (result.skipReason === "auto-commit disabled") {
        return (0, sanitize_js_1.sanitizeHumanError)(`no-commit: tracker dirty state kept${suffix}`);
    }
    return (0, sanitize_js_1.sanitizeHumanError)(`no-commit: ${result.skipReason}${suffix}`);
}
})

__arggonModules.set("lib/src/trend.ts", (exports, require, module) => {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runTrend = runTrend;
exports.parseSince = parseSince;
exports.formatTrendTable = formatTrendTable;
exports.formatTrendMarkdown = formatTrendMarkdown;
exports.isoWeekKey = isoWeekKey;
exports.parseLog = parseLog;
const node_child_process_1 = require("node:child_process");
const node_path_1 = require("node:path");
const items_js_1 = require("./items.js");
const paths_js_1 = require("./paths.js");
const defaultExecGit = (file, args, options) => (0, node_child_process_1.execFileSync)(file, args, options);
function runTrend(opts) {
    const sinceMs = parseSince(opts.since);
    const location = (0, paths_js_1.findTrackerLocation)(opts.cwd);
    const tasksDir = location.dir;
    const root = location.repoRoot;
    const relTasks = (0, node_path_1.relative)(root, tasksDir).split(node_path_1.sep).join("/");
    const execGit = opts.execGit ?? defaultExecGit;
    const pathspec = [relTasks];
    if (location.layout !== "legacy" && hasLegacyTrackerHistory(execGit, root)) {
        pathspec.push(paths_js_1.LEGACY_TRACKER_DIR_NAME);
    }
    const docsRel = (0, node_path_1.relative)(root, location.docsDir).split(node_path_1.sep).join("/");
    if (docsRel.startsWith(`${relTasks}/`)) {
        pathspec.push(`:(exclude)${docsRel}`);
    }
    let out;
    try {
        out = execGit("git", ["log", "-p", "--no-color", "--no-ext-diff", "--format=%x1e%H%x1f%cI", "--", ...pathspec], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    }
    catch (err) {
        const stderr = err instanceof Error && "stderr" in err ? String(err.stderr) : "";
        if (stderr.includes("does not have any commits yet")) {
            return { weeks: [], cycleTime: [] };
        }
        throw new Error(`git log over ${relTasks}/ failed (is ${root} a git repository?): ${stderr.trim() || err}`);
    }
    const parsed = parseLog(out);
    const currentTypes = new Map();
    for (const item of (0, items_js_1.loadItems)(tasksDir)) {
        currentTypes.set((0, node_path_1.relative)(root, item.filePath).split(node_path_1.sep).join("/"), item.type);
    }
    const resolvePath = (path) => {
        let cur = path;
        for (;;) {
            const next = parsed.renames.get(cur);
            if (!next)
                return cur;
            cur = next;
        }
    };
    const histories = new Map();
    const typeOf = new Map();
    for (const event of parsed.events) {
        const key = resolvePath(event.path);
        const list = histories.get(key) ?? [];
        list.push(event);
        histories.set(key, list);
    }
    for (const [path, type] of parsed.types) {
        typeOf.set(resolvePath(path), type);
    }
    const weekCounts = new Map();
    const cycleByType = new Map();
    for (const [path, events] of histories) {
        events.sort((a, b) => b.seq - a.seq);
        const type = currentTypes.get(path) ?? typeOf.get(path);
        const inWindow = (iso) => Date.parse(iso) >= sinceMs;
        let claimedMs = null;
        let terminalMs = null;
        for (const event of events) {
            if (!inWindow(event.date))
                continue;
            if (claimedMs === null && event.status === "in_progress") {
                claimedMs = Date.parse(event.date);
            }
            if (terminalMs === null && (event.status === "done" || event.status === "cancelled")) {
                terminalMs = Date.parse(event.date);
            }
        }
        if (terminalMs === null)
            continue;
        const week = isoWeekKey(new Date(terminalMs));
        weekCounts.set(week, (weekCounts.get(week) ?? 0) + 1);
        if (type === "task" || type === "bug" || type === "story") {
            const leafType = type;
            if (claimedMs !== null) {
                const days = (terminalMs - claimedMs) / 86_400_000;
                const list = cycleByType.get(leafType) ?? [];
                list.push(days);
                cycleByType.set(leafType, list);
            }
        }
    }
    const weeks = [...weekCounts.entries()]
        .map(([week, completions]) => ({ week, completions }))
        .sort((a, b) => (a.week < b.week ? -1 : a.week > b.week ? 1 : 0));
    const cycleTime = [...cycleByType.entries()]
        .map(([type, days]) => ({
        type,
        avgDays: Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) / 10,
        count: days.length,
    }))
        .sort((a, b) => (a.type < b.type ? -1 : a.type > b.type ? 1 : 0));
    return { weeks, cycleTime };
}
function hasLegacyTrackerHistory(execGit, root) {
    try {
        const out = execGit("git", ["log", "--format=%H", "-1", "--", `${paths_js_1.LEGACY_TRACKER_DIR_NAME}/${paths_js_1.CONVENTION_FILE_NAME}`], { cwd: root, encoding: "utf8", maxBuffer: 1024 * 1024 });
        return out.trim().length > 0;
    }
    catch {
        return false;
    }
}
function parseSince(since) {
    if (since === undefined)
        return -Infinity;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(since) || Number.isNaN(Date.parse(`${since}T00:00:00Z`))) {
        throw new Error(`invalid --since '${since}' (expected YYYY-MM-DD)`);
    }
    return Date.parse(`${since}T00:00:00Z`);
}
function formatTrendTable(trend) {
    const lines = ["trend (from git history):"];
    lines.push("  completions by ISO week:");
    if (trend.weeks.length === 0)
        lines.push("    (none)");
    for (const w of trend.weeks)
        lines.push(`    ${w.week}: ${w.completions}`);
    lines.push("  average cycle time (claim -> terminal, days):");
    if (trend.cycleTime.length === 0)
        lines.push("    (none)");
    for (const c of trend.cycleTime) {
        lines.push(`    ${c.type}: ${c.avgDays.toFixed(1)}d (${c.count} completed)`);
    }
    return `${lines.join("\n")}\n`;
}
function formatTrendMarkdown(trend) {
    const lines = ["## Trend", ""];
    lines.push("_Weekly completions (from git history):_", "");
    if (trend.weeks.length === 0) {
        lines.push("_None._", "");
    }
    else {
        for (const w of trend.weeks)
            lines.push(`- ${w.week}: ${w.completions}`);
        lines.push("");
    }
    lines.push("_Average cycle time (claim → terminal):_", "");
    if (trend.cycleTime.length === 0) {
        lines.push("_None._", "");
    }
    else {
        for (const c of trend.cycleTime) {
            lines.push(`- **${c.type}**: ${c.avgDays.toFixed(1)} days (${c.count} completed)`);
        }
        lines.push("");
    }
    return `${lines.join("\n")}\n`;
}
function isoWeekKey(date) {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
    const week = Math.ceil(((d.getTime() - yearStart) / 86_400_000 + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
function unquote(raw) {
    const value = raw.trim();
    if ((value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
        (value.startsWith("'") && value.endsWith("'") && value.length >= 2)) {
        return value.slice(1, -1);
    }
    return value;
}
const RECORD_SEP = "\u001e";
const UNIT_SEP = "\u001f";
function parseLog(out) {
    const events = [];
    const renames = new Map();
    const types = new Map();
    const commitDates = [];
    let currentPath = null;
    for (const line of out.split("\n")) {
        if (line.startsWith(RECORD_SEP)) {
            const idx = line.indexOf(UNIT_SEP);
            commitDates.push(idx === -1 ? "" : line.slice(idx + 1));
            currentPath = null;
            continue;
        }
        const seq = commitDates.length - 1;
        if (seq < 0)
            continue;
        if (line.startsWith("diff --git ")) {
            const match = line.match(/^diff --git a\/(.*) b\/(.*)$/);
            currentPath = match ? match[2] : null;
            continue;
        }
        if (currentPath === null)
            continue;
        if (line.startsWith("rename from ")) {
            renames.set(line.slice("rename from ".length), currentPath);
            continue;
        }
        if (line.startsWith("rename to "))
            continue;
        if (!line.startsWith("+") && !line.startsWith("-"))
            continue;
        const content = line.slice(1);
        if (line.startsWith("+") && content.startsWith("type:")) {
            const type = unquote(content.slice("type:".length));
            if (type)
                types.set(currentPath, type);
            continue;
        }
        if (!content.startsWith("status:"))
            continue;
        if (line.startsWith("-"))
            continue;
        const status = unquote(content.slice("status:".length));
        if (status)
            events.push({ seq, date: commitDates[seq], path: currentPath, status });
    }
    return { events, renames, types };
}
})

__arggonModules.set("lib/src/update.ts", (exports, require, module) => {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCsvList = parseCsvList;
exports.runUpdate = runUpdate;
exports.maybeCommitUpdate = maybeCommitUpdate;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const atomic_js_1 = require("./atomic.js");
const lock_js_1 = require("./lock.js");
const frontmatter_js_1 = require("./frontmatter.js");
const status_js_1 = require("./status.js");
const rules_js_1 = require("./rules.js");
const dates_js_1 = require("./dates.js");
const ids_js_1 = require("./ids.js");
const priority_js_1 = require("./priority.js");
const items_js_1 = require("./items.js");
const paths_js_1 = require("./paths.js");
const relations_js_1 = require("./relations.js");
const tracker_commit_js_1 = require("./tracker-commit.js");
const issue_roundtrip_js_1 = require("./issue-roundtrip.js");
const convention_js_1 = require("./convention.js");
const sanitize_js_1 = require("./sanitize.js");
function parseCsvList(raw) {
    return raw
        .split(",")
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
}
function runUpdate(opts) {
    const id = opts.id.trim();
    if (!id)
        throw new Error("id is required");
    if (opts.status !== undefined)
        (0, status_js_1.assertStatus)(opts.status);
    if (opts.assignee !== undefined)
        (0, status_js_1.assertAssignee)(opts.assignee);
    if (opts.unassign && opts.assignee !== undefined) {
        throw new Error("pass either --assignee or --unassign, not both");
    }
    if (opts.steal && opts.force) {
        throw new Error("--steal and --force are mutually exclusive (--steal already authorizes the takeover)");
    }
    let title;
    if (opts.title !== undefined) {
        title = opts.title.trim();
        if (!title)
            throw new Error("title must not be empty");
    }
    const labels = opts.labels !== undefined ? parseCsvList(opts.labels) : undefined;
    if (labels !== undefined)
        (0, ids_js_1.assertLabels)(labels);
    let priorityRequest;
    if (opts.priority !== undefined) {
        const trimmed = opts.priority.trim();
        if (trimmed) {
            (0, priority_js_1.assertPriority)(trimmed);
            priorityRequest = trimmed;
        }
        else {
            priorityRequest = null;
        }
    }
    const depsReplace = opts.dependsOn !== undefined ? parseCsvList(opts.dependsOn) : undefined;
    let depsAdd;
    if (opts.addDependsOn !== undefined) {
        depsAdd = opts.addDependsOn.trim();
        if (!depsAdd)
            throw new Error("--add-depends-on requires a non-empty item id");
    }
    let branchRequest;
    if (opts.branch !== undefined) {
        const trimmed = opts.branch.trim();
        if (trimmed) {
            (0, ids_js_1.assertBranchName)(trimmed);
            branchRequest = trimmed;
        }
        else {
            branchRequest = null;
        }
    }
    let parentRequest;
    if (opts.parent !== undefined) {
        parentRequest = opts.parent.trim();
        if (!parentRequest)
            throw new Error("--parent requires a non-empty item id");
    }
    let typeRequest;
    if (opts.type !== undefined) {
        const trimmed = opts.type.trim();
        if (!trimmed)
            throw new Error("--type requires a type");
        if (trimmed !== "story") {
            throw new Error("--type only supports 'story' in v1 (task → story promotion); demoting a story to a task is not supported");
        }
        if (parentRequest !== undefined) {
            throw new Error("pass either --type or --parent, not both (promotion derives the parent from the grandparent epic)");
        }
        typeRequest = trimmed;
    }
    let issueRequest;
    if (opts.issue !== undefined) {
        if (!Number.isInteger(opts.issue) || opts.issue < 0) {
            throw new Error("issue must be a positive integer (the GitHub issue number), or 0 to clear it");
        }
        issueRequest = opts.issue > 0 ? opts.issue : null;
    }
    let worktreeRequest;
    if (opts.worktreePath !== undefined) {
        const trimmed = opts.worktreePath.trim();
        worktreeRequest = trimmed ? (0, node_path_1.resolve)(trimmed) : null;
    }
    const requested = title !== undefined ||
        opts.status !== undefined ||
        opts.assignee !== undefined ||
        branchRequest !== undefined ||
        parentRequest !== undefined ||
        typeRequest !== undefined ||
        opts.unassign === true ||
        opts.steal === true ||
        worktreeRequest !== undefined ||
        labels !== undefined ||
        priorityRequest !== undefined ||
        depsReplace !== undefined ||
        opts.addDependsOn !== undefined ||
        issueRequest !== undefined ||
        opts.blockedReason !== undefined;
    if (!requested) {
        throw new Error("nothing to update (pass --title, --status, --assignee, --branch, ...)");
    }
    const peekTasksDir = (0, paths_js_1.findTasksDir)(opts.cwd);
    const peekItem = (0, items_js_1.itemsById)((0, items_js_1.loadItems)(peekTasksDir)).get(id);
    if (!peekItem) {
        throw new Error(`id '${id}' not found under the tracker`);
    }
    const apply = () => {
        const tasksDir = (0, paths_js_1.findTasksDir)(opts.cwd);
        const byId = (0, items_js_1.itemsById)((0, items_js_1.loadItems)(tasksDir));
        const item = byId.get(id);
        if (!item) {
            throw new Error(`id '${id}' not found under the tracker`);
        }
        let reparentTo;
        if (parentRequest !== undefined && parentRequest !== item.parent) {
            if ((0, relations_js_1.expectedParentType)(item.type) === null) {
                throw new Error("initiative cannot have a parent");
            }
            const parentItem = byId.get(parentRequest);
            if (!parentItem) {
                throw new Error(`parent '${parentRequest}' not found under the tracker`);
            }
            const descendants = new Set([id]);
            let grew = true;
            while (grew) {
                grew = false;
                for (const candidate of byId.values()) {
                    if (candidate.parent &&
                        descendants.has(candidate.parent) &&
                        !descendants.has(candidate.id)) {
                        descendants.add(candidate.id);
                        grew = true;
                    }
                }
            }
            if (descendants.has(parentRequest)) {
                throw new Error(`cannot reparent '${id}' under '${parentRequest}' (own descendant — cycle)`);
            }
            (0, relations_js_1.assertParentEdge)(item.type, parentItem.type);
            reparentTo = parentItem;
        }
        let promoteEpic;
        let promoteNewPath;
        let promoteNewId;
        if (typeRequest !== undefined) {
            if (item.type === "story") {
                throw new Error(`cannot convert '${id}': it is already a story`);
            }
            if (item.type !== "task") {
                throw new Error(`--type story promotes tasks only (v1); '${id}' is a ${item.type} — refusing (create the story and move the work instead)`);
            }
            const parentStory = item.parent ? byId.get(item.parent) : undefined;
            if (!parentStory || parentStory.type !== "story") {
                throw new Error(`task '${id}' has no parent story to derive the target epic from — create the epic first (arggon create epic <title> --parent <initiative-id>) and reparent '${id}' under a story below it`);
            }
            const epic = parentStory.parent ? byId.get(parentStory.parent) : undefined;
            if (!epic) {
                throw new Error(`parent story '${parentStory.id}' has no parent epic — create the epic first and reparent '${parentStory.id}' under it (a story lives under an epic)`);
            }
            try {
                (0, relations_js_1.assertParentEdge)("story", epic.type);
            }
            catch {
                throw new Error(`promoting '${id}' needs an epic target, but its grandparent '${epic.id}' is a ${epic.type} — create the epic first (arggon create epic <title> --parent <initiative-id>)`);
            }
            promoteNewId = id.startsWith("task-") ? `story-${id.slice("task-".length)}` : id;
            if (promoteNewId !== id && byId.has(promoteNewId)) {
                throw new Error(`cannot promote '${id}': target id '${promoteNewId}' is already taken`);
            }
            promoteEpic = epic;
            promoteNewPath = (0, paths_js_1.newItemPath)({
                tasksDir,
                type: "story",
                id: promoteNewId,
                parentContainerDir: epic.containerDir,
            });
        }
        let newDeps;
        if (depsReplace !== undefined || depsAdd !== undefined) {
            const base = depsReplace !== undefined ? depsReplace : item.dependsOn;
            newDeps = depsAdd !== undefined && !base.includes(depsAdd) ? [...base, depsAdd] : [...base];
            for (const dep of newDeps) {
                if (!byId.has(dep)) {
                    throw new Error(`depends_on id '${dep}' does not resolve to an existing item`);
                }
            }
        }
        const newStatus = opts.status ?? item.status;
        (0, rules_js_1.assertUpdateRules)({
            id,
            type: item.type,
            currentStatus: item.status,
            currentAssignee: item.assignee ?? null,
            requestedStatus: opts.status,
            requestedAssignee: opts.assignee,
            force: opts.force,
            steal: opts.steal,
        }, opts.agent ? "agent" : "human");
        const stealReason = opts.steal ? (opts.reason?.trim() ?? null) : null;
        if (opts.steal) {
            if (!stealReason) {
                throw new Error("--steal requires a non-empty --reason (the takeover is recorded in the item body)");
            }
            if (!(0, status_js_1.isClaimed)(item.type, item.status, item.assignee ?? null)) {
                throw new Error(`'${id}' is not currently claimed -- --steal takes over an existing claim (in_progress with an assignee); check \`arggon list --stale\``);
            }
            if (opts.assignee === undefined) {
                throw new Error(`--steal requires --assignee <your-login> (you become the assignee of '${id}')`);
            }
        }
        const flippingToDone = newStatus === "done" && item.status !== "done";
        const gatedLeaf = item.type === "task" || item.type === "bug";
        const gated = flippingToDone && gatedLeaf && !(0, items_js_1.acceptanceComplete)(item.body);
        const waiveReason = opts.waive !== undefined ? opts.waive.trim() : undefined;
        if (opts.waive !== undefined) {
            if (!waiveReason) {
                throw new Error("--waive requires a non-empty reason (the waiver is recorded in the item body)");
            }
            if (opts.agent) {
                throw new Error("agents must not waive the done gate; --waive is a human-only escape hatch (ArggonManager/docs/agents.md §5)");
            }
            if (!gated) {
                throw new Error("--waive is only valid with --status done on a task/bug whose acceptance checklist still has unchecked boxes (nothing to waive)");
            }
        }
        else if (gated) {
            throw new Error(`cannot mark '${id}' done: the acceptance checklist in the item body still has unchecked boxes. Tick every box, or pass --waive "<reason>" to record a dated waiver`);
        }
        const currentAssignee = item.assignee ?? null;
        let newAssignee;
        if (opts.assignee !== undefined) {
            newAssignee = opts.assignee;
        }
        else if (opts.unassign) {
            newAssignee = null;
        }
        else if (newStatus === "todo" && item.status === "in_progress") {
            newAssignee = null;
        }
        else {
            newAssignee = currentAssignee;
        }
        const currentBranch = item.branch ?? null;
        let newBranch;
        if (branchRequest !== undefined) {
            newBranch = branchRequest;
        }
        else if (newStatus === "todo" && item.status === "in_progress") {
            newBranch = null;
        }
        else {
            newBranch = currentBranch;
        }
        let newReason;
        if (newStatus === "blocked") {
            const explicit = opts.blockedReason?.trim() ? opts.blockedReason.trim() : null;
            newReason = explicit ?? item.blockedReason ?? null;
            if (!newReason) {
                throw new Error("status blocked requires --blocked-reason");
            }
        }
        else {
            if (opts.blockedReason !== undefined) {
                throw new Error("blocked_reason is only valid when status is blocked");
            }
            newReason = null;
        }
        const now = opts.now ?? new Date();
        const wasClaimed = (0, status_js_1.isClaimed)(item.type, item.status, currentAssignee);
        const willBeClaimed = (0, status_js_1.isClaimed)(item.type, newStatus, newAssignee);
        let newClaimedAt;
        if (!willBeClaimed) {
            newClaimedAt = null;
        }
        else if (!opts.steal && wasClaimed && newAssignee === currentAssignee) {
            newClaimedAt = item.claimedAt ?? null;
        }
        else {
            newClaimedAt = (0, dates_js_1.formatDateTime)(now);
        }
        (0, status_js_1.assertClaimAndBlocked)({
            type: item.type,
            status: newStatus,
            assignee: newAssignee,
            blockedReason: newReason,
        });
        const data = { ...item.data };
        const changed = [];
        if (title !== undefined && title !== item.title) {
            data.title = title;
            changed.push("title");
        }
        if (opts.status !== undefined && newStatus !== item.status) {
            data.status = newStatus;
            changed.push("status");
        }
        if (newAssignee !== currentAssignee) {
            data.assignee = newAssignee;
            changed.push("assignee");
        }
        if (newBranch !== currentBranch) {
            data.branch = newBranch;
            changed.push("branch");
        }
        const currentWorktreePath = item.worktreePath ?? null;
        if (worktreeRequest !== undefined && worktreeRequest !== currentWorktreePath) {
            if (worktreeRequest === null) {
                delete data.worktree_path;
            }
            else {
                data.worktree_path = worktreeRequest;
            }
            changed.push("worktree_path");
        }
        const currentIssue = item.issue ?? null;
        if (issueRequest !== undefined && issueRequest !== currentIssue) {
            if (issueRequest === null) {
                delete data.issue;
            }
            else {
                data.issue = issueRequest;
            }
            changed.push("issue");
        }
        if (labels !== undefined && labels.join("\u0000") !== item.labels.join("\u0000")) {
            data.labels = labels;
            changed.push("labels");
        }
        const currentPriority = item.priority ?? null;
        if (priorityRequest !== undefined && priorityRequest !== currentPriority) {
            if (priorityRequest === null) {
                delete data.priority;
            }
            else {
                data.priority = priorityRequest;
            }
            changed.push("priority");
        }
        if (newDeps !== undefined && newDeps.join("\u0000") !== item.dependsOn.join("\u0000")) {
            data.depends_on = newDeps;
            changed.push("depends_on");
        }
        const currentReason = item.blockedReason ?? null;
        if (newReason !== currentReason) {
            data.blocked_reason = newReason;
            changed.push("blocked_reason");
        }
        const currentClaimedAt = item.claimedAt ?? null;
        if (newClaimedAt !== currentClaimedAt) {
            if (newClaimedAt === null) {
                delete data.claimed_at;
            }
            else {
                data.claimed_at = newClaimedAt;
            }
            changed.push("claimed_at");
        }
        data.updated = (0, dates_js_1.formatDate)(now);
        let newBody = item.body;
        if (opts.steal && stealReason) {
            const note = `> stolen ${(0, dates_js_1.formatDate)(now)} by ${newAssignee}: ${stealReason}`;
            newBody = `${item.body.endsWith("\n") || item.body.length === 0 ? item.body : `${item.body}\n`}${note}\n`;
        }
        if (waiveReason) {
            const base = newBody.endsWith("\n") || newBody.length === 0 ? newBody : `${newBody}\n`;
            newBody = `${base}\n### Waiver ${(0, dates_js_1.formatDate)(now)}\n\n${waiveReason}\n`;
        }
        let targetPath = item.filePath;
        let movedFrom;
        let renamedFrom;
        const movedOldPaths = [];
        const movedNewPaths = [];
        if (reparentTo) {
            const newPath = (0, paths_js_1.newItemPath)({
                tasksDir,
                type: item.type,
                id,
                parentContainerDir: reparentTo.containerDir,
            });
            if (newPath !== item.filePath) {
                if ((0, node_fs_1.existsSync)(newPath)) {
                    throw new Error(`reparent target already exists: ${newPath}`);
                }
                const isLeaf = item.type === "task" || item.type === "bug";
                if (isLeaf) {
                    movedOldPaths.push(item.filePath);
                    movedNewPaths.push(newPath);
                    (0, node_fs_1.mkdirSync)((0, node_path_1.dirname)(newPath), { recursive: true });
                    (0, node_fs_1.renameSync)(item.filePath, newPath);
                }
                else {
                    const oldDir = item.containerDir;
                    const newDir = (0, node_path_1.dirname)(newPath);
                    for (const old of listFiles(oldDir)) {
                        if (old === item.filePath)
                            continue;
                        movedOldPaths.push(old);
                        movedNewPaths.push((0, node_path_1.join)(newDir, old.slice(oldDir.length + 1)));
                    }
                    movedOldPaths.push(item.filePath);
                    movedNewPaths.push(newPath);
                    (0, node_fs_1.mkdirSync)((0, node_path_1.dirname)(newDir), { recursive: true });
                    (0, node_fs_1.renameSync)(oldDir, newDir);
                }
                movedFrom = isLeaf ? item.filePath : item.containerDir;
            }
            data.parent = reparentTo.id;
            if (!changed.includes("parent"))
                changed.push("parent");
            targetPath = newPath;
        }
        if (promoteNewPath && promoteEpic && promoteNewId) {
            if ((0, node_fs_1.existsSync)(promoteNewPath)) {
                throw new Error(`promotion target already exists: ${promoteNewPath}`);
            }
            (0, node_fs_1.mkdirSync)((0, node_path_1.dirname)(promoteNewPath), { recursive: true });
            (0, node_fs_1.renameSync)(item.filePath, promoteNewPath);
            movedOldPaths.push(item.filePath);
            movedNewPaths.push(promoteNewPath);
            movedFrom = item.filePath;
            data.type = "story";
            changed.push("type");
            data.parent = promoteEpic.id;
            if (!changed.includes("parent"))
                changed.push("parent");
            if (promoteNewId !== id) {
                data.id = promoteNewId;
                changed.push("id");
                renamedFrom = id;
                for (const other of byId.values()) {
                    if (other.id === id || !other.dependsOn.includes(id))
                        continue;
                    (0, atomic_js_1.writeFileAtomic)(other.filePath, (0, frontmatter_js_1.stringifyFrontmatter)({
                        ...other.data,
                        depends_on: other.dependsOn.map((dep) => (dep === id ? promoteNewId : dep)),
                        updated: (0, dates_js_1.formatDate)(now),
                    }, other.body));
                    movedNewPaths.push(other.filePath);
                }
            }
            targetPath = promoteNewPath;
        }
        (0, atomic_js_1.writeFileAtomic)(targetPath, (0, frontmatter_js_1.stringifyFrontmatter)(data, newBody));
        const updated = (0, items_js_1.tryLoadItem)(targetPath);
        if (!updated) {
            throw new Error(`Updated item is unreadable: ${targetPath}`);
        }
        const { completed: completedContainers, skipped: cascadeSkipped } = opts.cascade === false || (newStatus !== "done" && newStatus !== "cancelled")
            ? { completed: [], skipped: [] }
            : autoCompleteAncestors(tasksDir, item, opts.now ?? new Date());
        const root = (0, paths_js_1.repoRootFromTasks)(tasksDir);
        let issueRoundtrip;
        const issueNumber = updated.issue ?? null;
        if (changed.includes("status") &&
            newStatus === "done" &&
            issueNumber !== null &&
            issueRoundtripEnabled(root)) {
            issueRoundtrip = (0, issue_roundtrip_js_1.closeLinkedIssue)(root, id, issueNumber, opts.execGh);
            if (!issueRoundtrip.closed) {
                process.stderr.write(`arggon: warning: issue round-trip skipped: ${(0, sanitize_js_1.sanitizeHumanError)(issueRoundtrip.skipped)}\n`);
            }
        }
        return {
            id: updated.id,
            path: targetPath,
            root,
            item: updated,
            changed,
            autoCompleted: completedContainers.map((container) => container.id),
            cascadeLevels: completedContainers.map((container) => container.type),
            cascadeSkipped,
            changedPaths: [
                targetPath,
                ...movedNewPaths,
                ...movedOldPaths,
                ...completedContainers.map((container) => container.filePath),
            ],
            movedFrom,
            ...(renamedFrom ? { renamedFrom } : {}),
            ...(issueRoundtrip ? { issueRoundtrip } : {}),
        };
    };
    return (0, lock_js_1.withItemLock)(peekItem.filePath, apply);
}
function issueRoundtripEnabled(root) {
    try {
        return (0, convention_js_1.readConventionConfig)(root).github.issueRoundtrip === true;
    }
    catch {
        return false;
    }
}
function maybeCommitUpdate(result, flag) {
    if (result.changed.length === 0 && result.autoCompleted.length === 0)
        return undefined;
    const statusChanged = result.changed.includes("status");
    const verb = statusChanged && (result.item.status === "done" || result.item.status === "cancelled")
        ? "done"
        : statusChanged && result.item.status === "in_progress"
            ? "claimed"
            : "updated";
    return (0, tracker_commit_js_1.commitTrackerMutation)(result.root, result.changedPaths, {
        message: (0, tracker_commit_js_1.updateCommitMessage)(verb, result.id, result.autoCompleted),
        commit: (0, tracker_commit_js_1.resolveAutoCommit)(flag, (0, tracker_commit_js_1.readAutoCommitConfig)(result.root)),
    });
}
const TERMINAL = new Set(["done", "cancelled"]);
function autoCompleteAncestors(tasksDir, from, now) {
    const completed = [];
    const skipped = [];
    const byId = (0, items_js_1.itemsById)((0, items_js_1.loadItems)(tasksDir));
    let parentId = from.parent;
    const seen = new Set([from.id]);
    while (parentId && !seen.has(parentId)) {
        seen.add(parentId);
        const container = byId.get(parentId);
        if (!container)
            break;
        const children = [...byId.values()].filter((candidate) => candidate.parent === container.id);
        const openSibling = children.find((child) => !subtreeClosed(child, byId));
        if (children.length === 0 || openSibling) {
            if (openSibling) {
                skipped.push({
                    id: container.id,
                    type: container.type,
                    reason: "subtree-open",
                    sibling: openSibling.id,
                });
            }
            break;
        }
        if (!TERMINAL.has(container.status)) {
            let stop = false;
            try {
                (0, lock_js_1.withItemLock)(container.filePath, () => {
                    const fresh = (0, items_js_1.tryLoadItem)(container.filePath);
                    if (!fresh) {
                        throw new Error(`Cascade ancestor unreadable: ${container.filePath}`);
                    }
                    if (TERMINAL.has(fresh.status)) {
                        container.status = fresh.status;
                        return;
                    }
                    if (!(0, items_js_1.acceptanceComplete)(fresh.body)) {
                        skipped.push({ id: fresh.id, type: fresh.type, reason: "acceptance-incomplete" });
                        stop = true;
                        return;
                    }
                    (0, atomic_js_1.writeFileAtomic)(fresh.filePath, (0, frontmatter_js_1.stringifyFrontmatter)({ ...fresh.data, status: "done", updated: (0, dates_js_1.formatDate)(now) }, fresh.body));
                    container.status = "done";
                    completed.push(fresh);
                });
            }
            catch (err) {
                if (err instanceof Error && /failed to acquire lock/.test(err.message)) {
                    skipped.push({ id: container.id, type: container.type, reason: "lock-timeout" });
                    stop = true;
                }
                else {
                    throw err;
                }
            }
            if (stop)
                break;
        }
        parentId = container.parent;
    }
    return { completed, skipped };
}
function subtreeClosed(item, byId) {
    if (!TERMINAL.has(item.status))
        return false;
    if (item.type === "task" || item.type === "bug")
        return true;
    const children = [...byId.values()].filter((candidate) => candidate.parent === item.id);
    return children.every((child) => subtreeClosed(child, byId));
}
function listFiles(dir) {
    const files = [];
    if (!(0, node_fs_1.existsSync)(dir))
        return files;
    for (const name of (0, node_fs_1.readdirSync)(dir)) {
        if (name.startsWith("."))
            continue;
        const full = (0, node_path_1.join)(dir, name);
        if ((0, node_fs_1.statSync)(full).isDirectory()) {
            files.push(...listFiles(full));
        }
        else {
            files.push(full);
        }
    }
    return files;
}
})

__arggonModules.set("lib/src/validate.ts", (exports, require, module) => {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runValidate = runValidate;
exports.formatValidateHuman = formatValidateHuman;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const convention_js_1 = require("./convention.js");
const ids_js_1 = require("./ids.js");
const priority_js_1 = require("./priority.js");
const items_js_1 = require("./items.js");
const paths_js_1 = require("./paths.js");
const relations_js_1 = require("./relations.js");
const sanitize_js_1 = require("./sanitize.js");
const status_js_1 = require("./status.js");
function posixRel(root, abs) {
    return (0, node_path_1.relative)(root, abs).split(node_path_1.sep).join("/");
}
function push(bucket, path, message, code) {
    bucket.push({ path, message, code });
}
function checkItemShape(item, errors) {
    const { relPath: rel, filePath, type, id, status, assignee, blockedReason, data } = item;
    try {
        (0, ids_js_1.assertValidId)(id);
    }
    catch (err) {
        push(errors, rel, err instanceof Error ? err.message : String(err), "INVALID_ID");
    }
    if (type !== "task" && type !== "bug") {
        if (id.startsWith("task-") || id.startsWith("bug-")) {
            push(errors, rel, `container id '${id}' must not start with task- or bug-`, "INVALID_ID_PREFIX");
        }
    }
    else {
        const prefix = type === "task" ? "task-" : "bug-";
        if (!id.startsWith(prefix)) {
            push(errors, rel, `${type} id must start with ${prefix}`, "INVALID_ID_PREFIX");
        }
    }
    const stem = (0, node_path_1.basename)(filePath, ".md");
    if (stem !== id) {
        push(errors, rel, `filename stem '${stem}' must equal id '${id}'`, "ID_FILENAME_MISMATCH");
    }
    if (type === "task" && !stem.startsWith("task-")) {
        push(errors, rel, "task filename must start with task-", "TYPE_FILENAME_MISMATCH");
    }
    if (type === "bug" && !stem.startsWith("bug-")) {
        push(errors, rel, "bug filename must start with bug-", "TYPE_FILENAME_MISMATCH");
    }
    if (data.assignee === "") {
        push(errors, rel, "assignee must not be an empty string", "INVALID_ASSIGNEE");
    }
    if (assignee && !status_js_1.ASSIGNEE_PATTERN.test(assignee)) {
        push(errors, rel, `invalid assignee '${assignee}'`, "INVALID_ASSIGNEE");
    }
    if (item.branch !== undefined && !ids_js_1.BRANCH_PATTERN.test(item.branch)) {
        push(errors, rel, `invalid branch name ${JSON.stringify(item.branch)} (must be a single non-blank token)`, "INVALID_BRANCH");
    }
    try {
        (0, status_js_1.assertClaimAndBlocked)({ type, status, assignee, blockedReason });
    }
    catch (err) {
        push(errors, rel, err instanceof Error ? err.message : String(err), "CLAIM_OR_BLOCKED");
    }
    for (const field of ["created", "updated"]) {
        const value = item[field];
        if (value !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            push(errors, rel, `${field} must be YYYY-MM-DD (got ${JSON.stringify(value)})`, "INVALID_DATE");
        }
    }
    const labelPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    const seenLabels = new Set();
    for (const label of item.labels) {
        if (!labelPattern.test(label)) {
            push(errors, rel, `label must be kebab-case ASCII (got ${JSON.stringify(label)})`, "INVALID_LABELS");
        }
        if (seenLabels.has(label)) {
            push(errors, rel, `duplicate label ${JSON.stringify(label)}`, "INVALID_LABELS");
        }
        seenLabels.add(label);
    }
    if (item.priority !== undefined && item.priority !== null && !(0, priority_js_1.isPriority)(item.priority)) {
        push(errors, rel, `priority must be one of p0, p1, p2, p3 (got ${JSON.stringify(item.priority)})`, "PRIORITY_INVALID");
    }
}
function checkDependencies(items, byId, errors) {
    const graph = new Map();
    for (const item of items) {
        const edges = [];
        for (const dep of item.dependsOn) {
            if (dep === item.id) {
                push(errors, item.relPath, `item '${item.id}' depends on itself`, "SELF_DEPENDENCY");
                continue;
            }
            if (!byId.has(dep)) {
                push(errors, item.relPath, `depends_on id '${dep}' does not resolve to an existing item`, "UNKNOWN_DEPENDENCY");
                continue;
            }
            edges.push(dep);
        }
        graph.set(item.id, edges);
    }
    const color = new Map();
    const stack = [];
    const reported = new Set();
    const visit = (id) => {
        color.set(id, "gray");
        stack.push(id);
        for (const dep of graph.get(id) ?? []) {
            const state = color.get(dep);
            if (state === "gray") {
                const cycle = stack.slice(stack.indexOf(dep));
                const key = [...cycle].sort().join("\u0000");
                if (!reported.has(key)) {
                    reported.add(key);
                    const anchorId = cycle.reduce((a, b) => (a < b ? a : b));
                    const at = cycle.indexOf(anchorId);
                    const chain = [...cycle.slice(at), ...cycle.slice(0, at), anchorId];
                    const anchor = byId.get(anchorId);
                    if (anchor) {
                        push(errors, anchor.relPath, `dependency cycle: ${chain.join(" -> ")}`, "DEPENDENCY_CYCLE");
                    }
                }
            }
            else if (state === undefined) {
                visit(dep);
            }
        }
        stack.pop();
        color.set(id, "black");
    };
    for (const item of items) {
        if (!color.has(item.id))
            visit(item.id);
    }
}
function runValidate(opts) {
    const location = (0, paths_js_1.findTrackerLocation)(opts.cwd);
    const tasksDir = location.dir;
    const root = location.repoRoot;
    const conventionVersion = (0, convention_js_1.readConventionVersion)(root);
    const errors = [];
    const warnings = [];
    const conventionRel = posixRel(root, location.conventionPath);
    if (location.legacy) {
        push(warnings, location.name, "tracker uses the legacy tasks/ layout — run `arggon migrate --layout` to move it to ArggonManager/ (docs included)", "LEGACY_LAYOUT");
    }
    if (conventionVersion > convention_js_1.CONVENTION_VERSION) {
        push(errors, conventionRel, `convention version ${conventionVersion} is newer than supported ${convention_js_1.CONVENTION_VERSION}`, "CONVENTION_VERSION");
        return { root, conventionVersion, layout: location.layout, errors, warnings };
    }
    try {
        (0, convention_js_1.readConventionConfig)(root);
    }
    catch (err) {
        push(errors, conventionRel, err instanceof Error ? err.message : String(err), "INVALID_BRANCH_PATTERN");
    }
    const { files, dirs } = (0, items_js_1.walkTasksTree)(tasksDir);
    const items = [];
    for (const file of files) {
        if (!file.endsWith(".md"))
            continue;
        const rel = posixRel(root, file);
        const loaded = (0, items_js_1.softTryLoadItem)(file);
        if (loaded.kind === "skip")
            continue;
        if (loaded.kind === "fatal") {
            for (const issue of loaded.issues) {
                push(errors, rel, issue.message, issue.code);
            }
            continue;
        }
        for (const issue of loaded.issues) {
            push(errors, rel, issue.message, issue.code);
        }
        const reserved = new Set(["order", "rank", "blocked_by", "estimate"]);
        for (const key of loaded.unknownKeys) {
            if (reserved.has(key)) {
                push(errors, rel, `reserved frontmatter key '${key}' is invalid in v0`, "RESERVED_KEY");
            }
            else {
                push(warnings, rel, `unknown unnamespaced frontmatter key '${key}'`, "UNKNOWN_KEY");
            }
        }
        const soft = { ...loaded.item, relPath: rel };
        checkItemShape(soft, errors);
        items.push(soft);
    }
    const byId = new Map();
    for (const item of items) {
        const prev = byId.get(item.id);
        if (prev) {
            push(errors, item.relPath, `duplicate id '${item.id}' (also ${prev.relPath})`, "DUPLICATE_ID");
            continue;
        }
        byId.set(item.id, item);
    }
    for (const item of items) {
        const expected = (0, relations_js_1.expectedParentType)(item.type);
        if (expected === null) {
            if (item.parent) {
                push(errors, item.relPath, "initiative cannot have a parent", "PARENT_FORBIDDEN");
            }
        }
        else if (!item.parent) {
            push(errors, item.relPath, `${item.type} requires parent type ${expected}`, "PARENT_REQUIRED");
        }
        else {
            const parentItem = byId.get(item.parent);
            if (!parentItem) {
                push(errors, item.relPath, `parent '${item.parent}' does not resolve to an existing item`, "PARENT_MISSING");
            }
            else {
                try {
                    (0, relations_js_1.assertParentEdge)(item.type, parentItem.type);
                }
                catch (err) {
                    push(errors, item.relPath, err instanceof Error ? err.message : String(err), "PARENT_TYPE");
                }
                const expectedPath = (0, paths_js_1.newItemPath)({
                    tasksDir,
                    type: item.type,
                    id: item.id,
                    parentContainerDir: parentItem.containerDir,
                });
                if (item.filePath !== expectedPath) {
                    push(errors, item.relPath, `path does not match parent '${item.parent}' (expected ${posixRel(root, expectedPath)})`, "PARENT_PATH_MISMATCH");
                }
            }
        }
        if (item.type === "initiative") {
            const expectedPath = (0, paths_js_1.newItemPath)({ tasksDir, type: "initiative", id: item.id });
            if (item.filePath !== expectedPath) {
                push(errors, item.relPath, `initiative path should be ${posixRel(root, expectedPath)}`, "TYPE_PATH_MISMATCH");
            }
        }
    }
    for (const dir of dirs) {
        const name = (0, node_path_1.basename)(dir);
        if (name.startsWith("."))
            continue;
        const index = (0, node_path_1.join)(dir, `${name}.md`);
        if (!(0, node_fs_1.existsSync)(index)) {
            push(errors, posixRel(root, dir), `missing required index ${name}.md`, "MISSING_INDEX");
        }
    }
    checkDependencies(items, byId, errors);
    for (const item of items) {
        if (item.type !== "story")
            continue;
        const dir = item.containerDir;
        for (const name of (0, node_fs_1.readdirSync)(dir)) {
            if (name.startsWith("."))
                continue;
            const full = (0, node_path_1.join)(dir, name);
            if ((0, node_fs_1.statSync)(full).isDirectory()) {
                push(errors, posixRel(root, full), "unknown directory under story (v0 allows only task-*.md / bug-*.md)", "UNKNOWN_STORY_CHILD");
                continue;
            }
            if (!name.endsWith(".md"))
                continue;
            if (name === `${item.id}.md`)
                continue;
            if (name.startsWith("task-") || name.startsWith("bug-"))
                continue;
            push(errors, posixRel(root, full), "unknown file under story (v0 allows only index + task-*.md / bug-*.md)", "UNKNOWN_STORY_CHILD");
        }
    }
    errors.sort((a, b) => a.path.localeCompare(b.path) || a.code.localeCompare(b.code));
    warnings.sort((a, b) => a.path.localeCompare(b.path) || a.code.localeCompare(b.code));
    return { root, conventionVersion, layout: location.layout, errors, warnings };
}
function formatValidateHuman(result) {
    const lines = [];
    for (const e of result.errors) {
        lines.push(`error ${(0, sanitize_js_1.sanitizeHumanError)(e.path)}: ${(0, sanitize_js_1.sanitizeHumanError)(e.message)} [${e.code}]`);
    }
    for (const w of result.warnings) {
        lines.push(`warning ${(0, sanitize_js_1.sanitizeHumanError)(w.path)}: ${(0, sanitize_js_1.sanitizeHumanError)(w.message)} [${w.code}]`);
    }
    if (result.errors.length === 0) {
        lines.push(`arggon validate: ok (${result.warnings.length} warning(s), convention v${result.conventionVersion})`);
    }
    else {
        lines.push(`arggon validate: failed with ${result.errors.length} error(s), ${result.warnings.length} warning(s)`);
    }
    return `${lines.join("\n")}\n`;
}
})

__arggonModules.set("lib/src/verdict.ts", (exports, require, module) => {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseVerdicts = parseVerdicts;
exports.classifyVerdicts = classifyVerdicts;
const COMMENT_HEADING = /^###\s+(\d{4}-\d{2}-\d{2})\s+@/;
const VERDICT_LINE = /^[ \t]*verdict:[ \t]*(approve|request-changes)(?=$|[ \t(])/i;
function parseVerdicts(body) {
    const verdicts = [];
    let order = -1;
    let currentDate = null;
    let seenVerdictInComment = false;
    for (const line of body.split("\n")) {
        if (/^###\s/.test(line)) {
            order++;
            const heading = COMMENT_HEADING.exec(line);
            currentDate = heading ? heading[1] : null;
            seenVerdictInComment = false;
            continue;
        }
        if (currentDate === null || seenVerdictInComment)
            continue;
        const match = VERDICT_LINE.exec(line);
        if (!match)
            continue;
        const scope = line.slice(match.index + match[0].length).trim();
        verdicts.push({
            date: currentDate,
            order,
            value: match[1].toLowerCase(),
            scope: scope.length > 0 ? scope : null,
        });
        seenVerdictInComment = true;
    }
    return verdicts;
}
function classifyVerdicts(body) {
    let latest = null;
    for (const verdict of parseVerdicts(body)) {
        if (latest === null ||
            verdict.date > latest.date ||
            (verdict.date === latest.date && verdict.order > latest.order)) {
            latest = verdict;
        }
    }
    if (!latest)
        return "none";
    return latest.value === "approve" ? "approved" : "changes-requested";
}
})

__arggonModules.set("lib/src/view-model.ts", (exports, require, module) => {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildStatusIndex = buildStatusIndex;
exports.openDependencyIds = openDependencyIds;
exports.hasOpenDependencies = hasOpenDependencies;
exports.sortById = sortById;
exports.priorityTier = priorityTier;
exports.sortByPriority = sortByPriority;
exports.sortByNextRank = sortByNextRank;
exports.matchesSubstringFilter = matchesSubstringFilter;
exports.visibleItems = visibleItems;
exports.itemsForStatus = itemsForStatus;
exports.statusCounts = statusCounts;
exports.priorityCounts = priorityCounts;
exports.groupItemsBy = groupItemsBy;
exports.treeEntries = treeEntries;
exports.isReadyTodo = isReadyTodo;
exports.readyTodoCount = readyTodoCount;
exports.applyViewLens = applyViewLens;
exports.applyViewFilter = applyViewFilter;
const filter_js_1 = require("./filter.js");
const ids_js_1 = require("./ids.js");
const next_js_1 = require("./next.js");
const priority_js_1 = require("./priority.js");
const status_js_1 = require("./status.js");
function buildStatusIndex(items) {
    return new Map(items.map((item) => [item.id, { status: item.status }]));
}
function openDependencyIds(dependsOn, byId) {
    return (0, next_js_1.openDependencies)({ dependsOn: [...dependsOn] }, byId);
}
function hasOpenDependencies(dependsOn, byId) {
    return openDependencyIds(dependsOn, byId).length > 0;
}
function sortById(items) {
    return [...items].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
function priorityTier(priority) {
    return priority !== null && priority !== undefined && (0, priority_js_1.isPriority)(priority)
        ? (0, priority_js_1.priorityRank)(priority)
        : (0, priority_js_1.priorityRank)("p3");
}
function sortByPriority(items) {
    return [...items].sort((a, b) => priorityTier(a.priority) - priorityTier(b.priority) ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
function sortByNextRank(items) {
    const byId = buildStatusIndex(items);
    const blockedByIndex = (0, filter_js_1.buildBlockedByIndex)(items.map((item) => ({ id: item.id, dependsOn: viewItemDependencies(item) })));
    const ready = (item) => isReadyTodo(item, byId);
    const tier = (item) => priorityTier(item.priority);
    const weight = (item) => (0, next_js_1.downstreamWeight)(item.id, blockedByIndex);
    const lexicographic = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    return [...items].sort((a, b) => Number(ready(b)) - Number(ready(a)) ||
        tier(a) - tier(b) ||
        weight(b) - weight(a) ||
        lexicographic(a, b));
}
function matchesSubstringFilter(item, filter) {
    if (filter === "")
        return true;
    const needle = filter.toLowerCase();
    return (item.id.toLowerCase().includes(needle) || (item.title ?? "").toLowerCase().includes(needle));
}
function visibleItems(items, filter) {
    return sortById(items).filter((item) => matchesSubstringFilter(item, filter));
}
function itemsForStatus(items, filter, status) {
    return visibleItems(items, filter).filter((item) => item.status === status);
}
function statusCounts(items) {
    const counts = {};
    for (const status of status_js_1.STATUSES)
        counts[status] = 0;
    for (const item of items)
        counts[item.status] += 1;
    return counts;
}
function priorityCounts(items) {
    const counts = { p0: 0, p1: 0, p2: 0, p3: 0, none: 0 };
    for (const item of items) {
        counts[item.priority !== null && item.priority !== undefined && (0, priority_js_1.isPriority)(item.priority)
            ? item.priority
            : "none"] += 1;
    }
    return counts;
}
function groupItemsBy(items, keyOf) {
    const byKey = new Map();
    for (const item of items) {
        const key = keyOf(item);
        const bucket = byKey.get(key);
        if (bucket)
            bucket.push(item);
        else
            byKey.set(key, [item]);
    }
    const keyed = [...byKey.keys()]
        .filter((key) => key !== null)
        .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
        .map((key) => ({ key, items: byKey.get(key) }));
    const bare = byKey.get(null);
    if (!bare)
        return keyed;
    if (keyed.length === 0)
        return [{ key: null, items: bare }];
    return [...keyed, { key: null, items: bare }];
}
function treeEntries(items) {
    const known = new Set(items.map((item) => item.id));
    const children = new Map();
    const roots = [];
    for (const item of items) {
        const parent = item.parent ?? null;
        if (parent === null || parent === "" || !known.has(parent)) {
            roots.push(item);
            continue;
        }
        const bucket = children.get(parent) ?? [];
        bucket.push(item);
        children.set(parent, bucket);
    }
    const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    roots.sort(byId);
    for (const bucket of children.values())
        bucket.sort(byId);
    const entries = [];
    const visited = new Set();
    const walk = (item, depth) => {
        if (visited.has(item.id))
            return;
        visited.add(item.id);
        entries.push({ item, depth });
        for (const child of children.get(item.id) ?? [])
            walk(child, depth + 1);
    };
    for (const root of roots)
        walk(root, 0);
    for (const item of [...items].sort(byId)) {
        if (!visited.has(item.id))
            walk(item, 0);
    }
    return entries;
}
function viewItemDependencies(item) {
    return [...(item.dependsOn ?? item.depends_on ?? [])];
}
function isReadyTodo(item, byId) {
    return ((0, status_js_1.isClaimable)(item.type) &&
        item.status === "todo" &&
        (item.assignee ?? null) === null &&
        (0, next_js_1.isReady)({ ...item, dependsOn: viewItemDependencies(item) }, byId));
}
function readyTodoCount(items) {
    const byId = buildStatusIndex(items);
    return items.filter((item) => isReadyTodo(item, byId)).length;
}
function applyViewLens(items, lens = {}) {
    const predicates = lens.filter === undefined || lens.filter.trim() === "" ? [] : (0, filter_js_1.parseFilter)(lens.filter);
    const kernelItems = items.map((item) => ({ ...item, dependsOn: viewItemDependencies(item) }));
    const blockedByIndex = (0, filter_js_1.buildBlockedByIndex)(kernelItems);
    const ancestorIndex = (0, filter_js_1.buildAncestorIndex)(items);
    const statusById = buildStatusIndex(items);
    const kept = items.filter((item, index) => {
        if (lens.status !== undefined && item.status !== lens.status)
            return false;
        const kernelItem = kernelItems[index];
        if (lens.ready === true && !(0, next_js_1.isReady)(kernelItem, statusById))
            return false;
        return predicates.every((pred) => (0, filter_js_1.matchesPredicate)(kernelItem, pred, blockedByIndex, ancestorIndex));
    });
    return lens.sort === "priority" ? sortByPriority(kept) : sortById(kept);
}
function applyViewFilter(items, expr, opts = {}) {
    const trimmed = expr.trim();
    if (trimmed === "")
        return { ok: true, items: [...items] };
    const messageOf = (err) => (err instanceof Error ? err.message : String(err));
    let tokens;
    try {
        tokens = (0, filter_js_1.splitFilterTokens)(trimmed);
    }
    catch (err) {
        return { ok: false, error: messageOf(err) };
    }
    const needles = [];
    const predicates = [];
    for (const token of tokens) {
        let negated = false;
        let rest = token;
        if (rest.startsWith("!")) {
            negated = true;
            rest = rest.slice(1);
        }
        if (rest.indexOf(":") <= 0) {
            if (negated) {
                return {
                    ok: false,
                    error: `bad filter token "${token}" (negation applies to field:value predicates; free text matches id/title as-is)`,
                };
            }
            try {
                const text = (0, filter_js_1.unquoteFilterValue)(rest, trimmed);
                if (!text)
                    return { ok: false, error: `empty value in filter token "${token}"` };
                needles.push(text.toLowerCase());
            }
            catch (err) {
                return { ok: false, error: messageOf(err) };
            }
            continue;
        }
        try {
            predicates.push(...(0, filter_js_1.parseFilter)(token));
        }
        catch (err) {
            return { ok: false, error: messageOf(err) };
        }
    }
    for (const pred of predicates) {
        if (pred.field === "type" && !(0, ids_js_1.isItemType)(pred.value)) {
            return {
                ok: false,
                error: `unknown type "${pred.value}". Allowed: ${ids_js_1.ITEM_TYPES.join(", ")}`,
            };
        }
        if (pred.field === "status" && !(0, status_js_1.isStatus)(pred.value)) {
            return {
                ok: false,
                error: `unknown status "${pred.value}". Allowed: ${status_js_1.STATUSES.join(", ")}`,
            };
        }
        if (pred.field === "priority" && pred.value !== "none" && !(0, priority_js_1.isPriority)(pred.value)) {
            return {
                ok: false,
                error: `unknown priority "${pred.value}". Allowed: ${priority_js_1.PRIORITIES.join(", ")}, none`,
            };
        }
        if (pred.field === "assignee" && pred.value === "@me") {
            const login = opts.me !== undefined ? opts.me : (opts.resolveMe?.() ?? null);
            if (login === null || login === "") {
                return {
                    ok: false,
                    error: "could not resolve @me (set GITHUB_USER or GITHUB_ACTOR, or authenticate gh: gh api user)",
                };
            }
            pred.value = login;
        }
    }
    const kernelItems = items.map((item) => ({
        ...item,
        dependsOn: [...(item.dependsOn ?? item.depends_on ?? [])],
    }));
    const blockedByIndex = (0, filter_js_1.buildBlockedByIndex)(kernelItems);
    const ancestorIndex = (0, filter_js_1.buildAncestorIndex)(items);
    const kept = items.filter((item, index) => {
        const kernelItem = kernelItems[index];
        for (const pred of predicates) {
            if (!(0, filter_js_1.matchesPredicate)(kernelItem, pred, blockedByIndex, ancestorIndex))
                return false;
        }
        for (const needle of needles) {
            if (!matchesSubstringFilter(item, needle))
                return false;
        }
        return true;
    });
    return { ok: true, items: kept };
}
})

__arggonModules.set("lib/src/worktree.ts", (exports, require, module) => {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_CLAIM_WRITE_NAMES = exports.MAX_CLAIM_TAKEOVERS = exports.MAX_PREP_STEPS = exports.WORKTREE_ENV_KEYS = exports.MAX_GATE_BINS = exports.MAX_MISSING_DEPENDENCIES = void 0;
exports.packageEntryPaths = packageEntryPaths;
exports.packageEntryExists = packageEntryExists;
exports.packageBuildScript = packageBuildScript;
exports.localWorkspacePackages = localWorkspacePackages;
exports.linkNodeModules = linkNodeModules;
exports.linkNodeModulesDetailed = linkNodeModulesDetailed;
exports.unlinkNodeModulesLink = unlinkNodeModulesLink;
exports.pointWorkspaceAtLocal = pointWorkspaceAtLocal;
exports.buildLocalWorkspaces = buildLocalWorkspaces;
exports.inspectGateBinResolution = inspectGateBinResolution;
exports.strictGateBinViolations = strictGateBinViolations;
exports.strictGateBinFailure = strictGateBinFailure;
exports.freshWorktreeInstallRefusal = freshWorktreeInstallRefusal;
exports.inspectDeclaredDependencies = inspectDeclaredDependencies;
exports.worktreeStateBase = worktreeStateBase;
exports.worktreeCacheBase = worktreeCacheBase;
exports.prepareWorktreeEnv = prepareWorktreeEnv;
exports.unlinkWorktreeEnv = unlinkWorktreeEnv;
exports.readWorktreeClaimStamp = readWorktreeClaimStamp;
exports.parseTrackedModifications = parseTrackedModifications;
exports.detectWorktreeForeignWrites = detectWorktreeForeignWrites;
exports.worktreeForeignWriteWarning = worktreeForeignWriteWarning;
exports.strictWorktreeWriteFailure = strictWorktreeWriteFailure;
exports.worktreeTakeoverWarning = worktreeTakeoverWarning;
exports.worktreeComposeProject = worktreeComposeProject;
exports.prepareWorktreeDependencies = prepareWorktreeDependencies;
exports.linkedWorkspacePackages = linkedWorkspacePackages;
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const LINK_FARM_MARKER = ".arggon-link-farm";
function isInside(parent, child) {
    return child === parent || child.startsWith(`${parent}${node_path_1.sep}`);
}
function packageManifest(pkgDir) {
    try {
        const parsed = JSON.parse((0, node_fs_1.readFileSync)((0, node_path_1.join)(pkgDir, "package.json"), "utf8"));
        return parsed !== null && typeof parsed === "object"
            ? parsed
            : null;
    }
    catch {
        return null;
    }
}
function packageEntryPaths(pkgDir) {
    const manifest = packageManifest(pkgDir);
    if (!manifest)
        return [];
    const entries = [];
    const collect = (value) => {
        if (typeof value === "string") {
            entries.push(value);
            return;
        }
        if (value === null || typeof value !== "object")
            return;
        const record = value;
        for (const condition of ["import", "default", "require", "node"])
            collect(record[condition]);
    };
    const exportsField = manifest.exports;
    if (typeof exportsField === "string")
        collect(exportsField);
    else if (exportsField !== null && typeof exportsField === "object") {
        const record = exportsField;
        collect("." in record ? record["."] : record);
    }
    if (entries.length === 0) {
        if (typeof manifest.main === "string")
            entries.push(manifest.main);
        else
            entries.push("index.js");
    }
    return [...new Set(entries.map((entry) => (0, node_path_1.resolve)(pkgDir, entry)))];
}
function packageEntryExists(pkgDir) {
    const entries = packageEntryPaths(pkgDir);
    return entries.length > 0 && entries.some((entry) => (0, node_fs_1.existsSync)(entry));
}
function packageBuildScript(pkgDir) {
    const scripts = packageManifest(pkgDir)?.scripts;
    if (scripts === null || typeof scripts !== "object")
        return undefined;
    const build = scripts.build;
    return typeof build === "string" && build.trim().length > 0 ? build : undefined;
}
function primaryWorkspaceLinks(primaryRoot) {
    const links = new Map();
    let primary;
    try {
        primary = (0, node_fs_1.realpathSync)(primaryRoot);
    }
    catch {
        return links;
    }
    const modules = (0, node_path_1.join)(primary, "node_modules");
    const consider = (name, link) => {
        try {
            if (!(0, node_fs_1.lstatSync)(link).isSymbolicLink())
                return;
            const target = (0, node_path_1.resolve)((0, node_fs_1.realpathSync)((0, node_path_1.dirname)(link)), (0, node_fs_1.readlinkSync)(link));
            if (!isInside(primary, target) || isInside(modules, target))
                return;
            const rel = (0, node_path_1.relative)(primary, target);
            if (rel === "")
                return;
            links.set(name, { target, relativePath: rel.split(node_path_1.sep).join("/") });
        }
        catch {
        }
    };
    let entries;
    try {
        entries = (0, node_fs_1.readdirSync)(modules, { withFileTypes: true });
    }
    catch {
        return links;
    }
    for (const entry of entries) {
        if (entry.name.startsWith("."))
            continue;
        const path = (0, node_path_1.join)(modules, entry.name);
        if (entry.name.startsWith("@")) {
            let members;
            try {
                members = (0, node_fs_1.readdirSync)(path, { withFileTypes: true });
            }
            catch {
                continue;
            }
            for (const member of members) {
                if (member.name.startsWith("."))
                    continue;
                consider(`${entry.name}/${member.name}`, (0, node_path_1.join)(path, member.name));
            }
            continue;
        }
        consider(entry.name, path);
    }
    return links;
}
function localWorkspacePackages(primaryRoot, worktreePath) {
    return localPackagesFromLinks(primaryWorkspaceLinks(primaryRoot), worktreePath);
}
function localPackagesFromLinks(links, worktreePath) {
    const packages = [];
    for (const [name, link] of links) {
        const path = (0, node_path_1.join)(worktreePath, link.relativePath);
        if (!(0, node_fs_1.existsSync)(path))
            continue;
        packages.push({ name, path, relativePath: link.relativePath });
    }
    return packages.sort((a, b) => a.name.localeCompare(b.name));
}
function linkEntry(source, to) {
    let type = "file";
    try {
        if ((0, node_fs_1.statSync)(source).isDirectory()) {
            type = process.platform === "win32" ? "junction" : "dir";
        }
    }
    catch {
    }
    (0, node_fs_1.symlinkSync)(source, to, type);
}
function createLinkFarm(target, link, workspaceLinks, locals) {
    const overrides = new Map();
    for (const pkg of locals) {
        if (packageEntryExists(pkg.path))
            overrides.set(pkg.name, pkg.path);
    }
    const sourceFor = (name, from) => overrides.get(name) ?? workspaceLinks.get(name)?.target ?? from;
    try {
        (0, node_fs_1.mkdirSync)(link, { recursive: true });
    }
    catch {
        return false;
    }
    try {
        for (const entry of (0, node_fs_1.readdirSync)(target, { withFileTypes: true })) {
            const from = (0, node_path_1.join)(target, entry.name);
            if (entry.name.startsWith("@")) {
                let members;
                try {
                    members = (0, node_fs_1.readdirSync)(from, { withFileTypes: true });
                }
                catch {
                    linkEntry(from, (0, node_path_1.join)(link, entry.name));
                    continue;
                }
                (0, node_fs_1.mkdirSync)((0, node_path_1.join)(link, entry.name), { recursive: true });
                for (const member of members) {
                    const name = `${entry.name}/${member.name}`;
                    linkEntry(sourceFor(name, (0, node_path_1.join)(from, member.name)), (0, node_path_1.join)(link, entry.name, member.name));
                }
                continue;
            }
            linkEntry(sourceFor(entry.name, from), (0, node_path_1.join)(link, entry.name));
        }
        (0, node_fs_1.writeFileSync)((0, node_path_1.join)(link, LINK_FARM_MARKER), `${(0, node_path_1.resolve)(target)}\n`);
        return true;
    }
    catch {
        try {
            (0, node_fs_1.rmSync)(link, { recursive: true, force: true });
        }
        catch {
        }
        return false;
    }
}
function linkNodeModules(primaryRoot, worktreePath) {
    return linkNodeModulesDetailed(primaryRoot, worktreePath).linked;
}
function linkNodeModulesDetailed(primaryRoot, worktreePath) {
    const target = (0, node_path_1.join)(primaryRoot, "node_modules");
    const link = (0, node_path_1.join)(worktreePath, "node_modules");
    if (!(0, node_fs_1.existsSync)(target))
        return { linked: false, outcome: "primary-install-missing" };
    if ((0, node_fs_1.existsSync)(link))
        return { linked: false, outcome: "worktree-install-present" };
    const workspaceLinks = primaryWorkspaceLinks(primaryRoot);
    const locals = localPackagesFromLinks(workspaceLinks, worktreePath);
    if (locals.length > 0 && createLinkFarm(target, link, workspaceLinks, locals)) {
        return { linked: true, outcome: "farm-created" };
    }
    try {
        (0, node_fs_1.symlinkSync)(target, link, process.platform === "win32" ? "junction" : "dir");
        return {
            linked: true,
            outcome: locals.length > 0 ? "farm-failed-symlink-fallback" : "symlink-created",
        };
    }
    catch {
        return { linked: false, outcome: "failed" };
    }
}
function ownedLinkFarm(primaryRoot, worktreePath) {
    const link = (0, node_path_1.join)(worktreePath, "node_modules");
    try {
        if ((0, node_fs_1.lstatSync)(link).isSymbolicLink())
            return null;
        const marker = (0, node_fs_1.readFileSync)((0, node_path_1.join)(link, LINK_FARM_MARKER), "utf8").trim();
        if (marker.length === 0)
            return null;
        if ((0, node_path_1.resolve)(marker) !== (0, node_path_1.resolve)((0, node_path_1.join)(primaryRoot, "node_modules")))
            return null;
        return link;
    }
    catch {
        return null;
    }
}
function unlinkNodeModulesLink(primaryRoot, worktreePath) {
    const target = (0, node_path_1.resolve)((0, node_path_1.join)(primaryRoot, "node_modules"));
    const link = (0, node_path_1.join)(worktreePath, "node_modules");
    let isLink;
    try {
        isLink = (0, node_fs_1.lstatSync)(link).isSymbolicLink();
    }
    catch {
        return false;
    }
    if (isLink) {
        try {
            if ((0, node_path_1.resolve)((0, node_path_1.dirname)(link), (0, node_fs_1.readlinkSync)(link)) !== target)
                return false;
        }
        catch {
            return false;
        }
        try {
            (0, node_fs_1.unlinkSync)(link);
            return true;
        }
        catch {
            try {
                (0, node_fs_1.rmdirSync)(link);
                return true;
            }
            catch {
                return false;
            }
        }
    }
    if (ownedLinkFarm(primaryRoot, worktreePath) === null)
        return false;
    try {
        (0, node_fs_1.rmSync)(link, { recursive: true, force: true });
        return true;
    }
    catch {
        return false;
    }
}
function pointWorkspaceAtLocal(primaryRoot, worktreePath, name) {
    const link = ownedLinkFarm(primaryRoot, worktreePath);
    if (link === null)
        return false;
    const local = localWorkspacePackages(primaryRoot, worktreePath).find((pkg) => pkg.name === name);
    if (!local)
        return false;
    const entry = (0, node_path_1.join)(link, ...name.split("/"));
    const staged = `${entry}.arggon-new`;
    try {
        (0, node_fs_1.unlinkSync)(staged);
    }
    catch {
    }
    try {
        linkEntry(local.path, staged);
    }
    catch {
        return false;
    }
    try {
        (0, node_fs_1.renameSync)(staged, entry);
        return true;
    }
    catch {
        try {
            (0, node_fs_1.unlinkSync)(staged);
        }
        catch {
        }
        return false;
    }
}
function defaultWorkspaceBuildRunner(pkgDir) {
    const npm = process.platform === "win32" ? "npm.cmd" : "npm";
    const result = (0, node_child_process_1.spawnSync)(npm, ["run", "build"], {
        cwd: pkgDir,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
    });
    return result.error === undefined && result.status === 0;
}
function installConsumesLocalBuild(primaryRoot, worktreePath, pkg) {
    if (ownedLinkFarm(primaryRoot, worktreePath) !== null)
        return true;
    try {
        const local = (0, node_fs_1.realpathSync)(pkg.path);
        const target = (0, node_fs_1.realpathSync)((0, node_path_1.join)(worktreePath, "node_modules", ...pkg.name.split("/")));
        return isInside(local, target);
    }
    catch {
        return false;
    }
}
function buildLocalWorkspaces(primaryRoot, worktreePath, deps = {}) {
    const runBuild = deps.runBuild ?? defaultWorkspaceBuildRunner;
    const built = [];
    for (const pkg of localWorkspacePackages(primaryRoot, worktreePath)) {
        try {
            if (packageEntryExists(pkg.path)) {
                deps.onStep?.("entry-exists", pkg.name);
                continue;
            }
            if (packageBuildScript(pkg.path) === undefined) {
                deps.onStep?.("no-build-script", pkg.name);
                continue;
            }
            if (!installConsumesLocalBuild(primaryRoot, worktreePath, pkg)) {
                deps.onStep?.("install-cannot-consume", pkg.name);
                continue;
            }
            if (!runBuild(pkg.path)) {
                deps.onStep?.("build-failed", pkg.name);
                continue;
            }
            if (!packageEntryExists(pkg.path)) {
                deps.onStep?.("build-no-entry", pkg.name);
                continue;
            }
            if (pointWorkspaceAtLocal(primaryRoot, worktreePath, pkg.name)) {
                deps.onStep?.("built", pkg.name);
                built.push(pkg.name);
            }
            else {
                deps.onStep?.("flip-failed", pkg.name);
            }
        }
        catch {
            deps.onStep?.("errored", pkg.name);
        }
    }
    return built;
}
exports.MAX_MISSING_DEPENDENCIES = 10;
function declaredDependencyNames(pkgDir) {
    const path = (0, node_path_1.join)(pkgDir, "package.json");
    if (!(0, node_fs_1.existsSync)(path))
        return [];
    let parsed;
    try {
        parsed = JSON.parse((0, node_fs_1.readFileSync)(path, "utf8").replace(/^\uFEFF/, ""));
    }
    catch {
        return null;
    }
    if (parsed === null || typeof parsed !== "object")
        return null;
    const manifest = parsed;
    const names = new Set();
    for (const field of ["dependencies", "devDependencies"]) {
        const section = manifest[field];
        if (section === null || typeof section !== "object" || Array.isArray(section))
            continue;
        for (const name of Object.keys(section)) {
            if (name.length > 0)
                names.add(name);
        }
    }
    return [...names].sort();
}
function installResolutionPath(fromDir) {
    const roots = [];
    let dir = (0, node_path_1.resolve)(fromDir);
    for (;;) {
        const modules = (0, node_path_1.join)(dir, "node_modules");
        if ((0, node_fs_1.existsSync)(modules))
            roots.push(modules);
        const parent = (0, node_path_1.dirname)(dir);
        if (parent === dir)
            return roots;
        dir = parent;
    }
}
exports.MAX_GATE_BINS = 8;
function packageBinNames(pkgDir, packageName) {
    const manifest = packageManifest(pkgDir);
    if (manifest === null)
        return [];
    const bin = manifest.bin;
    if (typeof bin === "string" && bin.length > 0) {
        const own = packageName.split("/").pop() ?? packageName;
        return own.length > 0 ? [own] : [];
    }
    if (bin !== null && typeof bin === "object" && !Array.isArray(bin)) {
        return Object.keys(bin).filter((name) => name.length > 0);
    }
    return [];
}
function installedPackageDir(modules, name) {
    const segments = name.split("/");
    for (const root of modules) {
        const dir = (0, node_path_1.join)(root, ...segments);
        if ((0, node_fs_1.existsSync)((0, node_path_1.join)(dir, "package.json")))
            return dir;
    }
    return null;
}
function binOnResolutionPath(fromDir, worktreePath, bin) {
    let dir = (0, node_path_1.resolve)(fromDir);
    for (;;) {
        const candidate = (0, node_path_1.join)(dir, "node_modules", ".bin", bin);
        if ((0, node_fs_1.existsSync)(candidate)) {
            return {
                path: candidate,
                source: isInside((0, node_path_1.resolve)(worktreePath), dir) ? "worktree" : "external",
            };
        }
        const parent = (0, node_path_1.dirname)(dir);
        if (parent === dir)
            return null;
        dir = parent;
    }
}
function binOnPath(bin, env) {
    const search = env.PATH ?? env.Path;
    if (typeof search !== "string" || search.length === 0)
        return null;
    for (const dir of search.split(node_path_1.delimiter)) {
        if (dir.length === 0)
            continue;
        const candidate = (0, node_path_1.join)(dir, bin);
        if ((0, node_fs_1.existsSync)(candidate))
            return candidate;
    }
    return null;
}
function inspectGateBinResolution(worktreePath, primaryRoot, env = process.env) {
    const declared = declaredDependencyNames(worktreePath);
    if (declared === null || declared.length === 0)
        return [];
    const discovery = installResolutionPath(worktreePath);
    if (primaryRoot !== undefined)
        discovery.push(...installResolutionPath(primaryRoot));
    const names = new Set();
    for (const dep of declared) {
        if (names.size >= exports.MAX_GATE_BINS)
            break;
        const dir = installedPackageDir(discovery, dep);
        if (dir !== null) {
            const bins = packageBinNames(dir, dep);
            if (bins.length === 0)
                continue;
            for (const bin of bins) {
                names.add(bin);
                if (names.size >= exports.MAX_GATE_BINS)
                    break;
            }
            continue;
        }
        names.add(dep);
    }
    const resolveBin = (bin) => {
        const onModules = binOnResolutionPath(worktreePath, worktreePath, bin);
        if (onModules !== null)
            return { name: bin, source: onModules.source, path: onModules.path };
        const onPath = binOnPath(bin, env);
        if (onPath !== null)
            return { name: bin, source: "path", path: onPath };
        return { name: bin, source: "missing" };
    };
    return [...names].sort().slice(0, exports.MAX_GATE_BINS).map(resolveBin);
}
function strictGateBinViolations(gateBins) {
    return gateBins.filter((bin) => bin.source !== "worktree");
}
function strictGateBinFailure(gateBins, worktreePath) {
    const broken = strictGateBinViolations(gateBins);
    if (broken.length === 0)
        return null;
    const named = broken
        .map((bin) => {
        if (bin.source === "missing")
            return `${bin.name}: not resolvable from the worktree`;
        if (bin.source === "path") {
            return `${bin.name}: resolves only via PATH from ${bin.path} (outside the worktree)`;
        }
        return `${bin.name}: resolves from ${bin.path}, above the worktree`;
    })
        .join("; ");
    return (`x-tracker.strict-gate-bins is set: refusing the claim commit — gate binaries do not ` +
        `resolve inside the worktree: ${named}. ` +
        `Fix: run \`npm ci\` in ${worktreePath} for a worktree-local install.`);
}
function freshWorktreeInstallRefusal(gateBins, worktreePath, steps = []) {
    const broken = strictGateBinViolations(gateBins);
    if (broken.length === 0)
        return null;
    const named = broken
        .map((bin) => {
        if (bin.source === "missing")
            return `${bin.name}: not resolvable from the worktree`;
        if (bin.source === "path") {
            return `${bin.name}: resolves only via PATH from ${bin.path} (outside the worktree)`;
        }
        return `${bin.name}: resolves from ${bin.path}, above the worktree`;
    })
        .join("; ");
    const prep = steps.length > 0
        ? ` Preparation ran: ${steps
            .map((entry) => `${entry.step}:${entry.outcome}${entry.pkg ? ` (${entry.pkg})` : ""}`)
            .join(", ")}.`
        : "";
    return (`refusing the claim commit — a fresh worktree must leave a gate-usable install, and ` +
        `these gate binaries do not resolve inside it: ${named}.${prep} ` +
        `Fix: run \`npm ci\` in ${worktreePath} for a worktree-local install ` +
        `(or \`npm install\` in the primary checkout if its install is stale or missing), ` +
        `then re-run start --worktree to attach.`);
}
function inspectDeclaredDependencies(worktreePath) {
    const declared = declaredDependencyNames(worktreePath);
    if (declared === null)
        return { coverage: "unknown", missing: [], missingTotal: 0 };
    if (declared.length === 0)
        return { coverage: "satisfied", missing: [], missingTotal: 0 };
    const roots = installResolutionPath(worktreePath);
    if (roots.length === 0)
        return { coverage: "unknown", missing: [], missingTotal: 0 };
    const missing = declared.filter((name) => {
        const segments = name.split("/");
        return !roots.some((root) => (0, node_fs_1.existsSync)((0, node_path_1.join)(root, ...segments)));
    });
    return {
        coverage: missing.length === 0 ? "satisfied" : "stale",
        missing: missing.slice(0, exports.MAX_MISSING_DEPENDENCIES),
        missingTotal: missing.length,
    };
}
exports.WORKTREE_ENV_KEYS = [
    "ARGON_ITEM",
    "ARGGON_WORKTREE_ID",
    "ARGGON_WORKTREE_PATH",
    "ARGGON_WORKTREE_BRANCH",
    "ARGGON_STATE_DIR",
    "ARGGON_CACHE_DIR",
];
function worktreeStateBase(env, home) {
    switch (process.platform) {
        case "darwin":
            return (0, node_path_1.join)(home, "Library", "Application Support");
        case "win32":
            return env.LOCALAPPDATA ?? (0, node_path_1.join)(home, "AppData", "Local");
        default:
            return env.XDG_STATE_HOME ?? (0, node_path_1.join)(home, ".local", "state");
    }
}
function worktreeCacheBase(env, home) {
    switch (process.platform) {
        case "darwin":
            return (0, node_path_1.join)(home, "Library", "Caches");
        case "win32":
            return env.LOCALAPPDATA ?? (0, node_path_1.join)(home, "AppData", "Local");
        default:
            return env.XDG_CACHE_HOME ?? (0, node_path_1.join)(home, ".cache");
    }
}
function envErrorMessage(error) {
    return (error instanceof Error ? error.message : String(error)).split("\n")[0] ?? "unknown error";
}
function defaultCheckIgnore(cwd, relPath) {
    const result = (0, node_child_process_1.spawnSync)("git", ["check-ignore", "--quiet", relPath], {
        cwd,
        encoding: "utf8",
        timeout: 10_000,
    });
    if (result.error !== undefined)
        return undefined;
    if (result.status === 0)
        return true;
    if (result.status === 1)
        return false;
    return undefined;
}
function prepareWorktreeEnv(primaryRoot, worktreePath, request) {
    if (request.enabled === false) {
        return { written: false, warning: "disabled via x-worktree.env: false" };
    }
    const env = request.env ?? process.env;
    const home = request.home ?? (0, node_os_1.homedir)();
    const worktreeId = (0, node_path_1.basename)(worktreePath);
    const stateDir = (0, node_path_1.join)(worktreeStateBase(env, home), worktreeId);
    const cacheDir = (0, node_path_1.join)(worktreeCacheBase(env, home), worktreeId);
    const warnings = [];
    try {
        (0, node_fs_1.mkdirSync)(stateDir, { recursive: true });
        (0, node_fs_1.mkdirSync)(cacheDir, { recursive: true });
    }
    catch (error) {
        return {
            written: false,
            warning: `could not create the per-worktree state/cache dirs: ${envErrorMessage(error)}`,
        };
    }
    const checkIgnore = request.checkIgnore ?? defaultCheckIgnore;
    const ignored = checkIgnore(worktreePath, ".arggon.env");
    const gitignored = ignored === undefined ? undefined : ignored;
    let seededDotenv;
    const dotenvSource = (0, node_path_1.join)(primaryRoot, ".env");
    const dotenvTarget = (0, node_path_1.join)(worktreePath, ".env");
    if (!(0, node_fs_1.existsSync)(dotenvTarget) && (0, node_fs_1.existsSync)(dotenvSource)) {
        try {
            (0, node_fs_1.copyFileSync)(dotenvSource, dotenvTarget, node_fs_1.constants.COPYFILE_EXCL);
            seededDotenv = dotenvTarget;
        }
        catch (error) {
            warnings.push(`could not seed .env: ${envErrorMessage(error)}`);
        }
    }
    const attachWarning = () => [...warnings, "already exists — left byte-identical (never overwritten)"].join("; ");
    const envPath = (0, node_path_1.join)(worktreePath, ".arggon.env");
    if ((0, node_fs_1.existsSync)(envPath)) {
        return {
            written: false,
            path: envPath,
            ...(gitignored !== undefined ? { gitignored } : {}),
            ...(seededDotenv !== undefined ? { seededDotenv } : {}),
            warning: attachWarning(),
        };
    }
    const value = (raw) => raw.replace(/[\r\n]+/g, " ");
    const body = [
        `ARGON_ITEM=${value(request.identity.itemId)}`,
        `ARGGON_WORKTREE_ID=${value(worktreeId)}`,
        `ARGGON_WORKTREE_PATH=${value((0, node_path_1.resolve)(worktreePath))}`,
        `ARGGON_WORKTREE_BRANCH=${value(request.identity.branch)}`,
        `ARGGON_STATE_DIR=${value(stateDir)}`,
        `ARGGON_CACHE_DIR=${value(cacheDir)}`,
    ].join("\n") + "\n";
    try {
        const fd = (0, node_fs_1.openSync)(envPath, "wx");
        try {
            (0, node_fs_1.writeSync)(fd, body, 0, "utf8");
        }
        finally {
            (0, node_fs_1.closeSync)(fd);
        }
    }
    catch (error) {
        if ((0, node_fs_1.existsSync)(envPath)) {
            return {
                written: false,
                path: envPath,
                ...(gitignored !== undefined ? { gitignored } : {}),
                ...(seededDotenv !== undefined ? { seededDotenv } : {}),
                warning: attachWarning(),
            };
        }
        warnings.push(`could not write .arggon.env: ${envErrorMessage(error)}`);
        return {
            written: false,
            ...(gitignored !== undefined ? { gitignored } : {}),
            warning: warnings.join("; "),
        };
    }
    return {
        written: true,
        path: envPath,
        keys: [...exports.WORKTREE_ENV_KEYS],
        ...(seededDotenv !== undefined ? { seededDotenv } : {}),
        ...(gitignored !== undefined ? { gitignored } : {}),
        ...(warnings.length > 0 ? { warning: warnings.join("; ") } : {}),
    };
}
exports.MAX_PREP_STEPS = 16;
function unlinkWorktreeEnv(worktreePath) {
    const envPath = (0, node_path_1.join)(worktreePath, ".arggon.env");
    let raw;
    try {
        if ((0, node_fs_1.lstatSync)(envPath).isSymbolicLink())
            return false;
        raw = (0, node_fs_1.readFileSync)(envPath, "utf8");
    }
    catch {
        return false;
    }
    const lines = raw.split("\n");
    if (lines.pop() !== "")
        return false;
    if (lines.length === 0)
        return false;
    const keys = new Set(exports.WORKTREE_ENV_KEYS);
    for (const line of lines) {
        const eq = line.indexOf("=");
        if (eq <= 0 || !keys.has(line.slice(0, eq)))
            return false;
    }
    try {
        (0, node_fs_1.rmSync)(envPath);
        return true;
    }
    catch {
        return false;
    }
}
const CLAIM_STAMP_FILE = "arggon-claim.json";
exports.MAX_CLAIM_TAKEOVERS = 5;
exports.MAX_CLAIM_WRITE_NAMES = 10;
function defaultAbsoluteGitDir(cwd) {
    const result = (0, node_child_process_1.spawnSync)("git", ["rev-parse", "--absolute-git-dir"], {
        cwd,
        encoding: "utf8",
        timeout: 10_000,
    });
    const out = String(result.stdout ?? "").trim();
    if (result.error !== undefined || result.status !== 0 || out.length === 0)
        return undefined;
    return out;
}
function defaultWorktreeStatus(cwd) {
    const result = (0, node_child_process_1.spawnSync)("git", ["status", "--porcelain"], {
        cwd,
        encoding: "utf8",
        timeout: 10_000,
    });
    if (result.error !== undefined || result.status !== 0)
        return undefined;
    return String(result.stdout ?? "");
}
function claimStampPath(worktreePath, deps) {
    const gitDir = (deps.gitDir ?? defaultAbsoluteGitDir)(worktreePath);
    if (gitDir === undefined || gitDir.length === 0)
        return undefined;
    return (0, node_path_1.join)(gitDir, CLAIM_STAMP_FILE);
}
function readWorktreeClaimStamp(worktreePath, deps = {}) {
    const path = claimStampPath(worktreePath, deps);
    if (path === undefined)
        return null;
    try {
        const parsed = JSON.parse((0, node_fs_1.readFileSync)(path, "utf8"));
        if (parsed === null || typeof parsed !== "object")
            return null;
        const record = parsed;
        const identity = typeof record.identity === "string" ? record.identity : undefined;
        const item = typeof record.item === "string" ? record.item : undefined;
        const branch = typeof record.branch === "string" ? record.branch : undefined;
        const claimedAt = typeof record.claimedAt === "string" ? record.claimedAt : undefined;
        if (identity === undefined ||
            item === undefined ||
            branch === undefined ||
            claimedAt === undefined) {
            return null;
        }
        const takeovers = parseTakeoverChain(record.takeovers);
        return {
            identity,
            item,
            branch,
            claimedAt,
            ...(typeof record.assignee === "string" && record.assignee.length > 0
                ? { assignee: record.assignee }
                : {}),
            ...(typeof record.surface === "string" && record.surface.length > 0
                ? { surface: record.surface }
                : {}),
            ...(takeovers.length > 0 ? { takeovers } : {}),
        };
    }
    catch {
        return null;
    }
}
function parseTakeoverChain(value) {
    if (!Array.isArray(value))
        return [];
    const entries = [];
    for (const entry of value) {
        if (entry === null || typeof entry !== "object")
            continue;
        const record = entry;
        const at = typeof record.at === "string" ? record.at : undefined;
        const by = typeof record.by === "string" ? record.by : undefined;
        const replacedIdentity = typeof record.replacedIdentity === "string" ? record.replacedIdentity : undefined;
        const replacedClaimedAt = typeof record.replacedClaimedAt === "string" ? record.replacedClaimedAt : undefined;
        if (at === undefined ||
            by === undefined ||
            replacedIdentity === undefined ||
            replacedClaimedAt === undefined) {
            continue;
        }
        entries.push({ at, by, replacedIdentity, replacedClaimedAt });
    }
    return entries.slice(-exports.MAX_CLAIM_TAKEOVERS);
}
function writeWorktreeClaimStamp(worktreePath, stamp, deps) {
    const path = claimStampPath(worktreePath, deps);
    if (path === undefined)
        return false;
    const tmp = `${path}.tmp-${process.pid}-${Date.now()}`;
    try {
        (0, node_fs_1.writeFileSync)(tmp, `${JSON.stringify(stamp, null, 2)}\n`, "utf8");
        (0, node_fs_1.renameSync)(tmp, path);
        return true;
    }
    catch {
        try {
            (0, node_fs_1.rmSync)(tmp, { force: true });
        }
        catch {
        }
        return false;
    }
}
function parseTrackedModifications(porcelain) {
    const paths = [];
    for (const line of porcelain.split("\n")) {
        if (line.trim().length === 0)
            continue;
        const code = line.slice(0, 2);
        if (code === "??" || code === "!!")
            continue;
        let path = line.slice(3).trim();
        const arrow = path.indexOf(" -> ");
        if (arrow !== -1)
            path = path.slice(arrow + 4);
        path = path.replace(/^"|"$/g, "");
        if (path.length > 0)
            paths.push(path);
    }
    return paths;
}
function detectWorktreeForeignWrites(worktreePath, stamp, deps = {}) {
    const claimedMs = Date.parse(stamp.claimedAt);
    if (!Number.isFinite(claimedMs))
        return null;
    const porcelain = (deps.status ?? defaultWorktreeStatus)(worktreePath);
    if (porcelain === undefined)
        return null;
    const files = [];
    let total = 0;
    for (const rel of parseTrackedModifications(porcelain)) {
        let mtimeMs;
        try {
            mtimeMs = (0, node_fs_1.statSync)((0, node_path_1.resolve)(worktreePath, rel)).mtimeMs;
        }
        catch {
            continue;
        }
        if (mtimeMs > claimedMs) {
            total++;
            if (files.length < exports.MAX_CLAIM_WRITE_NAMES)
                files.push(rel);
        }
    }
    if (total === 0)
        return null;
    return { owner: stamp.identity, claimedAt: stamp.claimedAt, files, total };
}
function worktreeForeignWriteWarning(report) {
    const extra = report.total - report.files.length;
    const named = report.files.join(", ");
    return (`the worktree is stamped by session ${report.owner} (claimed ${report.claimedAt}) and ` +
        `${report.total} tracked file${report.total === 1 ? " was" : "s were"} modified after that ` +
        `claim: ${named}${extra > 0 ? ` (and ${extra} more)` : ""} — that session's uncommitted ` +
        "work or a concurrent writer; check before writing here");
}
function strictWorktreeWriteFailure(report) {
    if (report.total === 0)
        return null;
    const extra = report.total - report.files.length;
    const named = report.files.join(", ");
    return (`x-tracker.strict-worktree-writes is set: refusing the claim — the worktree is stamped by ` +
        `session ${report.owner} (claimed ${report.claimedAt}) and ${report.total} tracked ` +
        `file${report.total === 1 ? " was" : "s were"} modified after that claim. ` +
        "Another session may be writing here; coordinate with the stamped session (or have it " +
        "re-attach to refresh the stamp), then re-run start --worktree to attach. This refusal " +
        "never re-stamps the worktree, so a retry re-detects the same evidence. If the stamped " +
        "session is gone (crashed): confirm no live writer, then re-run with the take-over flag " +
        "(start --worktree --take-over-worktree) — it re-stamps the worktree and records a dated " +
        "take-over naming the replaced stamp — or remove the stamp by hand " +
        '(rm "$(git -C <worktree> rev-parse --absolute-git-dir)/arggon-claim.json"). ' +
        `Files modified after that claim: ${named}${extra > 0 ? ` (and ${extra} more)` : ""}.`);
}
function worktreeTakeoverWarning(takeover) {
    const extra = takeover.total - takeover.files.length;
    const named = takeover.files.join(", ");
    return (`took over the worktree from ${takeover.replacedIdentity} (claimed ` +
        `${takeover.replaced.claimedAt}) at ${takeover.at} as ${takeover.by}: ` +
        `${takeover.total} tracked file${takeover.total === 1 ? " was" : "s were"} modified after ` +
        `that claim: ${named}${extra > 0 ? ` (and ${extra} more)` : ""} — the stamped session was ` +
        "presumed dead; confirm that before writing here");
}
function prepareWorktreeClaim(worktreePath, request) {
    const previous = readWorktreeClaimStamp(worktreePath, request);
    const claimedDate = request.now === undefined
        ? new Date()
        : request.now instanceof Date
            ? request.now
            : new Date(request.now);
    const claimedAt = (Number.isNaN(claimedDate.getTime()) ? new Date() : claimedDate).toISOString();
    let foreignWrites;
    let takeOver;
    if (previous !== null && previous.identity !== request.identity) {
        foreignWrites = detectWorktreeForeignWrites(worktreePath, previous, request) ?? undefined;
        if (foreignWrites !== undefined) {
            if (request.takeOver !== true) {
                return {
                    stamped: true,
                    foreignWrites,
                };
            }
            takeOver = {
                at: claimedAt,
                by: request.identity,
                replacedIdentity: previous.identity,
                replacedClaimedAt: previous.claimedAt,
                replaced: previous,
                files: [...foreignWrites.files],
                total: foreignWrites.total,
            };
        }
    }
    const chain = takeOver === undefined
        ? (previous?.takeovers ?? [])
        :
            [
                ...(previous?.takeovers ?? []).filter((entry) => entry.by !== takeOver.by),
                {
                    at: takeOver.at,
                    by: takeOver.by,
                    replacedIdentity: takeOver.replacedIdentity,
                    replacedClaimedAt: takeOver.replacedClaimedAt,
                },
            ];
    const stamped = writeWorktreeClaimStamp(worktreePath, {
        identity: request.identity,
        item: request.itemId,
        branch: request.branch,
        claimedAt,
        ...(request.assignee !== undefined && request.assignee.length > 0
            ? { assignee: request.assignee }
            : {}),
        ...(request.surface !== undefined ? { surface: request.surface } : {}),
        ...(chain.length > 0 ? { takeovers: chain.slice(-exports.MAX_CLAIM_TAKEOVERS) } : {}),
    }, request);
    return {
        stamped,
        ...(takeOver !== undefined
            ? { takeOver, ...(stamped ? {} : { warning: "could not write the claim stamp" }) }
            : {}),
        ...(stamped ? {} : { warning: "could not write the claim stamp" }),
    };
}
function worktreeComposeProject(services, worktreeId) {
    const base = services === "true" ? "" : `${services}-`;
    return `${base}${worktreeId}`.toLowerCase();
}
function prepareWorktreeDependencies(primaryRoot, worktreePath, deps = {}) {
    const claimReceipt = deps.claim === undefined ? undefined : prepareWorktreeClaim(worktreePath, deps.claim);
    const envReceipt = deps.env === undefined ? undefined : prepareWorktreeEnv(primaryRoot, worktreePath, deps.env);
    const worktreeModules = (0, node_path_1.join)(worktreePath, "node_modules");
    const steps = [];
    let stepsTruncated = false;
    const record = (step, outcome, pkg) => {
        if (steps.length >= exports.MAX_PREP_STEPS) {
            stepsTruncated = true;
            return;
        }
        steps.push(pkg === undefined ? { step, outcome } : { step, outcome, pkg });
    };
    const link = linkNodeModulesDetailed(primaryRoot, worktreePath);
    record("link", link.outcome);
    const builtWorkspaces = buildLocalWorkspaces(primaryRoot, worktreePath, {
        runBuild: deps.runBuild,
        onStep: (outcome, pkg) => record("build", outcome, pkg),
    });
    const linkedWorkspaces = linkedWorkspacePackages(primaryRoot, worktreePath);
    const hasInstall = (0, node_fs_1.existsSync)(worktreeModules);
    const primaryHasInstall = (0, node_fs_1.existsSync)((0, node_path_1.join)(primaryRoot, "node_modules"));
    const install = link.linked
        ? hasInstall
            ? "linked"
            : "unavailable"
        : hasInstall
            ? "existing"
            : primaryHasInstall
                ? "unavailable"
                : "missing";
    const declared = inspectDeclaredDependencies(worktreePath);
    const gateBins = inspectGateBinResolution(worktreePath, primaryRoot);
    const foreignBins = gateBins.filter((bin) => bin.source !== "worktree");
    record("gate-bins", foreignBins.length === 0 ? "all-worktree" : "foreign-resolution");
    return {
        ready: hasInstall &&
            linkedWorkspaces.length === 0 &&
            declared.coverage === "satisfied" &&
            gateBins.every((bin) => bin.source === "worktree"),
        install,
        linkedNodeModules: link.linked,
        builtWorkspaces,
        linkedWorkspaces,
        manifestCoverage: declared.coverage,
        missingDependencies: declared.missing,
        missingDependenciesTotal: declared.missingTotal,
        gateBins,
        steps,
        ...(stepsTruncated ? { stepsTruncated: true } : {}),
        ...(envReceipt !== undefined ? { env: envReceipt } : {}),
        ...(claimReceipt !== undefined ? { claim: claimReceipt } : {}),
    };
}
function linkedWorkspacePackages(primaryRoot, worktreePath) {
    const names = [];
    const worktreeModules = (0, node_path_1.join)(worktreePath, "node_modules");
    let primary;
    try {
        primary = (0, node_fs_1.realpathSync)(primaryRoot);
    }
    catch {
        return names;
    }
    const primaryModules = (0, node_path_1.join)(primary, "node_modules");
    const inspect = (name, link) => {
        try {
            if (!(0, node_fs_1.lstatSync)(link).isSymbolicLink())
                return;
            const target = (0, node_path_1.resolve)((0, node_fs_1.realpathSync)((0, node_path_1.dirname)(link)), (0, node_fs_1.readlinkSync)(link));
            if (!isInside(primary, target) || isInside(primaryModules, target))
                return;
            const rel = (0, node_path_1.relative)(primary, target);
            if (rel === "" || !(0, node_fs_1.existsSync)((0, node_path_1.join)(worktreePath, rel)))
                return;
            names.push(name);
        }
        catch {
        }
    };
    let entries;
    try {
        entries = (0, node_fs_1.readdirSync)(worktreeModules, { withFileTypes: true });
    }
    catch {
        return names;
    }
    for (const entry of entries) {
        if (entry.name.startsWith("."))
            continue;
        const path = (0, node_path_1.join)(worktreeModules, entry.name);
        if (entry.isDirectory() && entry.name.startsWith("@")) {
            let scoped;
            try {
                scoped = (0, node_fs_1.readdirSync)(path, { withFileTypes: true });
            }
            catch {
                continue;
            }
            for (const pkg of scoped) {
                if (pkg.name.startsWith("."))
                    continue;
                inspect(`${entry.name}/${pkg.name}`, (0, node_path_1.join)(path, pkg.name));
            }
            continue;
        }
        inspect(entry.name, path);
    }
    return names.sort();
}
})

__arggonModules.set("opencode/plugins/arggon/board.ts", (exports, require, module) => {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BOARD_DETAIL_MAX_LINE_CHARS = exports.BOARD_DETAIL_MAX_ROWS = exports.BOARD_SELECTION_MARK = exports.BOARD_SELECTION_PAGE = exports.BOARD_STATUS_ORDER = exports.BOARD_STATUS_MARKS = exports.BOARD_TYPE_BADGES = exports.ARGON_BOARD_PANEL = void 0;
exports.boardRoot = boardRoot;
exports.emptyBoardSnapshot = emptyBoardSnapshot;
exports.activeBoardId = activeBoardId;
exports.boardSnapshot = boardSnapshot;
exports.countBoardStatuses = countBoardStatuses;
exports.boardTreeEntries = boardTreeEntries;
exports.emptyBoardSelection = emptyBoardSelection;
exports.resolveBoardSelection = resolveBoardSelection;
exports.moveBoardSelection = moveBoardSelection;
exports.selectBoardItem = selectBoardItem;
exports.clipBoardLine = clipBoardLine;
exports.boardHeaderLine = boardHeaderLine;
exports.boardCountsLine = boardCountsLine;
exports.boardItemLine = boardItemLine;
exports.boardItemDetail = boardItemDetail;
exports.boardDetailLines = boardDetailLines;
exports.boardTreeLines = boardTreeLines;
exports.sidebarStatusLine = sidebarStatusLine;
const lib_1 = require("@arggondev/lib");
exports.ARGON_BOARD_PANEL = "arggon.board";
exports.BOARD_TYPE_BADGES = {
    initiative: "I",
    epic: "E",
    story: "S",
    task: "T",
    bug: "B",
};
exports.BOARD_STATUS_MARKS = {
    todo: "·",
    in_progress: "▸",
    blocked: "!",
    done: "✓",
    cancelled: "✗",
};
exports.BOARD_STATUS_ORDER = [
    "todo",
    "in_progress",
    "blocked",
    "done",
    "cancelled",
];
function boardRoot(cwd) {
    try {
        return (0, lib_1.repoRootFromTasks)((0, lib_1.findTasksDir)(cwd));
    }
    catch {
        return null;
    }
}
function emptyBoardSnapshot(reason) {
    return {
        root: null,
        items: [],
        counts: (0, lib_1.statusCounts)([]),
        activeId: null,
        nextId: null,
        error: reason,
    };
}
function detail(error) {
    return error instanceof Error ? error.message : String(error);
}
function activeBoardId(items, input = {}) {
    const known = new Set(items.map((item) => item.id));
    const env = (input.envItem ?? "").trim();
    if (env !== "" && known.has(env))
        return env;
    const branch = (input.branch ?? "").trim();
    const match = /^(?:feat|fix)\/(.+)$/.exec(branch);
    const candidate = match?.[1] ?? "";
    return candidate !== "" && known.has(candidate) ? candidate : null;
}
function boardSnapshot(cwd, input = {}) {
    let tasksDir;
    try {
        tasksDir = (0, lib_1.findTasksDir)(cwd);
    }
    catch {
        return emptyBoardSnapshot("no ArggonManager tracker found here");
    }
    try {
        const root = (0, lib_1.repoRootFromTasks)(tasksDir);
        const kernelItems = (0, lib_1.loadItems)(tasksDir);
        const byId = (0, lib_1.itemsById)(kernelItems);
        const items = (0, lib_1.sortById)(kernelItems.map((item) => ({
            id: item.id,
            type: item.type,
            title: (0, lib_1.sanitizeHumanTextUncapped)(item.title ?? item.id),
            status: item.status,
            parent: item.parent ?? null,
            assignee: item.assignee ?? null,
            priority: item.priority ?? null,
            blockedReason: item.blockedReason ?? null,
            dependsOn: [...item.dependsOn],
            openDeps: (0, lib_1.openDependencyIds)(item.dependsOn, byId),
            active: false,
        })));
        const activeId = activeBoardId(items, input);
        for (const item of items)
            item.active = item.id === activeId;
        let nextId = null;
        try {
            nextId = (0, lib_1.runNext)({ cwd }).suggestion?.item.id ?? null;
        }
        catch {
            nextId = null;
        }
        return {
            root,
            items,
            counts: countBoardStatuses(items),
            activeId,
            nextId,
            error: null,
        };
    }
    catch (error) {
        return emptyBoardSnapshot((0, lib_1.sanitizeHumanError)(`tracker unreadable: ${detail(error)}`));
    }
}
function countBoardStatuses(items) {
    return (0, lib_1.statusCounts)(items);
}
function boardTreeEntries(items) {
    return (0, lib_1.treeEntries)(items);
}
exports.BOARD_SELECTION_PAGE = 10;
function emptyBoardSelection() {
    return { index: -1, id: null };
}
function selectionAt(entries, index) {
    if (entries.length === 0)
        return emptyBoardSelection();
    const clamped = Math.min(Math.max(index, 0), entries.length - 1);
    return { index: clamped, id: entries[clamped].item.id };
}
function resolveBoardSelection(snapshot, previous) {
    const entries = boardTreeEntries(snapshot.items);
    if (entries.length === 0)
        return emptyBoardSelection();
    if (previous.id !== null) {
        const index = entries.findIndex((entry) => entry.item.id === previous.id);
        if (index >= 0)
            return { index, id: previous.id };
    }
    return selectionAt(entries, previous.index);
}
function moveBoardSelection(snapshot, selection, move) {
    const entries = boardTreeEntries(snapshot.items);
    if (entries.length === 0)
        return emptyBoardSelection();
    const current = selection.index < 0 ? -1 : Math.min(selection.index, entries.length - 1);
    switch (move) {
        case "first":
            return selectionAt(entries, 0);
        case "last":
            return selectionAt(entries, entries.length - 1);
        case "page-up":
            return selectionAt(entries, current - exports.BOARD_SELECTION_PAGE);
        case "page-down":
            return selectionAt(entries, current + exports.BOARD_SELECTION_PAGE);
        case "up":
            return selectionAt(entries, current - 1);
        case "down":
            return selectionAt(entries, current + 1);
    }
}
function selectBoardItem(snapshot, id) {
    const wanted = (id ?? "").trim();
    if (wanted === "")
        return null;
    const entries = boardTreeEntries(snapshot.items);
    const index = entries.findIndex((entry) => entry.item.id === wanted);
    return index < 0 ? null : { index, id: wanted };
}
function clipBoardLine(text, width) {
    if (width <= 0)
        return "";
    if (text.length <= width)
        return text;
    return text.slice(0, Math.max(width - 1, 0)) + "…";
}
function boardHeaderLine(snapshot) {
    if (snapshot.error !== null)
        return `arggon board · ${snapshot.error}`;
    const total = snapshot.items.length;
    const next = snapshot.nextId !== null ? ` · next: ${(0, lib_1.sanitizeHumanTextUncapped)(snapshot.nextId)}` : "";
    return `arggon board · ${total} item(s)${next}`;
}
function boardCountsLine(snapshot) {
    return exports.BOARD_STATUS_ORDER.map((status) => `${status} ${snapshot.counts[status]}`).join(" · ");
}
exports.BOARD_SELECTION_MARK = "❯";
function boardItemLine(entry, options = {}) {
    const { item, depth } = entry;
    const cursor = options.selected === true ? exports.BOARD_SELECTION_MARK : " ";
    const indent = "  ".repeat(Math.min(depth, 8));
    const active = item.active ? "▶" : " ";
    const mark = exports.BOARD_STATUS_MARKS[item.status];
    const badge = exports.BOARD_TYPE_BADGES[item.type];
    const blocked = item.openDeps.length > 0 ? ` ⌫${(0, lib_1.sanitizeHumanTextUncapped)(item.openDeps.join(","))}` : "";
    const assignee = item.assignee !== null ? ` @${(0, lib_1.sanitizeHumanTextUncapped)(item.assignee)}` : "";
    const reason = item.blockedReason !== null && item.blockedReason !== ""
        ? ` · blocked: ${(0, lib_1.sanitizeHumanTextUncapped)(item.blockedReason)}`
        : "";
    return (`${cursor}${indent}${active}${mark} ${badge} ${(0, lib_1.sanitizeHumanTextUncapped)(item.id)}${blocked}${assignee}` +
        ` — ${(0, lib_1.sanitizeHumanTextUncapped)(item.title)}${reason}`);
}
exports.BOARD_DETAIL_MAX_ROWS = 16;
exports.BOARD_DETAIL_MAX_LINE_CHARS = 200;
const BOARD_ACCEPTANCE_ROW = /^\s*[-*]\s+\[([ xX])\]\s?(.*)$/;
function splitBoardDetailRows(prose) {
    const acceptance = [];
    const body = [];
    for (const raw of prose.replace(/<!--[\s\S]*?-->/g, "").split(/\r?\n/)) {
        const row = raw.replace(/\t/g, "  ").trimEnd();
        const check = BOARD_ACCEPTANCE_ROW.exec(row);
        if (check) {
            const mark = (check[1] ?? " ").toLowerCase() === "x" ? "x" : " ";
            const text = (check[2] ?? "").trimEnd();
            acceptance.push(text === "" ? `[${mark}]` : `[${mark}] ${text}`);
            continue;
        }
        if (body.length === 0 && acceptance.length === 0 && /^#\s+/.test(row))
            continue;
        if (row.trim() === "") {
            if (body.length === 0 || body[body.length - 1] === "")
                continue;
            body.push("");
            continue;
        }
        body.push(row);
    }
    while (body.length > 0 && body[body.length - 1] === "")
        body.pop();
    return { acceptance, body };
}
function boardItemDetail(cwd, id, options = {}) {
    const requested = id.trim();
    const failed = (error) => ({
        id: requested,
        title: null,
        path: null,
        acceptance: [],
        body: [],
        acceptanceDone: 0,
        acceptanceTotal: 0,
        truncated: false,
        error: (0, lib_1.sanitizeHumanError)(error),
    });
    if (requested === "")
        return failed("detail unavailable: no selected item");
    try {
        const shown = (0, lib_1.runShow)({ cwd, id: requested });
        const { acceptance, body } = splitBoardDetailRows(shown.prose);
        const budget = Math.max(options.rows ?? exports.BOARD_DETAIL_MAX_ROWS, 0);
        const shownAcceptance = acceptance.slice(0, budget);
        const shownBody = body.slice(0, Math.max(budget - shownAcceptance.length, 0));
        const row = (value) => clipBoardLine((0, lib_1.sanitizeHumanTextUncapped)(value), exports.BOARD_DETAIL_MAX_LINE_CHARS);
        return {
            id: requested,
            title: (0, lib_1.sanitizeHumanTextUncapped)(shown.item.title ?? requested),
            path: (0, lib_1.sanitizeHumanTextUncapped)(shown.path),
            acceptance: shownAcceptance.map(row),
            body: shownBody.map(row),
            acceptanceDone: acceptance.filter((entry) => entry.startsWith("[x]")).length,
            acceptanceTotal: acceptance.length,
            truncated: acceptance.length + body.length > budget,
            error: null,
        };
    }
    catch (error) {
        return failed(`detail unavailable: ${detail(error)}`);
    }
}
function boardDetailLines(detail, options = {}) {
    const width = options.width ?? 0;
    const clip = (line) => (width > 0 ? clipBoardLine(line, width) : line);
    if (detail.error !== null) {
        return [clip(`  ┌ argon detail · ${detail.id}`), clip(`  └ ${detail.error}`)];
    }
    const lines = [clip(`  ┌ argon detail · ${detail.id} — ${detail.title ?? detail.id}`)];
    const row = (value) => (value === "" ? "  │" : `  │ ${value}`);
    for (const entry of detail.acceptance)
        lines.push(clip(row(entry)));
    for (const entry of detail.body)
        lines.push(clip(row(entry)));
    if (detail.truncated)
        lines.push(clip("  │ … more row(s) omitted"));
    const acceptance = detail.acceptanceTotal > 0
        ? `${detail.acceptanceDone}/${detail.acceptanceTotal} acceptance`
        : "no acceptance rows";
    const path = detail.path !== null ? ` · ${detail.path}` : "";
    lines.push(clip(`  └ ${acceptance}${path} · esc returns`));
    return lines;
}
function boardTreeLines(snapshot, options = {}) {
    const width = options.width ?? 0;
    const limit = options.limit ?? 200;
    const clip = (line) => (width > 0 ? clipBoardLine(line, width) : line);
    const lines = [clip(boardHeaderLine(snapshot))];
    if (snapshot.error !== null)
        return lines;
    lines.push(clip(boardCountsLine(snapshot)));
    const entries = boardTreeEntries(snapshot.items);
    const cap = Math.max(limit, 0);
    const selected = options.selection?.index ?? -1;
    const start = cap > 0 && selected >= cap
        ? Math.min(selected - cap + 1, Math.max(entries.length - cap, 0))
        : 0;
    if (start > 0)
        lines.push(clip(`… ${start} earlier item(s)`));
    const visible = entries.slice(start, start + cap);
    visible.forEach((entry, offset) => {
        const index = start + offset;
        lines.push(clip(boardItemLine(entry, { selected: index === selected })));
        if (options.detail != null && options.detail.id === entry.item.id) {
            for (const row of boardDetailLines(options.detail))
                lines.push(clip(row));
        }
    });
    const hidden = entries.length - start - visible.length;
    if (hidden > 0)
        lines.push(clip(`… ${hidden} more item(s)`));
    return lines;
}
function sidebarStatusLine(snapshot, width = 0) {
    const clip = (line) => (width > 0 ? clipBoardLine(line, width) : line);
    if (snapshot.error !== null)
        return clip("arggon · no tracker");
    const active = snapshot.items.find((item) => item.id === snapshot.activeId);
    if (active !== undefined) {
        return clip(`arggon ▶ ${(0, lib_1.sanitizeHumanTextUncapped)(active.id)} ${active.status}`);
    }
    const ready = (0, lib_1.readyTodoCount)(snapshot.items);
    const next = snapshot.nextId !== null ? ` · next ${(0, lib_1.sanitizeHumanTextUncapped)(snapshot.nextId)}` : "";
    return clip(`arggon · ${ready} ready${next}`);
}
})

__arggonModules.set("opencode/plugins/arggon/index.ts", (exports, require, module) => {
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sidebarStatusLine = exports.selectBoardItem = exports.resolveBoardSelection = exports.moveBoardSelection = exports.emptyBoardSnapshot = exports.emptyBoardSelection = exports.countBoardStatuses = exports.clipBoardLine = exports.boardTreeLines = exports.boardTreeEntries = exports.boardSnapshot = exports.boardRoot = exports.boardItemLine = exports.boardItemDetail = exports.boardHeaderLine = exports.boardDetailLines = exports.boardCountsLine = exports.activeBoardId = exports.BOARD_TYPE_BADGES = exports.BOARD_STATUS_ORDER = exports.BOARD_STATUS_MARKS = exports.BOARD_SELECTION_PAGE = exports.BOARD_SELECTION_MARK = exports.BOARD_DETAIL_MAX_ROWS = exports.BOARD_DETAIL_MAX_LINE_CHARS = exports.ARGON_BOARD_PANEL = exports.SESSION_ROOT_UNRESOLVED = exports.ArgonToolError = exports.PINNED_TOOL_NAMES = exports.ARGON_TOOL_NAMESPACE_DESCRIPTION = exports.ARGON_TOOL_NAMESPACE = exports.MAX_SUBSTITUTION_DEPTH = exports.BRANCH_PREFIXES = exports.CACHE_MAX_ENTRIES = exports.CACHE_TTL_MS = exports.ITEM_BLOCK_MAX_BYTES = exports.ITEM_ENV = void 0;
exports.isArggonItemId = isArggonItemId;
exports.parseArggonItemFromCommand = parseArggonItemFromCommand;
exports.parseArggonItemFromCode = parseArggonItemFromCode;
exports.parseArggonItemFromTool = parseArggonItemFromTool;
exports.itemIdFromBranch = itemIdFromBranch;
exports.looksLikeCommitCommand = looksLikeCommitCommand;
exports.buildItemBlock = buildItemBlock;
exports.boundText = boundText;
exports.parseValidateFailure = parseValidateFailure;
exports.sessionDirectoryResolver = sessionDirectoryResolver;
exports.itemCacheKey = itemCacheKey;
exports.setBounded = setBounded;
exports.onToolAfter = onToolAfter;
exports.csvList = csvList;
exports.sessionToken = sessionToken;
exports.resolveToolCwd = resolveToolCwd;
exports.worktreeOptions = worktreeOptions;
exports.nativeToolSchemas = nativeToolSchemas;
exports.nativeToolsCatalogBytes = nativeToolsCatalogBytes;
exports.argonToolDefinitions = argonToolDefinitions;
exports.pluginTemplatesDir = pluginTemplatesDir;
exports.loadArgonKernel = loadArgonKernel;
exports.registerArgonTools = registerArgonTools;
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_url_1 = require("node:url");
const ARGGON_SERVER = "arggon";
exports.ITEM_ENV = "ARGON_ITEM";
exports.ITEM_BLOCK_MAX_BYTES = 1024;
exports.CACHE_TTL_MS = 5_000;
exports.CACHE_MAX_ENTRIES = 256;
exports.BRANCH_PREFIXES = ["feat/", "fix/"];
const ITEM_MARKER = "<arggon-item>";
const STORAGE_PREFIX = "arggon/session/";
const MAX_CLI_OUTPUT = 256 * 1024;
const MAX_VALUE_CHARS = 200;
const MAX_NATIVE_PREPARATION_NAMES = 32;
const MAX_NATIVE_PREPARATION_VALUE_CHARS = 200;
const MAX_NATIVE_DETAIL_CHARS = 500;
const MAX_NATIVE_ERROR_CHARS = 2048;
function asString(value) {
    return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}
function clip(value, max) {
    return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
function boundedNativeText(value, max) {
    const text = typeof value === "string" ? value : String(value);
    return clip(text.replace(/[\u0000-\u001f\u007f]/g, " "), max);
}
function byteLength(text) {
    return new TextEncoder().encode(text).length;
}
function isArggonItemId(value) {
    return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value);
}
const ARGON_ITEM_SUBCOMMANDS = new Set(["update", "show", "comment", "handoff", "branch", "start"]);
const COMMAND_RUNNERS = new Set(["npm", "pnpm", "yarn", "bun"]);
const RUNNER_LAUNCHERS = new Set(["run", "exec", "dlx"]);
const WRAPPERS = new Set(["npx", "bunx", "sudo", "env", "command", "time"]);
const WRAPPER_VALUE_OPTIONS = {
    sudo: new Set([
        "-u", "--user", "-g", "--group", "-h", "--host", "-p", "--prompt", "-C", "--close-from",
        "-T", "--command-timeout", "-R", "--chroot", "-D", "--chdir", "-r", "--role", "-t", "--type",
    ]),
    env: new Set(["-u", "--unset", "-C", "--chdir", "-S", "--split-string"]),
    npx: new Set(["-p", "--package", "--cache", "--userconfig", "--node-options", "--prefix"]),
    bunx: new Set(["-p", "--package"]),
    time: new Set(["-o", "--output", "-f", "--format"]),
    command: new Set(),
};
const ENV_ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;
const SHELL_OPENERS = new Set(["(", "$("]);
function splitSegments(command) {
    const segments = [];
    let current = "";
    let quote = null;
    let escaped = false;
    let wordStart = true;
    let comment = false;
    for (let i = 0; i < command.length; i += 1) {
        const ch = command[i];
        if (comment) {
            if (ch === "\n") {
                comment = false;
                segments.push(current);
                current = "";
                wordStart = true;
            }
            continue;
        }
        if (quote === "'") {
            current += ch;
            if (ch === "'") {
                quote = null;
                wordStart = false;
            }
            continue;
        }
        if (escaped) {
            current += ch;
            escaped = false;
            wordStart = false;
            continue;
        }
        if (ch === "\\") {
            current += ch;
            escaped = true;
            continue;
        }
        if (ch === '"' || ch === "'") {
            current += ch;
            if (quote === ch) {
                quote = null;
                wordStart = false;
            }
            else if (quote === null) {
                quote = ch;
            }
            continue;
        }
        if (quote === null && ch === "#" && wordStart) {
            comment = true;
            continue;
        }
        if (quote === null && (ch === ";" || ch === "&" || ch === "|" || ch === "\n" || ch === "\r")) {
            segments.push(current);
            current = "";
            wordStart = true;
            continue;
        }
        current += ch;
        wordStart =
            ch === " " || ch === "\t" || ch === "(" || ch === ")" || ch === "{" || ch === "}";
    }
    segments.push(current);
    return segments;
}
function splitTokens(segment) {
    const tokens = [];
    let current = "";
    let quote = null;
    let escaped = false;
    let escapedAtStart = false;
    let started = false;
    let word = false;
    const push = () => {
        tokens.push({ text: current, word });
        current = "";
        started = false;
        word = false;
    };
    for (let i = 0; i < segment.length; i += 1) {
        const ch = segment[i];
        if (quote === "'") {
            if (ch === "'")
                quote = null;
            else
                current += ch;
            continue;
        }
        if (escaped) {
            escaped = false;
            if (ch === "$" && segment[i + 1] === "(") {
                current += "$(";
                i += 1;
                word = true;
            }
            else if (ch === "(" && escapedAtStart) {
                current += "(";
                word = true;
            }
            else if (ch === "\\" && (escapedAtStart || segment[i + 1] === "(")) {
                current += ch;
                word = true;
            }
            else {
                current += ch;
            }
            started = true;
            continue;
        }
        if (ch === "\\") {
            escaped = true;
            escapedAtStart = !started;
            started = true;
            continue;
        }
        if (ch === '"') {
            if (quote === '"')
                quote = null;
            else if (quote === null) {
                quote = '"';
                if (!started)
                    word = true;
            }
            started = true;
            continue;
        }
        if (ch === "'") {
            if (quote === null) {
                quote = "'";
                if (!started)
                    word = true;
            }
            else {
                current += ch;
            }
            started = true;
            continue;
        }
        if (quote === null && /\s/.test(ch)) {
            if (started)
                push();
            continue;
        }
        current += ch;
        started = true;
    }
    if (started)
        push();
    return tokens;
}
function isEnvAssignment(token) {
    return ENV_ASSIGNMENT.test(token) && !token.includes("$(");
}
function isPathLike(text) {
    return (text.startsWith("/") ||
        text.startsWith("./") ||
        text.startsWith("../") ||
        text.startsWith("~"));
}
const SHELL_SYNTAX_IN_PATH = /[\s\\"'`$(){}<>;|&]/;
function isPlainPath(text) {
    return text.split("/").every((part) => !SHELL_SYNTAX_IN_PATH.test(part));
}
function commandName(text) {
    if (!isPathLike(text) && !isPlainPath(text))
        return text;
    return text.split("/").pop() ?? "";
}
function commandHead(token) {
    if (token.word)
        return commandName(token.text);
    return commandName(token.text
        .replace(/^["'\\]+/, "")
        .replace(/^[A-Za-z_][A-Za-z0-9_]*=/, "")
        .replace(/^\$?\(+/, "")
        .replace(/^\{+/, "")
        .replace(/[)}]+$/, ""));
}
function skipWrapperOptions(tokens, index, wrapper) {
    const valueOptions = WRAPPER_VALUE_OPTIONS[wrapper];
    let at = index;
    while (at < tokens.length && tokens[at].text.startsWith("-")) {
        const option = tokens[at].text;
        at += 1;
        if (valueOptions !== undefined && valueOptions.has(option))
            at += 1;
    }
    return at;
}
function commandQueriesName(tokens, index) {
    let at = index;
    while (at < tokens.length && tokens[at].text.startsWith("-")) {
        const option = tokens[at].text;
        if (option === "--")
            break;
        if (!option.startsWith("--") && /[vV]/.test(option.slice(1)))
            return true;
        at += 1;
    }
    return false;
}
function argCommandIndex(tokens) {
    let index = 0;
    while (index < tokens.length) {
        const token = tokens[index];
        if (!token.word && SHELL_OPENERS.has(token.text)) {
            index += 1;
            continue;
        }
        if (!token.word && isEnvAssignment(token.text)) {
            index += 1;
            continue;
        }
        const head = commandHead(token);
        if (head === "arggon")
            return index;
        if (COMMAND_RUNNERS.has(head)) {
            return tokens[index + 1] !== undefined &&
                RUNNER_LAUNCHERS.has(tokens[index + 1].text) &&
                tokens[index + 2]?.text === "arggon"
                ? index + 2
                : -1;
        }
        if (WRAPPERS.has(head)) {
            if (head === "command" && commandQueriesName(tokens, index + 1))
                return -1;
            index = skipWrapperOptions(tokens, index + 1, head);
            continue;
        }
        return -1;
    }
    return -1;
}
function itemFromTokens(tokens, at) {
    let j = at + 1;
    while (j < tokens.length && (tokens[j].text === "--" || tokens[j].text.startsWith("-")))
        j += 1;
    const subcommand = tokens[j]?.text;
    if (subcommand === undefined || !ARGON_ITEM_SUBCOMMANDS.has(subcommand))
        return undefined;
    const candidate = tokens[j + 1]?.text.replace(/[)}]+$/, "");
    if (candidate !== undefined && !candidate.startsWith("-") && isArggonItemId(candidate)) {
        return candidate;
    }
    return undefined;
}
function findCommandGroups(text) {
    const groups = [];
    let quote = null;
    let escaped = false;
    let escapedDollar = false;
    let escapedBackslash = false;
    let depth = 0;
    let start = -1;
    for (let i = 0; i < text.length; i += 1) {
        const ch = text[i];
        if (quote === "'") {
            if (ch === "'")
                quote = null;
            continue;
        }
        if (escaped) {
            escaped = false;
            escapedDollar = ch === "$";
            escapedBackslash = ch === "\\";
            continue;
        }
        if (escapedDollar) {
            escapedDollar = false;
            if (ch === "(")
                continue;
        }
        if (escapedBackslash) {
            escapedBackslash = false;
            if (ch === "(")
                continue;
        }
        if (ch === "\\") {
            escaped = true;
            continue;
        }
        if (ch === '"') {
            if (quote === '"')
                quote = null;
            else if (quote === null)
                quote = '"';
            continue;
        }
        if (ch === "'" && quote === null) {
            quote = "'";
            continue;
        }
        const dollarParen = ch === "$" && text[i + 1] === "(";
        if (dollarParen || (ch === "(" && quote === null)) {
            if (depth === 0)
                start = i + (dollarParen ? 2 : 1);
            depth += 1;
            if (dollarParen)
                i += 1;
            continue;
        }
        if (ch === ")" && depth > 0) {
            depth -= 1;
            if (depth === 0 && start >= 0) {
                groups.push(text.slice(start, i));
                start = -1;
            }
        }
    }
    return groups;
}
exports.MAX_SUBSTITUTION_DEPTH = 3;
function parseCommandText(command, depth) {
    for (const segment of splitSegments(command)) {
        const tokens = splitTokens(segment);
        const at = argCommandIndex(tokens);
        if (at !== -1) {
            const id = itemFromTokens(tokens, at);
            if (id !== undefined)
                return id;
        }
        if (depth < exports.MAX_SUBSTITUTION_DEPTH) {
            for (const group of findCommandGroups(segment)) {
                const id = parseCommandText(group, depth + 1);
                if (id !== undefined)
                    return id;
            }
        }
    }
    return undefined;
}
function parseArggonItemFromCommand(command) {
    if (typeof command !== "string" || command === "")
        return undefined;
    return parseCommandText(command, 0);
}
const COMMAND_ARG_PATTERN = /\bcommand\s*:\s*(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/;
const CORRELATION_CALL_PATTERNS = [
    /arggon_(update|show|comment|handoff|start)\s*\(([\s\S]*?)\)/g,
    /tools\.arggon\.(update|show|comment|handoff|start)\s*\(([\s\S]*?)\)/g,
];
function itemIdFromCallArgs(args) {
    const named = /\bid\s*:\s*["'`]([^"'`]+)["'`]/.exec(args);
    if (named !== null && isArggonItemId(named[1]))
        return named[1];
    if (!/[:=]/.test(args)) {
        const positional = /["'`]([^"'`]+)["'`]/.exec(args);
        if (positional !== null && isArggonItemId(positional[1]))
            return positional[1];
    }
    return undefined;
}
function parseArggonItemFromCode(code) {
    if (typeof code !== "string" || code === "")
        return undefined;
    for (const callPattern of CORRELATION_CALL_PATTERNS) {
        callPattern.lastIndex = 0;
        let match;
        while ((match = callPattern.exec(code)) !== null) {
            const id = itemIdFromCallArgs(match[2] ?? "");
            if (id !== undefined)
                return id;
        }
    }
    const shellCommand = COMMAND_ARG_PATTERN.exec(code);
    if (shellCommand !== null) {
        const command = (shellCommand[2] ?? "").replace(/\\(["'`\\])/g, "$1");
        const id = parseArggonItemFromCommand(command);
        if (id !== undefined)
            return id;
    }
    return parseArggonItemFromCommand(code);
}
function parseArggonItemFromTool(tool, input) {
    if (typeof tool !== "string")
        return undefined;
    const record = input !== null && typeof input === "object" ? input : undefined;
    if (/arggon_(update|show|comment|handoff|start)$/.test(tool) ||
        /^(?:tools\.)?arggon[._](update|show|comment|handoff|start)$/.test(tool)) {
        return isArggonItemId(record?.id) ? record?.id : undefined;
    }
    if (tool === "shell" || tool.endsWith(".shell") || tool.endsWith("_shell")) {
        return parseArggonItemFromCommand(record?.command);
    }
    if (tool === "execute" || tool.endsWith(".execute") || tool.endsWith("_execute")) {
        return parseArggonItemFromCode(record?.code);
    }
    return undefined;
}
function itemIdFromBranch(branch) {
    if (typeof branch !== "string")
        return undefined;
    for (const prefix of exports.BRANCH_PREFIXES) {
        if (branch.startsWith(prefix)) {
            const rest = branch.slice(prefix.length);
            return isArggonItemId(rest) ? rest : undefined;
        }
    }
    return undefined;
}
function looksLikeCommitCommand(command) {
    if (typeof command !== "string" || command === "")
        return false;
    for (const segment of splitSegments(command)) {
        const tokens = splitTokens(segment);
        const gitAt = tokens.findIndex((token) => token.text.split("/").pop() === "git");
        if (gitAt === -1)
            continue;
        if (tokens.slice(gitAt + 1).some((token) => token.text === "commit" || token.text.startsWith("commit-"))) {
            return true;
        }
    }
    return false;
}
function buildItemBlock(item, options = {}) {
    const lines = [
        ITEM_MARKER,
        "arggon: tracked work item (advisory; pre-commit/CI stay authoritative)",
    ];
    const fields = [
        ["id", item.id],
        ["type", item.type],
        ["status", item.status],
        ["title", item.title],
        ["parent", item.parent],
        ["branch", item.branch],
        ["assignee", item.assignee],
        ["priority", item.priority],
    ];
    for (const [label, value] of fields) {
        const text = asString(value);
        if (text !== undefined)
            lines.push(`${label}: ${clip(text, MAX_VALUE_CHARS)}`);
    }
    const labels = Array.isArray(item.labels)
        ? item.labels.filter((label) => typeof label === "string" && label !== "").join(", ")
        : "";
    if (labels !== "")
        lines.push(`labels: ${clip(labels, 120)}`);
    const worktree = asString(item.worktree_path);
    if (worktree !== undefined && worktree !== asString(options.currentDirectory)) {
        lines.push(`worktree: ${clip(worktree, MAX_VALUE_CHARS)} (session_move available)`);
    }
    lines.push("</arggon-item>");
    return boundText(lines.join("\n"));
}
function boundText(text, max = exports.ITEM_BLOCK_MAX_BYTES) {
    const bytes = byteLength(text);
    if (bytes <= max)
        return { text, bytes, truncated: false };
    const marker = "\n… (truncated)";
    const markerBytes = byteLength(marker);
    if (max < markerBytes)
        return { text: "", bytes: 0, truncated: true };
    const budget = max - markerBytes;
    const encoded = new TextEncoder().encode(text);
    let cut = "";
    for (let keep = budget; keep > 0; keep -= 1) {
        try {
            cut = new TextDecoder("utf-8", { fatal: true }).decode(encoded.subarray(0, keep));
            break;
        }
        catch {
        }
    }
    const lastLine = cut.lastIndexOf("\n");
    if (lastLine > 0)
        cut = cut.slice(0, lastLine);
    const bounded = `${cut}${marker}`;
    return { text: bounded, bytes: byteLength(bounded), truncated: true };
}
function parseValidateFailure(stdout) {
    if (typeof stdout !== "string" || stdout.trim() === "")
        return undefined;
    try {
        const payload = JSON.parse(stdout);
        if (payload.ok !== false)
            return undefined;
        const errors = Array.isArray(payload.errors) ? payload.errors : [];
        const first = errors.find((entry) => entry !== null && typeof entry === "object");
        const message = first !== undefined ? asString(first.message) : undefined;
        return `${errors.length} error(s)${message !== undefined ? `; first: ${clip(message, 160)}` : ""}`;
    }
    catch {
        return undefined;
    }
}
const loggedErrors = new Set();
function detail(error) {
    return error instanceof Error ? error.message : String(error);
}
function logOnce(key, message, error) {
    if (loggedErrors.has(key))
        return;
    loggedErrors.add(key);
    console.error(`[arggon] ${message}: ${detail(error)}`);
}
function run(bin, args, cwd, timeout) {
    return new Promise((resolve) => {
        try {
            (0, node_child_process_1.execFile)(bin, args, { cwd, timeout, maxBuffer: MAX_CLI_OUTPUT, windowsHide: true }, (error, stdout, stderr) => {
                const code = error !== null && typeof error.code === "number"
                    ? error.code
                    : error !== null
                        ? null
                        : 0;
                resolve({ code, stdout: String(stdout ?? ""), stderr: String(stderr ?? "") });
            });
        }
        catch (error) {
            logOnce("cli-spawn", "CLI invocation failed", error);
            resolve({ code: null, stdout: "", stderr: "" });
        }
    });
}
function locationDirectory(ctx) {
    return asString(ctx.location?.directory);
}
function sessionDirectoryResolver(ctx) {
    const get = ctx?.session?.get;
    if (typeof get !== "function")
        return undefined;
    return async (sessionID) => {
        const session = (await get({ sessionID }));
        return asString(session?.location?.directory) ?? asString(session?.directory);
    };
}
function hasTasksTree(directory) {
    try {
        return (0, node_fs_1.existsSync)((0, node_path_1.join)(directory, "ArggonManager")) || (0, node_fs_1.existsSync)((0, node_path_1.join)(directory, "tasks"));
    }
    catch {
        return false;
    }
}
function sessionKey(sessionID) {
    return `${STORAGE_PREFIX}${sessionID}`;
}
function renamedKey(sessionID) {
    return `${STORAGE_PREFIX}${sessionID}/renamed`;
}
async function storageGet(ctx, key) {
    try {
        return typeof ctx.storage?.get === "function" ? await ctx.storage.get(key) : undefined;
    }
    catch (error) {
        logOnce("storage-get", "storage read failed", error);
        return undefined;
    }
}
async function storageSet(ctx, key, value) {
    try {
        if (typeof ctx.storage?.set === "function")
            await ctx.storage.set(key, value);
    }
    catch (error) {
        logOnce("storage-set", "storage write failed", error);
    }
}
async function storageRemove(ctx, key) {
    try {
        if (typeof ctx.storage?.remove === "function")
            await ctx.storage.remove(key);
    }
    catch (error) {
        logOnce("storage-remove", "storage removal failed", error);
    }
}
const itemCache = new Map();
const branchCache = new Map();
const renamedSessions = new Map();
function itemCacheKey(directory, id) {
    return `${directory}\u0000${id}`;
}
function setBounded(map, key, value, max = exports.CACHE_MAX_ENTRIES) {
    map.delete(key);
    map.set(key, value);
    while (map.size > max) {
        const oldest = map.keys().next();
        if (oldest.done === true)
            break;
        map.delete(oldest.value);
    }
}
async function readBranch(ctx, directory) {
    const cached = branchCache.get(directory);
    const now = Date.now();
    if (cached !== undefined && now - cached.at < exports.CACHE_TTL_MS)
        return cached.branch;
    let branch;
    try {
        if (typeof ctx.vcs?.get === "function") {
            const info = (await ctx.vcs.get());
            const data = (info?.data ?? info);
            const value = data?.branch;
            branch =
                asString(value) ??
                    (value !== null && typeof value === "object"
                        ? asString(value.current)
                        : undefined);
        }
    }
    catch {
    }
    if (branch === undefined) {
        const result = await run("git", ["rev-parse", "--abbrev-ref", "HEAD"], directory, 2_000);
        const value = result.stdout.trim();
        if (result.code === 0 && value !== "" && value !== "HEAD")
            branch = value;
    }
    setBounded(branchCache, directory, { at: now, branch });
    return branch;
}
async function resolveItemId(ctx, sessionID, directory) {
    const env = asString(process.env[exports.ITEM_ENV]);
    if (env !== undefined && isArggonItemId(env))
        return { id: env, source: "env" };
    const stored = await storageGet(ctx, sessionKey(sessionID));
    if (isArggonItemId(stored))
        return { id: stored, source: "storage" };
    const branch = itemIdFromBranch(await readBranch(ctx, directory));
    if (branch !== undefined)
        return { id: branch, source: "branch" };
    return undefined;
}
async function loadItem(ctx, directory, id) {
    const key = itemCacheKey(directory, id);
    const cached = itemCache.get(key);
    const now = Date.now();
    if (cached !== undefined && now - cached.at < exports.CACHE_TTL_MS)
        return cached.item;
    const result = await run(ARGGON_SERVER, ["show", id, "--meta", "--json"], directory, 5_000);
    let item;
    try {
        const payload = JSON.parse(result.stdout);
        if (payload.ok === true && payload.item !== null && typeof payload.item === "object") {
            item = payload.item;
        }
    }
    catch {
    }
    setBounded(itemCache, key, { at: now, item });
    return item;
}
async function renameSession(ctx, sessionID, title) {
    try {
        if (typeof ctx.session?.rename === "function") {
            await ctx.session.rename({ sessionID, title });
            return true;
        }
        if (typeof ctx.session?.update === "function") {
            await ctx.session.update({ sessionID, title });
            return true;
        }
    }
    catch (error) {
        logOnce("rename", "session rename failed", error);
    }
    return false;
}
async function maybeRename(ctx, sessionID, item) {
    const id = asString(item.id);
    const status = asString(item.status);
    const assignee = asString(item.assignee);
    if (id === undefined || status !== "in_progress" || assignee === undefined)
        return;
    if (renamedSessions.get(sessionID) === id)
        return;
    if ((await storageGet(ctx, renamedKey(sessionID))) === id) {
        setBounded(renamedSessions, sessionID, id);
        return;
    }
    if (typeof ctx.session?.get === "function") {
        try {
            const current = (await ctx.session.get({ sessionID }));
            if (asString(current?.title) === id) {
                setBounded(renamedSessions, sessionID, id);
                await storageSet(ctx, renamedKey(sessionID), id);
                return;
            }
        }
        catch {
        }
    }
    if (await renameSession(ctx, sessionID, id)) {
        setBounded(renamedSessions, sessionID, id);
        await storageSet(ctx, renamedKey(sessionID), id);
        console.error(`[arggon] session renamed to ${id}`);
    }
}
async function checkTrackerHygiene(directory) {
    const result = await run(ARGGON_SERVER, ["validate", "--json"], directory, 10_000);
    const failure = parseValidateFailure(result.stdout);
    if (failure !== undefined) {
        console.error(`[arggon] validate failed after git commit: ${failure}`);
    }
}
function isShellTool(tool) {
    return tool === "shell" || (typeof tool === "string" && (tool.endsWith(".shell") || tool.endsWith("_shell")));
}
async function onToolAfter(ctx, event) {
    try {
        if (event.status !== undefined && event.status !== "completed")
            return;
        const directory = locationDirectory(ctx);
        if (directory === undefined || !hasTasksTree(directory))
            return;
        const sessionID = asString(event.sessionID);
        if (sessionID !== undefined) {
            const id = parseArggonItemFromTool(event.tool, event.input);
            if (id !== undefined)
                await storageSet(ctx, sessionKey(sessionID), id);
        }
        if (isShellTool(event.tool)) {
            const input = event.input !== null && typeof event.input === "object"
                ? event.input
                : undefined;
            if (looksLikeCommitCommand(input?.command)) {
                await checkTrackerHygiene(directory);
            }
        }
    }
    catch (error) {
        logOnce("tool-observe", "tool observation failed", error);
    }
}
async function onContext(ctx, event) {
    try {
        const sessionID = asString(event.sessionID);
        const directory = locationDirectory(ctx);
        if (sessionID === undefined || directory === undefined || !hasTasksTree(directory))
            return;
        const resolved = await resolveItemId(ctx, sessionID, directory);
        if (resolved === undefined)
            return;
        const item = await loadItem(ctx, directory, resolved.id);
        if (item === undefined) {
            if (resolved.source === "storage")
                await storageRemove(ctx, sessionKey(sessionID));
            return;
        }
        await maybeRename(ctx, sessionID, item);
        const system = event.system;
        if (!Array.isArray(system))
            return;
        const marker = system.some((part) => part !== null &&
            typeof part === "object" &&
            typeof part.text === "string" &&
            part.text.includes(ITEM_MARKER));
        if (marker)
            return;
        const block = buildItemBlock(item, { currentDirectory: directory });
        system.push({ type: "text", text: block.text });
        console.error(`[arggon] context: injected item ${asString(item.id) ?? resolved.id} (${block.bytes} bytes) block=${JSON.stringify(block.text)}`);
    }
    catch (error) {
        logOnce("context", "context injection failed", error);
    }
}
exports.ARGON_TOOL_NAMESPACE = "arggon";
exports.ARGON_TOOL_NAMESPACE_DESCRIPTION = "ArggonManager tracker tools (in-process): documented `--json` envelopes; failures are typed tool errors.";
exports.PINNED_TOOL_NAMES = [
    "list",
    "create",
    "update",
    "show",
    "next",
    "validate",
    "comment",
    "handoff",
    "start",
];
const TOOL_ERROR_DETAIL_MAX_BYTES = 8192;
const SESSION_TOKEN_MAX_CHARS = 64;
class ArgonToolError extends Error {
    code;
    command;
    envelope;
    constructor(envelope) {
        const error = envelope.error !== null && typeof envelope.error === "object"
            ? envelope.error
            : undefined;
        const code = typeof error?.code === "string" && error.code !== "" ? error.code : "ARGON_TOOL_FAILED";
        const message = typeof error?.message === "string" && error.message !== ""
            ? error.message
            : "unknown kernel failure";
        super(`${code}: ${message}\n${boundedEnvelopeJson(envelope)}`);
        this.name = "ArgonToolError";
        this.code = code;
        this.command = asString(envelope.command) ?? "";
        this.envelope = envelope;
    }
}
exports.ArgonToolError = ArgonToolError;
function boundedEnvelopeJson(envelope) {
    let json;
    try {
        json = JSON.stringify(envelope) ?? "";
    }
    catch {
        return "<unserializable envelope>";
    }
    return json.length <= TOOL_ERROR_DETAIL_MAX_BYTES
        ? json
        : `${json.slice(0, TOOL_ERROR_DETAIL_MAX_BYTES)}… (envelope truncated)`;
}
const ENVELOPE_SCHEMA_PROPERTIES = {
    ok: { type: "boolean" },
    schemaVersion: { type: "number" },
    conventionVersion: { type: "number" },
    command: { type: "string" },
};
function envelopeSchema(extra = {}) {
    return {
        type: "object",
        properties: { ...ENVELOPE_SCHEMA_PROPERTIES, ...extra },
        required: ["ok", "schemaVersion", "conventionVersion", "command"],
    };
}
function csvList(value) {
    if (!Array.isArray(value))
        return undefined;
    const parts = value.filter((entry) => typeof entry === "string");
    return parts.join(",");
}
function arrayOfStrings(value) {
    if (!Array.isArray(value))
        return undefined;
    return value.filter((entry) => typeof entry === "string");
}
function sessionToken(value) {
    if (typeof value !== "string")
        return undefined;
    const token = value.trim();
    if (token === "" || token.length > SESSION_TOKEN_MAX_CHARS)
        return undefined;
    return /^[A-Za-z0-9._:-]+$/.test(token) ? token : undefined;
}
exports.SESSION_ROOT_UNRESOLVED = "SESSION_ROOT_UNRESOLVED";
async function resolveToolCwd(kernel, command, options, tool) {
    const sessionID = sessionToken(tool?.sessionID);
    if (sessionID === undefined || options.sessionDirectory === undefined) {
        return { cwd: options.cwd };
    }
    let directory;
    let failure;
    try {
        directory = asString(await options.sessionDirectory(sessionID));
    }
    catch (error) {
        failure = detail(error);
    }
    if (directory === undefined) {
        const cause = failure === undefined ? "" : ` (${boundedNativeText(failure, MAX_NATIVE_DETAIL_CHARS)})`;
        return {
            error: new ArgonToolError(kernel.failEnvelope({
                command,
                code: exports.SESSION_ROOT_UNRESOLVED,
                message: `could not resolve the working directory of session ${sessionID}${cause}; refusing ` +
                    `to fall back to the plugin location ${options.cwd}, which would commit to the ` +
                    "checkout this plugin was loaded from instead of the session's own",
            })),
        };
    }
    return { cwd: directory };
}
const ID = { type: "string" };
const STRINGS = { type: "array", items: { type: "string" } };
const OBJECT = { type: "object" };
const BOOLEAN = { type: "boolean" };
const NUMBER = { type: "number" };
const TOOL_SPECS = [
    {
        name: "list",
        description: "List tracker work items (filters compose with AND). Returns the `list --json` envelope (compact WorkItems, ADR 0006).",
        input: {
            type: "object",
            properties: {
                status: { type: "string" },
                type: { type: "string" },
                assignee: {
                    type: "string",
                    description: "Login; @me resolves via env/gh.",
                },
                parent: { type: "string" },
                filter: {
                    type: "string",
                    description: 'e.g. "status:todo !label:security".',
                },
                view: {
                    type: "string",
                    description: "Saved view name (x-views in the tracker config).",
                },
                stale: { type: "boolean" },
                older_than: {
                    type: "string",
                    description: "Stale threshold <number><d|h|m>, e.g. 7d.",
                },
                full: BOOLEAN,
            },
            additionalProperties: false,
        },
        output: envelopeSchema({ items: { type: "array" } }),
        run: (kernel, input, options) => kernel.listOperation({
            cwd: options.cwd,
            status: asString(input.status),
            type: asString(input.type),
            assignee: asString(input.assignee),
            parent: asString(input.parent),
            filter: asString(input.filter),
            view: asString(input.view),
            stale: input.stale === true,
            olderThan: asString(input.older_than),
            full: input.full === true,
        }),
    },
    {
        name: "create",
        description: "Create a work item under a parent container. Returns the `create --json` envelope (path, item).",
        input: {
            type: "object",
            properties: {
                type: {
                    type: "string",
                    description: "initiative|epic|story|task|bug.",
                },
                title: { type: "string" },
                parent: {
                    type: "string",
                    description: "Required except for initiatives.",
                },
                id: { type: "string", description: "Optional explicit id stem." },
                assignee: { type: "string" },
                labels: STRINGS,
                status: {
                    type: "string",
                    description: "todo|in_progress|blocked|cancelled.",
                },
                blocked_reason: {
                    type: "string",
                    description: "Required with status blocked.",
                },
                priority: { type: "string", description: "p0|p1|p2|p3." },
                issue: { type: "number", description: "Linked GitHub issue number." },
                full: BOOLEAN,
            },
            required: ["type", "title"],
            additionalProperties: false,
        },
        output: envelopeSchema({
            path: { type: "string" },
            item: OBJECT,
            commit: OBJECT,
        }),
        run: (kernel, input, options) => kernel.createOperation({
            cwd: options.cwd,
            type: asString(input.type) ?? "",
            title: asString(input.title) ?? "",
            parent: asString(input.parent),
            id: asString(input.id),
            assignee: asString(input.assignee),
            labels: arrayOfStrings(input.labels),
            status: asString(input.status),
            blockedReason: asString(input.blocked_reason),
            priority: asString(input.priority),
            issue: typeof input.issue === "number" ? input.issue : undefined,
            templatesDir: options.templatesDir,
            full: input.full === true,
        }),
    },
    {
        name: "update",
        description: "Update one item's frontmatter (status, claim, parent, labels, priority, depends_on); agents never reopen or steal.",
        input: {
            type: "object",
            properties: {
                id: ID,
                title: { type: "string" },
                status: { type: "string" },
                assignee: {
                    type: "string",
                    description: "Required when the new status is in_progress.",
                },
                unassign: { type: "boolean" },
                branch: { type: "string", description: "Empty string clears." },
                parent: {
                    type: "string",
                    description: "Reparent (same edge validation as the CLI).",
                },
                type: {
                    type: "string",
                    description: "Only 'story': promote a task to a story.",
                },
                labels: STRINGS,
                priority: {
                    type: "string",
                    description: "p0|p1|p2|p3; empty string clears.",
                },
                depends_on: STRINGS,
                add_depends_on: { type: "string" },
                issue: { type: "number", description: "0 clears." },
                blocked_reason: {
                    type: "string",
                    description: "Required with, and only with, status blocked.",
                },
                no_cascade: {
                    type: "boolean",
                    description: "Skip automatic container completion.",
                },
                full: BOOLEAN,
            },
            required: ["id"],
            additionalProperties: false,
        },
        output: envelopeSchema({
            item: OBJECT,
            autoCompleted: { type: "array" },
            cascadeLevels: { type: "array" },
            cascadeSkipped: { type: "array" },
        }),
        run: (kernel, input, options) => kernel.updateOperation({
            cwd: options.cwd,
            id: asString(input.id) ?? "",
            title: asString(input.title),
            status: asString(input.status),
            assignee: asString(input.assignee),
            branch: asString(input.branch),
            parent: asString(input.parent),
            type: asString(input.type),
            unassign: input.unassign === true,
            labels: csvList(input.labels),
            priority: asString(input.priority),
            dependsOn: csvList(input.depends_on),
            addDependsOn: asString(input.add_depends_on),
            issue: typeof input.issue === "number" ? input.issue : undefined,
            blockedReason: asString(input.blocked_reason),
            cascade: input.no_cascade !== true,
            full: input.full === true,
            agent: true,
        }),
    },
    {
        name: "show",
        description: "Read one work item bounded (ADR 0006): frontmatter plus the last comments; `body: true` is the opt-in. Pure read.",
        input: {
            type: "object",
            properties: {
                id: ID,
                meta: {
                    type: "boolean",
                    description: "Frontmatter only (no body, no comments).",
                },
                body: {
                    type: "boolean",
                    description: "Full body including ALL comments.",
                },
                tail_comments: {
                    type: "number",
                    description: "Compact view tail size.",
                },
            },
            required: ["id"],
            additionalProperties: false,
        },
        output: envelopeSchema({
            item: OBJECT,
            path: { type: "string" },
            comments: { type: "array" },
            body: { type: "string" },
        }),
        run: (kernel, input, options) => kernel.showOperation({
            cwd: options.cwd,
            id: asString(input.id) ?? "",
            meta: input.meta === true,
            body: input.body === true,
            tailComments: typeof input.tail_comments === "number" ? input.tail_comments : undefined,
        }),
    },
    {
        name: "next",
        description: "Suggest the next claimable item (next-first, priority-major). Pure read; `suggestion` is null when the pool is empty.",
        input: {
            type: "object",
            properties: {
                ready: {
                    type: "boolean",
                    description: "Only ready items (all depends_on terminal).",
                },
                include_stories: {
                    type: "boolean",
                    description: "Include unclaimed stories in the pool.",
                },
            },
            additionalProperties: false,
        },
        output: envelopeSchema({ suggestion: { type: ["object", "null"] } }),
        run: (kernel, input, options) => kernel.nextOperation({
            cwd: options.cwd,
            ready: input.ready === true,
            includeStories: input.include_stories === true,
        }),
    },
    {
        name: "report",
        description: "Aggregate leaf statuses per story, grouped by epic; `trend: true` mines git history. Pure read — never writes.",
        input: {
            type: "object",
            properties: {
                trend: { type: "boolean" },
                since: { type: "string", description: "YYYY-MM-DD; requires trend." },
            },
            additionalProperties: false,
        },
        output: envelopeSchema({ groups: { type: "array" }, trend: OBJECT }),
        run: (kernel, input, options) => kernel.reportOperation({
            cwd: options.cwd,
            trend: input.trend === true,
            since: asString(input.since),
        }),
    },
    {
        name: "validate",
        description: "Validate tracker frontmatter and tree integrity. Pure read; errors raise a typed tool error carrying the envelope.",
        input: { type: "object", properties: {}, additionalProperties: false },
        output: envelopeSchema({
            layout: { type: "string" },
            errors: { type: "array" },
            warnings: { type: "array" },
        }),
        run: (kernel, _input, options) => kernel.validateOperation({ cwd: options.cwd }),
    },
    {
        name: "comment",
        description: "Append a comment to an item body (history, not a reopen: frontmatter and `updated` are untouched).",
        input: {
            type: "object",
            properties: {
                id: ID,
                text: {
                    type: "string",
                    description: "Multiline supported; non-empty.",
                },
                author: {
                    type: "string",
                    description: "Defaults to the calling session id.",
                },
            },
            required: ["id", "text"],
            additionalProperties: false,
        },
        output: envelopeSchema({
            id: { type: "string" },
            path: { type: "string" },
            comment: OBJECT,
            commit: OBJECT,
        }),
        run: (kernel, input, options, tool) => kernel.commentOperation({
            cwd: options.cwd,
            id: asString(input.id) ?? "",
            text: asString(input.text) ?? "",
            author: asString(input.author) ?? sessionToken(tool?.sessionID),
        }),
    },
    {
        name: "handoff",
        description: "Append a structured, bounded session-end handoff (branch, next step, open questions) to an item body.",
        input: {
            type: "object",
            properties: {
                id: ID,
                next: {
                    type: "string",
                    description: "First step for the resuming agent (capped at 200 chars).",
                },
                branch: {
                    type: "string",
                    description: "Auto-detected from git when omitted.",
                },
                open_questions: {
                    type: "string",
                    description: "Semicolon-separated (capped at 200 chars).",
                },
                session: {
                    type: "string",
                    description: "Defaults to the calling session id.",
                },
                author: {
                    type: "string",
                    description: "Defaults to the calling session id.",
                },
            },
            required: ["id", "next"],
            additionalProperties: false,
        },
        output: envelopeSchema({
            id: { type: "string" },
            path: { type: "string" },
            comment: OBJECT,
            handoff: OBJECT,
            commit: OBJECT,
        }),
        run: (kernel, input, options, tool) => {
            const fallback = sessionToken(tool?.sessionID);
            return kernel.handoffOperation({
                cwd: options.cwd,
                id: asString(input.id) ?? "",
                next: asString(input.next) ?? "",
                branch: asString(input.branch),
                openQuestions: asString(input.open_questions),
                session: asString(input.session) ?? fallback,
                author: asString(input.author) ?? fallback,
            });
        },
    },
    {
        name: "priority",
        description: "Move legacy pN labels into the priority field (highest label wins, idempotent, never auto-commits).",
        input: {
            type: "object",
            properties: {
                dry_run: {
                    type: "boolean",
                    description: "Report the changes and write NOTHING.",
                },
            },
            additionalProperties: false,
        },
        output: envelopeSchema({
            dryRun: BOOLEAN,
            scanned: NUMBER,
            changed: NUMBER,
            entries: { type: "array" },
        }),
        run: (kernel, input, options) => kernel.priorityOperation({
            cwd: options.cwd,
            dryRun: input.dry_run === true,
        }),
    },
    {
        name: "sync",
        description: "Reconcile item branch fields with open GitHub PRs; check by default, `write: true` fills empty branches.",
        input: {
            type: "object",
            properties: {
                check: {
                    type: "boolean",
                    description: "Report matches without modifying (default).",
                },
                write: {
                    type: "boolean",
                    description: "Fill empty branch fields from PRs.",
                },
                repo: {
                    type: "string",
                    description: "owner/name; default from origin.",
                },
            },
            additionalProperties: false,
        },
        output: envelopeSchema({
            mode: { type: "string" },
            matched: { type: "array" },
            unmatched: { type: "array" },
            pending: { type: "array" },
            errors: { type: "array" },
        }),
        run: (kernel, input, options) => kernel.syncOperation({
            cwd: options.cwd,
            check: input.check === true,
            write: input.write === true,
            repo: asString(input.repo),
        }),
    },
    {
        name: "import_issues",
        description: "Import GitHub issues into the tracker as task/bug items (idempotent; `dry_run: true` plans without writing).",
        input: {
            type: "object",
            properties: {
                repo: { type: "string", description: "owner/name; default from gh." },
                parent: {
                    type: "string",
                    description: "Target story (default story-imported-issues).",
                },
                dry_run: { type: "boolean" },
                no_commit: {
                    type: "boolean",
                    description: "Skip the tracker auto-commit.",
                },
            },
            additionalProperties: false,
        },
        output: envelopeSchema({
            dryRun: BOOLEAN,
            story: OBJECT,
            entries: { type: "array" },
            created: NUMBER,
            skipped: NUMBER,
            commit: OBJECT,
        }),
        run: (kernel, input, options) => kernel.importIssuesOperation({
            cwd: options.cwd,
            repo: asString(input.repo),
            parent: asString(input.parent),
            dryRun: input.dry_run === true,
            commit: input.no_commit === true ? false : undefined,
            templatesDir: options.templatesDir,
        }),
    },
];
function worktreeOptions(ctx) {
    const project = ctx.location?.project;
    const projectID = asString(project?.id);
    const canonical = asString(project?.canonical);
    return {
        ...(projectID !== undefined ? { projectID } : {}),
        ...(canonical !== undefined ? { canonical } : {}),
        ...(ctx.worktree !== undefined ? { domain: ctx.worktree } : {}),
    };
}
function worktreeFail(kernel, command, code, message, conventionVersion) {
    return {
        ok: false,
        envelope: kernel.failEnvelope({
            command,
            code,
            message,
            ...(conventionVersion !== undefined ? { conventionVersion } : {}),
        }),
    };
}
function startFailure(kernel, message, conventionVersion, payload) {
    const failure = worktreeFail(kernel, "start", "START_FAILED", boundedNativeText(message, MAX_NATIVE_ERROR_CHARS), conventionVersion);
    return { ...failure, envelope: { ...failure.envelope, ...payload } };
}
function startNotAttempted(kernel, message, conventionVersion, payload, reason) {
    return startFailure(kernel, message, conventionVersion, {
        ...payload,
        claimCommitted: false,
        claimCommit: claimCommitNotAttempted(reason),
    });
}
function boundedPreparation(input) {
    const built = input.builtWorkspaces
        .slice(0, MAX_NATIVE_PREPARATION_NAMES)
        .map((name) => boundedNativeText(name, MAX_NATIVE_PREPARATION_VALUE_CHARS));
    const linked = input.linkedWorkspaces
        .slice(0, MAX_NATIVE_PREPARATION_NAMES)
        .map((name) => boundedNativeText(name, MAX_NATIVE_PREPARATION_VALUE_CHARS));
    const missing = input.missingDependencies.map((name) => boundedNativeText(name, MAX_NATIVE_PREPARATION_VALUE_CHARS));
    const gateBins = (input.gateBins ?? []).map((bin) => {
        const bounded = {
            name: boundedNativeText(bin.name, MAX_NATIVE_PREPARATION_VALUE_CHARS),
            source: bin.source,
        };
        if (bin.path !== undefined) {
            bounded.path = boundedNativeText(bin.path, MAX_NATIVE_PREPARATION_VALUE_CHARS);
        }
        return bounded;
    });
    const steps = (input.steps ?? []).slice(0, MAX_NATIVE_PREPARATION_NAMES).map((entry) => {
        const bounded = {
            step: entry.step,
            outcome: boundedNativeText(entry.outcome, MAX_NATIVE_PREPARATION_VALUE_CHARS),
        };
        if (entry.pkg !== undefined) {
            bounded.pkg = boundedNativeText(entry.pkg, MAX_NATIVE_PREPARATION_VALUE_CHARS);
        }
        return bounded;
    });
    const env = input.env === undefined ? undefined : boundedEnvReceipt(input.env);
    const claim = input.claim === undefined ? undefined : boundedClaimReceipt(input.claim);
    const truncated = input.builtWorkspaces.length > MAX_NATIVE_PREPARATION_NAMES ||
        input.linkedWorkspaces.length > MAX_NATIVE_PREPARATION_NAMES ||
        (input.steps?.length ?? 0) > steps.length ||
        input.missingDependenciesTotal > input.missingDependencies.length ||
        (input.gateBins?.length ?? 0) > gateBins.length ||
        (claim?.foreignWrites !== undefined &&
            claim.foreignWrites.total > claim.foreignWrites.files.length) ||
        built.some((name, index) => name !== input.builtWorkspaces[index]) ||
        linked.some((name, index) => name !== input.linkedWorkspaces[index]) ||
        missing.some((name, index) => name !== input.missingDependencies[index]) ||
        gateBins.some((bin, index) => input.gateBins?.[index] === undefined ||
            bin.name !== input.gateBins[index].name ||
            bin.path !== input.gateBins[index].path) ||
        (env !== undefined && envTruncated(env, input.env));
    return {
        ready: input.ready,
        install: input.install,
        linkedNodeModules: input.linkedNodeModules,
        builtWorkspaces: built,
        linkedWorkspaces: linked,
        manifestCoverage: input.manifestCoverage,
        missingDependencies: missing,
        missingDependenciesTotal: input.missingDependenciesTotal,
        gateBins,
        ...(steps.length > 0 ? { steps } : {}),
        ...(env !== undefined ? { env } : {}),
        ...(claim !== undefined ? { claim } : {}),
        ...(truncated ? { truncated: true } : {}),
    };
}
function boundedClaimReceipt(input) {
    const bounded = { stamped: input.stamped };
    if (input.foreignWrites !== undefined) {
        bounded.foreignWrites = {
            owner: boundedNativeText(input.foreignWrites.owner, MAX_NATIVE_PREPARATION_VALUE_CHARS),
            claimedAt: boundedNativeText(input.foreignWrites.claimedAt, MAX_NATIVE_PREPARATION_VALUE_CHARS),
            files: input.foreignWrites.files
                .slice(0, MAX_NATIVE_PREPARATION_NAMES)
                .map((file) => boundedNativeText(file, MAX_NATIVE_PREPARATION_VALUE_CHARS)),
            total: input.foreignWrites.total,
        };
    }
    if (input.warning !== undefined) {
        bounded.warning = boundedNativeText(input.warning, MAX_NATIVE_PREPARATION_VALUE_CHARS);
    }
    return bounded;
}
function boundedEnvReceipt(input) {
    const bounded = { written: input.written };
    if (input.path !== undefined) {
        bounded.path = boundedNativeText(input.path, MAX_NATIVE_PREPARATION_VALUE_CHARS);
    }
    if (input.keys !== undefined) {
        bounded.keys = input.keys
            .slice(0, MAX_NATIVE_PREPARATION_NAMES)
            .map((key) => boundedNativeText(key, MAX_NATIVE_PREPARATION_VALUE_CHARS));
    }
    if (input.seededDotenv !== undefined) {
        bounded.seededDotenv = boundedNativeText(input.seededDotenv, MAX_NATIVE_PREPARATION_VALUE_CHARS);
    }
    if (input.gitignored !== undefined) {
        bounded.gitignored = input.gitignored;
    }
    if (input.warning !== undefined) {
        bounded.warning = boundedNativeText(input.warning, MAX_NATIVE_PREPARATION_VALUE_CHARS);
    }
    return bounded;
}
function envTruncated(bounded, input) {
    if (input === undefined)
        return true;
    return (bounded.path !== input.path ||
        bounded.seededDotenv !== input.seededDotenv ||
        bounded.warning !== input.warning ||
        (input.keys?.length ?? 0) > (bounded.keys?.length ?? 0) ||
        (bounded.keys ?? []).some((key, index) => key !== input.keys?.[index]));
}
function boundedNames(names) {
    if (names === undefined)
        return undefined;
    return names
        .slice(0, MAX_NATIVE_PREPARATION_NAMES)
        .map((name) => boundedNativeText(name, MAX_NATIVE_PREPARATION_VALUE_CHARS));
}
function boundedCommitPayload(result) {
    const ignored = boundedNames(result.ignored);
    if (result.committed) {
        return {
            ...(result.hash !== undefined
                ? { hash: boundedNativeText(result.hash, MAX_NATIVE_DETAIL_CHARS) }
                : {}),
            ...(result.message !== undefined
                ? { message: boundedNativeText(result.message, MAX_NATIVE_DETAIL_CHARS) }
                : {}),
            ...(ignored !== undefined ? { ignored } : {}),
        };
    }
    return {
        skipped: boundedNativeText(result.skipReason ?? "skipped", MAX_NATIVE_DETAIL_CHARS),
        ...(ignored !== undefined ? { ignored } : {}),
    };
}
function claimCommitFailure(skipped) {
    return {
        status: "failed",
        committed: false,
        skipped: boundedNativeText(skipped || "claim commit failed", MAX_NATIVE_DETAIL_CHARS),
    };
}
function claimCommitNotAttempted(reason) {
    return {
        status: "not-attempted",
        committed: false,
        reason: boundedNativeText(reason, MAX_NATIVE_DETAIL_CHARS),
    };
}
function envelopeMessage(envelope, fallback) {
    const error = envelope.error !== null && typeof envelope.error === "object"
        ? envelope.error
        : undefined;
    return boundedNativeText(asString(error?.message) ?? fallback, MAX_NATIVE_DETAIL_CHARS);
}
function commitNativeClaim(kernel, cwd, id) {
    const shown = kernel.showOperation({ cwd, id, meta: true });
    if (!shown.ok) {
        return { receipt: claimCommitNotAttempted(envelopeMessage(shown.envelope, "claim item lookup failed")) };
    }
    const path = asString(shown.envelope.path);
    if (path === undefined)
        return { receipt: claimCommitNotAttempted("claim item path unavailable") };
    const result = kernel.commitTrackerMutation(cwd, [(0, node_path_1.resolve)(cwd, path)], {
        message: kernel.trackerCommitMessage("claimed", [id]),
        commit: true,
    });
    const ignored = boundedNames(result.ignored);
    if (result.committed) {
        return {
            receipt: {
                status: "committed",
                committed: true,
                ...(result.hash !== undefined
                    ? { hash: boundedNativeText(result.hash, MAX_NATIVE_DETAIL_CHARS) }
                    : {}),
                ...(result.message !== undefined
                    ? { message: boundedNativeText(result.message, MAX_NATIVE_DETAIL_CHARS) }
                    : {}),
                ...(ignored !== undefined ? { ignored } : {}),
            },
            payload: boundedCommitPayload(result),
        };
    }
    if (result.skipReason === "nothing to commit") {
        return {
            receipt: {
                status: "not-needed",
                committed: true,
                ...(ignored !== undefined ? { ignored } : {}),
            },
        };
    }
    return {
        receipt: {
            ...claimCommitFailure(result.skipReason ?? "git commit failed"),
            ...(ignored !== undefined ? { ignored } : {}),
        },
        payload: boundedCommitPayload(result),
    };
}
async function guarded(kernel, command, code, body) {
    try {
        return await body();
    }
    catch (error) {
        logOnce(`worktree-${command}`, `${command} failed unexpectedly`, error);
        if (command === "start") {
            return startNotAttempted(kernel, detail(error), undefined, {}, "unexpected start failure before claim setup");
        }
        return worktreeFail(kernel, command, code, detail(error));
    }
}
function remapFailure(envelope, command, code) {
    const error = envelope.error !== null && typeof envelope.error === "object"
        ? envelope.error
        : {};
    return { ok: false, envelope: { ...envelope, command, error: { ...error, code } } };
}
function sessionRoot(kernel, cwd) {
    return kernel.repoRootFromTasks(kernel.findTasksDir(cwd));
}
function itemBranch(kernel, root, item, explicit) {
    const requested = asString(explicit) ?? asString(item.branch);
    if (requested !== undefined)
        return requested;
    const type = asString(item.type);
    const config = kernel.readConventionConfig(root);
    const pattern = (type !== undefined ? config.branchPatterns[type] : undefined) ??
        (type !== undefined ? kernel.DEFAULT_BRANCH_PATTERNS[type] : undefined) ??
        "feat/{id}";
    return kernel.resolveBranchName(pattern, {
        id: asString(item.id) ?? "",
        type: (type ?? "task"),
    });
}
function canonicalRoot(options, fallback) {
    return asString(options.worktree?.canonical) ?? fallback;
}
async function createItemWorktree(options, repoRoot, id) {
    const domain = options.worktree?.domain;
    const projectID = asString(options.worktree?.projectID);
    if (domain?.create === undefined || projectID === undefined) {
        return {
            error: "the OpenCode worktree domain is unavailable (ctx.worktree.create/project id missing); " +
                "use the CLI fallback `arggon start --worktree`",
        };
    }
    const canonical = canonicalRoot(options, repoRoot);
    const name = `${(0, node_path_1.basename)(canonical)}-${id}`;
    try {
        const created = (await domain.create({
            projectID,
            name,
            directory: (0, node_path_1.resolve)(canonical, ".."),
        }));
        const directory = asString(created?.directory);
        if (directory === undefined) {
            return { error: "the worktree domain returned no directory for " + name };
        }
        return { directory };
    }
    catch (error) {
        return { error: `worktree domain create failed for '${name}': ${detail(error)}` };
    }
}
async function removeWorktreeObserved(options, directory, root, policy) {
    const errors = [];
    const domain = options.worktree?.domain;
    const projectID = asString(options.worktree?.projectID);
    const gone = async () => !(0, node_fs_1.existsSync)(directory) && !(await isRegisteredWorktree(root, directory));
    let via = null;
    if (domain?.remove !== undefined && projectID !== undefined) {
        try {
            await domain.remove({ projectID, directory, force: policy.force });
            if (await gone())
                via = "domain";
            else
                errors.push("the worktree domain resolved without removing the worktree");
        }
        catch (error) {
            errors.push(`worktree domain removal failed: ${detail(error)}`);
        }
    }
    if (via === null) {
        const removed = await run("git", ["worktree", "remove", ...(policy.force ? ["--force"] : []), directory], root, 30_000);
        if (removed.code !== 0) {
            errors.push(`git worktree removal failed: ${removed.stderr.trim() || `exit ${removed.code ?? "unknown"}`}`);
        }
        else if (await gone()) {
            via = "git";
        }
        else {
            errors.push(`git worktree remove exited 0 but the worktree remains at ${directory}`);
        }
    }
    const removed = via !== null;
    if (!removed)
        errors.push(`worktree remains at ${directory}`);
    return { removed, via, errors };
}
async function discardWorktree(options, directory, branch) {
    const canonical = canonicalRoot(options, options.cwd);
    const observation = await removeWorktreeObserved(options, directory, canonical, { force: true });
    const errors = [...observation.errors];
    const worktreeRemoved = observation.removed;
    let branchDeleted = branch === undefined ? null : false;
    if (branch !== undefined) {
        if (!worktreeRemoved) {
            errors.push(`branch ${branch} was kept because its worktree remains`);
        }
        else {
            const deleted = await run("git", ["branch", "-D", branch], canonical, 10_000);
            branchDeleted = deleted.code === 0;
            if (!branchDeleted) {
                errors.push(`git branch deletion failed: ${deleted.stderr.trim() || `exit ${deleted.code ?? "unknown"}`}`);
            }
        }
    }
    return {
        worktreeRemoved,
        branchDeleted,
        ...(errors.length > 0
            ? { error: boundedNativeText(errors.join("; "), MAX_NATIVE_DETAIL_CHARS) }
            : {}),
    };
}
async function cleanupClaimArtifacts(options, kernel, primaryRoot, worktreePath, worktreeCreated, branchCreated, branch, preparation) {
    const preparationRemoved = preparation?.linkedNodeModules !== true || worktreePath === undefined
        ? true
        : kernel.unlinkNodeModulesLink(primaryRoot, worktreePath);
    const discard = worktreeCreated && worktreePath !== undefined
        ? await discardWorktree(options, worktreePath, branchCreated ? branch : undefined)
        : undefined;
    return { preparationRemoved, ...(discard !== undefined ? { discard } : {}) };
}
function cleanupDescription(cleanup, worktreeCreated, worktreePath, branch) {
    if (!worktreeCreated) {
        return cleanup.preparationRemoved
            ? ""
            : `the start-owned dependency link could not be removed from ${worktreePath ?? "the worktree"}`;
    }
    const discard = cleanup.discard;
    if (cleanup.preparationRemoved &&
        discard?.worktreeRemoved === true &&
        (discard.branchDeleted === true || discard.branchDeleted === null)) {
        return "the worktree created by this run was removed again";
    }
    const details = [
        cleanup.preparationRemoved ? undefined : "the start-owned dependency link remains",
        discard?.worktreeRemoved === false ? `the worktree remains at ${worktreePath ?? "the created path"}` : undefined,
        discard?.branchDeleted === false ? `the branch remains: ${branch}` : undefined,
        discard?.error,
    ].filter((value) => value !== undefined);
    return `rollback incomplete: ${details.join("; ")}`;
}
async function ensureWorktreeBranch(worktreePath, branch) {
    const exists = await run("git", ["rev-parse", "--verify", "--quiet", `refs/heads/${branch}`], worktreePath, 10_000);
    if (exists.code === 0) {
        const switched = await run("git", ["switch", branch], worktreePath, 10_000);
        return switched.code === 0
            ? { ok: true, created: false }
            : { ok: false, created: false, error: switched.stderr.trim() || `git switch ${branch} failed` };
    }
    const created = await run("git", ["switch", "-c", branch], worktreePath, 10_000);
    return created.code === 0
        ? { ok: true, created: true }
        : { ok: false, created: false, error: created.stderr.trim() || `git switch -c ${branch} failed` };
}
async function isRegisteredWorktree(canonical, path) {
    const listed = await run("git", ["worktree", "list", "--porcelain"], canonical, 10_000);
    if (listed.code !== 0)
        return false;
    const target = (0, node_path_1.resolve)(path);
    return listed.stdout
        .split("\n")
        .filter((line) => line.startsWith("worktree "))
        .map((line) => (0, node_path_1.resolve)(line.slice("worktree ".length).trim()))
        .includes(target);
}
async function staleClaimFields(kernel, canonicalCwd, worktreePath, id) {
    const fields = ["status", "assignee", "branch", "worktree_path"];
    const read = (cwd) => {
        const shown = kernel.showOperation({ cwd, id, meta: true });
        return shown.ok ? (shown.envelope.item ?? {}) : undefined;
    };
    const canonical = read(canonicalCwd);
    const worktree = read(worktreePath);
    if (canonical === undefined || worktree === undefined)
        return undefined;
    const differing = fields.filter((field) => {
        const left = canonical[field] ?? null;
        const right = worktree[field] ?? null;
        return left !== right;
    });
    return differing.length === 0 ? undefined : differing.join(", ");
}
async function preflightPlainBranch(kernel, options, root, branch) {
    const ref = await run("git", ["check-ref-format", "--branch", branch], options.cwd, 10_000);
    if (ref.code !== 0) {
        return `branch '${branch}' is not a valid git branch (${ref.stderr.trim() || `git exit ${ref.code ?? "unknown"}`})`;
    }
    const worktrees = await run("git", ["worktree", "list", "--porcelain"], options.cwd, 10_000);
    if (worktrees.code !== 0) {
        return `could not inspect git worktrees before branch setup (${worktrees.stderr.trim() || `git exit ${worktrees.code ?? "unknown"}`})`;
    }
    let worktreePath;
    for (const line of worktrees.stdout.split("\n")) {
        if (line.startsWith("worktree ")) {
            worktreePath = line.slice("worktree ".length).trim();
        }
        else if (line.trim() === `branch refs/heads/${branch}`) {
            if (worktreePath !== undefined && (0, node_path_1.resolve)(worktreePath) !== (0, node_path_1.resolve)(options.cwd)) {
                return `branch '${branch}' is already checked out at ${worktreePath}; detach it before plain start`;
            }
        }
    }
    const status = await run("git", ["status", "--porcelain", "--untracked-files=all"], options.cwd, 10_000);
    if (status.code !== 0) {
        return `could not inspect the canonical working tree before branch setup (${status.stderr.trim() || `git exit ${status.code ?? "unknown"}`})`;
    }
    const tracker = (0, node_path_1.relative)(root, kernel.findTasksDir(root)).split(node_path_1.sep).join("/");
    const blocked = status.stdout.split("\n").filter((line) => {
        if (line.trim().length === 0)
            return false;
        const code = line.slice(0, 2);
        const path = line.slice(3).replace(/^"|"$/g, "");
        return !(code === "??" && !path.startsWith(`${tracker}/`));
    });
    if (blocked.length > 0) {
        return "the canonical working tree has tracked or tracker changes; commit/stash them before plain start";
    }
    return undefined;
}
function startProgressPayload(progress) {
    return {
        id: progress.id,
        branch: progress.branch,
        worktreePath: progress.worktreePath ?? null,
        worktreeCreated: progress.worktreeCreated,
        branchCreated: progress.branchCreated,
        ...(progress.preparation !== undefined ? { preparation: progress.preparation } : {}),
        ...(progress.item !== undefined ? { item: progress.item } : {}),
        ...(progress.claim !== undefined
            ? { claimCommitted: progress.claim.receipt.committed, claimCommit: progress.claim.receipt }
            : {}),
        ...(progress.claim?.payload !== undefined ? { commit: progress.claim.payload } : {}),
        ...(progress.pushed !== undefined ? { pushed: progress.pushed } : {}),
    };
}
function unexpectedStartFailure(kernel, error, progress) {
    const observed = startProgressPayload(progress);
    const where = boundedNativeText(progress.stage, MAX_NATIVE_DETAIL_CHARS);
    const cause = boundedNativeText(detail(error), MAX_NATIVE_DETAIL_CHARS);
    if (progress.claim !== undefined) {
        const committed = progress.claim.receipt.committed;
        return startFailure(kernel, committed
            ? `start failed unexpectedly after ${where}, but the claim commit already landed ` +
                `(${progress.claim.receipt.hash ?? "committed"}); the branch and claim were kept. ${cause}. ` +
                "Re-run tools.arggon.start to attach and confirm the recorded state."
            : `start failed unexpectedly after ${where}; the claim commit was attempted and did not land. ` +
                `${cause}. Fix the reported cause, then re-run tools.arggon.start to attach and retry.`, progress.version, observed);
    }
    return startNotAttempted(kernel, `start failed unexpectedly after ${where}; no claim commit was attempted. ${cause}`, progress.version, observed, `unexpected start failure after ${where}`);
}
function safeUnexpectedStartFailure(kernel, error, progress, fallback) {
    const message = boundedNativeText(`start failed unexpectedly: ${detail(error)}`, MAX_NATIVE_ERROR_CHARS);
    try {
        if (progress === undefined) {
            return startNotAttempted(kernel, message, fallback.version, { id: fallback.id }, "unexpected start failure before branch setup");
        }
        return unexpectedStartFailure(kernel, error, progress);
    }
    catch {
        return {
            ok: false,
            envelope: {
                ok: false,
                schemaVersion: 1,
                conventionVersion: fallback.version,
                command: "start",
                error: { code: "START_FAILED", message },
                id: fallback.id,
                ...(progress === undefined
                    ? { claimCommitted: false, claimCommit: claimCommitNotAttempted("unexpected start failure") }
                    : startProgressPayload(progress)),
            },
        };
    }
}
async function rollbackOwnedPlainBranch(options, branch, branchCreated, previousBranch) {
    if (!branchCreated)
        return { branchDeleted: null };
    const errors = [];
    const detached = previousBranch === undefined || previousBranch === "HEAD";
    const back = detached
        ? await run("git", ["switch", "--detach"], options.cwd, 10_000)
        : await run("git", ["switch", previousBranch], options.cwd, 10_000);
    if (back.code !== 0) {
        errors.push(`could not leave branch ${branch}: ${back.stderr.trim() || `git switch exit ${back.code ?? "unknown"}`}`);
    }
    let branchDeleted = false;
    if (back.code === 0) {
        const deleted = await run("git", ["branch", "-D", branch], options.cwd, 10_000);
        branchDeleted = deleted.code === 0;
        if (!branchDeleted) {
            errors.push(`git branch deletion failed: ${deleted.stderr.trim() || `git exit ${deleted.code ?? "unknown"}`}`);
        }
    }
    else {
        errors.push(`branch ${branch} was kept because the checkout could not leave it`);
    }
    return {
        branchDeleted,
        ...(back.code === 0 ? { restoredBranch: detached ? "HEAD" : previousBranch } : {}),
        ...(errors.length > 0
            ? { error: boundedNativeText(errors.join("; "), MAX_NATIVE_DETAIL_CHARS) }
            : {}),
    };
}
function plainRollbackDescription(rollback, branch) {
    if (rollback.branchDeleted === null)
        return "";
    if (rollback.branchDeleted) {
        return ("the branch created by this run was removed again and the checkout was restored to " +
            `${rollback.restoredBranch ?? "its previous HEAD"}`);
    }
    return `rollback incomplete: ${rollback.error ?? `the branch remains: ${branch}`}`;
}
async function nativeStart(kernel, input, options, tool) {
    const id = asString(input.id);
    if (id === undefined) {
        return startNotAttempted(kernel, "id is required", undefined, {}, "invalid id");
    }
    let root;
    try {
        root = sessionRoot(kernel, options.cwd);
    }
    catch (error) {
        return startNotAttempted(kernel, detail(error), undefined, { id }, "session root unavailable");
    }
    const version = kernel.readConventionVersion(root);
    const show = kernel.showOperation({ cwd: options.cwd, id, meta: true });
    if (!show.ok) {
        return startNotAttempted(kernel, envelopeMessage(show.envelope, "item lookup failed"), version, { id }, "item lookup failed");
    }
    const item = (show.envelope.item ?? {});
    const assignee = asString(input.assignee) ?? asString(kernel.resolveCurrentLogin()) ?? undefined;
    if (assignee === undefined) {
        return startNotAttempted(kernel, "could not resolve assignee (pass assignee, or set GITHUB_USER/GITHUB_ACTOR, or authenticate gh)", version, { id }, "assignee unavailable");
    }
    let progress;
    try {
        progress = {
            id,
            branch: itemBranch(kernel, root, item, input.branch),
            version,
            stage: "branch setup",
            worktreeCreated: false,
            branchCreated: false,
        };
        return await nativeStartBody(kernel, input, options, progress, item, root, assignee, tool);
    }
    catch (error) {
        return safeUnexpectedStartFailure(kernel, error, progress, { id, version });
    }
}
async function nativeStartBody(kernel, input, options, progress, item, root, assignee, tool) {
    const { id, branch, version } = progress;
    const primaryRoot = canonicalRoot(options, root);
    const claimIdentity = sessionToken(tool?.sessionID) ?? assignee;
    const wantWorktree = input.worktree !== false;
    let worktreePath = wantWorktree ? asString(item.worktree_path) : undefined;
    if (worktreePath !== undefined && !(0, node_fs_1.existsSync)(worktreePath))
        worktreePath = undefined;
    progress.worktreePath = worktreePath;
    let plainPreviousBranch;
    const context = (extra = {}) => ({
        ...startProgressPayload(progress),
        ...extra,
    });
    const failBeforeClaim = (message, reason, extra = {}) => startNotAttempted(kernel, message, version, context(extra), reason);
    if (wantWorktree) {
        const canonical = primaryRoot;
        if (worktreePath === undefined) {
            const defaultPath = (0, node_path_1.join)((0, node_path_1.resolve)(canonical, ".."), `${(0, node_path_1.basename)(canonical)}-${id}`);
            if ((0, node_fs_1.existsSync)(defaultPath))
                worktreePath = defaultPath;
        }
        progress.worktreePath = worktreePath;
        if (worktreePath !== undefined) {
            if (!(await isRegisteredWorktree(canonical, worktreePath))) {
                return failBeforeClaim(`${worktreePath} exists but is not a git worktree of this repo ` +
                    "(move or remove the path first, or use the CLI fallback `arggon start --worktree`)", "foreign worktree refused");
            }
        }
        else {
            const created = await createItemWorktree(options, root, id);
            if (created.directory === undefined) {
                return failBeforeClaim(created.error ?? "worktree creation failed", "worktree creation failed");
            }
            worktreePath = created.directory;
            progress.worktreePath = worktreePath;
            progress.worktreeCreated = true;
            const stale = await staleClaimFields(kernel, options.cwd, worktreePath, id);
            if (stale !== undefined) {
                const cleanup = await cleanupClaimArtifacts(options, kernel, primaryRoot, worktreePath, progress.worktreeCreated, progress.branchCreated, branch, progress.preparation);
                const rollback = cleanup.discard !== undefined
                    ? { rollback: { preparationRemoved: cleanup.preparationRemoved, ...cleanup.discard } }
                    : { rollback: { preparationRemoved: cleanup.preparationRemoved } };
                return failBeforeClaim(`the canonical checkout has uncommitted tracker changes for '${id}' (${stale}); ` +
                    "commit or discard them, or use the CLI fallback `arggon start --worktree`. " +
                    cleanupDescription(cleanup, progress.worktreeCreated, worktreePath, branch), "stale canonical claim refused", rollback);
            }
        }
        progress.stage = "branch setup";
        const ensured = await ensureWorktreeBranch(worktreePath, branch);
        if (!ensured.ok) {
            const cleanup = await cleanupClaimArtifacts(options, kernel, primaryRoot, worktreePath, progress.worktreeCreated, false, branch, progress.preparation);
            const rollback = cleanup.discard !== undefined
                ? { rollback: { preparationRemoved: cleanup.preparationRemoved, ...cleanup.discard } }
                : { rollback: { preparationRemoved: cleanup.preparationRemoved } };
            return failBeforeClaim(`branch setup failed in ${worktreePath}: ${ensured.error ?? "unknown git error"}. ` +
                cleanupDescription(cleanup, progress.worktreeCreated, worktreePath, branch), "branch setup failed", rollback);
        }
        progress.branchCreated = ensured.created;
    }
    else {
        const branchCheck = await run("git", ["rev-parse", "--verify", "--quiet", `refs/heads/${branch}`], options.cwd, 10_000);
        if (branchCheck.code !== 0 && branchCheck.code !== 1) {
            return failBeforeClaim(`could not inspect branch '${branch}': ${branchCheck.stderr.trim() || `git exit ${branchCheck.code ?? "unknown"}`}`, "branch ownership preflight failed");
        }
        if (branchCheck.code === 0 &&
            asString(input.branch) === undefined &&
            asString(item.branch) !== branch) {
            return failBeforeClaim(`branch '${branch}' already exists but the item has no matching recorded branch; ` +
                "record it explicitly or choose another branch", "branch ownership conflict");
        }
        const preflight = await preflightPlainBranch(kernel, options, root, branch);
        if (preflight !== undefined) {
            return failBeforeClaim(preflight, "plain-start preflight failed");
        }
        const previous = await run("git", ["rev-parse", "--abbrev-ref", "HEAD"], options.cwd, 10_000);
        plainPreviousBranch = previous.code === 0 ? previous.stdout.trim() || undefined : undefined;
        const ensured = await ensureWorktreeBranch(options.cwd, branch);
        if (!ensured.ok) {
            return failBeforeClaim(`branch setup failed in ${options.cwd}: ${ensured.error ?? "unknown git error"}; ` +
                "the item was not modified", "branch setup failed");
        }
        progress.branchCreated = ensured.created;
    }
    if (worktreePath !== undefined) {
        progress.stage = "dependency preparation";
        try {
            progress.preparation = boundedPreparation(kernel.prepareWorktreeDependencies(primaryRoot, worktreePath, {
                env: {
                    identity: { itemId: id, branch },
                    enabled: kernel.readConventionConfig(root).worktree.env !== false,
                },
                claim: {
                    identity: claimIdentity,
                    assignee,
                    itemId: id,
                    branch,
                    surface: "native",
                },
            }));
        }
        catch (error) {
            const preparationError = boundedPreparation({
                ready: false,
                install: "unavailable",
                linkedNodeModules: false,
                builtWorkspaces: [],
                linkedWorkspaces: [],
                manifestCoverage: "unknown",
                missingDependencies: [],
                missingDependenciesTotal: 0,
                gateBins: [],
            });
            const preparationRemoved = kernel.unlinkNodeModulesLink(primaryRoot, worktreePath);
            return failBeforeClaim(`dependency preparation failed in ${worktreePath}: ${boundedNativeText(detail(error), MAX_NATIVE_DETAIL_CHARS)}; ` +
                (preparationRemoved
                    ? "the start-owned dependency link was removed and the worktree was kept"
                    : "the worktree and any start-owned dependency link were kept"), "dependency preparation failed", { preparation: preparationError, rollback: { preparationRemoved } });
        }
    }
    if (worktreePath !== undefined) {
        const strictRefusal = kernel.readConventionConfig(root).tracker.strictGateBins === true
            ? kernel.strictGateBinFailure(progress.preparation?.gateBins ?? [], worktreePath)
            : null;
        if (strictRefusal !== null) {
            return failBeforeClaim(`${strictRefusal} The worktree was kept at ${worktreePath} (nothing was rolled back). ` +
                "Then re-run " +
                `tools.arggon.start({ id: ${JSON.stringify(id)}, assignee: ${JSON.stringify(assignee)} }) — ` +
                "it attaches to the existing worktree and retries the claim commit.", "strict gate-bin gate refused");
        }
    }
    if (worktreePath !== undefined) {
        const foreignWrites = progress.preparation?.claim?.foreignWrites;
        const strictWriteRefusal = kernel.readConventionConfig(root).tracker.strictWorktreeWrites === true &&
            foreignWrites !== undefined
            ? kernel.strictWorktreeWriteFailure(foreignWrites)
            : null;
        if (strictWriteRefusal !== null) {
            return failBeforeClaim(`${strictWriteRefusal} The worktree was kept at ${worktreePath} (nothing was rolled back). ` +
                "Then re-run " +
                `tools.arggon.start({ id: ${JSON.stringify(id)}, assignee: ${JSON.stringify(assignee)} }) — ` +
                "it attaches to the existing worktree and retries the claim commit.", "strict worktree-write gate refused");
        }
    }
    if (worktreePath !== undefined && progress.worktreeCreated) {
        const refusal = kernel.freshWorktreeInstallRefusal(progress.preparation?.gateBins ?? [], worktreePath, progress.preparation?.steps ?? []);
        if (refusal !== null) {
            return failBeforeClaim(`${refusal} The worktree was kept at ${worktreePath} (nothing was rolled back). ` +
                "Then re-run " +
                `tools.arggon.start({ id: ${JSON.stringify(id)}, assignee: ${JSON.stringify(assignee)} }) — ` +
                "it attaches to the existing worktree and retries the claim commit.", "fresh-worktree install gate refused");
        }
    }
    progress.stage = "claim update";
    const target = worktreePath ?? options.cwd;
    const update = kernel.updateOperation({
        cwd: target,
        id,
        status: "in_progress",
        assignee,
        branch,
        ...(wantWorktree ? { worktreePath } : {}),
        commit: false,
        agent: true,
    });
    if (!update.ok) {
        if (wantWorktree) {
            const cleanup = await cleanupClaimArtifacts(options, kernel, primaryRoot, worktreePath, progress.worktreeCreated, progress.branchCreated, branch, progress.preparation);
            const rollback = cleanup.discard !== undefined
                ? { rollback: { preparationRemoved: cleanup.preparationRemoved, ...cleanup.discard } }
                : { rollback: { preparationRemoved: cleanup.preparationRemoved } };
            return failBeforeClaim(`${envelopeMessage(update.envelope, "claim update failed")}. ` +
                cleanupDescription(cleanup, progress.worktreeCreated, worktreePath, branch), "claim update refused", rollback);
        }
        const rollback = await rollbackOwnedPlainBranch(options, branch, progress.branchCreated, plainPreviousBranch);
        return failBeforeClaim(`${envelopeMessage(update.envelope, "claim update failed")}. ` +
            plainRollbackDescription(rollback, branch), "claim update refused", { rollback });
    }
    progress.item = update.envelope.item;
    progress.stage = "claim commit";
    let claim;
    try {
        claim = commitNativeClaim(kernel, target, id);
    }
    catch (error) {
        claim = { receipt: claimCommitFailure(detail(error)) };
    }
    progress.claim = claim;
    const claimPayload = {
        ...context(),
        item: update.envelope.item,
        claimCommitted: claim.receipt.committed,
        claimCommit: claim.receipt,
        ...(claim.payload !== undefined ? { commit: claim.payload } : {}),
    };
    if (!claim.receipt.committed) {
        const reason = claim.receipt.skipped ?? "claim commit failed";
        const kept = worktreePath !== undefined
            ? `the worktree was kept at ${worktreePath} (nothing was rolled back)`
            : "the claim file was left in place for inspection";
        const foreignBins = (progress.preparation?.gateBins ?? []).filter((bin) => bin.source !== "worktree");
        const resolution = foreignBins.length > 0
            ? ` Gate binaries do not resolve inside the worktree — ${foreignBins
                .map((bin) => bin.source === "missing"
                ? `${bin.name}: not resolvable from the worktree`
                : bin.source === "path"
                    ? `${bin.name}: resolves only via PATH from ${bin.path} (outside the worktree)`
                    : `${bin.name}: resolves from ${bin.path}, above the worktree`)
                .join("; ")}.`
            : "";
        const install = progress.preparation?.install ?? "unknown";
        const installNote = install === "missing" || install === "unavailable"
            ? ` The worktree has no usable install of its own (${install}).`
            : "";
        const fix = resolution !== "" || installNote !== ""
            ? " Run `npm ci` in the worktree for a worktree-local install, then re-run."
            : "";
        return startFailure(kernel, `start failed while committing the claim; ${kept}. ` +
            `${reason}.${resolution}${installNote}${fix} Otherwise re-run ` +
            `tools.arggon.start({ id: ${JSON.stringify(id)}, assignee: ${JSON.stringify(assignee)} }) — ` +
            "it attaches to the existing worktree and retries the claim commit.", version, claimPayload);
    }
    progress.stage = "push";
    let pushed = false;
    const pushEligible = claim.receipt.status === "committed" || progress.branchCreated;
    if (input.push === true && pushEligible) {
        const push = await run("git", ["push", "-u", "origin", branch], target, 60_000);
        if (push.code !== 0) {
            progress.pushed = false;
            return startFailure(kernel, `push failed (${push.stderr.trim() || `git push exit ${push.code}`}); the branch and claim were kept`, version, { ...claimPayload, pushed: false });
        }
        pushed = true;
    }
    progress.pushed = pushed;
    progress.stage = "response";
    return {
        ok: true,
        envelope: kernel.successEnvelope("start", { ...claimPayload, pushed }, version),
    };
}
function nativeBranch(kernel, input, options) {
    const id = asString(input.id);
    if (id === undefined)
        return worktreeFail(kernel, "branch", "BRANCH_FAILED", "id is required");
    let root;
    try {
        root = sessionRoot(kernel, options.cwd);
    }
    catch (error) {
        return worktreeFail(kernel, "branch", "BRANCH_FAILED", detail(error));
    }
    const version = kernel.readConventionVersion(root);
    const show = kernel.showOperation({ cwd: options.cwd, id, meta: true });
    if (!show.ok)
        return remapFailure(show.envelope, "branch", "BRANCH_FAILED");
    const branch = itemBranch(kernel, root, (show.envelope.item ?? {}), input.branch);
    const update = kernel.updateOperation({ cwd: options.cwd, id, branch, agent: true });
    if (!update.ok)
        return remapFailure(update.envelope, "branch", "BRANCH_FAILED");
    return {
        ok: true,
        envelope: kernel.successEnvelope("branch", {
            id,
            branch,
            item: update.envelope.item,
            ...(update.envelope.commit !== undefined ? { commit: update.envelope.commit } : {}),
        }, version),
    };
}
async function domainWorktrees(options) {
    const domain = options.worktree?.domain;
    const projectID = asString(options.worktree?.projectID);
    if (domain?.list === undefined || projectID === undefined)
        return [];
    try {
        if (domain.refresh !== undefined)
            await domain.refresh({ projectID });
        const entries = await domain.list({ projectID });
        if (!Array.isArray(entries))
            return [];
        return entries
            .map((entry) => asString(entry?.directory))
            .filter((directory) => directory !== undefined);
    }
    catch (error) {
        logOnce("worktree-list", "worktree domain inventory failed", error);
        return [];
    }
}
const COMPOSE_DOWN_TIMEOUT_MS = 120_000;
function nativeComposeDown(project, cwd) {
    return new Promise((resolvePromise, rejectPromise) => {
        const child = (0, node_child_process_1.execFile)("docker", ["compose", "-p", project, "down", "-v", "--remove-orphans"], {
            cwd,
            encoding: "utf8",
            timeout: COMPOSE_DOWN_TIMEOUT_MS,
            maxBuffer: 1024 * 1024,
            windowsHide: true,
        }, (error, _stdout, stderr) => {
            if (error === null) {
                resolvePromise();
                return;
            }
            if (error.code === "ENOENT") {
                rejectPromise(error);
                return;
            }
            const detailText = String(stderr ?? "").trim();
            const message = error instanceof Error ? error.message : String(error);
            rejectPromise(new Error(`docker compose -p ${project} down -v --remove-orphans failed` +
                (detailText ? `: ${detailText}` : ` (${message})`)));
        });
        child.stdin?.end();
    });
}
async function nativeCleanup(kernel, input, options) {
    let root;
    try {
        root = sessionRoot(kernel, options.cwd);
    }
    catch (error) {
        return worktreeFail(kernel, "cleanup", "CLEANUP_FAILED", detail(error));
    }
    const version = kernel.readConventionVersion(root);
    const git = kernel.defaultCleanupGit();
    if (!git.isRepo(root)) {
        return worktreeFail(kernel, "cleanup", "CLEANUP_FAILED", `not a git repository (${root}); cleanup needs git`, version);
    }
    let base;
    try {
        base = git.defaultBranch(root);
    }
    catch (error) {
        return worktreeFail(kernel, "cleanup", "CLEANUP_FAILED", detail(error), version);
    }
    const tasksDir = kernel.findTasksDir(options.cwd);
    const byId = kernel.itemsById(kernel.loadItems(tasksDir));
    const tracked = [...byId.values()]
        .filter((item) => (item.worktreePath ?? null) !== null)
        .sort((a, b) => a.id.localeCompare(b.id));
    const inventory = await domainWorktrees(options);
    const runner = {
        ...git,
        worktreeList: (cwd) => inventory.length > 0 ? inventory : git.worktreeList(cwd),
    };
    const entries = tracked.map((item) => kernel.classifyCleanupEntry(item, root, base, runner, { noGh: input.no_gh === true }));
    const pruned = [];
    const failures = [];
    const clearedPaths = [];
    const clearedIds = [];
    let services = null;
    try {
        services = kernel.readConventionConfig(root).worktree.services;
    }
    catch {
        services = null;
    }
    const compose = services
        ? { declared: services }
        : undefined;
    let composeUnavailable = false;
    if (input.prune === true) {
        for (const entry of entries.filter((candidate) => candidate.removable)) {
            if (compose !== undefined && entry.path !== "" && !composeUnavailable) {
                const project = kernel.worktreeComposeProject(compose.declared, (0, node_path_1.basename)(entry.path));
                try {
                    await nativeComposeDown(project, root);
                    pruned.push({ id: entry.id, action: `reaped compose project ${project}` });
                }
                catch (error) {
                    if (error?.code === "ENOENT") {
                        composeUnavailable = true;
                        compose.dockerUnavailable = true;
                    }
                    else {
                        const message = boundedNativeText(detail(error), MAX_NATIVE_DETAIL_CHARS);
                        failures.push(`${entry.id}: ${message}`);
                        pruned.push({ id: entry.id, action: "failed", error: message });
                    }
                }
            }
            try {
                if (entry.action?.startsWith("remove worktree")) {
                    const canonical = canonicalRoot(options, root);
                    kernel.unlinkNodeModulesLink(canonical, entry.path);
                    if ((0, node_path_1.resolve)(canonical) !== (0, node_path_1.resolve)(root)) {
                        kernel.unlinkNodeModulesLink(root, entry.path);
                    }
                    kernel.unlinkWorktreeEnv(entry.path);
                    const removal = await removeWorktreeObserved(options, entry.path, root, {
                        force: false,
                    });
                    if (!removal.removed) {
                        const message = boundedNativeText(removal.errors.join("; "), MAX_NATIVE_DETAIL_CHARS);
                        failures.push(`${entry.id}: ${message}`);
                        pruned.push({
                            id: entry.id,
                            action: "failed",
                            error: message,
                            leftoverPath: entry.path,
                            ...(entry.branch !== null ? { leftoverBranch: entry.branch } : {}),
                            ...(entry.via !== undefined ? { via: entry.via } : {}),
                        });
                        continue;
                    }
                    pruned.push({
                        id: entry.id,
                        action: `removed worktree ${entry.path}`,
                        ...(entry.via !== undefined ? { via: entry.via } : {}),
                    });
                }
                if (entry.branch !== null && git.branchExists(root, entry.branch)) {
                    try {
                        if (entry.via !== undefined)
                            git.deleteBranchForce(root, entry.branch);
                        else
                            git.deleteBranch(root, entry.branch);
                        pruned.push({
                            id: entry.id,
                            action: `deleted branch ${entry.branch}`,
                            ...(entry.via !== undefined ? { via: entry.via } : {}),
                        });
                    }
                    catch (error) {
                        const message = boundedNativeText(detail(error), MAX_NATIVE_DETAIL_CHARS);
                        failures.push(`${entry.id}: ${message}`);
                        pruned.push({
                            id: entry.id,
                            action: "failed",
                            error: message,
                            leftoverBranch: entry.branch,
                        });
                    }
                }
                const cleared = kernel.updateOperation({
                    cwd: root,
                    id: entry.id,
                    worktreePath: "",
                    commit: false,
                    agent: true,
                });
                if (!cleared.ok)
                    throw new Error(kernelError(cleared.envelope));
                pruned.push({ id: entry.id, action: "cleared worktree_path" });
                clearedPaths.push(byId.get(entry.id).filePath);
                clearedIds.push(entry.id);
            }
            catch (error) {
                const message = boundedNativeText(detail(error), MAX_NATIVE_DETAIL_CHARS);
                failures.push(`${entry.id}: ${message}`);
                pruned.push({ id: entry.id, action: "failed", error: message });
            }
        }
    }
    let commit;
    if (clearedPaths.length > 0) {
        commit = kernel.commitTrackerMutation(root, clearedPaths, {
            message: kernel.trackerCommitMessage("pruned", clearedIds),
            commit: kernel.resolveAutoCommit(input.no_commit === true ? false : undefined, kernel.readAutoCommitConfig(root)),
        });
    }
    return {
        ok: true,
        envelope: kernel.successEnvelope("cleanup", {
            base,
            candidates: entries,
            pruned,
            failures,
            ...(compose !== undefined ? { compose } : {}),
            ...(commit !== undefined ? { commit: kernel.commitPayload(commit) } : {}),
        }, version),
    };
}
function kernelError(envelope) {
    const error = envelope.error !== null && typeof envelope.error === "object"
        ? envelope.error
        : undefined;
    return asString(error?.message) ?? "unknown kernel failure";
}
const WORKTREE_TOOL_SPECS = [
    {
        name: "start",
        description: "Claim an item and create its worktree through the worktree domain, recording branch + worktree_path. Never steals a claim.",
        input: {
            type: "object",
            properties: {
                id: ID,
                assignee: { type: "string" },
                branch: { type: "string" },
                worktree: BOOLEAN,
                push: BOOLEAN,
            },
            required: ["id"],
            additionalProperties: false,
        },
        output: OBJECT,
        run: (kernel, input, options, tool) => guarded(kernel, "start", "START_FAILED", () => nativeStart(kernel, input, options, tool)),
    },
    {
        name: "branch",
        description: "Record the convention branch name (branch_patterns) on an item; the item worktree owns the git branch.",
        input: {
            type: "object",
            properties: { id: ID, branch: { type: "string" } },
            required: ["id"],
            additionalProperties: false,
        },
        output: OBJECT,
        run: (kernel, input, options) => guarded(kernel, "branch", "BRANCH_FAILED", async () => nativeBranch(kernel, input, options)),
    },
    {
        name: "cleanup",
        description: "List (prune: true removes) worktrees of done/cancelled items whose branches are merged; clears worktree_path.",
        input: {
            type: "object",
            properties: {
                prune: BOOLEAN,
                no_gh: {
                    type: "boolean",
                    description: "Ancestry-only (skip the squash-merged PR lookup).",
                },
                no_commit: BOOLEAN,
            },
            additionalProperties: false,
        },
        output: OBJECT,
        run: (kernel, input, options) => guarded(kernel, "cleanup", "CLEANUP_FAILED", () => nativeCleanup(kernel, input, options)),
    },
];
const ALL_TOOL_SPECS = [...TOOL_SPECS, ...WORKTREE_TOOL_SPECS];
function nativeToolSchemas() {
    return ALL_TOOL_SPECS.map((spec) => ({
        name: spec.name,
        description: spec.description,
        input: spec.input,
        output: spec.output,
        pinned: exports.PINNED_TOOL_NAMES.includes(spec.name),
    }));
}
function nativeToolsCatalogBytes() {
    return byteLength(JSON.stringify({
        namespace: { name: exports.ARGON_TOOL_NAMESPACE, description: exports.ARGON_TOOL_NAMESPACE_DESCRIPTION },
        tools: nativeToolSchemas(),
    }));
}
function argonToolDefinitions(kernel, options) {
    return ALL_TOOL_SPECS.map((spec) => ({
        name: spec.name,
        description: spec.description,
        input: spec.input,
        output: spec.output,
        execute: async (input, tool) => {
            const resolved = await resolveToolCwd(kernel, spec.name, options, tool);
            if ("error" in resolved)
                throw resolved.error;
            const callOptions = resolved.cwd === options.cwd ? options : { ...options, cwd: resolved.cwd };
            const outcome = await spec.run(kernel, input ?? {}, callOptions, tool);
            const envelope = outcome.envelope;
            if (!outcome.ok)
                throw new ArgonToolError(envelope);
            return { output: envelope };
        },
    }));
}
function pluginTemplatesDir(moduleUrl = import.meta.url) {
    return (0, node_path_1.resolve)((0, node_path_1.dirname)((0, node_url_1.fileURLToPath)(moduleUrl)), "..", "..", "..", "templates");
}
let kernelPromise;
let toolsRegistrationLogged = false;
function loadArgonKernel() {
    kernelPromise ??= Promise.resolve().then(() => __importStar(require("@arggondev/lib"))).then((module) => module, (error) => {
        logOnce("kernel-import", "@arggondev/lib unavailable (native tools idle)", error);
        return undefined;
    });
    return kernelPromise;
}
async function registerArgonTools(ctx, options) {
    const kernel = await loadArgonKernel();
    if (kernel === undefined)
        return 0;
    const transform = ctx?.tool?.transform;
    if (typeof transform !== "function")
        return 0;
    const definitions = argonToolDefinitions(kernel, options);
    await transform((editor) => {
        if (typeof editor.namespace !== "function" || typeof editor.add !== "function")
            return;
        try {
            editor.namespace({
                name: exports.ARGON_TOOL_NAMESPACE,
                description: exports.ARGON_TOOL_NAMESPACE_DESCRIPTION,
            });
        }
        catch (error) {
            logOnce("tools-namespace", "native namespace registration failed", error);
        }
        let added = 0;
        for (const definition of definitions) {
            try {
                editor.add({
                    ...definition,
                    options: {
                        namespace: exports.ARGON_TOOL_NAMESPACE,
                        codemode: true,
                        ...(exports.PINNED_TOOL_NAMES.includes(definition.name) ? { pinned: true } : {}),
                    },
                });
                added += 1;
            }
            catch (error) {
                logOnce("tools-add", `native tool registration failed (${definition.name})`, error);
            }
        }
        if (added > 0 && !toolsRegistrationLogged) {
            toolsRegistrationLogged = true;
            console.error(`[arggon] tools: registered ${added} native ${exports.ARGON_TOOL_NAMESPACE} tools ` +
                `(namespace="${exports.ARGON_TOOL_NAMESPACE}": ${exports.ARGON_TOOL_NAMESPACE_DESCRIPTION})`);
        }
    });
    return definitions.length;
}
const definition = {
    id: "arggon",
    async setup(ctx) {
        const disposers = [];
        try {
            const directory = locationDirectory(ctx);
            if (directory !== undefined) {
                await registerArgonTools(ctx, {
                    cwd: directory,
                    sessionDirectory: sessionDirectoryResolver(ctx),
                    templatesDir: pluginTemplatesDir(),
                    worktree: worktreeOptions(ctx),
                });
            }
        }
        catch (error) {
            logOnce("tools", "native tool registration unavailable", error);
        }
        try {
            const hook = ctx?.session?.hook;
            if (typeof hook === "function") {
                const registration = await hook("context", (event) => onContext(ctx, event));
                disposers.push(() => dispose(registration));
            }
        }
        catch (error) {
            logOnce("context-hook", "session context hook unavailable", error);
        }
        try {
            const hook = ctx?.tool?.hook;
            if (typeof hook === "function") {
                const registration = await hook("execute.after", (event) => onToolAfter(ctx, event));
                disposers.push(() => dispose(registration));
            }
        }
        catch (error) {
            logOnce("tool-hook", "tool execute hook unavailable", error);
        }
        return () => {
            for (const dispose of disposers) {
                try {
                    dispose();
                }
                catch (error) {
                    logOnce("dispose", "hook cleanup failed", error);
                }
            }
        };
    },
};
function dispose(registration) {
    const candidate = registration;
    if (candidate !== null && typeof candidate.dispose === "function") {
        void Promise.resolve(candidate.dispose.call(candidate)).catch(() => { });
    }
}
var board_js_1 = require("./board.js");
Object.defineProperty(exports, "ARGON_BOARD_PANEL", { enumerable: true, get: function () { return board_js_1.ARGON_BOARD_PANEL; } });
Object.defineProperty(exports, "BOARD_DETAIL_MAX_LINE_CHARS", { enumerable: true, get: function () { return board_js_1.BOARD_DETAIL_MAX_LINE_CHARS; } });
Object.defineProperty(exports, "BOARD_DETAIL_MAX_ROWS", { enumerable: true, get: function () { return board_js_1.BOARD_DETAIL_MAX_ROWS; } });
Object.defineProperty(exports, "BOARD_SELECTION_MARK", { enumerable: true, get: function () { return board_js_1.BOARD_SELECTION_MARK; } });
Object.defineProperty(exports, "BOARD_SELECTION_PAGE", { enumerable: true, get: function () { return board_js_1.BOARD_SELECTION_PAGE; } });
Object.defineProperty(exports, "BOARD_STATUS_MARKS", { enumerable: true, get: function () { return board_js_1.BOARD_STATUS_MARKS; } });
Object.defineProperty(exports, "BOARD_STATUS_ORDER", { enumerable: true, get: function () { return board_js_1.BOARD_STATUS_ORDER; } });
Object.defineProperty(exports, "BOARD_TYPE_BADGES", { enumerable: true, get: function () { return board_js_1.BOARD_TYPE_BADGES; } });
Object.defineProperty(exports, "activeBoardId", { enumerable: true, get: function () { return board_js_1.activeBoardId; } });
Object.defineProperty(exports, "boardCountsLine", { enumerable: true, get: function () { return board_js_1.boardCountsLine; } });
Object.defineProperty(exports, "boardDetailLines", { enumerable: true, get: function () { return board_js_1.boardDetailLines; } });
Object.defineProperty(exports, "boardHeaderLine", { enumerable: true, get: function () { return board_js_1.boardHeaderLine; } });
Object.defineProperty(exports, "boardItemDetail", { enumerable: true, get: function () { return board_js_1.boardItemDetail; } });
Object.defineProperty(exports, "boardItemLine", { enumerable: true, get: function () { return board_js_1.boardItemLine; } });
Object.defineProperty(exports, "boardRoot", { enumerable: true, get: function () { return board_js_1.boardRoot; } });
Object.defineProperty(exports, "boardSnapshot", { enumerable: true, get: function () { return board_js_1.boardSnapshot; } });
Object.defineProperty(exports, "boardTreeEntries", { enumerable: true, get: function () { return board_js_1.boardTreeEntries; } });
Object.defineProperty(exports, "boardTreeLines", { enumerable: true, get: function () { return board_js_1.boardTreeLines; } });
Object.defineProperty(exports, "clipBoardLine", { enumerable: true, get: function () { return board_js_1.clipBoardLine; } });
Object.defineProperty(exports, "countBoardStatuses", { enumerable: true, get: function () { return board_js_1.countBoardStatuses; } });
Object.defineProperty(exports, "emptyBoardSelection", { enumerable: true, get: function () { return board_js_1.emptyBoardSelection; } });
Object.defineProperty(exports, "emptyBoardSnapshot", { enumerable: true, get: function () { return board_js_1.emptyBoardSnapshot; } });
Object.defineProperty(exports, "moveBoardSelection", { enumerable: true, get: function () { return board_js_1.moveBoardSelection; } });
Object.defineProperty(exports, "resolveBoardSelection", { enumerable: true, get: function () { return board_js_1.resolveBoardSelection; } });
Object.defineProperty(exports, "selectBoardItem", { enumerable: true, get: function () { return board_js_1.selectBoardItem; } });
Object.defineProperty(exports, "sidebarStatusLine", { enumerable: true, get: function () { return board_js_1.sidebarStatusLine; } });
exports.default = definition;
})

const __arggonEntry = __arggonRequire("opencode/plugins/arggon/index.ts", undefined)
export default __arggonEntry.default
export const ARGON_BOARD_PANEL = __arggonEntry.ARGON_BOARD_PANEL
export const boardItemDetail = __arggonEntry.boardItemDetail
export const boardSnapshot = __arggonEntry.boardSnapshot
export const boardTreeLines = __arggonEntry.boardTreeLines
export const emptyBoardSelection = __arggonEntry.emptyBoardSelection
export const emptyBoardSnapshot = __arggonEntry.emptyBoardSnapshot
export const moveBoardSelection = __arggonEntry.moveBoardSelection
export const resolveBoardSelection = __arggonEntry.resolveBoardSelection
export const selectBoardItem = __arggonEntry.selectBoardItem
export const sidebarStatusLine = __arggonEntry.sidebarStatusLine
