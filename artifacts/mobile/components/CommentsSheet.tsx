import {palette} from '../constants/palette';
import { Feather, Ionicons } from "@expo/vector-icons";
import Svg, { Line } from "react-native-svg";
import { router } from "expo-router";
import { KeyboardProvider } from "react-native-keyboard-controller";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Dimensions, FlatList, Image, Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";
import CommentActionsPopover, { CommentAction } from "./CommentActionsPopover";
import * as Clipboard from "expo-clipboard";
import { useRegistration } from "../context/RegistrationContext";
import { useAuth } from "../context/AuthContext";
import { useFeedComments } from "../hooks/useFeedComments";
import { useOverlayKeyboard } from "../hooks/useOverlayKeyboard";
import { requestRegistration } from "../lib/features/auth/services/registrationBridge";
import { COMMENT_LIMIT, FeedComment, commentCapabilities, commentLength, commentTime } from "../lib/features/comments/model";
import { commentVideoLayout, VideoPreviewFrame } from "../lib/commentVideoLayout";
import { commentsGlassGeometry } from "../lib/commentsGlassGeometry";
import { commentSheetMotion } from "../lib/commentSheetMotion";
import { useCommentKeyboardMotion } from "../hooks/useCommentKeyboardMotion";
import { useRecentCommentEmojis } from "../hooks/useRecentCommentEmojis";
import { insertedCommentEmojis } from "../lib/commentRecentEmojis";

import { refreshSystemNavigation, useSystemNavigation } from "../hooks/useSystemNavigation";
import CommentEmojiStrip from "./CommentEmojiStrip";
import CommentEmojiPicker from "./CommentEmojiPicker";
import CommentPhoto from "./CommentPhoto";
import { useCommentDictation } from "../hooks/useCommentDictation";
import { insertCommentText, activeCommentMention } from "../lib/commentComposerText";
import { pickCommentPhoto, uploadCommentPhoto, discardCommentPhoto, suggestCommentMentions, commentMentionProfile, CommentPhoto as PhotoDraft, CommentMention } from "../lib/features/comments/composerTools";

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface Props {
  visible: boolean; onClose: () => void; videoId: string;
  focusCommentId?:string;
  isVideoSaved?: boolean;
  onSaveVideo?: () => void;
  /** Legacy callers may pass this label; the panel always reads the real server total. */
  commentCount?: string;
  overTabBar?: boolean;
  showVideoPreview?: boolean;
  onPreviewFrame?: (frame: VideoPreviewFrame | null) => void;
}
type ListRow = { kind: "pending"; comment: FeedComment; nested: boolean } | { kind: "comment"; comment: FeedComment; nested: boolean } | { kind: "thread"; root: FeedComment } | { kind: "more"; rootId: string };
function commentEntrance() {
  "worklet";
  return { initialValues: { opacity: 0, transform: [{ translateY: -8 }] }, animations: { opacity: withTiming(1, { duration: 200 }), transform: [{ translateY: withTiming(0, { duration: 200 }) }] } };
}

function commentExit() {
  "worklet";
  return { initialValues: { opacity: 1 }, animations: { opacity: withTiming(0, { duration: 200 }) } };
}
function Avatar({ uri, username, small = false, scale = 1 }: { uri?: string | null; username?: string | null; small?: boolean; scale?: number }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  return uri && !failed ? <Image source={{ uri }} onError={() => setFailed(true)} style={[styles.avatar, small && { ...styles.composerAvatar, width: 28 * scale, height: 28 * scale, borderRadius: 14 * scale }]} /> :
    <View style={[styles.avatar, small && { ...styles.composerAvatar, width: 28 * scale, height: 28 * scale, borderRadius: 14 * scale }, styles.initialAvatar]}>{username ? <Text style={styles.initial}>{Array.from(username)[0]?.toUpperCase()}</Text> : <Feather name="user" size={18} color="#aaa" />}</View>;
}

export default function CommentsSheet(props: Props) {
  const back = useRef(props.onClose);
  useSystemNavigation("#FFFFFF", true, props.visible);
  return <Modal visible={props.visible} transparent statusBarTranslucent navigationBarTranslucent animationType="slide" onShow={refreshSystemNavigation} onRequestClose={() => back.current()}>
    <KeyboardProvider statusBarTranslucent navigationBarTranslucent preload={false}>
      <CommentsPanel {...props} backHandler={back} />
    </KeyboardProvider>
  </Modal>;
}

function CommentsPanel({ visible, onClose, videoId, focusCommentId, isVideoSaved = false, onSaveVideo, overTabBar = false, showVideoPreview = false, onPreviewFrame, backHandler }: Props & { backHandler: React.MutableRefObject<() => void> }) {
  const { user, profile } = useAuth();
  const { tabBarHeight } = useRegistration();
  const { width } = useWindowDimensions();
  const viewport = useOverlayKeyboard(visible);
  const scale = Math.max(.75, Math.min(1.5, (width - viewport.insets.left - viewport.insets.right) / 360));
  const styles = useMemo(() => scaledCommentStyles(scale), [scale]);
  const [emojiPickerHeight, setEmojiPickerHeight] = useState(0);
  const motion = useCommentKeyboardMotion(visible, emojiPickerHeight);
  const { controlsOpen } = motion;
  const viewportTop = viewport.viewportTop, safeLeft = viewport.insets.left;
  const emojis = useRecentCommentEmojis(user?.id);
  const comments = useFeedComments(visible, videoId,undefined,focusCommentId);
  const listRef=useRef<FlatList<ListRow>>(null),focusScrolled=useRef<string|null>(null);
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<PhotoDraft | null>(null);
  const [pickingPhoto, setPickingPhoto] = useState(false);
  const [mentions, setMentions] = useState<CommentMention[]>([]);
  const [cursor, setCursor] = useState(0);
  const selection = useRef({ start: 0, end: 0 });
  const dictationDraft = useRef({ text: "", selection: { start: 0, end: 0 } });
  const [reply, setReply] = useState<FeedComment | null>(null);
  const [editing, setEditing] = useState<FeedComment | null>(null);
  const [actionComment, setActionComment] = useState<FeedComment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FeedComment | null>(null);
  const rowViews = useRef(new Map<string, View>());
  const selectionSequence = useRef(0);
  const savedDraft = useRef<{ text: string; reply: FeedComment | null; photo: PhotoDraft | null } | null>(null);
  const input = useRef<TextInput>(null);
  const [pending, setPending] = useState<FeedComment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [newCommentId, setNewCommentId] = useState<string | null>(null);
  const sendAttempt = useRef(0), sendLocked = useRef(false), mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const context = `${videoId}:${user?.id ?? "guest"}`;
  const currentContext = useRef(context); currentContext.current = context;
  useEffect(() => { sendAttempt.current++; sendLocked.current = false; setPending(null); setSubmitting(false); setSubmissionError(""); setNewCommentId(null); selectionSequence.current++; setText(""); setPhoto(null); setPickingPhoto(false); setEmojiPickerHeight(0); setReply(null); setEditing(null); setActionComment(null); setDeleteTarget(null); savedDraft.current = null; }, [context]);
  useEffect(() => { if (!visible) { selectionSequence.current++; setActionComment(null); } }, [visible]);
  const dismissActions = () => { selectionSequence.current++; setActionComment(null); };
  const close = () => { dismissActions(); setDeleteTarget(null); dictation.cancel(); setEmojiPickerHeight(0); if (editing) cancelEdit(); Keyboard.dismiss(); onClose(); };
  backHandler.current = () => deleteTarget ? setDeleteTarget(null) : actionComment ? dismissActions() : close();
  const openProfile = (authorId: string) => {
    if (!authorId) return;
    close();
    if (authorId === user?.id) router.push("/(tabs)/profile");
    else router.push({ pathname: "/user-profile", params: { userId: authorId } });
  };
  const rows = useMemo<ListRow[]>(() => [
    ...(pending && !pending.parent_id ? [{ kind: "pending" as const, comment: pending, nested: false }] : []),
    ...comments.roots.flatMap(root => {
    if (comments.hiddenThreads.has(root.id) || comments.dismissedComments.has(root.id)) return [];
    const result: ListRow[] = [{ kind: "comment", comment: root, nested: false }];
    if (pending?.root_id === root.id) result.push({ kind: "pending", comment: pending, nested: true });

    if (comments.expanded.has(root.id)) {
      const thread = comments.threads[root.id];
      for (const row of thread?.rows ?? []) if (!comments.dismissedComments.has(row.id)) result.push({ kind: "comment", comment: row, nested: true });
      if (thread?.hasMore) result.push({ kind: "more", rootId: root.id });
    }
    return result;
  })], [comments.roots, comments.threads, comments.expanded, comments.hiddenThreads, comments.dismissedComments, pending]);
  const focusIndex=rows.findIndex(r=>r.kind==='comment'&&r.comment.id===focusCommentId);
  useEffect(()=>{if(!visible){focusScrolled.current=null;return;}if(focusIndex<0||comments.loading||!focusCommentId||focusScrolled.current===focusCommentId)return;const timer=setTimeout(()=>{listRef.current?.scrollToIndex({index:focusIndex,viewPosition:.25,animated:true});focusScrolled.current=focusCommentId;},200);return()=>clearTimeout(timer);},[visible,focusCommentId,focusIndex,comments.loading]);
  const requireUser = () => { if (user) return true; close(); requestRegistration(); return false; };
  const busy = comments.sending || comments.mutating || submitting || pickingPhoto;
  const dictation = useCommentDictation(visible && !busy && !emojiPickerHeight, context, words => {
    const draft = dictationDraft.current;
    const next = draft.text.slice(0, draft.selection.start) + words + draft.text.slice(draft.selection.end);
    setText(Array.from(next).slice(0, COMMENT_LIMIT).join(""));
  }, setSubmissionError);
  const mention = activeCommentMention(text, cursor);
  useEffect(() => {
    let active = true;
    setMentions([]);
    if (!mention || !user || !controlsOpen || busy) return;
    const timer = setTimeout(() => { void suggestCommentMentions(videoId, mention.query).then(rows => { if (active) setMentions(rows); }).catch(() => {}); }, 180);
    return () => { active = false; clearTimeout(timer); };
  }, [mention?.query, mention?.start, videoId, user?.id, controlsOpen, busy]);
  const choosePhoto = async () => {
    if (busy || !requireUser()) return;
    if (editing) { setSubmissionError("Termina de editar para añadir una imagen a un comentario nuevo."); return; }
    const current = context; setPickingPhoto(true); dictation.cancel();
    try { const picked = await pickCommentPhoto(); if (mounted.current && currentContext.current === current && picked) { void discardCommentPhoto(photo); setPhoto(picked); input.current?.focus(); } }
    catch { if (mounted.current && currentContext.current === current) setSubmissionError("No se pudo abrir la galería. Revisa el permiso de fotos e inténtalo de nuevo."); }
    finally { if (mounted.current && currentContext.current === current) setPickingPhoto(false); }
  };
  const cancelEdit = () => {
    const draft = savedDraft.current;
    setText(draft?.text ?? ""); setReply(draft?.reply ?? null); setPhoto(draft?.photo ?? null); setEditing(null); savedDraft.current = null;
  };
  const startEdit = (row: FeedComment) => {
    if (busy || row.user_id !== user?.id || row.deleted_at) return;
    if (!editing) savedDraft.current = { text, reply, photo };
    dictation.cancel(); setPhoto(null); setEditing(row); setReply(null); setText(row.text); selection.current = { start: row.text.length, end: row.text.length }; dismissActions(); input.current?.focus();
  };
  const openActions = (row: FeedComment) => {
    if (busy || !requireUser()) return;
    Keyboard.dismiss();
    setActionComment(row);
  };
  const copyComment = async (row: FeedComment) => {
    if (busy || row.deleted_at) return;
    dismissActions();
    try { await Clipboard.setStringAsync(row.text); }
    catch { Alert.alert("No se pudo copiar", "Vuelve a intentarlo."); }
  };
  const startVideoReply = (row: FeedComment) => {
    if (busy || row.deleted_at || !requireUser()) return;
    close();
    router.push({ pathname: "/comment-video-reply", params: { commentId: row.id } });
  };
  useEffect(() => {
    if (actionComment && !rows.some(row => row.kind === "comment" && row.comment.id === actionComment.id)) dismissActions();
  }, [rows]);
  const startReply = (row: FeedComment) => {
    if (busy || editing || row.deleted_at || !requireUser()) return;
    dismissActions(); setReply(row); input.current?.focus();
  };
  const performDelete = (row: FeedComment, forEveryone = false) => {
    dismissActions();
    const root = !row.parent_id;
    if(busy||row.user_id!==user?.id)return;
    void (async()=>{
      const confirmed=await (forEveryone ? comments.remove(row) : comments.removeForMe(row));
      if(!confirmed)return;
      if(editing&&(editing.id===row.id||(root&&editing.root_id===row.id)))cancelEdit();
      if(reply&&(reply.id===row.id||(root&&reply.root_id===row.id)))setReply(null);
    })();
  };
  const confirmDelete = (row: FeedComment, forEveryone = false) => {
    if (busy || row.user_id !== user?.id) return;
    if (forEveryone) { dismissActions(); setDeleteTarget(row); }
    else performDelete(row);
  };
  const capabilities = actionComment ? commentCapabilities(actionComment, user?.id, comments.publicationOwnerId) : null;
  const actions: CommentAction[] = actionComment && capabilities ? [
    ...(capabilities.canEdit ? [{ key: "edit", title: "Editar", icon: "edit-2" as const, disabled: busy, onPress: () => startEdit(actionComment) }] : []),
    ...(capabilities.canDelete ? [{ key: "delete", title: "Eliminar", icon: "trash-2" as const, destructive: true, disabled: busy, onPress: () => confirmDelete(actionComment) },
      { key: "delete-everyone", title: "Eliminar para todos", icon: "trash-2" as const, destructive: true, disabled: busy, onPress: () => confirmDelete(actionComment, true) }] : []),
    { key: "hide", title: "Ocultar mensajes", icon: "eye-off", disabled: busy, onPress: () => { const selected = actionComment; dismissActions(); void comments.hideThread(selected); } },
    ...(!actionComment.deleted_at ? [
      { key: "copy", title: "Copiar", icon: "copy" as const, disabled: busy, onPress: () => { void copyComment(actionComment); } },
      { key: "video-reply", title: "Responder con video", icon: "video" as const, disabled: busy, onPress: () => startVideoReply(actionComment) },
    ] : []),
    ...(onSaveVideo ? [{ key: "save", title: isVideoSaved ? "Quitar de favoritos" : "Guardar", icon: "bookmark" as const, disabled: busy, onPress: () => { dismissActions(); onSaveVideo(); } }] : []),
  ] : [];
  const desiredSheetHeight=Math.max(0,viewport.fullHeight-Math.max(0,viewport.insets.top-viewport.viewportTop)-12);
  const previewLayout=commentVideoLayout({width,availableHeight:viewport.fullHeight,
    safeTop:viewport.insets.top,viewportTop:viewport.viewportTop,safeLeft:viewport.insets.left,safeRight:viewport.insets.right,
    bottomPadding:0,desiredSheetHeight,keyboardVisible:false});
  const preview = previewLayout.preview;
  const sheetTop = showVideoPreview ? preview.y + preview.height + 8 : viewport.fullHeight - desiredSheetHeight;
  // Keep the frame and header pinned at the same screen Y while the IME changes
  // height (including Gboard letters -> emojis). Never resize the video here.
  const screenHeight = Dimensions.get("screen").height;
  const { closedBottom, closedSheetHeight } = commentsGlassGeometry({ fullHeight: viewport.fullHeight,
    availableHeight: viewport.availableHeight, sheetTop, safeBottom: viewport.insets.bottom,
    keyboardVisible: viewport.keyboardVisible, screenHeight, viewportTop: viewport.viewportTop, scale });
  const composerMotion = useAnimatedStyle(() => {
    const layout = commentSheetMotion({ sheetTop, closedBottom, screenHeight, viewportTop: viewportTop,
      keyboardHeight: motion.height.value, progress: motion.progress.value, scale });
    const extra = photo ? Math.min(64 * scale, layout.bodyHeight) : 0;
    return { top: layout.composerTop - extra, height: layout.composerHeight + extra };
  });
  const bodyMotion = useAnimatedStyle(() => {
    const layout = commentSheetMotion({ sheetTop, closedBottom, screenHeight, viewportTop: viewportTop,
      keyboardHeight: motion.height.value, progress: motion.progress.value, scale });
    return { height: Math.max(0, layout.bodyHeight - (photo ? 64 * scale : 0)), opacity: motion.bodyOpacity.value };
  });
  const formMotion = useAnimatedStyle(() => ({ paddingTop: 12.5 * (1 - motion.progress.value) * scale,
    paddingBottom: (12 - 2.5 * motion.progress.value) * scale }));
  const emojiMotion = useAnimatedStyle(() => ({ height: 18 * motion.progress.value * scale,
    marginTop: 6 * motion.progress.value * scale, opacity: motion.controlsOpacity.value }));
  const toolsMotion = useAnimatedStyle(() => ({ height: 24 * motion.progress.value * scale,
    marginTop: 14 * motion.progress.value * scale, opacity: motion.controlsOpacity.value }));
  const editorMotion = useAnimatedStyle(() => {
    const p = Math.max(0, Math.min(1, motion.progress.value));
    return { height: (38 - 2 * p) * scale, width: ((265 + 69 * p) * scale),
      marginLeft: safeLeft + (16 - 6 * p) * scale, marginTop: 10 * p * scale,
      paddingLeft: 8 * (1 - p) * scale, paddingRight: 2.5 * (1 - p) * scale,
      gap: (11 - 5 * p) * scale, borderWidth: (1 - p) * scale,
      borderRadius: (19 - 6 * p) * scale, backgroundColor: `rgba(240,239,236,${1 - p})` };
  });
  const fieldMotion = useAnimatedStyle(() => ({ borderWidth: motion.progress.value * scale,
    borderRadius: 13 * motion.progress.value * scale, marginRight: 40 * (1 - motion.progress.value) * scale,
    backgroundColor: `rgba(240,239,236,${motion.progress.value})` }));
  const inputMotion = useAnimatedStyle(() => ({ fontSize: 14,
    paddingLeft: 10 * motion.progress.value * scale, paddingRight: ((reply ? 28 : 0) + 52 * motion.progress.value) * scale,
    paddingVertical: 0 }));
  const counterMotion = useAnimatedStyle(() => ({ opacity: motion.controlsOpacity.value }));
  const collapsedSendMotion = useAnimatedStyle(() => ({ opacity: 1 - motion.progress.value }));
  const canSend = (!!text.trim() || !!photo || !!editing?.image_path) && !busy;
  const changeText = (value: string) => {
    dictation.cancel();
    const next = Array.from(value).slice(0, COMMENT_LIMIT).join("");
    emojis.remember(insertedCommentEmojis(text, next));
    setText(next); selection.current = { start: next.length, end: next.length }; setCursor(next.length); setSubmissionError("");
  };
  const insertQuickEmoji = (emoji: string) => {
    if (busy) return;
    const next = insertCommentText(text, emoji, selection.current);
    if (!next) return;
    emojis.remember([emoji]); setText(next.text); selection.current = { start: next.cursor, end: next.cursor }; setCursor(next.cursor);
    if (!emojiPickerHeight) input.current?.focus();
  };
  useEffect(() => {
    onPreviewFrame?.(visible && showVideoPreview ? { ...preview, y: preview.y + viewport.viewportTop } : null);
  }, [visible, showVideoPreview, preview.x, preview.y, preview.width, preview.height, viewport.viewportTop, onPreviewFrame]);
  useEffect(() => () => onPreviewFrame?.(null), [onPreviewFrame]);
  const send = async () => {
    if (!canSend || busy || sendLocked.current || !requireUser()) return;
    sendLocked.current = true;
    const attempt = ++sendAttempt.current, sentContext = context;
    const sentText = text, sentReply = reply, sentEditing = editing, sentPhoto = photo;
    let committed = false;
    const isCurrent = () => mounted.current && currentContext.current === sentContext && sendAttempt.current === attempt;
    dictation.cancel(); setEmojiPickerHeight(0); setSubmitting(true); setSubmissionError(""); setText(""); setPhoto(null); setReply(null); setEditing(null);
    if (!sentEditing) setPending({ id: `pending:${attempt}`, video_id: videoId, user_id: user!.id,
      username: profile?.username ?? "", avatar_url: profile?.avatar_url ?? null, text: sentText.trim(),
      created_at: new Date().toISOString(), parent_id: sentReply?.id ?? null,
      root_id: sentReply ? sentReply.root_id ?? sentReply.id : null,
      reply_to_username: sentReply?.username ?? null, likes_count: 0, reply_count: 0 });
    input.current?.blur(); Keyboard.dismiss();
    if (!sentReply) listRef.current?.scrollToOffset({ offset: 0, animated: true });
    const onCommitted = (row: FeedComment) => {
      committed = true;
      if (isCurrent()) { setPending(null); setNewCommentId(row.id); }
    };
    try {
      const imagePath = sentPhoto ? await uploadCommentPhoto(user!.id, sentPhoto) : null;
      if (!isCurrent()) { if (sentPhoto) void discardCommentPhoto(sentPhoto); return; }
      const confirmed = sentEditing ? await comments.edit(sentEditing, sentText)
        : await comments.publish(sentText, sentReply?.id ?? null, onCommitted, imagePath);
      if (!isCurrent()) return;
      setPending(null);
      if (confirmed || committed) {
        if (sentEditing) cancelEdit();
      } else {
        setText(sentText); setPhoto(sentPhoto); setReply(sentReply); setEditing(sentEditing);
        setSubmissionError("No se pudo enviar. Conservamos tu texto para reintentar.");
      }
    } catch {
      if (isCurrent() && !committed) {
        setPending(null); setText(sentText); setPhoto(sentPhoto); setReply(sentReply); setEditing(sentEditing);
        setSubmissionError("No se pudo enviar. Conservamos tu texto para reintentar.");
      }
    } finally {
      if (isCurrent()) { sendLocked.current = false; setSubmitting(false); }
    }
  };
  const renderRow = ({ item }: { item: ListRow }) => {
    if (item.kind === "pending") return <Animated.View entering={commentEntrance} style={[styles.comment, item.nested && styles.nested]} accessibilityLabel="Comentario pendiente de envío">
      <Avatar uri={item.comment.avatar_url} username={item.comment.username} />
      <View style={styles.body}><View style={styles.commentHeader}><Text style={[styles.username, styles.usernameHeading]}>@{item.comment.username}</Text><Text style={styles.meta}>ahora · Enviando</Text></View>
        {!!item.comment.reply_to_username && <Text style={styles.replyTo}>↳ @{item.comment.reply_to_username}</Text>}
        <Text style={styles.commentText}>{item.comment.text}</Text></View>
    </Animated.View>;
    if (item.kind === "thread") return <Pressable accessibilityRole="button" disabled={comments.loading} onPress={() => { void comments.toggleThread(item.root.id); }} style={styles.threadAction}>
      <Text style={styles.link}>{comments.expanded.has(item.root.id) ? "Ocultar respuestas" : `Ver respuestas (${item.root.reply_count})`}</Text>
    </Pressable>;
    if (item.kind === "more") return <Pressable accessibilityRole="button" disabled={comments.paging} onPress={() => { void comments.moreReplies(item.rootId); }} style={styles.threadAction}><Text style={styles.link}>{comments.paging ? "Cargando…" : "Ver más respuestas"}</Text></Pressable>;
    const row = item.comment;
    const liked = comments.liked.has(row.id);
    return <Animated.View entering={newCommentId === row.id ? commentEntrance : undefined} exiting={commentExit}><View ref={view => { if (view) rowViews.current.set(row.id, view); else rowViews.current.delete(row.id); }} collapsable={false} style={[styles.comment, item.nested && styles.nested, actionComment?.id === row.id && styles.selectedComment]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Ver perfil de ${row.username}`} onPress={() => openProfile(row.user_id)} hitSlop={6}><Avatar uri={row.avatar_url} username={row.username} /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Opciones del comentario de ${row.username}`} onPress={() => openActions(row)} onLongPress={() => openActions(row)} style={styles.body}>
        <View style={styles.commentHeader}><Text numberOfLines={1} ellipsizeMode="tail" style={[styles.username, styles.usernameHeading]}>@{row.username}</Text><Text style={styles.meta}>{commentTime(row.created_at)}{row.edited_at?" · editado":""}</Text><Pressable accessibilityRole="button" accessibilityLabel="Opciones del comentario" disabled={busy || comments.pendingLikes.has(row.id)} onPress={event => { event.stopPropagation(); openActions(row); }} hitSlop={10} style={styles.optionsButton}><Feather name="more-horizontal" size={18} color="#92929D" /></Pressable></View>
        {row.parent_id && !!row.reply_to_username && <Text numberOfLines={1} style={styles.replyTo}>↳ @{row.reply_to_username}</Text>}
        <Text style={[styles.commentText, !!row.deleted_at && styles.deletedText]}>{row.deleted_at ? "Comentario eliminado" : row.text.split(/(@[\p{L}\p{N}_.]+)/u).map((part, index) => part.startsWith("@") ? <Text key={index} style={{ color: "#15868B" }} onPress={event => { event.stopPropagation(); void commentMentionProfile(part.slice(1)).then(id => { if (id) openProfile(id); }).catch(() => setSubmissionError("No se pudo abrir el perfil.")); }}>{part}</Text> : part)}</Text>
        {!row.deleted_at && !!row.image_path && <CommentPhoto path={row.image_path} />}
        <View style={styles.metaRow}>{!row.deleted_at && <Pressable accessibilityRole="button" accessibilityLabel={`Responder a @${row.username.replace(/^@/, "")}`} disabled={busy || !!editing} onPress={event => { event.stopPropagation(); startReply(row); }} hitSlop={8}><Text style={styles.meta}>Responder</Text></Pressable>}{!item.nested&&(row.reply_count>0||comments.expanded.has(row.id))&&<Pressable onPress={event=>{event.stopPropagation();void comments.toggleThread(row.id);}}><Text style={styles.link}>{comments.expanded.has(row.id)?"Ocultar respuestas":`Ver respuestas (${row.reply_count})`}</Text></Pressable>}</View>
      </Pressable>
      <View style={styles.like}>
      {!row.deleted_at && <Pressable accessibilityRole="button" accessibilityLabel={liked ? "Quitar Me gusta" : "Me gusta"} accessibilityState={{ selected: liked, disabled: comments.pendingLikes.has(row.id) || busy }} disabled={comments.pendingLikes.has(row.id) || busy} onPress={() => { if (requireUser()) void comments.like(row); }} style={styles.likeButton}>
        {comments.pendingLikes.has(row.id) ? <ActivityIndicator size="small" color="#FE0979" /> : <Ionicons name={liked ? "heart" : "heart-outline"} size={20} color={liked ? "#FE0979" : "#92929D"} />}
        <Text style={styles.meta}>{row.likes_count}</Text>
      </Pressable>}
      </View>
    </View></Animated.View>;
  };
  return <View ref={viewport.viewportRef} collapsable={false} onLayout={viewport.onLayout} style={[styles.viewport, showVideoPreview && { backgroundColor: "transparent" }, { height:viewport.fullHeight,flex:0 }]}>
      <Pressable accessibilityLabel="Cerrar comentarios" onPress={close} style={StyleSheet.absoluteFill} />
      {showVideoPreview && preview.height > 0 && <Pressable accessibilityRole="button" accessibilityLabel="Volver al video completo" onPress={close}
        style={[styles.videoPreview, { left: preview.x, top: preview.y, width: preview.width, height: preview.height }]}>
        <View style={styles.expandVideo}><Feather name="maximize-2" size={10} color="#fff" /></View>
      </Pressable>}
      <Animated.View style={[styles.sheet, { position: "absolute", left: 0, right: 0, top: sheetTop, height: closedSheetHeight, backgroundColor: "#FFFFFF" }]}>
        <View accessibilityElementsHidden={!!actionComment} importantForAccessibility={actionComment ? "no-hide-descendants" : "auto"} style={styles.headerGlass}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={[styles.countBadge, { left: 10.5 * scale + viewport.insets.left, maxWidth: Math.max(125 * scale, Math.min(280 * scale, width - viewport.insets.left - viewport.insets.right - 60 * scale)) }]}><Text numberOfLines={1} style={styles.title}>{!comments.total ? "Comentarios" : `${comments.total} ${comments.total === 1 ? "comentario" : "comentarios"}`}</Text></View>
            <Pressable onPress={close} accessibilityLabel="Cerrar comentarios" accessibilityRole="button" style={[styles.close, { right: 2 * scale + viewport.insets.right }]}><Svg width={14 * scale} height={14 * scale} viewBox="0 0 14 14"><Line x1={1} y1={1} x2={13} y2={13} stroke="#1C1C1E" strokeWidth={2} /><Line x1={13} y1={1} x2={1} y2={13} stroke="#1C1C1E" strokeWidth={2} /></Svg></Pressable>
          </View>
        </View>
        <Animated.View pointerEvents={controlsOpen ? "none" : "auto"} accessibilityElementsHidden={controlsOpen || !!actionComment} importantForAccessibility={controlsOpen || actionComment ? "no-hide-descendants" : "auto"} style={[{ position: "absolute", top: 56 * scale, left: 0, right: 0, overflow: "hidden", backgroundColor: "#FFFFFF" }, bodyMotion]}>
          {!!(submissionError || comments.error) && <View style={styles.errorRow}><Text accessibilityRole="alert" style={styles.error}>{submissionError || comments.error}</Text><Pressable accessibilityRole="button" onPress={() => { void comments.refresh(); }} style={styles.retry}><Text style={styles.link}>Recargar</Text></Pressable></View>}
          {comments.hiddenThreads.size > 0 && <Pressable accessibilityRole="button" accessibilityLabel="Mostrar mensajes ocultos" disabled={busy} onPress={() => { void comments.restoreThreads(); }} style={styles.hiddenNotice}><View style={styles.showBadge}><Feather name="eye" size={15 * scale} color="#131313" /><Text style={styles.showLabel}>Mostrar</Text></View></Pressable>}
          <FlatList<ListRow> ref={listRef} onScrollToIndexFailed={info=>{listRef.current?.scrollToOffset({offset:info.averageItemLength*info.index,animated:false});setTimeout(()=>{if(focusIndex>=0)listRef.current?.scrollToIndex({index:focusIndex,viewPosition:.25,animated:true});},200);}} data={rows} keyExtractor={row => row.kind === "comment" || row.kind === "pending" ? row.comment.id : row.kind === "thread" ? `thread:${row.root.id}` : `more:${row.rootId}`} renderItem={renderRow} style={styles.list} onScrollBeginDrag={dismissActions} contentContainerStyle={[rows.length ? styles.listContent : styles.emptyContainer, rows.length > 0 && { paddingTop: Math.max(0, (comments.hiddenThreads.size > 0 ? 10 : 16) * scale - 8) }, { paddingLeft: 16 + viewport.insets.left, paddingRight: 16 + viewport.insets.right, paddingBottom: 12 }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} refreshing={false} onRefresh={() => { void comments.refresh(); }}
            ListEmptyComponent={comments.loading && !submitting ? <ActivityIndicator size={12} color={palette.teal} /> : comments.total === 0 || comments.hiddenThreads.size > 0 || comments.dismissedComments.size > 0 ? <View style={styles.empty}><Feather name="message-circle" size={22.5} color="#5B6270" /><Text style={styles.emptyText}>{comments.total === 0 ? "Sé el primero en comentar" : "No hay hilos visibles en esta página"}</Text></View> : null}
            ListFooterComponent={comments.hasMore ? <Pressable disabled={comments.paging} onPress={() => { void comments.loadMore(); }} style={styles.more}><Text style={styles.link}>{comments.paging ? "Cargando…" : "Cargar más comentarios"}</Text></Pressable> : null} />
        </Animated.View>
        <Animated.View accessibilityElementsHidden={!!actionComment} importantForAccessibility={actionComment ? "no-hide-descendants" : "auto"} style={[styles.composer, { position: "absolute", left: 0, right: 0, overflow: "hidden" }, composerMotion]}>
          <ScrollView style={styles.composerScroll} scrollEnabled={controlsOpen && viewport.availableHeight - sheetTop - 56 * scale < 117.5 * scale} keyboardShouldPersistTaps="always" showsVerticalScrollIndicator={false}>
            <Animated.View style={formMotion}>
              {photo && <View style={{ height: 64 * scale, paddingLeft: 44 * scale }}>
                <Image source={{ uri: photo.uri }} style={{ width: 56 * scale, height: 56 * scale, borderRadius: 8 }} resizeMode="cover" />
                <Pressable accessibilityLabel="Quitar imagen del comentario" disabled={busy} onPress={() => { void discardCommentPhoto(photo); setPhoto(null); }} hitSlop={8} style={{ position: "absolute", left: 84 * scale, top: 0, width: 16 * scale, height: 16 * scale, borderRadius: 8, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}><Feather name="x" size={12 * scale} color="#333" /></Pressable>
              </View>}
              <Animated.View pointerEvents={controlsOpen ? "auto" : "none"} accessibilityElementsHidden={!controlsOpen} importantForAccessibility={controlsOpen ? "auto" : "no-hide-descendants"} style={[styles.emojiRow, { marginLeft: viewport.insets.left + 44 * scale }, emojiMotion]}>
                <CommentEmojiStrip key={user?.id ?? "guest"} active={controlsOpen} recent={emojis.recent} scale={scale} disabled={busy} onSelect={insertQuickEmoji} />
              </Animated.View>
              <Animated.View style={[styles.editor, editorMotion]}>
                <Avatar uri={profile?.avatar_url} username={profile?.username} small scale={scale} />
                <Animated.View style={[styles.editorBody, fieldMotion]}>
                  <AnimatedTextInput ref={input} value={text} editable={!busy} onChangeText={changeText}
                    onSelectionChange={event => { selection.current = event.nativeEvent.selection; setCursor(event.nativeEvent.selection.start); }}
                    style={[styles.input, { flex: 0, width: "100%", height: "100%", lineHeight: 20 }, inputMotion]}
                    placeholder={reply ? "" : controlsOpen ? "Agregar un comentario..." : "Agregar comentarios"} placeholderTextColor="#6B6B66"
                    selectionColor="#4682B4" accessibilityLabel={reply ? `Responder a @${reply.username.replace(/^@/, "")}` : "Escribe tu comentario"}
                    multiline={controlsOpen} scrollEnabled maxLength={COMMENT_LIMIT * 2} textAlignVertical="center" />
                  {reply && !text && <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants"
                    style={{ position: "absolute", left: (controlsOpen ? 10 : 4) * scale, right: (controlsOpen ? 80 : 28) * scale, top: 0, bottom: 0, justifyContent: "center" }}>
                    <Text numberOfLines={1} maxFontSizeMultiplier={1.1} style={{ color: "#6B6B66", fontSize: 14, lineHeight: 20, includeFontPadding: false }}>Responder</Text>
                  </View>}
                  {reply && <Pressable accessibilityRole="button" accessibilityLabel="Cancelar respuesta" disabled={busy} onPress={() => setReply(null)}
                    style={{ position: "absolute", right: (controlsOpen ? 50 : 0) * scale, top: 0, bottom: 0, width: 28 * scale, alignItems: "center", justifyContent: "center" }}>
                    <Feather name="x" size={14 * scale} color="#6B6B66" />
                  </Pressable>}
                  <Animated.View pointerEvents="none" style={[{ position: "absolute", right: 10 * scale, top: 0, bottom: 0, justifyContent: "center" }, counterMotion]}><Text style={{ fontFamily: "Inter_400Regular", color: "#6B6B66", fontSize: 11, includeFontPadding: false }}>{commentLength(text)}/{COMMENT_LIMIT}</Text></Animated.View>
                </Animated.View>
                <Animated.View pointerEvents={controlsOpen ? "none" : "auto"} accessibilityElementsHidden={controlsOpen} importantForAccessibility={controlsOpen ? "no-hide-descendants" : "auto"} style={[styles.sendCollapsed, collapsedSendMotion]}>
                  <Pressable accessibilityRole="button" accessibilityLabel={editing ? "Guardar cambios" : "Publicar comentario"} disabled={!canSend} onPress={() => { void send(); }} style={StyleSheet.absoluteFill}>
                    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>{busy ? <ActivityIndicator color="#6B6B66" size={12} /> : <Feather name="arrow-up" size={12.5 * scale} color="#6B6B66" />}</View>
                  </Pressable>
                </Animated.View>
              </Animated.View>
              <Animated.View pointerEvents={controlsOpen ? "auto" : "none"} accessibilityElementsHidden={!controlsOpen} importantForAccessibility={controlsOpen ? "auto" : "no-hide-descendants"} style={[styles.toolsRow, { paddingLeft: viewport.insets.left + 44 * scale, paddingRight: viewport.insets.right + 16 * scale, overflow: "hidden" }, toolsMotion]}>
                <Pressable accessibilityRole="button" accessibilityLabel="Añadir imagen al comentario" disabled={busy} onPress={() => { void choosePhoto(); }} style={styles.tool}><Feather name="image" size={20 * scale} color="#3A3F47" /></Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel="Abrir emojis" disabled={busy} onPress={() => { if (!requireUser()) return; dictation.cancel(); setEmojiPickerHeight(Math.max(220, motion.height.value || 280)); Keyboard.dismiss(); }} style={styles.tool}><Feather name="smile" size={20 * scale} color="#3A3F47" /></Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel="Mencionar usuario" disabled={busy} onPress={() => { if (!requireUser()) return; dictation.cancel(); const next = insertCommentText(text, "@", selection.current); if (next) { setText(next.text); selection.current = { start: next.cursor, end: next.cursor }; setCursor(next.cursor); input.current?.focus(); } }} style={styles.tool}><Feather name="at-sign" size={20 * scale} color="#3A3F47" /></Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={dictation.listening ? "Detener dictado" : "Dictar comentario"} accessibilityState={{ selected: dictation.listening }} disabled={busy} onPress={() => { if (!requireUser()) return; if (!dictation.listening) dictationDraft.current = { text, selection: { ...selection.current } }; void dictation.toggle(); }} style={styles.tool}>{dictation.listening ? <ActivityIndicator size={20 * scale} color="#FE0979" /> : <Feather name="mic" size={20 * scale} color="#3A3F47" />}</Pressable>
                <View style={styles.toolSpacer} />
                <Pressable accessibilityRole="button" accessibilityLabel={editing ? "Guardar cambios" : "Publicar comentario"} disabled={!canSend} onPress={() => { void send(); }} style={[styles.sendKeyboard, { backgroundColor: canSend ? "#4682B4" : "rgba(70,130,180,0.60)" }]}>
                  {busy ? <ActivityIndicator color="#FFFFFF" size={12} /> : <Feather name="arrow-up" size={20 * scale} color="#FFFFFF" />}
                </Pressable>
              </Animated.View>
            </Animated.View>
          </ScrollView>
        </Animated.View>
      </Animated.View>
      <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: closedBottom, bottom: 0, backgroundColor: "#FFFFFF" }}/>
      {mentions.length > 0 && mention && <View style={{ position: "absolute", left: 44 * scale, right: 16 * scale, bottom: Math.max(viewport.keyboardInset, viewport.insets.bottom) + 120 * scale, maxHeight: 160, backgroundColor: "#FFFFFF", borderRadius: 12, borderWidth: 1, borderColor: "#DCDCDC" }}>
        <ScrollView keyboardShouldPersistTaps="always">{mentions.map(person => <Pressable key={person.id} accessibilityLabel={`Mencionar a ${person.username}`} onPress={() => { const next = insertCommentText(text, `@${person.username} `, mention); if (next) { setText(next.text); selection.current = { start: next.cursor, end: next.cursor }; setCursor(next.cursor); setMentions([]); input.current?.focus(); } }} style={{ padding: 10, flexDirection: "row", alignItems: "center", gap: 8 }}><Avatar uri={person.avatar_url} username={person.username} /><Text style={{ fontSize: 14 }}>@{person.username}</Text></Pressable>)}</ScrollView>
      </View>}
      {emojiPickerHeight > 0 && <CommentEmojiPicker recent={emojis.recent} height={emojiPickerHeight} safeBottom={viewport.insets.bottom} onSelect={insertQuickEmoji} onClose={() => { Keyboard.dismiss(); setEmojiPickerHeight(0); requestAnimationFrame(() => input.current?.focus()); }} />}
      {actionComment && <CommentActionsPopover key={actionComment.id} actions={actions} onClose={dismissActions} safeBottom={viewport.insets.bottom} safeLeft={viewport.insets.left} safeRight={viewport.insets.right} maxHeight={Math.max(0, viewport.fullHeight - Math.max(0, viewport.insets.top - viewport.viewportTop) - 12)} />}
      {deleteTarget && <View accessibilityViewIsModal style={[StyleSheet.absoluteFill, { zIndex: 20, alignItems: "center", justifyContent: "center", padding: 24 }]}>
        <Pressable accessibilityLabel="Cerrar confirmación de eliminación" onPress={() => setDeleteTarget(null)} style={[StyleSheet.absoluteFill, { backgroundColor: "#00000066" }]} />
        <View style={{ width: "100%", maxWidth: 320, borderRadius: 24, backgroundColor: "#FFFFFF", padding: 24, gap: 16 }}>
          <Text style={{ fontSize: 17, fontWeight: "500", color: "#131313" }}>¿Eliminar para todos?</Text>
          <Text style={{ fontSize: 14, lineHeight: 20, color: "#555" }}>{deleteTarget.parent_id ? "Se eliminará tu respuesta para todos. Las otras respuestas se conservan." : "Se eliminarán tu comentario y todas sus respuestas para todos."}</Text>
          <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 16 }}>
            <Pressable accessibilityLabel="Conservar comentario" onPress={() => setDeleteTarget(null)} style={{ minHeight: 44, justifyContent: "center" }}><Text style={{ fontSize: 14, color: "#555" }}>Cancelar</Text></Pressable>
            <Pressable accessibilityLabel="Confirmar eliminar para todos" disabled={busy} onPress={() => { const target = deleteTarget; setDeleteTarget(null); performDelete(target, true); }} style={{ minHeight: 44, justifyContent: "center" }}><Text style={{ fontSize: 14, color: "#D21D59" }}>Eliminar</Text></Pressable>
          </View>
        </View>
      </View>}
    </View>
  ;
}

const styles = StyleSheet.create({
  viewport: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.28)" },
  videoPreview: { position: "absolute", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.40)", overflow: "hidden" },
  expandVideo: { position: "absolute", top: 3.5, right: 3, width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  sheet: { width: "100%", overflow: "hidden", borderColor: "rgba(200,225,248,0.50)", borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  openSheetGlass: { backgroundColor: "transparent", borderColor: "rgba(200,225,248,0.50)" },
  panelBody: { flex: 1, backgroundColor: "transparent" },
  openPanelBody: { backgroundColor: "transparent" },
  glassTint: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(70,130,180,0.38)", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.35)" },
  headerGlass: { height: 56, overflow: "hidden", backgroundColor: "#FFFFFF" },
  navigationGlass: { backgroundColor: "rgba(70,130,180,0.38)", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(200,225,248,0.50)" },
  handle: { width: 32, height: 4, borderRadius: 2, position: "absolute", top: 6.5, alignSelf: "center", backgroundColor: "#1C1C1E", zIndex: 1 },
  header: { height: 56, width: "100%" },
  countBadge: { position: "absolute", top: 14, minWidth: 125, height: 32, maxWidth: 280, borderRadius: 16, paddingHorizontal: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#F0EFEC", borderWidth: 1, borderColor: "#DCDCDC" },
  title: { color: "#131313", fontSize: 14, fontWeight: "500" },
  close: { position: "absolute", top: 10, width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  hiddenNotice: { alignSelf: "stretch", paddingLeft: 11.5, paddingTop: 12, backgroundColor: "#FFFFFF" },
  showBadge: { width: 95, height: 36, borderRadius: 10, backgroundColor: "#F0EFEC", borderWidth: 1, borderColor: "#DCDCDC", overflow: "hidden", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  showLabel: { fontFamily: "Inter_500Medium", color: "#131313", fontSize: 13, fontWeight: "normal" },
  deletedText: { color: palette.secondary, fontStyle: "italic" },
  likeButton: { alignItems: "center", gap: 4, minHeight: 36 },
  commentHeader: { flexDirection: "row", alignItems: "center", gap: 4 },
  usernameHeading: { flex: 1 },
  optionsButton: { width: 24, height: 24, alignItems: "center", justifyContent: "center" },
  list: { flex: 1, backgroundColor: "#FFFFFF" }, hiddenList: { display: "none" }, listContent: { paddingHorizontal: 12, paddingBottom: 12 }, emptyContainer: { flexGrow: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", gap: 16 }, emptyText: { fontFamily: "Inter_400Regular", color: "#5B6270", fontSize: 15 },
  comment: { flexDirection: "row", gap: 12, paddingVertical: 7, paddingHorizontal: 4, borderWidth: 1, borderColor: "transparent", borderRadius: 12 }, selectedComment: { backgroundColor: "rgba(0,242,254,0.055)", borderColor: "rgba(0,242,254,0.25)" }, nested: { marginLeft: 44 },
  avatar: { width: 32, height: 32, borderRadius: 16 }, composerAvatar: { width: 28, height: 28, borderRadius: 14 }, initialAvatar: { backgroundColor: palette.button, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: palette.magenta }, initial: { fontFamily: "Inter_500Medium", color: palette.onButton, fontSize: 14, fontWeight: "normal" },
  body: { flex: 1, minWidth: 0, gap: 4 }, username: { fontFamily: "Inter_500Medium", color: palette.secondary, fontSize: 13, fontWeight: "normal" }, commentText: { fontFamily: "Inter_400Regular", color: palette.text, fontSize: 15, lineHeight: 20 }, replyTo: { fontFamily: "Inter_400Regular", color: palette.teal, fontSize: 11 },
  metaRow: { flexDirection: "row", gap: 18, marginTop: 4 }, meta: { fontFamily: "Inter_400Regular", color: palette.secondary, fontSize: 11 }, like: { alignItems: "center", justifyContent: "flex-start", gap: 4, minWidth: 36, paddingVertical: 4 },
  threadAction: { marginLeft: 42, paddingVertical: 12 }, link: { fontFamily: "Inter_400Regular", color: palette.teal, fontSize: 12 }, more: { padding: 16, alignItems: "center" },
  errorRow: { backgroundColor: "#FFFFFF", paddingHorizontal: 16, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 8 }, error: { fontFamily: "Inter_400Regular", color: palette.destructive, fontSize: 12, flex: 1 }, retry: { padding: 8 },
  composer: { overflow: "visible", width: "100%", paddingHorizontal: 0, paddingBottom: 0 },
  composerClosed: { backgroundColor: "transparent", justifyContent: "flex-start" },
  composerKeyboard: { backgroundColor: "transparent", paddingTop: 0 },
  composerScroll: { flex: 1 }, openForm: { paddingBottom: 3.5 }, closedForm: { paddingTop: 12.5 },
  editIndicator: { position: "absolute", right: 16, top: -30, zIndex: 3, paddingVertical: 5 },
  keyboardCancel: { right: 50, top: -30, maxWidth: 175 },
  composerLabel: { fontFamily: "Inter_400Regular", color: "#131313", fontSize: 12 },
  editor: { flexDirection: "row", alignItems: "center", height: 38, gap: 8, overflow: "hidden", borderWidth: 1, borderColor: "#DCDCDC" },
  editorClosed: { marginLeft: 8, paddingLeft: 8, paddingRight: 2.5, gap: 6.5, backgroundColor: "rgba(255,255,255,0.20)", borderRadius: 20 },
  editorKeyboard: { marginTop: 3, marginHorizontal: 10, paddingHorizontal: 0, gap: 6, borderWidth: 0, backgroundColor: "transparent" },
  editorBody: { flex: 1, minWidth: 0, height: 36, borderColor: "#DCDCDC" },
  editorBodyKeyboard: { height: 36, borderRadius: 13, borderWidth: 1, borderColor: "rgba(255,255,255,0.45)", backgroundColor: "rgba(255,255,255,0.20)", justifyContent: "center" },
  input: { flex: 1, color: "#131313", fontSize: 15, paddingHorizontal: 4, paddingVertical: 0, height: 38, includeFontPadding: false },
  collapsedInput: { fontFamily: "Inter_400Regular", fontSize: 15, paddingHorizontal: 4 },
  expandedInput: { fontFamily: "Inter_400Regular", fontSize: 14, paddingLeft: 10, paddingRight: 52, height: 36 },
  counter: { fontFamily: "Inter_400Regular", position: "absolute", right: 10, top: 0, height: 34, textAlignVertical: "center", includeFontPadding: false, color: "rgba(255,255,255,0.65)", fontSize: 11 },
  sendCollapsed: { position: "absolute", right: 2.5, top: 0, width: 29, height: 36, alignItems: "center", justifyContent: "center" },
  emojiRow: { marginLeft: 44, flexDirection: "row", alignItems: "center", width: 300, overflow: "visible" },
  emojiItem: { width: 18, height: 20, alignItems: "center", justifyContent: "center" }, emojiText: { fontSize: 18, lineHeight: 20, color: "#FFFFFF", includeFontPadding: false },
  toolsRow: { paddingLeft: 44, paddingRight: 10, flexDirection: "row", alignItems: "center" },
  tool: { width: 20, height: 24, marginRight: 20, alignItems: "center", justifyContent: "center" },
  atIcon: { fontFamily: "Inter_500Medium", color: "#FFFFFF", fontSize: 20, fontWeight: "normal" },
  toolSpacer: { flex: 1 },
  sendKeyboard: { width: 44, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});

function scaledCommentStyles(scale: number) {
  const result = { ...styles };
  const keys = ["sheet", "glassTint", "headerGlass", "header", "handle", "header", "countBadge", "title", "close", "hiddenNotice", "showBadge", "showLabel", "composer", "editor", "editorBody", "counter", "sendCollapsed", "emojiRow", "emojiItem", "emojiText", "toolsRow", "tool", "sendKeyboard", "composerLabel", "editIndicator", "keyboardCancel"] as const;
  for (const key of keys) {
    const original = styles[key] as Record<string, unknown>;
    (result as Record<string, unknown>)[key] = Object.fromEntries(Object.entries(original).map(([name, value]) => [name,
      typeof value === "number" && !["flex", "zIndex", "opacity", "flexGrow", "flexShrink", "fontSize"].includes(name) ? value * scale : value]));
  }
  return result;
}
