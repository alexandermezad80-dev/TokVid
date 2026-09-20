import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Platform,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CommentsSheet from "../../components/CommentsSheet";
import Toast from "../../components/Toast";
import VideoCard from "../../components/VideoCard";
import { useAuth } from "../../context/AuthContext";
import { useFollow } from "../../context/FollowContext";
import { VideoItem, formatCount, useVideoFeed } from "../../hooks/useVideoFeed";
import { useSavedVideos } from "../../hooks/useSavedVideos";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

function EmptyFollowing({ onDiscover }: { onDiscover: () => void }) {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIcon}>
        <Feather name="user-plus" size={36} color="#333" />
      </View>
      <Text style={styles.emptyTitle}>Seguí a alguien</Text>
      <Text style={styles.emptyText}>
        Cuando sigas a un creador, sus videos aparecerán acá.
      </Text>
      <TouchableOpacity style={styles.discoverBtn} onPress={onDiscover}>
        <Text style={styles.discoverBtnText}>Ir a Discover</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function FeedScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [commentVideo, setCommentVideo] = useState<VideoItem | null>(null);
  const [activeTab, setActiveTab] = useState<"following" | "foryou">("foryou");
  const [shareOverrides, setShareOverrides] = useState<Record<string, number>>({});
  const [toastMsg, setToastMsg] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [toastKey, setToastKey] = useState(0);
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const followingListRef = useRef<FlatList>(null);

  const { user } = useAuth();
  const { followedIds, toggleFollow } = useFollow();
  const {
    videos,
    followingVideos,
    likedIds,
    toggleLike,
    removeVideo,
    loadMore,
    refreshFeed,
    hasMore,
    isLoading,
    isRefreshing,
    error,
  } = useVideoFeed(followedIds);
  const { savedIds, toggleSave } = useSavedVideos();

  const currentFeed = activeTab === "foryou" ? videos : followingVideos;

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
    // Optimistic UI update
    setShareOverrides((prev) => ({
      ...prev,
      [item.id]: (prev[item.id] ?? 0) + 1,
    }));

    try {
      await Share.share({
        title: item.caption,
        message: `${item.caption}\n\n${item.uri}`,
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
  }, []);

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
          video={videoWithShares}
          isActive={index === activeIndex}
          isLiked={likedIds.has(item.id)}
          isSaved={savedIds.has(item.id)}
          isOwner={isOwner}
          onLike={() => toggleLike(item.id)}
          onDoubleLike={() => toggleLike(item.id)}
          onFollow={() => toggleFollow(item.creatorId)}
          onComment={() => setCommentVideo(item)}
          onShare={() => handleShare(item)}
          onSave={() => toggleSave(item.id)}
          onDelete={() => handleDelete(item)}
          onAvatarPress={() => router.push(`/user-profile?userId=${item.creatorId}`)}
        />
      );
    },
    [activeIndex, likedIds, savedIds, shareOverrides, user, toggleLike, toggleFollow, toggleSave, handleShare, handleDelete]
  );

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const handleTabSwitch = (tab: "following" | "foryou") => {
    setActiveTab(tab);
    setActiveIndex(0);
  };

  return (
    <View style={styles.container}>
      {isLoading && videos.length === 0 ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FE2C55" />
        </View>
      ) : null}
      {activeTab === "following" && followingVideos.length === 0 ? (
        <EmptyFollowing onDiscover={() => handleTabSwitch("foryou")} />
      ) : (
        <FlatList
          key={activeTab}
          ref={activeTab === "foryou" ? flatListRef : followingListRef}
          data={currentFeed}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={SCREEN_HEIGHT}
          snapToAlignment="start"
          decelerationRate="fast"
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          scrollEnabled={currentFeed.length > 0}
          getItemLayout={(_, index) => ({
            length: SCREEN_HEIGHT,
            offset: SCREEN_HEIGHT * index,
            index,
          })}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refreshFeed}
              tintColor="#FE2C55"
              title="Actualizando"
              titleColor="#FE2C55"
            />
          }
          onEndReached={() => {
            if (hasMore) loadMore();
          }}
          onEndReachedThreshold={0.75}
          ListFooterComponent={
            hasMore ? (
              <View style={styles.footer}>
                <ActivityIndicator size="small" color="#FE2C55" />
              </View>
            ) : null
          }
          removeClippedSubviews
          maxToRenderPerBatch={3}
          windowSize={3}
        />
      )}

      {/* Header overlay */}
      <View style={[styles.header, { paddingTop: topPad + 10 }]}>
        <TouchableOpacity onPress={() => handleTabSwitch("following")}>
          <Text style={[styles.tab, activeTab === "following" && styles.tabActive]}>
            Following
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => handleTabSwitch("foryou")}>
          <Text style={[styles.tab, activeTab === "foryou" && styles.tabActive]}>
            For You
          </Text>
        </TouchableOpacity>

        <Feather name="search" size={24} color="#fff" />
      </View>

      <CommentsSheet
        visible={!!commentVideo}
        onClose={() => setCommentVideo(null)}
        commentCount={commentVideo ? formatCount(commentVideo.comments) : "0"}
        videoId={commentVideo?.id ?? ""}
      />
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <Toast key={toastKey} visible={toastVisible} message={toastMsg} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    gap: 24,
    zIndex: 10,
  },
  tab: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 17,
    fontWeight: "600",
  },
  tabActive: {
    color: "#fff",
    textDecorationLine: "underline",
    textDecorationColor: "#FE2C55",
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { color: "#fff", fontSize: 20, fontWeight: "700" },
  emptyText: { color: "#555", fontSize: 14, textAlign: "center", lineHeight: 22 },
  discoverBtn: {
    marginTop: 8,
    backgroundColor: "#FE2C55",
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  discoverBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
