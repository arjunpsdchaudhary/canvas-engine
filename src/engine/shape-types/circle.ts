import type { DashPattern, ShapeTypeDefinition } from "../types";
import { dashForPattern } from "../util/geometry";

export interface CircleGeometry { cx: number; cy: number; radius: number }
export interface CircleStyle { fill: string; stroke: string; strokeWidth: number; dashPattern: DashPattern }

export const circleType: ShapeTypeDefinition<CircleGeometry, CircleStyle> = {
  type: "circle",
  label: "Circle",
  keepAspectRatio: true,
  defaultStyle: { fill: "#ff7a59", stroke: "transparent", strokeWidth: 0, dashPattern: "solid" },
  createGeometry: (overrides = {}) => ({ cx: 240, cy: 200, radius: 90, ...overrides }),
  getBounds(shape) {
    const g = shape.geometry as CircleGeometry;
    return { x: g.cx - g.radius, y: g.cy - g.radius, width: g.radius * 2, height: g.radius * 2 };
  },
  getTransformOrigin(shape) {
    const g = shape.geometry as CircleGeometry;
    return { x: g.cx, y: g.cy };
  },
  translate(shape, delta) {
    const g = shape.geometry as CircleGeometry;
    return { ...g, cx: g.cx + delta.x, cy: g.cy + delta.y };
  },
  setBounds(_shape, bounds) {
    const radius = Math.max(1, Math.min(Math.abs(bounds.width), Math.abs(bounds.height)) / 2);
    return { cx: bounds.x + bounds.width / 2, cy: bounds.y + bounds.height / 2, radius };
  },
  getProperties(shape) {
    const s = shape.style as CircleStyle;
    return [
      { key: "fill", label: "Fill", type: "color", value: s.fill },
      { key: "stroke", label: "Stroke", type: "color", value: s.stroke },
      { key: "strokeWidth", label: "Stroke width", type: "number", value: s.strokeWidth, min: 0, max: 80, step: 1 },
      { key: "dashPattern", label: "Border pattern", type: "select", value: s.dashPattern ?? "solid", options: [{ label: "Solid", value: "solid" }, { label: "Dashed", value: "dashed" }, { label: "Dotted", value: "dotted" }] },
    ];
  },
  updateProperty(shape, key, value) {
    const s = shape.style as CircleStyle;
    if (key !== "dashPattern" && !(key in s)) throw new Error(`Unknown circle property ${key}`);
    return { style: { ...s, [key]: value } };
  },
  describeRender(shape) {
    const g = shape.geometry as CircleGeometry;
    const s = shape.style as CircleStyle;
    return [{ id: `${shape.id}:circle`, kind: "circle", x: g.cx, y: g.cy, radius: g.radius,
      rotation: shape.rotation, opacity: shape.opacity, fill: s.fill, stroke: s.stroke, strokeWidth: s.strokeWidth, dash: dashForPattern(s.dashPattern, s.strokeWidth) }];
  },
};
