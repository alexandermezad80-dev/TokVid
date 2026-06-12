import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { useFollow } from "../context/FollowContext";
import { supabase } from "../lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PublicProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  followers_count: number;
  following_count: number;
  likes_count: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function avatarUrl(profile: PublicProfile) {
  if (profile.avatar_url) return profile.avatar_url;
  const seed = encodeURIComponent(profile.username);
  return `https://api.dicebear.com/9.x/initials/png?seed=${seed}&backgroundColor=FE2C55&textColor=ffffff&fontSize=38&size=128`;
}

// ─── Mock video grid (same thumbnails as profile) ────────────────────────────

const GRID_THUMBS = [
  require("../assets/images/thumb1.png"),
  require("../assets/images/thumb3.png"),
  require("../assets/images/thumb5.png"),
  require("../assets/images/thumb2.png"),
  require("../assets/images/thumb4.png"),
  require("../assets/images/thumb6.png"),
];

const MOCK_VIEWS = ["2.8M", "5.2M", "7.4M", "1.2M", "3.9M", "12M"];

// ─── Follow button ────────────────────────────────────────────────────────────

function FollowButton({ userId }: { userId: string }) {
  const { isFollowing, toggleFollow, loadingIds } = useFollow();
  const following = isFollowing(userId);
  const loading = loadingIds.has(userId);

  return (
    <TouchableOpacity
      style={[styles.followBtn, following && styles.followBtnActive]}
      onPress={() => toggleFollow(userId)}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color={following ? "#FE2C55" : "#fff"} size="small" />
      ) : (
        <Text style={[styles.followBtnText, following && styles.followBtnTextActive]}>
          {following ? "Siguiendo" : "Seguir"}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"videos" | "liked">("videos");

  const fetchProfile = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, bio, followers_count, following_count, likes_count")
      .eq("id", userId)
      .single();
    setProfile(data as PublicProfile | null);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const isOwnProfile = user?.id === userId;

  return (
    <View style={[styles.container]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 6 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {profile ? `@${profile.username}` : "Perfil"}
        </Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#FE2C55" size="large" />
        </View>
      ) : !profile ? (
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Feather name="user-x" size={32} color="#333" />
          </View>
          <Text style={styles.emptyTitle}>Usuario no encontrado</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
            <Text style={styles.retryText}>Volver</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Profile section */}
          <View style={styles.profileSection}>
            <Image source={{ uri: avatarUrl(profile) }} style={styles.avatar} />
            <Text style={styles.displayName}>{profile.username}</Text>
            {profile.bio ? (
              <Text style={styles.bio}>{profile.bio}</Text>
            ) : null}

            {/* Stats */}
            <View style={styles.stats}>
              {[
                { value: fmtCount(profile.following_count), label: "Siguiendo" },
                { value: fmtCount(profile.followers_count), label: "Seguidores" },
                { value: fmtCount(profile.likes_count), label: "Me gusta" },
              ].map((s) => (
                <View key={s.label} style={styles.stat}>
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* Actions */}
            {isOwnProfile ? (
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => router.push("/edit-profile")}
              >
                <Text style={styles.editBtnText}>Editar perfil</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.actions}>
                <FollowButton userId={profile.id} />
                <TouchableOpacity style={styles.msgBtn}>
                  <Feather name="message-circle" size={18} color="#fff" />
                  <Text style={styles.msgBtnText}>Mensaje</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Tab bar */}
          <View style={styles.tabBar}>
            {(["videos", "liked"] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.tabItem, tab === t && styles.tabItemActive]}
                onPress={() => setTab(t)}
              >
                <Feather
                  name={t === "videos" ? "grid" : "heart"}
                  size={20}
                  color={tab === t ? "#fff" : "#555"}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Video grid (mock) */}
          <View style={styles.grid}>
            {GRID_THUMBS.map((src, i) => (
              <TouchableOpacity key={i} style={styles.gridItem}>
                <Image source={src} style={StyleSheet.absoluteFill} resizeMode="cover" />
                <View style={styles.viewsBadge}>
                  <Feather name="play" size={10} color="#fff" />
                  <Text style={styles.viewsText}>{MOCK_VIEWS[i]}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: Platform.OS === "web" ? 34 : insets.bottom + 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#111",
  },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#fff", fontSize: 16, fontWeight: "700", flex: 1, textAlign: "center" },

  // Center states
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, paddingHorizontal: 40 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: "#111", alignItems: "center", justifyContent: "center",
  },
  emptyTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  retryBtn: {
    backgroundColor: "#FE2C55", borderRadius: 10,
    paddingHorizontal: 28, paddingVertical: 10,
  },
  retryText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // Profile
  profileSection: { alignItems: "center", paddingVertical: 24, paddingHorizontal: 16, gap: 10 },
  avatar: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 3, borderColor: "#FE2C55", backgroundColor: "#1C1C1E",
  },
  displayName: { color: "#fff", fontSize: 20, fontWeight: "700" },
  bio: { color: "#aaa", fontSize: 14, textAlign: "center", paddingHorizontal: 20, lineHeight: 20 },

  // Stats
  stats: { flexDirection: "row", gap: 32, marginTop: 4 },
  stat: { alignItems: "center", gap: 2 },
  statValue: { color: "#fff", fontSize: 18, fontWeight: "800" },
  statLabel: { color: "#888", fontSize: 13 },

  // Actions
  actions: { flexDirection: "row", gap: 10, marginTop: 4 },
  followBtn: {
    backgroundColor: "#FE2C55",
    borderRadius: 10,
    paddingHorizontal: 40,
    paddingVertical: 10,
    minWidth: 120,
    alignItems: "center",
  },
  followBtnActive: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: "#FE2C55",
  },
  followBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  followBtnTextActive: { color: "#FE2C55" },
  msgBtn: {
    backgroundColor: "#1C1C1E",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  msgBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  editBtn: {
    backgroundColor: "#1C1C1E",
    borderRadius: 10,
    paddingHorizontal: 52,
    paddingVertical: 10,
    marginTop: 4,
  },
  editBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // Tab bar
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#1C1C1E",
  },
  tabItem: { flex: 1, alignItems: "center", paddingVertical: 12 },
  tabItemActive: { borderBottomWidth: 2, borderBottomColor: "#fff" },

  // Grid
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 1 },
  gridItem: { width: "33.3%", height: 190, backgroundColor: "#111", overflow: "hidden" },
  viewsBadge: {
    position: "absolute", bottom: 6, left: 6,
    flexDirection: "row", alignItems: "center", gap: 3,
  },
  viewsText: {
    color: "#fff", fontSize: 11, fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
