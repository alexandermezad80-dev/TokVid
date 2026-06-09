import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
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

const MY_VIDEOS = [
  { id: "1", image: require("../../assets/images/thumb1.png"), views: "2.8M", likes: "284K" },
  { id: "2", image: require("../../assets/images/thumb3.png"), views: "5.2M", likes: "521K" },
  { id: "3", image: require("../../assets/images/thumb5.png"), views: "7.4M", likes: "743K" },
  { id: "4", image: require("../../assets/images/thumb2.png"), views: "1.2M", likes: "192K" },
  { id: "5", image: require("../../assets/images/thumb4.png"), views: "3.9M", likes: "389K" },
  { id: "6", image: require("../../assets/images/thumb6.png"), views: "12M", likes: "1.2M" },
];

function avatarUrl(user: any, profile: any): string {
  if (profile?.avatar_url) return profile.avatar_url;
  const seed = encodeURIComponent(user?.email ?? user?.id ?? "user");
  return `https://api.dicebear.com/9.x/initials/png?seed=${seed}&backgroundColor=FE2C55&textColor=ffffff&fontSize=38&size=128`;
}

export default function ProfileScreen() {
  const [tab, setTab] = useState<"videos" | "liked">("videos");
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { user, profile, signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert("Cerrar sesión", "¿Seguro que querés salir?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Salir",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/auth/login");
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
        <Text style={styles.handle}>{handle}</Text>
        <TouchableOpacity style={styles.menuBtn} onPress={handleSignOut}>
          <Feather name="log-out" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.profileSection}>
        <View style={styles.avatarWrap}>
          <Image
            source={{ uri: avatarUrl(user, profile) }}
            style={styles.avatar}
          />
          <View style={styles.editBadge}>
            <Feather name="edit-2" size={12} color="#fff" />
          </View>
        </View>

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
          <TouchableOpacity style={styles.editBtn}>
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
        {(["videos", "liked"] as const).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tabItem, tab === t && styles.tabItemActive]}
          >
            <Feather
              name={t === "videos" ? "grid" : "heart"}
              size={20}
              color={tab === t ? "#fff" : "#555"}
            />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.grid}>
        {MY_VIDEOS.map((v) => (
          <TouchableOpacity key={v.id} style={styles.gridItem}>
            <Image source={v.image} style={StyleSheet.absoluteFill} resizeMode="cover" />
            <View style={styles.viewsBadge}>
              <Feather name="play" size={10} color="#fff" />
              <Text style={styles.viewsText}>{v.views}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

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
    alignItems: "center",
    justifyContent: "center",
  },
  handle: { color: "#fff", fontSize: 17, fontWeight: "700" },
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
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 1 },
  gridItem: {
    width: "33.3%",
    height: 190,
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
    textShadow: "0px 1px 4px rgba(0,0,0,0.9)",
  },
});
