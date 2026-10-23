import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
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
import { VideoItem, formatCount, useVideoFeed } from "../hooks/useVideoFeed";
import { useSavedVideos } from "../hooks/useSavedVideos";
import { savedVideoStartIndex } from "../lib/features/profile/savedVideoSelection";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function SavedFeedScreen() {
  const params = useLocalSearchParams<{ startIndex?: string; videoId?:string }>();
  const parsedIndex=parseInt(params.startIndex??"0",10);
  const startIndex=Number.isFinite(parsedIndex)&&parsedIndex>=0?parsedIndex:0;
  const requestedId=typeof params.videoId==="string"?params.videoId:undefined;

  const [activeIndex, setActiveIndex] = useState<number|null>(null);
  const [commentVideo, setCommentVideo] = useState<VideoItem | null>(null);
  const [shareOverrides, setShareOverrides] = useState<Record<string, number>>({});
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  const { followedIds, toggleFollow } = useFollow();
  const { likedIds, toggleLike } = useVideoFeed(followedIds);
  const { savedIds, savedVideos, toggleSave, loading:savedLoading, error:savedError, refresh:refreshSaved } = useSavedVideos();
  // Recheck confirmed availability on return, not only on the first mount.
  useFocusEffect(useCallback(()=>{void refreshSaved().catch(()=>{});},[refreshSaved]));
  const selectedIndex=savedVideoStartIndex(savedVideos,requestedId,startIndex);
  const visibleIndex=activeIndex??selectedIndex;

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
          isActive={index === visibleIndex}
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
    [visibleIndex, likedIds, savedIds, shareOverrides, toggleLike, toggleFollow, toggleSave, handleShare]
  );

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if(savedLoading){
    return <View style={styles.empty}><Text style={styles.emptyText}>Cargando Guardados…</Text></View>;
  }
  // A network failure is not proof that a creator deleted the publication.
  if(savedError){
    return <View style={styles.empty}>
      <TouchableOpacity accessibilityLabel="Volver" onPress={()=>router.back()} style={styles.backTouchable}><Feather name="arrow-left" size={24} color="#fff" /></TouchableOpacity>
      <Text style={styles.emptyText}>No pudimos comprobar tus Guardados. Revisa la conexión.</Text>
      <TouchableOpacity accessibilityLabel="Reintentar Guardados" onPress={()=>void refreshSaved().catch(()=>{})}><Text style={styles.emptyTitle}>Reintentar</Text></TouchableOpacity>
    </View>;
  }
  if(requestedId&&selectedIndex<0){
    return <View style={styles.empty}>
      <TouchableOpacity accessibilityLabel="Volver" onPress={()=>router.back()} style={styles.backTouchable}><Feather name="arrow-left" size={24} color="#fff" /></TouchableOpacity>
      <Text style={styles.emptyText}>Este video ya no está disponible en tus Guardados.</Text>
    </View>;
  }

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
        initialScrollIndex={Math.max(0,selectedIndex)}
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
