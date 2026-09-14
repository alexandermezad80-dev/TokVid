import { describe, expect, it, vi } from "vitest";
import { signInUser, type SignInAuthClient } from "../artifacts/mobile/lib/auth/signIn";

function makeClient(signInWithPassword: SignInAuthClient["auth"]["signInWithPassword"]): SignInAuthClient {
  return { auth: { signInWithPassword } };
}

describe("signInUser", () => {
  it("inicia sesión correctamente", async () => {
    const signIn = vi.fn(async () => ({ error: null }));
    const client = makeClient(signIn);

    const result = await signInUser({ email: "user@example.com", password: "secret123" }, client);

    expect(result).toEqual({ error: null });
    expect(signIn).toHaveBeenCalledWith({ email: "user@example.com", password: "secret123" });
  });

  it("rechaza datos faltantes o un correo inválido", async () => {
    const signIn = vi.fn(async () => ({ error: null }));
    const client = makeClient(signIn);

    expect(await signInUser({ email: "", password: "secret123" }, client)).toEqual({
      error: "Faltan datos obligatorios",
    });
    expect(await signInUser({ email: "invalid-email", password: "secret123" }, client)).toEqual({
      error: "Correo electrónico inválido",
    });
    expect(signIn).not.toHaveBeenCalled();
  });

  it("devuelve el error de autenticación sin lanzar una excepción", async () => {
    const signIn = vi.fn(async () => ({ error: { message: "Credenciales inválidas" } }));
    const client = makeClient(signIn);

    const result = await signInUser({ email: "user@example.com", password: "badpass" }, client);

    expect(result).toEqual({ error: "Credenciales inválidas" });
  });

  it("maneja una falla inesperada del servicio", async () => {
    const signIn = vi.fn(async () => {
      throw new Error("network down");
    });
    const client = makeClient(signIn);

    const result = await signInUser({ email: "user@example.com", password: "secret123" }, client);

    expect(result).toEqual({ error: "No se pudo iniciar sesión" });
  });
});
