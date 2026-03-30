/**
 * Error handling utilities
 */

/**
 * Custom error class for storage operations
 */
export class StorageError extends Error {
  constructor(
    message: string,
    public readonly key?: string,
    public readonly operation?: "get" | "set" | "remove"
  ) {
    super(message);
    this.name = "StorageError";
  }
}

/**
 * Custom error class for template operations
 */
export class TemplateError extends Error {
  constructor(
    message: string,
    public readonly templateId?: string,
    public readonly operation?: "create" | "update" | "delete" | "load"
  ) {
    super(message);
    this.name = "TemplateError";
  }
}

/**
 * Custom error class for platform adapter operations
 */
export class PlatformError extends Error {
  constructor(
    message: string,
    public readonly platform?: string,
    public readonly operation?: "detect" | "inject" | "submit"
  ) {
    super(message);
    this.name = "PlatformError";
  }
}

/**
 * Async error handler wrapper
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  errorHandler: (error: Error) => void,
  fallbackValue?: T
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    errorHandler(err);
    return fallbackValue;
  }
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    delay?: number;
    maxDelay?: number;
    backoff?: number;
    onRetry?: (error: Error, attempt: number) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delay = 1000,
    maxDelay = 10000,
    backoff = 2,
    onRetry,
  } = options;

  let lastError: Error;
  let currentDelay = delay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        onRetry?.(lastError, attempt + 1);
        await sleep(currentDelay);
        currentDelay = Math.min(currentDelay * backoff, maxDelay);
      }
    }
  }

  throw lastError!;
}

/**
 * Sleep for a given duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Log error with context
 */
export function logError(
  error: Error,
  context: {
    module?: string;
    function?: string;
    details?: Record<string, unknown>;
  } = {}
): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    name: error.name,
    message: error.message,
    stack: error.stack,
    ...context,
  };

  // In development, log to console
  if (
    typeof process !== "undefined" &&
    process.env &&
    process.env.NODE_ENV !== "production"
  ) {
    console.error("[Error]", logEntry);
  }

  // In production, you might want to send to an error tracking service
  // For Chrome extension, you could use chrome.runtime.sendMessage
  if (typeof chrome !== "undefined" && chrome.runtime) {
    chrome.runtime
      .sendMessage({
        type: "ERROR_LOG",
        payload: logEntry,
      })
      .catch(() => {
        // Silently fail if messaging fails
      });
  }
}

/**
 * Create a safe function that returns error instead of throwing
 */
export function safe<T>(fn: () => T): [T, null] | [undefined, Error] {
  try {
    return [fn(), null];
  } catch (error) {
    return [
      undefined,
      error instanceof Error ? error : new Error(String(error)),
    ];
  }
}

/**
 * Create a safe async function that returns error instead of throwing
 */
export async function safeAsync<T>(
  fn: () => Promise<T>
): Promise<[T, null] | [undefined, Error]> {
  try {
    return [await fn(), null];
  } catch (error) {
    return [
      undefined,
      error instanceof Error ? error : new Error(String(error)),
    ];
  }
}
