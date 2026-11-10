import React,{useState} from 'react';
import {Image,StyleSheet,View} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {CHAT_WALLPAPERS} from '../chatWallpapers';
import {nextWallpaperFrame} from '../wallpaperFrame';
import AuroraWallpaper from './AuroraWallpaper';
// Only the private-chat backdrop opts into a stable keyboard canvas.
export default function ChatWallpaper({id,stableFrame=false}:{id:string;stableFrame?:boolean}){
 const [frame,setFrame]=useState({width:0,height:0});
 const wallpaper=CHAT_WALLPAPERS.find(w=>w.id===id);
 return <View pointerEvents="none" accessible={false} onLayout={event=>{const {width,height}=event.nativeEvent.layout;setFrame(previous=>nextWallpaperFrame(previous,{width,height},stableFrame));}} style={[StyleSheet.absoluteFill,{overflow:'hidden',backgroundColor:id==='aurora'?'#EDE6F0':wallpaper?.fill??(wallpaper?.source?'#E7ECF1':'#F5F7FA')}]}>
  <View style={stableFrame&&frame.height>0?{position:'absolute',top:0,left:0,right:0,height:frame.height}:StyleSheet.absoluteFill}>
  {id==='aurora'?<AuroraWallpaper/>:<>
  {wallpaper?.colors&&<LinearGradient colors={wallpaper.colors} style={StyleSheet.absoluteFill}/>}
  {wallpaper?.source&&<Image source={wallpaper.source} resizeMode="cover" style={[StyleSheet.absoluteFill,{width:'100%',height:'100%'}]}/>}
  </>}
  </View>
 </View>;
}
