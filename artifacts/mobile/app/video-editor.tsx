import {Feather} from "@expo/vector-icons";
import {router,useLocalSearchParams,Stack} from "expo-router";
import {useVideoPlayer,VideoView,type VideoThumbnail} from "expo-video";
import React,{useEffect,useRef,useState} from "react";
import {ActivityIndicator,BackHandler,Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {palette} from "../constants/palette";
import {useAuth} from "../context/AuthContext";
import {getVideoEdit,completeVideoEdit,cancelVideoEdit} from "../lib/features/publishing/videoEditorSession";
import {inspectVideo,exportTrim,cancelTrim,readTrimProgress} from "../lib/features/publishing/videoTrimNative";
import VideoTrimTimeline from "../components/VideoTrimTimeline";
import {editorTime as time,trimBoundary,thumbnailTimes} from "../lib/features/publishing/trimTimeline";
import * as FileSystem from "expo-file-system/legacy";
export default function VideoEditor(){
 const {session}=useLocalSearchParams<{session?:string}>();
 const key=typeof session==="string"?session:"";
 const {user}=useAuth(),p=getVideoEdit(key,user?.id),insets=useSafeAreaInsets();
 const player=useVideoPlayer(p?.uri??null,source=>{source.loop=false;source.pause();});
 const [duration,setDuration]=useState(0),[start,setStart]=useState(0),[end,setEnd]=useState(0);
 const [playing,setPlaying]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const [current,setCurrent]=useState(0),[frames,setFrames]=useState<VideoThumbnail[]>([]),[dragging,setDragging]=useState(false),[progress,setProgress]=useState<number|null>(null),[thumbnailError,setThumbnailError]=useState(false);
 const window=useWindowDimensions();
 const alive=useRef(true),exporting=useRef(false),operation=useRef(0),leaving=useRef(false);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;operation.current++;cancelTrim();cancelVideoEdit(key);try{player.pause();}catch{}};},[player]);
 useEffect(()=>{if(!p)return;let active=true;
  void inspectVideo(p.uri).then(v=>{if(active){setDuration(v.durationMs/1000);setEnd(v.durationMs/1000);setStart(0);}})
   .catch(e=>{if(active)setError(e?.message||"No pudimos leer el video.");});
  return()=>{active=false;};
 },[p?.key,p?.uri]);
 useEffect(()=>{if(!duration||!p)return;let active=true;
  setFrames([]);setThumbnailError(false);
  void player.generateThumbnailsAsync(thumbnailTimes(duration),{maxWidth:120,maxHeight:160}).then(images=>{if(active)setFrames(images);}).catch(()=>{if(active)setThumbnailError(true);});
  return()=>{active=false;};
 },[duration,p?.key,player]);
 useEffect(()=>{if(!busy)return;let active=true,polling=false;
  const poll=async()=>{if(polling)return;polling=true;try{const value=await readTrimProgress();if(active)setProgress(typeof value==='number'&&Number.isFinite(value)?Math.min(100,Math.max(0,value)):null);}catch{if(active)setProgress(null);}finally{polling=false;}};
  void poll();const timer=setInterval(()=>void poll(),300);return()=>{active=false;clearInterval(timer);};
 },[busy]);
 useEffect(()=>{player.timeUpdateEventInterval=0.1;
  const sub=player.addListener("timeUpdate",event=>{setCurrent(event.currentTime);if(end>0&&event.currentTime>=end){player.pause();setPlaying(false);}});
  const playingSub=player.addListener("playingChange",event=>setPlaying(event.isPlaying));
  const statusSub=player.addListener("statusChange",event=>{if(event.status==='error')setError('No se pudo reproducir este video.');});
  return()=>{sub.remove();playingSub.remove();statusSub.remove();};
 },[player,end]);
 const cancel=()=>{if(leaving.current)return;leaving.current=true;operation.current++;cancelTrim();cancelVideoEdit(key);player.pause();router.back();};
 const cancelRef=useRef(cancel);cancelRef.current=cancel;
 useEffect(()=>{const sub=BackHandler.addListener('hardwareBackPress',()=>{cancelRef.current();return true;});return()=>sub.remove();},[]);
 const preview=()=>{if(busy||!duration)return;if(playing){player.pause();setPlaying(false);}else{
  if(player.currentTime<start||player.currentTime>=end)player.currentTime=start;
  player.play();setPlaying(true);
 }};
 const change=(first:boolean,value:number)=>{if(busy||!duration)return;
  const n=trimBoundary(first,value,start,end,duration);
  if(first)setStart(n);else setEnd(n);
  player.currentTime=n;setCurrent(n);
  player.pause();setPlaying(false);
 };
 const apply=async()=>{if(!p||!user||exporting.current||!duration||end-start<0.5)return;
  exporting.current=true;const request=++operation.current;
  setBusy(true);setProgress(null);setError("");player.pause();setPlaying(false);
  try{const result=await exportTrim(p.uri,Math.round(start*1000),Math.round(end*1000));
   if(!alive.current||request!==operation.current){await FileSystem.deleteAsync(result.uri,{idempotent:true});return;}
   if(!completeVideoEdit(key,user.id,result)){await FileSystem.deleteAsync(result.uri,{idempotent:true});throw Error("El proyecto cambió; no se aplicó el recorte.");}
   router.back();
  }catch(e:any){if(alive.current&&request===operation.current)setError(e?.message||"No se pudo exportar el recorte.");}
  finally{exporting.current=false;if(alive.current&&request===operation.current)setBusy(false);}
 };
 return <View style={[styles.screen,{paddingTop:insets.top,paddingBottom:insets.bottom}]}>
 <Stack.Screen options={{presentation:"fullScreenModal",headerShown:false}}/>
 <View style={styles.header}><Pressable onPress={cancel} accessibilityLabel="Cerrar editor" style={styles.close}><Feather name="x" size={23} color={palette.text}/></Pressable><Text style={styles.heading}>Editor TOKVID</Text><View style={styles.close}/></View>
 {!p?<View style={styles.content}><Text>Proyecto no disponible. Vuelve a Crear.</Text><Pressable onPress={cancel}><Text>Volver</Text></Pressable></View>:
 <ScrollView scrollEnabled={!dragging} contentContainerStyle={styles.content}>
  <View style={[styles.preview,{height:Math.max(200,Math.min(380,window.height*0.42))}]}><VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} surfaceType="textureView"/>
   <Pressable disabled={busy||!duration} onPress={preview} accessibilityLabel={playing?"Pausar":"Reproducir fragmento"} style={styles.play}><Feather name={playing?"pause":"play"} size={26} color="#FFFFFF"/></Pressable>
  </View>
  <View style={styles.row}><Text style={styles.title}>Recortar video</Text><Text style={styles.muted}>{time(start)} — {time(end)}</Text></View>
  <Text style={styles.muted}>Elige inicio y final. Tu video original se conserva.</Text>
  <VideoTrimTimeline duration={duration} start={start} end={end} current={current} frames={frames} disabled={busy||duration<0.5} onChange={change} onDrag={setDragging} onSeek={value=>{player.pause();setPlaying(false);player.currentTime=value;setCurrent(value);}}/>
  {thumbnailError&&<Text style={styles.muted}>Miniaturas no disponibles. Puedes seleccionar el tramo y previsualizarlo.</Text>}
  {([true,false] as const).map(first=><View key={first?'start':'end'} style={styles.row}>
   <Text style={styles.title}>{first?'Inicio':'Final'} · {time(first?start:end)}</Text>
   <View style={styles.row}>{([-1,1] as const).map(direction=><Pressable key={direction} disabled={busy||duration<0.5} accessibilityLabel={`${direction<0?'Retroceder':'Avanzar'} ${first?'inicio':'final'} 0.1 segundos`} style={styles.step} onPress={()=>change(first,(first?start:end)+direction*0.1)}><Feather name={direction<0?'minus':'plus'} size={16} color={palette.text}/><Text>0.1 s</Text></Pressable>)}</View>
  </View>)}
  {busy&&<View accessibilityRole="progressbar" accessibilityValue={progress===null?{text:'Preparando exportación'}:{min:0,max:100,now:progress}} style={styles.group}>
   <Text style={styles.title}>{progress===null?'Preparando exportación…':`Exportando ${Math.round(progress)}%`}</Text>
   {progress===null?<ActivityIndicator color={palette.teal}/>:<View style={styles.track}><View style={[styles.progress,{width:`${progress}%`}]}/></View>}
  </View>}
  <Text style={styles.muted}>Fragmento: {time(end-start)}. Al aplicar podrás guardar un borrador o publicar desde Crear.</Text>
  {!!error&&<Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
  <Pressable onPress={()=>void apply()} disabled={busy||!duration||end-start<0.5} accessibilityLabel="Aplicar recorte real" style={[styles.action,(busy||!duration)&&{opacity:0.4}]}>
   {busy?<ActivityIndicator color="#FFFFFF"/>:<><Feather name="check" size={20} color="#FFFFFF"/><Text style={styles.actionText}>Aplicar recorte</Text></>}
  </Pressable>
  <Pressable style={styles.cancel} onPress={cancel}><Text style={styles.title}>{busy?"Cancelar exportación":"Cancelar sin cambios"}</Text></Pressable>
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
 step:{height:48,minWidth:64,paddingHorizontal:10,flexDirection:"row",gap:7,alignItems:"center",justifyContent:"center",borderWidth:1,borderColor:palette.border,borderRadius:10},
 action:{height:52,backgroundColor:palette.button,borderRadius:14,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8},
 actionText:{fontFamily:"Inter_500Medium",fontSize:15,color:"#FFFFFF"},
 cancel:{height:48,alignItems:"center",justifyContent:"center"},
 error:{fontSize:13,color:palette.destructive}
});
