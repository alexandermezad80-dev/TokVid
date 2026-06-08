import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
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

const TRENDING = ["#dance", "#fyp", "#cooking", "#music", "#art", "#comedy", "#fitness", "#travel"];

const CREATORS = [
  { handle: "@lunareyes", name: "Luna Reyes", avatar: "https://i.pravatar.cc/150?img=47", followers: "8.2M" },
  { handle: "@chefmarco", name: "Chef Marco", avatar: "https://i.pravatar.cc/150?img=59", followers: "3.4M" },
  { handle: "@miastrings", name: "Mia Strings", avatar: "https://i.pravatar.cc/150?img=32", followers: "12.1M" },
  { handle: "@jakerides", name: "Jake Rivera", avatar: "https://i.pravatar.cc/150?img=13", followers: "5.7M" },
  { handle: "@artbykai", name: "ArtByKai", avatar: "https://i.pravatar.cc/150?img=24", followers: "9.8M" },
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

export default function DiscoverScreen() {
  const [query, setQuery] = useState("");
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Feather name="search" size={18} color="#555" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search"
            placeholderTextColor="#555"
            style={styles.input}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Feather name="x" size={16} color="#555" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>Trending</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tags}>
          {TRENDING.map((tag) => (
            <TouchableOpacity key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>Popular Creators</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.creatorList}>
          {CREATORS.map((c) => (
            <TouchableOpacity key={c.handle} style={styles.creatorCard}>
              <Image source={{ uri: c.avatar }} style={styles.creatorAvatar} />
              <Text style={styles.creatorHandle}>{c.handle}</Text>
              <Text style={styles.creatorFollowers}>{c.followers}</Text>
              <View style={styles.followBtn}>
                <Text style={styles.followBtnText}>Follow</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>Trending Videos</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
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
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    paddingHorizontal: 14,
    marginTop: 20,
    marginBottom: 12,
  },
  tags: { paddingHorizontal: 14, gap: 10 },
  tag: {
    backgroundColor: "#1C1C1E",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tagText: { color: "#fff", fontSize: 14, fontWeight: "600" },
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
  followBtn: {
    backgroundColor: "#FE2C55",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginTop: 4,
  },
  followBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
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
