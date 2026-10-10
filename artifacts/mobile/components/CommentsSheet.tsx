import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CommentRow {
  id: string;
  video_id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  text: string;
  created_at: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  commentCount: string;
  videoId: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "ahora";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CommentsSheet({ visible, onClose, commentCount, videoId }: Props) {
  const [text, setText] = useState("");
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const inputRef = useRef<TextInput>(null);

  // Load comments when sheet opens
  useEffect(() => {
    if (!visible || !videoId) return;
    setLoading(true);
    supabase
      .from("comments")
      .select("*")
      .eq("video_id", videoId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setComments((data as CommentRow[]) ?? []);
        setLoading(false);
      });

    // Real-time subscription
    const channel = supabase
      .channel(`comments-${videoId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comments", filter: `video_id=eq.${videoId}` },
        (payload) => {
          setComments((prev) => [payload.new as CommentRow, ...prev]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [visible, videoId]);

  const send = async () => {
    if (!text.trim() || !user || sending) return;
    setSending(true);
    const newComment = {
      video_id: videoId,
      user_id: user.id,
      username: profile?.username ?? user.email?.split("@")[0] ?? "usuario",
      avatar_url: profile?.avatar_url ?? null,
      text: text.trim(),
    };
    setText("");
    const { error } = await supabase.from("comments").insert(newComment);

    if (!error) {
      const { data: video } = await supabase
        .from("videos")
        .select("user_id")
        .eq("id", videoId)
        .maybeSingle();

      if (video?.user_id && video.user_id !== user.id) {
        await supabase.from("notifications").insert({
          user_id: video.user_id,
          actor_id: user.id,
          actor_name: profile?.username ?? user.email?.split("@")[0] ?? "usuario",
          actor_avatar: profile?.avatar_url ?? null,
          type: "comment",
          message: "Comentó tu video",
          data: { video_id: videoId },
        });
      }
    }

    setSending(false);
  };

  const avatarUri = (c: CommentRow) =>
    c.avatar_url ??
    `https://api.dicebear.com/9.x/initials/png?seed=${encodeURIComponent(c.username)}&backgroundColor=FE2C55&textColor=ffffff&fontSize=38&size=80`;

  const totalLabel = `${comments.length > 0 ? comments.length : commentCount} comentarios`;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[styles.sheet, { paddingBottom: insets.bottom + 8 }]}
      >
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>{totalLabel}</Text>
          <TouchableOpacity onPress={onClose}>
            <Feather name="x" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#FE2C55" />
          </View>
        ) : comments.length === 0 ? (
          <View style={styles.center}>
            <Feather name="message-circle" size={32} color="#333" />
            <Text style={styles.emptyText}>Sé el primero en comentar</Text>
          </View>
        ) : (
          <FlatList
            data={comments}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.comment}>
                <Image source={{ uri: avatarUri(item) }} style={styles.avatar} />
                <View style={styles.commentBody}>
                  <Text style={styles.commentUser}>@{item.username}</Text>
                  <Text style={styles.commentText}>{item.text}</Text>
                  <Text style={styles.metaText}>{timeAgo(item.created_at)}</Text>
                </View>
              </View>
            )}
            style={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}

        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={setText}
            placeholder="Agregar un comentario..."
            placeholderTextColor="#555"
            style={styles.input}
            multiline
            maxLength={200}
            returnKeyType="send"
            onSubmitEditing={send}
          />
          <TouchableOpacity onPress={send} style={styles.sendBtn} disabled={!text.trim() || sending}>
            {sending ? (
              <ActivityIndicator size="small" color="#FE2C55" />
            ) : (
              <Feather name="send" size={20} color={text.trim() ? "#FE2C55" : "#555"} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    backgroundColor: "#161823",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
    paddingHorizontal: 16,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: "#444",
    alignSelf: "center",
    marginTop: 10, marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: { color: "#fff", fontSize: 16, fontWeight: "700" },
  center: { height: 140, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { color: "#555", fontSize: 14 },
  list: { flex: 1 },
  comment: { flexDirection: "row", marginBottom: 20, gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  commentBody: { flex: 1, gap: 4 },
  commentUser: { color: "#888", fontSize: 13, fontWeight: "600" },
  commentText: { color: "#fff", fontSize: 14, lineHeight: 20 },
  metaText: { color: "#555", fontSize: 12 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#2C2C2E",
    paddingTop: 12,
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: "#1C1C1E",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: "#fff",
    fontSize: 14,
    maxHeight: 80,
  },
  sendBtn: { padding: 8 },
});
