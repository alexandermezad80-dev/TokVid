import { describe, expect, it, vi } from "vitest";
import { shareVideo, type ShareVideoClient } from "../artifacts/mobile/lib/video/shareVideo";

function createClient(overrides: Partial<ShareVideoClient> = {}): ShareVideoClient {
  return {
    from: vi.fn((table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue(
            table === "videos"
              ? { data: { shares_count: 3 }, error: null }
              : { data: null, error: null },
          ),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    })),
    ...overrides,
  };
}

describe("shareVideo", () => {
  it("increments the share count for an existing video", async () => {
    const client = createClient();

    const result = await shareVideo({ videoId: "video-123" }, client);

    expect(result).toEqual({ shared: true, error: null });
    expect(client.from).toHaveBeenCalledWith("videos");
  });

  it("rejects missing video data without calling the database", async () => {
    const client = createClient();

    const result = await shareVideo({ videoId: "" }, client);

    expect(result).toEqual({ shared: false, error: "Faltan datos obligatorios" });
    expect(client.from).not.toHaveBeenCalled();
  });

  it("handles a missing video without throwing", async () => {
    const client = createClient({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      })),
    });

    await expect(shareVideo({ videoId: "video-404" }, client)).resolves.toEqual({
      shared: false,
      error: "No se encontró el video",
    });
  });

  it("handles a database failure without throwing", async () => {
    const client = createClient({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "Base de datos no disponible" },
            }),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      })),
    });

    await expect(shareVideo({ videoId: "video-123" }, client)).resolves.toEqual({
      shared: false,
      error: "Base de datos no disponible",
    });
  });
});
