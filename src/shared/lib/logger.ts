export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LogContext {
  [key: string]: unknown;
}

export class Logger {
  private context: string;
  private minLogLevel: LogLevel;

  constructor(context: string, minLogLevel: LogLevel = LogLevel.INFO) {
    this.context = context;
    this.minLogLevel = minLogLevel;
  }

  public setMinLogLevel(level: LogLevel): void {
    this.minLogLevel = level;
  }

  public debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  public info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  public warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  public error(message: string, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, context);
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] [${this.context}] ${message}`;

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage, context ? context : '');
        break;
      case LogLevel.INFO:
        console.info(formattedMessage, context ? context : '');
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage, context ? context : '');
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage, context ? context : '');
        break;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = Object.values(LogLevel);
    const minLevelIndex = levels.indexOf(this.minLogLevel);
    const currentLevelIndex = levels.indexOf(level);

    return currentLevelIndex >= minLevelIndex;
  }
}