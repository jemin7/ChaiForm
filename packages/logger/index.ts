// Leveled console logger — same call shape as before (message + optional meta
// object) without pulling in a logging framework. Debug lines are hidden
// outside development, matching the previous level configuration.
const isDevelopment = process.env.NODE_ENV === "development";

function write(level: "debug" | "info" | "warn" | "error", args: unknown[]) {
  if (level === "debug" && !isDevelopment) {
    return;
  }

  const [message, meta] = args;
  const metaString = meta === undefined ? "" : `\n${JSON.stringify(meta, null, 2)}`;

  console[level](`${new Date().toISOString()} [${level.toUpperCase()}]: ${String(message)}${metaString}`);
}

export const logger = {
  debug: (...args: unknown[]) => write("debug", args),
  info: (...args: unknown[]) => write("info", args),
  warn: (...args: unknown[]) => write("warn", args),
  error: (...args: unknown[]) => write("error", args),
};
