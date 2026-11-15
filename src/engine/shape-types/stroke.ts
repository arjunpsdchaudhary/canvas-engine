import type { DashPattern, ShapeTypeDefinition } from "../types";
import { dashForPattern } from "../util/geometry";

/** Freehand brush, pen and eraser data. Erasing is a durable destination-out stroke, so undo/export work. */
export interface StrokeGeometry { points: number[] }
export interface StrokeStyle {
  stroke: string;
  strokeWidth: number;
  lineCap: "butt" | "round" | "square";
  lineJoin: "round" | "miter" | "bevel";
  tension: number;
  composite: "source-over" | "destination-out";
  dashPattern: DashPattern;
}

function strokeBounds(points: number[]) {
  const xs = points.filter((_, index) => index % 2 === 0);
  const ys = points.filter((_, index) => index % 2 === 1);
  const x = Math.min(...xs); const y = Math.min(...ys);
  return { x, y, width: Math.max(1, Math.max(...xs) - x), height: Math.max(1, Math.max(...ys) - y) };
}

export const strokeType: ShapeTypeDefinition<StrokeGeometry, StrokeStyle> = {
  type: "stroke", label: "Freehand stroke", minDimension: 1,
  defaultStyle: { stroke: "#17181c", strokeWidth: 12, lineCap: "round", lineJoin: "round", tension: 0.4, composite: "source-over", dashPattern: "solid" },
  createGeometry: (overrides = {}) => ({ points: [100, 100, 240, 180, 380, 120], ...overrides }),
  getBounds: (shape) => strokeBounds((shape.geometry as StrokeGeometry).points),
  translate(shape, delta) {
    const g = shape.geometry as StrokeGeometry;
    return { points: g.points.map((value, index) => value + (index % 2 === 0 ? delta.x : delta.y)) };
  },
  setBounds(shape, bounds) {
    const g = shape.geometry as StrokeGeometry;
    const old = strokeBounds(g.points);
    return { points: g.points.map((value, index) => index % 2 === 0
      ? bounds.x + (old.width ? (value - old.x) / old.width : 0) * bounds.width
      : bounds.y + (old.height ? (value - old.y) / old.height : 0) * bounds.height) };
  },
  getProperties(shape) {
    const s = shape.style as StrokeStyle;
    const fields = [
      { key: "strokeWidth", label: "Stroke width", type: "number" as const, value: s.strokeWidth, min: 1, max: 160, step: 1 },
    ];
    if (s.composite === "destination-out") return fields;
    return [
      { key: "stroke", label: "Ink color", type: "color" as const, value: s.stroke },
      ...fields,
      { key: "dashPattern", label: "Stroke pattern", type: "select" as const, value: s.dashPattern ?? "solid", options: [{ label: "Solid", value: "solid" }, { label: "Dashed", value: "dashed" }, { label: "Dotted", value: "dotted" }] },
      { key: "tension", label: "Smoothing", type: "number" as const, value: s.tension, min: 0, max: 0.8, step: 0.05 },
      { key: "lineCap", label: "Line cap", type: "select" as const, value: s.lineCap, options: [{ label: "Round", value: "round" }, { label: "Butt", value: "butt" }, { label: "Square", value: "square" }] },
    ];
  },
  updateProperty(shape, key, value) {
    const s = shape.style as StrokeStyle;
    if ((key !== "dashPattern" && !(key in s)) || key === "composite") throw new Error(`Unknown stroke property ${key}`);
    return { style: { ...s, [key]: value } };
  },
  describeRender(shape) {
    const g = shape.geometry as StrokeGeometry;
    const s = shape.style as StrokeStyle;
    const bounds = strokeBounds(g.points);
    return [{ id: `${shape.id}:stroke`, kind: "stroke", x: bounds.x, y: bounds.y,
      points: g.points.map((value, index) => value - (index % 2 === 0 ? bounds.x : bounds.y)),
      rotation: shape.rotation, opacity: shape.opacity, stroke: s.stroke, strokeWidth: s.strokeWidth,
      lineCap: s.lineCap, lineJoin: s.lineJoin, tension: s.tension, composite: s.composite, dash: dashForPattern(s.dashPattern, s.strokeWidth) }];
  },
};
