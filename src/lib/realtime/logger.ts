type LogLevel = "debug" | "info" | "warn" | "error";

interface LoggerConfig {
  prefix: string;
  enableDebug: boolean;
}

class RealtimeLogger {
  private prefix: string;
  private enableDebug: boolean;

  constructor(config: LoggerConfig = { prefix: "RealtimeAudio", enableDebug: true }) {
    this.prefix = config.prefix;
    this.enableDebug = config.enableDebug;
  }

  private format(level: LogLevel, args: unknown[]): [string, ...unknown[]] {
    const timestamp = new Date().toISOString().split("T")[1].slice(0, -1);
    return [`[${this.prefix}] [${timestamp}] [${level.toUpperCase()}]`, ...args];
  }

  debug(...args: unknown[]): void {
    if (this.enableDebug) {
      console.debug(...this.format("debug", args));
    }
  }

  info(...args: unknown[]): void {
    console.log(...this.format("info", args));
  }

  warn(...args: unknown[]): void {
    console.warn(...this.format("warn", args));
  }

  error(...args: unknown[]): void {
    console.error(...this.format("error", args));
  }

  group(label: string): void {
    console.group(`[${this.prefix}] ${label}`);
  }

  groupEnd(): void {
    console.groupEnd();
  }

  setDebugEnabled(enabled: boolean): void {
    this.enableDebug = enabled;
  }
}

// Singleton logger instance
export const logger = new RealtimeLogger();

// Export class for custom instances
export { RealtimeLogger };
