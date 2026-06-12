import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFollow } from "../../context/FollowContext";
import { supabase } from "../../lib/supabase";
import { MOCK_CREATOR_IDS } from "../../hooks/useVideoFeed";
import { useAuth } from "../../context/AuthContext";

// ─── Types ───────────────────────────────────────────────────────────────────

interface UserResult {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  followers_count: number;
}

// ─── Static data ─────────────────────────────────────────────────────────────

const TRENDING_TAGS = [
  "#fyp", "#dance", "#cooking", "#music", "#art",
  "#comedy", "#fitness", "#travel", "#fashion", "#gaming",
];

const MOCK_CREATORS = [
  { handle: "@lunareyes",  name: "Luna Reyes",  avatar: "https://i.pravatar.cc/150?img=47", followers: "8.2M" },
  { handle: "@chefmarco",  name: "Chef Marco",  avatar: "https://i.pravatar.cc/150?img=59", followers: "3.4M" },
  { handle: "@miastrings", name: "Mia Strings", avatar: "https://i.pravatar.cc/150?img=32", followers: "12.1M" },
  { handle: "@jakerides",  name: "Jake Rivera", avatar: "https://i.pravatar.cc/150?img=13", followers: "5.7M" },
  { handle: "@artbykai",   name: "ArtByKai",    avatar: "https://i.pravatar.cc/150?img=24", followers: "9.8M" },
  { handle: "@flexnation", name: "Flex Nation", avatar: "https://i.pravatar.cc/150?img=68", followers: "21.3M" },
];

const GRID = [
  { id: "1", image: require("../../assets/images/thumb1.png"), views: "2.8M" },
  { id: "2", image: require("../../assets/images/thumb2.png"), views: "1.2M" },
  { id: "3", image: require("../../assets/images/thumb3.png"), views: "5.2M" },
  { id: "4", image: require("../../assets/images/thumb4.png"), views: "3.9M" },
  { id: "5", image: require("../../assets/images/thumb5.png"), views: "7.4M" },
  { id: "6", image: require("../../assets/images/thumb6.png"), views: "12M" },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function fmtCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function FollowButton({ creatorId, size = "md" }: { creatorId: string; size?: "sm" | "md" }) {
  const { isFollowing, toggleFollow, loadingIds } = useFollow();
  const following = isFollowing(creatorId);
  const loading = loadingIds.has(creatorId);

  return (
    <TouchableOpacity
      style={[
        styles.followBtn,
        following && styles.followBtnActive,
        size === "sm" && styles.followBtnSm,
      ]}
      onPress={() => toggleFollow(creatorId)}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={following ? "#FE2C55" : "#fff"} />
      ) : (
        <Text style={[styles.followBtnText, following && styles.followBtnTextActive]}>
          {following ? "Siguiendo" : "Seguir"}
        </Text>
      )}
    </TouchableOpacity>
  );
}

function UserResultCard({ user }: { user: UserResult }) {
  const avatarUri = user.avatar_url
    ?? `https://api.dicebear.com/9.x/initials/png?seed=${encodeURIComponent(user.username)}&backgroundColor=FE2C55&textColor=ffffff&fontSize=38&size=80`;

  return (
    <TouchableOpacity
      style={styles.resultCard}
      activeOpacity={0.7}
      onPress={() => router.push(`/user-profile?userId=${user.id}`)}
    >
      <Image source={{ uri: avatarUri }} style={styles.resultAvatar} />
      <View style={styles.resultInfo}>
        <Text style={styles.resultUsername}>@{user.username}</Text>
        {user.bio ? (
          <Text style={styles.resultBio} numberOfLines={1}>{user.bio}</Text>
        ) : null}
        <Text style={styles.resultFollowers}>{fmtCount(user.followers_count)} seguidores</Text>
      </View>
      <FollowButton creatorId={user.id} size="sm" />
    </TouchableOpacity>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function DiscoverScreen() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { user } = useAuth();

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setSearching(true);
    setSearched(true);
    const term = q.trim().replace(/^@/, "");
    const { data } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, bio, followers_count")
      .ilike("username", `%${term}%`)
      .neq("id", user?.id ?? "")   // exclude self
      .order("followers_count", { ascending: false })
      .limit(20);
    setResults((data as UserResult[]) ?? []);
    setSearching(false);
  }, [user]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, doSearch]);

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setSearched(false);
  };

  const isSearching = query.length > 0;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Feather name="search" size={18} color="#555" />
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar usuarios..."
            placeholderTextColor="#555"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={clearSearch} hitSlop={8}>
              <Feather name="x" size={16} color="#555" />
            </TouchableOpacity>
          )}
        </View>
        {isSearching && (
          <TouchableOpacity onPress={clearSearch}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search results */}
      {isSearching ? (
        searching ? (
          <View style={styles.center}>
            <ActivityIndicator color="#FE2C55" size="large" />
          </View>
        ) : searched && results.length === 0 ? (
          <View style={styles.center}>
            <View style={styles.emptyIcon}>
              <Feather name="user-x" size={32} color="#333" />
            </View>
            <Text style={styles.emptyTitle}>Sin resultados</Text>
            <Text style={styles.emptyText}>No encontramos usuarios con "{query}"</Text>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <UserResultCard user={item} />}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.resultsList}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListHeaderComponent={
              results.length > 0 ? (
                <Text style={styles.resultsHeader}>{results.length} usuario{results.length !== 1 ? "s" : ""} encontrado{results.length !== 1 ? "s" : ""}</Text>
              ) : null
            }
          />
        )
      ) : (
        /* Default explore view */
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
          {/* Trending tags */}
          <Text style={styles.sectionTitle}>Tendencias</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tags}>
            {TRENDING_TAGS.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={styles.tag}
                onPress={() => setQuery(tag)}
              >
                <Text style={styles.tagText}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Popular creators */}
          <Text style={styles.sectionTitle}>Creadores populares</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.creatorList}>
            {MOCK_CREATORS.map((c) => {
              const creatorId = MOCK_CREATOR_IDS[c.handle] ?? c.handle;
              return (
                <View key={c.handle} style={styles.creatorCard}>
                  <Image source={{ uri: c.avatar }} style={styles.creatorAvatar} />
                  <Text style={styles.creatorHandle} numberOfLines={1}>{c.handle}</Text>
                  <Text style={styles.creatorFollowers}>{c.followers}</Text>
                  <FollowButton creatorId={creatorId} size="sm" />
                </View>
              );
            })}
          </ScrollView>

          {/* Trending videos grid */}
          <Text style={styles.sectionTitle}>Videos en tendencia</Text>
          <View style={styles.grid}>
            {GRID.map((item, i) => (
              <TouchableOpacity key={item.id} style={[styles.gridItem, i % 3 === 1 && styles.gridItemTall]}>
                <Image source={item.image} style={StyleSheet.absoluteFill} resizeMode="cover" />
                <View style={styles.viewsBadge}>
                  <Feather name="play" size={11} color="#fff" />
                  <Text style={styles.viewsText}>{item.views}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: Platform.OS === "web" ? 34 : insets.bottom + 80 }} />
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  // Search
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1C1C1E",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  input: { flex: 1, color: "#fff", fontSize: 15 },
  cancelText: { color: "#FE2C55", fontSize: 15, fontWeight: "600" },

  // Search results
  resultsList: { paddingBottom: 100 },
  resultsHeader: {
    color: "#555",
    fontSize: 13,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  resultCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  resultAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#1C1C1E" },
  resultInfo: { flex: 1, gap: 2 },
  resultUsername: { color: "#fff", fontSize: 15, fontWeight: "700" },
  resultBio: { color: "#888", fontSize: 13 },
  resultFollowers: { color: "#555", fontSize: 12 },
  separator: { height: 1, backgroundColor: "#111", marginLeft: 80 },

  // Empty / loading states
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingHorizontal: 40 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  emptyText: { color: "#555", fontSize: 14, textAlign: "center" },

  // Default explore sections
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    paddingHorizontal: 14,
    marginTop: 20,
    marginBottom: 12,
  },

  // Tags
  tags: { paddingHorizontal: 14, gap: 10 },
  tag: {
    backgroundColor: "#1C1C1E",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tagText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  // Creator cards
  creatorList: { paddingHorizontal: 14, gap: 12 },
  creatorCard: {
    alignItems: "center",
    width: 110,
    backgroundColor: "#161823",
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  creatorAvatar: { width: 64, height: 64, borderRadius: 32 },
  creatorHandle: { color: "#fff", fontSize: 12, fontWeight: "700", textAlign: "center" },
  creatorFollowers: { color: "#888", fontSize: 11, textAlign: "center" },

  // Follow button
  followBtn: {
    backgroundColor: "#FE2C55",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    minWidth: 70,
    alignItems: "center",
  },
  followBtnActive: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: "#FE2C55",
  },
  followBtnSm: { paddingHorizontal: 12, paddingVertical: 5 },
  followBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  followBtnTextActive: { color: "#FE2C55" },

  // Trending grid
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 14,
    gap: 3,
  },
  gridItem: {
    width: "31.5%",
    height: 180,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#1C1C1E",
  },
  gridItemTall: { height: 240 },
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
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
