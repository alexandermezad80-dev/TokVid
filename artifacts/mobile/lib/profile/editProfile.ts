export interface ProfileClient {
  from: (table: string) => {
    upsert: (values: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
  };
  auth: {
    updateUser: (attributes: { data: Record<string, string> }) => Promise<{ error: { message: string } | null }>;
  };
}

export interface EditProfileInput {
  userId: string;
  username: string;
  bio: string;
  avatarUrl?: string | null;
}

export interface EditProfileResult {
  saved: boolean;
  error: string | null;
}

function validateInput(input: EditProfileInput): string | null {
  const username = input.username.trim();
  if (!input.userId.trim()) return "Falta el usuario";
  if (!username) return "El nombre de usuario no puede estar vacío";
  if (username.length < 3) return "El nombre de usuario debe tener al menos 3 caracteres";
  if (username.length > 30) return "El nombre de usuario no puede superar los 30 caracteres";
  if (input.bio.trim().length > 150) return "La biografía no puede superar los 150 caracteres";
  return null;
}

export async function editProfile(
  input: EditProfileInput,
  client: ProfileClient,
): Promise<EditProfileResult> {
  const validationError = validateInput(input);
  if (validationError) return { saved: false, error: validationError };

  const username = input.username.trim();
  const bio = input.bio.trim();

  try {
    const updates: Record<string, unknown> = {
      id: input.userId,
      username,
      bio,
      updated_at: new Date().toISOString(),
    };

    if (input.avatarUrl) updates.avatar_url = input.avatarUrl;

    const { error: profileError } = await client.from("profiles").upsert(updates);
    if (profileError) return { saved: false, error: profileError.message };

    const { error: authError } = await client.auth.updateUser({
      data: { username, display_name: username },
    });
    if (authError) return { saved: false, error: authError.message };

    return { saved: true, error: null };
  } catch {
    return { saved: false, error: "No se pudo guardar el perfil" };
  }
}
