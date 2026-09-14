import { describe, expect, it, vi } from "vitest";
import { toggleSavedVideo, type SavedVideoClient } from "../artifacts/mobile/lib/video/toggleSavedVideo";

const input = {
  userId: "user-123",
  videoId: "1",
};

function createClient(overrides: Partial<SavedVideoClient> = {}): SavedVideoClient {
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

describe("toggleSavedVideo", () => {
  it("saves a video", async () => {
    const client = createClient();

    const result = await toggleSavedVideo({ ...input, saved: false }, client);

    expect(result).toEqual({ saved: true, error: null });
    expect(client.from).toHaveBeenCalledWith("saved_videos");
  });

  it("removes a saved video", async () => {
    const client = createClient();

    const result = await toggleSavedVideo({ ...input, saved: true }, client);

    expect(result).toEqual({ saved: false, error: null });
    expect(client.from).toHaveBeenCalledWith("saved_videos");
  });

  it("rejects missing data without calling the database", async () => {
    const client = createClient();

    const result = await toggleSavedVideo({ ...input, videoId: "", saved: false }, client);

    expect(result).toEqual({ saved: false, error: "Faltan datos obligatorios" });
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

    await expect(toggleSavedVideo({ ...input, saved: false }, client)).resolves.toEqual({
      saved: false,
      error: "Base de datos no disponible",
    });
  });
});
