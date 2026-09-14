export interface ToggleFollowInput {
  userId: string;
  creatorId: string;
  following: boolean;
}

export interface FollowClient {
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
    delete: () => {
      match: (filters: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
    };
  };
}

export interface ToggleFollowResult {
  following: boolean;
  error: string | null;
}

function validateInput(input: ToggleFollowInput): string | null {
  if (!input.userId.trim() || !input.creatorId.trim()) {
    return "Faltan datos obligatorios";
  }

  if (input.userId === input.creatorId) {
    return "No puedes seguirte a ti mismo";
  }

  return null;
}

export async function toggleFollow(
  input: ToggleFollowInput,
  client: FollowClient,
): Promise<ToggleFollowResult> {
  const validationError = validateInput(input);
  if (validationError) return { following: input.following, error: validationError };

  try {
    if (input.following) {
      const { error } = await client.from("follows").delete().match({
        follower_id: input.userId,
        following_id: input.creatorId,
      });

      if (error) return { following: true, error: error.message };
      return { following: false, error: null };
    }

    const { error } = await client.from("follows").insert({
      follower_id: input.userId,
      following_id: input.creatorId,
    });

    if (error) return { following: false, error: error.message };
    return { following: true, error: null };
  } catch {
    return { following: input.following, error: "No se pudo actualizar el seguimiento" };
  }
}
