export interface CreateVideoInput {
  userId: string;
  videoUri: string;
  caption: string;
}

export interface VideoStorageClient {
  storage: {
    from: (bucket: string) => {
      upload: (
        path: string,
        file: Blob,
        options: { contentType: string; upsert: boolean },
      ) => Promise<{ error: { message: string } | null }>;
      getPublicUrl: (path: string) => { data: { publicUrl: string } };
    };
  };
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => {
      select: (columns: string) => {
        single: () => Promise<{
          data: { id: string } | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
}

export interface CreateVideoResult {
  error: string | null;
  videoId?: string;
  publicUrl?: string;
}

function validateInput(input: CreateVideoInput): string | null {
  if (!input.userId.trim() || !input.videoUri.trim()) {
    return "Faltan datos obligatorios";
  }

  if (input.caption.trim().length > 300) {
    return "La descripción no puede superar los 300 caracteres";
  }

  return null;
}

export async function createVideo(
  input: CreateVideoInput,
  client: VideoStorageClient,
  fetchFile: typeof fetch = fetch,
): Promise<CreateVideoResult> {
  const validationError = validateInput(input);
  if (validationError) return { error: validationError };

  try {
    const response = await fetchFile(input.videoUri);
    if (!response.ok) {
      return { error: "No se pudo leer el video seleccionado" };
    }

    const blob = await response.blob();
    const extension = input.videoUri.split(".").pop()?.split("?")[0] || "mp4";
    const fileName = `${input.userId}/${Date.now()}.${extension}`;

    const { error: uploadError } = await client.storage
      .from("videos")
      .upload(fileName, blob, { contentType: "video/mp4", upsert: false });

    if (uploadError) return { error: uploadError.message };

    const { data: urlData } = client.storage.from("videos").getPublicUrl(fileName);
    const caption = input.caption.trim();

    const { data, error: insertError } = await client
      .from("videos")
      .insert({ user_id: input.userId, url: urlData.publicUrl, caption })
      .select("id")
      .single();

    if (insertError) return { error: insertError.message };
    if (!data?.id) return { error: "No se pudo crear el video" };

    return { error: null, videoId: data.id, publicUrl: urlData.publicUrl };
  } catch {
    return { error: "No se pudo completar la publicación del video" };
  }
}
