"use client";

import { useEffect, useState } from "react";

type HealthStatus = "checking" | "healthy" | "degraded" | "error";

export function SystemHealthBadge() {
  const [status, setStatus] = useState<HealthStatus>("checking");

  useEffect(() => {
    const apiBase = process.env["NEXT_PUBLIC_API_BASE_URL"] ?? "http://localhost:3001";
    fetch(`${apiBase}/health`, { signal: AbortSignal.timeout(4000) })
      .then((r) => {
        setStatus(r.ok ? "healthy" : "degraded");
      })
      .catch(() => setStatus("error"));
  }, []);

  const config: Record<HealthStatus, { dot: string; label: string; text: string }> = {
    checking: { dot: "bg-gray-500",  label: "Checking…",       text: "text-gray-400" },
    healthy:  { dot: "bg-green-400", label: "Tillu is healthy", text: "text-green-400" },
    degraded: { dot: "bg-yellow-400",label: "Partially available", text: "text-yellow-400" },
    error:    { dot: "bg-red-400",   label: "Services unavailable", text: "text-red-400" },
  };

  const c = config[status];

  return (
    <div className="flex items-center gap-2 px-1">
      <div className={`w-2 h-2 rounded-full ${c.dot}`} aria-hidden="true" />
      <span className={`text-xs ${c.text}`}>{c.label}</span>
    </div>
  );
}
