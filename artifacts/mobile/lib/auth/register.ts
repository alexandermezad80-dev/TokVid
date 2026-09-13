export interface RegisterInput {
  email: string;
  password: string;
  username: string;
  confirmPassword?: string;
}

export interface RegisterAuthClient {
  auth: {
    signUp: (input: {
      email: string;
      password: string;
      options: { data: { username: string; display_name: string } };
    }) => Promise<{
      data: { user: { id: string } | null };
      error: { message: string } | null;
    }>;
  };
  from: (table: string) => {
    upsert: (row: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
  };
}

export interface RegisterResult {
  error: string | null;
}

function validateRegisterInput(input: RegisterInput): string | null {
  const email = input.email.trim();
  const username = input.username.trim();

  if (!email || !username || !input.password) return "Faltan datos obligatorios";
  if (!email.includes("@")) return "Correo electrónico inválido";
  if (input.password.length < 6) return "La contraseña debe tener al menos 6 caracteres";
  if (input.confirmPassword !== undefined && input.password !== input.confirmPassword) {
    return "Las contraseñas no coinciden";
  }

  return null;
}

export async function registerUser(
  input: RegisterInput,
  client: RegisterAuthClient,
): Promise<RegisterResult> {
  const validationError = validateRegisterInput(input);
  if (validationError) return { error: validationError };

  const email = input.email.trim();
  const username = input.username.trim();

  try {
    const { data, error } = await client.auth.signUp({
      email,
      password: input.password,
      options: {
        data: { username, display_name: username },
      },
    });

    if (error) return { error: error.message };

    if (data.user) {
      try {
        const { error: profileError } = await client.from("profiles").upsert({
          id: data.user.id,
          username,
          email,
          created_at: new Date().toISOString(),
        });

        if (profileError) {
          return { error: profileError.message };
        }
      } catch {
        return { error: "No se pudo crear el perfil del usuario" };
      }
    }

    return { error: null };
  } catch {
    return { error: "No se pudo completar el registro" };
  }
}
