export interface ToggleSavedVideoInput {
  userId: string;
  videoId: string;
  saved: boolean;
}

export interface SavedVideoClient {
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
    delete: () => {
      match: (filters: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
    };
  };
}

export interface ToggleSavedVideoResult {
  saved: boolean;
  error: string | null;
}

function validateInput(input: ToggleSavedVideoInput): string | null {
  if (!input.userId.trim() || !input.videoId.trim()) {
    return "Faltan datos obligatorios";
  }
  return null;
}

export async function toggleSavedVideo(
  input: ToggleSavedVideoInput,
  client: SavedVideoClient,
): Promise<ToggleSavedVideoResult> {
  const validationError = validateInput(input);
  if (validationError) return { saved: input.saved, error: validationError };

  try {
    if (input.saved) {
      const { error } = await client.from("saved_videos").delete().match({
        user_id: input.userId,
        video_id: input.videoId,
      });

      if (error) return { saved: true, error: error.message };
      return { saved: false, error: null };
    }

    const { error } = await client.from("saved_videos").insert({
      user_id: input.userId,
      video_id: input.videoId,
    });

    if (error) return { saved: false, error: error.message };
    return { saved: true, error: null };
  } catch {
    return { saved: input.saved, error: "No se pudo actualizar el video guardado" };
  }
}
