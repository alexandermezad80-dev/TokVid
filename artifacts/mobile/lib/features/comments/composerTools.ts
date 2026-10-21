import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";
import { supabase, supabaseAnonKey } from "../../supabase";
import { publicationId } from "../publishing/model";
export type CommentPhoto = { uri: string; path: string | null };
export type CommentMention = { id: string; username: string; avatar_url: string | null };

export async function pickCommentPhoto(): Promise<CommentPhoto | null> {
  // Android's system photo picker grants access to the selected photo only.
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: false, allowsEditing: false, quality: .9 });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  const image = await ImageManipulator.manipulateAsync(asset.uri, asset.width > 1600 ? [{ resize: { width: 1600 } }] : [], { compress: .85, format: ImageManipulator.SaveFormat.JPEG });
  return { uri: image.uri, path: null };
}
export async function uploadCommentPhoto(userId: string, photo: CommentPhoto): Promise<string> {
  if (photo.path) return photo.path;
  const info = await FileSystem.getInfoAsync(photo.uri);
  if (!info.exists || !info.size || info.size > 8 * 1024 * 1024) throw new Error("Elige una imagen de hasta 8 MB.");
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || session.user.id !== userId) throw new Error("Vuelve a iniciar sesión para enviar la imagen.");
  const path = `${userId}/${publicationId()}.jpg`;
  const url = supabase.storage.from("comment-images").getPublicUrl(path).data.publicUrl.replace("/storage/v1/object/public/", "/storage/v1/object/");
  const response = await FileSystem.uploadAsync(url, photo.uri, { httpMethod: "POST", uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: { Authorization: `Bearer ${session.access_token}`, apikey: supabaseAnonKey, "Content-Type": "image/jpeg", "x-upsert": "false" } });
  if (response.status < 200 || response.status >= 300) throw new Error("No se pudo subir la imagen. Puedes reintentar.");
  // Retain the same uploaded object when retrying an uncertain comment response.
  photo.path = path;
  return path;
}
export async function discardCommentPhoto(photo: CommentPhoto | null) {
  if (photo?.path) await supabase.storage.from("comment-images").remove([photo.path]);
}
export async function commentPhotoUrl(path: string) {
  const { data, error } = await supabase.storage.from("comment-images").createSignedUrl(path, 60);
  if (error || !data) throw new Error("Imagen no disponible.");
  return data.signedUrl;
}
export async function suggestCommentMentions(videoId: string, query: string): Promise<CommentMention[]> {
  const { data, error } = await supabase.rpc("suggest_feed_comment_mentions", { p_video_id: videoId, p_query: query });
  if (error) throw new Error("No se pudieron cargar las menciones.");
  return (data ?? []) as CommentMention[];
}
export async function commentMentionProfile(username: string): Promise<string | null> {
  const { data, error } = await supabase.from("profiles").select("id").eq("username", username).maybeSingle();
  if (error) throw new Error("No se pudo abrir el perfil.");
  return data?.id ?? null;
}
