import { describe, expect, it, vi } from "vitest";
import { findOrCreateConversation, type ConversationClient } from "../artifacts/mobile/lib/chat/findOrCreateConversation";

function makeClient(overrides: Partial<ConversationClient["from"]> = {}): ConversationClient {
  return {
    from: ((table: string) => {
      if (table === "conversations") {
        return {
          select: () => ({
            or: () => ({
              limit: () => ({
                maybeSingle: vi.fn(async () => ({ data: null, error: null })),
              }),
            }),
          }),
          insert: () => ({
            select: () => ({
              single: vi.fn(async () => ({ data: { id: "conversation-1" }, error: null })),
            }),
          }),
        };
      }
      return {} as ReturnType<ConversationClient["from"]>;
    }) as ConversationClient["from"],
    ...overrides,
  };
}

describe("findOrCreateConversation", () => {
  it("returns an existing conversation", async () => {
    const maybeSingle = vi.fn(async () => ({ data: { id: "existing-1" }, error: null }));
    const client: ConversationClient = {
      from: () => ({
        select: () => ({
          or: () => ({ limit: () => ({ maybeSingle }) }),
        }),
        insert: vi.fn(),
      } as never),
    };

    const result = await findOrCreateConversation({ myId: "user-1", otherId: "user-2" }, client);

    expect(result).toEqual({ conversationId: "existing-1", error: null });
    expect(maybeSingle).toHaveBeenCalledOnce();
  });

  it("creates a conversation when one does not exist", async () => {
    const single = vi.fn(async () => ({ data: { id: "new-1" }, error: null }));
    const client: ConversationClient = {
      from: () => ({
        select: () => ({
          or: () => ({ limit: () => ({ maybeSingle: vi.fn(async () => ({ data: null, error: null })) }),
        }),
        insert: () => ({ select: () => ({ single }) }),
      } as never),
    };

    const result = await findOrCreateConversation({ myId: "user-1", otherId: "user-2" }, client);

    expect(result).toEqual({ conversationId: "new-1", error: null });
    expect(single).toHaveBeenCalledOnce();
  });

  it("rejects missing data and self-conversations", async () => {
    const client = makeClient();

    expect(await findOrCreateConversation({ myId: "", otherId: "user-2" }, client)).toEqual({
      conversationId: null,
      error: "Faltan datos obligatorios",
    });

    expect(await findOrCreateConversation({ myId: "user-1", otherId: "user-1" }, client)).toEqual({
      conversationId: null,
      error: "No se puede crear una conversación contigo mismo",
    });
  });

  it("handles database failures without throwing", async () => {
    const client: ConversationClient = {
      from: () => ({
        select: () => ({
          or: () => ({
            limit: () => ({ maybeSingle: vi.fn(async () => ({ data: null, error: { message: "DB offline" } })) }),
          }),
        }),
        insert: vi.fn(),
      } as never),
    };

    const result = await findOrCreateConversation({ myId: "user-1", otherId: "user-2" }, client);

    expect(result).toEqual({ conversationId: null, error: "DB offline" });
  });
});
