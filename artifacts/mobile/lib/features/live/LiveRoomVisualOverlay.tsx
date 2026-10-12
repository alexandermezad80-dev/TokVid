import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  title: string;
  spectatorCount: number;
  guestCount: number;
  isHost: boolean;
  hasModeratorPermission: boolean;
  onManage: () => void;
  onClose: () => void;
  onOpenChat: () => void;
  onInvite: () => void;
  onGifts: () => void;
  onShare: () => void;
};

export function LiveRoomVisualOverlay(p: Props) {
  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <View style={styles.top}>
        <Pressable style={styles.hostCard} onPress={p.onManage}>
          <View style={styles.avatar}><Feather name="user" size={15} color="#fff" /></View>
          <View style={styles.hostCopy}>
            <Text numberOfLines={1} style={styles.hostName}>{p.title || "LIVE"}</Text>
            <Text style={styles.followText}>{p.isHost ? "Host" : p.hasModeratorPermission ? "Moderador" : "Seguir"}</Text>
          </View>
        </Pressable>
        <View style={styles.viewerPill}><Feather name="eye" size={14} color="#fff" /><Text style={styles.viewerText}>{p.spectatorCount}</Text></View>
        <View style={styles.topRight}>
          {p.isHost || p.hasModeratorPermission ? <Pressable style={styles.manage} onPress={p.onManage}><Feather name={p.isHost ? "settings" : "users"} size={16} color="#fff" /></Pressable> : null}
          <Pressable style={styles.close} onPress={p.onClose}><Feather name="x" size={21} color="#fff" /></Pressable>
        </View>
      </View>
      <View style={styles.chatHint}><Text style={styles.chatHintText}>{p.guestCount}/11 Guests · Chat LIVE</Text></View>
      <View style={styles.bottomTools}>
        <Pressable style={styles.input} onPress={p.onOpenChat}>
          <Text style={styles.placeholder}>escribe algo</Text><Feather name="smile" size={17} color="#00F2FE" />
        </Pressable>
        <View style={styles.toolRow}>
          <Pressable style={styles.tool} onPress={p.onInvite}><Feather name="users" size={18} color="#00F2FE" /></Pressable>
          <Pressable style={styles.gift} onPress={p.onGifts}><Feather name="gift" size={18} color="#fff" /></Pressable>
          <Pressable style={styles.tool} onPress={p.onShare}><Feather name="share-2" size={18} color="#00F2FE" /></Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay:{...StyleSheet.absoluteFillObject,zIndex:10,pointerEvents:"box-none"},
  top:{position:"absolute",top:44,left:12,right:12,flexDirection:"row",alignItems:"center",gap:8},
  hostCard:{width:140,height:36,borderRadius:18,paddingHorizontal:7,backgroundColor:"rgba(0,0,0,.62)",flexDirection:"row",alignItems:"center"},
  avatar:{width:28,height:28,borderRadius:14,backgroundColor:"rgba(0,242,254,.28)",alignItems:"center",justifyContent:"center"},
  hostCopy:{flex:1,marginLeft:7},hostName:{color:"#fff",fontSize:11,fontWeight:"800"},followText:{color:"#00F2FE",fontSize:9,fontWeight:"800"},
  viewerPill:{minWidth:50,height:32,borderRadius:16,paddingHorizontal:9,backgroundColor:"rgba(0,0,0,.58)",flexDirection:"row",alignItems:"center",justifyContent:"center",gap:5},
  viewerText:{color:"#fff",fontSize:11,fontWeight:"800"},topRight:{marginLeft:"auto",flexDirection:"row",gap:7},
  manage:{width:36,height:36,borderRadius:18,backgroundColor:"rgba(0,0,0,.58)",alignItems:"center",justifyContent:"center"},
  close:{width:44,height:44,borderRadius:22,backgroundColor:"rgba(0,0,0,.58)",alignItems:"center",justifyContent:"center"},
  chatHint:{position:"absolute",left:12,right:12,bottom:150,minHeight:32,paddingHorizontal:10,paddingVertical:7,borderRadius:12,backgroundColor:"rgba(0,0,0,.30)"},
  chatHintText:{color:"#fff",fontSize:11,fontWeight:"700"},
  bottomTools:{position:"absolute",left:12,right:12,bottom:75,flexDirection:"row",alignItems:"center",gap:10},
  input:{flex:1,height:40,borderRadius:20,paddingHorizontal:14,borderWidth:1,borderColor:"#00F2FE",backgroundColor:"rgba(0,0,0,.48)",flexDirection:"row",alignItems:"center",justifyContent:"space-between"},
  placeholder:{color:"#ddd",fontSize:12},toolRow:{flexDirection:"row",gap:10},
  tool:{width:36,height:36,borderRadius:18,backgroundColor:"rgba(0,0,0,.60)",borderWidth:1,borderColor:"#00F2FE",alignItems:"center",justifyContent:"center"},
  gift:{width:36,height:36,borderRadius:18,backgroundColor:"#FE0979",alignItems:"center",justifyContent:"center"},
});