import { Feather } from "@expo/vector-icons";
import { formatDistanceToNowStrict } from "date-fns";
import { es } from "date-fns/locale";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { type AppNotification, useNotifications } from "../../context/NotificationsContext";

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
    case "mention": return "#A78BFA";
    default: return "#888";
  }
}

function timeAgo(dateStr: string) {
  try {
    return formatDistanceToNowStrict(new Date(dateStr), { addSuffix: true, locale: es });
  } catch {
    return "";
  }
}

function NotifItem({ notif, onPress }: { notif: AppNotification; onPress: () => void }) {
  const avatar = notif.actor_avatar;
  const seed = notif.actor_name ?? notif.actor_id ?? "U";
  const avatarUri = avatar
    ? avatar
    : `https://api.dicebear.com/9.x/initials/png?seed=${encodeURIComponent(seed)}&backgroundColor=FE2C55&textColor=ffffff&fontSize=38&size=80`;

  return (
    <TouchableOpacity
      style={[styles.notif, !notif.read && styles.notifUnread]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.avatarWrap}>
        <Image source={{ uri: avatarUri }} style={styles.avatar} />
        <View style={[styles.iconBadge, { backgroundColor: colorForType(notif.type) }]}>
          <Feather name={iconForType(notif.type) as any} size={10} color="#fff" />
        </View>
      </View>
      <View style={styles.notifBody}>
        {notif.actor_name && (
          <Text style={styles.notifUser}>{notif.actor_name}</Text>
        )}
        <Text style={styles.notifText}>{notif.message}</Text>
        <Text style={styles.notifTime}>{timeAgo(notif.created_at)}</Text>
      </View>
      {!notif.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

export default function InboxScreen() {
  const [tab, setTab] = useState<"activity" | "messages">("activity");
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { notifications, unreadCount, loading, markRead, markAllRead, refresh } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Inbox</Text>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead}>
            <Text style={styles.markAllText}>Marcar todo leído</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.tabs}>
        {(["activity", "messages"] as const).map((t) => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={styles.tabBtn}>
            <View style={styles.tabLabelRow}>
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === "activity" ? "Actividad" : "Mensajes"}
              </Text>
              {t === "activity" && unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
                </View>
              )}
            </View>
            {tab === t && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      {tab === "activity" ? (
        loading && notifications.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator color="#FE2C55" />
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Feather name="bell" size={36} color="#333" />
            </View>
            <Text style={styles.emptyTitle}>Sin notificaciones</Text>
            <Text style={styles.emptyText}>Cuando alguien interactúe con tu contenido, lo verás acá</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor="#FE2C55"
                colors={["#FE2C55"]}
              />
            }
          >
            {notifications.map((n) => (
              <NotifItem key={n.id} notif={n} onPress={() => markRead(n.id)} />
            ))}
            <View style={{ height: Platform.OS === "web" ? 34 : insets.bottom + 80 }} />
          </ScrollView>
        )
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Feather name="message-square" size={36} color="#333" />
          </View>
          <Text style={styles.emptyTitle}>Sin mensajes</Text>
          <Text style={styles.emptyText}>Cuando un creador te responda, aparecerá acá</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  pageTitle: { color: "#fff", fontSize: 22, fontWeight: "700" },
  markAllBtn: { paddingVertical: 6, paddingHorizontal: 12 },
  markAllText: { color: "#FE2C55", fontSize: 13, fontWeight: "600" },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#1C1C1E",
    marginBottom: 4,
  },
  tabBtn: { flex: 1, alignItems: "center", paddingBottom: 12 },
  tabLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  tabText: { color: "#555", fontSize: 15, fontWeight: "600" },
  tabTextActive: { color: "#fff" },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    height: 2,
    width: "50%",
    backgroundColor: "#FE2C55",
  },
  badge: {
    backgroundColor: "#FE2C55",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: "center",
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { flex: 1 },
  notif: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  notifUnread: { backgroundColor: "rgba(254,44,85,0.05)" },
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
  notifUser: { color: "#fff", fontWeight: "700", fontSize: 14 },
  notifText: { color: "#ccc", fontSize: 14, lineHeight: 20 },
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
    gap: 14,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  emptyText: { color: "#555", fontSize: 14, textAlign: "center", lineHeight: 20 },
});
