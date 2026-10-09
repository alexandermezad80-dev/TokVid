import { useCallback, useRef, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { supabase } from "../lib/supabase";
import { createDatabaseChannel } from "../lib/realtimeSubscriptions";
import { mergePrivateMessages, type PrivateMessage } from "../lib/features/messages/model";
import { readPrivateMessages, sendPrivateMessage, removePrivateMessages } from "../lib/features/messages/services/private-messages";
import { publicationId } from "../lib/features/publishing/model";

export function usePrivateChat(conversationId:string,userId?:string) {
  const [messages,setMessages]=useState<PrivateMessage[]>([]);
  const [other,setOther]=useState<{id:string;username:string;avatar_url:string|null}|null>(null);
  const [loading,setLoading]=useState(true),[error,setError]=useState<string|null>(null);
  const [sending,setSending]=useState(false),[hasOlder,setHasOlder]=useState(false);
  const boundary=useRef<PrivateMessage|null>(null);
  const generation=useRef(0),sequence=useRef(0),busy=useRef(false);
  const draft=useRef<{id:string;conversation_id:string;sender_id:string;text:string}|null>(null);
  const refresh=useCallback(async()=>{
    if(!userId||!conversationId)return;
    const request=++sequence.current, gen=generation.current;
    try{
      let page=await readPrivateMessages(conversationId);const rows=[...page];
      const oldest=boundary.current;
      while(page.length===200 && oldest){
        const last=page[page.length-1];
        if(last.created_at<oldest.created_at || (last.created_at===oldest.created_at && last.id<=oldest.id))break;
        page=await readPrivateMessages(conversationId,last);rows.push(...page);
      }
      if(gen!==generation.current||request!==sequence.current)return;
      setMessages(mergePrivateMessages([],rows));setHasOlder(page.length===200);setError(null);setLoading(false);
      const unread=rows.filter(row=>row.sender_id!==userId&&!row.read_by_other).map(row=>row.id);
      if(unread.length)await supabase.from("messages").update({read_by_other:true}).in("id",unread).eq("conversation_id",conversationId).neq("sender_id",userId);
    }catch(e){if(gen===generation.current&&request===sequence.current){setError(e instanceof Error?e.message:"No se pudo cargar el chat.");setLoading(false);}}
  },[conversationId,userId]);
  useFocusEffect(useCallback(()=>{
    const gen=++generation.current;setMessages([]);setOther(null);setLoading(true);setError(null);draft.current=null;boundary.current=null;busy.current=false;setSending(false);
    if(!userId||!conversationId){setLoading(false);return;}
    let active=true;const reload=()=>{if(active)void refresh();};
    void (async()=>{
      const {data:room,error:failure}=await supabase.from("conversations").select("id,user1_id,user2_id").eq("id",conversationId).single();
      if(!active||gen!==generation.current)return;
      if(failure||!room||![room.user1_id,room.user2_id].includes(userId)){setError("Esta conversación no está disponible para tu cuenta.");setLoading(false);return;}
      const id=room.user1_id===userId?room.user2_id:room.user1_id;
      const {data:profile}=await supabase.from("profiles").select("username,avatar_url").eq("id",id).maybeSingle();
      if(active&&gen===generation.current){setOther({id,username:profile?.username??"Usuario",avatar_url:profile?.avatar_url??null});reload();}
    })();
    const channel=createDatabaseChannel(`private-chat:${conversationId}`)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"messages",filter:`conversation_id=eq.${conversationId}`},reload)
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"messages",filter:`conversation_id=eq.${conversationId}`},reload)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"message_hides",filter:`user_id=eq.${userId}`},reload)
      .subscribe(status=>{if(status==="SUBSCRIBED")reload();});
    const app=AppState.addEventListener("change",state=>{if(state==="active")reload();});
    const interval=setInterval(()=>{if(AppState.currentState==="active")reload();},15000);
    return()=>{active=false;++generation.current;++sequence.current;app.remove();clearInterval(interval);void supabase.removeChannel(channel);};
  },[conversationId,userId,refresh]));
  const send=async(text:string)=>{
    if(!userId||!other||!text.trim()||busy.current)return false;
    const gen=generation.current;busy.current=true;setSending(true);setError(null);
    if(!draft.current||draft.current.text!==text.trim())draft.current={id:publicationId(),conversation_id:conversationId,sender_id:userId,text:text.trim()};
    try{const row=await sendPrivateMessage(draft.current);if(gen!==generation.current)return false;++sequence.current;setLoading(false);setMessages(old=>mergePrivateMessages(old,[row]));draft.current=null;return true;}
    catch(e){if(gen===generation.current)setError(e instanceof Error?e.message:"No se pudo enviar.");return false;}
    finally{if(gen===generation.current){busy.current=false;setSending(false);}}
  };
  const remove=async(ids:string[],forAll:boolean,before?:string)=>{await removePrivateMessages(conversationId,ids,forAll,before);await refresh();};
  const loadOlder=async()=>{
    if(!messages.length||!hasOlder||loading)return;
    const gen=generation.current,request=++sequence.current;setLoading(true);
    try{const rows=await readPrivateMessages(conversationId,messages[0]);if(gen===generation.current&&request===sequence.current){if(rows.length)boundary.current=rows[rows.length-1];setMessages(old=>mergePrivateMessages(old,rows));setHasOlder(rows.length===200);}}
    catch(e){if(gen===generation.current&&request===sequence.current)setError("No pudimos cargar mensajes anteriores.");}
    finally{if(gen===generation.current&&request===sequence.current)setLoading(false);}
  };
  return {messages,other,loading,error,sending,hasOlder,refresh,send,remove,loadOlder};
}
