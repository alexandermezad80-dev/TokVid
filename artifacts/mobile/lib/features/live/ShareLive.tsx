import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator, Alert, FlatList, Image, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../../context/AuthContext";
import { supabase } from "../../supabase";

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

const LIVE_SHARE_PREFIX = "[TOKVID_LIVE_SHARE]";

export default function ShareLive() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [sharingId, setSharingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter(p =>
      (p.username ?? "").toLowerCase().includes(q) ||
      (p.full_name ?? "").toLowerCase().includes(q)
    );
  }, [profiles, query]);

  useEffect(() => {
    let cancelled = false;
    const loadProfiles = async () => {
      if (!user) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id,username,full_name,avatar_url")
        .neq("id", user.id)
        .order("username", { ascending: true })
        .limit(100);
      if (!cancelled) {
        if (error) Alert.alert("No se pudieron cargar los usuarios", error.message);
        setProfiles((data as Profile[]) ?? []);
        setLoading(false);
      }
    };
    void loadProfiles();
    return () => { cancelled = true; };
  }, [user?.id]);

  const avatarFor = (profile: Profile) =>
    profile.avatar_url ||
    `https://api.dicebear.com/9.x/initials/png?seed=${encodeURIComponent(profile.username || profile.full_name || "U")}&backgroundColor=FE2C55&textColor=ffffff&size=80`;

  const findConversation = async (recipientId: string) => {
    if (!user) return null;

    const first = await supabase
      .from("conversations")
      .select("id")
      .eq("user1_id", user.id)
      .eq("user2_id", recipientId)
      .maybeSingle();

    if (first.data?.id) return first.data.id;

    const second = await supabase
      .from("conversations")
      .select("id")
      .eq("user1_id", recipientId)
      .eq("user2_id", user.id)
      .maybeSingle();

    return second.data?.id ?? null;
  };

  const shareTo = async (recipient: Profile) => {
    if (!user || !roomId || sharingId) return;
    setSharingId(recipient.id);

    try {
      const { data: share, error: shareError } = await supabase
        .rpc("live_create_share", {
          p_room_id: roomId,
          p_recipient_id: recipient.id,
        })
        .single();

      if (shareError || !share?.share_id) {
        throw new Error(shareError?.message || "No se pudo crear la referencia del Live.");
      }

      let conversationId = await findConversation(recipient.id);

      if (!conversationId) {
        const { data: conversation, error: conversationError } = await supabase
          .from("conversations")
          .insert({ user1_id: user.id, user2_id: recipient.id })
          .select("id")
          .single();

        if (conversationError || !conversation?.id) {
          throw new Error(conversationError?.message || "No se pudo crear la conversación.");
        }
        conversationId = conversation.id;
      }

      const shareText = `${LIVE_SHARE_PREFIX}|${share.share_id}|${roomId}`;

      const { error: messageError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          text: shareText,
        });

      if (messageError) throw new Error(messageError.message);

      await supabase
        .from("conversations")
        .update({
          last_message: "Te compartieron un Live",
          last_message_at: new Date().toISOString(),
        })
        .eq("id", conversationId);

      await supabase.from("notifications").insert({
        user_id: recipient.id,
        actor_id: user.id,
        actor_name: user.user_metadata?.username ?? user.user_metadata?.display_name ?? null,
        actor_avatar: user.user_metadata?.avatar_url ?? null,
        type: "message",
        message: "Te compartieron un Live",
        data: {
          conversationId,
          liveShareId: share.share_id,
          roomId,
        },
      });

      Alert.alert("Live compartido", `Se envió a @${recipient.username || recipient.full_name || "usuario"}.`);
    } catch (error) {
      Alert.alert(
        "No se pudo compartir",
        error instanceof Error ? error.message : "Ocurrió un error inesperado.",
      );
    } finally {
      setSharingId(null);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Feather name="arrow-left" size={23} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Compartir Live</Text>
          <Text style={styles.subtitle}>Envía este Live por Mensajes</Text>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <Feather name="search" size={18} color="#777" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar usuario..."
          placeholderTextColor="#666"
          style={styles.search}
          autoCapitalize="none"
        />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#FE2C55" /></View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Feather name="users" size={34} color="#555" />
          <Text style={styles.emptyTitle}>No encontramos usuarios</Text>
          <Text style={styles.emptyText}>Prueba con otro nombre o @usuario.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => void shareTo(item)}
              disabled={sharingId !== null}
              activeOpacity={0.75}
            >
              <Image source={{ uri: avatarFor(item) }} style={styles.avatar} />
              <View style={styles.identity}>
                <Text style={styles.username}>@{item.username || "usuario"}</Text>
                {!!item.full_name && <Text style={styles.fullName}>{item.full_name}</Text>}
              </View>
              {sharingId === item.id ? (
                <ActivityIndicator color="#FE2C55" />
              ) : (
                <View style={styles.sendButton}>
                  <Feather name="send" size={17} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

export { LIVE_SHARE_PREFIX };

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:"#000" },
  header:{ flexDirection:"row", alignItems:"center", paddingHorizontal:14, paddingVertical:12, borderBottomWidth:1, borderBottomColor:"#171717" },
  iconButton:{ padding:7, marginRight:8 },
  headerCopy:{ flex:1 },
  title:{ color:"#fff", fontSize:19, fontWeight:"800" },
  subtitle:{ color:"#777", fontSize:12, marginTop:2 },
  searchWrap:{ flexDirection:"row", alignItems:"center", gap:9, margin:14, paddingHorizontal:14, height:46, borderRadius:23, backgroundColor:"#171719" },
  search:{ flex:1, color:"#fff", fontSize:15 },
  list:{ paddingHorizontal:14, paddingBottom:24 },
  row:{ flexDirection:"row", alignItems:"center", paddingVertical:11, gap:12 },
  avatar:{ width:50, height:50, borderRadius:25, backgroundColor:"#1C1C1E" },
  identity:{ flex:1 },
  username:{ color:"#fff", fontSize:15, fontWeight:"700" },
  fullName:{ color:"#777", fontSize:13, marginTop:3 },
  sendButton:{ width:40, height:40, borderRadius:20, backgroundColor:"#FE2C55", alignItems:"center", justifyContent:"center" },
  center:{ flex:1, alignItems:"center", justifyContent:"center", gap:10, paddingHorizontal:35 },
  emptyTitle:{ color:"#fff", fontSize:16, fontWeight:"700" },
  emptyText:{ color:"#666", fontSize:13, textAlign:"center" },
});