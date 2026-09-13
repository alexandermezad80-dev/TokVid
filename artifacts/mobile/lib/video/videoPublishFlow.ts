import { createVideo, type VideoStorageClient, type CreateVideoResult } from "./createVideo";

export interface VideoPublishFlowInput {
  userId: string;
  videoUri: string;
  client: VideoStorageClient;
  fetchFile?: typeof fetch;
}

export async function submitVideoFromScreen(
  input: VideoPublishFlowInput,
  caption: string,
): Promise<CreateVideoResult> {
  return createVideo(
    { userId: input.userId, videoUri: input.videoUri, caption },
    input.client,
    input.fetchFile,
  );
}
