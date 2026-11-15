import type { Bounds, DocumentState, ShapeId } from "./types";
import type { ShapeTypeRegistry } from "./shape-types";
import { orderedShapes } from "./layers";
import { unionBounds } from "./util/geometry";
import { snapDelta, type SnapDeltaResult, type SnapOptions } from "./util/snapping";
import type { Point } from "./types";

/** Pure engine-level snapping facade shared by pointer tools and AI layout tools. */
export function getShapeBounds(state: DocumentState, registry: ShapeTypeRegistry, ids: ShapeId[]): Bounds[] {
  return ids.map((id) => state.shapes[id]).filter(Boolean).map((shape) => registry.get(shape.type).getBounds(shape));
}

export function snapShapes(
  state: DocumentState,
  registry: ShapeTypeRegistry,
  ids: ShapeId[],
  delta: Point,
  options: SnapOptions = {},
): SnapDeltaResult {
  const moving = getShapeBounds(state, registry, ids);
  if (!moving.length) return { delta, guides: [], snappedX: false, snappedY: false };
  const excluded = new Set(ids);
  const targets = orderedShapes(state)
    .filter((shape) => !excluded.has(shape.id) && state.layers[shape.layerId]?.visible)
    .map((shape) => registry.get(shape.type).getBounds(shape));
  const threshold = (options.threshold ?? 6) / state.viewport.zoom;
  return snapDelta(unionBounds(moving), delta, targets, { ...options, threshold });
}
