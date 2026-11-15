import type { DocumentState } from "./types";
import { Store } from "./store";

export interface Command {
  readonly label: string;
  readonly undoable: boolean;
  execute(state: DocumentState): DocumentState;
  revert(state: DocumentState): DocumentState;
}

function preserveViewState(target: DocumentState, current: DocumentState): DocumentState {
  const available = new Set(Object.keys(target.shapes));
  const selection = current.selection.filter((id) => available.has(id));
  return { ...target, selection, viewport: current.viewport };
}

/** Captures before/after state while ensuring view state is never restored by history. */
export function createStateCommand(
  label: string,
  mutate: (state: DocumentState) => DocumentState,
  undoable = true,
): Command {
  let before: DocumentState | undefined;
  let after: DocumentState | undefined;
  return {
    label,
    undoable,
    execute(state) {
      if (!before) {
        before = state;
        after = mutate(state);
        return after;
      }
      return preserveViewState(after!, state);
    },
    revert(state) {
      if (!before) throw new Error(`Command "${label}" has not executed`);
      return preserveViewState(before, state);
    },
  };
}

interface HistoryEntry { label: string; commands: Command[] }

export class CommandManager {
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];
  private active: HistoryEntry | null = null;

  constructor(private readonly store: Store, private readonly historyLimit = 100) {}

  execute(command: Command): void {
    const next = command.execute(this.store.getState());
    this.store.commit(next);
    if (!command.undoable) return;
    this.redoStack = [];
    if (this.active) this.active.commands.push(command);
    else this.push({ label: command.label, commands: [command] });
  }

  transaction<T>(label: string, work: () => T): T {
    if (this.active) return work();
    const checkpoint = this.store.getState();
    const redoCheckpoint = this.redoStack;
    this.active = { label, commands: [] };
    try {
      const result = work();
      const entry = this.active;
      this.active = null;
      if (entry.commands.length) this.push(entry);
      return result;
    } catch (error) {
      this.active = null;
      this.redoStack = redoCheckpoint;
      this.store.commit(checkpoint);
      throw error;
    }
  }

  private push(entry: HistoryEntry): void {
    this.undoStack.push(entry);
    if (this.undoStack.length > this.historyLimit) this.undoStack.shift();
  }

  undo(): boolean {
    if (this.active) throw new Error("Cannot undo inside a transaction");
    const entry = this.undoStack.pop();
    if (!entry) return false;
    let state = this.store.getState();
    for (const command of [...entry.commands].reverse()) state = command.revert(state);
    this.store.commit(state);
    this.redoStack.push(entry);
    return true;
  }

  redo(): boolean {
    if (this.active) throw new Error("Cannot redo inside a transaction");
    const entry = this.redoStack.pop();
    if (!entry) return false;
    let state = this.store.getState();
    for (const command of entry.commands) state = command.execute(state);
    this.store.commit(state);
    this.push(entry);
    return true;
  }

  clearHistory(): void { this.undoStack = []; this.redoStack = []; }

  get canUndo(): boolean { return this.undoStack.length > 0; }
  get canRedo(): boolean { return this.redoStack.length > 0; }
  get undoLabel(): string | undefined { return this.undoStack.at(-1)?.label; }
  get redoLabel(): string | undefined { return this.redoStack.at(-1)?.label; }
  get historyLabels(): readonly string[] { return this.undoStack.map((entry) => entry.label); }
}
