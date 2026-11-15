import { assertDocumentInvariants, cloneValue } from "./invariants";
import type { ShapeTypeRegistry } from "./shape-types";
import type { DocumentState, Viewport } from "./types";

export const DOCUMENT_FORMAT_VERSION = 1 as const;

export interface SerializedDocument {
  version: typeof DOCUMENT_FORMAT_VERSION;
  document: {
    layers: DocumentState["layers"];
    shapes: DocumentState["shapes"];
    shapeOrder: DocumentState["shapeOrder"];
    assets: DocumentState["assets"];
    viewport?: Viewport;
  };
}

export function serializeDocument(state: DocumentState, options: { includeViewport?: boolean; pretty?: boolean } = {}): string {
  const payload: SerializedDocument = {
    version: DOCUMENT_FORMAT_VERSION,
    document: cloneValue({
      layers: state.layers,
      shapes: state.shapes,
      shapeOrder: state.shapeOrder,
      assets: state.assets,
      ...(options.includeViewport ? { viewport: state.viewport } : {}),
    }),
  };
  return JSON.stringify(payload, null, options.pretty ? 2 : 0);
}

export function deserializeDocument(json: string, registry?: ShapeTypeRegistry): DocumentState {
  let payload: SerializedDocument;
  try { payload = JSON.parse(json) as SerializedDocument; }
  catch { throw new Error("Document is not valid JSON"); }
  if (!payload || payload.version !== DOCUMENT_FORMAT_VERSION || !payload.document) {
    throw new Error(`Unsupported document format; expected version ${DOCUMENT_FORMAT_VERSION}`);
  }
  const source = payload.document;
  if (!source.layers || !source.shapes || !Array.isArray(source.shapeOrder) || !source.assets) {
    throw new Error("Document is missing required collections");
  }
  if (registry) {
    for (const shape of Object.values(source.shapes)) {
      if (!shape || !registry.has(shape.type)) throw new Error(`Document contains unregistered shape type "${shape?.type}"`);
    }
  }
  const state: DocumentState = {
    layers: cloneValue(source.layers),
    shapes: cloneValue(source.shapes),
    shapeOrder: [...source.shapeOrder],
    assets: cloneValue(source.assets),
    selection: [],
    viewport: source.viewport ? cloneValue(source.viewport) : { x: 0, y: 0, zoom: 1 },
  };
  assertDocumentInvariants(state);
  return state;
}
