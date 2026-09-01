"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type HealthStatus = "checking" | "healthy" | "degraded" | "failing" | "error";

/**
 * System health badge on the home screen.
 * Polls GET /health for API liveness.
 * Links to /system-health for the full dashboard.
 */
export function SystemHealthBadge() {
  const [status, setStatus] = useState<HealthStatus>("checking");

  useEffect(() => {
    const apiBase =
      process.env["NEXT_PUBLIC_API_BASE_URL"] ?? "http://localhost:3001";

    fetch(`${apiBase}/health`, { signal: AbortSignal.timeout(4000) })
      .then((r) => {
        if (!r.ok) { setStatus("degraded"); return; }
        r.json().then((body: { status?: string }) => {
          if (body.status === "ok")       setStatus("healthy");
          else if (body.status === "degraded") setStatus("degraded");
          else setStatus("error");
        }).catch(() => setStatus("degraded"));
      })
      .catch(() => setStatus("error"));
  }, []);

  const config: Record<HealthStatus, { dot: string; label: string; text: string }> = {
    checking: { dot: "bg-gray-500 animate-pulse", label: "Checking…",       text: "text-gray-500" },
    healthy:  { dot: "bg-green-400",              label: "Tillu is healthy", text: "text-green-400" },
    degraded: { dot: "bg-yellow-400",             label: "Partially available", text: "text-yellow-400" },
    failing:  { dot: "bg-orange-400",             label: "Some issues",      text: "text-orange-400" },
    error:    { dot: "bg-red-400",                label: "Services unavailable", text: "text-red-400" },
  };

  const c = config[status];

  return (
    <Link
      href="/system-health"
      className="flex items-center gap-2 px-1 group"
      aria-label="View system health"
    >
      <div className={`w-2 h-2 rounded-full ${c.dot} shrink-0`} aria-hidden="true" />
      <span className={`text-xs ${c.text} group-hover:underline`}>{c.label}</span>
    </Link>
  );
}
