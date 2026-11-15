import type { DocumentState, Layer, Shape } from "./types";

export function orderedLayers(state: DocumentState): Layer[] {
  return Object.values(state.layers).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

/** Stable z-order: layer order first, then the insertion-order array within each layer. */
export function orderedShapes(state: DocumentState): Shape[] {
  const rank = new Map(orderedLayers(state).map((layer, index) => [layer.id, index]));
  return state.shapeOrder
    .map((id) => state.shapes[id])
    .filter(Boolean)
    .sort((a, b) => (rank.get(a.layerId) ?? 0) - (rank.get(b.layerId) ?? 0));
}

export function nextLayerOrder(state: DocumentState): number {
  const orders = Object.values(state.layers).map((layer) => layer.order);
  return orders.length ? Math.max(...orders) + 1 : 0;
}

export function defaultLayer(state: DocumentState): Layer {
  const layer = orderedLayers(state).at(-1);
  if (!layer) throw new Error("The document has no layers");
  return layer;
}
