import type { AssetId, DashPattern, ShapeTypeDefinition } from "../types";
import { dashForPattern, normalizeBounds } from "../util/geometry";

export interface ImageGeometry { x: number; y: number; width: number; height: number; assetId: AssetId }
export interface ImageStyle { stroke: string; strokeWidth: number; dashPattern: DashPattern }

export const imageType: ShapeTypeDefinition<ImageGeometry, ImageStyle> = {
  type: "image",
  label: "Image",
  defaultStyle: { stroke: "transparent", strokeWidth: 0, dashPattern: "solid" },
  createGeometry: (overrides = {}) => ({ x: 100, y: 100, width: 360, height: 240, assetId: "", ...overrides }),
  getBounds: (shape) => normalizeBounds(shape.geometry as ImageGeometry),
  translate(shape, delta) {
    const g = shape.geometry as ImageGeometry;
    return { ...g, x: g.x + delta.x, y: g.y + delta.y };
  },
  setBounds(shape, bounds) { return { ...(shape.geometry as ImageGeometry), ...normalizeBounds(bounds) }; },
  getProperties(shape) {
    const s = shape.style as ImageStyle;
    return [
      { key: "stroke", label: "Border", type: "color", value: s.stroke },
      { key: "strokeWidth", label: "Border width", type: "number", value: s.strokeWidth, min: 0, max: 80, step: 1 },
      { key: "dashPattern", label: "Border pattern", type: "select", value: s.dashPattern ?? "solid", options: [{ label: "Solid", value: "solid" }, { label: "Dashed", value: "dashed" }, { label: "Dotted", value: "dotted" }] },
    ];
  },
  updateProperty(shape, key, value) {
    const s = shape.style as ImageStyle;
    if (key !== "dashPattern" && !(key in s)) throw new Error(`Unknown image property ${key}`);
    return { style: { ...s, [key]: value } };
  },
  getAssetIds: (shape) => [(shape.geometry as ImageGeometry).assetId],
  describeRender(shape, context) {
    const g = normalizeBounds(shape.geometry as ImageGeometry);
    const assetId = (shape.geometry as ImageGeometry).assetId;
    const asset = context.assets[assetId];
    if (!asset) return [];
    const s = shape.style as ImageStyle;
    return [{ id: `${shape.id}:image`, kind: "image", ...g, src: asset.src, rotation: shape.rotation,
      opacity: shape.opacity, stroke: s.stroke, strokeWidth: s.strokeWidth, dash: dashForPattern(s.dashPattern, s.strokeWidth) }];
  },
};
