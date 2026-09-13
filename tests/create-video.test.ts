import { describe, expect, it, vi } from "vitest";
import { createVideo, type VideoStorageClient } from "../artifacts/mobile/lib/video/createVideo";

function createClient(overrides: Partial<VideoStorageClient> = {}): VideoStorageClient {
  return {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: "https://example.com/video.mp4" } })),
      })),
    },
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: "video-123" }, error: null }),
        })),
      })),
    })),
    ...overrides,
  };
}

const input = {
  userId: "user-123",
  videoUri: "file:///video.mp4",
  caption: "Mi primer video",
};

const fetchFile = vi.fn().mockResolvedValue({
  ok: true,
  blob: vi.fn().mockResolvedValue(new Blob(["video"])),
});

describe("createVideo", () => {
  it("uploads the video and creates the publication", async () => {
    const client = createClient();

    const result = await createVideo(input, client, fetchFile);

    expect(result).toEqual({
      error: null,
      videoId: "video-123",
      publicUrl: "https://example.com/video.mp4",
    });
    expect(client.storage.from).toHaveBeenCalledWith("videos");
    expect(client.from).toHaveBeenCalledWith("videos");
  });

  it("rejects missing data without calling external services", async () => {
    const client = createClient();
    const result = await createVideo({ ...input, videoUri: "" }, client, fetchFile);

    expect(result).toEqual({ error: "Faltan datos obligatorios" });
    expect(fetchFile).not.toHaveBeenCalled();
  });

  it("handles a publication system failure without throwing", async () => {
    const client = createClient({
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "Base de datos no disponible" },
            }),
          })),
        })),
      })),
    });

    await expect(createVideo(input, client, fetchFile)).resolves.toEqual({
      error: "Base de datos no disponible",
    });
  });
});
