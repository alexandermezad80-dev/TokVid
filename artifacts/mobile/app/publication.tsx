import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import VideoCard from "../components/VideoCard";
import CommentsSheet from "../components/CommentsSheet";
import { useAuth } from "../context/AuthContext";
import { useFollow } from "../context/FollowContext";
import { useSavedVideos } from "../hooks/useSavedVideos";
import { useFeedVideoLikes } from "../hooks/useFeedVideoLikes";
import { useFeedCommentCounts } from "../hooks/useFeedCommentCounts";
import { VideoItem, mapRowsToVideoItems } from "../hooks/useVideoFeed";
import { supabase } from "../lib/supabase";
import { VideoPreviewFrame } from "../lib/commentVideoLayout";
import { requestRegistration } from "../lib/features/auth/services/registrationBridge";
export default function PublicationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [focused, setFocused] = useState(false);
  useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false); }, []));
  const insets = useSafeAreaInsets();
  const [item, setItem] = useState<VideoItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [comments, setComments] = useState(false);
  const [preview, setPreview] = useState<VideoPreviewFrame | null>(null);
  const { followedIds, toggleFollow, loadingIds } = useFollow();
  const { savedIds, toggleSave } = useSavedVideos();
  const likes = useFeedVideoLikes(item ? [item.id] : []);
  const counts = useFeedCommentCounts(item ? [item.id] : []);
  const closeComments = useCallback(() => { setComments(false); setPreview(null); }, []);
  useEffect(() => {
    let active = true; setItem(null); setLoading(true); setError(""); closeComments();
    void (async () => {
      try {
        const { data, error: failure } = await supabase.from("videos").select("*").eq("id", id).maybeSingle();
        if (failure) throw failure;
        if (!data) { if (active) setError("Esta publicación ya no está disponible."); return; }
        const [video] = await mapRowsToVideoItems([data]); if (active) setItem(video);
      } catch { if (active) setError("No pudimos cargar la publicación."); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [id, retry, closeComments]);
  const signedAction = (fn: () => void) => user ? fn() : requestRegistration();
  const remove = () => {
    if (!item || item.creatorId !== user?.id) return;
    Alert.alert("Eliminar publicación", "Se eliminará esta publicación de tu perfil y del feed.", [{ text: "Cancelar", style: "cancel" }, { text: "Eliminar", style: "destructive", onPress: () => { void (async () => {
      const { data, error: failure } = await supabase.from("videos").delete().eq("id", item.id).eq("user_id", user.id).select("id");
      if (failure || !data?.some(row => row.id === item.id)) { setError("No se pudo confirmar la eliminación."); return; }
      router.back();
    })(); } }]);
  };
  return <View style={styles.screen}>
    {loading ? <ActivityIndicator color="#9DDFE5" style={styles.center} /> : item ? <VideoCard video={{ ...item, isFollowing: followedIds.has(item.creatorId) }} isActive={focused} isGuest={!user} isOwner={item.creatorId === user?.id} isLiked={likes.likedIds.has(item.id)} isSaved={savedIds.has(item.id)} likeCount={likes.counts[item.id] ?? null} commentCount={counts.counts[item.id] ?? null} followPending={loadingIds.has(item.creatorId)} previewFrame={preview}
      onLike={() => signedAction(() => void likes.toggleLike(item.id))} onDoubleLike={() => signedAction(() => { if (!likes.likedIds.has(item.id)) void likes.toggleLike(item.id); })}
      onFollow={() => signedAction(() => void toggleFollow(item.creatorId))} onSave={() => signedAction(() => void toggleSave(item.id))} onComment={() => signedAction(() => setComments(true))} onDelete={remove}
      onAvatarPress={() => router.push(item.creatorId === user?.id ? "/(tabs)/profile" : { pathname: "/user-profile", params: { userId: item.creatorId } })}
      onShare={() => { void Share.share({ message: `${item.caption}\n${item.uri}` }).catch(() => setError("No se pudo compartir la publicación.")); }} /> : <View style={styles.center}><Text style={styles.message}>{error}</Text><Pressable onPress={() => setRetry(value => value + 1)} style={styles.retry}><Text style={styles.message}>Reintentar</Text></Pressable></View>}
    {!comments && <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Volver" style={[styles.back, { top: insets.top + 8 }]}><Feather name="arrow-left" color="#fff" size={24} /></Pressable>}
    {!!item && !!(error || likes.error || counts.error) && <Text accessibilityRole="alert" style={[styles.error, { top: insets.top + 62 }]}>{error || likes.error || counts.error}</Text>}
    <CommentsSheet visible={comments} onClose={closeComments} videoId={item?.id ?? ""} showVideoPreview onPreviewFrame={setPreview} />
  </View>;
}
const styles = StyleSheet.create({ screen:{flex:1,backgroundColor:"#000"},center:{flex:1,alignItems:"center",justifyContent:"center",padding:24},message:{color:"#D2DBE1",fontSize:15,textAlign:"center"},retry:{padding:16},back:{position:"absolute",left:12,width:44,height:44,alignItems:"center",justifyContent:"center",backgroundColor:"#0C0F1788",borderRadius:22},error:{position:"absolute",left:16,right:16,color:"#F7A9BB",backgroundColor:"#17151DEE",padding:12,borderRadius:10} });
