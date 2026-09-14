export interface SignInInput {
  email: string;
  password: string;
}

export interface SignInAuthClient {
  auth: {
    signInWithPassword: (input: {
      email: string;
      password: string;
    }) => Promise<{ error: { message: string } | null }>;
  };
}

export interface SignInResult {
  error: string | null;
}

function validateInput(input: SignInInput): string | null {
  const email = input.email.trim();
  if (!email || !input.password) return "Faltan datos obligatorios";
  if (!email.includes("@")) return "Correo electrónico inválido";
  return null;
}

export async function signInUser(
  input: SignInInput,
  client: SignInAuthClient,
): Promise<SignInResult> {
  const validationError = validateInput(input);
  if (validationError) return { error: validationError };

  try {
    const { error } = await client.auth.signInWithPassword({
      email: input.email.trim(),
      password: input.password,
    });

    if (error) return { error: error.message };
    return { error: null };
  } catch {
    return { error: "No se pudo iniciar sesión" };
  }
}
