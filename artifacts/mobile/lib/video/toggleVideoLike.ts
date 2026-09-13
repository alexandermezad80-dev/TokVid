export interface ToggleVideoLikeInput {
  userId: string;
  videoId: string;
  liked: boolean;
}

export interface VideoLikeClient {
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
    delete: () => {
      match: (filters: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
    };
  };
}

export interface ToggleVideoLikeResult {
  liked: boolean;
  error: string | null;
}

function validateInput(input: ToggleVideoLikeInput): string | null {
  if (!input.userId.trim() || !input.videoId.trim()) {
    return "Faltan datos obligatorios";
  }

  return null;
}

export async function toggleVideoLike(
  input: ToggleVideoLikeInput,
  client: VideoLikeClient,
): Promise<ToggleVideoLikeResult> {
  const validationError = validateInput(input);
  if (validationError) return { liked: input.liked, error: validationError };

  try {
    if (input.liked) {
      const { error } = await client.from("video_likes").delete().match({
        user_id: input.userId,
        video_id: input.videoId,
      });

      if (error) return { liked: true, error: error.message };
      return { liked: false, error: null };
    }

    const { error } = await client.from("video_likes").insert({
      user_id: input.userId,
      video_id: input.videoId,
    });

    if (error) return { liked: false, error: error.message };
    return { liked: true, error: null };
  } catch {
    return { liked: input.liked, error: "No se pudo actualizar el Me gusta" };
  }
}
