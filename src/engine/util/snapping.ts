import type { Bounds, Point } from "../types";

export interface SnapGuide {
  axis: "x" | "y";
  position: number;
  start: number;
  end: number;
}

export interface SnapDeltaResult {
  delta: Point;
  guides: SnapGuide[];
  snappedX: boolean;
  snappedY: boolean;
}

export interface SnapOptions {
  threshold?: number;
  enabled?: boolean;
  showCenters?: boolean;
}

const near = (a: number, b: number) => Math.abs(a - b) < 1e-8;

/** Snap edges and centers independently on each axis; the nearest candidate wins. */
export function snapDelta(moving: Bounds, delta: Point, targets: Bounds[], options: SnapOptions = {}): SnapDeltaResult {
  const threshold = options.threshold ?? 6;
  if (options.enabled === false) return { delta, guides: [], snappedX: false, snappedY: false };
  const proposed = { ...moving, x: moving.x + delta.x, y: moving.y + delta.y };
  const candidates = (axis: "x" | "y") => {
    const size = axis === "x" ? "width" : "height";
    const origin = axis === "x" ? "x" : "y";
    const self = [proposed[origin], proposed[origin] + proposed[size] / 2, proposed[origin] + proposed[size]]
      .filter((_, index) => options.showCenters !== false || index !== 1);
    let best: { distance: number; adjustment: number; position: number } | null = null;
    for (const target of targets) {
      const targetValues = [target[origin], target[origin] + target[size] / 2, target[origin] + target[size]]
        .filter((_, index) => options.showCenters !== false || index !== 1);
      self.forEach((value) => targetValues.forEach((targetValue) => {
        const adjustment = targetValue - value;
        const distance = Math.abs(adjustment);
        if (distance <= threshold && (!best || distance < best.distance)) {
          best = { distance, adjustment, position: targetValue };
        }
      }));
    }
    return best;
  };
  const x = candidates("x") as { distance: number; adjustment: number; position: number } | null;
  const y = candidates("y") as { distance: number; adjustment: number; position: number } | null;
  const resultDelta = { x: delta.x + (x?.adjustment ?? 0), y: delta.y + (y?.adjustment ?? 0) };
  const finalBounds = { ...moving, x: moving.x + resultDelta.x, y: moving.y + resultDelta.y };
  const guides: SnapGuide[] = [];
  if (x) {
    const relevant = targets.filter((target) => near(target.x, x.position) || near(target.x + target.width / 2, x.position) || near(target.x + target.width, x.position));
    const all = [finalBounds, ...relevant];
    guides.push({ axis: "x", position: x.position, start: Math.min(...all.map((b) => b.y)), end: Math.max(...all.map((b) => b.y + b.height)) });
  }
  if (y) {
    const relevant = targets.filter((target) => near(target.y, y.position) || near(target.y + target.height / 2, y.position) || near(target.y + target.height, y.position));
    const all = [finalBounds, ...relevant];
    guides.push({ axis: "y", position: y.position, start: Math.min(...all.map((b) => b.x)), end: Math.max(...all.map((b) => b.x + b.width)) });
  }
  return { delta: resultDelta, guides, snappedX: Boolean(x), snappedY: Boolean(y) };
}

export function snapValue(value: number, candidates: number[], threshold = 6): number {
  let result = value;
  let best = threshold;
  for (const candidate of candidates) {
    const distance = Math.abs(candidate - value);
    if (distance <= best) { result = candidate; best = distance; }
  }
  return result;
}

export function snapToGrid(point: Point, gridSize: number, enabled = true): Point {
  if (!enabled || gridSize <= 0) return point;
  return { x: Math.round(point.x / gridSize) * gridSize, y: Math.round(point.y / gridSize) * gridSize };
}
