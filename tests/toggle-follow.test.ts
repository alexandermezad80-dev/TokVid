import { describe, expect, it, vi } from "vitest";
import { toggleFollow, type FollowClient } from "../artifacts/mobile/lib/video/toggleFollow";

const input = {
  userId: "user-123",
  creatorId: "creator-456",
  following: false,
};

function createClient(overrides: Partial<FollowClient> = {}): FollowClient {
  return {
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn(() => ({
        match: vi.fn().mockResolvedValue({ error: null }),
      })),
    })),
    ...overrides,
  };
}

describe("toggleFollow", () => {
  it("follows a creator", async () => {
    const client = createClient();

    const result = await toggleFollow(input, client);

    expect(result).toEqual({ following: true, error: null });
    expect(client.from).toHaveBeenCalledWith("follows");
  });

  it("unfollows a creator", async () => {
    const client = createClient();

    const result = await toggleFollow({ ...input, following: true }, client);

    expect(result).toEqual({ following: false, error: null });
    expect(client.from).toHaveBeenCalledWith("follows");
  });

  it("rejects following yourself without calling the database", async () => {
    const client = createClient();

    const result = await toggleFollow(
      { ...input, creatorId: input.userId },
      client,
    );

    expect(result).toEqual({ following: false, error: "No puedes seguirte a ti mismo" });
    expect(client.from).not.toHaveBeenCalled();
  });

  it("rejects missing data without calling the database", async () => {
    const client = createClient();

    const result = await toggleFollow({ ...input, creatorId: "" }, client);

    expect(result).toEqual({ following: false, error: "Faltan datos obligatorios" });
    expect(client.from).not.toHaveBeenCalled();
  });

  it("handles a database failure without throwing", async () => {
    const client = createClient({
      from: vi.fn(() => ({
        insert: vi.fn().mockResolvedValue({
          error: { message: "Base de datos no disponible" },
        }),
        delete: vi.fn(() => ({
          match: vi.fn().mockResolvedValue({
            error: { message: "Base de datos no disponible" },
          }),
        })),
      })),
    });

    await expect(toggleFollow(input, client)).resolves.toEqual({
      following: false,
      error: "Base de datos no disponible",
    });
  });
});
