import { supabase } from "../../../supabase";
import type { BubbleStyleVariant } from "../components/Bubble";
export type Attachment={path:string;kind:"image"|"video"|"audio";mime:string;duration?:number};
export type MessageDetail={message_id:string;reply_to:string|null;forwarded:boolean;attachment:Attachment|null};
export type Reaction={message_id:string;user_id:string;emoji:string};
export type ChatPreferences={bubble_style:BubbleStyleVariant;background:"slate"|"teal"|"plum"|"dark";tone:"default"|"soft"|"none";mute_messages:boolean;mute_calls:boolean};
export const DEFAULT_CHAT_PREFERENCES:ChatPreferences={bubble_style:"classic",background:"slate",tone:"default",mute_messages:false,mute_calls:false};
export const CHAT_BACKGROUNDS={slate:["#121820","#181720"],teal:["#112326","#172025"],plum:["#201B28","#191821"],dark:["#0E1015","#12141A"]} as const;
function fail(error:unknown,fallback:string):asserts error is null|undefined {if(error)throw new Error(fallback);}
export async function readChatPreferences(userId:string,conversationId:string):Promise<ChatPreferences>{
 const {data,error}=await supabase.from("chat_preferences").select("bubble_style,background,tone,mute_messages,mute_calls").eq("user_id",userId).eq("conversation_id",conversationId).maybeSingle();
 fail(error,"No se pudieron cargar los ajustes.");return {...DEFAULT_CHAT_PREFERENCES,...data};
}
export async function saveChatPreferences(userId:string,conversationId:string,changes:Partial<ChatPreferences>){
 const existing=await readChatPreferences(userId,conversationId);
 const {data,error}=await supabase.from("chat_preferences").upsert({user_id:userId,conversation_id:conversationId,...existing,...changes},{onConflict:"user_id,conversation_id"}).select().single();
 fail(error,"No se guardaron los ajustes. Inténtalo de nuevo.");return data as ChatPreferences;
}
export async function readChatTools(ids:string[]){
 if(!ids.length)return {details:[] as MessageDetail[],reactions:[] as Reaction[],pins:[] as string[]};
 // Keep each REST request bounded, including when a long history is loaded.
 const details:MessageDetail[]=[],reactions:Reaction[]=[],pins:string[]=[];
 for(let i=0;i<ids.length;i+=100){
  const chunk=ids.slice(i,i+100);
  const [d,r,p]=await Promise.all([supabase.from("message_details").select("*").in("message_id",chunk),supabase.from("message_reactions").select("*").in("message_id",chunk),supabase.from("message_pins").select("message_id").in("message_id",chunk)]);
  fail(d.error||r.error||p.error,"No se pudieron cargar las opciones de los mensajes.");
  details.push(...(d.data??[]));reactions.push(...(r.data??[]));pins.push(...(p.data??[]).map(x=>x.message_id));
 }
 return {details,reactions,pins};
}
export async function reactToMessage(messageId:string,userId:string,emoji:string,remove=false){
 const result=remove?await supabase.from("message_reactions").delete().eq("message_id",messageId).eq("user_id",userId):await supabase.from("message_reactions").upsert({message_id:messageId,user_id:userId,emoji},{onConflict:"message_id,user_id"}).select().single();
 fail(result.error,"No se guardó la reacción.");
}
export async function pinMessage(messageId:string,userId:string,remove=false){
 const result=remove?await supabase.from("message_pins").delete().eq("message_id",messageId).eq("user_id",userId):await supabase.from("message_pins").upsert({message_id:messageId,user_id:userId},{onConflict:"user_id,message_id",ignoreDuplicates:true});
 fail(result.error,"No se pudo cambiar el anclaje.");
}
export async function hideConversation(conversationId:string){const {error}=await supabase.rpc("hide_private_conversation",{p_conversation_id:conversationId});fail(error,"No se pudo ocultar esta conversación.");}
export async function hideOwnMessages(conversationId:string,before:string){const {error}=await supabase.rpc("hide_own_private_messages",{p_conversation_id:conversationId,p_before:before});fail(error,"No se pudieron ocultar tus mensajes.");}
export async function cancelUnreadMessage(id:string){const {error}=await supabase.rpc("cancel_unread_private_message",{p_id:id});if(error)throw new Error(error.message.includes("leído")?"El mensaje ya fue leído. Puedes usar Eliminar para todos.":"No se pudo cancelar el envío.");}
export async function reportUser(reporterId:string,reportedId:string,reason:string,messageId?:string){
 const {error}=await supabase.from("user_reports").insert({reporter_id:reporterId,reported_id:reportedId,reason,message_id:messageId??null}).select().single();fail(error,"No se pudo enviar la denuncia.");
}
export async function setUserBlocked(userId:string,otherId:string,blocked:boolean){
 const r=blocked?await supabase.from("user_blocks").insert({user_id:userId,blocked_id:otherId}).select().single():await supabase.from("user_blocks").delete().eq("user_id",userId).eq("blocked_id",otherId);fail(r.error,"No se pudo cambiar el bloqueo.");
}
export async function searchChat(conversationId:string,query:string){
 const term=query.trim();if(!term)return [];
 const escaped=term.replace(/[\\%_]/g,"\\$&");
 const {data,error}=await supabase.from("visible_private_messages").select("*").eq("conversation_id",conversationId).ilike("text",`%${escaped}%`).order("created_at",{ascending:false}).limit(100);
 fail(error,"No se pudo buscar en esta conversación.");return data??[];
}
