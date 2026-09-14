export interface AvatarStorageClient {
  storage: {
    from: (bucket: string) => {
      upload: (
        path: string,
        body: Blob,
        options: { contentType: string; upsert: boolean },
      ) => Promise<{ data: unknown; error: { message: string } | null }>;
      getPublicUrl: (path: string) => { data: { publicUrl: string } };
    };
  };
}

export interface UploadAvatarInput {
  userId: string;
  avatarUri: string;
}

export interface UploadAvatarResult {
  avatarUrl: string | null;
  error: string | null;
}

function getExtension(uri: string): string {
  const cleanUri = uri.split("?")[0];
  return cleanUri.split(".").pop()?.toLowerCase() || "jpg";
}

function getContentType(extension: string): string {
  return extension === "png" ? "image/png" : "image/jpeg";
}

export async function uploadAvatar(
  input: UploadAvatarInput,
  client: AvatarStorageClient,
  fetchImage: typeof fetch = fetch,
): Promise<UploadAvatarResult> {
  if (!input.userId.trim() || !input.avatarUri.trim()) {
    return { avatarUrl: null, error: "Faltan datos obligatorios" };
  }

  try {
    const extension = getExtension(input.avatarUri);
    const contentType = getContentType(extension);
    const fileName = `${input.userId}.${extension}`;

    const response = await fetchImage(input.avatarUri);
    if (!response.ok) {
      return { avatarUrl: null, error: "No se pudo leer la imagen seleccionada" };
    }

    const blob = await response.blob();
    const { error } = await client.storage.from("avatars").upload(fileName, blob, {
      contentType,
      upsert: true,
    });

    if (error) {
      return { avatarUrl: null, error: error.message };
    }

    const { data } = client.storage.from("avatars").getPublicUrl(fileName);
    if (!data.publicUrl) {
      return { avatarUrl: null, error: "No se pudo obtener la URL de la foto" };
    }

    return { avatarUrl: data.publicUrl, error: null };
  } catch {
    return { avatarUrl: null, error: "No se pudo subir la foto de perfil" };
  }
}
