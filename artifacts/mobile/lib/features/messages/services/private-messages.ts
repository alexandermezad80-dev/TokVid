import { supabase } from "../../../supabase";
import type { PrivateConversation, PrivateMessage } from "../model";

export async function openPrivateConversation(otherId:string) {
  const {data,error}=await supabase.rpc("open_private_conversation",{p_other_id:otherId});
  if(error||typeof data!=="string") throw new Error("No se pudo abrir la conversación. Inténtalo de nuevo.");
  return data;
}
export async function readPrivateInbox() {
  const {data,error}=await supabase.from("private_conversation_inbox").select("*").order("last_message_at",{ascending:false}).order("id",{ascending:false}).limit(500);
  if(error) throw new Error("No pudimos cargar tus conversaciones. Inténtalo de nuevo.");
  return (data??[]) as PrivateConversation[];
}
export async function readPrivateMessages(conversationId:string, before?:Pick<PrivateMessage,"created_at"|"id">) {
  let query=supabase.from("visible_private_messages").select("*").eq("conversation_id",conversationId).order("created_at",{ascending:false}).order("id",{ascending:false}).limit(200);
  if(before) query=query.or(`created_at.lt.${before.created_at},and(created_at.eq.${before.created_at},id.lt.${before.id})`);
  const {data,error}=await query;
  if(error) throw new Error("No pudimos cargar esta conversación. Inténtalo de nuevo.");
  return (data??[]) as PrivateMessage[];
}
export async function sendPrivateMessage(draft:{id:string;conversation_id:string;sender_id:string;text:string}) {
  const {data,error}=await supabase.rpc("send_private_message",{p_id:draft.id,p_conversation_id:draft.conversation_id,p_text:draft.text});
  if(!error && data?.id===draft.id && data.sender_id===draft.sender_id && data.conversation_id===draft.conversation_id && data.text===draft.text && !data.deleted_at) return data as PrivateMessage;
  // Same id on retry: a lost HTTP response must not duplicate a message.
  const {data:existing}=await supabase.from("messages").select("*").eq("id",draft.id).maybeSingle();
  if(existing?.sender_id===draft.sender_id && existing.conversation_id===draft.conversation_id && existing.text===draft.text && !existing.deleted_at) return existing as PrivateMessage;
  throw new Error("No se envió el mensaje. Conservamos tu texto para reintentar.");
}
export async function removePrivateMessages(conversationId:string, ids:string[], forAll:boolean, before?:string) {
  const {data,error}=await supabase.rpc("remove_private_messages",{p_conversation_id:conversationId,p_ids:ids,p_for_all:forAll,p_before:before??null});
  if(error || typeof data!=="number") throw new Error("No se pudieron eliminar los mensajes. Inténtalo de nuevo.");
  return data;
}
