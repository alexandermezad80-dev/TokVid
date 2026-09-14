export interface CreateCommentInput {
  userId: string;
  videoId: string;
  username: string;
  avatarUrl?: string | null;
  text: string;
}

export interface CommentClient {
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => Promise<{
      data?: { id: string } | null;
      error: { message: string } | null;
    }>;
  };
}

export interface CreateCommentResult {
  error: string | null;
  commentId?: string;
}

function validateInput(input: CreateCommentInput): string | null {
  if (!input.userId.trim() || !input.videoId.trim() || !input.username.trim()) {
    return "Faltan datos obligatorios";
  }

  const text = input.text.trim();
  if (!text) return "El comentario no puede estar vacío";
  if (text.length > 500) return "El comentario no puede superar los 500 caracteres";

  return null;
}

export async function createComment(
  input: CreateCommentInput,
  client: CommentClient,
): Promise<CreateCommentResult> {
  const validationError = validateInput(input);
  if (validationError) return { error: validationError };

  try {
    const { data, error } = await client.from("comments").insert({
      video_id: input.videoId,
      user_id: input.userId,
      username: input.username.trim(),
      avatar_url: input.avatarUrl ?? null,
      text: input.text.trim(),
    });

    if (error) return { error: error.message };
    if (!data?.id) return { error: "No se pudo crear el comentario" };

    return { error: null, commentId: data.id };
  } catch {
    return { error: "No se pudo publicar el comentario" };
  }
}
