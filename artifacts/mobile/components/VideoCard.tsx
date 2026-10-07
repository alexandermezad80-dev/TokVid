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
  isGuest: boolean;
  suspended?: boolean;
  commentCue?: boolean;
  commentCount?: number | null;
  onPosition?: (position: number, paused: boolean) => void;
  registerPlayback?: (read: () => { position: number; wasPaused: boolean }) => void;
  restorePosition?: number;
  restorePaused?: boolean;
  restoreRequest?: string;
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
  isGuest, suspended, commentCue, commentCount, onPosition, registerPlayback, restorePosition, restorePaused, restoreRequest,
}: Props) {
  const [paused, setPaused] = useState(false);
  const [showThumbnail, setShowThumbnail] = useState(true);
  const [showDoubleLike, setShowDoubleLike] = useState(false);
  const [playPauseFeedback, setPlayPauseFeedback] = useState<"play" | "pause" | null>(null);
  const restoredRequest = useRef<string | undefined>(undefined);
  const lastTap = useRef<number>(0);
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const player = useVideoPlayer(video.uri, (p) => {
    p.loop = true;
    p.muted = false;
  });

  useEffect(() => {
    if (suspended) { player.pause(); return; }
    if (isActive && !paused) {
      player.play();
      const t = setTimeout(() => setShowThumbnail(false), 300);
      return () => clearTimeout(t);
    } else {
      player.pause();
      setShowThumbnail(true);
    }
  }, [isActive, paused, suspended]);

  useEffect(() => { if (isActive) registerPlayback?.(() => ({ position: player.currentTime, wasPaused: paused })); }, [isActive, registerPlayback, player, paused]);
  useEffect(() => {
    if (!isActive) return;
    const timer = setInterval(() => onPosition?.(player.currentTime, paused), 250);
    return () => clearInterval(timer);
  }, [isActive, player, onPosition, paused]);
  useEffect(() => { if (restorePosition !== undefined && isActive && restoreRequest !== restoredRequest.current) { restoredRequest.current = restoreRequest; player.currentTime = restorePosition; setPaused(!!restorePaused); } }, [restorePosition, isActive, restoreRequest]);

  const handleTap = () => {
    if (!isActive || suspended) return;
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
      if (!isGuest) setShowDoubleLike(true);
      onDoubleLike?.();
      setTimeout(() => setShowDoubleLike(false), 450);
      lastTap.current = 0;
      return;
    }

    lastTap.current = now;
    singleTapTimer.current = setTimeout(() => {
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
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
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
          comments={commentCount === null ? "…" : formatCount(commentCount ?? video.comments)}
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
          isGuest={isGuest}
          onFollow={onFollow}
          onAvatarPress={onAvatarPress}
          commentCue={commentCue}
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
