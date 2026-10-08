import type { SupabaseClient } from "@supabase/supabase-js";
import type { PublicationDraft } from "./model";
export type UploadFile = (path: string, uri: string, contentType: string, onProgress: (ratio: number) => void) => Promise<void>;

// Keep the same draft/id across retries: a lost response must not publish twice.
export async function publishDraft(client: SupabaseClient, draft: PublicationDraft, caption: string, uploadFile: UploadFile, onProgress: (ratio: number) => void) {
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError || sessionData.session?.user.id !== draft.userId) throw new Error("Tu sesión cambió. Vuelve a iniciar sesión antes de publicar.");
  const findPublished = async () => {
    const { data, error } = await client.from("videos").select("id, user_id, video_url").eq("id", draft.id).eq("user_id", draft.userId).maybeSingle();
    if (error) throw error;
    return data;
  };
  if (await findPublished()) return draft.id;
  const path = `${draft.userId}/${draft.id}.${draft.extension}`;
  if (!draft.uploadedUrl) {
    await uploadFile(path, draft.uri, draft.contentType, value => onProgress(value * 0.90));
    draft.uploadedUrl = client.storage.from("videos").getPublicUrl(path).data.publicUrl;
  }
  if (draft.kind === "image") draft.thumbnailUrl = draft.uploadedUrl;
  else if (draft.thumbnailUri && !draft.thumbnailUrl) {
    const coverPath = `${draft.userId}/${draft.id}-cover.jpg`;
    await uploadFile(coverPath, draft.thumbnailUri, "image/jpeg", value => onProgress(0.9 + value * 0.06));
    draft.thumbnailUrl = client.storage.from("videos").getPublicUrl(coverPath).data.publicUrl;
  }
  const { data: freshSession } = await client.auth.getSession();
  if (freshSession.session?.user.id !== draft.userId) throw new Error("Tu sesión cambió. La publicación no se ha enviado.");
  const { data, error } = await client.from("videos").insert({ id: draft.id, user_id: draft.userId,
    video_url: draft.uploadedUrl, thumbnail_url: draft.thumbnailUrl ?? null, media_type: draft.kind, caption: caption.trim().slice(0, 300) })
    .select("id, user_id, video_url").single();
  if (error) {
    // A concurrent retry or lost insert response may already have committed.
    const confirmed = await findPublished().catch(() => null);
    if (confirmed?.video_url === draft.uploadedUrl) return draft.id;
    throw error;
  }
  if (data?.id !== draft.id || data?.user_id !== draft.userId || data?.video_url !== draft.uploadedUrl) throw new Error("No se pudo confirmar la publicación. Conservamos tu selección para reintentar.");
  onProgress(1);
  return draft.id;
}
