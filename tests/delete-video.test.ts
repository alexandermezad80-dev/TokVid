import { describe, expect, it, vi } from "vitest";
import { deleteVideo } from "../artifacts/mobile/lib/video/deleteVideo";

function createClient(options?: {
  data?: { id: string }[] | null;
  error?: { message: string } | null;
  storageError?: { message: string } | null;
}) {
  const remove = vi.fn().mockResolvedValue({
    data: null,
    error: options?.storageError ?? null,
  });

  const client = {
    from: vi.fn(() => ({
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn().mockResolvedValue({
            data: options?.data ?? [{ id: "video-1" }],
            error: options?.error ?? null,
          }),
        })),
      })),
    })),
    storage: {
      from: vi.fn(() => ({ remove })),
    },
  };

  return { client, remove };
}

describe("deleteVideo", () => {
  it("elimina el video y limpia su archivo de Storage", async () => {
    const { client, remove } = createClient();

    const result = await deleteVideo(
      {
        videoId: "video-1",
        videoUri: "https://example.com/storage/v1/object/public/videos/user/video.mp4",
      },
      client,
    );

    expect(result).toEqual({ deleted: true, error: null });
    expect(remove).toHaveBeenCalledWith(["user/video.mp4"]);
  });

  it("rechaza datos obligatorios faltantes", async () => {
    const { client } = createClient();

    const result = await deleteVideo({ videoId: "", videoUri: "" }, client);

    expect(result).toEqual({ deleted: false, error: "Faltan datos obligatorios" });
  });

  it("maneja un fallo de la base de datos sin lanzar la excepción", async () => {
    const { client } = createClient({ error: { message: "DB error" } });

    const result = await deleteVideo(
      { videoId: "video-1", videoUri: "https://example.com/video.mp4" },
      client,
    );

    expect(result).toEqual({ deleted: false, error: "DB error" });
  });

  it("no reporta fallo si la limpieza de Storage falla después del borrado", async () => {
    const { client } = createClient({ storageError: { message: "Storage error" } });

    const result = await deleteVideo(
      {
        videoId: "video-1",
        videoUri: "https://example.com/storage/v1/object/public/videos/user/video.mp4",
      },
      client,
    );

    expect(result).toEqual({ deleted: true, error: null });
  });
});
