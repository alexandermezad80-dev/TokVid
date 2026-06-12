import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CommentsSheet from "../../components/CommentsSheet";
import VideoCard from "../../components/VideoCard";
import { useFollow } from "../../context/FollowContext";
import { VideoItem, formatCount, useVideoFeed } from "../../hooks/useVideoFeed";

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
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const followingListRef = useRef<FlatList>(null);

  const { followedIds, toggleFollow } = useFollow();
  const { videos, followingVideos, likedIds, toggleLike } = useVideoFeed(followedIds);

  const currentFeed = activeTab === "foryou" ? videos : followingVideos;

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
    ({ item, index }: { item: VideoItem; index: number }) => (
      <VideoCard
        video={item}
        isActive={index === activeIndex}
        isLiked={likedIds.has(item.id)}
        onLike={() => toggleLike(item.id)}
        onFollow={() => toggleFollow(item.creatorId)}
        onComment={() => setCommentVideo(item)}
        onAvatarPress={() => router.push(`/user-profile?userId=${item.creatorId}`)}
      />
    ),
    [activeIndex, likedIds, toggleLike, toggleFollow]
  );

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const handleTabSwitch = (tab: "following" | "foryou") => {
    setActiveTab(tab);
    setActiveIndex(0);
  };

  return (
    <View style={styles.container}>
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
