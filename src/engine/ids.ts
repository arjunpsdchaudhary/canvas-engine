
/**
 * Framework-independent ID generation.
 * Each editor instance receives its own sequence.
 */
export type IdGenerator = (prefix: string) => string;

export function createSequentialIdGenerator(): IdGenerator {
  let sequence = 0;

  return (prefix) => {
    sequence += 1;
    return `${prefix}_${sequence.toString(36)}`;
  };
}
