import type { AgentRequest, AgentResponse } from "@tillu/schemas";
import { createLogger } from "@tillu/logging";

export interface AgentConfig {
  name: string;
  version: string;
}

/**
 * Abstract base class for all Tillu agents.
 *
 * Implement:
 *   handle(request)         → main agent logic
 *   runSyntheticTest()      → synthetic self-test for Sentinel
 *   isReady()               → readiness check
 */
export abstract class AgentBase {
  protected readonly logger;
  private readonly startedAt = Date.now();

  constructor(protected readonly config: AgentConfig) {
    this.logger = createLogger({ service: config.name });
  }

  /** Main execution — implement in each agent */
  abstract handle(request: AgentRequest): Promise<AgentResponse>;

  /** Synthetic test for Sentinel to verify correctness */
  abstract runSyntheticTest(): Promise<{ pass: boolean; details: string }>;

  /** Return false with a reason if agent is not ready to serve requests */
  isReady(): { ready: boolean; reason?: string } {
    return { ready: true };
  }

  getHealthResponse() {
    return {
      status: "ok" as const,
      agent: this.config.name,
      version: this.config.version,
      uptime_sec: Math.floor((Date.now() - this.startedAt) / 1000),
      timestamp: new Date().toISOString(),
    };
  }

  getVersionResponse() {
    return {
      agent: this.config.name,
      version: this.config.version,
    };
  }
}
