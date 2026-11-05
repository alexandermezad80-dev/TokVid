import VideoShareSheet from "../components/VideoShareSheet";
import {useAuth} from "../context/AuthContext";
import {requestRegistration} from "../lib/features/auth/services/registrationBridge";
import {publicationId} from "../lib/features/publishing/model";
import type {VideoItem} from "../hooks/useVideoFeed";
import { Feather } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View, Share } from "react-native";
import { supabase } from "../lib/supabase";

type Story = { id: string; user_id: string; media_url: string; media_type: "image" | "video"; created_at: string; expires_at: string; };
type Profile = { username: string | null; avatar_url: string | null; };

export default function StoryViewerScreen() {
  const { userId, storyId } = useLocalSearchParams<{ userId: string; storyId?: string }>();
  const {user}=useAuth();
  const [sharing,setSharing]=useState(false);
  const [stories, setStories] = useState<Story[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const story = stories[index] ?? null;
  const player = useVideoPlayer(story?.media_type === "video" ? story.media_url : "", (p) => { p.loop = false; p.muted = false; });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!userId) { setLoading(false); return; }
      setLoading(true);
      const now = new Date().toISOString();
      const [{ data: storyData }, { data: profileData }] = await Promise.all([
        supabase.from("stories").select("id,user_id,media_url,media_type,created_at,expires_at").eq("user_id", userId).gt("expires_at", now).order("created_at", { ascending: true }),
        supabase.from("profiles").select("username,avatar_url").eq("id", userId).maybeSingle(),
      ]);
      if (cancelled) return;
      const available=(storyData as Story[] | null) ?? [];
      // An expired shared story must not silently open another story from its author.
      const target=storyId?available.findIndex(item=>item.id===storyId):0;
      setStories(target<0?[]:available);setIndex(Math.max(0,target));setProfile((profileData as Profile | null)??null);setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [userId,storyId]);

  useEffect(() => { if (story?.media_type === "video") { player.currentTime = 0;player.play(); } }, [story?.id, player]);
  useEffect(()=>{if(story?.media_type === "video"){if(sharing)player.pause();else player.play();}},[sharing,story?.id,player]);
  const avatar = useMemo(() => profile?.avatar_url ?? ("https://api.dicebear.com/9.x/initials/png?seed=" + encodeURIComponent(profile?.username ?? "TokVid") + "&backgroundColor=FE2C55&textColor=ffffff&size=128"), [profile?.avatar_url, profile?.username]);
  const close = () => router.back();
  const goPrevious = () => { if (index > 0) setIndex((value) => value - 1); };
  const goNext = () => { if (index < stories.length - 1) setIndex((value) => value + 1); else close(); };

  if (loading) return <View style={styles.container}><ActivityIndicator color="#fff" size="large" /></View>;
  if (!story) return <View style={styles.container}><TouchableClose onPress={close} /><View style={styles.empty}><Feather name="clock" size={42} color="#555" /><Text style={styles.emptyTitle}>Historia no disponible</Text><Text style={styles.emptyText}>Esta historia ya expiró o fue eliminada.</Text></View></View>;

  return (
    <View style={styles.container}>
      {story.media_type === "image" ? <Image source={{ uri: story.media_url }} style={styles.media} resizeMode="contain" /> : <VideoView player={player} style={styles.media} contentFit="contain" nativeControls={false} />}
      <View style={styles.topOverlay}>
        <View style={styles.progressRow}>{stories.map((item, itemIndex) => <View key={item.id} style={styles.progressTrack}><View style={[styles.progressFill, itemIndex <= index && styles.progressFillActive]} /></View>)}</View>
        <View style={styles.userRow}><Image source={{ uri: avatar }} style={styles.avatar} /><Text style={styles.username}>{profile?.username ?? "Usuario"}</Text><View style={styles.spacer} /><Pressable accessibilityRole="button" accessibilityLabel="Compartir historia" onPress={()=>user?setSharing(true):requestRegistration()} hitSlop={12}><Feather name="share-2" size={22} color="#fff"/></Pressable><Pressable onPress={close} hitSlop={12}><Feather name="x" size={28} color="#fff" /></Pressable></View>
      </View>
      <VideoShareSheet video={sharing?{id:story.id,storyId:story.id,uri:story.media_url,mediaType:story.media_type,thumbnail:story.media_type==='image'?{uri:story.media_url}:undefined,creator:profile?.username??'',creatorHandle:'',creatorAvatar:profile?.avatar_url??'',creatorId:story.user_id,caption:'Historia de @'+(profile?.username??'Usuario'),song:'',likes:0,comments:0,shares:0,isFollowing:false,isReal:true}:null}
        onClose={()=>setSharing(false)} onDelete={()=>{}} onHide={()=>{}} onShare={async(item:VideoItem)=>{
          const result=await Share.share({message:`${item.caption}\n${item.uri}`});
          if(result.action===Share.dismissedAction)return;
          const {error}=await supabase.rpc('record_story_share',{p_story_id:item.id,p_event_id:publicationId()});
          if(error)throw new Error('No se pudo guardar la historia en Compartidos.');
          setSharing(false);
        }}/>
      <View style={styles.touchLayer}><Pressable style={styles.touchHalf} onPress={goPrevious} /><Pressable style={styles.touchHalf} onPress={goNext} /></View>
    </View>
  );
}

function TouchableClose({ onPress }: { onPress: () => void }) { return <Pressable style={styles.closeButton} onPress={onPress} hitSlop={12}><Feather name="x" size={28} color="#fff" /></Pressable>; }

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  media: { ...StyleSheet.absoluteFillObject, zIndex: 1 },
  topOverlay: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 3, paddingTop: 14, paddingHorizontal: 12 },
  progressRow: { flexDirection: "row", gap: 4, marginBottom: 12 },
  progressTrack: { flex: 1, height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.35)", overflow: "hidden" },
  progressFill: { height: "100%", width: "0%" },
  progressFillActive: { width: "100%", backgroundColor: "#fff" },
  userRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  avatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: "#fff" },
  username: { fontFamily: "Inter_500Medium", color: "#fff", fontSize: 15, fontWeight: "normal" },
  spacer: { flex: 1 },
  touchLayer: { ...StyleSheet.absoluteFillObject, zIndex: 2, flexDirection: "row" },
  touchHalf: { flex: 1 },
  closeButton: { position: "absolute", top: 18, right: 16, zIndex: 4 },
  empty: { alignItems: "center", gap: 10, paddingHorizontal: 32 },
  emptyTitle: { fontFamily: "Inter_500Medium", color: "#fff", fontSize: 19, fontWeight: "normal" },
  emptyText: { fontFamily: "Inter_400Regular", color: "#777", fontSize: 14, textAlign: "center", lineHeight: 20 },
});