import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Platform,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import BubbleStylePicker from "../lib/features/messages/components/BubbleStylePicker";
import Bubble, { type BubbleStyleVariant } from "../lib/features/messages/components/Bubble";
import { getBubbleStyleVariant, setBubbleStyleVariant } from "../lib/features/messages/services/bubble-preferences";
import { createCall, type CallType } from "../lib/features/calls/services/calls-service";
import { supabase } from "../lib/supabase";

interface MessageRow {
  id: string; conversation_id: string; sender_id: string; text: string; created_at: string;
}

function timeLabel(dateStr: string) {
  const d = new Date(dateStr), now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Ayer";
  return d.toLocaleDateString();
}

export default function ChatScreen() {
  const params = useLocalSearchParams<{ conversationId:string; otherUserId:string; otherUsername:string; otherAvatar:string }>();
  const { conversationId, otherUserId, otherUsername, otherAvatar } = params;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 20 : insets.bottom;
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [startingCall, setStartingCall] = useState<CallType | null>(null);
  const [bubbleStyle, setBubbleStyle] = useState<BubbleStyleVariant>("classic");
  const [bubblePickerVisible, setBubblePickerVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => { void getBubbleStyleVariant().then(setBubbleStyle); }, []);

  const selectBubbleStyle = async (variant: BubbleStyleVariant) => {
    setBubbleStyle(variant);
    await setBubbleStyleVariant(variant);
    setBubblePickerVisible(false);
  };

  const avatarUri = otherAvatar
    ? decodeURIComponent(otherAvatar)
    : `https://api.dicebear.com/9.x/initials/png?seed=${encodeURIComponent(otherUsername ?? "U")}&backgroundColor=FE2C55&textColor=ffffff&fontSize=38&size=80`;

  const markReceivedMessagesRead = async () => {
    if (!conversationId || !user) return;
    await supabase.from("messages").update({ read_by_other:true })
      .eq("conversation_id", conversationId).eq("read_by_other", false).neq("sender_id", user.id);
  };

  const deleteMessage = async (messageId: string) => {
    if (!user) return;
    Alert.alert("Eliminar mensaje", "¿Querés eliminar este mensaje?", [
      { text:"Cancelar", style:"cancel" },
      { text:"Eliminar", style:"destructive", onPress:async () => {
        const { data, error } = await supabase.from("messages").delete()
          .eq("id", messageId).eq("sender_id", user.id).select("id");
        if (error || !data?.length) return;
        setMessages(prev => prev.filter(m => m.id !== messageId));
      }},
    ]);
  };

  const startCall = async (type: CallType) => {
    if (!conversationId || !otherUserId || !user || startingCall) return;
    setStartingCall(type);
    try {
      const call = await createCall(conversationId, otherUserId, type);
      router.push(`/call?callId=${encodeURIComponent(call.id)}&type=${call.type}`);
    } catch (error) {
      Alert.alert("No se pudo iniciar la llamada", error instanceof Error ? error.message : "Ocurrió un error inesperado.");
    } finally { setStartingCall(null); }
  };

  useEffect(() => {
    if (!conversationId) return;
    supabase.from("messages").select("*").eq("conversation_id", conversationId)
      .order("created_at", { ascending:true })
      .then(({ data }) => { setMessages((data as MessageRow[]) ?? []); setLoading(false); void markReceivedMessagesRead(); });

    const channel = supabase.channel(`chat-${conversationId}`)
      .on("postgres_changes", { event:"INSERT", schema:"public", table:"messages", filter:`conversation_id=eq.${conversationId}` },
        payload => { setMessages(prev => [...prev, payload.new as MessageRow]); setTimeout(() => flatListRef.current?.scrollToEnd({ animated:true }), 100); })
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [conversationId, user?.id]);

  const send = async () => {
    if (!text.trim() || !user || !conversationId || sending) return;
    setSending(true);
    const msgText = text.trim();
    setText("");
    setMessages(prev => [...prev, {
      id:`opt-${Date.now()}`, conversation_id:conversationId, sender_id:user.id,
      text:msgText, created_at:new Date().toISOString(),
    }]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated:true }), 100);

    const { error:messageError } = await supabase.from("messages").insert({
      conversation_id:conversationId, sender_id:user.id, text:msgText,
    });

    if (!messageError && otherUserId) {
      await supabase.from("notifications").insert({
        user_id:otherUserId, actor_id:user.id,
        actor_name:user.user_metadata?.username ?? user.user_metadata?.display_name ?? null,
        actor_avatar:null, type:"message", message:"Te envió un mensaje",
        data:{ conversationId, otherUserId:user.id, otherUsername:user.user_metadata?.username ?? "", otherAvatar:"" },
      });
    }

    await supabase.from("conversations").update({
      last_message:msgText, last_message_at:new Date().toISOString(),
    }).eq("id", conversationId);
    setSending(false);
  };

  const renderItem = ({ item, index }: { item:MessageRow; index:number }) => {
    const isMe = item.sender_id === user?.id;
    const prev = messages[index - 1];
    const showTime = !prev || new Date(item.created_at).getTime() - new Date(prev.created_at).getTime() > 5 * 60 * 1000;
    const previousSame = messages[index - 1]?.sender_id === item.sender_id;
    const nextSame = messages[index + 1]?.sender_id === item.sender_id;
    const groupPosition = !previousSame ? (nextSame ? "first" : "single") : (nextSame ? "middle" : "last");

    return (
      <View>
        {showTime && <Text style={styles.timeLabel}>{timeLabel(item.created_at)}</Text>}
        <View style={styles.bubbleRow}>
          <Bubble
            text={item.text}
            direction={isMe ? "sent" : "received"}
            styleVariant={bubbleStyle}
            groupPosition={groupPosition}
            onLongPress={isMe && !item.id.startsWith("opt-") ? () => deleteMessage(item.id) : undefined}
          />
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop:topPad }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}><Feather name="arrow-left" size={24} color="#fff" /></TouchableOpacity>
        <Image source={{ uri:avatarUri }} style={styles.headerAvatar} />
        <View style={styles.headerInfo}><Text style={styles.headerName}>@{otherUsername}</Text></View>
        <View style={styles.callActions}>
          <TouchableOpacity style={styles.headerAction} onPress={() => void startCall("voice")} disabled={startingCall !== null}>
            {startingCall === "voice" ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="phone" size={19} color="#fff" />}
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerAction} onPress={() => void startCall("video")} disabled={startingCall !== null}>
            {startingCall === "video" ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="video" size={19} color="#fff" />}
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerAction} onPress={() => setBubblePickerVisible(true)}><Feather name="sliders" size={19} color="#fff" /></TouchableOpacity>
          <TouchableOpacity style={styles.profileBtn} onPress={() => router.push(`/call-history?conversationId=${encodeURIComponent(conversationId)}`)}><Feather name="clock" size={20} color="#888" /></TouchableOpacity>
          <TouchableOpacity style={styles.profileBtn} onPress={() => router.push(`/user-profile?userId=${otherUserId}`)}><Feather name="user" size={20} color="#888" /></TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={topPad + 60}>
        {loading ? <View style={styles.center}><ActivityIndicator color="#FE2C55" /></View> :
        messages.length === 0 ? <View style={styles.center}><View style={styles.emptyAvatar}><Image source={{ uri:avatarUri }} style={styles.emptyAvatarImg} /></View><Text style={styles.emptyTitle}>@{otherUsername}</Text><Text style={styles.emptyText}>Comenzá la conversación</Text></View> :
        <FlatList ref={flatListRef} data={messages} keyExtractor={item => item.id} renderItem={renderItem}
          contentContainerStyle={styles.messageList} showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated:false })} />}

        <View style={[styles.inputRow, { paddingBottom:botPad + 8 }]}>
          <TextInput value={text} onChangeText={setText} placeholder="Mensaje..." placeholderTextColor="#555"
            style={styles.input} multiline maxLength={1000} returnKeyType="send" onSubmitEditing={send} />
          <TouchableOpacity style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]} onPress={send} disabled={!text.trim() || sending}>
            {sending ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="send" size={18} color="#fff" />}
          </TouchableOpacity>
        </View>
        <BubbleStylePicker visible={bubblePickerVisible} value={bubbleStyle}
          onSelect={variant => void selectBubbleStyle(variant)} onClose={() => setBubblePickerVisible(false)} />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:"#000" },
  header:{ flexDirection:"row", alignItems:"center", paddingHorizontal:12, paddingVertical:10, borderBottomWidth:1, borderBottomColor:"#111", gap:10 },
  backBtn:{ padding:4 },
  headerAvatar:{ width:38, height:38, borderRadius:19, backgroundColor:"#1C1C1E" },
  headerInfo:{ flex:1 },
  headerName:{ color:"#fff", fontSize:15, fontWeight:"700" },
  callActions:{ flexDirection:"row", alignItems:"center", gap:2 },
  headerAction:{ padding:8, minWidth:36, alignItems:"center" },
  profileBtn:{ padding:6 },
  center:{ flex:1, alignItems:"center", justifyContent:"center", gap:14, paddingHorizontal:40 },
  emptyAvatar:{ marginBottom:8 },
  emptyAvatarImg:{ width:80, height:80, borderRadius:40, borderWidth:3, borderColor:"#FE2C55" },
  emptyTitle:{ color:"#fff", fontSize:18, fontWeight:"700" },
  emptyText:{ color:"#555", fontSize:14 },
  messageList:{ paddingHorizontal:16, paddingVertical:12, gap:4 },
  timeLabel:{ color:"#444", fontSize:12, textAlign:"center", marginVertical:12 },
  bubbleRow:{ width:"100%" },
  inputRow:{ flexDirection:"row", alignItems:"flex-end", paddingHorizontal:12, paddingTop:10, borderTopWidth:1, borderTopColor:"#111", gap:10 },
  input:{ flex:1, backgroundColor:"#1C1C1E", borderRadius:22, paddingHorizontal:16, paddingVertical:10, color:"#fff", fontSize:15, maxHeight:120 },
  sendBtn:{ width:42, height:42, borderRadius:21, backgroundColor:"#FE2C55", alignItems:"center", justifyContent:"center" },
  sendBtnDisabled:{ backgroundColor:"#2C2C2E" },
});