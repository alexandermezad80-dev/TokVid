import {useAudioPlayer} from "expo-audio";
import {supabase} from "../lib/supabase";
import {useAuth} from "../context/AuthContext";
import React,{useEffect} from "react";
import {Pressable,StyleSheet,Text,View} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {router,useGlobalSearchParams,usePathname} from "expo-router";
import {Feather} from "@expo/vector-icons";
import {useNotifications,type AppNotification} from "../context/NotificationsContext";
export function openActivity(n:AppNotification){
 if(n.type==="message"&&typeof n.data?.conversationId==="string")router.push({pathname:"/chat",params:{conversationId:n.data.conversationId}});
 else if(typeof n.data?.videoId==="string")router.push({pathname:"/publication",params:{id:n.data.videoId}});
 else if(n.actor_id)router.push({pathname:"/user-profile",params:{userId:n.actor_id}});
}
export function ActivityBanner(){const {banner,dismissBanner,markRead}=useNotifications(),insets=useSafeAreaInsets(),path=usePathname(),params=useGlobalSearchParams();
 const {user}=useAuth();const normalTone=useAudioPlayer(require("../assets/sounds/message-default.wav")),softTone=useAudioPlayer(require("../assets/sounds/message-soft.wav"));
 const sameChat=banner?.type==="message"&&path==="/chat"&&params.conversationId===banner.data?.conversationId;
 useEffect(()=>{if(sameChat)dismissBanner();},[banner?.id,sameChat]);
 useEffect(()=>{if(!banner||sameChat||!user)return;let active=true;void(async()=>{let tone="default";if(banner.type==="message"&&typeof banner.data?.conversationId==="string"){const {data,error}=await supabase.from("chat_preferences").select("tone,mute_messages").eq("user_id",user.id).eq("conversation_id",banner.data.conversationId).maybeSingle();if(error||data?.mute_messages)return;tone=data?.tone??"default";}if(!active||tone==="none")return;const p=tone==="soft"?softTone:normalTone;await p.seekTo(0);if(active)p.play();})().catch(()=>{});return()=>{active=false;};},[banner?.id,sameChat,user?.id]);
 if(!banner||sameChat)return null;
 return <View style={[styles.banner,{top:insets.top+8}]} accessibilityLiveRegion="polite"><Pressable style={styles.body} onPress={()=>{void markRead(banner.id);openActivity(banner);dismissBanner();}}><Text numberOfLines={1} style={styles.title}>{banner.actor_name??"TokVid"}</Text><Text numberOfLines={2} style={styles.text}>{banner.message}</Text></Pressable><Pressable style={styles.close} onPress={dismissBanner} accessibilityLabel="Cerrar aviso"><Feather name="x" size={21} color="#DCE6ED"/></Pressable></View>;
}
const styles=StyleSheet.create({banner:{position:"absolute",left:12,right:12,zIndex:1000,elevation:20,flexDirection:"row",alignItems:"center",backgroundColor:"#24343F",borderColor:"#88A6B23D",borderWidth:1,borderRadius:16},body:{flex:1,padding:14},title:{color:"#F5F7FA",fontSize:15,fontWeight:"600"},text:{color:"#D0DEE5",fontSize:13,marginTop:4},close:{width:44,minHeight:48,alignItems:"center",justifyContent:"center"}});
