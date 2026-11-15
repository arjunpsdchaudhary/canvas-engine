import type { DashPattern, ShapeTypeDefinition } from "../types";
import { dashForPattern } from "../util/geometry";

/** A regular star. `points` and `innerRatio` provide many star silhouettes with one definition. */
export interface StarGeometry { cx: number; cy: number; outerRadius: number; innerRatio: number; points: number }
export interface StarStyle { fill: string; stroke: string; strokeWidth: number; dashPattern: DashPattern }

export const starType: ShapeTypeDefinition<StarGeometry, StarStyle> = {
  type: "star", label: "Star", keepAspectRatio: true,
  defaultStyle: { fill: "#f4ca52", stroke: "transparent", strokeWidth: 0, dashPattern: "solid" },
  createGeometry: (overrides = {}) => ({ cx: 250, cy: 220, outerRadius: 110, innerRatio: 0.45, points: 5, ...overrides }),
  getBounds(shape) {
    const g = shape.geometry as StarGeometry;
    return { x: g.cx - g.outerRadius, y: g.cy - g.outerRadius, width: g.outerRadius * 2, height: g.outerRadius * 2 };
  },
  getTransformOrigin(shape) {
    const g = shape.geometry as StarGeometry;
    return { x: g.cx, y: g.cy };
  },
  translate(shape, delta) {
    const g = shape.geometry as StarGeometry;
    return { ...g, cx: g.cx + delta.x, cy: g.cy + delta.y };
  },
  setBounds(shape, bounds) {
    const g = shape.geometry as StarGeometry;
    return { ...g, cx: bounds.x + bounds.width / 2, cy: bounds.y + bounds.height / 2, outerRadius: Math.max(2, Math.min(bounds.width, bounds.height) / 2) };
  },
  getProperties(shape) {
    const g = shape.geometry as StarGeometry;
    const s = shape.style as StarStyle;
    return [
      { key: "fill", label: "Fill", type: "color", value: s.fill },
      { key: "stroke", label: "Stroke", type: "color", value: s.stroke },
      { key: "strokeWidth", label: "Stroke width", type: "number", value: s.strokeWidth, min: 0, max: 80 },
      { key: "dashPattern", label: "Border pattern", type: "select", value: s.dashPattern ?? "solid", options: [{ label: "Solid", value: "solid" }, { label: "Dashed", value: "dashed" }, { label: "Dotted", value: "dotted" }] },
      { key: "points", label: "Star points", type: "number", value: g.points, min: 3, max: 16, step: 1 },
      { key: "innerRatio", label: "Inner radius", type: "number", value: g.innerRatio, min: 0.1, max: 0.9, step: 0.05 },
    ];
  },
  updateProperty(shape, key, value) {
    const g = shape.geometry as StarGeometry;
    const s = shape.style as StarStyle;
    if (key === "points") return { geometry: { ...g, points: Math.round(Math.min(16, Math.max(3, Number(value)))) } };
    if (key === "innerRatio") return { geometry: { ...g, innerRatio: Math.min(0.9, Math.max(0.1, Number(value))) } };
    if (key !== "dashPattern" && !(key in s)) throw new Error(`Unknown star property ${key}`);
    return { style: { ...s, [key]: value } };
  },
  describeRender(shape) {
    const g = shape.geometry as StarGeometry;
    const s = shape.style as StarStyle;
    return [{ id: `${shape.id}:star`, kind: "star", x: g.cx, y: g.cy, numPoints: g.points,
      innerRadius: g.outerRadius * g.innerRatio, outerRadius: g.outerRadius,
      rotation: shape.rotation, opacity: shape.opacity, fill: s.fill, stroke: s.stroke, strokeWidth: s.strokeWidth, dash: dashForPattern(s.dashPattern, s.strokeWidth) }];
  },
};
