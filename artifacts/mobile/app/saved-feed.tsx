import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Platform,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";
import CommentsSheet from "../components/CommentsSheet";
import VideoCard from "../components/VideoCard";
import { useFollow } from "../context/FollowContext";
import { VideoItem, useVideoFeed } from "../hooks/useVideoFeed";
import { useSavedVideos } from "../hooks/useSavedVideos";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function SavedFeedScreen() {
  const params = useLocalSearchParams<{ startIndex?: string }>();
  const startIndex = parseInt(params.startIndex ?? "0", 10);

  const [activeIndex, setActiveIndex] = useState(startIndex);
  const [commentVideo, setCommentVideo] = useState<VideoItem | null>(null);
  const [shareOverrides, setShareOverrides] = useState<Record<string, number>>({});
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  const { followedIds, toggleFollow } = useFollow();
  const { likedIds, toggleLike } = useVideoFeed(followedIds);
  const { savedIds, savedVideos, toggleSave } = useSavedVideos();

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) {
        setActiveIndex(viewableItems[0].index ?? 0);
      }
    },
    []
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 80 }).current;

  const handleShare = useCallback(async (item: VideoItem) => {
    setShareOverrides((prev) => ({ ...prev, [item.id]: (prev[item.id] ?? 0) + 1 }));
    try {
      await Share.share({ title: item.caption, message: `${item.caption}\n\n${item.uri}`, url: item.uri });
    } catch {
      setShareOverrides((prev) => ({ ...prev, [item.id]: Math.max(0, (prev[item.id] ?? 1) - 1) }));
      return;
    }
    try {
      const { data } = await supabase.from("videos").select("shares_count").eq("id", item.id).maybeSingle();
      if (data) {
        await supabase.from("videos").update({ shares_count: (data.shares_count ?? 0) + 1 }).eq("id", item.id);
      }
    } catch { /* no-op */ }
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: VideoItem; index: number }) => {
      const extraShares = shareOverrides[item.id] ?? 0;
      const videoWithShares = extraShares > 0 ? { ...item, shares: item.shares + extraShares } : item;
      return (
        <VideoCard
          video={videoWithShares}
          isActive={index === activeIndex}
          isLiked={likedIds.has(item.id)}
          isSaved={savedIds.has(item.id)}
          onLike={() => toggleLike(item.id)}
          onFollow={() => toggleFollow(item.creatorId)}
          onComment={() => setCommentVideo(item)}
          onShare={() => handleShare(item)}
          onSave={() => toggleSave(item.id)}
          onAvatarPress={() => router.push(`/user-profile?userId=${item.creatorId}`)}
        />
      );
    },
    [activeIndex, likedIds, savedIds, shareOverrides, toggleLike, toggleFollow, toggleSave, handleShare]
  );

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (savedVideos.length === 0) {
    return (
      <View style={styles.empty}>
        <View style={[styles.backBtn, { top: topPad + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backTouchable}>
            <Feather name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <Feather name="bookmark" size={52} color="#555" />
        <Text style={styles.emptyTitle}>Sin guardados</Text>
        <Text style={styles.emptyText}>Los videos que guardes aparecerán acá</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.backBtn, { top: topPad + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backTouchable}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.backTitle}>Guardados</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={savedVideos}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT}
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: SCREEN_HEIGHT,
          offset: SCREEN_HEIGHT * index,
          index,
        })}
        initialScrollIndex={Math.min(startIndex, savedVideos.length - 1)}
      />

      {commentVideo && (
        <CommentsSheet
          videoId={commentVideo.id}
          onClose={() => setCommentVideo(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  backBtn: {
    position: "absolute",
    left: 16,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backTouchable: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 20,
  },
  backTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    textShadow: "0px 1px 4px rgba(0,0,0,0.8)",
  },
  empty: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyTitle: { color: "#fff", fontSize: 20, fontWeight: "700" },
  emptyText: { color: "#555", fontSize: 14, textAlign: "center", paddingHorizontal: 40 },
});
