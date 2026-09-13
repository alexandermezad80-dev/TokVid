import { describe, expect, it, vi } from "vitest";
import { toggleVideoLike, type VideoLikeClient } from "../artifacts/mobile/lib/video/toggleVideoLike";

function createClient(overrides: Partial<VideoLikeClient> = {}): VideoLikeClient {
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

const input = {
  userId: "user-123",
  videoId: "1",
};

describe("toggleVideoLike", () => {
  it("adds a like when the video is not liked", async () => {
    const client = createClient();

    const result = await toggleVideoLike({ ...input, liked: false }, client);

    expect(result).toEqual({ liked: true, error: null });
    expect(client.from).toHaveBeenCalledWith("video_likes");
  });

  it("removes a like when the video is already liked", async () => {
    const client = createClient();

    const result = await toggleVideoLike({ ...input, liked: true }, client);

    expect(result).toEqual({ liked: false, error: null });
    expect(client.from).toHaveBeenCalledWith("video_likes");
  });

  it("rejects missing data without calling the database", async () => {
    const client = createClient();

    const result = await toggleVideoLike({ ...input, videoId: "", liked: false }, client);

    expect(result).toEqual({ liked: false, error: "Faltan datos obligatorios" });
    expect(client.from).not.toHaveBeenCalled();
  });

  it("handles a database failure without throwing", async () => {
    const client = createClient({
      from: vi.fn(() => ({
        insert: vi.fn().mockResolvedValue({ error: { message: "Base de datos no disponible" } }),
        delete: vi.fn(() => ({
          match: vi.fn().mockResolvedValue({ error: null }),
        })),
      })),
    });

    await expect(toggleVideoLike({ ...input, liked: false }, client)).resolves.toEqual({
      liked: false,
      error: "Base de datos no disponible",
    });
  });
});
