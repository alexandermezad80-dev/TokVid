import { toByteArray } from "base64-js";
import { supabase } from "../../supabase";

const MAX_AVATAR_BYTES = 10 * 1024 * 1024;
let photoSequence = 0;

export function avatarImage(base64: string) {
  if (!base64 || base64.length > Math.ceil(MAX_AVATAR_BYTES / 3) * 4 ||
      base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    throw new Error("Selecciona una foto válida de hasta 10 MB.");
  }
  const bytes = toByteArray(base64);
  if (bytes.byteLength < 12 || bytes.byteLength > MAX_AVATAR_BYTES) {
    throw new Error("Selecciona una foto válida de hasta 10 MB.");
  }
  const matches = (values: number[], offset = 0) => values.every((value, index) => bytes[offset + index] === value);
  const format = matches([0xff, 0xd8, 0xff]) ? { extension: "jpg", contentType: "image/jpeg" }
    : matches([137, 80, 78, 71, 13, 10, 26, 10]) ? { extension: "png", contentType: "image/png" }
    : matches([82, 73, 70, 70]) && matches([87, 69, 66, 80], 8) ? { extension: "webp", contentType: "image/webp" } : null;
  if (!format) throw new Error("Usa una foto JPG, PNG o WebP.");
  // React Native Storage uploads require binary bytes, rather than a Blob.
  return { ...format, body: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer };
}

export async function uploadProfileAvatar(userId: string, base64: string): Promise<string> {
  if (!userId) throw new Error("Inicia sesión para cambiar tu foto.");
  const image = avatarImage(base64);
  // A fresh object needs only the existing owner INSERT policy and a fresh URL
  // prevents the previous avatar from staying in the image/CDN cache.
  const file = `${userId}/avatar-${Date.now()}-${++photoSequence}-${Math.random().toString(36).slice(2, 10)}.${image.extension}`;
  const bucket = supabase.storage.from("avatars");
  const { data, error } = await bucket.upload(file, image.body, {
    contentType: image.contentType, cacheControl: "3600", upsert: false,
  });
  if (error) throw new Error("No se pudo subir la foto. Intenta de nuevo.");
  if (data?.path !== file) throw new Error("No se pudo confirmar la subida de la foto.");
  const url = bucket.getPublicUrl(file).data?.publicUrl;
  if (!url) throw new Error("No se pudo obtener la foto guardada.");
  return url;
}

export async function saveProfileChanges(userId: string, updates: {
  username: string; bio: string; full_name: string; avatar_url?: string;
}) {
  const { data, error } = await supabase.from("profiles").update(updates).eq("id", userId)
    .select("id,username,bio,full_name,avatar_url").maybeSingle();
  if (error) throw error;
  if (!data || data.id !== userId || (updates.avatar_url && data.avatar_url !== updates.avatar_url)) {
    throw new Error("No se pudo confirmar el guardado del perfil. Intenta de nuevo.");
  }
  return data;
}
