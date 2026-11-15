import { assertDocumentInvariants, deepFreeze } from "./invariants";
import type { DocumentState } from "./types";

/** Owns the current immutable DocumentState. No other class may replace it. */
export class Store {
  private state: DocumentState;

  constructor(initialState: DocumentState) {
    assertDocumentInvariants(initialState);
    this.state = deepFreeze(initialState);
  }

  getState(): DocumentState { return this.state; }

  commit(nextState: DocumentState): DocumentState {
    assertDocumentInvariants(nextState);
    this.state = deepFreeze(nextState);
    return this.state;
  }
}
