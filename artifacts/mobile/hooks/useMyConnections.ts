import {useCallback,useRef,useState} from "react";
import {AppState} from "react-native";
import {useFocusEffect} from "expo-router";
import {useAuth} from "../context/AuthContext";
import {useFollow} from "../context/FollowContext";
import {supabase} from "../lib/supabase";
import {createDatabaseChannel} from "../lib/realtimeSubscriptions";
import {connectionIds} from "../lib/features/profile/presentation";
export function useMyConnections(){
 const {user}=useAuth();const {revision}=useFollow();
 const [ids,setIds]=useState({following:[] as string[],followers:[] as string[],friends:[] as string[]});
 const [loading,setLoading]=useState(true),[error,setError]=useState<string|null>(null);const seq=useRef(0);
 const refresh=useCallback(async()=>{
  const request=++seq.current;if(!user){setIds({following:[],followers:[],friends:[]});setLoading(false);return;}
  try{
   const rows:{follower_id:string;following_id:string}[]=[];
   for(let offset=0;;offset+=1000){const {data,error}=await supabase.from("follows").select("follower_id,following_id").or(`follower_id.eq.${user.id},following_id.eq.${user.id}`).order("follower_id").order("following_id").range(offset,offset+999);if(error)throw error;rows.push(...(data??[]));if(!data||data.length<1000)break;}
   if(request===seq.current){setIds(connectionIds(rows,user.id));setError(null);}
  }catch{if(request===seq.current)setError("No pudimos cargar tus contactos. Inténtalo de nuevo.");}
  finally{if(request===seq.current)setLoading(false);}
 },[user?.id,revision]);
 useFocusEffect(useCallback(()=>{
  let active=true;setLoading(true);const reload=()=>{if(active)void refresh();};reload();
  const channel=user?createDatabaseChannel(`connections:${user.id}`).on("postgres_changes",{event:"INSERT",schema:"public",table:"follows",filter:`following_id=eq.${user.id}`},reload).subscribe():null;
  const app=AppState.addEventListener("change",state=>{if(state==="active")reload();});
  const interval=setInterval(()=>{if(AppState.currentState==="active")reload();},15000);
  return()=>{active=false;++seq.current;app.remove();clearInterval(interval);if(channel)void supabase.removeChannel(channel);};
 },[refresh,user?.id]));
 return {...ids,loading,error,refresh};
}
