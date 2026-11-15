let sequence = 0;

/** Framework-independent ids. Pass a custom generator to Editor for deterministic tests. */
export type IdGenerator = (prefix: string) => string;

export const createId: IdGenerator = (prefix) => {
  sequence += 1;
  const random = Math.random().toString(36).slice(2, 9);
  return `${prefix}_${Date.now().toString(36)}_${sequence.toString(36)}_${random}`;
};
