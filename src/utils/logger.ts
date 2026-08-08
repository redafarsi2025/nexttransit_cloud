type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LogPayload {
  message: string;
  timestamp: string;
  level: LogLevel;
  context?: string;
  [key: string]: any;
}

interface SentryEvent {
  eventId: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  exception?: {
    name: string;
    message: string;
    stack?: string;
  };
  extra?: Record<string, any>;
}

class StructuredLogger {
  // Sentry-equivalent in-memory and storage buffer for real-time error tracking and telemetry inspection.
  private sentryBuffer: SentryEvent[] = [];
  private readonly maxBufferSize = 50;

  constructor() {
    this.loadSentryBuffer();
  }

  private loadSentryBuffer() {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('nexttransit_sentry_mock_v1');
        if (stored) {
          this.sentryBuffer = JSON.parse(stored);
        }
      }
    } catch {
      // Ignore storage loading failures
    }
  }

  private saveSentryBuffer() {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem('nexttransit_sentry_mock_v1', JSON.stringify(this.sentryBuffer));
      }
    } catch {
      // Ignore storage saving failures
    }
  }

  private formatLog(level: LogLevel, message: string, meta?: Record<string, any>, context?: string): string {
    const payload: LogPayload = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context && { context }),
      ...meta,
    };
    return JSON.stringify(payload);
  }

  private captureSentryEvent(level: LogLevel, message: string, error?: Error | unknown, meta?: Record<string, any>) {
    const event: SentryEvent = {
      eventId: `sentry-ev-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      level,
      message,
      extra: meta,
    };

    if (error instanceof Error) {
      event.exception = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    } else if (error) {
      event.exception = {
        name: 'UnknownError',
        message: String(error),
      };
    }

    this.sentryBuffer.unshift(event);
    if (this.sentryBuffer.length > this.maxBufferSize) {
      this.sentryBuffer.pop();
    }
    this.saveSentryBuffer();

    // Trigger potential webhook or monitoring collector in production
    if (typeof window !== 'undefined') {
      (window as any)._lastSentryEvent = event;
    }
  }

  public getSentryEvents(): SentryEvent[] {
    return this.sentryBuffer;
  }

  public clearSentryEvents() {
    this.sentryBuffer = [];
    this.saveSentryBuffer();
  }

  debug(message: string, meta?: Record<string, any>, context?: string): void {
    const isDev = typeof process !== 'undefined' ? process.env.NODE_ENV !== 'production' : (import.meta as any).env?.DEV;
    if (isDev) {
      console.debug(this.formatLog('DEBUG', message, meta, context));
    }
  }

  info(message: string, meta?: Record<string, any>, context?: string): void {
    console.info(this.formatLog('INFO', message, meta, context));
  }

  warn(message: string, meta?: Record<string, any>, context?: string): void {
    console.warn(this.formatLog('WARN', message, meta, context));
    this.captureSentryEvent('WARN', message, undefined, meta);
  }

  error(message: string, error?: Error | unknown, meta?: Record<string, any>, context?: string): void {
    const errorMeta = error instanceof Error ? {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
    } : { error };

    console.error(this.formatLog('ERROR', message, { ...errorMeta, ...meta }, context));
    this.captureSentryEvent('ERROR', message, error, { ...errorMeta, ...meta });
  }
}

export const logger = new StructuredLogger();
