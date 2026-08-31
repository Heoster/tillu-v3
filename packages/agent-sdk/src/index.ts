/**
 * @tillu/agent-sdk
 *
 * Base Express server and contract implementation for all Tillu agents.
 *
 * Every agent extends AgentBase and gets:
 *   GET  /health
 *   GET  /ready
 *   GET  /version
 *   POST /test   → calls agent.runSyntheticTest()
 *   POST /run    → calls agent.handle() with validated request envelope
 *
 * Phase 0: skeleton — full implementation in Phase 1.
 */

export { AgentBase } from "./agent-base.js";
export { createAgentServer } from "./server.js";
export type { AgentConfig } from "./agent-base.js";
