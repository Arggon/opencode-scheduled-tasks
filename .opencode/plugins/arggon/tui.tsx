// arggon:generated template="opencode/plugins/arggon/tui.tsx"
/**
 * ArggonManager TUI plugin (W5, `task-native-tui`) — the board/status surface.
 *
 * OpenCode V2 discovers the TUI entry beside the server entry in the same
 * plugin directory (`.opencode/plugins/arggon/tui.tsx` next to `index.ts`,
 * docs/playbooks/opencode.md). `arggon init` vendors this file verbatim (it is
 * NOT bundled): the runtime transpiles it and resolves `solid-js` itself, while
 * the board data comes from the vendored bundle through a relative import
 * (`./index.ts`), so the adopter tree still needs no `node_modules`.
 *
 * Registered surfaces (all feature-detected, failure-isolated — a missing
 * surface logs once and no-ops, exactly like the server plugin):
 *
 * - `session.panel` contribution `arggon.board`: the tree (epic/story/leaf),
 *   per-item status, the session's active item and the kernel `next`
 *   suggestion, with a navigable selection cursor (`j`/`k`, `PgUp`/`PgDn`,
 *   `g`/`G`), `Enter` toggling a bounded inline detail block (body +
 *   acceptance rows, read through the kernel's `runShow`), `n`/`a` jumping to
 *   the kernel `next` suggestion and the session's active item, `r` reloading
 *   (the selection survives when the item still exists), `f` full-screen and
 *   `esc` closing the detail block first and the panel second. Opened by the
 *   `arggon.board.open` command (slash `/arggon-board`, palette, `ctrl+g`).
 * - `sidebar.content` contribution: one status line (active item, or the ready
 *   count) so the item status is visible without opening the panel.
 * - `app` slot: hosts the global keymap layer (the documented home for plugin
 *   commands — `context.keymap.layer` requires a rendered provider).
 *
 * Display only: every read goes through `board.ts` → the kernel; nothing here
 * writes to the tracker.
 */
import { Show, createSignal } from "solid-js";
import {
  ARGON_BOARD_PANEL,
  boardItemDetail,
  boardSnapshot,
  boardTreeLines,
  emptyBoardSelection,
  emptyBoardSnapshot,
  moveBoardSelection,
  resolveBoardSelection,
  selectBoardItem,
  sidebarStatusLine,
  type BoardItemDetail,
  type BoardSelection,
  type BoardSelectionMove,
  type BoardSnapshot,
} from "./index.ts";

/** Slash-command name and command id (stable contract, tested). */
export const ARGON_BOARD_COMMAND = "arggon.board.open";
export const ARGON_BOARD_SLASH = "arggon-board";
export const ARGON_BOARD_BIND = "ctrl+g";

/** Panel props the host passes to a `session.panel` contribution. */
export type ArgonTuiPanel = {
  name?: unknown;
  sessionID?: unknown;
  width?: unknown;
  presentation?: unknown;
  focused?: unknown;
  close?(): unknown;
  toggleFullscreen?(): unknown;
  focus?(): unknown;
};

/** Minimal structural typing: the vendored file imports no plugin types. */
export type ArgonTuiSlot = {
  append?: string;
  prepend?: string;
  before?: string;
  after?: string;
  replace?: string;
  render(props?: unknown): unknown;
};

export type ArgonTuiContext = {
  location?: { directory?: unknown };
  ui?: {
    slot?(input: ArgonTuiSlot): unknown;
    panel?: { open?(name: string, options?: unknown): unknown };
    toast?: { show?(input: { message?: string; title?: string; variant?: string }): unknown };
  };
  keymap?: { layer?(factory: () => unknown): unknown };
  data?: {
    location?: {
      vcs?: {
        info?(location?: unknown): { branch?: { current?: unknown } } | undefined | null;
      };
    };
  };
};

export type ArgonTuiOptions = {
  /** Project directory to read the tracker from (defaults to the location). */
  cwd?: string;
  /** `ARGON_ITEM` override (defaults to `process.env.ARGON_ITEM`). */
  envItem?: string | null;
};

/**
 * Failure-isolation log dedupe: a repeated failure logs once per process and
 * no-ops (the server plugin's contract, applied to the TUI surfaces).
 */
const loggedScopes = new Set<string>();

function detail(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function logTui(scope: string, message: string, error?: unknown): void {
  if (loggedScopes.has(scope)) return;
  loggedScopes.add(scope);
  const suffix = error === undefined ? "" : ` (${detail(error)})`;
  console.error(`[arggon] tui ${scope}: ${message}${suffix}`);
}

/** Options for the panel controller (the host wiring is injected, not read). */
export type BoardControllerOptions = {
  /** Project directory the tracker is read from. */
  cwd: string;
  /** Panel width reader (0 = unknown: no clipping). */
  width?: () => number;
  /** Snapshot reader; the panel passes its failure-isolated reader. */
  readSnapshot: () => BoardSnapshot;
  /** Detail row budget override (tests). */
  detailRows?: number;
  /** Host panel close action (`esc` with no detail block open). */
  close?: () => void;
  /** Toast channel for a jump with no target. */
  toast?: (message: string) => void;
};

/** Panel state + actions, testable without the host JSX runtime. */
export type BoardController = {
  /** Panel lines for the current state (header, counts, tree, detail). */
  lines(): string[];
  selection(): BoardSelection;
  detail(): BoardItemDetail | null;
  move(direction: BoardSelectionMove): void;
  /** Select the id; toasts `no <label>` when it is absent from the tree. */
  jump(id: string | null, label: string): void;
  /** Jump to the kernel `next` suggestion (toasts when the pool is empty). */
  jumpNext(): void;
  /** Jump to the session's active item (toasts when none resolves). */
  jumpActive(): void;
  /** Toggle the inline detail block for the selected item. */
  toggleDetail(): void;
  /** Re-read the tracker, keeping the selection when the item still exists. */
  reload(): void;
  /** `esc`: close the detail block first, then the panel. */
  escape(): void;
};

/**
 * The panel's selection/detail state machine over a `BoardSnapshot`. Every
 * read goes through `board.ts` (nothing here writes); the returned `lines()`
 * is the plain-text body the component renders. Kept exported so the keymap
 * wiring is tested against the real state machine without the host runtime.
 */
export function createBoardController(options: BoardControllerOptions): BoardController {
  const [snapshot, setSnapshot] = createSignal<BoardSnapshot>(options.readSnapshot());
  const [selection, setSelection] = createSignal<BoardSelection>(emptyBoardSelection());
  const [detail, setDetail] = createSignal<BoardItemDetail | null>(null);
  // Seed the cursor on the first line; the same id-first resolution `r` uses,
  // so mount and reload cannot drift.
  setSelection(resolveBoardSelection(snapshot(), emptyBoardSelection()));

  const move = (direction: BoardSelectionMove): void => {
    setSelection(moveBoardSelection(snapshot(), selection(), direction));
    // The block belongs to one line: moving away returns to the tree.
    setDetail(null);
  };

  const jump = (id: string | null, label: string): void => {
    const target = selectBoardItem(snapshot(), id);
    if (target === null) {
      options.toast?.(`arggon board: no ${label}`);
      return;
    }
    setSelection(target);
    setDetail(null);
  };

  const jumpNext = (): void => jump(snapshot().nextId, "next suggestion");
  const jumpActive = (): void => jump(snapshot().activeId, "active item");

  const toggleDetail = (): void => {
    const selected = selection().id;
    if (selected === null) return;
    if (detail()?.id === selected) {
      setDetail(null);
      return;
    }
    setDetail(
      options.detailRows === undefined
        ? boardItemDetail(options.cwd, selected)
        : boardItemDetail(options.cwd, selected, { rows: options.detailRows }),
    );
  };

  const reload = (): void => {
    setSnapshot(options.readSnapshot());
    setSelection(resolveBoardSelection(snapshot(), selection()));
    setDetail(null);
  };

  const escape = (): void => {
    if (detail() !== null) {
      setDetail(null);
      return;
    }
    options.close?.();
  };

  return {
    lines: () =>
      boardTreeLines(snapshot(), {
        width: options.width?.() ?? 0,
        selection: selection(),
        detail: detail(),
      }),
    selection,
    detail,
    move,
    jump,
    jumpNext,
    jumpActive,
    toggleDetail,
    reload,
    escape,
  };
}

/**
 * Register the board/status surface on a TUI context. Returns a disposer that
 * unregisters every slot contribution (the `setup` cleanup contract). Pure
 * wiring: the components read the tracker through `boardSnapshot` on mount.
 */
export function registerArgonTui(
  context: ArgonTuiContext,
  options: ArgonTuiOptions = {},
): () => void {
  const disposers: Array<() => void> = [];
  let commandLayerRegistered = false;
  const cwd = (): string =>
    options.cwd ??
    (typeof context.location?.directory === "string" ? context.location.directory : process.cwd());

  const readBranch = (): string | null => {
    try {
      const vcs = context.data?.location?.vcs;
      const info = vcs?.info?.(context.location);
      const current = info?.branch?.current;
      return typeof current === "string" ? current : null;
    } catch {
      return null;
    }
  };

  /**
   * Read the snapshot for one render. `boardSnapshot` is contractually total
   * (no tracker and corrupt tracker both degrade to an error snapshot); this
   * per-surface guard is the belt-and-braces: a slot crash would otherwise take
   * the whole panel down with a host overlay (W5 review P1).
   */
  const readSnapshot = (): BoardSnapshot => {
    try {
      return boardSnapshot(cwd(), {
        branch: readBranch(),
        // An explicit `null` disables the env override (tests / embedders).
        envItem: options.envItem === undefined ? (process.env.ARGON_ITEM ?? null) : options.envItem,
      });
    } catch (error) {
      logTui("snapshot", "board read failed", error);
      return emptyBoardSnapshot("board read failed");
    }
  };

  const toast = (message: string): void => {
    try {
      context.ui?.toast?.show?.({ message, variant: "warning" });
    } catch (error) {
      logTui("toast", "toast failed", error);
    }
  };

  /** Open the board panel; `false` means "no active session" (host contract). */
  const openBoard = (): void => {
    const open = context.ui?.panel?.open;
    if (typeof open !== "function") {
      toast("arggon board: this OpenCode build has no session panels");
      return;
    }
    try {
      if (open(ARGON_BOARD_PANEL) === false) toast("arggon board: open a session first");
    } catch (error) {
      logTui("panel", "panel.open failed", error);
    }
  };

  /**
   * Panel body: cursor navigation, `enter` detail, `n`/`a` jumps, `r` reload,
   * `f` full-screen, `esc` detail-first. The binds are the documented OpenCode
   * key names (docs/playbooks/opencode.md § TUI); a plain letter bound in a
   * panel layer is active only while the panel owns input.
   */
  const BoardPanel = (props: { panel: ArgonTuiPanel }) => {
    const width = (): number => (typeof props.panel?.width === "number" ? props.panel.width : 0);
    const board = createBoardController({
      cwd: cwd(),
      width,
      readSnapshot,
      close: () => props.panel?.close?.(),
      toast,
    });
    try {
      context.keymap?.layer?.(() => ({
        commands: [
          { id: "arggon.board.down", bind: "j", run: () => board.move("down") },
          { id: "arggon.board.down.arrow", bind: "down", run: () => board.move("down") },
          { id: "arggon.board.up", bind: "k", run: () => board.move("up") },
          { id: "arggon.board.up.arrow", bind: "up", run: () => board.move("up") },
          { id: "arggon.board.page-down", bind: "pagedown", run: () => board.move("page-down") },
          { id: "arggon.board.page-up", bind: "pageup", run: () => board.move("page-up") },
          { id: "arggon.board.first", bind: "g", run: () => board.move("first") },
          { id: "arggon.board.first.home", bind: "home", run: () => board.move("first") },
          { id: "arggon.board.last", bind: "shift+g", run: () => board.move("last") },
          { id: "arggon.board.last.end", bind: "end", run: () => board.move("last") },
          { id: "arggon.board.detail", bind: "return", run: () => board.toggleDetail() },
          { id: "arggon.board.next", bind: "n", run: () => board.jumpNext() },
          { id: "arggon.board.active", bind: "a", run: () => board.jumpActive() },
          {
            id: "arggon.board.fullscreen",
            bind: "f",
            run: () => props.panel?.toggleFullscreen?.(),
          },
          { id: "arggon.board.reload", bind: "r", run: () => board.reload() },
          { id: "arggon.board.close", bind: "escape", run: () => board.escape() },
        ],
      }));
    } catch (error) {
      logTui("panel-keymap", "panel key layer unavailable", error);
    }
    return (
      <box flexDirection="column">
        {() => board.lines().map((line) => <text>{line}</text>)}
      </box>
    );
  };

  /** Sidebar contribution: active item status (or the ready count). */
  const SidebarStatus = () => {
    const [snapshot] = createSignal<BoardSnapshot>(readSnapshot());
    return <text>{sidebarStatusLine(snapshot())}</text>;
  };

  /** Global commands live in a rendered provider (the `app` slot). */
  const registerCommands = (): null => {
    if (commandLayerRegistered) return null;
    commandLayerRegistered = true;
    try {
      context.keymap?.layer?.(() => ({
        mode: "global",
        priority: 10,
        commands: [
          {
            id: ARGON_BOARD_COMMAND,
            title: "Open Arggon board",
            group: "Arggon",
            bind: ARGON_BOARD_BIND,
            palette: true,
            suggested: true,
            slash: { name: ARGON_BOARD_SLASH },
            run: () => openBoard(),
          },
        ],
        bindings: [ARGON_BOARD_COMMAND],
      }));
    } catch (error) {
      logTui("commands", "keymap layer unavailable", error);
    }
    return null;
  };

  const slot = (input: ArgonTuiSlot): void => {
    try {
      const unregister = context.ui?.slot?.(input);
      if (typeof unregister === "function") disposers.push(unregister as () => void);
    } catch (error) {
      logTui("slot", `slot registration failed (${input.append ?? input.replace ?? "?"})`, error);
    }
  };

  slot({
    append: "session.panel",
    render: (props?: unknown) => {
      const panel = (props ?? {}) as ArgonTuiPanel;
      return (
        <Show when={panel.name === ARGON_BOARD_PANEL}>
          <BoardPanel panel={panel} />
        </Show>
      );
    },
  });
  slot({ append: "sidebar.content", render: () => <SidebarStatus /> });
  slot({ append: "app", render: () => registerCommands() });

  logTui(
    "board",
    `panel registered (/${ARGON_BOARD_SLASH}, palette, ${ARGON_BOARD_BIND}) — session.panel + sidebar.content`,
  );

  return () => {
    for (const dispose of disposers) {
      try {
        dispose();
      } catch (error) {
        logTui("dispose", "slot cleanup failed", error);
      }
    }
  };
}

/**
 * Plain V2 TUI plugin definition. Like the server plugin, `Plugin.define` from
 * `@opencode/plugin/tui` is deliberately NOT imported: a discovered plugin
 * resolves `@opencode/plugin/tui` at runtime (probe on 2.0.12), but the plain
 * `{ id, setup }` object is the same definition with no resolution risk in a
 * dependency-less adopter tree — and the closures above need no `usePlugin`.
 */
export default {
  id: "arggon.tui",
  setup(context: ArgonTuiContext): () => void {
    try {
      return registerArgonTui(context);
    } catch (error) {
      logTui("setup", "board panel registration unavailable", error);
      return () => {};
    }
  },
};
