import { describe, expect, it, vi } from "vitest";
import { registerUser, type RegisterAuthClient } from "../artifacts/mobile/lib/auth/register";

const baseInput = {
  email: "usuario@example.com",
  password: "secreto123",
  username: "usuario123",
  confirmPassword: "secreto123",
};

function createClient(overrides: Partial<RegisterAuthClient> = {}): RegisterAuthClient {
  return {
    auth: {
      signUp: vi.fn().mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      }),
    },
    from: vi.fn(() => ({
      upsert: vi.fn().mockResolvedValue({ error: null }),
    })),
    ...overrides,
  };
}

describe("registerUser", () => {
  it("registers a valid user and creates the profile", async () => {
    const client = createClient();

    const result = await registerUser(baseInput, client);

    expect(result).toEqual({ error: null });
    expect(client.auth.signUp).toHaveBeenCalledWith({
      email: baseInput.email,
      password: baseInput.password,
      options: { data: { username: baseInput.username, display_name: baseInput.username } },
    });
    expect(client.from).toHaveBeenCalledWith("profiles");
  });

  it("rejects missing data without calling Supabase", async () => {
    const client = createClient();

    const result = await registerUser({ ...baseInput, username: "" }, client);

    expect(result.error).toBe("Faltan datos obligatorios");
    expect(client.auth.signUp).not.toHaveBeenCalled();
  });

  it("handles a Supabase failure without throwing", async () => {
    const client = createClient({
      auth: {
        signUp: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: "Correo ya registrado" },
        }),
      },
    });

    await expect(registerUser(baseInput, client)).resolves.toEqual({
      error: "Correo ya registrado",
    });
  });
});
