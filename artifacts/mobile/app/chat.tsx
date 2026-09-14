import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { sendMessage } from "../lib/chat/sendMessage";
import { supabase } from "../lib/supabase";

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  text: string;
  created_at: string;
}

function timeLabel(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Ayer";
  return d.toLocaleDateString();
}

export default function ChatScreen() {
  const params = useLocalSearchParams<{
    conversationId: string;
    otherUserId: string;
    otherUsername: string;
    otherAvatar: string;
  }>();
  const { conversationId, otherUserId, otherUsername, otherAvatar } = params;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 20 : insets.bottom;

  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const avatarUri = otherAvatar
    ? decodeURIComponent(otherAvatar)
    : `https://api.dicebear.com/9.x/initials/png?seed=${encodeURIComponent(otherUsername ?? "U")}&backgroundColor=FE2C55&textColor=ffffff&fontSize=38&size=80`;

  useEffect(() => {
    if (!conversationId) return;
    supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setMessages((data as MessageRow[]) ?? []);
        setLoading(false);
      });

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((message) => message.id === payload.new.id)) return prev;
            return [...prev, payload.new as MessageRow];
          });
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  const send = async () => {
    if (!user || !conversationId || sending || !text.trim()) return;

    setSending(true);
    setSendError(null);
    const msgText = text.trim();
    setText("");

    const optimistic: MessageRow = {
      id: `opt-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: user.id,
      text: msgText,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    const result = await sendMessage(
      { userId: user.id, conversationId, text: msgText },
      supabase,
    );

    if (result.error) {
      setMessages((prev) => prev.filter((message) => message.id !== optimistic.id));
      setText(msgText);
      setSendError(result.error);
    }

    setSending(false);
  };

  const renderItem = ({ item, index }: { item: MessageRow; index: number }) => {
    const isMe = item.sender_id === user?.id;
    const prev = messages[index - 1];
    const showTime = !prev || new Date(item.created_at).getTime() - new Date(prev.created_at).getTime() > 5 * 60 * 1000;

    return (
      <View>
        {showTime && <Text style={styles.timeLabel}>{timeLabel(item.created_at)}</Text>}
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
          <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>{item.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Image source={{ uri: avatarUri }} style={styles.headerAvatar} />
        <View style={styles.headerInfo}><Text style={styles.headerName}>@{otherUsername}</Text></View>
        <TouchableOpacity style={styles.profileBtn} onPress={() => router.push(`/user-profile?userId=${otherUserId}`)}>
          <Feather name="user" size={20} color="#888" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={topPad + 60}>
        {loading ? (
          <View style={styles.center}><ActivityIndicator color="#FE2C55" /></View>
        ) : messages.length === 0 ? (
          <View style={styles.center}>
            <View style={styles.emptyAvatar}><Image source={{ uri: avatarUri }} style={styles.emptyAvatarImg} /></View>
            <Text style={styles.emptyTitle}>@{otherUsername}</Text>
            <Text style={styles.emptyText}>Comenzá la conversación</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {sendError && <Text style={styles.errorText}>{sendError}</Text>}
        <View style={[styles.inputRow, { paddingBottom: botPad + 8 }]}>
          <TextInput
            value={text}
            onChangeText={(value) => { setText(value); if (sendError) setSendError(null); }}
            placeholder="Mensaje..."
            placeholderTextColor="#555"
            style={styles.input}
            multiline
            maxLength={1000}
            returnKeyType="send"
            onSubmitEditing={send}
          />
          <TouchableOpacity style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]} onPress={send} disabled={!text.trim() || sending}>
            {sending ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="send" size={18} color="#fff" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#111", gap: 12 },
  backBtn: { padding: 4 },
  headerAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#1C1C1E" },
  headerInfo: { flex: 1 },
  headerName: { color: "#fff", fontSize: 15, fontWeight: "700" },
  profileBtn: { padding: 6 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingHorizontal: 40 },
  emptyAvatar: { marginBottom: 8 },
  emptyAvatarImg: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: "#FE2C55" },
  emptyTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  emptyText: { color: "#555", fontSize: 14 },
  messageList: { paddingHorizontal: 16, paddingVertical: 12, gap: 4 },
  timeLabel: { color: "#444", fontSize: 12, textAlign: "center", marginVertical: 12 },
  bubble: { maxWidth: "78%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, marginVertical: 2 },
  bubbleMe: { backgroundColor: "#FE2C55", alignSelf: "flex-end", borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: "#1C1C1E", alignSelf: "flex-start", borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  bubbleTextMe: { color: "#fff" },
  bubbleTextThem: { color: "#fff" },
  errorText: { color: "#FE2C55", fontSize: 12, textAlign: "center", paddingHorizontal: 16, paddingTop: 6 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#111", gap: 10 },
  input: { flex: 1, backgroundColor: "#1C1C1E", borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, color: "#fff", fontSize: 15, maxHeight: 120 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#FE2C55", alignItems: "center", justifyContent: "center" },
  sendBtnDisabled: { backgroundColor: "#2C2C2E" },
});
