/**
 * Typed API client for the Tillu Core API.
 * All fetch calls from the web app go through this file.
 */

const API_BASE = process.env["NEXT_PUBLIC_API_BASE_URL"] ?? "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, ...init } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: { code?: string; message?: string } };
    throw new ApiError(
      body.error?.code ?? "UNKNOWN_ERROR",
      body.error?.message ?? "An unexpected error occurred",
      res.status
    );
  }

  return res.json() as Promise<T>;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AuthResult {
  user: { id: string; email: string };
  access_token: string;
  refresh_token: string;
}

export const authApi = {
  register: (name: string, email: string, password: string) =>
    apiFetch<AuthResult>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),

  login: (email: string, password: string) =>
    apiFetch<AuthResult>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  me: (token: string) =>
    apiFetch<{ user: { id: string; email: string }; profile: unknown }>("/auth/me", { token }),
};

// ── Syllabus ──────────────────────────────────────────────────────────────────

export const syllabusApi = {
  getOverview: (token: string) =>
    apiFetch<unknown[]>("/syllabus", { token }),

  getSubjects: (token: string) =>
    apiFetch<unknown[]>("/syllabus/subjects", { token }),

  getChapters: (token: string, subjectId: string) =>
    apiFetch<unknown>(`/syllabus/chapters/${subjectId}`, { token }),

  getConcepts: (token: string, chapterId: string) =>
    apiFetch<unknown>(`/syllabus/concepts/${chapterId}`, { token }),
};

// ── Sessions ──────────────────────────────────────────────────────────────────

export interface StudySession {
  id: string;
  activity_type: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  actual_duration_min: number | null;
  planned_duration_min: number | null;
  subject_id: string | null;
  chapter_id: string | null;
}

export interface TodaySummary {
  total_sessions: number;
  completed_sessions: number;
  total_minutes: number;
  sessions: StudySession[];
}

export const sessionsApi = {
  start: (
    token: string,
    data: {
      subject_id?: string;
      chapter_id?: string;
      activity_type?: string;
      planned_duration_min?: number;
    }
  ) =>
    apiFetch<StudySession>("/sessions/start", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    }),

  end: (token: string, sessionId: string, outcome: "completed" | "abandoned" = "completed") =>
    apiFetch<StudySession>(`/sessions/${sessionId}/end`, {
      method: "POST",
      token,
      body: JSON.stringify({ outcome }),
    }),

  pause: (token: string, sessionId: string) =>
    apiFetch<StudySession>(`/sessions/${sessionId}/pause`, { method: "POST", token }),

  resume: (token: string, sessionId: string) =>
    apiFetch<StudySession>(`/sessions/${sessionId}/resume`, { method: "POST", token }),

  list: (token: string, limit = 20) =>
    apiFetch<StudySession[]>(`/sessions?limit=${limit}`, { token }),

  today: (token: string) =>
    apiFetch<TodaySummary>("/sessions/today", { token }),
};

// ── Profile ───────────────────────────────────────────────────────────────────

export const profileApi = {
  get: (token: string) => apiFetch<unknown>("/profile", { token }),

  update: (token: string, data: { name?: string; exam_date?: string }) =>
    apiFetch<unknown>("/profile", { method: "PUT", token, body: JSON.stringify(data) }),

  updateSubjects: (token: string, subject_ids: string[]) =>
    apiFetch<unknown>("/profile/subjects", {
      method: "PUT",
      token,
      body: JSON.stringify({ subject_ids }),
    }),

  updateAvailability: (
    token: string,
    data: {
      windows: Array<{ day: string; start_time: string; end_time: string }>;
      sleep_start?: string;
      sleep_end?: string;
    }
  ) =>
    apiFetch<unknown>("/profile/availability", {
      method: "PUT",
      token,
      body: JSON.stringify(data),
    }),
};
