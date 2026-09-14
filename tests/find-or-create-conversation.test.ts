import { describe, expect, it, vi } from "vitest";
import { findOrCreateConversation, type ConversationClient } from "../artifacts/mobile/lib/chat/findOrCreateConversation";

function clientWithLookup(
  lookup: () => Promise<{ data: { id: string } | null; error: { message: string } | null }>,
  insert: () => Promise<{ data: { id: string } | null; error: { message: string } | null }>,
): ConversationClient {
  return {
    from: () => ({
      select: () => ({
        or: () => ({
          limit: () => ({ maybeSingle: lookup }),
        }),
      }),
      insert: () => ({
        select: () => ({ single: insert }),
      }),
    } as never),
  };
}

describe("findOrCreateConversation", () => {
  it("returns an existing conversation", async () => {
    const lookup = vi.fn(async () => ({ data: { id: "existing-1" }, error: null }));
    const insert = vi.fn(async () => ({ data: { id: "unused" }, error: null }));
    const client = clientWithLookup(lookup, insert);

    const result = await findOrCreateConversation({ myId: "user-1", otherId: "user-2" }, client);

    expect(result).toEqual({ conversationId: "existing-1", error: null });
    expect(lookup).toHaveBeenCalledOnce();
    expect(insert).not.toHaveBeenCalled();
  });

  it("creates a conversation when one does not exist", async () => {
    const lookup = vi.fn(async () => ({ data: null, error: null }));
    const insert = vi.fn(async () => ({ data: { id: "new-1" }, error: null }));
    const client = clientWithLookup(lookup, insert);

    const result = await findOrCreateConversation({ myId: "user-1", otherId: "user-2" }, client);

    expect(result).toEqual({ conversationId: "new-1", error: null });
    expect(insert).toHaveBeenCalledOnce();
  });

  it("rejects missing data and self-conversations", async () => {
    const lookup = vi.fn(async () => ({ data: null, error: null }));
    const insert = vi.fn(async () => ({ data: { id: "unused" }, error: null }));
    const client = clientWithLookup(lookup, insert);

    expect(await findOrCreateConversation({ myId: "", otherId: "user-2" }, client)).toEqual({
      conversationId: null,
      error: "Faltan datos obligatorios",
    });

    expect(await findOrCreateConversation({ myId: "user-1", otherId: "user-1" }, client)).toEqual({
      conversationId: null,
      error: "No se puede crear una conversación contigo mismo",
    });

    expect(lookup).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("handles database failures without throwing", async () => {
    const lookup = vi.fn(async () => ({ data: null, error: { message: "DB offline" } }));
    const insert = vi.fn(async () => ({ data: { id: "unused" }, error: null }));
    const client = clientWithLookup(lookup, insert);

    const result = await findOrCreateConversation({ myId: "user-1", otherId: "user-2" }, client);

    expect(result).toEqual({ conversationId: null, error: "DB offline" });
    expect(insert).not.toHaveBeenCalled();
  });
});
