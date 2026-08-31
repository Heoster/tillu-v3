/**
 * Circuit breaker implementation.
 * Used by ModelRouter to protect against repeatedly failing AI providers.
 *
 * States:
 *   CLOSED    → normal operation; all requests pass through
 *   OPEN      → provider failing; requests immediately rejected; cooldown timer running
 *   HALF_OPEN → cooldown expired; one test request sent; success → CLOSED; fail → OPEN
 */

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerOptions {
  failureThreshold: number;  // failures before opening
  cooldownMs: number;        // ms to wait before HALF_OPEN test
  name?: string;             // for logging
}

export class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failureCount = 0;
  private lastFailureAt: number | null = null;
  private readonly name: string;

  constructor(private readonly options: CircuitBreakerOptions) {
    this.name = options.name ?? "circuit_breaker";
  }

  /**
   * Execute a function through the circuit breaker.
   * Throws if the circuit is OPEN.
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.checkState();

    if (this.state === "OPEN") {
      throw new Error(
        `Circuit breaker OPEN for "${this.name}". Provider is unavailable.`
      );
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  getState(): CircuitState {
    this.checkState();
    return this.state;
  }

  private checkState(): void {
    if (this.state === "OPEN" && this.lastFailureAt !== null) {
      const elapsed = Date.now() - this.lastFailureAt;
      if (elapsed >= this.options.cooldownMs) {
        this.state = "HALF_OPEN";
      }
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = "CLOSED";
    this.lastFailureAt = null;
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureAt = Date.now();

    if (
      this.state === "HALF_OPEN" ||
      this.failureCount >= this.options.failureThreshold
    ) {
      this.state = "OPEN";
    }
  }
}
