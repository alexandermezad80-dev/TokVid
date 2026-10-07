import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Image, Keyboard, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useAuth } from "../context/AuthContext";
import { useFeedComments } from "../hooks/useFeedComments";
import { useKeyboardSheetViewport } from "../hooks/useKeyboardSheetViewport";
import { requestRegistration } from "../lib/features/auth/services/registrationBridge";
import { COMMENT_LIMIT, FeedComment, commentLength, commentTime } from "../lib/features/comments/model";

interface Props {
  visible: boolean; onClose: () => void; videoId: string;
  /** Legacy callers may pass this label; the panel always reads the real server total. */
  commentCount?: string;
}
type ListRow = { kind: "comment"; comment: FeedComment; nested: boolean } | { kind: "thread"; root: FeedComment } | { kind: "more"; rootId: string };
const spring = { damping: 15, stiffness: 90, mass: 0.8 };

function Avatar({ uri, username }: { uri?: string | null; username?: string | null }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  return uri && !failed ? <Image source={{ uri }} onError={() => setFailed(true)} style={styles.avatar} /> :
    <View style={[styles.avatar, styles.initialAvatar]}>{username ? <Text style={styles.initial}>{Array.from(username)[0]?.toUpperCase()}</Text> : <Feather name="user" size={18} color="#aaa" />}</View>;
}

export default function CommentsSheet({ visible, onClose, videoId }: Props) {
  const { user, profile } = useAuth();
  const viewport = useKeyboardSheetViewport(visible);
  const comments = useFeedComments(visible, videoId);
  const [text, setText] = useState("");
  const [reply, setReply] = useState<FeedComment | null>(null);
  const input = useRef<TextInput>(null);
  const phase = useSharedValue(0);
  const context = `${videoId}:${user?.id ?? "guest"}`;
  useEffect(() => { setText(""); setReply(null); }, [context]);
  useEffect(() => { phase.value = withSpring(viewport.keyboardVisible ? 1 : 0, spring); }, [viewport.keyboardVisible, phase]);
  const sheetShape = useAnimatedStyle(() => { const p = Math.max(0, Math.min(1, phase.value)); return { borderRadius: 18 - 4 * p }; });
  const editorShape = useAnimatedStyle(() => { const p = Math.max(0, Math.min(1, phase.value)); return { borderRadius: 16 - 4 * p, height: 52 + 36 * p }; });
  const composerShape = useAnimatedStyle(() => { const p = Math.max(0, Math.min(1, phase.value)); return { paddingTop: 10 - 4 * p }; });
  const close = () => { Keyboard.dismiss(); onClose(); };
  const rows = useMemo<ListRow[]>(() => comments.roots.flatMap(root => {
    const result: ListRow[] = [{ kind: "comment", comment: root, nested: false }];
    if (root.reply_count > 0 || comments.expanded.has(root.id)) result.push({ kind: "thread", root });
    if (comments.expanded.has(root.id)) {
      const thread = comments.threads[root.id];
      for (const row of thread?.rows ?? []) result.push({ kind: "comment", comment: row, nested: true });
      if (thread?.hasMore) result.push({ kind: "more", rootId: root.id });
    }
    return result;
  }), [comments.roots, comments.threads, comments.expanded]);
  const requireUser = () => { if (user) return true; close(); requestRegistration(); return false; };
  const send = async () => {
    if (!text.trim() || comments.sending || !requireUser()) return;
    const sentText = text;
    const sentReply = reply;
    const confirmed = await comments.publish(sentText, sentReply?.id ?? null);
    if (confirmed) { setText(""); setReply(null); input.current?.blur(); Keyboard.dismiss(); }
  };
  const renderRow = ({ item }: { item: ListRow }) => {
    if (item.kind === "thread") return <Pressable accessibilityRole="button" disabled={comments.loading} onPress={() => { void comments.toggleThread(item.root.id); }} style={styles.threadAction}>
      <Text style={styles.link}>{comments.expanded.has(item.root.id) ? "Ocultar respuestas" : `Ver respuestas (${item.root.reply_count})`}</Text>
    </Pressable>;
    if (item.kind === "more") return <Pressable accessibilityRole="button" disabled={comments.paging} onPress={() => { void comments.moreReplies(item.rootId); }} style={styles.threadAction}><Text style={styles.link}>{comments.paging ? "Cargando…" : "Ver más respuestas"}</Text></Pressable>;
    const row = item.comment;
    const liked = comments.liked.has(row.id);
    return <View style={[styles.comment, item.nested && styles.nested]}>
      <Avatar uri={row.avatar_url} username={row.username} />
      <View style={styles.body}>
        <Text numberOfLines={1} ellipsizeMode="tail" style={styles.username}>@{row.username}</Text>
        {row.parent_id && !!row.reply_to_username && <Text numberOfLines={1} style={styles.replyTo}>↳ @{row.reply_to_username}</Text>}
        <Text style={styles.commentText}>{row.text}</Text>
        <View style={styles.metaRow}><Text style={styles.meta}>{commentTime(row.created_at)}</Text><Pressable accessibilityRole="button" disabled={comments.sending} onPress={() => { if (requireUser()) { setReply(row); input.current?.focus(); } }} hitSlop={8}><Text style={styles.meta}>Responder</Text></Pressable></View>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={liked ? "Quitar Me gusta" : "Me gusta"} accessibilityState={{ selected: liked, disabled: comments.pendingLikes.has(row.id) }} disabled={comments.pendingLikes.has(row.id)} onPress={() => { if (requireUser()) void comments.like(row); }} style={styles.like}>
        {comments.pendingLikes.has(row.id) ? <ActivityIndicator size="small" color="#FE0979" /> : <Ionicons name={liked ? "heart" : "heart-outline"} size={20} color={liked ? "#FE0979" : "#92929D"} />}
        <Text style={styles.meta}>{row.likes_count}</Text>
      </Pressable>
    </View>;
  };
  return <Modal visible={visible} transparent statusBarTranslucent animationType="slide" onRequestClose={close} onShow={viewport.measure}>
    <View ref={viewport.viewportRef} collapsable={false} onLayout={viewport.onLayout} style={[styles.viewport, { paddingBottom: viewport.keyboardInset + (viewport.keyboardVisible ? 8 : viewport.insets.bottom + 8) }]}>
      <Pressable accessibilityLabel="Cerrar comentarios" onPress={close} style={StyleSheet.absoluteFill} />
      <Animated.View style={[styles.sheet, sheetShape, { height: viewport.commentsHeight }]}>
        <View style={styles.handle} />
        <View style={styles.header}><LinearGradient colors={["rgba(0,242,254,0.24)", "rgba(254,9,121,0.24)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.countBadge}><Text style={styles.title}>{comments.total === null ? "Comentarios" : `${comments.total} comentarios`}</Text></LinearGradient><Pressable onPress={close} accessibilityLabel="Cerrar comentarios" accessibilityRole="button" style={styles.close}><Feather name="x" size={22} color="#fff" /></Pressable></View>
        {!!comments.error && <View style={styles.errorRow}><Text accessibilityRole="alert" style={styles.error}>{comments.error}</Text><Pressable accessibilityRole="button" onPress={() => { void comments.refresh(); }} style={styles.retry}><Text style={styles.link}>Recargar</Text></Pressable></View>}
        <FlatList<ListRow> data={rows} keyExtractor={row => row.kind === "comment" ? row.comment.id : row.kind === "thread" ? `thread:${row.root.id}` : `more:${row.rootId}`} renderItem={renderRow} style={styles.list} contentContainerStyle={rows.length ? styles.listContent : styles.emptyContainer} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} refreshing={comments.loading} onRefresh={() => { void comments.refresh(); }}
          ListEmptyComponent={comments.loading ? <ActivityIndicator color="#00F2FE" /> : comments.total === 0 ? <View style={styles.empty}><Feather name="message-circle" size={32} color="#666" /><Text style={styles.emptyText}>Sé el primero en comentar</Text></View> : null}
          ListFooterComponent={comments.hasMore ? <Pressable disabled={comments.paging} onPress={() => { void comments.loadMore(); }} style={styles.more}><Text style={styles.link}>{comments.paging ? "Cargando…" : "Cargar más comentarios"}</Text></Pressable> : null} />
        <Animated.View style={[styles.composer, composerShape]}>
          {reply && <Pressable accessibilityRole="button" accessibilityLabel="Cancelar respuesta" disabled={comments.sending} onPress={() => setReply(null)} hitSlop={8} style={styles.replyIndicator}><LinearGradient colors={["rgba(0,242,254,0.22)", "rgba(254,9,121,0.22)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.replyBubble}><Text style={styles.replyLabel}>Respondiendo</Text></LinearGradient></Pressable>}
          <Animated.View style={[styles.editor, editorShape]}>
            {!viewport.keyboardVisible && <Avatar uri={profile?.avatar_url} username={profile?.username} />}
            <View style={styles.editorBody}><TextInput ref={input} value={text} editable={!comments.sending} onChangeText={value => setText(Array.from(value).slice(0, COMMENT_LIMIT).join(""))} style={[styles.input, viewport.keyboardVisible && styles.expandedInput]} placeholder="Agregar un comentario…" placeholderTextColor="#8A8A96" selectionColor="#00F2FE" accessibilityLabel="Escribe tu comentario" multiline scrollEnabled maxLength={COMMENT_LIMIT * 2} textAlignVertical={viewport.keyboardVisible ? "top" : "center"} />
              {viewport.keyboardVisible && <Text style={styles.counter}>{commentLength(text)}/{COMMENT_LIMIT}</Text>}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Publicar comentario" disabled={!text.trim() || comments.sending} onPress={() => { void send(); }} style={styles.send}>
              {comments.sending ? <ActivityIndicator color="#FE0979" size="small" /> : <Feather name="arrow-up" size={22} color={text.trim() ? "#FE0979" : "#62626D"} />}
            </Pressable>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  viewport: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: { backgroundColor: "#15151B", overflow: "hidden", borderTopWidth: 1, borderColor: "#00F2FE", marginHorizontal: 24 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#55555E", alignSelf: "center", marginTop: 10 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingLeft: 12, paddingRight: 4, minHeight: 52 },
  countBadge: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, flexShrink: 1, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  title: { color: "#fff", fontSize: 15, fontWeight: "700", flexShrink: 1 }, close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  list: { flex: 1 }, listContent: { paddingHorizontal: 16, paddingBottom: 12 }, emptyContainer: { flexGrow: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", gap: 12 }, emptyText: { color: "#9999A4", fontSize: 14 },
  comment: { flexDirection: "row", gap: 10, paddingVertical: 12 }, nested: { marginLeft: 42 },
  avatar: { width: 32, height: 32, borderRadius: 16 }, initialAvatar: { backgroundColor: "#292933", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#FE0979" }, initial: { color: "#fff", fontSize: 14, fontWeight: "600" },
  body: { flex: 1, minWidth: 0, gap: 4 }, username: { color: "#A9A9B4", fontSize: 12, fontWeight: "600" }, commentText: { color: "#fff", fontSize: 14, lineHeight: 20 }, replyTo: { color: "#00F2FE", fontSize: 11 },
  metaRow: { flexDirection: "row", gap: 18, marginTop: 4 }, meta: { color: "#92929D", fontSize: 11 }, like: { alignItems: "center", justifyContent: "flex-start", gap: 4, minWidth: 36, paddingVertical: 4 },
  threadAction: { marginLeft: 42, paddingVertical: 12 }, link: { color: "#00F2FE", fontSize: 12 }, more: { padding: 16, alignItems: "center" },
  errorRow: { paddingHorizontal: 16, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 8 }, error: { color: "#ff8dab", fontSize: 12, flex: 1 }, retry: { padding: 8 },
  composer: { paddingTop: 10, paddingHorizontal: 12, paddingBottom: 8 }, replyIndicator: { alignSelf: "center", marginBottom: 6 }, replyBubble: { minWidth: 130, minHeight: 28, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }, replyLabel: { color: "#fff", fontSize: 12 },
  editor: { backgroundColor: "#22222B", flexDirection: "row", alignItems: "center", paddingHorizontal: 10, borderWidth: 1, borderColor: "#353541", gap: 8, overflow: "hidden" }, editorBody: { flex: 1, minWidth: 0 }, input: { color: "#fff", fontSize: 14, paddingVertical: 8, paddingHorizontal: 4, maxHeight: 48 }, expandedInput: { height: 60, maxHeight: 60, paddingVertical: 3 }, counter: { color: "#92929D", fontSize: 10, textAlign: "right", paddingRight: 4, paddingTop: 2 }, send: { width: 36, height: 44, alignItems: "center", justifyContent: "center" },
});
