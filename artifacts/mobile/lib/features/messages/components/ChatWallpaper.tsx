import React from 'react';
import {Image,StyleSheet,View} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {CHAT_WALLPAPERS} from '../chatWallpapers';
// Shared by chat, thumbnails and preview: preserve the entire original composition.
export default function ChatWallpaper({id}:{id:string}){
 const wallpaper=CHAT_WALLPAPERS.find(w=>w.id===id);
 return <View pointerEvents="none" style={[StyleSheet.absoluteFill,{overflow:'hidden',backgroundColor:wallpaper?.fill??(wallpaper?.source?'#E7ECF1':'#F5F7FA')}]}>
  {wallpaper?.colors&&<LinearGradient colors={wallpaper.colors} style={StyleSheet.absoluteFill}/>}
  {wallpaper?.source&&<Image source={wallpaper.source} resizeMode="contain" style={[StyleSheet.absoluteFill,{width:'100%',height:'100%'}]}/>}
 </View>;
}
