import { ShapeTypeRegistry } from "../shape-types";
import { rectType } from "./rect";
import { circleType } from "./circle";
import { lineType } from "./line";
import { textType } from "./text";
import { imageType } from "./image";
import { starType } from "./star";
import { polygonType } from "./polygon";
import { strokeType } from "./stroke";

export { rectType, circleType, lineType, textType, imageType, starType, polygonType, strokeType };
export * from "./rect";
export * from "./circle";
export * from "./line";
export * from "./text";
export * from "./image";
export * from "./star";
export * from "./polygon";
export * from "./stroke";

/** The browser and Node AI worker deliberately share this exact registry. */
export function createDefaultShapeTypeRegistry(): ShapeTypeRegistry {
  return new ShapeTypeRegistry()
    .register(rectType)
    .register(circleType)
    .register(lineType)
    .register(textType)
    .register(imageType)
    .register(starType)
    .register(polygonType)
    .register(strokeType);
}
