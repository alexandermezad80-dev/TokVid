import { Feather } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { supabase } from "../lib/supabase";

type Story = { id: string; user_id: string; media_url: string; media_type: "image" | "video"; created_at: string; expires_at: string; };
type Profile = { username: string | null; avatar_url: string | null; };

export default function StoryViewerScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
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
      setStories((storyData as Story[] | null) ?? []); setProfile((profileData as Profile | null) ?? null); setIndex(0); setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => { if (story?.media_type === "video") { player.currentTime = 0; player.play(); } }, [story?.id, player]);
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
        <View style={styles.userRow}><Image source={{ uri: avatar }} style={styles.avatar} /><Text style={styles.username}>{profile?.username ?? "Usuario"}</Text><View style={styles.spacer} /><Pressable onPress={close} hitSlop={12}><Feather name="x" size={28} color="#fff" /></Pressable></View>
      </View>
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
  username: { color: "#fff", fontSize: 15, fontWeight: "700" },
  spacer: { flex: 1 },
  touchLayer: { ...StyleSheet.absoluteFillObject, zIndex: 2, flexDirection: "row" },
  touchHalf: { flex: 1 },
  closeButton: { position: "absolute", top: 18, right: 16, zIndex: 4 },
  empty: { alignItems: "center", gap: 10, paddingHorizontal: 32 },
  emptyTitle: { color: "#fff", fontSize: 19, fontWeight: "700" },
  emptyText: { color: "#777", fontSize: 14, textAlign: "center", lineHeight: 20 },
});