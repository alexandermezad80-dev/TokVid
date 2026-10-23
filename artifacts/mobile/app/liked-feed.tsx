import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { VideoItem, formatCount, useVideoFeed } from "../hooks/useVideoFeed";
import { useSavedVideos } from "../hooks/useSavedVideos";
import { useAuth } from "../context/AuthContext";
import { useProfileLikedHistory, mergeLikedProfileItems } from "../hooks/useProfileLikedHistory";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function LikedFeedScreen() {
  const params = useLocalSearchParams<{ startIndex?: string; videoId?: string }>();
  const parsedIndex = parseInt(params.startIndex ?? "0", 10);
  const startIndex = Number.isFinite(parsedIndex) && parsedIndex >= 0 ? parsedIndex : 0;
  const requestedId=typeof params.videoId==="string"?params.videoId:undefined;

  const [activeIndex, setActiveIndex] = useState(startIndex);
  const [commentVideo, setCommentVideo] = useState<VideoItem | null>(null);
  const [shareOverrides, setShareOverrides] = useState<Record<string, number>>({});
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  const { followedIds, toggleFollow } = useFollow();
  const { user } = useAuth();
  const { likedIds, likedVideos:feedLikedVideos, likedLoading, toggleLike } = useVideoFeed(followedIds);
  const likedHistory=useProfileLikedHistory(user?.id,!!user);
  const likedVideos=mergeLikedProfileItems(likedHistory.items,feedLikedVideos);
  // A requested ID must resolve before mounting FlatList. Index alone is unsafe
  // after a fresh page fetch or another account unlikes/deletes the publication.
  const [resolvedStart,setResolvedStart]=useState<number|null>(null);
  useEffect(()=>{
    if(resolvedStart!==null||likedHistory.loading||likedLoading)return;
    const found=requestedId?likedVideos.findIndex(v=>v.id===requestedId):-1;
    if(likedHistory.error&&found<0&&(!!requestedId||likedVideos.length===0)){setResolvedStart(-2);return;}
    if(requestedId&&found<0&&likedHistory.hasMore){void likedHistory.loadMore();return;}
    if(requestedId&&found<0){setResolvedStart(-1);return;}
    const index=requestedId?found:Math.min(startIndex,Math.max(0,likedVideos.length-1));
    setActiveIndex(index);setResolvedStart(index);
  },[requestedId,likedVideos,likedLoading,likedHistory.loading,likedHistory.hasMore,likedHistory.error,likedHistory.loadMore,resolvedStart,startIndex]);
  const { savedIds, toggleSave } = useSavedVideos();

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
          isOwner={false}
          isGuest={false}
          onLike={() => toggleLike(item.id)}
          onDoubleLike={() => toggleLike(item.id)}
          onFollow={() => toggleFollow(item.creatorId)}
          onComment={() => setCommentVideo(item)}
          onShare={() => handleShare(item)}
          onSave={() => toggleSave(item.id)}
          onDelete={() => {}}
          onAvatarPress={() => router.push(`/user-profile?userId=${item.creatorId}`)}
        />
      );
    },
    [activeIndex, likedIds, savedIds, shareOverrides, toggleLike, toggleFollow, toggleSave, handleShare]
  );

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if(resolvedStart===null){
    return <View style={styles.empty}><ActivityIndicator color="#D2F9FA" /><Text style={styles.emptyText}>Cargando Me gusta…</Text></View>;
  }

  if(resolvedStart===-2){
    return <View style={styles.empty}>
      <TouchableOpacity accessibilityLabel="Volver" onPress={()=>router.back()} style={styles.backTouchable}><Feather name="arrow-left" size={24} color="#fff" /></TouchableOpacity>
      <Text style={styles.emptyText}>No pudimos cargar tus Me gusta. Comprueba la conexión.</Text>
      <TouchableOpacity accessibilityLabel="Reintentar Me gusta" onPress={()=>{setResolvedStart(null);void likedHistory.refresh();}}><Text style={styles.emptyTitle}>Reintentar</Text></TouchableOpacity>
    </View>;
  }

  if(resolvedStart<0){
    return <View style={styles.empty}>
      <TouchableOpacity accessibilityLabel="Volver" onPress={()=>router.back()} style={styles.backTouchable}><Feather name="arrow-left" size={24} color="#fff" /></TouchableOpacity>
      <Text style={styles.emptyText}>Este video ya no está disponible en tus Me gusta.</Text>
    </View>;
  }

  if (likedVideos.length === 0) {
    return (
      <View style={styles.empty}>
        <View style={[styles.backBtn, { top: topPad + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backTouchable}>
            <Feather name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <Feather name="heart" size={52} color="#555" />
        <Text style={styles.emptyTitle}>Sin likes</Text>
        <Text style={styles.emptyText}>Los videos que te gusten aparecerán acá</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.backBtn, { top: topPad + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backTouchable}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.backTitle}>Me gusta</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={likedVideos}
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
        initialScrollIndex={resolvedStart}
        onEndReached={()=>{if(likedHistory.hasMore&&!likedHistory.loading)void likedHistory.loadMore();}}
        onEndReachedThreshold={0.5}
      />

      <CommentsSheet
        visible={!!commentVideo}
        commentCount={commentVideo ? formatCount(commentVideo.comments) : "0"}
        videoId={commentVideo?.id ?? ""}
        isVideoSaved={!!commentVideo && savedIds.has(commentVideo.id)}
        onSaveVideo={() => { if (commentVideo) void toggleSave(commentVideo.id); }}
        onClose={() => setCommentVideo(null)}
      />
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
  backTitle: { fontFamily: "Inter_500Medium",
    color: "#fff",
    fontSize: 16,
    fontWeight: "normal",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  empty: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyTitle: { fontFamily: "Inter_500Medium", color: "#fff", fontSize: 20, fontWeight: "normal" },
  emptyText: { fontFamily: "Inter_400Regular", color: "#555", fontSize: 14, textAlign: "center", paddingHorizontal: 40 },
});
