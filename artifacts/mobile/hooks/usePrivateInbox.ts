import { useCallback, useRef, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { supabase } from "../lib/supabase";
import { createDatabaseChannel } from "../lib/realtimeSubscriptions";
import { readPrivateInbox } from "../lib/features/messages/services/private-messages";
import type { PrivateConversation } from "../lib/features/messages/model";

export function usePrivateInbox(userId?:string) {
  const [conversations,setConversations]=useState<PrivateConversation[]>([]);
  const [loading,setLoading]=useState(false),[error,setError]=useState<string|null>(null);
  const generation=useRef(0), sequence=useRef(0);
  const refresh=useCallback(async()=>{
    if(!userId) return;
    const request=++sequence.current, current=generation.current;
    setLoading(true);
    try { const rows=await readPrivateInbox(); if(current===generation.current && request===sequence.current){setConversations(rows);setError(null);} }
    catch(e){if(current===generation.current && request===sequence.current)setError(e instanceof Error?e.message:"No se pudo cargar la bandeja.");}
    finally{if(current===generation.current && request===sequence.current)setLoading(false);}
  },[userId]);
  useFocusEffect(useCallback(()=>{
    ++generation.current; setConversations([]);setError(null);
    if(!userId){setLoading(false);return;}
    let active=true; const reload=()=>{if(active)void refresh();}; reload();
    const channel=createDatabaseChannel(`private-inbox:${userId}`)
      .on("postgres_changes",{event:"*",schema:"public",table:"conversations"},reload)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"message_hides",filter:`user_id=eq.${userId}`},reload)
      .subscribe(status=>{if(status==="SUBSCRIBED")reload();});
    const state=AppState.addEventListener("change",value=>{if(value==="active")reload();});
    const interval=setInterval(()=>{if(AppState.currentState==="active")reload();},15000);
    return()=>{active=false;++generation.current;state.remove();clearInterval(interval);void supabase.removeChannel(channel);};
  },[userId,refresh]));
  return {conversations,loading,error,refresh};
}
