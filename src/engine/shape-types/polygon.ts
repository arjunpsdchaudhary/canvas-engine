import type { DashPattern, ShapeTypeDefinition } from "../types";
import { dashForPattern } from "../util/geometry";

/** Regular polygons from triangles upward; irregular polygons can be added later without changing Shape. */
export interface PolygonGeometry { cx: number; cy: number; radius: number; sides: number }
export interface PolygonStyle { fill: string; stroke: string; strokeWidth: number; dashPattern: DashPattern }

export const polygonType: ShapeTypeDefinition<PolygonGeometry, PolygonStyle> = {
  type: "polygon", label: "Polygon", keepAspectRatio: true,
  defaultStyle: { fill: "#75d9b4", stroke: "transparent", strokeWidth: 0, dashPattern: "solid" },
  createGeometry: (overrides = {}) => ({ cx: 250, cy: 220, radius: 110, sides: 6, ...overrides }),
  getBounds(shape) {
    const g = shape.geometry as PolygonGeometry;
    return { x: g.cx - g.radius, y: g.cy - g.radius, width: g.radius * 2, height: g.radius * 2 };
  },
  getTransformOrigin(shape) {
    const g = shape.geometry as PolygonGeometry;
    return { x: g.cx, y: g.cy };
  },
  translate(shape, delta) {
    const g = shape.geometry as PolygonGeometry;
    return { ...g, cx: g.cx + delta.x, cy: g.cy + delta.y };
  },
  setBounds(shape, bounds) {
    const g = shape.geometry as PolygonGeometry;
    return { ...g, cx: bounds.x + bounds.width / 2, cy: bounds.y + bounds.height / 2, radius: Math.max(2, Math.min(bounds.width, bounds.height) / 2) };
  },
  getProperties(shape) {
    const g = shape.geometry as PolygonGeometry;
    const s = shape.style as PolygonStyle;
    return [
      { key: "fill", label: "Fill", type: "color", value: s.fill },
      { key: "stroke", label: "Stroke", type: "color", value: s.stroke },
      { key: "strokeWidth", label: "Stroke width", type: "number", value: s.strokeWidth, min: 0, max: 80 },
      { key: "dashPattern", label: "Border pattern", type: "select", value: s.dashPattern ?? "solid", options: [{ label: "Solid", value: "solid" }, { label: "Dashed", value: "dashed" }, { label: "Dotted", value: "dotted" }] },
      { key: "sides", label: "Sides", type: "number", value: g.sides, min: 3, max: 24, step: 1 },
    ];
  },
  updateProperty(shape, key, value) {
    const g = shape.geometry as PolygonGeometry;
    const s = shape.style as PolygonStyle;
    if (key === "sides") return { geometry: { ...g, sides: Math.round(Math.min(24, Math.max(3, Number(value)))) } };
    if (key !== "dashPattern" && !(key in s)) throw new Error(`Unknown polygon property ${key}`);
    return { style: { ...s, [key]: value } };
  },
  describeRender(shape) {
    const g = shape.geometry as PolygonGeometry;
    const s = shape.style as PolygonStyle;
    return [{ id: `${shape.id}:polygon`, kind: "polygon", x: g.cx, y: g.cy, sides: g.sides, radius: g.radius,
      rotation: shape.rotation, opacity: shape.opacity, fill: s.fill, stroke: s.stroke, strokeWidth: s.strokeWidth, dash: dashForPattern(s.dashPattern, s.strokeWidth) }];
  },
};
