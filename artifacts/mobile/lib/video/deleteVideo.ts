export interface DeleteVideoInput {
  videoId: string;
  videoUri: string;
}

export interface DeleteVideoClient {
  from: (table: string) => {
    delete: () => {
      eq: (column: string, value: string) => {
        select: (columns: string) => Promise<{
          data: { id: string }[] | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
  storage: {
    from: (bucket: string) => {
      remove: (paths: string[]) => Promise<{
        data: unknown;
        error: { message: string } | null;
      }>;
    };
  };
}

export interface DeleteVideoResult {
  deleted: boolean;
  error: string | null;
}

function validateInput(input: DeleteVideoInput): string | null {
  if (!input.videoId.trim() || !input.videoUri.trim()) {
    return "Faltan datos obligatorios";
  }
  return null;
}

function getStoragePath(videoUri: string): string | null {
  const marker = "/storage/v1/object/public/videos/";
  const parts = videoUri.split(marker);
  return parts.length === 2 && parts[1] ? parts[1] : null;
}

export async function deleteVideo(
  input: DeleteVideoInput,
  client: DeleteVideoClient,
): Promise<DeleteVideoResult> {
  const validationError = validateInput(input);
  if (validationError) return { deleted: false, error: validationError };

  try {
    const { data, error } = await client
      .from("videos")
      .delete()
      .eq("id", input.videoId)
      .select("id");

    if (error) return { deleted: false, error: error.message };
    if (!data || data.length === 0) {
      return { deleted: false, error: "No se encontró el video" };
    }

    const storagePath = getStoragePath(input.videoUri);
    if (storagePath) {
      try {
        await client.storage.from("videos").remove([storagePath]);
      } catch {
        // Storage cleanup is best-effort after the database row is deleted.
      }
    }

    return { deleted: true, error: null };
  } catch (error) {
    return {
      deleted: false,
      error: error instanceof Error ? error.message : "No se pudo eliminar el video",
    };
  }
}
