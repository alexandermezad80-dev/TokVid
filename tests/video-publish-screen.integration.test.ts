import { describe, expect, it, vi } from "vitest";
import { submitVideoFromScreen } from "../artifacts/mobile/components/VideoPublishScreen";
import type { VideoStorageClient } from "../artifacts/mobile/lib/video/createVideo";

function createClient(): VideoStorageClient {
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
          single: vi.fn().mockResolvedValue({ data: { id: "video-456" }, error: null }),
        })),
      })),
    })),
  };
}

describe("VideoPublishScreen integration", () => {
  it("simulates entering a caption and pressing Publish", async () => {
    const client = createClient();
    const captionTypedByUser = "Mi video desde la pantalla de publicación";
    const fetchFile = vi.fn().mockResolvedValue({
      ok: true,
      blob: vi.fn().mockResolvedValue(new Blob(["video"])),
    });

    const result = await submitVideoFromScreen(
      {
        userId: "user-123",
        videoUri: "file:///video.mp4",
        client,
        fetchFile,
      },
      captionTypedByUser,
    );

    expect(result).toEqual({
      error: null,
      videoId: "video-456",
      publicUrl: "https://example.com/video.mp4",
    });
    expect(client.storage.from).toHaveBeenCalledWith("videos");
    expect(client.from).toHaveBeenCalledWith("videos");
  });

  it("returns the publication error to the screen flow", async () => {
    const client: VideoStorageClient = {
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn().mockResolvedValue({ error: { message: "No se pudo subir el video" } }),
          getPublicUrl: vi.fn(() => ({ data: { publicUrl: "" } })),
        })),
      },
      from: vi.fn(),
    };

    const result = await submitVideoFromScreen(
      {
        userId: "user-123",
        videoUri: "file:///video.mp4",
        client,
        fetchFile: vi.fn().mockResolvedValue({
          ok: true,
          blob: vi.fn().mockResolvedValue(new Blob(["video"])),
        }),
      },
      "Video de prueba",
    );

    expect(result).toEqual({ error: "No se pudo subir el video" });
  });
});
