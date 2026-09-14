import { describe, expect, it, vi } from "vitest";
import {
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationClient,
} from "../artifacts/mobile/lib/notifications/notificationActions";

function createClient(overrides: Partial<NotificationClient> = {}): NotificationClient {
  return {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    })),
    ...overrides,
  };
}

describe("notification actions", () => {
  it("marks one notification as read", async () => {
    const client = createClient();

    const result = await markNotificationRead("notification-123", client);

    expect(result).toEqual({ error: null });
    expect(client.from).toHaveBeenCalledWith("notifications");
  });

  it("marks all user notifications as read", async () => {
    const client = createClient();

    const result = await markAllNotificationsRead("user-123", client);

    expect(result).toEqual({ error: null });
    expect(client.from).toHaveBeenCalledWith("notifications");
  });

  it("rejects missing notification data without calling the database", async () => {
    const client = createClient();

    const result = await markNotificationRead("", client);

    expect(result).toEqual({ error: "Faltan datos obligatorios" });
    expect(client.from).not.toHaveBeenCalled();
  });

  it("handles a database failure without throwing", async () => {
    const client = createClient({
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            error: { message: "Base de datos no disponible" },
          }),
        })),
      })),
    });

    await expect(markAllNotificationsRead("user-123", client)).resolves.toEqual({
      error: "Base de datos no disponible",
    });
  });
});
