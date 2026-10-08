export type MediaKind = "video" | "image";
export type PickedMedia = { uri: string; type?: string | null; mimeType?: string | null; fileName?: string | null; fileSize?: number; duration?: number | null; width?: number; height?: number };
export type PublicationDraft = { id: string; userId: string; uri: string; kind: MediaKind; contentType: string; extension: string; size: number; thumbnailUri?: string; uploadedUrl?: string; thumbnailUrl?: string };
export const MAX_VIDEO_BYTES = 250 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export function publicationId() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => { const r = Math.floor(Math.random() * 16); return (c === "x" ? r : (r & 3) | 8).toString(16); });
}
export function validateMedia(asset: PickedMedia, size: number) {
  const kind: MediaKind = asset.type === "video" || asset.mimeType?.startsWith("video/") ? "video" : "image";
  if (!Number.isFinite(size) || size <= 0) throw new Error("No pudimos leer el archivo. Vuelve a elegirlo en la galería.");
  if (size > (kind === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES)) throw new Error(kind === "video" ? "El video debe pesar como máximo 250 MB." : "La foto debe pesar como máximo 10 MB.");
  if (kind === "video" && (asset.duration ?? 0) > 180000) throw new Error("El video puede durar hasta 3 minutos.");
  const name = (asset.fileName || asset.uri).split(/[?#]/)[0].toLowerCase();
  const contentType = asset.mimeType?.toLowerCase() || (kind === "image" ? "image/jpeg" : name.endsWith(".mov") ? "video/quicktime" : "video/mp4");
  const extensions: Record<string, string> = { "video/mp4": "mp4", "video/quicktime": "mov", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
  const extension = extensions[contentType];
  if (!extension || (kind === "video") !== contentType.startsWith("video/")) throw new Error("Elige un video MP4 o MOV, o una foto JPG, PNG o WebP.");
  return { kind, contentType, extension, size };
}
export function publishedMediaKind(row: { media_type?: unknown; video_url?: unknown }): MediaKind {
  return row.media_type === "image" || /\.(?:jpe?g|png|webp)(?:\?|$)/i.test(String(row.video_url ?? "")) ? "image" : "video";
}
