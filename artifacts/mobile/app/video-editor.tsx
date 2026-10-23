import {Feather} from "@expo/vector-icons";
import {router,useLocalSearchParams,Stack} from "expo-router";
import {useVideoPlayer,VideoView} from "expo-video";
import React,{useEffect,useRef,useState} from "react";
import {ActivityIndicator,Pressable,ScrollView,StyleSheet,Text,View} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {palette} from "../constants/palette";
import {useAuth} from "../context/AuthContext";
import {getVideoEdit,completeVideoEdit,cancelVideoEdit} from "../lib/features/publishing/videoEditorSession";
import {inspectVideo,exportTrim,cancelTrim} from "../lib/features/publishing/videoTrimNative";
const time=(n:number)=>{const s=Math.floor(Math.max(0,n));return Math.floor(s/60)+":"+String(s%60).padStart(2,"0");};
const limit=(n:number,min:number,max:number)=>Math.min(max,Math.max(min,n));
export default function VideoEditor(){
 const {session}=useLocalSearchParams<{session?:string}>();
 const key=typeof session==="string"?session:"";
 const {user}=useAuth(),p=getVideoEdit(key,user?.id),insets=useSafeAreaInsets();
 const player=useVideoPlayer(p?.uri??null,source=>{source.loop=false;source.pause();});
 const [duration,setDuration]=useState(0),[start,setStart]=useState(0),[end,setEnd]=useState(0);
 const [width,setWidth]=useState(1),[playing,setPlaying]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;player.pause();};},[player]);
 useEffect(()=>{if(!p)return;let active=true;
  void inspectVideo(p.uri).then(v=>{if(active){setDuration(v.durationMs/1000);setEnd(v.durationMs/1000);setStart(0);}})
   .catch(e=>{if(active)setError(e?.message||"No pudimos leer el video.");});
  return()=>{active=false;};
 },[p?.key,p?.uri]);
 useEffect(()=>{player.timeUpdateEventInterval=0.2;
  const sub=player.addListener("timeUpdate",event=>{if(end>0&&event.currentTime>=end){player.pause();setPlaying(false);}});
  return()=>sub.remove();
 },[player,end]);
 const cancel=()=>{cancelTrim();cancelVideoEdit(key);player.pause();router.back();};
 const preview=()=>{if(playing){player.pause();setPlaying(false);}else{
  if(player.currentTime<start||player.currentTime>=end)player.currentTime=start;
  player.play();setPlaying(true);
 }};
 const change=(first:boolean,value:number)=>{if(busy||!duration)return;
  const n=Math.round(limit(value,0,duration)*2)/2;
  if(first)setStart(limit(n,0,end-0.5));else setEnd(limit(n,start+0.5,duration));
  player.pause();setPlaying(false);
 };
 const apply=async()=>{if(!p||!user||busy||!duration||end-start<0.5)return;
  setBusy(true);setError("");player.pause();setPlaying(false);
  try{const result=await exportTrim(p.uri,Math.round(start*1000),Math.round(end*1000));
   if(!alive.current)return;
   if(!completeVideoEdit(key,user.id,result))throw Error("El proyecto cambió; no se aplicó el recorte.");
   router.back();
  }catch(e:any){if(alive.current)setError(e?.message||"No se pudo exportar el recorte.");}
  finally{if(alive.current)setBusy(false);}
 };
 return <View style={[styles.screen,{paddingTop:insets.top,paddingBottom:insets.bottom}]}>
 <Stack.Screen options={{presentation:"fullScreenModal",headerShown:false}}/>
 <View style={styles.header}><Pressable onPress={cancel} disabled={busy} accessibilityLabel="Cerrar editor" style={styles.close}><Feather name="x" size={23} color={palette.text}/></Pressable><Text style={styles.heading}>Editor TOKVID</Text><View style={styles.close}/></View>
 {!p?<View style={styles.content}><Text>Proyecto no disponible. Vuelve a Crear.</Text><Pressable onPress={cancel}><Text>Volver</Text></Pressable></View>:
 <ScrollView contentContainerStyle={styles.content}>
  <View style={styles.preview}><VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} surfaceType="textureView"/>
   <Pressable onPress={preview} accessibilityLabel={playing?"Pausar":"Reproducir fragmento"} style={styles.play}><Feather name={playing?"pause":"play"} size={26} color="#FFFFFF"/></Pressable>
  </View>
  <View style={styles.row}><Text style={styles.title}>Recortar video</Text><Text style={styles.muted}>{time(start)} — {time(end)}</Text></View>
  <Text style={styles.muted}>Elige inicio y final. Tu video original se conserva.</Text>
  {([true,false] as const).map(first=><View key={first?"start":"end"} style={styles.group}>
    <View style={styles.row}><Text style={styles.title}>{first?"Inicio":"Final"}</Text><Text>{time(first?start:end)}</Text></View>
    <Pressable accessibilityLabel={first?"Seleccionar inicio":"Seleccionar final"} onLayout={e=>setWidth(e.nativeEvent.layout.width)}
     onPress={e=>change(first,e.nativeEvent.locationX/width*duration)} style={styles.track}>
      <View style={[styles.progress,{width:duration?String((first?start:end)*100/duration)+"%":"0%"}]}/>
    </Pressable>
    <View style={styles.row}>
     <Pressable style={styles.step} onPress={()=>change(first,(first?start:end)-0.5)}><Feather name="minus" size={18} color={palette.text}/><Text>0.5 s</Text></Pressable>
     <Pressable style={styles.step} onPress={()=>change(first,(first?start:end)+0.5)}><Feather name="plus" size={18} color={palette.text}/><Text>0.5 s</Text></Pressable>
    </View>
  </View>)}
  <Text style={styles.muted}>Fragmento: {time(end-start)}. Al aplicar podrás guardar un borrador o publicar desde Crear.</Text>
  {!!error&&<Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
  <Pressable onPress={()=>void apply()} disabled={busy||!duration||end-start<0.5} accessibilityLabel="Aplicar recorte real" style={[styles.action,(busy||!duration)&&{opacity:0.4}]}>
   {busy?<ActivityIndicator color="#FFFFFF"/>:<><Feather name="check" size={20} color="#FFFFFF"/><Text style={styles.actionText}>Aplicar recorte</Text></>}
  </Pressable>
  <Pressable style={styles.cancel} onPress={cancel} disabled={busy}><Text style={styles.title}>Cancelar sin cambios</Text></Pressable>
 </ScrollView>}
 </View>;
}
const styles=StyleSheet.create({
 screen:{flex:1,backgroundColor:palette.background},
 header:{height:52,flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingHorizontal:12},
 heading:{fontFamily:"Inter_500Medium",fontSize:17,color:palette.text},
 close:{width:44,height:44,alignItems:"center",justifyContent:"center"},
 content:{padding:16,paddingBottom:36,gap:15},
 preview:{height:300,backgroundColor:palette.media,borderRadius:18,overflow:"hidden"},
 play:{position:"absolute",right:12,bottom:12,width:48,height:48,backgroundColor:"#0B0B0DCC",borderRadius:24,alignItems:"center",justifyContent:"center"},
 row:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:8},
 title:{fontFamily:"Inter_500Medium",fontSize:14,color:palette.text},
 muted:{fontFamily:"Inter_400Regular",fontSize:13,color:palette.secondary,lineHeight:20},
 group:{gap:13,borderRadius:13,borderWidth:1,borderColor:palette.border,padding:13},
 track:{height:24,borderRadius:12,backgroundColor:palette.input,justifyContent:"center",overflow:"hidden"},
 progress:{height:7,backgroundColor:palette.teal,borderRadius:4},
 step:{height:40,minWidth:90,paddingHorizontal:10,flexDirection:"row",gap:7,alignItems:"center",justifyContent:"center",borderWidth:1,borderColor:palette.border,borderRadius:10},
 action:{height:52,backgroundColor:palette.button,borderRadius:14,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8},
 actionText:{fontFamily:"Inter_500Medium",fontSize:15,color:"#FFFFFF"},
 cancel:{height:48,alignItems:"center",justifyContent:"center"},
 error:{fontSize:13,color:palette.destructive}
});
