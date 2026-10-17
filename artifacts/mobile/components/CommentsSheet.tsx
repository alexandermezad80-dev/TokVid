import {palette} from '../constants/palette';
import { Feather, Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { KeyboardProvider } from "react-native-keyboard-controller";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, Keyboard, Modal, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from "react-native-reanimated";
import CommentActionsPopover, { CommentAction } from "./CommentActionsPopover";
import { CommentAnchor, commentPopoverGeometry } from "../lib/commentPopoverGeometry";
import { useRegistration } from "../context/RegistrationContext";
import { useAuth } from "../context/AuthContext";
import { useFeedComments } from "../hooks/useFeedComments";
import { useOverlayKeyboard } from "../hooks/useOverlayKeyboard";
import { requestRegistration } from "../lib/features/auth/services/registrationBridge";
import { COMMENT_LIMIT, FeedComment, commentCapabilities, commentLength, commentTime } from "../lib/features/comments/model";
import { commentVideoLayout, VideoPreviewFrame } from "../lib/commentVideoLayout";
import { commentsGlassGeometry } from "../lib/commentsGlassGeometry";

interface Props {
  visible: boolean; onClose: () => void; videoId: string;
  focusCommentId?:string;
  /** Legacy callers may pass this label; the panel always reads the real server total. */
  commentCount?: string;
  overTabBar?: boolean;
  showVideoPreview?: boolean;
  onPreviewFrame?: (frame: VideoPreviewFrame | null) => void;
}
type ListRow = { kind: "comment"; comment: FeedComment; nested: boolean } | { kind: "thread"; root: FeedComment } | { kind: "more"; rootId: string };
const spring = { damping: 15, stiffness: 90, mass: 0.8 };

function Avatar({ uri, username, small = false }: { uri?: string | null; username?: string | null; small?: boolean }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  return uri && !failed ? <Image source={{ uri }} onError={() => setFailed(true)} style={[styles.avatar, small && styles.composerAvatar]} /> :
    <View style={[styles.avatar, small && styles.composerAvatar, styles.initialAvatar]}>{username ? <Text style={styles.initial}>{Array.from(username)[0]?.toUpperCase()}</Text> : <Feather name="user" size={18} color="#aaa" />}</View>;
}

export default function CommentsSheet(props: Props) {
  const back = useRef(props.onClose);
  return <Modal visible={props.visible} transparent statusBarTranslucent navigationBarTranslucent animationType="slide" onRequestClose={() => back.current()}>
    <KeyboardProvider statusBarTranslucent navigationBarTranslucent preload={false}>
      <CommentsPanel {...props} backHandler={back} />
    </KeyboardProvider>
  </Modal>;
}

function CommentsPanel({ visible, onClose, videoId, focusCommentId, overTabBar = false, showVideoPreview = false, onPreviewFrame, backHandler }: Props & { backHandler: React.MutableRefObject<() => void> }) {
  const { user, profile } = useAuth();
  const { tabBarHeight } = useRegistration();
  const { width, fontScale } = useWindowDimensions();
  const viewport = useOverlayKeyboard(visible);
  const comments = useFeedComments(visible, videoId,undefined,focusCommentId);
  const listRef=useRef<FlatList<ListRow>>(null),focusScrolled=useRef<string|null>(null);
  const [text, setText] = useState("");
  const [composerHeight,setComposerHeight]=useState(60);
  const [reply, setReply] = useState<FeedComment | null>(null);
  const [editing, setEditing] = useState<FeedComment | null>(null);
  const [actionComment, setActionComment] = useState<FeedComment | null>(null);
  const [actionAnchor, setActionAnchor] = useState<CommentAnchor | null>(null);
  const [actionMenuHeight, setActionMenuHeight] = useState(248);
  const rowViews = useRef(new Map<string, View>());
  const selectionSequence = useRef(0);
  const savedDraft = useRef<{ text: string; reply: FeedComment | null } | null>(null);
  const input = useRef<TextInput>(null);
  const phase = useSharedValue(0);
  const context = `${videoId}:${user?.id ?? "guest"}`;
  useEffect(() => { selectionSequence.current++; setText(""); setReply(null); setEditing(null); setActionComment(null); setActionAnchor(null); savedDraft.current = null; }, [context]);
  useEffect(() => { if (!visible) { selectionSequence.current++; setActionComment(null); setActionAnchor(null); } }, [visible]);
  useEffect(() => { phase.value = withTiming(viewport.keyboardVisible ? 1 : 0, {duration:220,easing:Easing.out(Easing.cubic)}); }, [viewport.keyboardVisible, phase]);
  const sheetShape = useAnimatedStyle(() => ({ borderTopLeftRadius: 24, borderTopRightRadius: 24 }));
  const editorShape = useAnimatedStyle(() => { const p = Math.max(0, Math.min(1, phase.value)); return { borderRadius: 18 - 4 * p, height: 38 }; });
  const composerShape = useAnimatedStyle(() => ({ paddingTop: 0 }));
  const dismissActions = () => { selectionSequence.current++; setActionComment(null); setActionAnchor(null); };
  const close = () => { dismissActions(); Keyboard.dismiss(); onClose(); };
  backHandler.current = () => actionComment ? dismissActions() : close();
  const openProfile = (authorId: string) => {
    if (!authorId) return;
    close();
    if (authorId === user?.id) router.push("/(tabs)/profile");
    else router.push({ pathname: "/user-profile", params: { userId: authorId } });
  };
  const rows = useMemo<ListRow[]>(() => comments.roots.flatMap(root => {
    if (comments.hiddenThreads.has(root.id)) return [];
    const result: ListRow[] = [{ kind: "comment", comment: root, nested: false }];

    if (comments.expanded.has(root.id)) {
      const thread = comments.threads[root.id];
      for (const row of thread?.rows ?? []) result.push({ kind: "comment", comment: row, nested: true });
      if (thread?.hasMore) result.push({ kind: "more", rootId: root.id });
    }
    return result;
  }), [comments.roots, comments.threads, comments.expanded, comments.hiddenThreads]);
  const focusIndex=rows.findIndex(r=>r.kind==='comment'&&r.comment.id===focusCommentId);
  useEffect(()=>{if(!visible){focusScrolled.current=null;return;}if(focusIndex<0||comments.loading||!focusCommentId||focusScrolled.current===focusCommentId)return;const timer=setTimeout(()=>{listRef.current?.scrollToIndex({index:focusIndex,viewPosition:.25,animated:true});focusScrolled.current=focusCommentId;},200);return()=>clearTimeout(timer);},[visible,focusCommentId,focusIndex,comments.loading]);
  const requireUser = () => { if (user) return true; close(); requestRegistration(); return false; };
  const busy = comments.sending || comments.mutating;
  const cancelEdit = () => {
    const draft = savedDraft.current;
    setText(draft?.text ?? ""); setReply(draft?.reply ?? null); setEditing(null); savedDraft.current = null;
  };
  const startEdit = (row: FeedComment) => {
    if (busy || row.user_id !== user?.id || row.deleted_at) return;
    if (!editing) savedDraft.current = { text, reply };
    setEditing(row); setReply(null); setText(row.text); dismissActions(); input.current?.focus();
  };
  const measureAction = (row: FeedComment, sequence: number, done?: () => void) => {
    const view = rowViews.current.get(row.id);
    view?.measureInWindow((x, y, measuredWidth, height) => {
      viewport.viewportRef.current?.measureInWindow((vx, vy) => {
        if (sequence !== selectionSequence.current || measuredWidth <= 0 || height <= 0) return;
        setActionAnchor({ x: x - vx, y: y - vy, width: measuredWidth, height });
        done?.();
      });
    });
  };
  const openActions = (row: FeedComment) => {
    if (busy || !requireUser()) return;
    const sequence = ++selectionSequence.current;
    Keyboard.dismiss();
    measureAction(row, sequence, () => setActionComment(row));
  };
  useEffect(() => {
    if (!actionComment) return;
    const sequence = selectionSequence.current;
    const frame = requestAnimationFrame(() => measureAction(actionComment, sequence));
    return () => cancelAnimationFrame(frame);
  }, [actionComment?.id, viewport.keyboardVisible, viewport.keyboardInset, width]);
  useEffect(() => {
    if (actionComment && !rows.some(row => row.kind === "comment" && row.comment.id === actionComment.id)) dismissActions();
  }, [rows]);
  const startReply = (row: FeedComment) => {
    if (busy || editing || row.deleted_at || !requireUser()) return;
    dismissActions(); setReply(row); input.current?.focus();
  };
  const confirmDelete = (row: FeedComment) => {
    dismissActions();
    const root = !row.parent_id;
    if(busy||row.user_id!==user?.id)return;
    void (async()=>{
      const confirmed=await comments.remove(row);
      if(!confirmed)return;
      if(editing&&(editing.id===row.id||(root&&editing.root_id===row.id)))cancelEdit();
      if(reply&&(reply.id===row.id||(root&&reply.root_id===row.id)))setReply(null);
    })();
  };
  const capabilities = actionComment ? commentCapabilities(actionComment, user?.id, comments.publicationOwnerId) : null;
  const actions: CommentAction[] = actionComment && capabilities ? [
    ...(capabilities.canReply ? [{ key: "reply", title: "Responder", icon: "corner-up-left" as const, disabled: busy || !!editing, onPress: () => startReply(actionComment) }] : []),
    ...(capabilities.canEdit ? [{ key: "edit", title: "Editar", icon: "edit-2" as const, disabled: busy, onPress: () => startEdit(actionComment) }] : []),
    ...(capabilities.canDelete ? [{ key: "delete", title: "Eliminar", icon: "trash-2" as const, destructive: true, disabled: busy, onPress: () => confirmDelete(actionComment) }] : []),
    { key: "hide", title: "Ocultar mensajes", icon: "eye-off", disabled: busy, onPress: () => { const selected = actionComment; dismissActions(); void comments.hideThread(selected); } },
    { key: "cancel", title: "Cancelar", icon: "x", onPress: dismissActions },
  ] : [];
  const placement = actionAnchor ? commentPopoverGeometry(actionAnchor, {
    width, availableHeight: viewport.availableHeight, safeTop: Math.max(0, viewport.insets.top - viewport.viewportTop),
    safeLeft: viewport.insets.left, safeRight: viewport.insets.right,
    menuHeight: Math.max(actionMenuHeight, actions.length * 48 * Math.max(1, fontScale) + 8),
  }) : null;
  const desiredSheetHeight=Math.max(0,viewport.fullHeight-Math.max(0,viewport.insets.top-viewport.viewportTop)-12);
  const previewLayout=commentVideoLayout({width,availableHeight:viewport.fullHeight,
    safeTop:viewport.insets.top,viewportTop:viewport.viewportTop,safeLeft:viewport.insets.left,safeRight:viewport.insets.right,
    bottomPadding:0,desiredSheetHeight,keyboardVisible:false});
  const sheetHeight = showVideoPreview ? previewLayout.sheetHeight : desiredSheetHeight;
  const preview = previewLayout.preview;
  const sheetTop = showVideoPreview ? preview.y + preview.height + 8 : viewport.fullHeight - desiredSheetHeight;
  // Keep the frame and header pinned at the same screen Y while the IME changes
  // height (including Gboard letters -> emojis). Never resize the video here.
  const { keyboardGlassHeight, composerTop, composerHeight: glassComposerHeight } =
    commentsGlassGeometry({ fullHeight: viewport.fullHeight, sheetTop,
      keyboardInset: viewport.keyboardInset, safeBottom: viewport.insets.bottom,
      keyboardVisible: viewport.keyboardVisible });
  const canSend = !!text.trim() && !busy;
  const appendToDraft = (fragment: string) => {
    if (busy) return;
    setText(previous => Array.from(previous + fragment).slice(0, COMMENT_LIMIT).join(""));
    input.current?.focus();
  };
  useEffect(() => {
    onPreviewFrame?.(visible && showVideoPreview ? { ...preview, y: preview.y + viewport.viewportTop } : null);
  }, [visible, showVideoPreview, preview.x, preview.y, preview.width, preview.height, viewport.viewportTop, onPreviewFrame]);
  useEffect(() => () => onPreviewFrame?.(null), [onPreviewFrame]);
  const send = async () => {
    if (!text.trim() || busy || !requireUser()) return;
    const sentText = text;
    const sentReply = reply;
    const confirmed = editing ? await comments.edit(editing, sentText) : await comments.publish(sentText, sentReply?.id ?? null);
    if (confirmed) { if (editing) cancelEdit(); else { setText(""); setReply(null); } input.current?.blur(); Keyboard.dismiss(); }
  };
  const renderRow = ({ item }: { item: ListRow }) => {
    if (item.kind === "thread") return <Pressable accessibilityRole="button" disabled={comments.loading} onPress={() => { void comments.toggleThread(item.root.id); }} style={styles.threadAction}>
      <Text style={styles.link}>{comments.expanded.has(item.root.id) ? "Ocultar respuestas" : `Ver respuestas (${item.root.reply_count})`}</Text>
    </Pressable>;
    if (item.kind === "more") return <Pressable accessibilityRole="button" disabled={comments.paging} onPress={() => { void comments.moreReplies(item.rootId); }} style={styles.threadAction}><Text style={styles.link}>{comments.paging ? "Cargando…" : "Ver más respuestas"}</Text></Pressable>;
    const row = item.comment;
    const liked = comments.liked.has(row.id);
    return <View ref={view => { if (view) rowViews.current.set(row.id, view); else rowViews.current.delete(row.id); }} collapsable={false} style={[styles.comment, item.nested && styles.nested, actionComment?.id === row.id && styles.selectedComment]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Ver perfil de ${row.username}`} onPress={() => openProfile(row.user_id)} hitSlop={6}><Avatar uri={row.avatar_url} username={row.username} /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Opciones del comentario de ${row.username}`} onPress={() => openActions(row)} onLongPress={() => openActions(row)} style={styles.body}>
        <View style={styles.commentHeader}><Text numberOfLines={1} ellipsizeMode="tail" style={[styles.username, styles.usernameHeading]}>@{row.username}</Text><Text style={styles.meta}>{commentTime(row.created_at)}{row.edited_at?" · editado":""}</Text><Pressable accessibilityRole="button" accessibilityLabel="Opciones del comentario" disabled={busy || comments.pendingLikes.has(row.id)} onPress={event => { event.stopPropagation(); openActions(row); }} hitSlop={10} style={styles.optionsButton}><Feather name="more-horizontal" size={18} color="#92929D" /></Pressable></View>
        {row.parent_id && !!row.reply_to_username && <Text numberOfLines={1} style={styles.replyTo}>↳ @{row.reply_to_username}</Text>}
        <Text style={[styles.commentText, !!row.deleted_at && styles.deletedText]}>{row.deleted_at ? "Comentario eliminado" : row.text}</Text>
        <View style={styles.metaRow}>{!row.deleted_at && <Pressable accessibilityRole="button" disabled={busy || !!editing} onPress={event => { event.stopPropagation(); startReply(row); }} hitSlop={8}><Text style={styles.meta}>Responder</Text></Pressable>}{!item.nested&&(row.reply_count>0||comments.expanded.has(row.id))&&<Pressable onPress={event=>{event.stopPropagation();void comments.toggleThread(row.id);}}><Text style={styles.link}>{comments.expanded.has(row.id)?"Ocultar respuestas":`Ver respuestas (${row.reply_count})`}</Text></Pressable>}</View>
      </Pressable>
      <View style={styles.like}>
      {!row.deleted_at && <Pressable accessibilityRole="button" accessibilityLabel={liked ? "Quitar Me gusta" : "Me gusta"} accessibilityState={{ selected: liked, disabled: comments.pendingLikes.has(row.id) || busy }} disabled={comments.pendingLikes.has(row.id) || busy} onPress={() => { if (requireUser()) void comments.like(row); }} style={styles.likeButton}>
        {comments.pendingLikes.has(row.id) ? <ActivityIndicator size="small" color="#FE0979" /> : <Ionicons name={liked ? "heart" : "heart-outline"} size={20} color={liked ? "#FE0979" : "#92929D"} />}
        <Text style={styles.meta}>{row.likes_count}</Text>
      </Pressable>}
      </View>
    </View>;
  };
  return <View ref={viewport.viewportRef} collapsable={false} onLayout={viewport.onLayout} style={[styles.viewport, showVideoPreview && { backgroundColor: "transparent" }, { height:viewport.fullHeight,flex:0 }]}>
      <Pressable accessibilityLabel="Cerrar comentarios" onPress={close} style={StyleSheet.absoluteFill} />
      {showVideoPreview && preview.height > 0 && <Pressable accessibilityRole="button" accessibilityLabel="Volver al video completo" onPress={close}
        style={[styles.videoPreview, { left: preview.x, top: preview.y, width: preview.width, height: preview.height }]}>
        <View style={styles.expandVideo}><Feather name="maximize-2" size={10} color="#fff" /></View>
      </Pressable>}
      <Animated.View style={[styles.sheet, sheetShape, viewport.keyboardVisible && styles.openSheetGlass, { position: "absolute", left: 0, right: 0, top: sheetTop, height: viewport.keyboardVisible ? keyboardGlassHeight : sheetHeight }]}>
        {viewport.keyboardVisible && <BlurView pointerEvents="none" intensity={90} tint="light" experimentalBlurMethod="dimezisBlurView" style={StyleSheet.absoluteFill} />}
        <View accessibilityElementsHidden={!!actionComment} importantForAccessibility={actionComment ? "no-hide-descendants" : "auto"} style={[styles.panelBody, viewport.keyboardVisible && styles.openPanelBody]}>
        <View style={styles.headerGlass}>
          <BlurView pointerEvents="none" intensity={90} tint="light" experimentalBlurMethod="dimezisBlurView" style={StyleSheet.absoluteFill} />
          <View pointerEvents="none" style={styles.glassTint} />
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={[styles.countBadge, { left: 10.5 + viewport.insets.left }]}><Text numberOfLines={1} style={styles.title}>{comments.total === null ? "Comentarios" : `${comments.total} comentarios`}</Text></View>
            <Pressable onPress={close} accessibilityLabel="Cerrar comentarios" accessibilityRole="button" style={[styles.close, { right: viewport.insets.right }]}><Feather name="x" size={11} color="#fff" /></Pressable>
          </View>
        </View>
        {!viewport.keyboardVisible && !!comments.error && <View style={styles.errorRow}><Text accessibilityRole="alert" style={styles.error}>{comments.error}</Text><Pressable accessibilityRole="button" onPress={() => { void comments.refresh(); }} style={styles.retry}><Text style={styles.link}>Recargar</Text></Pressable></View>}
        {!viewport.keyboardVisible && comments.hiddenThreads.size > 0 && <Pressable accessibilityRole="button" accessibilityLabel="Mostrar mensajes ocultos" disabled={busy} onPress={() => { void comments.restoreThreads(); }} style={styles.hiddenNotice}><LinearGradient colors={["rgba(0,242,254,0.20)", "rgba(254,9,121,0.20)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.showBadge}><Feather name="eye" size={15} color={palette.text} /><Text style={styles.showLabel}>Mostrar</Text></LinearGradient></Pressable>}
        <FlatList<ListRow> ref={listRef} onScrollToIndexFailed={info=>{listRef.current?.scrollToOffset({offset:info.averageItemLength*info.index,animated:false});setTimeout(()=>{if(focusIndex>=0)listRef.current?.scrollToIndex({index:focusIndex,viewPosition:.25,animated:true});},200);}} data={rows} keyExtractor={row => row.kind === "comment" ? row.comment.id : row.kind === "thread" ? `thread:${row.root.id}` : `more:${row.rootId}`} renderItem={renderRow} style={[styles.list, viewport.keyboardVisible && styles.hiddenList]} onScrollBeginDrag={dismissActions} contentContainerStyle={[rows.length ? styles.listContent : styles.emptyContainer, { paddingLeft: 16 + viewport.insets.left, paddingRight: 16 + viewport.insets.right,paddingBottom:composerHeight+viewport.keyboardInset+12 }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} refreshing={comments.loading} onRefresh={() => { void comments.refresh(); }}
          ListEmptyComponent={comments.loading ? <ActivityIndicator color={palette.teal} /> : comments.total === 0 || comments.hiddenThreads.size > 0 ? <View style={styles.empty}><Feather name="message-circle" size={22.5} color="#5B6270" /><Text style={styles.emptyText}>{comments.total === 0 ? "Sé el primero en comentar" : "No hay hilos visibles en esta página"}</Text></View> : null}
          ListFooterComponent={comments.hasMore ? <Pressable disabled={comments.paging} onPress={() => { void comments.loadMore(); }} style={styles.more}><Text style={styles.link}>{comments.paging ? "Cargando…" : "Cargar más comentarios"}</Text></Pressable> : null} />

        </View>

      </Animated.View>
        <Animated.View onLayout={e=>setComposerHeight(e.nativeEvent.layout.height)}
          style={[styles.composer, composerShape, viewport.keyboardVisible ? styles.composerKeyboard : styles.composerClosed,
            { position: "absolute", left: 0, right: 0,
              top: composerTop,
              height: glassComposerHeight,
              paddingLeft: viewport.keyboardVisible ? 0 : viewport.insets.left,
              paddingRight: viewport.keyboardVisible ? 0 : viewport.insets.right }]}>
          {!viewport.keyboardVisible && <BlurView pointerEvents="none" intensity={90} tint="light" experimentalBlurMethod="dimezisBlurView" style={StyleSheet.absoluteFill} />}
          {!viewport.keyboardVisible && <View pointerEvents="none" style={styles.glassTint} />}
          {!viewport.keyboardVisible && editing && <Pressable accessibilityRole="button" accessibilityLabel="Cancelar edición" disabled={busy} onPress={cancelEdit} style={styles.editIndicator}><Text style={styles.composerLabel}>Editando comentario · Cancelar</Text></Pressable>}
          {!viewport.keyboardVisible && reply && <Pressable accessibilityRole="button" accessibilityLabel="Cancelar respuesta" disabled={busy} onPress={() => setReply(null)} hitSlop={8} style={styles.replyIndicator}><View style={styles.replyBubble}><Text style={styles.composerLabel}>Respondiendo</Text></View></Pressable>}
          {viewport.keyboardVisible && (editing || reply ? <View style={styles.emojiRow}>
            <Pressable accessibilityRole="button" accessibilityLabel={editing ? "Cancelar edición" : "Cancelar respuesta"} disabled={busy}
              onPress={editing ? cancelEdit : () => setReply(null)} style={styles.keyboardContext}>
              <Text style={styles.composerLabel}>{editing ? "Editando comentario · Cancelar" : "Respondiendo · Cancelar"}</Text>
            </Pressable>
          </View> : <View style={styles.emojiRow}>
            {["❤️", "😂", "😍", "😮", "😢", "👍", "🔥"].map(emoji => <Pressable key={emoji} accessibilityRole="button" accessibilityLabel={`Insertar ${emoji} en comentario`} disabled={busy} onPress={() => appendToDraft(emoji)} style={styles.emojiItem}><Text style={styles.emojiText}>{emoji}</Text></Pressable>)}
          </View>)}
          <Animated.View style={[styles.editor, editorShape, viewport.keyboardVisible ? styles.editorKeyboard : styles.editorClosed]}>
            <Avatar uri={profile?.avatar_url} username={profile?.username} small />
            <View style={[styles.editorBody, viewport.keyboardVisible && styles.editorBodyKeyboard]}>
              <TextInput ref={input} value={text} editable={!busy}
                onChangeText={value => setText(Array.from(value).slice(0, COMMENT_LIMIT).join(""))}
                style={[styles.input, viewport.keyboardVisible ? styles.expandedInput : styles.collapsedInput]}
                placeholder="Agregar un comentario..." placeholderTextColor="rgba(255,255,255,0.80)"
                selectionColor="#BFE3FF" accessibilityLabel="Escribe tu comentario"
                multiline scrollEnabled maxLength={COMMENT_LIMIT * 2} textAlignVertical="center" />
              {viewport.keyboardVisible && <Text style={styles.counter}>{commentLength(text)}/{COMMENT_LIMIT}</Text>}
            </View>
            {!viewport.keyboardVisible && <Pressable accessibilityRole="button" accessibilityLabel={editing ? "Guardar cambios" : "Publicar comentario"} disabled={!canSend} onPress={() => { void send(); }} style={styles.sendCollapsed}>
              {busy ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Feather name="arrow-up" size={13} color={canSend ? "#FFFFFF" : "rgba(255,255,255,0.60)"} />}
            </Pressable>}
          </Animated.View>
          {viewport.keyboardVisible && <View style={styles.toolsRow}>
            <Pressable accessibilityRole="button" accessibilityLabel="Imagen: adjuntos a comentarios pendientes" accessibilityState={{disabled:true}} disabled style={styles.tool}><Feather name="image" size={20} color="rgba(255,255,255,0.60)" /></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Sticker: adjuntos a comentarios pendientes" accessibilityState={{disabled:true}} disabled style={styles.tool}><Feather name="smile" size={20} color="rgba(255,255,255,0.60)" /></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Insertar arroba" disabled={busy} onPress={() => appendToDraft("@")} style={styles.tool}><Text style={styles.atIcon}>@</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Micrófono: audio en comentarios pendiente" accessibilityState={{disabled:true}} disabled style={styles.tool}><Feather name="mic" size={20} color="rgba(255,255,255,0.60)" /></Pressable>
            <View style={styles.toolSpacer} />
            <Pressable accessibilityRole="button" accessibilityLabel={editing ? "Guardar cambios" : "Publicar comentario"} disabled={!canSend} onPress={() => { void send(); }} style={[styles.sendKeyboard, { backgroundColor: canSend ? "#4682B4" : "rgba(70,130,180,0.60)" }]}>
              {busy ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Feather name="arrow-up" size={20} color="#FFFFFF" />}
            </Pressable>
          </View>}
        </Animated.View>
      {actionComment && placement && <CommentActionsPopover key={actionComment.id} placement={placement} actions={actions} onClose={dismissActions} onContentHeight={setActionMenuHeight} />}
    </View>
  ;
}

const styles = StyleSheet.create({
  viewport: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.28)" },
  videoPreview: { position: "absolute", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.40)", overflow: "hidden" },
  expandVideo: { position: "absolute", top: 3.5, right: 3, width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  sheet: { width: "100%", overflow: "hidden", borderTopWidth: 1, borderColor: "rgba(200,225,248,0.50)", borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  openSheetGlass: { backgroundColor: "rgba(70,130,180,0.38)", borderColor: "rgba(200,225,248,0.50)" },
  panelBody: { flex: 1, backgroundColor: "#FFFFFF" },
  openPanelBody: { backgroundColor: "transparent" },
  glassTint: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(70,130,180,0.38)", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.35)" },
  headerGlass: { height: 48, overflow: "hidden", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(200,225,248,0.50)" },
  navigationGlass: { backgroundColor: "rgba(70,130,180,0.38)", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(200,225,248,0.50)" },
  handle: { width: 32, height: 4, borderRadius: 2, position: "absolute", top: 6.5, alignSelf: "center", backgroundColor: "rgba(255,255,255,0.65)", zIndex: 1 },
  header: { height: 48, width: "100%" },
  countBadge: { position: "absolute", top: 12.5, minWidth: 125, height: 34, maxWidth: 220, borderRadius: 17, paddingHorizontal: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.45)" },
  title: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
  close: { position: "absolute", top: 11, width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  hiddenNotice: { alignSelf: "flex-start", marginLeft: 12, marginTop: 8, marginBottom: 6 },
  showBadge: { minHeight: 44, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.10)", flexDirection: "row", alignItems: "center", gap: 8 },
  showLabel: { color: palette.text, fontSize: 13, fontWeight: "600" },
  deletedText: { color: palette.secondary, fontStyle: "italic" },
  likeButton: { alignItems: "center", gap: 4, minHeight: 36 },
  commentHeader: { flexDirection: "row", alignItems: "center", gap: 4 },
  usernameHeading: { flex: 1 },
  optionsButton: { width: 24, height: 24, alignItems: "center", justifyContent: "center" },
  list: { flex: 1 }, hiddenList: { display: "none" }, listContent: { paddingHorizontal: 12, paddingBottom: 12 }, emptyContainer: { flexGrow: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", gap: 12 }, emptyText: { color: "#5B6270", fontSize: 15 },
  comment: { flexDirection: "row", gap: 12, paddingVertical: 7, paddingHorizontal: 4, borderWidth: 1, borderColor: "transparent", borderRadius: 12 }, selectedComment: { backgroundColor: "rgba(0,242,254,0.055)", borderColor: "rgba(0,242,254,0.25)" }, nested: { marginLeft: 44 },
  avatar: { width: 32, height: 32, borderRadius: 16 }, composerAvatar: { width: 28, height: 28, borderRadius: 14 }, initialAvatar: { backgroundColor: palette.button, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: palette.magenta }, initial: { color: palette.onButton, fontSize: 14, fontWeight: "600" },
  body: { flex: 1, minWidth: 0, gap: 4 }, username: { color: palette.secondary, fontSize: 13, fontWeight: "600" }, commentText: { color: palette.text, fontSize: 15, lineHeight: 20 }, replyTo: { color: palette.teal, fontSize: 11 },
  metaRow: { flexDirection: "row", gap: 18, marginTop: 4 }, meta: { color: palette.secondary, fontSize: 11 }, like: { alignItems: "center", justifyContent: "flex-start", gap: 4, minWidth: 36, paddingVertical: 4 },
  threadAction: { marginLeft: 42, paddingVertical: 12 }, link: { color: palette.teal, fontSize: 12 }, more: { padding: 16, alignItems: "center" },
  errorRow: { paddingHorizontal: 16, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 8 }, error: { color: palette.destructive, fontSize: 12, flex: 1 }, retry: { padding: 8 },
  composer: { overflow: "visible", width: "100%", paddingHorizontal: 0, paddingBottom: 0 },
  composerClosed: { backgroundColor: "rgba(70,130,180,0.38)", borderTopWidth: 1, borderTopColor: "rgba(200,225,248,0.50)", justifyContent: "flex-start", paddingTop: 12.5 },
  composerKeyboard: { backgroundColor: "transparent", paddingTop: 0 },
  replyIndicator: { position: "absolute", right: 16, top: -30, zIndex: 3 },
  replyBubble: { minWidth: 130, height: 28, paddingHorizontal: 12, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.45)", backgroundColor: "rgba(70,130,180,0.9)" },
  editIndicator: { position: "absolute", right: 16, top: -30, zIndex: 3, paddingVertical: 5 },
  keyboardContext: { flex: 1, height: 22, justifyContent: "center", alignItems: "flex-start", paddingHorizontal: 8 },
  composerLabel: { color: "#FFFFFF", fontSize: 12 },
  editor: { flexDirection: "row", alignItems: "center", height: 38, gap: 8, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.45)" },
  editorClosed: { marginHorizontal: 8, paddingHorizontal: 8, backgroundColor: "rgba(255,255,255,0.20)", borderRadius: 20 },
  editorKeyboard: { marginTop: 4, marginHorizontal: 10, paddingHorizontal: 0, gap: 6, borderWidth: 0, backgroundColor: "transparent" },
  editorBody: { flex: 1, minWidth: 0 },
  editorBodyKeyboard: { height: 38, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.45)", backgroundColor: "rgba(255,255,255,0.20)", justifyContent: "center" },
  input: { flex: 1, color: "#FFFFFF", fontSize: 15, paddingHorizontal: 4, paddingVertical: 0, height: 38 },
  collapsedInput: { fontSize: 15 },
  expandedInput: { fontSize: 14, paddingLeft: 10, paddingRight: 52, height: 38 },
  counter: { position: "absolute", right: 10, bottom: 4, color: "rgba(255,255,255,0.65)", fontSize: 11 },
  sendCollapsed: { width: 36, height: 38, alignItems: "center", justifyContent: "center" },
  emojiRow: { height: 22, marginTop: 2, marginHorizontal: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  emojiItem: { minWidth: 22, height: 22, alignItems: "center", justifyContent: "center" }, emojiText: { fontSize: 18, color: "#FFFFFF" },
  toolsRow: { height: 26, marginTop: 4, paddingLeft: 44, paddingRight: 10, flexDirection: "row", alignItems: "center" },
  tool: { width: 20, height: 26, marginRight: 20, alignItems: "center", justifyContent: "center" },
  atIcon: { color: "#FFFFFF", fontSize: 20, fontWeight: "600" },
  toolSpacer: { flex: 1 },
  sendKeyboard: { width: 44, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
});

