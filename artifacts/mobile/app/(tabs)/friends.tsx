import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { useFollow } from "../../context/FollowContext";
import { supabase } from "../../lib/supabase";

type FriendTab = "friends" | "followers" | "following";

interface Person {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  followers_count: number;
  following_count: number;
  likes_count: number;
}

function fmtCount(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

function getAvatar(person: Pick<Person, "id" | "username" | "avatar_url">) {
  if (person.avatar_url) return person.avatar_url;
  return `https://api.dicebear.com/9.x/initials/png?seed=${encodeURIComponent(
    person.username || person.id
  )}&backgroundColor=FE0979&textColor=ffffff&size=128`;
}

async function findOrCreateConversation(myId: string, otherId: string) {
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .or(
      `and(user1_id.eq.${myId},user2_id.eq.${otherId}),and(user1_id.eq.${otherId},user2_id.eq.${myId})`
    )
    .limit(1)
    .maybeSingle();

  if (existing?.id) return existing.id as string;

  const { data: created } = await supabase
    .from("conversations")
    .insert({ user1_id: myId, user2_id: otherId })
    .select("id")
    .single();

  return (created?.id as string) ?? null;
}

function FollowAction({ person }: { person: Person }) {
  const { isFollowing, toggleFollow, loadingIds } = useFollow();
  const following = isFollowing(person.id);
  const loading = loadingIds.has(person.id);

  return (
    <TouchableOpacity
      style={[styles.followButton, following && styles.followingButton]}
      onPress={() => toggleFollow(person.id)}
      disabled={loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator size="small" color={following ? "#FE0979" : "#fff"} />
      ) : (
        <>
          <Feather
            name={following ? "check" : "user-plus"}
            size={14}
            color={following ? "#FE0979" : "#fff"}
          />
          <Text style={[styles.followButtonText, following && styles.followingButtonText]}>
            {following ? "Siguiendo" : "Seguir"}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

function ProfileModal({
  person,
  visible,
  onClose,
}: {
  person: Person | null;
  visible: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [messageLoading, setMessageLoading] = useState(false);

  const openMessage = async () => {
    if (!user || !person) return;
    setMessageLoading(true);
    const conversationId = await findOrCreateConversation(user.id, person.id);
    setMessageLoading(false);
    if (!conversationId) return;
    onClose();
    router.push(
      `/chat?conversationId=${conversationId}&otherUserId=${person.id}&otherUsername=${encodeURIComponent(
        person.username
      )}&otherAvatar=${encodeURIComponent(person.avatar_url ?? "")}`
    );
  };

  if (!person) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <View
          style={[
            styles.profileModal,
            { paddingBottom: Math.max(insets.bottom, 16) + 8 },
          ]}
        >
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <View />
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          <Image source={{ uri: getAvatar(person) }} style={styles.modalAvatar} />
          <Text style={styles.modalName}>{person.username}</Text>
          <Text style={styles.modalHandleText}>@{person.username}</Text>

          <View style={styles.modalStats}>
            <View style={styles.modalStat}>
              <Text style={styles.modalStatValue}>{fmtCount(person.followers_count)}</Text>
              <Text style={styles.modalStatLabel}>Seguidores</Text>
            </View>
            <View style={styles.modalStat}>
              <Text style={styles.modalStatValue}>{fmtCount(person.following_count)}</Text>
              <Text style={styles.modalStatLabel}>Siguiendo</Text>
            </View>
            <View style={styles.modalStat}>
              <Text style={styles.modalStatValue}>{fmtCount(person.likes_count)}</Text>
              <Text style={styles.modalStatLabel}>Me gusta</Text>
            </View>
          </View>

          {person.bio ? <Text style={styles.modalBio}>{person.bio}</Text> : null}

          <View style={styles.modalActions}>
            <View style={styles.modalFollowWrap}>
              <FollowAction person={person} />
            </View>
            <TouchableOpacity
              style={styles.messageButton}
              onPress={openMessage}
              disabled={messageLoading}
            >
              {messageLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="message-circle" size={16} color="#fff" />
                  <Text style={styles.messageButtonText}>Mensaje</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function FriendsScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<FriendTab>("friends");
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

  const loadPeople = useCallback(async () => {
    if (!user) return;

    setLoading(true);

    const { data: followingRows, error: followingError } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id);

    const { data: followerRows, error: followerError } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("following_id", user.id);

    if (followingError || followerError) {
      setPeople([]);
      setLoading(false);
      return;
    }

    const followingIds = (followingRows ?? []).map((row) => row.following_id as string);
    const followerIds = (followerRows ?? []).map((row) => row.follower_id as string);

    let ids: string[] = followingIds;
    if (tab === "followers") ids = followerIds;
    if (tab === "friends") {
      const followingSet = new Set(followingIds);
      ids = followerIds.filter((id) => followingSet.has(id));
    }

    if (ids.length === 0) {
      setPeople([]);
      setLoading(false);
      return;
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, bio, followers_count, following_count, likes_count")
      .in("id", ids)
      .order("username", { ascending: true });

    setPeople((profiles ?? []) as Person[]);
    setLoading(false);
  }, [tab, user]);

  useEffect(() => {
    if (!user) {
      router.replace("/auth/register");
      return;
    }
    loadPeople();
  }, [user, loadPeople]);

  const filteredPeople = useMemo(() => {
    const term = search.trim().toLowerCase().replace(/^@/, "");
    if (!term) return people;
    return people.filter((person) => person.username.toLowerCase().includes(term));
  }, [people, search]);

  const tabs: { key: FriendTab; label: string; icon: "users" | "user-plus" | "user-check" }[] = [
    { key: "friends", label: "Amigos", icon: "users" },
    { key: "followers", label: "Seguidores", icon: "user-plus" },
    { key: "following", label: "Siguiendo", icon: "user-check" },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Amigos</Text>
          <Text style={styles.headerSubtitle}>Personas que sigues y te siguen</Text>
        </View>
        <View style={styles.headerButton} />
      </View>

      <View style={styles.tabs}>
        {tabs.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[styles.tab, tab === item.key && styles.tabActive]}
            onPress={() => {
              setTab(item.key);
              setSearch("");
            }}
          >
            <Feather
              name={item.icon}
              size={16}
              color={tab === item.key ? "#fff" : "#8A8B97"}
            />
            <Text style={[styles.tabText, tab === item.key && styles.tabTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.searchBox}>
        <Feather name="search" size={18} color="#8A8B97" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={`Buscar ${tab === "friends" ? "amigos" : tab === "followers" ? "seguidores" : "siguiendo"}`}
          placeholderTextColor="#8A8B97"
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Feather name="x-circle" size={18} color="#8A8B97" />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.list}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#FE0979" />
            <Text style={styles.centerText}>Cargando...</Text>
          </View>
        ) : filteredPeople.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Feather name={tab === "friends" ? "users" : "user"} size={30} color="#00F2FE" />
            </View>
            <Text style={styles.emptyTitle}>
              {search
                ? "No encontramos resultados"
                : tab === "friends"
                ? "Todavía no tienes amigos"
                : tab === "followers"
                ? "Todavía no tienes seguidores"
                : "Todavía no sigues a nadie"}
            </Text>
            <Text style={styles.emptyText}>
              {search
                ? "Prueba con otro nombre de usuario."
                : "Cuando haya relaciones, aparecerán aquí automáticamente."}
            </Text>
          </View>
        ) : (
          filteredPeople.map((person) => (
            <TouchableOpacity
              key={person.id}
              style={styles.personRow}
              onPress={() => setSelectedPerson(person)}
              activeOpacity={0.8}
            >
              <Image source={{ uri: getAvatar(person) }} style={styles.avatar} />
              <View style={styles.personInfo}>
                <Text style={styles.username} numberOfLines={1}>
                  {person.username}
                </Text>
                <Text style={styles.secondaryText} numberOfLines={1}>
                  @{person.username}
                </Text>
              </View>
              <FollowAction person={person} />
            </TouchableOpacity>
          ))
        )}
      </View>

      <ProfileModal
        person={selectedPerson}
        visible={!!selectedPerson}
        onClose={() => setSelectedPerson(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#2C2C2E",
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: { flex: 1, alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 21, fontWeight: "800" },
  headerSubtitle: { color: "#8A8B97", fontSize: 11, marginTop: 2 },
  tabs: {
    flexDirection: "row",
    margin: 12,
    padding: 3,
    borderRadius: 12,
    backgroundColor: "#161823",
  },
  tab: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  tabActive: { backgroundColor: "#FE0979" },
  tabText: { color: "#8A8B97", fontSize: 12, fontWeight: "700" },
  tabTextActive: { color: "#fff" },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 13,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#161823",
    borderWidth: 1,
    borderColor: "#2C2C2E",
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
    marginLeft: 9,
    paddingVertical: 0,
  },
  list: { flex: 1, paddingHorizontal: 12 },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1C1C1E",
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#161823",
    borderWidth: 1,
    borderColor: "#2C2C2E",
  },
  personInfo: { flex: 1, marginHorizontal: 12, minWidth: 0 },
  username: { color: "#fff", fontSize: 15, fontWeight: "700" },
  secondaryText: { color: "#8A8B97", fontSize: 12, marginTop: 3 },
  followButton: {
    minWidth: 105,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#FE0979",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  followingButton: {
    backgroundColor: "#1C1C1E",
    borderWidth: 1,
    borderColor: "#FE0979",
  },
  followButtonText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  followingButtonText: { color: "#FE0979" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  centerText: { color: "#8A8B97", fontSize: 13 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 35, gap: 10 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#161823",
    borderWidth: 1,
    borderColor: "#00F2FE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { color: "#fff", fontSize: 17, fontWeight: "800", textAlign: "center" },
  emptyText: { color: "#8A8B97", fontSize: 13, textAlign: "center", lineHeight: 19 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "flex-end",
  },
  profileModal: {
    backgroundColor: "#161823",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: "#2C2C2E",
    paddingHorizontal: 18,
    paddingTop: 8,
    alignItems: "center",
  },
  modalHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#8A8B97",
    opacity: 0.55,
    marginBottom: 4,
  },
  modalHeader: {
    width: "100%",
    height: 38,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1C1C1E",
    alignItems: "center",
    justifyContent: "center",
  },
  modalAvatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 3,
    borderColor: "#FE0979",
    backgroundColor: "#1C1C1E",
    marginTop: 2,
  },
  modalName: { color: "#fff", fontSize: 20, fontWeight: "800", marginTop: 10 },
  modalHandleText: { color: "#8A8B97", fontSize: 13, marginTop: 2 },
  modalStats: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 18,
    paddingVertical: 13,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#2C2C2E",
  },
  modalStat: { alignItems: "center", minWidth: 80 },
  modalStatValue: { color: "#fff", fontSize: 17, fontWeight: "800" },
  modalStatLabel: { color: "#8A8B97", fontSize: 11, marginTop: 2 },
  modalBio: { color: "#fff", fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 12 },
  modalActions: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  modalFollowWrap: { flex: 1 },
  messageButton: {
    flex: 1,
    height: 42,
    borderRadius: 11,
    backgroundColor: "#1C1C1E",
    borderWidth: 1,
    borderColor: "#2C2C2E",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },
  messageButtonText: { color: "#fff", fontSize: 13, fontWeight: "800" },
});
