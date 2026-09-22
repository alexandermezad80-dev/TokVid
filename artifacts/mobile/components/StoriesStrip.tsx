import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

type StoryRow = { id: string; user_id: string; media_url: string; media_type: "image" | "video"; created_at: string; expires_at: string; };
type StoryUser = { userId: string; username: string; avatarUrl: string; };

function fallbackAvatar(username: string) {
  return "https://api.dicebear.com/9.x/initials/png?seed=" + encodeURIComponent(username) + "&backgroundColor=FE2C55&textColor=ffffff&size=128";
}

export default function StoriesStrip() {
  const { user } = useAuth();
  const [items, setItems] = useState<StoryUser[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStories = useCallback(async () => {
    if (!user) { setItems([]); setLoading(false); return; }
    const now = new Date().toISOString();
    const { data: stories, error } = await supabase.from("stories").select("id,user_id,media_url,media_type,created_at,expires_at").gt("expires_at", now).order("created_at", { ascending: false }).limit(100);
    if (error || !stories) { setItems([]); setLoading(false); return; }
    const rows = stories as StoryRow[];
    const userIds = [...new Set(rows.map((story) => story.user_id))];
    if (userIds.length === 0) { setItems([]); setLoading(false); return; }
    const { data: profiles } = await supabase.from("profiles").select("id,username,avatar_url").in("id", userIds);
    const profileMap = new Map(((profiles as Array<{ id: string; username: string | null; avatar_url: string | null }> | null) ?? []).map((profile) => [profile.id, profile]));
    const latestByUser = new Map<string, StoryRow>();
    for (const story of rows) if (!latestByUser.has(story.user_id)) latestByUser.set(story.user_id, story);
    const grouped = [...latestByUser.values()].map((story) => {
      const profile = profileMap.get(story.user_id);
      const username = profile?.username ?? "Usuario";
      return { userId: story.user_id, username, avatarUrl: profile?.avatar_url ?? fallbackAvatar(username) };
    }).sort((a, b) => a.userId === user.id ? -1 : b.userId === user.id ? 1 : 0);
    setItems(grouped); setLoading(false);
  }, [user]);

  useEffect(() => { loadStories(); }, [loadStories]);
  const openStory = (userId: string) => router.push({ pathname: "/story-viewer", params: { userId } });

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.item} onPress={() => router.push("/story-create")}>
          <View style={styles.addCircle}><Feather name="plus" size={24} color="#fff" /></View>
          <Text style={styles.label} numberOfLines={1}>Tu historia</Text>
        </TouchableOpacity>
        {loading ? <View style={styles.loader}><ActivityIndicator color="#fff" size="small" /></View> : items.map((item) => (
          <TouchableOpacity key={item.userId} style={styles.item} onPress={() => openStory(item.userId)}>
            <View style={styles.storyRing}><Image source={{ uri: item.avatarUrl }} style={styles.avatar} /></View>
            <Text style={styles.label} numberOfLines={1}>{item.userId === user?.id ? "Tu historia" : item.username}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 94, backgroundColor: "rgba(0,0,0,0.72)" },
  content: { paddingHorizontal: 12, alignItems: "center", gap: 12 },
  item: { width: 68, alignItems: "center", gap: 5 },
  storyRing: { width: 58, height: 58, borderRadius: 29, borderWidth: 2, borderColor: "#FE2C55", alignItems: "center", justifyContent: "center" },
  addCircle: { width: 58, height: 58, borderRadius: 29, backgroundColor: "#1C1C1E", borderWidth: 1, borderColor: "#444", alignItems: "center", justifyContent: "center" },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#111" },
  label: { color: "#fff", fontSize: 11, fontWeight: "600", maxWidth: 68, textAlign: "center" },
  loader: { width: 44, alignItems: "center", justifyContent: "center" },
});