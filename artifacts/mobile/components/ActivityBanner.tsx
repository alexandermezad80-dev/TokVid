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
 const sameChat=banner?.type==="message"&&path==="/chat"&&params.conversationId===banner.data?.conversationId;
 useEffect(()=>{if(sameChat)dismissBanner();},[banner?.id,sameChat]);
 if(!banner||sameChat)return null;
 return <View style={[styles.banner,{top:insets.top+8}]} accessibilityLiveRegion="polite"><Pressable style={styles.body} onPress={()=>{void markRead(banner.id);openActivity(banner);dismissBanner();}}><Text numberOfLines={1} style={styles.title}>{banner.actor_name??"TokVid"}</Text><Text numberOfLines={2} style={styles.text}>{banner.message}</Text></Pressable><Pressable style={styles.close} onPress={dismissBanner} accessibilityLabel="Cerrar aviso"><Feather name="x" size={21} color="#DCE6ED"/></Pressable></View>;
}
const styles=StyleSheet.create({banner:{position:"absolute",left:12,right:12,zIndex:1000,elevation:20,flexDirection:"row",alignItems:"center",backgroundColor:"#24343F",borderColor:"#88A6B23D",borderWidth:1,borderRadius:16},body:{flex:1,padding:14},title:{color:"#F5F7FA",fontSize:15,fontWeight:"600"},text:{color:"#D0DEE5",fontSize:13,marginTop:4},close:{width:44,minHeight:48,alignItems:"center",justifyContent:"center"}});
