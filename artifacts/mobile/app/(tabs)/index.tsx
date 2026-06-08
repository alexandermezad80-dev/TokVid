import { Feather } from "@expo/vector-icons";
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
import { VideoItem, formatCount, useVideoFeed } from "../../hooks/useVideoFeed";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function FeedScreen() {
  const { videos, likedIds, toggleLike, toggleFollow } = useVideoFeed();
  const [activeIndex, setActiveIndex] = useState(0);
  const [commentVideo, setCommentVideo] = useState<VideoItem | null>(null);
  const [activeTab, setActiveTab] = useState<"following" | "foryou">("foryou");
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

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
        onFollow={() => toggleFollow(item.creatorHandle)}
        onComment={() => setCommentVideo(item)}
      />
    ),
    [activeIndex, likedIds, toggleLike, toggleFollow]
  );

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={styles.container}>
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
        scrollEnabled={!!videos.length}
        getItemLayout={(_, index) => ({
          length: SCREEN_HEIGHT,
          offset: SCREEN_HEIGHT * index,
          index,
        })}
        removeClippedSubviews
        maxToRenderPerBatch={3}
        windowSize={3}
      />

      <View style={[styles.header, { paddingTop: topPad + 10 }]}>
        <TouchableOpacity onPress={() => setActiveTab("following")}>
          <Text style={[styles.tab, activeTab === "following" && styles.tabActive]}>
            Following
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setActiveTab("foryou")}>
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
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
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
});
