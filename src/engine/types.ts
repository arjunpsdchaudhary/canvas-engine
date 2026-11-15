export type DashPattern = "solid" | "dashed" | "dotted";
export type ShapeId = string;
export type LayerId = string;
export type AssetId = string;

export interface Point { x: number; y: number }
export interface Bounds { x: number; y: number; width: number; height: number }

export interface Shape {
  id: ShapeId;
  type: string;
  layerId: LayerId;
  geometry: unknown;
  style: unknown;
  rotation: number;
  opacity: number;
  meta: Record<string, unknown>;
}

export interface Layer {
  id: LayerId;
  name: string;
  order: number;
  visible: boolean;
  locked: boolean;
}

export interface Asset {
  id: AssetId;
  src: string;
  width: number;
  height: number;
  mimeType: string;
  meta?: Record<string, unknown>;
}

export interface Viewport { x: number; y: number; zoom: number }

export interface DocumentState {
  layers: Record<LayerId, Layer>;
  shapes: Record<ShapeId, Shape>;
  shapeOrder: ShapeId[];
  assets: Record<AssetId, Asset>;
  selection: ShapeId[];
  viewport: Viewport;
}

export interface RenderContext {
  assets: Record<AssetId, Asset>;
}

interface RenderNodeBase {
  id: string;
  kind: string;
  rotation: number;
  opacity: number;
  /** Konva dash lengths in document pixels; empty/undefined means solid. */
  dash?: number[];
}

export interface RectRenderNode extends RenderNodeBase {
  kind: "rect";
  x: number; y: number; width: number; height: number;
  fill: string; stroke?: string; strokeWidth?: number; cornerRadius?: number;
}
export interface CircleRenderNode extends RenderNodeBase {
  kind: "circle";
  x: number; y: number; radius: number;
  fill: string; stroke?: string; strokeWidth?: number;
}
export interface LineRenderNode extends RenderNodeBase {
  kind: "line";
  x: number; y: number;
  points: number[];
  stroke: string; strokeWidth: number;
  lineCap?: "butt" | "round" | "square";
  tension?: number; closed?: boolean;
}
export interface TextRenderNode extends RenderNodeBase {
  kind: "text";
  x: number; y: number; width: number; height: number; text: string;
  fill: string; fontSize: number; fontFamily: string;
  stroke?: string; strokeWidth?: number;
  fontStyle?: string; align?: "left" | "center" | "right";
  lineHeight?: number;
}
export interface ImageRenderNode extends RenderNodeBase {
  kind: "image";
  x: number; y: number; width: number; height: number; src: string;
  stroke?: string; strokeWidth?: number;
}

export interface StarRenderNode extends RenderNodeBase {
  kind: "star";
  x: number; y: number; numPoints: number; innerRadius: number; outerRadius: number;
  fill: string; stroke?: string; strokeWidth?: number;
}
export interface PolygonRenderNode extends RenderNodeBase {
  kind: "polygon";
  x: number; y: number; sides: number; radius: number;
  fill: string; stroke?: string; strokeWidth?: number;
}
export interface StrokeRenderNode extends RenderNodeBase {
  kind: "stroke";
  x: number; y: number; points: number[]; stroke: string; strokeWidth: number;
  lineCap: "butt" | "round" | "square";
  lineJoin: "round" | "miter" | "bevel";
  tension: number;
  composite: "source-over" | "destination-out";
}

export type RenderNode = RectRenderNode | CircleRenderNode | LineRenderNode | TextRenderNode | ImageRenderNode | StarRenderNode | PolygonRenderNode | StrokeRenderNode;

/**
 * The only code allowed to interpret a shape's geometry and style.
 * Implementations must be pure, stateless and safe to run in Node.js.
 */
export interface ShapeProperty {
  key: string;
  label: string;
  type: "color" | "number" | "text" | "textarea" | "select" | "boolean";
  value: string | number | boolean;
  options?: { label: string; value: string }[];
  min?: number; max?: number; step?: number;
}

export interface ShapeTypeDefinition<G = unknown, S = unknown> {
  readonly type: string;
  readonly label: string;
  readonly keepAspectRatio?: boolean;
  /** Lines/strokes may be one pixel thin; other shapes default to an 8px transform minimum. */
  readonly minDimension?: number;
  readonly defaultStyle: Readonly<S>;
  createGeometry(overrides?: Partial<G>): G;
  getBounds(shape: Shape): Bounds;
  /** Rotation origin in document coordinates; defaults to the bounds' top-left. */
  getTransformOrigin?(shape: Shape, bounds: Bounds): Point;
  translate(shape: Shape, delta: Point): unknown;
  setBounds(shape: Shape, bounds: Bounds): unknown;
  describeRender(shape: Shape, context: RenderContext): RenderNode[];
  getProperties(shape: Shape): ShapeProperty[];
  updateProperty(shape: Shape, key: string, value: string | number | boolean): { geometry?: unknown; style?: unknown };
  getAssetIds?(shape: Shape): AssetId[];
}

export interface AddShapeOptions<G = unknown, S = unknown> {
  id?: ShapeId;
  layerId?: LayerId;
  geometry?: Partial<G>;
  style?: Partial<S>;
  rotation?: number;
  opacity?: number;
  meta?: Record<string, unknown>;
}

export interface ShapePatch {
  layerId?: LayerId;
  geometry?: unknown;
  style?: unknown;
  rotation?: number;
  opacity?: number;
  meta?: Record<string, unknown>;
}
