import type { DashPattern, ShapeTypeDefinition } from "../types";
import { dashForPattern, normalizeBounds } from "../util/geometry";

export interface RectGeometry { x: number; y: number; width: number; height: number }
export interface RectStyle { fill: string; stroke: string; strokeWidth: number; cornerRadius: number; dashPattern: DashPattern }

export const rectType: ShapeTypeDefinition<RectGeometry, RectStyle> = {
  type: "rect",
  label: "Rectangle",
  defaultStyle: { fill: "#7c5cff", stroke: "transparent", strokeWidth: 0, cornerRadius: 0, dashPattern: "solid" },
  createGeometry: (overrides = {}) => ({ x: 120, y: 120, width: 240, height: 160, ...overrides }),
  getBounds: (shape) => normalizeBounds(shape.geometry as RectGeometry),
  translate(shape, delta) {
    const g = shape.geometry as RectGeometry;
    return { ...g, x: g.x + delta.x, y: g.y + delta.y };
  },
  setBounds: (_shape, bounds) => normalizeBounds(bounds),
  getProperties(shape) {
    const s = shape.style as RectStyle;
    return [
      { key: "fill", label: "Fill", type: "color", value: s.fill },
      { key: "stroke", label: "Stroke", type: "color", value: s.stroke },
      { key: "strokeWidth", label: "Stroke width", type: "number", value: s.strokeWidth, min: 0, max: 80, step: 1 },
      { key: "dashPattern", label: "Border pattern", type: "select", value: s.dashPattern ?? "solid", options: [{ label: "Solid", value: "solid" }, { label: "Dashed", value: "dashed" }, { label: "Dotted", value: "dotted" }] },
      { key: "cornerRadius", label: "Corner radius", type: "number", value: s.cornerRadius, min: 0, max: 200, step: 1 },
    ];
  },
  updateProperty(shape, key, value) {
    const s = shape.style as RectStyle;
    if (key !== "dashPattern" && !(key in s)) throw new Error(`Unknown rectangle property ${key}`);
    return { style: { ...s, [key]: value } };
  },
  describeRender(shape) {
    const g = normalizeBounds(shape.geometry as RectGeometry);
    const s = shape.style as RectStyle;
    return [{ id: `${shape.id}:rect`, kind: "rect", ...g, rotation: shape.rotation, opacity: shape.opacity,
      fill: s.fill, stroke: s.stroke, strokeWidth: s.strokeWidth, cornerRadius: s.cornerRadius, dash: dashForPattern(s.dashPattern, s.strokeWidth) }];
  },
};
