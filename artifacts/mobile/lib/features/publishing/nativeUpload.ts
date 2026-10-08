import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import { supabase, supabaseAnonKey } from "../../supabase";

export async function uploadPublicationFile(path: string, uri: string, contentType: string, onProgress: (ratio: number) => void) {
  const bucket = supabase.storage.from("videos");
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session || path.split("/")[0] !== session.user.id) throw new Error("Inicia sesión para publicar.");
  if (Platform.OS === "web") {
    const response = await fetch(uri);
    const blob = await response.blob();
    const { error: uploadError } = await bucket.upload(path, blob, { contentType, upsert: false });
    if (uploadError) throw uploadError;
  } else {
    const publicUrl = bucket.getPublicUrl(path).data.publicUrl;
    const endpoint = publicUrl.replace("/storage/v1/object/public/", "/storage/v1/object/");
    // Stream the local file natively: do not load a 250 MB video into JS Blob/base64.
    const task = FileSystem.createUploadTask(endpoint, uri, {
      httpMethod: "POST", uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${session.access_token}`, "Content-Type": contentType, "x-upsert": "false", "cache-control": "3600" },
    }, event => { if (event.totalBytesExpectedToSend > 0) onProgress(event.totalBytesSent / event.totalBytesExpectedToSend); });
    const result = await task.uploadAsync();
    if (!result || result.status < 200 || result.status >= 300) {
      // The previous upload may have finished even if its HTTP response was lost.
      if (result?.status === 409 || (result?.status === 400 && /Duplicate|already exists/i.test(result.body))) {
        const info = await FileSystem.getInfoAsync(uri);
        const { data: object, error: infoError } = await bucket.info(path);
        if (!infoError && info.exists && object?.size === info.size) { onProgress(1); return; }
      }
      throw new Error("No se pudo subir el archivo. Revisa tu conexión y vuelve a intentarlo.");
    }
  }
  onProgress(1);
}
