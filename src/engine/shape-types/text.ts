import type { DashPattern, ShapeTypeDefinition } from "../types";
import { dashForPattern } from "../util/geometry";

export interface TextGeometry { x: number; y: number; width: number; height: number; text: string }
export interface TextStyle {
  fill: string; fontSize: number; fontFamily: string; fontStyle: string;
  align: "left" | "center" | "right"; lineHeight: number;
  stroke: string; strokeWidth: number; dashPattern: DashPattern;
}

export const textType: ShapeTypeDefinition<TextGeometry, TextStyle> = {
  type: "text",
  label: "Text",
  defaultStyle: { fill: "#17181c", fontSize: 42, fontFamily: "Inter, Arial, sans-serif", fontStyle: "normal", align: "left", lineHeight: 1.15, stroke: "transparent", strokeWidth: 0, dashPattern: "solid" },
  createGeometry: (overrides = {}) => ({ x: 120, y: 120, width: 420, height: 110, text: "Add your story", ...overrides }),
  getBounds(shape) {
    const g = shape.geometry as TextGeometry;
    return { x: g.x, y: g.y, width: Math.max(1, g.width), height: Math.max(1, g.height) };
  },
  translate(shape, delta) {
    const g = shape.geometry as TextGeometry;
    return { ...g, x: g.x + delta.x, y: g.y + delta.y };
  },
  setBounds(shape, bounds) {
    const g = shape.geometry as TextGeometry;
    return { ...g, x: bounds.x, y: bounds.y, width: Math.max(8, Math.abs(bounds.width)), height: Math.max(8, Math.abs(bounds.height)) };
  },
  getProperties(shape) {
    const g = shape.geometry as TextGeometry;
    const s = shape.style as TextStyle;
    return [
      { key: "text", label: "Content", type: "textarea", value: g.text },
      { key: "fill", label: "Color", type: "color", value: s.fill },
      { key: "stroke", label: "Border", type: "color", value: s.stroke ?? "transparent" },
      { key: "strokeWidth", label: "Border width", type: "number", value: s.strokeWidth ?? 0, min: 0, max: 30, step: 1 },
      { key: "dashPattern", label: "Border pattern", type: "select", value: s.dashPattern ?? "solid", options: [{ label: "Solid", value: "solid" }, { label: "Dashed", value: "dashed" }, { label: "Dotted", value: "dotted" }] },
      { key: "fontSize", label: "Font size", type: "number", value: s.fontSize, min: 6, max: 240, step: 1 },
      { key: "fontFamily", label: "Typeface", type: "select", value: s.fontFamily, options: [
        { label: "Inter", value: "Inter, Arial, sans-serif" }, { label: "Georgia", value: "Georgia, serif" },
        { label: "Courier", value: "Courier New, monospace" }, { label: "Arial", value: "Arial, sans-serif" },
      ] },
      { key: "fontStyle", label: "Weight", type: "select", value: s.fontStyle, options: [{ label: "Regular", value: "normal" }, { label: "Bold", value: "bold" }, { label: "Italic", value: "italic" }] },
      { key: "align", label: "Alignment", type: "select", value: s.align, options: [{ label: "Left", value: "left" }, { label: "Center", value: "center" }, { label: "Right", value: "right" }] },
      { key: "lineHeight", label: "Line height", type: "number", value: s.lineHeight, min: 0.7, max: 3, step: 0.05 },
    ];
  },
  updateProperty(shape, key, value) {
    const g = shape.geometry as TextGeometry;
    const s = shape.style as TextStyle;
    if (key === "text") return { geometry: { ...g, text: String(value) } };
    if (!["dashPattern", "stroke", "strokeWidth"].includes(key) && !(key in s)) throw new Error(`Unknown text property ${key}`);
    return { style: { ...s, [key]: value } };
  },
  describeRender(shape) {
    const g = shape.geometry as TextGeometry;
    const s = shape.style as TextStyle;
    return [{ id: `${shape.id}:text`, kind: "text", x: g.x, y: g.y, width: g.width, height: g.height, text: g.text,
      rotation: shape.rotation, opacity: shape.opacity, fill: s.fill, fontSize: s.fontSize,
      fontFamily: s.fontFamily, fontStyle: s.fontStyle, align: s.align, lineHeight: s.lineHeight,
      stroke: s.stroke, strokeWidth: s.strokeWidth, dash: dashForPattern(s.dashPattern, s.strokeWidth ?? 0) }];
  },
};
