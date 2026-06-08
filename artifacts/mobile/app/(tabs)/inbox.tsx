import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const NOTIFICATIONS = [
  { id: "1", type: "like", user: "@marialopes", avatar: "https://i.pravatar.cc/80?img=5", text: "liked your video", time: "2m", read: false },
  { id: "2", type: "follow", user: "@techbro99", avatar: "https://i.pravatar.cc/80?img=12", text: "started following you", time: "15m", read: false },
  { id: "3", type: "comment", user: "@sunflower_zoe", avatar: "https://i.pravatar.cc/80?img=21", text: 'commented: "This is amazing!! 🔥"', time: "1h", read: false },
  { id: "4", type: "like", user: "@jaystream", avatar: "https://i.pravatar.cc/80?img=33", text: "liked your video", time: "2h", read: true },
  { id: "5", type: "mention", user: "@pizzalover", avatar: "https://i.pravatar.cc/80?img=44", text: "mentioned you in a comment", time: "3h", read: true },
  { id: "6", type: "follow", user: "@nightowl_beats", avatar: "https://i.pravatar.cc/80?img=55", text: "started following you", time: "5h", read: true },
  { id: "7", type: "like", user: "@cactus_vibes", avatar: "https://i.pravatar.cc/80?img=62", text: "and 42 others liked your video", time: "8h", read: true },
  { id: "8", type: "comment", user: "@artbykai", avatar: "https://i.pravatar.cc/150?img=24", text: 'commented: "We should collab sometime!"', time: "1d", read: true },
];

function iconForType(type: string) {
  switch (type) {
    case "like": return "heart";
    case "follow": return "user-plus";
    case "comment": return "message-circle";
    case "mention": return "at-sign";
    default: return "bell";
  }
}

function colorForType(type: string) {
  switch (type) {
    case "like": return "#FE2C55";
    case "follow": return "#25F4EE";
    case "comment": return "#FFAE3B";
    default: return "#888";
  }
}

export default function InboxScreen() {
  const [tab, setTab] = useState<"activity" | "messages">("activity");
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <Text style={styles.pageTitle}>Inbox</Text>

      <View style={styles.tabs}>
        {["activity", "messages"].map((t) => (
          <TouchableOpacity key={t} onPress={() => setTab(t as any)} style={styles.tabBtn}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
            {tab === t && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      {tab === "activity" ? (
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {NOTIFICATIONS.map((n) => (
            <View key={n.id} style={[styles.notif, !n.read && styles.notifUnread]}>
              <View style={styles.avatarWrap}>
                <Image source={{ uri: n.avatar }} style={styles.avatar} />
                <View style={[styles.iconBadge, { backgroundColor: colorForType(n.type) }]}>
                  <Feather name={iconForType(n.type) as any} size={10} color="#fff" />
                </View>
              </View>
              <View style={styles.notifBody}>
                <Text style={styles.notifText}>
                  <Text style={styles.notifUser}>{n.user}</Text>{" "}
                  {n.text}
                </Text>
                <Text style={styles.notifTime}>{n.time}</Text>
              </View>
              {!n.read && <View style={styles.unreadDot} />}
            </View>
          ))}
          <View style={{ height: Platform.OS === "web" ? 34 : insets.bottom + 80 }} />
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <Feather name="message-square" size={52} color="#333" />
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptyText}>When creators reply or DM you, they'll show here</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  pageTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#1C1C1E",
    marginBottom: 4,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    paddingBottom: 12,
  },
  tabText: {
    color: "#555",
    fontSize: 15,
    fontWeight: "600",
  },
  tabTextActive: { color: "#fff" },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    height: 2,
    width: "50%",
    backgroundColor: "#FE2C55",
  },
  list: { flex: 1 },
  notif: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  notifUnread: { backgroundColor: "rgba(254,44,85,0.04)" },
  avatarWrap: { position: "relative" },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  iconBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#000",
  },
  notifBody: { flex: 1 },
  notifText: { color: "#ccc", fontSize: 14, lineHeight: 20 },
  notifUser: { color: "#fff", fontWeight: "700" },
  notifTime: { color: "#555", fontSize: 12, marginTop: 3 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FE2C55",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  emptyText: { color: "#555", fontSize: 14, textAlign: "center", lineHeight: 20 },
});
