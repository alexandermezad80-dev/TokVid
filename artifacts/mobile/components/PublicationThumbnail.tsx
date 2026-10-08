import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import type { VideoItem } from "../hooks/useVideoFeed";
export default function PublicationThumbnail({ item }: { item: VideoItem }) {
  const [failed, setFailed] = useState(false);
  return <LinearGradient colors={["rgba(0,242,254,0.45)", "rgba(254,9,121,0.42)"]} start={{x:0,y:0}} end={{x:1,y:1}} style={[StyleSheet.absoluteFill, { padding: 1, borderRadius: 10 }]}><View style={{flex:1,borderRadius:9,overflow:"hidden",backgroundColor:"#181E28",alignItems:"center",justifyContent:"center"}}>
    <Image source={require("../assets/images/branding/icon_glass_foreground.png")} style={{position:"absolute",width:"72%",height:"72%",opacity:0.16}} resizeMode="contain" />
    <Feather name={item.mediaType === "image" ? "image" : "video"} size={28} color="#98AFBA" />
    {!!item.thumbnail && !failed && <Image source={item.thumbnail} onError={() => setFailed(true)} style={StyleSheet.absoluteFill} resizeMode="cover" />}
    <View style={{ position: "absolute", bottom: 8, left: 8, backgroundColor: "#00000055", padding: 4, borderRadius: 6 }}><Feather name={item.mediaType === "image" ? "image" : "play"} color="#fff" size={13} /></View>
  </View></LinearGradient>;
}
