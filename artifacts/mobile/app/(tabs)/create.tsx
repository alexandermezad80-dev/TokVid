import { Feather } from "@expo/vector-icons";
import { CameraView, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { saveVideoTags } from "../../lib/videoTags";
import { PickedMedia, PublicationDraft, publicationId, validateMedia } from "../../lib/features/publishing/model";
import { publishDraft } from "../../lib/features/publishing/service";
import { uploadPublicationFile } from "../../lib/features/publishing/nativeUpload";

const tones = ["rgba(0,242,254,0.26)", "rgba(254,9,121,0.26)"] as const;
type Phase = "pick" | "edit" | "uploading" | "success";
export default function CreateScreen() {
  const insets = useSafeAreaInsets();
  const { user, profile, requireAuth } = useAuth();
  const [phase, setPhase] = useState<Phase>("pick");
  const [draft, setDraft] = useState<PublicationDraft | null>(null);
  const [caption, setCaption] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [focused, setFocused] = useState(false);
  const [mode, setMode] = useState<"video" | "picture">("video");
  const [facing, setFacing] = useState<"front" | "back">("back");
  const [flash, setFlash] = useState(false);
  const [recording, setRecording] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraPermission, requestCamera] = useCameraPermissions();
  const [, requestMicrophone] = useMicrophonePermissions();
  const camera = useRef<CameraView>(null);
  const busy = useRef(false);
  const selecting = useRef(false);
  const mounted = useRef(true);
  const selection = useRef(0);
  const currentUserId = useRef(user?.id); currentUserId.current = user?.id;
  const player = useVideoPlayer(draft?.kind === "video" ? draft.uri : null, p => { p.loop = true; });
  const [playing, setPlaying] = useState(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; selection.current++; }; }, []);
  useFocusEffect(useCallback(() => { setFocused(true); return () => { setFocused(false); camera.current?.stopRecording(); }; }, []));
  useEffect(() => { player.pause(); setPlaying(false); }, [draft?.id, focused, phase, player]);
  useEffect(() => { if (draft && user?.id !== draft.userId && !busy.current) { setDraft(null); setCaption(""); setPhase("pick"); } }, [user?.id, draft]);
  const reset = () => { if (busy.current || selecting.current) return; player.pause(); setDraft(null); setCaption(""); setError(null); setProgress(0); setPhase("pick"); };
  const prepare = async (asset: PickedMedia, owner: string) => {
    const sequence = ++selection.current;
    setPreparing(true); setError(null);
    try {
      let uri = asset.uri;
      const kind = asset.type === "video" ? "video" : "image";
      if (kind === "image") {
        const context = ImageManipulator.manipulate(uri);
        if ((asset.width ?? 0) > 1920) context.resize({ width: 1920 });
        const image = await context.renderAsync();
        try { uri = (await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.9 })).uri; }
        finally { image.release(); context.release(); }
      }
      const info = Platform.OS === "web" ? { exists: true, size: (await (await fetch(uri)).blob()).size } : await FileSystem.getInfoAsync(uri);
      const size = info.exists && "size" in info ? info.size : 0;
      const details = validateMedia({ ...asset, uri, type: kind, ...(kind === "image" ? { mimeType: "image/jpeg" } : {}) }, size);
      if (!mounted.current || selection.current !== sequence || currentUserId.current !== owner) return;
      setDraft({ id: publicationId(), userId: owner, uri, ...details }); setPhase("edit");
    } catch (e: any) { if (mounted.current) setError(e?.message ?? "No pudimos abrir ese archivo."); }
    finally { if (mounted.current) setPreparing(false); }
  };
  const pick = async () => {
    if (selecting.current || busy.current) return;
    selecting.current = true;
    try {
      const owner = user ?? await requireAuth(); if (!owner) return;
      setError(null);
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["videos", "images"], allowsMultipleSelection: false, allowsEditing: false, quality: 1, videoMaxDuration: 180 });
      if (!result.canceled && result.assets[0]) await prepare(result.assets[0], owner.id);
    } catch { setError("No pudimos abrir tu galería. Revisa los permisos de TokVid."); }
    finally { selecting.current = false; }
  };
  const capture = async () => {
    if (recording) { camera.current?.stopRecording(); return; }
    if (preparing || busy.current || selecting.current || !cameraReady) return;
    const owner = user ?? await requireAuth(); if (!owner || !camera.current) return;
    selecting.current = true; setError(null);
    try {
      if (mode === "video") {
        const microphone = await requestMicrophone();
        if (!microphone.granted) { setError("Permite el micrófono para grabar con sonido."); return; }
        setRecording(true);
        const result = await camera.current.recordAsync({ maxDuration: 180 });
        if (result?.uri) await prepare({ uri: result.uri, type: "video", mimeType: result.uri.toLowerCase().endsWith(".mov") ? "video/quicktime" : "video/mp4" }, owner.id);
      } else {
        const result = await camera.current.takePictureAsync({ quality: 0.9 });
        if (result) await prepare({ ...result, type: "image" }, owner.id);
      }
    } catch { setError("No pudimos capturar el archivo. También puedes elegirlo en Galería."); }
    finally { selecting.current = false; setRecording(false); }
  };
  const publish = async () => {
    if (!draft || busy.current || preparing) return;
    busy.current = true; setPhase("uploading"); setError(null); setProgress(0); player.pause();
    const sentCaption = caption;
    try {
      if (draft.kind === "video" && !draft.thumbnailUri && Platform.OS !== "web") {
        try {
          const [thumbnail] = await player.generateThumbnailsAsync(0, { maxWidth: 540 });
          const context = ImageManipulator.manipulate(thumbnail);
          const image = await context.renderAsync();
          try { draft.thumbnailUri = (await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 })).uri; }
          finally { image.release(); context.release(); thumbnail.release(); }
        } catch { /* A missing cover does not block a valid publication. */ }
      }
      const id = await publishDraft(supabase, draft, sentCaption, uploadPublicationFile, value => { if (mounted.current) setProgress(Math.round(value * 100)); });
      void saveVideoTags({ videoId: id, caption: sentCaption.trim(), authorId: draft.userId, authorName: profile?.username ?? "Usuario", authorAvatar: profile?.avatar_url ?? null }).catch(() => {});
      if (mounted.current) { setProgress(100); setPhase("success"); }
    } catch (e: any) { if (mounted.current) { setError(e?.message ?? "No pudimos publicar. Tu selección está lista para reintentar."); setPhase("edit"); } }
    finally { busy.current = false; }
  };
  const exit = () => {
    if (busy.current) return;
    if (draft && phase !== "success") Alert.alert("Descartar publicación", "Se descartarán la selección y la descripción.", [{ text: "Seguir editando", style: "cancel" }, { text: "Descartar", style: "destructive", onPress: reset }]);
    else { reset(); router.replace("/(tabs)"); }
  };
  const errorView = error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>;
  return <KeyboardAvoidingView style={[styles.screen, { paddingTop: insets.top, paddingBottom: 80 + insets.bottom }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Cerrar creación" onPress={exit} disabled={phase === "uploading" || recording} style={styles.iconButton}><Feather name="x" size={23} color="#fff" /></Pressable><Text style={styles.headerTitle}>{phase === "pick" ? "Crear" : phase === "success" ? "Publicación lista" : "Tu publicación"}</Text><View style={styles.brandDot} /></View>
    {phase === "pick" ? <>
      <View style={styles.stage}>
        {focused && cameraPermission?.granted && !preparing ? <CameraView ref={camera} style={StyleSheet.absoluteFill} facing={facing} mode={mode} flash={flash ? "on" : "off"} enableTorch={mode === "video" && flash} onCameraReady={() => setCameraReady(true)} onMountError={() => setError("No se pudo abrir la cámara. Puedes usar Galería.")} /> : <LinearGradient colors={["#10232A", "#18171F", "#241321"]} style={[StyleSheet.absoluteFill, styles.stageEmpty]}><Feather name="camera" size={44} color="#D0DEE0" /><Text style={styles.stageTitle}>Tu próximo momento</Text><Text style={styles.stageText}>Graba algo nuevo o elige una foto o video de tu galería.</Text><Pressable onPress={() => void requestCamera()} accessibilityRole="button" style={styles.activate}><Text style={styles.white}>Activar cámara</Text></Pressable></LinearGradient>}
        <View style={styles.stageTop}><LinearGradient colors={tones} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.pill}><Text style={styles.white}>TOKVID</Text></LinearGradient><Text style={styles.limit}>{recording ? "● Grabando" : "Hasta 3 min"}</Text></View>
        {cameraPermission?.granted && <View style={styles.tools}><Pressable style={styles.tool} accessibilityRole="button" accessibilityLabel="Cambiar cámara" disabled={recording} onPress={() => { setCameraReady(false); setFacing(facing === "back" ? "front" : "back"); }}><Feather name="refresh-cw" size={23} color="#fff" /></Pressable><Pressable style={styles.tool} accessibilityRole="button" accessibilityLabel={flash ? "Apagar flash" : "Encender flash"} onPress={() => setFlash(!flash)}><Feather name={flash ? "zap" : "zap-off"} size={23} color="#fff" /></Pressable></View>}
        {preparing && <View style={styles.loading}><ActivityIndicator color="#8DDDE0" /><Text style={styles.white}>Preparando…</Text></View>}
      </View>
      {errorView}
      <View style={styles.modes}>{(["video", "picture"] as const).map(value => <Pressable key={value} disabled={recording || preparing} onPress={() => { if (mode !== value) { setCameraReady(false); setMode(value); } }} style={[styles.mode, mode === value && styles.activeMode]}><Text style={[styles.modeText, mode === value && styles.white]}>{value === "video" ? "VIDEO" : "FOTO"}</Text></Pressable>)}</View>
      <View style={styles.captureRow}><Pressable onPress={() => void pick()} disabled={preparing || recording} accessibilityRole="button" accessibilityLabel="Elegir foto o video de galería" style={styles.sideAction}><View style={styles.galleryIcon}><Feather name="image" size={26} color="#EAF5F5" /></View><Text style={styles.small}>Galería</Text></Pressable><Pressable onPress={() => void capture()} disabled={!cameraPermission?.granted || preparing} accessibilityRole="button" accessibilityLabel={recording ? "Detener grabación" : mode === "video" ? "Grabar video" : "Tomar foto"}><LinearGradient colors={["#65BFC5", "#A96991"]} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.shutterRing}><View style={styles.shutterInner}><View style={[styles.shutter, mode === "video" && styles.videoShutter, recording && styles.stopShutter]} /></View></LinearGradient></Pressable><Pressable onPress={() => router.push("/live-create")} disabled={recording || preparing} style={styles.sideAction} accessibilityRole="button" accessibilityLabel="Crear LIVE"><Feather name="radio" size={25} color="#B7B4C0" /><Text style={styles.small}>LIVE</Text></Pressable></View>
    </> : phase === "success" ? <View style={styles.success}><LinearGradient colors={tones} style={styles.successIcon}><Feather name="check" size={38} color="#CAFFFF" /></LinearGradient><Text style={styles.stageTitle}>Ya está publicado</Text><Text style={styles.stageText}>Tu {draft?.kind === "image" ? "foto" : "video"} está disponible en tu perfil y en el feed.</Text><Pressable style={styles.primary} onPress={() => { reset(); router.push("/(tabs)/profile"); }}><Text style={styles.white}>Ver en mi perfil</Text></Pressable><Pressable style={styles.secondary} onPress={() => { const id = draft!.id; reset(); router.push({ pathname: "/publication", params: { id } }); }}><Text style={styles.white}>Ver publicación</Text></Pressable><Pressable style={styles.secondary} onPress={reset}><Text style={styles.small}>Crear otra</Text></Pressable></View> : <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.editContent}>
      <View style={styles.preview}>{draft?.kind === "image" ? <Image source={{ uri: draft.uri }} style={StyleSheet.absoluteFill} resizeMode="contain" /> : <><VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} surfaceType="textureView" /><Pressable accessibilityRole="button" accessibilityLabel={playing ? "Pausar vista previa" : "Reproducir vista previa"} style={styles.previewControl} onPress={() => { if (playing) player.pause(); else player.play(); setPlaying(!playing); }}><Feather name={playing ? "pause" : "play"} size={24} color="#fff" /></Pressable></>}</View>
      <View style={styles.captionBox}><TextInput value={caption} onChangeText={setCaption} editable={phase !== "uploading"} placeholder="Añade una descripción…" placeholderTextColor="#92929F" style={styles.caption} maxLength={300} multiline accessibilityLabel="Descripción de la publicación" /><Text style={styles.counter}>{caption.length}/300</Text></View>
      <View style={styles.audience}><Feather name="globe" size={15} color="#9CD1D4" /><Text style={styles.small}>Público · Perfil y feed</Text></View>
      {phase === "uploading" && <View accessibilityRole="progressbar" accessibilityValue={{ min:0, max:100, now:progress }}><View style={styles.track}><View style={[styles.fill, { width: `${progress}%` }]} /></View><Text style={styles.progress}>{progress < 96 ? `Subiendo… ${progress}%` : "Confirmando publicación…"}</Text></View>}
      {errorView}
      <Pressable disabled={phase === "uploading"} onPress={() => void publish()} accessibilityRole="button" accessibilityLabel="Publicar" style={styles.publish}><LinearGradient colors={tones} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.publishInner}>{phase === "uploading" ? <ActivityIndicator color="#fff" /> : <><Feather name="arrow-up" size={21} color="#fff" /><Text style={styles.white}>Publicar</Text></>}</LinearGradient></Pressable>
      <Pressable disabled={phase === "uploading"} onPress={() => void pick()} style={styles.secondary}><Text style={styles.small}>Cambiar archivo</Text></Pressable>
    </ScrollView>}
  </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({
  screen:{flex:1,backgroundColor:"#09090E"}, header:{height:52,flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingHorizontal:14},headerTitle:{color:"#F5F4F8",fontSize:17,fontWeight:"600"},iconButton:{width:44,height:44,alignItems:"center",justifyContent:"center"},brandDot:{width:8,height:8,borderRadius:4,backgroundColor:"#85BFC5",marginRight:18},
  stage:{flex:1,marginHorizontal:10,borderRadius:24,overflow:"hidden",backgroundColor:"#171820",minHeight:180},stageEmpty:{justifyContent:"center",alignItems:"center",paddingHorizontal:32,gap:16},stageTitle:{color:"#F4F4F7",fontSize:24,fontWeight:"700",textAlign:"center"},stageText:{color:"#B5B7C3",fontSize:14,lineHeight:22,textAlign:"center"},activate:{borderWidth:1,borderColor:"#6A8F98",paddingHorizontal:18,paddingVertical:12,borderRadius:22},white:{color:"#F8F8FA",fontSize:15,fontWeight:"600"},stageTop:{position:"absolute",left:16,right:16,top:16,flexDirection:"row",justifyContent:"space-between",alignItems:"center"},pill:{paddingHorizontal:14,paddingVertical:8,borderRadius:18,borderWidth:1,borderColor:"#FFFFFF20"},limit:{color:"#EBECF0",fontSize:12,backgroundColor:"#00000055",padding:8,borderRadius:15},tools:{position:"absolute",right:12,top:76,gap:12},tool:{width:44,height:44,borderRadius:22,backgroundColor:"#11131D88",alignItems:"center",justifyContent:"center"},loading:{...StyleSheet.absoluteFillObject,backgroundColor:"#0A0A12DD",alignItems:"center",justifyContent:"center",gap:12},
  modes:{flexDirection:"row",justifyContent:"center",gap:8,paddingTop:14},mode:{minHeight:36,paddingHorizontal:20,borderRadius:18,justifyContent:"center"},activeMode:{backgroundColor:"#252632"},modeText:{fontSize:12,fontWeight:"600",color:"#92929F"},captureRow:{flexDirection:"row",alignItems:"center",justifyContent:"space-evenly",paddingTop:12,paddingBottom:12},sideAction:{width:76,minHeight:68,alignItems:"center",justifyContent:"center",gap:6},galleryIcon:{width:44,height:40,borderWidth:1,borderColor:"#697681",borderRadius:10,justifyContent:"center",alignItems:"center",backgroundColor:"#1E2730"},small:{color:"#B7B8C5",fontSize:12,lineHeight:18},shutterRing:{width:76,height:76,borderRadius:38,padding:3},shutterInner:{flex:1,borderRadius:36,backgroundColor:"#11121A",padding:5,alignItems:"center",justifyContent:"center"},shutter:{width:58,height:58,borderRadius:29,backgroundColor:"#E6EEF0"},videoShutter:{backgroundColor:"#BE7595"},stopShutter:{width:30,height:30,borderRadius:8},
  editContent:{padding:16,paddingBottom:24,gap:14},preview:{height:300,backgroundColor:"#11121A",borderRadius:20,overflow:"hidden"},previewControl:{position:"absolute",bottom:12,right:12,width:46,height:46,borderRadius:23,backgroundColor:"#141722AA",justifyContent:"center",alignItems:"center"},captionBox:{backgroundColor:"#1B1C26",borderWidth:1,borderColor:"#FFFFFF12",borderRadius:16,padding:14},caption:{color:"#FFF",fontSize:15,minHeight:65,textAlignVertical:"top"},counter:{color:"#8F91A1",fontSize:12,textAlign:"right"},audience:{flexDirection:"row",alignItems:"center",gap:8},publish:{borderWidth:1,borderColor:"#FFFFFF22",borderRadius:15,overflow:"hidden"},publishInner:{minHeight:52,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8},track:{height:4,borderRadius:2,backgroundColor:"#2A2A36",overflow:"hidden"},fill:{height:4,backgroundColor:"#86D5DB"},progress:{color:"#BABCCA",fontSize:13,marginTop:8},error:{color:"#F1A2B7",fontSize:13,lineHeight:18,marginHorizontal:16,marginVertical:8},success:{flex:1,alignItems:"center",justifyContent:"center",padding:30,gap:18},successIcon:{width:80,height:80,borderRadius:40,alignItems:"center",justifyContent:"center"},primary:{backgroundColor:"#25424B",minHeight:50,borderRadius:14,alignSelf:"stretch",alignItems:"center",justifyContent:"center"},secondary:{minHeight:44,alignItems:"center",justifyContent:"center"}
});
