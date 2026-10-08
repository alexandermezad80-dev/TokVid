import PublicationThumbnail from "../../components/PublicationThumbnail";
import { usePublishedMedia } from "../../hooks/usePublishedMedia";
import { requestRegistration } from "../../lib/features/auth/services/registrationBridge";
import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
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
import { useAuth } from "../../context/AuthContext";
import { useFollow } from "../../context/FollowContext";
import { useVideoFeed } from "../../hooks/useVideoFeed";
import { useSavedVideos } from "../../hooks/useSavedVideos";


function avatarUrl(user: any, profile: any): string {
  if (profile?.avatar_url) return profile.avatar_url;
  return user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture ?? "";
}

export default function ProfileScreen() {
  const [tab, setTab] = useState<"videos" | "liked" | "saved">("videos");
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { user, profile, signOut, refreshProfile } = useAuth();

  useEffect(() => {
    if (!user) requestRegistration();
  }, [user]);
  const publications = usePublishedMedia({ userId: user?.id, enabled: !!user });
  const { savedVideos } = useSavedVideos();
  const { followedIds } = useFollow();
  const { likedVideos } = useVideoFeed(followedIds);

  useFocusEffect(
    useCallback(() => {
      refreshProfile();
    }, [user?.id])
  );

  if (!user) return null;

  const handleSignOut = () => {
    Alert.alert("Cerrar sesión", "¿Seguro que querés salir?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Salir",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(tabs)");
        },
      },
    ]);
  };

  const displayName =
    profile?.username ??
    user?.user_metadata?.display_name ??
    user?.email?.split("@")[0] ??
    "Vos";

  const handle = `@${profile?.username ?? user?.user_metadata?.username ?? displayName}`;
  const bio = profile?.bio ?? "Living life one frame at a time 🎬✨";
  const followers = profile?.followers_count ?? 0;
  const following = profile?.following_count ?? 0;
  const likes = profile?.likes_count ?? 0;

  const fmtCount = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` :
    n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : String(n);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={[styles.header, { paddingTop: topPad + 10 }]}>
        <TouchableOpacity style={styles.menuBtn}>
          <Feather name="menu" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.handle} numberOfLines={1} ellipsizeMode="tail">{handle}</Text>
        <TouchableOpacity style={styles.menuBtn} onPress={handleSignOut} accessibilityRole="button" accessibilityLabel="Cerrar sesión">
          <Feather name="log-out" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.profileSection}>
        <TouchableOpacity style={styles.avatarWrap} onPress={() => router.push("/edit-profile")} accessibilityRole="button" accessibilityLabel="Cambiar foto de perfil">
          {avatarUrl(user, profile) ? <Image source={{ uri: avatarUrl(user, profile) }} style={styles.avatar} /> : <View style={[styles.avatar, { backgroundColor: "#555", alignItems: "center", justifyContent: "center" }]}><Feather name="user" size={46} color="#bbb" /></View>}
          <View style={styles.editBadge}>
            <Feather name="edit-2" size={12} color="#fff" />
          </View>
        </TouchableOpacity>

        <Text style={styles.displayName}>{displayName}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <Text style={styles.bio}>{bio}</Text>

        <View style={styles.stats}>
          {[
            { value: fmtCount(following), label: "Following" },
            { value: fmtCount(followers), label: "Followers" },
            { value: fmtCount(likes), label: "Likes" },
          ].map((s) => (
            <View key={s.label} style={styles.stat}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.editBtn} onPress={() => router.push("/edit-profile")}>
            <Text style={styles.editBtnText}>Editar perfil</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareBtn}>
            <Feather name="share" size={16} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareBtn}>
            <Feather name="user-plus" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabBar}>
        {([
          { key: "videos", icon: "grid" },
          { key: "liked",  icon: "heart" },
          { key: "saved",  icon: "bookmark" },
        ] as const).map(({ key, icon }) => (
          <TouchableOpacity
            key={key}
            onPress={() => setTab(key)}
            style={[styles.tabItem, tab === key && styles.tabItemActive]}
          >
            <Feather
              name={icon}
              size={20}
              color={tab === key ? "#fff" : "#555"}
            />
          </TouchableOpacity>
        ))}
      </View>

      {tab === "saved" ? (
        savedVideos.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="bookmark" size={40} color="#333" />
            <Text style={styles.emptyTitle}>Sin guardados</Text>
            <Text style={styles.emptyText}>
              Tocá el marcador en cualquier video para guardarlo acá
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {savedVideos.map((v, idx) => (
              <TouchableOpacity
                key={v.id}
                style={styles.gridItem}
                onPress={() => router.push(`/saved-feed?startIndex=${idx}`)}
              >
                <PublicationThumbnail item={v} />
                <View style={styles.savedBadge}>
                  <Feather name="bookmark" size={10} color="#FFD60A" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )
      ) : tab === "liked" ? (
        likedVideos.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="heart" size={40} color="#333" />
            <Text style={styles.emptyTitle}>Sin likes</Text>
            <Text style={styles.emptyText}>
              Los videos que te gusten aparecerán acá
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {likedVideos.map((v, idx) => (
              <TouchableOpacity
                key={v.id}
                style={styles.gridItem}
                onPress={() => router.push(`/liked-feed?startIndex=${idx}`)}
              >
                <PublicationThumbnail item={v} />
                <View style={styles.viewsBadge}>
                  <Feather name="heart" size={10} color="#FE2C55" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )
      ) : (
        <View>
          {publications.loading && publications.items.length === 0 ? <ActivityIndicator color="#85D5DB" style={{ padding: 24 }} /> : null}
          {!!publications.error && <TouchableOpacity onPress={() => void publications.refresh()} style={styles.emptyState}><Text style={styles.emptyText}>{publications.error}</Text><Text style={{color:"#9CDEE1"}}>Reintentar</Text></TouchableOpacity>}
          {!publications.loading && !publications.error && publications.items.length === 0 && <TouchableOpacity style={styles.emptyState} onPress={() => router.push("/(tabs)/create")}><Feather name="plus-circle" size={36} color="#8DCBD0" /><Text style={styles.emptyTitle}>Tu primera publicación</Text><Text style={styles.emptyText}>Comparte una foto o un video desde Galería.</Text></TouchableOpacity>}
          <View style={styles.grid}>{publications.items.map(item => <TouchableOpacity key={item.id} style={styles.gridItem} accessibilityRole="button" accessibilityLabel={`Abrir publicación: ${item.caption || "Sin descripción"}`} onPress={() => router.push({ pathname:"/publication", params:{id:item.id} })}><PublicationThumbnail item={item} /></TouchableOpacity>)}</View>
          {publications.hasMore && <TouchableOpacity onPress={() => void publications.loadMore()} disabled={publications.loading} style={{padding:20,alignItems:"center"}}><Text style={{color:"#A6E1E5"}}>{publications.loading ? "Cargando…" : "Ver más"}</Text></TouchableOpacity>}
        </View>
      )}

      <View style={{ height: Platform.OS === "web" ? 34 : insets.bottom + 80 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  menuBtn: {
    width: 40,
    height: 40,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  handle: { flex: 1, minWidth: 0, textAlign: "center", color: "#fff", fontSize: 17, fontWeight: "700" },
  profileSection: {
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 8,
  },
  avatarWrap: { position: "relative" },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: "#FE2C55",
    backgroundColor: "#1C1C1E",
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FE2C55",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#000",
  },
  displayName: { color: "#fff", fontSize: 20, fontWeight: "700" },
  email: { color: "#555", fontSize: 13 },
  bio: { color: "#aaa", fontSize: 14, textAlign: "center", paddingHorizontal: 20 },
  stats: { flexDirection: "row", gap: 32, marginTop: 4 },
  stat: { alignItems: "center", gap: 2 },
  statValue: { color: "#fff", fontSize: 18, fontWeight: "800" },
  statLabel: { color: "#888", fontSize: 13 },
  actions: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  editBtn: {
    backgroundColor: "#1C1C1E",
    borderRadius: 10,
    paddingHorizontal: 52,
    paddingVertical: 10,
  },
  editBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  shareBtn: {
    backgroundColor: "#1C1C1E",
    borderRadius: 10,
    padding: 10,
  },
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#1C1C1E",
  },
  tabItem: { flex: 1, alignItems: "center", paddingVertical: 12 },
  tabItemActive: { borderBottomWidth: 2, borderBottomColor: "#fff" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 10, paddingVertical: 10 },
  gridItem: {
    width: "32%",
    aspectRatio: 0.64, borderRadius: 10,
    backgroundColor: "#111",
    overflow: "hidden",
  },
  viewsBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  viewsText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  savedBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  emptyText: {
    color: "#555",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});

