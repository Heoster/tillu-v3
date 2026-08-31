import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotificationService, SendNotificationSchema } from "../services/notification.service.js";
import { ValidationError } from "@tillu/utilities";
import { EventBus } from "@tillu/events";

vi.mock("@tillu/database", () => ({ getServiceClient: vi.fn() }));
import { getServiceClient } from "@tillu/database";
const mockGet = vi.mocked(getServiceClient);

const STUDENT_ID = "550e8400-e29b-41d4-a716-446655440001";

function makeEventBus(): EventBus {
  return {
    emit: vi.fn().mockResolvedValue("evt-id"),
    isProcessed: vi.fn().mockResolvedValue(false),
    markProcessed: vi.fn().mockResolvedValue(undefined),
  } as unknown as EventBus;
}

const BASE_INPUT = {
  student_id:        STUDENT_ID,
  notification_type: "REVISION_DUE",
  priority:          "normal" as const,
  title:             "Ray Optics revision due",
  body:              "Integration is due for review.",
  dedupe_key:        "REVISION_DUE:concept-1:2026-08-31",
};

// ── Schema validation ──────────────────────────────────────────────────────

describe("SendNotificationSchema", () => {
  it("accepts valid notification", () => {
    expect(SendNotificationSchema.safeParse(BASE_INPUT).success).toBe(true);
  });

  it("rejects empty title", () => {
    expect(SendNotificationSchema.safeParse({ ...BASE_INPUT, title: "" }).success).toBe(false);
  });

  it("rejects invalid priority", () => {
    expect(SendNotificationSchema.safeParse({ ...BASE_INPUT, priority: "urgent" }).success).toBe(false);
  });

  it("rejects title over 100 chars", () => {
    expect(SendNotificationSchema.safeParse({ ...BASE_INPUT, title: "A".repeat(101) }).success).toBe(false);
  });

  it("defaults force to false", () => {
    const r = SendNotificationSchema.safeParse(BASE_INPUT);
    if (r.success) expect(r.data.force).toBe(false);
  });
});

// ── Deduplication — NOTIF-002 ─────────────────────────────────────────────────

describe("NotificationService — deduplication", () => {
  it("returns 'duplicate' decision when same dedupe_key already exists", async () => {
    mockGet.mockReturnValue({
      from: vi.fn().mockImplementation((t: string) => {
        if (t === "notifications") return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: "notif-1", status: "sent" }, error: null }) };
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null }) };
      }),
    } as never);

    const svc = new NotificationService(makeEventBus());
    const result = await svc.send(BASE_INPUT);

    expect(result.decision).toBe("duplicate");
    expect(result.notification_id).toBe("notif-1");
  });

  it("does NOT create a second notification for same dedupe_key", async () => {
    const insertFn = vi.fn().mockReturnValue({ select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: "n-new" }, error: null }) });

    mockGet.mockReturnValue({
      from: vi.fn().mockImplementation((t: string) => {
        if (t === "notifications") return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: "notif-1", status: "sent" }, error: null }), insert: insertFn };
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null }) };
      }),
    } as never);

    const svc = new NotificationService(makeEventBus());
    await svc.send(BASE_INPUT);

    // Insert must NOT have been called (duplicate check stopped it)
    expect(insertFn).not.toHaveBeenCalled();
  });
});

// ── Presence-based suppression ────────────────────────────────────────────────

describe("NotificationService — presence filtering", () => {
  function makeDbWithPresence(state: string, existingNotif = false) {
    const insertFn = vi.fn().mockReturnValue({ select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: "notif-new" }, error: null }) });
    return {
      from: vi.fn().mockImplementation((t: string) => {
        if (t === "notifications") return {
          select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: existingNotif ? { id: "n-1", status: "sent" } : null, error: null }),
          insert: insertFn,
        };
        if (t === "presence_state") return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { state }, error: null }) };
        if (t === "student_preferences") return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), in: vi.fn().mockResolvedValue({ data: [], error: null }) };
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null }) };
      }),
    };
  }

  it("sends normal notification when student is AVAILABLE", async () => {
    mockGet.mockReturnValue(makeDbWithPresence("AVAILABLE") as never);
    const svc = new NotificationService(makeEventBus());
    const result = await svc.send(BASE_INPUT);
    expect(result.decision).toBe("sent");
  });

  it("queues normal notification when student is STUDYING", async () => {
    mockGet.mockReturnValue(makeDbWithPresence("STUDYING") as never);
    const svc = new NotificationService(makeEventBus());
    const result = await svc.send(BASE_INPUT);
    expect(["queued", "blocked_presence"]).toContain(result.decision);
  });

  it("queues normal notification when student is SLEEPING", async () => {
    mockGet.mockReturnValue(makeDbWithPresence("SLEEPING") as never);
    const svc = new NotificationService(makeEventBus());
    const result = await svc.send(BASE_INPUT);
    expect(result.decision).toBe("queued");
  });

  it("sends CRITICAL notification even when student is SLEEPING", async () => {
    mockGet.mockReturnValue(makeDbWithPresence("SLEEPING") as never);
    const svc = new NotificationService(makeEventBus());
    const result = await svc.send({ ...BASE_INPUT, priority: "critical", dedupe_key: "CRITICAL:exam:2026-08-31" });
    expect(result.decision).toBe("sent");
  });
});

// ── sendForEvent helper ───────────────────────────────────────────────────────

describe("NotificationService.sendForEvent", () => {
  it("builds dedupe_key as eventType:entityId:YYYY-MM-DD", async () => {
    const insertFn = vi.fn().mockReturnValue({ select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: "n-1" }, error: null }) });

    mockGet.mockReturnValue({
      from: vi.fn().mockImplementation((t: string) => {
        if (t === "notifications") return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: null }), insert: insertFn };
        if (t === "presence_state") return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { state: "AVAILABLE" }, error: null }) };
        if (t === "student_preferences") return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), in: vi.fn().mockResolvedValue({ data: [], error: null }) };
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null }) };
      }),
    } as never);

    const svc = new NotificationService(makeEventBus());
    await svc.sendForEvent(STUDENT_ID, "REVISION_DUE", {
      title: "Integration is due",
      body:  "Review now.",
      entityId: "concept-123",
    });

    const insertArg = insertFn.mock.calls[0]?.[0] as Record<string, unknown>;
    const today = new Date().toISOString().slice(0, 10);
    expect(insertArg["dedupe_key"]).toBe(`REVISION_DUE:concept-123:${today}`);
  });
});

// ── Event emission ────────────────────────────────────────────────────────────

describe("NotificationService — NOTIFICATION_SENT event", () => {
  it("emits NOTIFICATION_SENT when notification is sent (not queued)", async () => {
    mockGet.mockReturnValue({
      from: vi.fn().mockImplementation((t: string) => {
        if (t === "notifications") return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: null }), insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: "n-1" }, error: null }) }) };
        if (t === "presence_state") return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { state: "AVAILABLE" }, error: null }) };
        if (t === "student_preferences") return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), in: vi.fn().mockResolvedValue({ data: [], error: null }) };
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null }) };
      }),
    } as never);

    const bus = makeEventBus();
    const svc = new NotificationService(bus);
    await svc.send(BASE_INPUT);

    expect(bus.emit).toHaveBeenCalledWith(
      "NOTIFICATION_SENT", STUDENT_ID,
      expect.objectContaining({ notification_type: "REVISION_DUE" }),
      expect.any(Object)
    );
  });

  it("does NOT emit NOTIFICATION_SENT for duplicate notifications", async () => {
    mockGet.mockReturnValue({
      from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: "n-1", status: "sent" }, error: null }) }),
    } as never);

    const bus = makeEventBus();
    const svc = new NotificationService(bus);
    await svc.send(BASE_INPUT);

    expect(bus.emit).not.toHaveBeenCalled();
  });
});
