/**
 * Tillu typed error classes.
 *
 * Rules:
 * - Never let raw exceptions reach API consumers or the UI.
 * - Every catch block must either handle or rethrow as TilluError.
 * - API error responses use the standard shape (see below).
 */

/**
 * Base error class for all Tillu application errors.
 */
export class TilluError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly recoverable: boolean,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "TilluError";
    // Ensure instanceof works correctly in compiled JS
    Object.setPrototypeOf(this, TilluError.prototype);
  }
}

/** Validation errors (bad input, schema mismatch) */
export class ValidationError extends TilluError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "VALIDATION_ERROR", false, context);
    this.name = "ValidationError";
  }
}

/** AI provider/model errors */
export class AIError extends TilluError {
  constructor(
    message: string,
    code: string,
    recoverable: boolean,
    context?: Record<string, unknown>
  ) {
    super(message, code, recoverable, context);
    this.name = "AIError";
  }
}

/** AI output failed schema validation */
export class AIOutputValidationError extends AIError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "AI_OUTPUT_INVALID", true, context);
    this.name = "AIOutputValidationError";
  }
}

/** All AI providers failed */
export class AIUnavailableError extends AIError {
  constructor(context?: Record<string, unknown>) {
    super(
      "AI services are temporarily unavailable. Using deterministic fallback.",
      "AI_UNAVAILABLE",
      true,
      context
    );
    this.name = "AIUnavailableError";
  }
}

/** Database errors */
export class DatabaseError extends TilluError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "DATABASE_ERROR", true, context);
    this.name = "DatabaseError";
  }
}

/** Authorization errors */
export class AuthorizationError extends TilluError {
  constructor(message: string) {
    super(message, "AUTHORIZATION_ERROR", false);
    this.name = "AuthorizationError";
  }
}

/** Critical invariant violations — should never happen in production */
export class InvariantViolationError extends TilluError {
  constructor(invariant: string, context?: Record<string, unknown>) {
    super(
      `Invariant violated: ${invariant}`,
      "INVARIANT_VIOLATION",
      false,
      context
    );
    this.name = "InvariantViolationError";
  }
}

/**
 * Standard API error response shape.
 * Use this in Express error handlers.
 */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    request_id: string;
    recoverable?: boolean;
  };
}

export function toApiError(
  err: unknown,
  request_id: string
): ApiErrorResponse {
  if (err instanceof TilluError) {
    return {
      error: {
        code: err.code,
        message: err.message,
        request_id,
        recoverable: err.recoverable,
      },
    };
  }
  // Unknown errors — don't expose internals
  return {
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred. Please try again.",
      request_id,
      recoverable: true,
    },
  };
}
