export type AgentRuntime = "vercel" | "render" | "local";
export type AgentDefinition = {
  name: string;
  version: "v1";
  runtime: AgentRuntime;
  path: string;
  description: string;
  env: string[];
};

export const agentRegistry: AgentDefinition[] = [
  { name: "research", version: "v1", runtime: "vercel", path: "/v1/research", description: "Grounded web and CBSE document research", env: ["TAVILY_API_KEY", "MODEL_ROUTER_URL"] },
  { name: "tutor", version: "v1", runtime: "vercel", path: "/v1/tutor", description: "Curriculum-aware tutoring", env: ["MODEL_ROUTER_URL", "RESEARCH_AGENT_URL"] },
  { name: "revision", version: "v1", runtime: "vercel", path: "/v1/revision", description: "Spaced revision scheduling", env: ["DATABASE_URL"] },
  { name: "quiz", version: "v1", runtime: "vercel", path: "/v1/quiz", description: "Adaptive quiz generation", env: ["MODEL_ROUTER_URL"] },
  { name: "planner", version: "v1", runtime: "vercel", path: "/v1/planner", description: "Study planning", env: ["DATABASE_URL", "MODEL_ROUTER_URL"] },
  { name: "exam", version: "v1", runtime: "vercel", path: "/v1/exam", description: "Exam simulation", env: ["MODEL_ROUTER_URL"] },
  { name: "formula", version: "v1", runtime: "vercel", path: "/v1/formula", description: "Formula lookup and explanation", env: ["DATABASE_URL"] },
  { name: "mistake", version: "v1", runtime: "vercel", path: "/v1/mistake", description: "Mistake bank analysis", env: ["DATABASE_URL", "MODEL_ROUTER_URL"] },
  { name: "sentinel", version: "v1", runtime: "vercel", path: "/v1/sentinel", description: "Agent health monitoring", env: ["AGENT_REGISTRY_URL"] },
  { name: "quota", version: "v1", runtime: "vercel", path: "/v1/quota", description: "Provider quota governance", env: [] },
  { name: "notifications", version: "v1", runtime: "vercel", path: "/v1/notifications", description: "Notification delivery and deduplication", env: ["DATABASE_URL"] },
  { name: "nba", version: "v1", runtime: "vercel", path: "/v1/nba", description: "Next best study action", env: ["DATABASE_URL", "MODEL_ROUTER_URL"] },
  { name: "local-lecture", version: "v1", runtime: "local", path: "/v1/lecture", description: "Local Chromium and PDF lecture ingestion", env: ["LOCAL_AGENT_SHARED_SECRET"] },
  { name: "presence", version: "v1", runtime: "local", path: "/v1/presence", description: "Local browser presence signals", env: ["LOCAL_AGENT_SHARED_SECRET"] },
];

export function getAgent(name: string): AgentDefinition | undefined {
  return agentRegistry.find((agent) => agent.name === name);
}
