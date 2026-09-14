import { describe, expect, it, vi } from "vitest";
import { shareVideoFromFeed, type ShareVideoClient } from "../artifacts/mobile/lib/video/shareVideoFromFeed";

function createClient(): ShareVideoClient {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { shares_count: 4 },
            error: null,
          }),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    })),
  };
}

describe("shareVideoFromFeed", () => {
  it("opens the system share flow and registers the share", async () => {
    const client = createClient();
    const systemShare = vi.fn().mockResolvedValue(undefined);

    const result = await shareVideoFromFeed(
      { videoId: "video-123", caption: "Mi video", uri: "https://example.com/video.mp4" },
      client,
      systemShare,
    );

    expect(result).toEqual({ shared: true, error: null });
    expect(systemShare).toHaveBeenCalledWith({
      title: "Mi video",
      message: "Mi video\n\nhttps://example.com/video.mp4",
      url: "https://example.com/video.mp4",
    });
  });

  it("does not update the database when sharing is cancelled", async () => {
    const client = createClient();
    const systemShare = vi.fn().mockRejectedValue(new Error("cancelled"));

    const result = await shareVideoFromFeed(
      { videoId: "video-123", caption: "Mi video", uri: "https://example.com/video.mp4" },
      client,
      systemShare,
    );

    expect(result).toEqual({ shared: false, error: "El compartir fue cancelado o falló" });
    expect(client.from).not.toHaveBeenCalled();
  });
});
