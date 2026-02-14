export type LogLevel = "debug" | "info" | "warn" | "error";

export interface Logger {
  debug(msg: string, data?: Record<string, unknown>): void;
  info(msg: string, data?: Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  error(msg: string, data?: Record<string, unknown>): void;
}

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

const LOG_LEVELS: ReadonlySet<string> = new Set<LogLevel>(["debug", "info", "warn", "error"]);

function parseLogLevel(raw: string | undefined): LogLevel {
  if (raw && LOG_LEVELS.has(raw)) return raw as LogLevel;
  return "info";
}

const minLevel: LogLevel = parseLogLevel(process.env.LOG_LEVEL);

export function createLogger(context: string): Logger {
  function log(level: LogLevel, msg: string, data?: Record<string, unknown>): void {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel]) return;

    const entry = {
      level,
      msg,
      context,
      ts: new Date().toISOString(),
      ...data,
    };
    const line = JSON.stringify(entry);

    if (level === "error") {
      process.stderr.write(line + "\n");
    } else {
      process.stdout.write(line + "\n");
    }
  }

  return {
    debug: (msg: string, data?: Record<string, unknown>): void => log("debug", msg, data),
    info: (msg: string, data?: Record<string, unknown>): void => log("info", msg, data),
    warn: (msg: string, data?: Record<string, unknown>): void => log("warn", msg, data),
    error: (msg: string, data?: Record<string, unknown>): void => log("error", msg, data),
  };
}
