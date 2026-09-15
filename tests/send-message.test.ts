import { describe, expect, it, vi } from "vitest";
import { sendMessage, type MessageClient } from "../artifacts/mobile/lib/chat/sendMessage";

const input = {
  userId: "user-123",
  conversationId: "conversation-456",
  text: "Hola, ¿cómo estás?",
};

function createClient(overrides: Partial<MessageClient> = {}): MessageClient {
  return {
    from: vi.fn((table: string) => {
      if (table === "messages") {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { id: "message-123" }, error: null }),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        };
      }

      return {
        insert: vi.fn(),
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      };
    }),
    ...overrides,
  };
}

describe("sendMessage", () => {
  it("sends a valid message without directly updating conversation preview metadata", async () => {
    const client = createClient();

    const result = await sendMessage(input, client);

    expect(result).toEqual({ error: null, messageId: "message-123" });
    expect(client.from).toHaveBeenCalledWith("messages");
    expect(client.from).not.toHaveBeenCalledWith("conversations");
  });

  it("rejects an empty message without calling the database", async () => {
    const client = createClient();

    const result = await sendMessage({ ...input, text: "   " }, client);

    expect(result).toEqual({ error: "El mensaje no puede estar vacío" });
    expect(client.from).not.toHaveBeenCalled();
  });

  it("rejects a message longer than 1000 characters", async () => {
    const client = createClient();

    const result = await sendMessage({ ...input, text: "a".repeat(1001) }, client);

    expect(result).toEqual({ error: "El mensaje no puede superar los 1000 caracteres" });
    expect(client.from).not.toHaveBeenCalled();
  });

  it("handles a database failure without throwing", async () => {
    const client = createClient({
      from: vi.fn((table: string) => {
        if (table === "messages") {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: "Base de datos no disponible" },
                }),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          };
        }

        return {
          insert: vi.fn(),
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        };
      }),
    });

    await expect(sendMessage(input, client)).resolves.toEqual({
      error: "Base de datos no disponible",
    });
  });
});
