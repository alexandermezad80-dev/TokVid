import {palette} from '../../../constants/palette';
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
  card:{ flexDirection:"row", alignItems:"center", gap:11, width:"92%", alignSelf:"center", padding:12, borderRadius:16, backgroundColor:palette.input, borderWidth:1, borderColor:palette.border },
  icon:{ width:42, height:42, borderRadius:13, backgroundColor:palette.button, alignItems:"center", justifyContent:"center" },
  copy:{ flex:1 },
  title:{ color:palette.text, fontSize:14, fontWeight:"800" },
  subtitle:{ color:palette.secondary, fontSize:12, marginTop:3 },
  open:{ paddingHorizontal:13, paddingVertical:9, borderRadius:15, backgroundColor:palette.button },
  openText:{ color:palette.onButton, fontSize:12, fontWeight:"800" },
});
