import { cloneValue, deepFreeze } from "./invariants";
import type { ShapeTypeDefinition } from "./types";

export class ShapeTypeRegistry {
  private readonly definitions = new Map<string, ShapeTypeDefinition>();

  register<G, S>(definition: ShapeTypeDefinition<G, S>): this {
    if (this.definitions.has(definition.type)) throw new Error(`Shape type "${definition.type}" is already registered`);
    const frozen = Object.freeze({
      ...definition,
      defaultStyle: deepFreeze(cloneValue(definition.defaultStyle)),
    }) as ShapeTypeDefinition;
    this.definitions.set(definition.type, frozen);
    return this;
  }

  get(type: string): ShapeTypeDefinition {
    const definition = this.definitions.get(type);
    if (!definition) throw new Error(`Unknown shape type "${type}"`);
    return definition;
  }

  has(type: string): boolean { return this.definitions.has(type); }
  list(): ShapeTypeDefinition[] { return [...this.definitions.values()]; }
}
