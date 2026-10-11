import React,{createContext,useCallback,useContext,useEffect,useRef,useState} from "react";
import {AppState} from "react-native";
import {supabase} from "../lib/supabase";
import {useAuth} from "./AuthContext";
import {createDatabaseChannel} from "../lib/realtimeSubscriptions";
export interface AppNotification{
 id:string;user_id:string;actor_id:string|null;actor_name:string|null;actor_avatar:string|null;
 type:"like"|"comment"|"follow"|"mention"|"system"|"message"|"share"|"profile_visit";
 message:string;data:Record<string,unknown>;read:boolean;created_at:string;event_count?:number;unread_count?:number;
}
interface NotificationsContextValue{notifications:AppNotification[];unreadCount:number;loading:boolean;markRead:(id:string)=>Promise<void>;markAllRead:()=>Promise<void>;refresh:()=>Promise<void>;banner:AppNotification|null;dismissBanner:()=>void;error:string|null;}
const NotificationsContext=createContext<NotificationsContextValue|null>(null);
export function NotificationsProvider({children}:{children:React.ReactNode}){
 const {user}=useAuth(),[notifications,setNotifications]=useState<AppNotification[]>([]),[loading,setLoading]=useState(false),[banner,setBanner]=useState<AppNotification|null>(null),[error,setError]=useState<string|null>(null);
 const generation=useRef(0),sequence=useRef(0),lastBanner=useRef<string|null>(null);
 const fetchNotifications=useCallback(async()=>{if(!user){setNotifications([]);return;}const gen=generation.current,request=++sequence.current;setLoading(true);try{const {data,error}=await supabase.from("grouped_notifications").select("*").eq("user_id",user.id).order("created_at",{ascending:false}).limit(100);if(error)throw error;if(gen===generation.current&&request===sequence.current){setNotifications((data??[]).map((n:any)=>({...n,read:n.unread_count===0})));setError(null);}}catch{if(gen===generation.current)setError("No se pudo actualizar Actividad.");}finally{if(gen===generation.current&&request===sequence.current)setLoading(false);}},[user?.id]);
 useEffect(()=>{let active=true;++generation.current;setNotifications([]);setBanner(null);lastBanner.current=null;void fetchNotifications();if(!user)return;
 const channel=createDatabaseChannel(`notifications:${user.id}`).on("postgres_changes",{event:"INSERT",schema:"public",table:"notifications",filter:`user_id=eq.${user.id}`},payload=>{
  if(!active)return;void fetchNotifications();const incoming=payload.new as AppNotification;
  if(AppState.currentState!=="active"||lastBanner.current===incoming.id)return;lastBanner.current=incoming.id;
  void(async()=>{if(incoming.type==="message"&&typeof incoming.data?.conversationId==="string"){const {data}=await supabase.from("chat_preferences").select("mute_messages").eq("user_id",user.id).eq("conversation_id",incoming.data.conversationId).maybeSingle();if(data?.mute_messages)return;}if(active)setBanner(incoming);})();
 }).subscribe(status=>{if(active&&status==="SUBSCRIBED")void fetchNotifications();});
 const listener=AppState.addEventListener("change",state=>{if(active&&state==="active")void fetchNotifications();});
 return()=>{active=false;++generation.current;++sequence.current;listener.remove();void supabase.removeChannel(channel);};
 },[user?.id,fetchNotifications]);
 useEffect(()=>{if(!banner)return;const timer=setTimeout(()=>setBanner(null),4500);return()=>clearTimeout(timer);},[banner?.id]);
 const markRead=async(id:string)=>{const {error}=await supabase.rpc("read_notification_group",{p_id:id});if(error){setError("No se pudo marcar como leído.");return;}await fetchNotifications();};
 const markAllRead=async()=>{if(!user)return;const cutoff=new Date().toISOString();const {error}=await supabase.from("notifications").update({read:true}).eq("user_id",user.id).lte("created_at",cutoff);if(error){setError("No se pudo marcar como leído.");return;}await fetchNotifications();};
 const unreadCount=notifications.reduce((n,row)=>n+(row.unread_count??(row.read?0:1)),0);
 return <NotificationsContext.Provider value={{notifications,unreadCount,loading,markRead,markAllRead,refresh:fetchNotifications,banner,dismissBanner:()=>setBanner(null),error}}>{children}</NotificationsContext.Provider>;
}
export function useNotifications(){const context=useContext(NotificationsContext);if(!context)throw new Error("useNotifications must be used within NotificationsProvider");return context;}
