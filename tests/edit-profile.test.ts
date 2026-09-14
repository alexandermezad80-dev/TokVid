import { describe, expect, it, vi } from "vitest";
import { editProfile } from "../artifacts/mobile/lib/profile/editProfile";
import { uploadAvatar } from "../artifacts/mobile/lib/profile/uploadAvatar";

describe("editProfile", () => {
  it("guarda el perfil y actualiza metadata", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const updateUser = vi.fn().mockResolvedValue({ error: null });
    const client = {
      from: vi.fn(() => ({ upsert })),
      auth: { updateUser },
    };

    const result = await editProfile(
      { userId: "user-1", username: "alex", bio: "Hola" },
      client,
    );

    expect(result).toEqual({ saved: true, error: null });
    expect(upsert).toHaveBeenCalledOnce();
    expect(updateUser).toHaveBeenCalledWith({
      data: { username: "alex", display_name: "alex" },
    });
  });

  it("rechaza datos inválidos", async () => {
    const client = {
      from: vi.fn(),
      auth: { updateUser: vi.fn() },
    };

    const result = await editProfile(
      { userId: "user-1", username: "ab", bio: "" },
      client,
    );

    expect(result.saved).toBe(false);
    expect(result.error).toContain("al menos 3");
    expect(client.from).not.toHaveBeenCalled();
  });

  it("maneja un fallo de base de datos sin lanzar", async () => {
    const client = {
      from: vi.fn(() => ({
        upsert: vi.fn().mockResolvedValue({ error: { message: "DB error" } }),
      })),
      auth: { updateUser: vi.fn() },
    };

    const result = await editProfile(
      { userId: "user-1", username: "alex", bio: "Hola" },
      client,
    );

    expect(result).toEqual({ saved: false, error: "DB error" });
    expect(client.auth.updateUser).not.toHaveBeenCalled();
  });

  it("maneja un fallo de Auth sin lanzar", async () => {
    const client = {
      from: vi.fn(() => ({ upsert: vi.fn().mockResolvedValue({ error: null }) })),
      auth: {
        updateUser: vi.fn().mockResolvedValue({ error: { message: "Auth error" } }),
      },
    };

    const result = await editProfile(
      { userId: "user-1", username: "alex", bio: "Hola" },
      client,
    );

    expect(result).toEqual({ saved: false, error: "Auth error" });
  });
});

describe("uploadAvatar", () => {
  it("sube la imagen y devuelve la URL pública", async () => {
    const upload = vi.fn().mockResolvedValue({ data: {}, error: null });
    const getPublicUrl = vi.fn(() => ({
      data: { publicUrl: "https://example.com/avatar.jpg" },
    }));
    const client = {
      storage: { from: vi.fn(() => ({ upload, getPublicUrl })) },
    };
    const fetchImage = vi.fn().mockResolvedValue({
      ok: true,
      blob: vi.fn().mockResolvedValue(new Blob(["image"])),
    });

    const result = await uploadAvatar(
      { userId: "user-1", avatarUri: "file:///avatar.jpg" },
      client,
      fetchImage,
    );

    expect(result).toEqual({
      avatarUrl: "https://example.com/avatar.jpg",
      error: null,
    });
    expect(upload).toHaveBeenCalledWith(
      "user-1.jpg",
      expect.any(Blob),
      { contentType: "image/jpeg", upsert: true },
    );
  });

  it("rechaza datos faltantes", async () => {
    const client = { storage: { from: vi.fn() } };
    const result = await uploadAvatar(
      { userId: "", avatarUri: "" },
      client,
      vi.fn(),
    );

    expect(result).toEqual({ avatarUrl: null, error: "Faltan datos obligatorios" });
  });

  it("maneja fallo de lectura de imagen", async () => {
    const client = { storage: { from: vi.fn() } };
    const fetchImage = vi.fn().mockResolvedValue({ ok: false });

    const result = await uploadAvatar(
      { userId: "user-1", avatarUri: "file:///avatar.jpg" },
      client,
      fetchImage,
    );

    expect(result).toEqual({
      avatarUrl: null,
      error: "No se pudo leer la imagen seleccionada",
    });
  });

  it("maneja fallo de Storage", async () => {
    const client = {
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn().mockResolvedValue({ error: { message: "Storage error" } }),
          getPublicUrl: vi.fn(),
        })),
      },
    };
    const fetchImage = vi.fn().mockResolvedValue({
      ok: true,
      blob: vi.fn().mockResolvedValue(new Blob(["image"])),
    });

    const result = await uploadAvatar(
      { userId: "user-1", avatarUri: "file:///avatar.png" },
      client,
      fetchImage,
    );

    expect(result).toEqual({ avatarUrl: null, error: "Storage error" });
  });
});
