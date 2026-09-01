/**
 * Local Agent configuration.
 * All sensitive values come from environment variables — never hardcoded.
 */

import { z } from "zod";

const ConfigSchema = z.object({
  PORT:                  z.string().default("3099"),
  CLOUD_API_URL:         z.string().url().default("http://localhost:3001"),
  LOCAL_AGENT_SECRET:    z.string().min(1),
  /** Comma-separated list of approved domains for Chromium */
  LOCAL_AGENT_ALLOWED_DOMAINS: z.string().default("youtube.com,www.youtube.com"),
  LOCAL_AGENT_SYNC_INTERVAL_MS: z.string().default("30000"),
  LOCAL_QUEUE_PATH:      z.string().default("./data/queue.json"),
  NODE_ENV:              z.string().default("development"),
});

function loadConfig() {
  const result = ConfigSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Local agent configuration error:", result.error.flatten());
    process.exit(1);
  }
  return {
    port:            parseInt(result.data.PORT, 10),
    cloudApiUrl:     result.data.CLOUD_API_URL,
    agentSecret:     result.data.LOCAL_AGENT_SECRET,
    allowedDomains:  result.data.LOCAL_AGENT_ALLOWED_DOMAINS
      .split(",")
      .map((d) => d.trim().toLowerCase()),
    syncIntervalMs:  parseInt(result.data.LOCAL_AGENT_SYNC_INTERVAL_MS, 10),
    queuePath:       result.data.LOCAL_QUEUE_PATH,
    isDev:           result.data.NODE_ENV !== "production",
  };
}

export const config = loadConfig();
export type Config  = typeof config;
