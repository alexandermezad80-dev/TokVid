import { supabase } from "../../../supabase";

export type CallType = "voice" | "video";
export type CallStatus =
  | "ringing"
  | "accepted"
  | "rejected"
  | "cancelled"
  | "missed"
  | "ended";

export interface Call {
  id: string;
  conversation_id: string;
  caller_id: string;
  receiver_id: string;
  type: CallType;
  status: CallStatus;
  agora_channel: string;
  created_at: string;
  started_at: string | null;
  answered_at: string | null;
  ended_at: string | null;
}

export interface AgoraCredentials {
  appId: string;
  channel: string;
  uid: number;
  token: string;
  expiresIn: number;
  type: CallType;
}

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("calls", { body });
  if (error) throw new Error(error.message || "No se pudo procesar la llamada.");
  if (!data || typeof data !== "object") throw new Error("Respuesta inválida del servicio de llamadas.");
  if ("error" in data && typeof data.error === "string") throw new Error(data.error);
  return data as T;
}

export async function createCall(
  conversationId: string,
  receiverId: string,
  type: CallType,
): Promise<Call> {
  const result = await invoke<{ call: Call }>({
    action: "create",
    conversation_id: conversationId,
    receiver_id: receiverId,
    type,
  });
  return result.call;
}

export async function acceptCall(callId: string): Promise<Call> {
  const result = await invoke<{ call: Call }>({ action: "accept", call_id: callId });
  return result.call;
}

export async function rejectCall(callId: string): Promise<Call> {
  const result = await invoke<{ call: Call }>({ action: "reject", call_id: callId });
  return result.call;
}

export async function cancelCall(callId: string): Promise<Call> {
  const result = await invoke<{ call: Call }>({ action: "cancel", call_id: callId });
  return result.call;
}

export async function endCall(callId: string): Promise<Call> {
  const result = await invoke<{ call: Call }>({ action: "end", call_id: callId });
  return result.call;
}

export async function getCall(callId: string): Promise<Call> {
  const { data, error } = await supabase
    .from("calls")
    .select("*")
    .eq("id", callId)
    .single();

  if (error) throw new Error(error.message || "No se pudo consultar la llamada.");
  return data as Call;
}

export async function getAgoraCredentials(callId: string): Promise<AgoraCredentials> {
  return invoke<AgoraCredentials>({ action: "token", call_id: callId });
}

export async function heartbeatCall(callId: string): Promise<Call> {
  const result = await invoke<{ call: Call }>({ action: "heartbeat", call_id: callId });
  return result.call;
}


export async function getCallHistory(conversationId: string): Promise<Call[]> {
  const { data, error } = await supabase
    .from("calls")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message || "No se pudo cargar el historial de llamadas.");
  return (data as Call[]) ?? [];
}
