import { useRegistration } from "../../context/RegistrationContext";
import type { RegistrationKind } from "../../lib/features/auth/services/registrationBridge";
import { requestRegistration } from "../../lib/features/auth/services/registrationBridge";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from "react-native";
import { supabase } from "../../lib/supabase";
import CommentsSheet from "../../components/CommentsSheet";
import Toast from "../../components/Toast";
import VideoCard from "../../components/VideoCard";
import { useAuth } from "../../context/AuthContext";
import { useFollow } from "../../context/FollowContext";
import { VideoItem, useVideoFeed } from "../../hooks/useVideoFeed";
import { useSavedVideos } from "../../hooks/useSavedVideos";
import { useFeedCommentCounts } from "../../hooks/useFeedCommentCounts";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function FeedScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [commentVideo, setCommentVideo] = useState<VideoItem | null>(null);
  const [shareOverrides, setShareOverrides] = useState<Record<string, number>>({});
  const [toastMsg, setToastMsg] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [toastKey, setToastKey] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const { user } = useAuth();
  const registration = useRegistration();
  const [applied, setApplied] = useState<Record<string, Set<string>>>({});
  const [restored, setRestored] = useState<{ id: string; position: number; paused: boolean; requestId?: string } | null>(null);
  const [commentCue, setCommentCue] = useState<string | null>(null);
  useEffect(() => { setApplied({}); }, [user?.id]);
  const { followedIds, toggleFollow } = useFollow();
  const {
    videos,
    likedIds,
    toggleLike,
    removeVideo,
    loadMore,
    refreshFeed,
    hasMore,
    isRefreshing,
    error,
    isGuest,
  } = useVideoFeed(followedIds);
  const { savedIds, toggleSave } = useSavedVideos();
  const { counts: commentCounts, error: commentCountsError } = useFeedCommentCounts(videos.map(video => video.id));


  useEffect(() => {
    const intent = registration.completed;
    if (!intent?.videoId) return;
    const index = videos.findIndex(video => video.id === intent.videoId);
    if (index < 0) return;
    setActiveIndex(index); flatListRef.current?.scrollToIndex({ index, animated: false });
    setRestored({ id: intent.videoId, position: intent.position ?? 0, paused: !!intent.wasPaused, requestId: intent.requestId });
    if (["like", "follow", "favorite"].includes(intent.kind)) setApplied(prev => ({ ...prev, [intent.kind]: new Set([...(prev[intent.kind] ?? []), intent.kind === "follow" ? intent.creatorId! : intent.videoId!]) }));
    if (intent.kind === "comment") setCommentCue(intent.videoId);
    registration.acknowledge();
  }, [registration.completed, videos, registration.acknowledge]);
  useEffect(() => { if (!commentCue) return; const timer = setTimeout(() => setCommentCue(null), 2500); return () => clearTimeout(timer); }, [commentCue]);
  const clearApplied = (kind: string, id: string) => setApplied(prev => { const next = new Set(prev[kind]); next.delete(id); return { ...prev, [kind]: next }; });
  const registerFor = useCallback((kind: RegistrationKind, item: VideoItem) => requestRegistration({ kind, videoId: item.id, creatorId: item.creatorId, isDemo: !item.isReal }), []);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setToastKey((k) => k + 1);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2500);
  }, []);

  const handleDelete = useCallback(
    (item: VideoItem) => {
      Alert.alert(
        "Eliminar video",
        "¿Querés eliminar este video? Esta acción no se puede deshacer.",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Eliminar",
            style: "destructive",
            onPress: async () => {
              // 1. Delete from DB FIRST and verify it actually happened.
              //    Supabase does not throw when RLS blocks the delete — it
              //    returns an empty result, so we must inspect the response.
              const { data, error } = await supabase
                .from("videos")
                .delete()
                .eq("id", item.id)
                .select("id");

              if (error || !data || data.length === 0) {
                showToast("No se pudo eliminar el video");
                return;
              }

              // 2. Confirmed deleted — remove from feed now.
              removeVideo(item.id);

              // 3. Best-effort storage cleanup (row is already gone; an
              //    orphaned file is harmless if this fails).
              try {
                const parts = item.uri.split("/storage/v1/object/public/videos/");
                if (parts.length === 2 && parts[1]) {
                  await supabase.storage.from("videos").remove([parts[1]]);
                }
              } catch {
                // ignore storage errors
              }

              showToast("Video eliminado");
            },
          },
        ]
      );
    },
    [removeVideo, showToast]
  );

  const handleShare = useCallback(async (item: VideoItem) => {
    if (!user) {
      requestRegistration();
      return;
    }
    // Optimistic UI update
    setShareOverrides((prev) => ({
      ...prev,
      [item.id]: (prev[item.id] ?? 0) + 1,
    }));

    try {
      await Share.share({
        title: item.caption,
        message: `${item.caption}

${item.uri}`,
        url: item.uri,
      });
    } catch {
      // Share cancelled or failed — revert optimistic update.
      setShareOverrides((prev) => ({
        ...prev,
        [item.id]: Math.max(0, (prev[item.id] ?? 1) - 1),
      }));
      return;
    }

    // Persist the share through the protected RPC. Mock videos that are
    // not persisted in Supabase are reverted without affecting the DB.
    const { error } = await supabase.rpc("increment_video_share_count", {
      p_video_id: item.id,
    });

    if (error) {
      setShareOverrides((prev) => ({
        ...prev,
        [item.id]: Math.max(0, (prev[item.id] ?? 1) - 1),
      }));
    }
  }, [user]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) {
        setActiveIndex(viewableItems[0].index ?? 0);
      }
    },
    []
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 80 }).current;

  const renderItem = useCallback(
    ({ item, index }: { item: VideoItem; index: number }) => {
      const extraShares = shareOverrides[item.id] ?? 0;
      const videoWithShares = extraShares > 0
        ? { ...item, shares: item.shares + extraShares }
        : item;
      const isOwner = !!user && user.id === item.creatorId;
      return (
        <VideoCard
          video={{ ...videoWithShares, isFollowing: videoWithShares.isFollowing || !!applied.follow?.has(item.creatorId) }}
          commentCount={commentCounts[item.id] ?? null}
          suspended={registration.visible}
          commentCue={commentCue === item.id}
          onPosition={(position, paused) => registration.setFeedContext(item.id, position, paused)}
          registerPlayback={read => registration.registerPlayback(item.id, read)}
          restorePosition={restored?.id === item.id ? restored.position : undefined}
          restorePaused={restored?.id === item.id ? restored.paused : undefined}
          restoreRequest={restored?.id === item.id ? restored.requestId : undefined}
          isActive={index === activeIndex}
          isLiked={likedIds.has(item.id) || !!applied.like?.has(item.id)}
          isSaved={savedIds.has(item.id) || !!applied.favorite?.has(item.id)}
          isOwner={isOwner}
          onLike={() => !user ? registerFor("like", item) : (clearApplied("like", item.id), toggleLike(item.id))}
          onDoubleLike={() => !user ? registerFor("like", item) : !likedIds.has(item.id) && toggleLike(item.id)}
          onFollow={() => !user ? registerFor("follow", item) : (clearApplied("follow", item.creatorId), toggleFollow(item.creatorId))}
          onComment={() => {
            if (!user) {
              registerFor("comment", item);
              return;
            }
            setCommentVideo(item);
          }}
          onShare={() => handleShare(item)}
          onSave={() => !user ? registerFor("favorite", item) : (clearApplied("favorite", item.id), toggleSave(item.id))}
          onDelete={() => handleDelete(item)}
          isGuest={isGuest}
          onAvatarPress={() => {
            if (!user) {
              requestRegistration();
              return;
            }
            router.push(`/user-profile?userId=${item.creatorId}`);
          }}
        />
      );
    },
    [activeIndex, likedIds, savedIds, shareOverrides, commentCounts, user, toggleLike, toggleFollow, toggleSave, handleShare, handleDelete, registration.visible, registration.setFeedContext, registerFor, applied, restored, commentCue]
  );

  return (
    <View style={styles.container}>
      <View style={styles.feedHeader} pointerEvents="box-none">
        <View style={styles.feedModes}>
          <TouchableOpacity
            onPress={isGuest ? () => requestRegistration() : undefined}
            activeOpacity={isGuest ? 0.7 : 1}
            accessibilityRole="button"
            accessibilityLabel="Para ti"
          >
            <Text style={styles.feedModeActive}>Para ti</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={isGuest ? () => requestRegistration() : undefined}
            activeOpacity={isGuest ? 0.7 : 1}
            accessibilityRole="button"
            accessibilityLabel="Siguiendo"
          >
            <Text style={styles.feedModeInactive}>Siguiendo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={isGuest ? () => requestRegistration() : undefined}
            activeOpacity={isGuest ? 0.7 : 1}
            accessibilityRole="button"
            accessibilityLabel="Buscar"
            style={styles.searchButton}
          >
            <Feather name="search" size={19} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
          ref={flatListRef}
          data={videos}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={SCREEN_HEIGHT}
          snapToAlignment="start"
          decelerationRate="fast"
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          scrollEnabled={videos.length > 0}
          getItemLayout={(_, index) => ({
            length: SCREEN_HEIGHT,
            offset: SCREEN_HEIGHT * index,
            index,
          })}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refreshFeed}
              tintColor="#FE0979"
              title="Actualizando"
              titleColor="#FE0979"
            />
          }
          onEndReached={() => {
            if (hasMore) loadMore();
          }}
          onEndReachedThreshold={0.75}
          ListFooterComponent={
            hasMore ? (
              <View style={styles.footer}>
                <ActivityIndicator size="small" color="#FE0979" />
              </View>
            ) : null
          }
          removeClippedSubviews
          maxToRenderPerBatch={3}
          windowSize={3}
        />


      <CommentsSheet
        visible={!!commentVideo}
        onClose={() => setCommentVideo(null)}
        videoId={commentVideo?.id ?? ""}
      />
      {error || commentCountsError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error || commentCountsError}</Text>
        </View>
      ) : null}

      <Toast key={toastKey} visible={toastVisible} message={toastMsg} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  feedHeader: {
    position: "absolute",
    top: 52,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  feedModes: {
    flexDirection: "row",
    alignItems: "center",
    gap: 22,
  },
  feedModeActive: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    textShadowColor: "rgba(0,0,0,0.65)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  feedModeInactive: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 15,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.65)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  searchButton: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 2,
  },
  errorBanner: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 90,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(30,30,36,0.96)",
    zIndex: 30,
  },
  errorText: { color: "#fff", fontSize: 13, textAlign: "center" },
  footer: { paddingVertical: 16, alignItems: "center" },
});
