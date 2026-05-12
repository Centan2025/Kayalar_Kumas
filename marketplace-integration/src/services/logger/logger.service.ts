type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  correlationId?: string;
  context?: Record<string, unknown>;
}

export class Logger {
  private static correlationId: string | undefined;

  static setCorrelationId(id: string): void {
    Logger.correlationId = id;
  }

  static clearCorrelationId(): void {
    Logger.correlationId = undefined;
  }

  private static emit(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      correlationId: Logger.correlationId,
      context,
    };

    const output = JSON.stringify(entry);

    switch (level) {
      case 'error':
        console.error(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      default:
        console.log(output);
    }
  }

  static debug(message: string, context?: Record<string, unknown>): void {
    if (process.env.NODE_ENV !== 'production') {
      Logger.emit('debug', message, context);
    }
  }

  static info(message: string, context?: Record<string, unknown>): void {
    Logger.emit('info', message, context);
  }

  static warn(message: string, context?: Record<string, unknown>): void {
    Logger.emit('warn', message, context);
  }

  static error(message: string, context?: Record<string, unknown>): void {
    Logger.emit('error', message, context);
  }
}
