import { describe, expect, it, vi } from "vitest";
import { createComment, type CommentClient } from "../artifacts/mobile/lib/video/createComment";

const input = {
  userId: "user-123",
  videoId: "1",
  username: "usuario123",
  avatarUrl: null,
  text: "Excelente video",
};

function createClient(overrides: Partial<CommentClient> = {}): CommentClient {
  return {
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ data: { id: "comment-123" }, error: null }),
    })),
    ...overrides,
  };
}

describe("createComment", () => {
  it("creates a valid comment", async () => {
    const client = createClient();

    const result = await createComment(input, client);

    expect(result).toEqual({ error: null, commentId: "comment-123" });
    expect(client.from).toHaveBeenCalledWith("comments");
  });

  it("rejects an empty comment without calling the database", async () => {
    const client = createClient();

    const result = await createComment({ ...input, text: "   " }, client);

    expect(result).toEqual({ error: "El comentario no puede estar vacío" });
    expect(client.from).not.toHaveBeenCalled();
  });

  it("rejects a comment longer than 500 characters", async () => {
    const client = createClient();

    const result = await createComment({ ...input, text: "a".repeat(501) }, client);

    expect(result).toEqual({ error: "El comentario no puede superar los 500 caracteres" });
    expect(client.from).not.toHaveBeenCalled();
  });

  it("handles a database failure without throwing", async () => {
    const client = createClient({
      from: vi.fn(() => ({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Base de datos no disponible" },
        }),
      })),
    });

    await expect(createComment(input, client)).resolves.toEqual({
      error: "Base de datos no disponible",
    });
  });
});
