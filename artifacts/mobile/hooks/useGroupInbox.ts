import {useCallback,useState} from "react";
import {useFocusEffect} from "expo-router";
import {supabase} from "../lib/supabase";
import {createDatabaseChannel} from "../lib/realtimeSubscriptions";
export type GroupInboxRow={id:string;name:string;last_message:string;last_message_at:string;unread_count:number};
export function useGroupInbox(userId?:string,revision=0){const [groups,setGroups]=useState<GroupInboxRow[]>([]);
 useFocusEffect(useCallback(()=>{if(!userId){setGroups([]);return;}let active=true,seq=0;const refresh=async()=>{const request=++seq;const {data,error}=await supabase.from("chat_group_inbox").select("*").order("last_message_at",{ascending:false}).limit(100);if(active&&request===seq&&!error)setGroups(data??[]);};void refresh();const channel=createDatabaseChannel(`group-inbox:${userId}`).on("postgres_changes",{event:"INSERT",schema:"public",table:"chat_group_messages"},()=>void refresh()).on("postgres_changes",{event:"*",schema:"public",table:"chat_group_members",filter:`user_id=eq.${userId}`},()=>void refresh()).subscribe(status=>{if(status==="SUBSCRIBED")void refresh();});return()=>{active=false;void supabase.removeChannel(channel);};},[userId,revision]));return groups;
}
