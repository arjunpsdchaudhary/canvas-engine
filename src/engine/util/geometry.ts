import type { Bounds, DashPattern, Point } from "../types";

/** Human-friendly patterns become device-independent dash lengths for any primitive. */
export function dashForPattern(pattern: DashPattern | undefined, strokeWidth: number): number[] | undefined {
  const width = Math.max(1, strokeWidth);
  if (pattern === "dashed") return [Math.max(8, width * 3), Math.max(5, width * 2)];
  if (pattern === "dotted") return [Math.max(1, width), Math.max(4, width * 2)];
  return undefined;
}

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export const radiansToDegrees = (radians: number) => radians * 180 / Math.PI;
export const degreesToRadians = (degrees: number) => degrees * Math.PI / 180;
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export function normalizeBounds(bounds: Bounds): Bounds {
  return {
    x: bounds.width < 0 ? bounds.x + bounds.width : bounds.x,
    y: bounds.height < 0 ? bounds.y + bounds.height : bounds.y,
    width: Math.abs(bounds.width),
    height: Math.abs(bounds.height),
  };
}

export function unionBounds(bounds: Bounds[]): Bounds {
  if (!bounds.length) return { x: 0, y: 0, width: 0, height: 0 };
  const left = Math.min(...bounds.map((b) => b.x));
  const top = Math.min(...bounds.map((b) => b.y));
  const right = Math.max(...bounds.map((b) => b.x + b.width));
  const bottom = Math.max(...bounds.map((b) => b.y + b.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

export function boundsCenter(bounds: Bounds): Point {
  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
}

export function rotatePoint(point: Point, center: Point, radians: number): Point {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return { x: center.x + dx * cos - dy * sin, y: center.y + dx * sin + dy * cos };
}

/** Convert a transformed Konva rect (position, scale and offset) back to unrotated bounds. */
export function boundsFromTransform(input: { x: number; y: number; width: number; height: number; scaleX: number; scaleY: number; offsetX: number; offsetY: number }): Bounds {
  return {
    x: input.x - input.offsetX * input.scaleX,
    y: input.y - input.offsetY * input.scaleY,
    width: Math.max(1, input.width * input.scaleX),
    height: Math.max(1, input.height * input.scaleY),
  };
}

export function pointInBounds(point: Point, bounds: Bounds): boolean {
  const b = normalizeBounds(bounds);
  return point.x >= b.x && point.x <= b.x + b.width && point.y >= b.y && point.y <= b.y + b.height;
}
