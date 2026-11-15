import { CommandManager, createStateCommand, type Command } from "./commands";
import { createId, type IdGenerator } from "./ids";
import { assertDocumentInvariants, cloneValue } from "./invariants";
import { defaultLayer, nextLayerOrder, orderedLayers, orderedShapes } from "./layers";
import { silentLogger, type Logger } from "./logger";
import { createDefaultShapeTypeRegistry } from "./shape-types/index";
import { ShapeTypeRegistry } from "./shape-types";
import { Store } from "./store";
import type {
  AddShapeOptions, Asset, AssetId, Bounds, DocumentState, Layer, LayerId,
  Point, Shape, ShapeId, ShapePatch, Viewport,
} from "./types";
import { normalizeBounds, unionBounds } from "./util/geometry";

export interface EditorOptions {
  document?: DocumentState;
  registry?: ShapeTypeRegistry;
  ids?: IdGenerator;
  logger?: Logger;
  historyLimit?: number;
}

export type Alignment = "left" | "center" | "right" | "top" | "middle" | "bottom";

/** The sole public write API. UI, plugins, and AI tools all use this class. */
export class Editor {
  readonly registry: ShapeTypeRegistry;
  private readonly store: Store;
  private readonly commands: CommandManager;
  private readonly ids: IdGenerator;
  private readonly logger: Logger;
  private readonly listeners = new Set<(state: DocumentState) => void>();

  constructor(options: EditorOptions = {}) {
    this.registry = options.registry ?? createDefaultShapeTypeRegistry();
    this.ids = options.ids ?? createId;
    this.logger = options.logger ?? silentLogger;
    const layerId = this.ids("layer");
    const initial = options.document ?? {
      layers: { [layerId]: { id: layerId, name: "Layer 1", order: 0, visible: true, locked: false } },
      shapes: {}, shapeOrder: [], assets: {}, selection: [], viewport: { x: 0, y: 0, zoom: 0.7 },
    };
    assertDocumentInvariants(initial);
    this.store = new Store(initial);
    this.commands = new CommandManager(this.store, options.historyLimit);
  }

  getState(): DocumentState { return this.store.getState(); }
  get canUndo(): boolean { return this.commands.canUndo; }
  get canRedo(): boolean { return this.commands.canRedo; }
  get undoLabel(): string | undefined { return this.commands.undoLabel; }
  get redoLabel(): string | undefined { return this.commands.redoLabel; }
  get historyLabels(): readonly string[] { return this.commands.historyLabels; }

  subscribe(listener: (state: DocumentState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const state = this.getState();
    for (const listener of this.listeners) {
      try { listener(state); } catch (error) { this.logger.error("Subscriber failed", error); }
    }
  }

  private apply(command: Command): void {
    this.commands.execute(command);
    this.notify();
  }

  transaction<T>(label: string, work: () => T): T {
    try { return this.commands.transaction(label, work); }
    catch (error) { this.notify(); throw error; }
  }

  undo(): boolean { const result = this.commands.undo(); if (result) this.notify(); return result; }
  redo(): boolean { const result = this.commands.redo(); if (result) this.notify(); return result; }
  clearHistory(): void { this.commands.clearHistory(); }

  addLayer(name = "New layer", id = this.ids("layer")): Layer {
    if (this.getState().layers[id]) throw new Error(`Layer ${id} already exists`);
    const layer: Layer = { id, name, order: nextLayerOrder(this.getState()), visible: true, locked: false };
    this.apply(createStateCommand(`Add ${name}`, (state) => ({
      ...state, layers: { ...state.layers, [id]: cloneValue(layer) },
    })));
    return layer;
  }

  updateLayer(id: LayerId, patch: Partial<Omit<Layer, "id" | "order">>): void {
    const previous = this.getState().layers[id];
    if (!previous) throw new Error(`Unknown layer ${id}`);
    const cleanPatch = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
    const layer = { ...previous, ...cloneValue(cleanPatch), id };
    this.apply(createStateCommand("Update layer", (state) => ({
      ...state, layers: { ...state.layers, [id]: layer },
    })));
  }

  moveLayer(id: LayerId, direction: "up" | "down"): void {
    const layers = orderedLayers(this.getState());
    const index = layers.findIndex((layer) => layer.id === id);
    const target = direction === "up" ? index + 1 : index - 1;
    if (index < 0) throw new Error(`Unknown layer ${id}`);
    if (target < 0 || target >= layers.length) return;
    [layers[index], layers[target]] = [layers[target], layers[index]];
    const reordered = layers.map((layer, order) => ({ ...layer, order }));
    this.apply(createStateCommand("Reorder layers", (state) => ({
      ...state, layers: Object.fromEntries(reordered.map((layer) => [layer.id, layer])),
    })));
  }

  removeLayer(id: LayerId): void {
    const state = this.getState();
    if (!state.layers[id]) throw new Error(`Unknown layer ${id}`);
    if (Object.keys(state.layers).length === 1) throw new Error("A document must keep at least one layer");
    const removed = state.shapeOrder.filter((shapeId) => state.shapes[shapeId].layerId === id);
    this.apply(createStateCommand("Delete layer", (current) => {
      const layers = { ...current.layers }; delete layers[id];
      const shapes = { ...current.shapes };
      for (const shapeId of removed) delete shapes[shapeId];
      return {
        ...current, layers, shapes,
        shapeOrder: removed.length ? current.shapeOrder.filter((shapeId) => !removed.includes(shapeId)) : current.shapeOrder,
        selection: current.selection.filter((shapeId) => !removed.includes(shapeId)),
      };
    }));
  }

  addAsset(input: Omit<Asset, "id"> & { id?: AssetId }): Asset {
    const id = input.id ?? this.ids("asset");
    if (this.getState().assets[id]) throw new Error(`Asset ${id} already exists`);
    const asset: Asset = { ...cloneValue(input), id };
    this.apply(createStateCommand("Add asset", (state) => ({
      ...state, assets: { ...state.assets, [id]: asset },
    })));
    return asset;
  }

  removeAsset(id: AssetId): void {
    if (!this.getState().assets[id]) throw new Error(`Unknown asset ${id}`);
    for (const shape of Object.values(this.getState().shapes)) {
      const used = this.registry.get(shape.type).getAssetIds?.(shape) ?? [];
      if (used.includes(id)) throw new Error(`Asset ${id} is still used by shape ${shape.id}`);
    }
    this.apply(createStateCommand("Delete asset", (state) => {
      const assets = { ...state.assets }; delete assets[id];
      return { ...state, assets };
    }));
  }

  addShape<G = Record<string, unknown>, S = Record<string, unknown>>(type: string, options: AddShapeOptions<G, S> = {}): Shape {
    const state = this.getState();
    const definition = this.registry.get(type) as import("./types").ShapeTypeDefinition<G, S>;
    const id = options.id ?? this.ids("shape");
    if (state.shapes[id]) throw new Error(`Shape ${id} already exists`);
    const layerId = options.layerId ?? defaultLayer(state).id;
    if (!state.layers[layerId]) throw new Error(`Unknown layer ${layerId}`);
    const shape: Shape = {
      id, type, layerId,
      geometry: cloneValue(definition.createGeometry(options.geometry)),
      style: cloneValue({ ...definition.defaultStyle, ...options.style }),
      rotation: options.rotation ?? 0,
      opacity: options.opacity ?? 1,
      meta: cloneValue(options.meta ?? {}),
    };
    if (!Number.isFinite(shape.rotation) || shape.opacity < 0 || shape.opacity > 1) throw new Error("Invalid shape transform");
    this.apply(createStateCommand(`Add ${definition.label}`, (current) => ({
      ...current,
      shapes: { ...current.shapes, [id]: shape },
      shapeOrder: [...current.shapeOrder, id],
    })));
    return shape;
  }

  updateShape(id: ShapeId, patch: ShapePatch, label = "Update shape"): void {
    const current = this.getState().shapes[id];
    if (!current) throw new Error(`Unknown shape ${id}`);
    if (patch.layerId && !this.getState().layers[patch.layerId]) throw new Error(`Unknown layer ${patch.layerId}`);
    if (patch.opacity !== undefined && (patch.opacity < 0 || patch.opacity > 1)) throw new Error("Opacity must be between 0 and 1");
    if (patch.rotation !== undefined && !Number.isFinite(patch.rotation)) throw new Error("Rotation must be finite radians");
    const cleanPatch = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)) as ShapePatch;
    const shape: Shape = { ...current, ...cloneValue(cleanPatch), id, type: current.type };
    this.apply(createStateCommand(label, (state) => ({
      ...state, shapes: { ...state.shapes, [id]: shape },
    })));
  }

  moveShape(id: ShapeId, delta: Point): void { this.moveShapes([id], delta); }

  moveShapes(ids: ShapeId[], delta: Point, label = "Move shapes"): void {
    this.transaction(label, () => {
      for (const id of ids) {
        const shape = this.getState().shapes[id];
        if (!shape) throw new Error(`Unknown shape ${id}`);
        if (this.getState().layers[shape.layerId].locked) continue;
        const geometry = this.registry.get(shape.type).translate(shape, delta);
        this.updateShape(id, { geometry }, "Move shape");
      }
    });
  }

  resizeShape(id: ShapeId, bounds: Bounds): void {
    const shape = this.getState().shapes[id];
    if (!shape) throw new Error(`Unknown shape ${id}`);
    const geometry = this.registry.get(shape.type).setBounds(shape, bounds);
    this.updateShape(id, { geometry }, "Resize shape");
  }

  rotateShape(id: ShapeId, radians: number): void { this.updateShape(id, { rotation: radians }, "Rotate shape"); }
  setOpacity(id: ShapeId, opacity: number): void { this.updateShape(id, { opacity }, "Change opacity"); }

  deleteShapes(ids: ShapeId[]): void {
    const existing = [...new Set(ids)].filter((id) => this.getState().shapes[id]);
    if (!existing.length) return;
    const removed = new Set(existing);
    this.apply(createStateCommand(`Delete ${existing.length} shape${existing.length === 1 ? "" : "s"}`, (state) => {
      const shapes = { ...state.shapes };
      for (const id of removed) delete shapes[id];
      return {
        ...state, shapes,
        shapeOrder: state.shapeOrder.filter((id) => !removed.has(id)),
        selection: state.selection.filter((id) => !removed.has(id)),
      };
    }));
  }

  duplicateShapes(ids: ShapeId[], offset: Point = { x: 24, y: 24 }): ShapeId[] {
    return this.transaction("Duplicate shapes", () => {
      const copies: ShapeId[] = [];
      for (const id of ids) {
        const source = this.getState().shapes[id];
        if (!source) continue;
        const definition = this.registry.get(source.type);
        const copy = this.addShape(source.type, {
          layerId: source.layerId,
          geometry: definition.translate(source, offset) as Record<string, unknown>,
          style: cloneValue(source.style) as Record<string, unknown>,
          rotation: source.rotation, opacity: source.opacity, meta: cloneValue(source.meta),
        });
        copies.push(copy.id);
      }
      return copies;
    });
  }

  selectShapes(ids: ShapeId[], additive = false): void {
    const valid = ids.filter((id) => this.getState().shapes[id]);
    this.apply(createStateCommand("Select shapes", (state) => ({
      ...state, selection: [...new Set(additive ? [...state.selection, ...valid] : valid)],
    }), false));
  }

  clearSelection(): void { this.selectShapes([]); }

  /** Select visible shapes whose definition-owned bounds intersect a marquee. */
  selectShapesInBounds(area: Bounds, additive = false): ShapeId[] {
    const marquee = normalizeBounds(area);
    const right = marquee.x + marquee.width;
    const bottom = marquee.y + marquee.height;
    const hits = this.getOrderedShapes().filter((shape) => {
      if (!this.getState().layers[shape.layerId]?.visible) return false;
      const bounds = this.registry.get(shape.type).getBounds(shape);
      return bounds.x <= right && bounds.x + bounds.width >= marquee.x && bounds.y <= bottom && bounds.y + bounds.height >= marquee.y;
    }).map((shape) => shape.id);
    this.selectShapes(hits, additive);
    return hits;
  }

  setViewport(viewport: Viewport): void {
    if (!(viewport.zoom > 0) || !Number.isFinite(viewport.x) || !Number.isFinite(viewport.y)) throw new Error("Invalid viewport");
    this.apply(createStateCommand("Change viewport", (state) => ({ ...state, viewport: cloneValue(viewport) }), false));
  }

  getShapeBounds(id: ShapeId): Bounds {
    const shape = this.getState().shapes[id];
    if (!shape) throw new Error(`Unknown shape ${id}`);
    return this.registry.get(shape.type).getBounds(shape);
  }

  getSelectionBounds(ids = this.getState().selection): Bounds {
    return unionBounds(ids.filter((id) => this.getState().shapes[id]).map((id) => this.getShapeBounds(id)));
  }

  getOrderedShapes(): Shape[] { return orderedShapes(this.getState()); }

  alignShapes(ids: ShapeId[], alignment: Alignment, area?: Bounds): void {
    const targets = ids.filter((id) => this.getState().shapes[id]);
    if (targets.length < 1) return;
    const container = area ?? this.getSelectionBounds(targets);
    this.transaction(`Align ${alignment}`, () => {
      for (const id of targets) {
        const b = this.getShapeBounds(id);
        let dx = 0; let dy = 0;
        if (alignment === "left") dx = container.x - b.x;
        if (alignment === "center") dx = container.x + container.width / 2 - (b.x + b.width / 2);
        if (alignment === "right") dx = container.x + container.width - (b.x + b.width);
        if (alignment === "top") dy = container.y - b.y;
        if (alignment === "middle") dy = container.y + container.height / 2 - (b.y + b.height / 2);
        if (alignment === "bottom") dy = container.y + container.height - (b.y + b.height);
        this.moveShape(id, { x: dx, y: dy });
      }
    });
  }

  distributeShapes(ids: ShapeId[], axis: "horizontal" | "vertical"): void {
    if (ids.length < 3) return;
    const items = ids.map((id) => ({ id, bounds: this.getShapeBounds(id) }));
    const horizontal = axis === "horizontal";
    items.sort((a, b) => (horizontal ? a.bounds.x - b.bounds.x : a.bounds.y - b.bounds.y));
    const start = horizontal ? items[0].bounds.x : items[0].bounds.y;
    const last = items.at(-1)!.bounds;
    const end = horizontal ? last.x + last.width : last.y + last.height;
    const sizes = items.reduce((sum, item) => sum + (horizontal ? item.bounds.width : item.bounds.height), 0);
    const gap = (end - start - sizes) / (items.length - 1);
    this.transaction(`Distribute ${axis}`, () => {
      let cursor = start;
      for (const item of items) {
        const delta = horizontal ? { x: cursor - item.bounds.x, y: 0 } : { x: 0, y: cursor - item.bounds.y };
        this.moveShape(item.id, delta);
        cursor += (horizontal ? item.bounds.width : item.bounds.height) + gap;
      }
    });
  }

  arrangeInGrid(ids: ShapeId[], options: { columns?: number; gap?: number; origin?: Point } = {}): void {
    const shapes = ids.filter((id) => this.getState().shapes[id]);
    if (!shapes.length) return;
    const columns = Math.max(1, Math.floor(options.columns ?? Math.ceil(Math.sqrt(shapes.length))));
    const gap = options.gap ?? 32;
    const origin = options.origin ?? this.getSelectionBounds(shapes);
    const bounds = shapes.map((id) => this.getShapeBounds(id));
    const cellWidth = Math.max(...bounds.map((b) => b.width));
    const cellHeight = Math.max(...bounds.map((b) => b.height));
    this.transaction("Arrange in grid", () => {
      shapes.forEach((id, index) => {
        const b = this.getShapeBounds(id);
        const column = index % columns; const row = Math.floor(index / columns);
        const x = origin.x + column * (cellWidth + gap) + (cellWidth - b.width) / 2;
        const y = origin.y + row * (cellHeight + gap) + (cellHeight - b.height) / 2;
        this.moveShape(id, { x: x - b.x, y: y - b.y });
      });
    });
  }

  replaceDocument(document: DocumentState, label = "Open document"): void {
    assertDocumentInvariants(document);
    this.apply(createStateCommand(label, () => cloneValue(document), false));
  }
}
