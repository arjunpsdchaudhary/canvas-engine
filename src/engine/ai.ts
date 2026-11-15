import type { Editor, Alignment } from "./editor";
import type { Bounds, LayerId, Point, ShapeId, Viewport } from "./types";

interface CallBase { id?: string }
type ShapeArguments = { layerId?: LayerId; geometry?: Record<string, unknown>; style?: Record<string, unknown>; rotation?: number; opacity?: number; meta?: Record<string, unknown> };

/** Tool calls are provider-independent. `@name` references may point to earlier calls in the same batch. */
export type AiToolCall = CallBase & (
  | { name: "add_shape"; arguments: ShapeArguments & { type: string; ref?: string } }
  | { name: "add_image"; arguments: Omit<ShapeArguments, "geometry"> & { ref?: string; src: string; mimeType?: string; naturalWidth?: number; naturalHeight?: number; geometry: Bounds } }
  | { name: "update_shape"; arguments: { id: ShapeId; layerId?: LayerId; geometry?: Record<string, unknown>; style?: Record<string, unknown>; rotation?: number; opacity?: number; meta?: Record<string, unknown> } }
  | { name: "move_shapes"; arguments: { ids: ShapeId[]; delta: Point } }
  | { name: "resize_shape"; arguments: { id: ShapeId; bounds: Bounds } }
  | { name: "delete_shapes"; arguments: { ids: ShapeId[] } }
  | { name: "duplicate_shapes"; arguments: { ids: ShapeId[]; offset?: Point; ref?: string } }
  | { name: "add_layer"; arguments: { name: string; ref?: string } }
  | { name: "update_layer"; arguments: { id: LayerId; name?: string; visible?: boolean; locked?: boolean } }
  | { name: "remove_layer"; arguments: { id: LayerId } }
  | { name: "move_layer"; arguments: { id: LayerId; direction: "up" | "down" } }
  | { name: "select_shapes"; arguments: { ids: ShapeId[]; additive?: boolean } }
  | { name: "set_viewport"; arguments: Viewport }
  | { name: "align_shapes"; arguments: { ids: ShapeId[]; alignment: Alignment; area?: Bounds } }
  | { name: "distribute_shapes"; arguments: { ids: ShapeId[]; axis: "horizontal" | "vertical" } }
  | { name: "arrange_grid"; arguments: { ids: ShapeId[]; columns?: number; gap?: number; origin?: Point } }
);

export interface AiToolResult { id?: string; name: AiToolCall["name"]; value?: unknown }

/** Executes exactly one typed call through Editor's public API. */
export function executeAiToolCall(editor: Editor, call: AiToolCall): AiToolResult {
  let value: unknown;
  switch (call.name) {
    case "add_shape": {
      const a = call.arguments;
      value = { id: editor.addShape(a.type, a).id, ref: a.ref };
      break;
    }
    case "add_image": {
      const a = call.arguments;
      const asset = editor.addAsset({ src: a.src, width: a.naturalWidth ?? a.geometry.width, height: a.naturalHeight ?? a.geometry.height,
        mimeType: a.mimeType ?? "image/*", meta: { source: "AI tool", ...(a.meta ?? {}) } });
      const shape = editor.addShape("image", { layerId: a.layerId, geometry: { ...a.geometry, assetId: asset.id },
        style: a.style, rotation: a.rotation, opacity: a.opacity, meta: a.meta });
      value = { id: shape.id, assetId: asset.id, ref: a.ref };
      break;
    }
    case "update_shape": {
      const a = call.arguments;
      const current = editor.getState().shapes[a.id];
      if (!current) throw new Error(`Unknown shape ${a.id}`);
      const geometry = a.geometry && isObject(current.geometry) ? { ...current.geometry, ...a.geometry } : a.geometry;
      const style = a.style && isObject(current.style) ? { ...current.style, ...a.style } : a.style;
      editor.updateShape(a.id, { layerId: a.layerId, geometry, style, rotation: a.rotation, opacity: a.opacity, meta: a.meta }, "AI update shape");
      value = { id: a.id };
      break;
    }
    case "move_shapes": { const a = call.arguments; editor.moveShapes(a.ids, a.delta, "AI move shapes"); value = { ids: a.ids }; break; }
    case "resize_shape": { const a = call.arguments; editor.resizeShape(a.id, a.bounds); value = { id: a.id }; break; }
    case "delete_shapes": { const a = call.arguments; editor.deleteShapes(a.ids); value = { ids: a.ids }; break; }
    case "duplicate_shapes": { const a = call.arguments; value = { ids: editor.duplicateShapes(a.ids, a.offset), ref: a.ref }; break; }
    case "add_layer": { const a = call.arguments; value = { id: editor.addLayer(a.name).id, ref: a.ref }; break; }
    case "update_layer": { const a = call.arguments; editor.updateLayer(a.id, { name: a.name, visible: a.visible, locked: a.locked }); value = { id: a.id }; break; }
    case "remove_layer": { const a = call.arguments; editor.removeLayer(a.id); value = { id: a.id }; break; }
    case "move_layer": { const a = call.arguments; editor.moveLayer(a.id, a.direction); value = { id: a.id }; break; }
    case "select_shapes": { const a = call.arguments; editor.selectShapes(a.ids, a.additive); value = { ids: a.ids }; break; }
    case "set_viewport": { const a = call.arguments; editor.setViewport(a); value = a; break; }
    case "align_shapes": { const a = call.arguments; editor.alignShapes(a.ids, a.alignment, a.area); value = { ids: a.ids }; break; }
    case "distribute_shapes": { const a = call.arguments; editor.distributeShapes(a.ids, a.axis); value = { ids: a.ids }; break; }
    case "arrange_grid": { const a = call.arguments; editor.arrangeInGrid(a.ids, a); value = { ids: a.ids }; break; }
  }
  return { id: call.id, name: call.name, value };
}

/** Resolves create → style → layout chains, then executes the response as one undoable transaction. */
export function executeAiToolBatch(editor: Editor, calls: AiToolCall[], label = "AI edit"): AiToolResult[] {
  const references = new Map<string, string>();
  return editor.transaction(label, () => calls.map((call) => {
    const resolved = resolveIds(call, references);
    const result = executeAiToolCall(editor, resolved);
    const ref = "ref" in call.arguments ? call.arguments.ref : undefined;
    if (ref) {
      const key = referenceKey(ref);
      const value = result.value as { id?: string; ids?: string[] } | undefined;
      const generatedId = value?.id ?? (value?.ids?.length === 1 ? value.ids[0] : undefined);
      if (!generatedId) throw new Error(`Reference ${key} requires an operation that creates exactly one object`);
      references.set(key, generatedId);
    }
    return result;
  }));
}

function resolveIds(call: AiToolCall, references: Map<string, string>): AiToolCall {
  const input = call.arguments as Record<string, unknown>;
  const args = { ...input };
  if (typeof args.id === "string") args.id = resolveId(args.id, references);
  if (typeof args.layerId === "string") args.layerId = resolveId(args.layerId, references);
  if (Array.isArray(args.ids)) args.ids = args.ids.map((id) => resolveId(String(id), references));
  return { ...call, arguments: args } as AiToolCall;
}

function resolveId(id: string, references: Map<string, string>): string {
  if (!id.startsWith("@")) return id;
  const resolved = references.get(id);
  if (!resolved) throw new Error(`Unknown reference ${id}. Create it earlier in the batch with a ref field.`);
  return resolved;
}

function referenceKey(ref: string): string {
  const clean = ref.replace(/^@/, "");
  if (!/^[A-Za-z][\w-]{0,63}$/.test(clean)) throw new Error(`Invalid reference "${ref}"; use letters, numbers, underscores or dashes`);
  return `@${clean}`;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
