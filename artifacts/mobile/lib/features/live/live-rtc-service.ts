import { supabase } from "../../supabase";

export type LiveRole = "host" | "guest" | "spectator";

export interface LiveRtcCredentials {
  appId: string;
  channel: string;
  uid: number;
  token: string;
  expiresIn: number;
  role: LiveRole;
  cameraAuthorized: boolean;
  micAuthorized: boolean;
  cameraState: "on" | "off";
  micState: "on" | "off";
}

export async function getLiveRtcCredentials(roomId: string): Promise<LiveRtcCredentials> {
  const { data, error } = await supabase.functions.invoke("live-rtc-token", {
    body: { room_id: roomId },
  });

  if (error) throw new Error(error.message || "No se pudo obtener acceso audiovisual al LIVE.");
  if (!data || typeof data !== "object") {
    throw new Error("Respuesta inválida del servicio audiovisual del LIVE.");
  }
  if ("error" in data && typeof data.error === "string") {
    throw new Error(data.error);
  }

  return data as LiveRtcCredentials;
}

export function agoraUidFromUserId(userId: string): number {
  let hash = 2166136261;
  for (let index = 0; index < userId.length; index += 1) {
    hash ^= userId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const uid = hash >>> 0;
  return uid === 0 ? 1 : uid;
}
