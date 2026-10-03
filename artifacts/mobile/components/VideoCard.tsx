import { Feather } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Image,
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
  isOwner: boolean;
  onLike: () => void;
  onDoubleLike?: () => void;
  onFollow: () => void;
  onComment: () => void;
  onShare: () => void;
  onSave: () => void;
  onDelete: () => void;
  onAvatarPress?: () => void;
}

export default function VideoCard({
  video,
  isActive,
  isLiked,
  isSaved,
  isOwner,
  onLike,
  onDoubleLike,
  onFollow,
  onComment,
  onShare,
  onSave,
  onDelete,
  onAvatarPress,
}: Props) {
  const [paused, setPaused] = useState(false);
  const [showThumbnail, setShowThumbnail] = useState(true);
  const [showDoubleLike, setShowDoubleLike] = useState(false);
  const [playPauseFeedback, setPlayPauseFeedback] = useState<"play" | "pause" | null>(null);
  const lastTap = useRef<number>(0);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    const now = Date.now();
    if (now - lastTap.current < 300) {
      setShowDoubleLike(true);
      onDoubleLike?.();
      setTimeout(() => setShowDoubleLike(false), 450);
      lastTap.current = 0;
      return;
    }

    lastTap.current = now;
    const nextPaused = !paused;
    setPaused(nextPaused);
    if (nextPaused) {
      player.pause();
    } else {
      player.play();
    }

    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    setPlayPauseFeedback(nextPaused ? "pause" : "play");
    feedbackTimer.current = setTimeout(() => {
      setPlayPauseFeedback(null);
      feedbackTimer.current = null;
    }, 450);
  };

  useEffect(() => {
    return () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    };
  }, []);

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
          isOwner={isOwner}
          onLike={onLike}
          onComment={onComment}
          onShare={onShare}
          onSave={onSave}
          onDelete={onDelete}
          creatorAvatar={video.creatorAvatar}
        />
      </View>

      {showDoubleLike && (
        <View style={styles.doubleLikeOverlay} pointerEvents="none">
          <Feather name="heart" size={86} color="#FE0979" />
        </View>
      )}
      {playPauseFeedback && (
        <View style={styles.playPauseOverlay} pointerEvents="none">
          <View style={styles.playPauseBadge}>
            <Feather
              name={playPauseFeedback === "play" ? "play" : "pause"}
              size={30}
              color="#fff"
            />
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
  playPauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
  },
  playPauseBadge: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.42)",
  },
  doubleLikeOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 4,
    opacity: 0.95,
  },
});
