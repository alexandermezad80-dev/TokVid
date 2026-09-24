import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = { roomId: string };

export default function LiveShareCard({ roomId }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.icon}>
        <Feather name="radio" size={22} color="#fff" />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>LIVE de TOKVID</Text>
        <Text style={styles.subtitle}>Te compartieron una transmisión en vivo.</Text>
      </View>
      <TouchableOpacity
        style={styles.open}
        onPress={() => router.push(`/live-room?roomId=${encodeURIComponent(roomId)}`)}
      >
        <Text style={styles.openText}>Abrir</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card:{ flexDirection:"row", alignItems:"center", gap:11, width:"92%", alignSelf:"center", padding:12, borderRadius:16, backgroundColor:"#171719", borderWidth:1, borderColor:"#2A2A2D" },
  icon:{ width:42, height:42, borderRadius:13, backgroundColor:"#FE2C55", alignItems:"center", justifyContent:"center" },
  copy:{ flex:1 },
  title:{ color:"#fff", fontSize:14, fontWeight:"800" },
  subtitle:{ color:"#8A8A8D", fontSize:12, marginTop:3 },
  open:{ paddingHorizontal:13, paddingVertical:9, borderRadius:15, backgroundColor:"#2A2A2D" },
  openText:{ color:"#fff", fontSize:12, fontWeight:"800" },
});