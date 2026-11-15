import type { DocumentState } from "./types";

export class DocumentInvariantError extends Error {
  constructor(message: string) { super(message); this.name = "DocumentInvariantError"; }
}

export function assertDocumentInvariants(state: DocumentState): void {
  const ids = new Set(state.shapeOrder);
  if (ids.size !== state.shapeOrder.length) throw new DocumentInvariantError("shapeOrder contains duplicate ids");
  if (ids.size !== Object.keys(state.shapes).length) throw new DocumentInvariantError("shapeOrder and shapes are out of sync");
  for (const id of state.shapeOrder) {
    const shape = state.shapes[id];
    if (!shape) throw new DocumentInvariantError(`Missing shape ${id}`);
    if (shape.id !== id) throw new DocumentInvariantError(`Shape key mismatch for ${id}`);
    if (!state.layers[shape.layerId]) throw new DocumentInvariantError(`Shape ${id} references missing layer ${shape.layerId}`);
    if (!Number.isFinite(shape.rotation)) throw new DocumentInvariantError(`Shape ${id} has invalid rotation`);
    if (!Number.isFinite(shape.opacity) || shape.opacity < 0 || shape.opacity > 1) {
      throw new DocumentInvariantError(`Shape ${id} has opacity outside 0..1`);
    }
  }
  const orders = new Set<number>();
  for (const layer of Object.values(state.layers)) {
    if (orders.has(layer.order)) throw new DocumentInvariantError(`Duplicate layer order ${layer.order}`);
    orders.add(layer.order);
  }
  if (new Set(state.selection).size !== state.selection.length) throw new DocumentInvariantError("Selection contains duplicate ids");
  for (const id of state.selection) if (!state.shapes[id]) throw new DocumentInvariantError(`Selection references missing shape ${id}`);
  if (!Number.isFinite(state.viewport.x) || !Number.isFinite(state.viewport.y) || !(state.viewport.zoom > 0)) {
    throw new DocumentInvariantError("Invalid viewport");
  }
}

export function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== "object") return value;
  const object = value as object;
  if (seen.has(object)) return object as T;
  seen.add(object);
  for (const key of Reflect.ownKeys(object)) deepFreeze((object as Record<PropertyKey, unknown>)[key], seen);
  return Object.freeze(value);
}

export function cloneValue<T>(value: T): T {
  if (Array.isArray(value)) return value.map((entry) => cloneValue(entry)) as T;
  if (value !== null && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) output[key] = cloneValue(entry);
    return output as T;
  }
  return value;
}
