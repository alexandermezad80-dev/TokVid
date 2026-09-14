import { shareVideo, type ShareVideoClient } from "./shareVideo";

export interface SystemShareAction {
  (input: { title?: string; message?: string; url?: string }): Promise<void>;
}

export interface ShareVideoFromFeedInput {
  videoId: string;
  caption: string;
  uri: string;
}

export interface ShareVideoFromFeedResult {
  shared: boolean;
  error: string | null;
}

export async function shareVideoFromFeed(
  input: ShareVideoFromFeedInput,
  client: ShareVideoClient,
  systemShare: SystemShareAction,
): Promise<ShareVideoFromFeedResult> {
  try {
    await systemShare({
      title: input.caption,
      message: `${input.caption}\n\n${input.uri}`,
      url: input.uri,
    });
  } catch {
    return { shared: false, error: "El compartir fue cancelado o falló" };
  }

  return shareVideo({ videoId: input.videoId }, client);
}
