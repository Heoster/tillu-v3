/**
 * Research Agent — Entry Point
 * Implements the standard Tillu agent contract via @tillu/agent-sdk.
 */

import { AgentBase, createAgentServer } from "@tillu/agent-sdk";
import type { AgentRequest, AgentResponse } from "@tillu/schemas";
import { v4 as uuidv4 } from "uuid";
import { handleResearch, syntheticTest } from "./handler.js";

class ResearchAgent extends AgentBase {
  constructor() {
    super({
      name: "research_agent",
      version: process.env["AGENT_VERSION"] ?? "1.0.0",
    });
  }

  async handle(request: AgentRequest): Promise<AgentResponse> {
    const start = Date.now();
    try {
      const result = await handleResearch(request.payload as Record<string, unknown>);
      return {
        request_id: request.request_id,
        status: "success",
        agent: this.config.name,
        version: this.config.version,
        result,
        errors: [],
        latency_ms: Date.now() - start,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      return {
        request_id: request.request_id,
        status: "error",
        agent: this.config.name,
        version: this.config.version,
        result: null,
        errors: [{
          code: err instanceof Error ? (err as { code?: string }).code ?? "RESEARCH_ERROR" : "RESEARCH_ERROR",
          message: err instanceof Error ? err.message : String(err),
          recoverable: true,
        }],
        latency_ms: Date.now() - start,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async runSyntheticTest() {
    return syntheticTest();
  }
}

const PORT = parseInt(process.env["AGENT_PORT"] ?? "3101", 10);
const agent = new ResearchAgent();
const app = createAgentServer(agent);

app.listen(PORT, () => {
  console.log(`Research Agent listening on port ${PORT}`);
});
