export interface Logger {
  debug(message: string, details?: unknown): void;
  warn(message: string, details?: unknown): void;
  error(message: string, details?: unknown): void;
}

export const silentLogger: Logger = {
  debug() {}, warn() {}, error() {},
};

export const consoleLogger: Logger = {
  debug(message, details) { console.debug(`[canvas] ${message}`, details ?? ""); },
  warn(message, details) { console.warn(`[canvas] ${message}`, details ?? ""); },
  error(message, details) { console.error(`[canvas] ${message}`, details ?? ""); },
};
