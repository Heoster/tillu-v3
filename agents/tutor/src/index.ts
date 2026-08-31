import { AgentBase, createAgentServer } from "@tillu/agent-sdk";
import type { AgentRequest, AgentResponse } from "@tillu/schemas";
import { handleTutor, syntheticTest } from "./handler.js";

class TutorAgent extends AgentBase {
  constructor() {
    super({ name: "tutor_agent", version: process.env["AGENT_VERSION"] ?? "1.0.0" });
  }

  async handle(request: AgentRequest): Promise<AgentResponse> {
    const start = Date.now();
    try {
      const result = await handleTutor(request.payload as Record<string, unknown>);
      return {
        request_id: request.request_id, status: "success",
        agent: this.config.name, version: this.config.version,
        result, errors: [], latency_ms: Date.now() - start,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      return {
        request_id: request.request_id, status: "error",
        agent: this.config.name, version: this.config.version,
        result: null,
        errors: [{
          code: (err as { code?: string }).code ?? "TUTOR_ERROR",
          message: err instanceof Error ? err.message : String(err),
          recoverable: true,
        }],
        latency_ms: Date.now() - start,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async runSyntheticTest() { return syntheticTest(); }
}

const PORT = parseInt(process.env["AGENT_PORT"] ?? "3102", 10);
const app = createAgentServer(new TutorAgent());
app.listen(PORT, () => console.log(`Tutor Agent listening on port ${PORT}`));
