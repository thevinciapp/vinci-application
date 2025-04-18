export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  log(...args: unknown[]) {
    console.log(`[${this.context}]`, ...args);
  }

  info(...args: unknown[]) {
    console.info(`[${this.context}]`, ...args);
  }

  warn(...args: unknown[]) {
    console.warn(`[${this.context}]`, ...args);
  }

  error(...args: unknown[]) {
    console.error(`[${this.context}]`, ...args);
  }

  debug(...args: unknown[]) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[${this.context}]`, ...args);
    }
  }
}