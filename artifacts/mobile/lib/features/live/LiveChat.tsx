import HeaderSurface from '../../../components/reference/HeaderSurface';
import {palette} from '../../../constants/palette';
import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../supabase";

type ChatMessage = {
  id: string;
  room_id: string;
  author_id: string;
  content: string;
  moderation_state: "visible" | "hidden" | "deleted";
  created_at: string;
  updated_at: string;
};

type PinnedMessage = {
  id: string;
  room_id: string;
  message_id: string;
  pinned_by: string;
  pinned_at: string;
  unpinned_at: string | null;
};

type LiveChatProps = {
  roomId: string;
  userId: string;
  onClose?: () => void;
};

const MAX_LENGTH = 1000;

export default function LiveChat({ roomId, userId, onClose }: LiveChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pinned, setPinned] = useState<PinnedMessage | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [moderatingId, setModeratingId] = useState<string | null>(null);
  const [canModerate, setCanModerate] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const pinnedMessage = useMemo(
    () => messages.find((message) => message.id === pinned?.message_id) ?? null,
    [messages, pinned],
  );

  const load = useCallback(async () => {
    if (!roomId || !userId) return;
    setLoading(true);

    const [{ data: chat, error: chatError }, { data: pin, error: pinError }, { data: room, error: roomError }, { data: moderator }] =
      await Promise.all([
        supabase
          .from("live_chat_messages")
          .select("id,room_id,author_id,content,moderation_state,created_at,updated_at")
          .eq("room_id", roomId)
          .eq("moderation_state", "visible")
          .order("created_at", { ascending: true })
          .limit(200),
        supabase
          .from("live_pinned_message")
          .select("id,room_id,message_id,pinned_by,pinned_at,unpinned_at")
          .eq("room_id", roomId)
          .is("unpinned_at", null)
          .maybeSingle(),
        supabase.from("live_rooms").select("host_id,state").eq("id", roomId).maybeSingle(),
        supabase
          .from("live_moderators")
          .select("permissions")
          .eq("room_id", roomId)
          .eq("user_id", userId)
          .is("revoked_at", null)
          .maybeSingle(),
      ]);

    if (chatError) Alert.alert("Live Chat", chatError.message);
    if (pinError && pinError.code !== "PGRST116") Alert.alert("Live Chat", pinError.message);
    if (roomError) Alert.alert("Live Chat", roomError.message);

    setMessages((chat as ChatMessage[]) ?? []);
    setPinned((pin as PinnedMessage | null) ?? null);

    const permissions = (moderator?.permissions ?? {}) as Record<string, unknown>;
    setCanModerate(
      room?.state === "active" &&
        (room?.host_id === userId || permissions.manage_chat === true),
    );
    setLoading(false);
  }, [roomId, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`live-chat-${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "live_chat_messages", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const message = payload.new as ChatMessage;
          if (message.moderation_state !== "visible") return;
          setMessages((current) =>
            current.some((item) => item.id === message.id) ? current : [...current, message],
          );
          requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "live_chat_messages", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const message = payload.new as ChatMessage;
          setMessages((current) =>
            message.moderation_state === "visible"
              ? current.some((item) => item.id === message.id)
                ? current.map((item) => (item.id === message.id ? message : item))
                : [...current, message]
              : current.filter((item) => item.id !== message.id),
          );
          setPinned((current) =>
            current?.message_id === message.id && message.moderation_state !== "visible" ? null : current,
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_pinned_message", filter: `room_id=eq.${roomId}` },
        () => {
          void supabase
            .from("live_pinned_message")
            .select("id,room_id,message_id,pinned_by,pinned_at,unpinned_at")
            .eq("room_id", roomId)
            .is("unpinned_at", null)
            .maybeSingle()
            .then(({ data }) => setPinned((data as PinnedMessage | null) ?? null));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [roomId]);

  const send = async () => {
    const content = text.trim();
    if (!content || !roomId || !userId || sending) return;

    setSending(true);
    setText("");

    const { data, error } = await supabase.rpc("live_send_chat_message", {
      p_room_id: roomId,
      p_content: content.slice(0, MAX_LENGTH),
    });

    if (error) {
      setText(content);
      Alert.alert("No se pudo enviar", error.message);
    } else if (data) {
      const message = data as ChatMessage;
      setMessages((current) =>
        current.some((item) => item.id === message.id) ? current : [...current, message],
      );
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }

    setSending(false);
  };

  const moderate = async (messageId: string, action: "hide" | "delete" | "restore") => {
    if (!canModerate || moderatingId) return;
    setModeratingId(messageId);

    const { error } = await supabase.rpc("live_moderate_chat_message", {
      p_message_id: messageId,
      p_action: action,
    });

    if (error) Alert.alert("Moderación", error.message);
    setModeratingId(null);
  };

  const pin = async (messageId: string) => {
    if (!canModerate) return;
    const { error } = await supabase.rpc("live_pin_chat_message", { p_message_id: messageId });
    if (error) Alert.alert("Fijar mensaje", error.message);
  };

  const unpin = async () => {
    if (!canModerate) return;
    const { error } = await supabase.rpc("live_unpin_chat_message", { p_room_id: roomId });
    if (error) Alert.alert("Quitar fijado", error.message);
  };

  const confirmModeration = (message: ChatMessage) => {
    if (!canModerate) return;
    Alert.alert("Moderar mensaje", message.content, [
      { text: "Cancelar", style: "cancel" },
      { text: "Ocultar", onPress: () => void moderate(message.id, "hide") },
      { text: "Eliminar", style: "destructive", onPress: () => void moderate(message.id, "delete") },
    ]);
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const mine = item.author_id === userId;
    const isPinned = pinned?.message_id === item.id;

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onLongPress={() => confirmModeration(item)}
        delayLongPress={450}
        style={styles.messageRow}
      >
        <View style={[styles.bubble, mine && styles.myBubble]}>
          <Text style={styles.author}>{mine ? "Tú" : `Usuario ${item.author_id.slice(0, 6)}`}</Text>
          <Text style={styles.content}>{item.content}</Text>
          {isPinned && (
            <View style={styles.pinnedTag}>
              <Feather name="bookmark" size={11} color={palette.text} />
              <Text style={styles.pinnedTagText}>Fijado</Text>
            </View>
          )}
        </View>
        {canModerate && (
          <View style={styles.modActions}>
            <TouchableOpacity onPress={() => void pin(item.id)} style={styles.smallAction}>
              <Feather name="bookmark" size={14} color={palette.text} />
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <HeaderSurface style={styles.header}>
        <View>
          <Text style={styles.title}>Live Chat</Text>
          <Text style={styles.subtitle}>Mensajes en tiempo real</Text>
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Feather name="x" size={22} color="#fff" />
          </TouchableOpacity>
        )}
      </HeaderSurface>

      {pinnedMessage && (
        <View style={styles.pinnedBar}>
          <View style={styles.pinnedInfo}>
            <Feather name="bookmark" size={15} color={palette.text} />
            <View style={styles.pinnedTextWrap}>
              <Text style={styles.pinnedTitle}>Mensaje fijado</Text>
              <Text numberOfLines={1} style={styles.pinnedContent}>{pinnedMessage.content}</Text>
            </View>
          </View>
          {canModerate && (
            <TouchableOpacity onPress={() => void unpin()} style={styles.unpinButton}>
              <Feather name="x" size={15} color={palette.text} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#FE2C55" />
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.center}>
          <Feather name="message-circle" size={34} color={palette.secondary} />
          <Text style={styles.emptyTitle}>Sé el primero en escribir</Text>
          <Text style={styles.emptyText}>El chat del LIVE aparecerá aquí.</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        />
      )}

      <View style={styles.inputRow}>
        <TextInput
          value={text}
          onChangeText={(value) => setText(value.slice(0, MAX_LENGTH))}
          placeholder="Escribe en el LIVE..."
          placeholderTextColor={palette.muted}
          style={styles.input}
          multiline
          maxLength={MAX_LENGTH}
          editable={!sending}
        />
        <TouchableOpacity
          onPress={() => void send()}
          disabled={!text.trim() || sending}
          style={[styles.sendButton, (!text.trim() || sending) && styles.sendDisabled]}
        >
          {sending ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="send" size={18} color="#fff" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  header: {
    minHeight: 64, paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: palette.border,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  title: { fontFamily: "Inter_500Medium", color: palette.headerText, fontSize: 18, fontWeight: "normal" },
  subtitle: { fontFamily: "Inter_400Regular", color: palette.headerSecondary, fontSize: 12, marginTop: 2 },
  closeButton: { padding: 8 },
  pinnedBar: {
    paddingHorizontal: 14, paddingVertical: 9, backgroundColor: palette.input,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderBottomWidth: 1, borderBottomColor: palette.border,
  },
  pinnedInfo: { flex: 1, flexDirection: "row", alignItems: "center", gap: 9 },
  pinnedTextWrap: { flex: 1 },
  pinnedTitle: { fontFamily: "Inter_500Medium", color: palette.text, fontSize: 12, fontWeight: "normal" },
  pinnedContent: { fontFamily: "Inter_400Regular", color: palette.secondary, fontSize: 12, marginTop: 2 },
  unpinButton: { padding: 7 },
  list: { padding: 12, paddingBottom: 16, gap: 7 },
  messageRow: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  bubble: {
    maxWidth: "88%", backgroundColor: palette.input, borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: palette.border,
  },
  myBubble: { backgroundColor: palette.selected, borderColor: palette.selectedBorder },
  author: { fontFamily: "Inter_500Medium", color: palette.secondary, fontSize: 10, fontWeight: "normal", marginBottom: 2 },
  content: { fontFamily: "Inter_400Regular", color: palette.text, fontSize: 14, lineHeight: 19 },
  pinnedTag: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 5 },
  pinnedTagText: { fontFamily: "Inter_400Regular", color: palette.secondary, fontSize: 10 },
  modActions: { flexDirection: "row", marginBottom: 2 },
  smallAction: { padding: 7, backgroundColor: palette.input, borderRadius: 14 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 30 },
  emptyTitle: { fontFamily: "Inter_500Medium", color: palette.text, fontSize: 15, fontWeight: "normal" },
  emptyText: { fontFamily: "Inter_400Regular", color: palette.secondary, fontSize: 13 },
  inputRow: {
    flexDirection: "row", alignItems: "flex-end", gap: 9, padding: 10,
    borderTopWidth: 1, borderTopColor: palette.border,
  },
  input: { fontFamily: "Inter_400Regular",
    flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 22,
    backgroundColor: palette.input, color: palette.text, paddingHorizontal: 16,
    paddingVertical: 10, fontSize: 14,
  },
  sendButton: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: palette.button,
    alignItems: "center", justifyContent: "center",
  },
  sendDisabled: { backgroundColor: palette.disabled },
});

