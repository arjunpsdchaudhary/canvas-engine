import type { DashPattern, ShapeTypeDefinition } from "../types";
import { dashForPattern } from "../util/geometry";

export interface LineGeometry { points: number[] }
export interface LineStyle { stroke: string; strokeWidth: number; lineCap: "butt" | "round" | "square"; tension: number; closed: boolean; dashPattern: DashPattern }

function boundsOf(points: number[]) {
  const xs = points.filter((_, index) => index % 2 === 0);
  const ys = points.filter((_, index) => index % 2 === 1);
  const x = Math.min(...xs); const y = Math.min(...ys);
  return { x, y, width: Math.max(1, Math.max(...xs) - x), height: Math.max(1, Math.max(...ys) - y) };
}

export const lineType: ShapeTypeDefinition<LineGeometry, LineStyle> = {
  type: "line",
  label: "Line",
  minDimension: 1,
  defaultStyle: { stroke: "#17181c", strokeWidth: 5, lineCap: "round", tension: 0, closed: false, dashPattern: "solid" },
  createGeometry: (overrides = {}) => ({ points: [120, 180, 400, 180], ...overrides }),
  getBounds: (shape) => boundsOf((shape.geometry as LineGeometry).points),
  translate(shape, delta) {
    const g = shape.geometry as LineGeometry;
    return { points: g.points.map((value, index) => value + (index % 2 === 0 ? delta.x : delta.y)) };
  },
  setBounds(shape, bounds) {
    const g = shape.geometry as LineGeometry;
    const old = boundsOf(g.points);
    const points = g.points.map((value, index) => {
      if (index % 2 === 0) return bounds.x + (old.width ? (value - old.x) / old.width : 0) * bounds.width;
      return bounds.y + (old.height ? (value - old.y) / old.height : 0) * bounds.height;
    });
    return { points };
  },
  getProperties(shape) {
    const s = shape.style as LineStyle;
    return [
      { key: "stroke", label: "Color", type: "color", value: s.stroke },
      { key: "strokeWidth", label: "Weight", type: "number", value: s.strokeWidth, min: 1, max: 100, step: 1 },
      { key: "lineCap", label: "Line cap", type: "select", value: s.lineCap, options: [{ label: "Round", value: "round" }, { label: "Butt", value: "butt" }, { label: "Square", value: "square" }] },
      { key: "tension", label: "Curve", type: "number", value: s.tension, min: 0, max: 1, step: 0.05 },
      { key: "closed", label: "Closed path", type: "boolean", value: s.closed },
      { key: "dashPattern", label: "Stroke pattern", type: "select", value: s.dashPattern ?? "solid", options: [{ label: "Solid", value: "solid" }, { label: "Dashed", value: "dashed" }, { label: "Dotted", value: "dotted" }] },
    ];
  },
  updateProperty(shape, key, value) {
    const s = shape.style as LineStyle;
    if (key !== "dashPattern" && !(key in s)) throw new Error(`Unknown line property ${key}`);
    return { style: { ...s, [key]: value } };
  },
  describeRender(shape) {
    const g = shape.geometry as LineGeometry;
    const s = shape.style as LineStyle;
    const bounds = boundsOf(g.points);
    const points = g.points.map((value, index) => value - (index % 2 === 0 ? bounds.x : bounds.y));
    return [{ id: `${shape.id}:line`, kind: "line", x: bounds.x, y: bounds.y, points,
      rotation: shape.rotation, opacity: shape.opacity, stroke: s.stroke, strokeWidth: s.strokeWidth,
      lineCap: s.lineCap, tension: s.tension, closed: s.closed, dash: dashForPattern(s.dashPattern, s.strokeWidth) }];
  },
};
