import { useVideoPlayer, VideoView } from "expo-video";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { VideoItem, formatCount } from "../hooks/useVideoFeed";
import VideoActions from "./VideoActions";
import VideoInfo from "./VideoInfo";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface Props {
  video: VideoItem;
  isActive: boolean;
  isLiked: boolean;
  isSaved: boolean;
  onLike: () => void;
  onFollow: () => void;
  onComment: () => void;
  onShare: () => void;
  onSave: () => void;
  onAvatarPress?: () => void;
}

export default function VideoCard({
  video,
  isActive,
  isLiked,
  isSaved,
  onLike,
  onFollow,
  onComment,
  onShare,
  onSave,
  onAvatarPress,
}: Props) {
  const [paused, setPaused] = useState(false);
  const [showThumbnail, setShowThumbnail] = useState(true);

  const player = useVideoPlayer(video.uri, (p) => {
    p.loop = true;
    p.muted = false;
  });

  useEffect(() => {
    if (isActive && !paused) {
      player.play();
      const t = setTimeout(() => setShowThumbnail(false), 300);
      return () => clearTimeout(t);
    } else {
      player.pause();
      setShowThumbnail(true);
    }
  }, [isActive, paused]);

  const handleTap = () => {
    if (!isActive) return;
    if (paused) {
      setPaused(false);
      player.play();
    } else {
      setPaused(true);
      player.pause();
    }
  };

  return (
    <Pressable onPress={handleTap} style={styles.container}>
      {showThumbnail && (
        <Image source={video.thumbnail} style={styles.thumbnail} resizeMode="cover" />
      )}
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        nativeControls={false}
      />

      <View style={styles.overlay}>
        <VideoInfo
          creator={video.creator}
          creatorHandle={video.creatorHandle}
          creatorAvatar={video.creatorAvatar}
          caption={video.caption}
          song={video.song}
          isFollowing={video.isFollowing}
          onFollow={onFollow}
          onAvatarPress={onAvatarPress}
        />
        <VideoActions
          likes={formatCount(video.likes)}
          comments={formatCount(video.comments)}
          shares={formatCount(video.shares)}
          isLiked={isLiked}
          isSaved={isSaved}
          onLike={onLike}
          onComment={onComment}
          onShare={onShare}
          onSave={onSave}
          creatorAvatar={video.creatorAvatar}
        />
      </View>

      {paused && (
        <View style={styles.pauseOverlay} pointerEvents="none">
          <View style={styles.pauseIcon}>
            <View style={[styles.pauseBar, { marginRight: 6 }]} />
            <View style={styles.pauseBar} />
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: "#000",
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  thumbnail: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    alignItems: "flex-end",
    zIndex: 2,
  },
  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
  },
  pauseIcon: {
    flexDirection: "row",
    opacity: 0.8,
  },
  pauseBar: {
    width: 8,
    height: 50,
    borderRadius: 4,
    backgroundColor: "#fff",
  },
});
