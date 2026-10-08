import { Feather } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Image,
  Text,
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { VideoItem, formatCount } from "../hooks/useVideoFeed";
import VideoActions from "./VideoActions";
import VideoInfo from "./VideoInfo";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import type { VideoPreviewFrame } from "../lib/commentVideoLayout";

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
  likeCount?: number | null;
  previewFrame?: VideoPreviewFrame | null;
  followPending?: boolean;
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
  isGuest, suspended, commentCue, commentCount, likeCount, previewFrame, followPending, onPosition, registerPlayback, restorePosition, restorePaused, restoreRequest,
}: Props) {
  const isImage = video.mediaType === "image";
  const [paused, setPaused] = useState(false);
  const [playbackError, setPlaybackError] = useState(false);
  const [showThumbnail, setShowThumbnail] = useState(true);
  const [showDoubleLike, setShowDoubleLike] = useState(false);
  const [playPauseFeedback, setPlayPauseFeedback] = useState<"play" | "pause" | null>(null);
  const restoredRequest = useRef<string | undefined>(undefined);
  const lastTap = useRef<number>(0);
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<View>(null);
  const videoFrame = useSharedValue({ left: 0, top: 0, width: SCREEN_WIDTH, height: SCREEN_HEIGHT, borderRadius: 0 });
  const videoPresentation = useAnimatedStyle(() => ({ ...videoFrame.value }));
  useEffect(() => {
    let active = true;
    if (previewFrame && isActive) {
      containerRef.current?.measureInWindow((x, y) => {
        if (!active) return;
        videoFrame.value = withSpring({ left: previewFrame.x - x, top: previewFrame.y - y,
          width: previewFrame.width, height: previewFrame.height, borderRadius: 16 }, { damping: 22, stiffness: 150 });
      });
    } else {
      videoFrame.value = withSpring({ left: 0, top: 0, width: SCREEN_WIDTH, height: SCREEN_HEIGHT, borderRadius: 0 }, { damping: 22, stiffness: 150 });
    }
    return () => { active = false; };
  }, [previewFrame?.x, previewFrame?.y, previewFrame?.width, previewFrame?.height, isActive, videoFrame]);

  const player = useVideoPlayer(isImage ? null : video.uri, (p) => {
    p.loop = true;
    p.muted = false;
  });

  useEffect(() => {
    setShowThumbnail(true); setPlaybackError(false);
    const subscription = player.addListener?.("statusChange", event => setPlaybackError(event.status === "error"));
    return () => subscription?.remove();
  }, [video.uri, player]);
  useEffect(() => {
    if (isImage) return;
    if (suspended || !isActive || paused) player.pause();
    else player.play();
  }, [isActive, paused, suspended, isImage, player]);

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
    if (isImage) return;
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
    }, 850);
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    };
  }, []);

  return (
    <Pressable ref={containerRef} onPress={handleTap} style={styles.container}>
      <Animated.View style={[styles.videoSurface, videoPresentation]}>
      {isImage ? <Image source={{ uri: video.uri }} style={styles.video} resizeMode="contain" /> : <VideoView
        player={player}
        style={styles.video}
        surfaceType="textureView"
        contentFit="cover"
        nativeControls={false}
        onFirstFrameRender={() => setShowThumbnail(false)}
      />}
      {!isImage && showThumbnail && !!video.thumbnail && (
        <Image source={video.thumbnail} style={styles.thumbnail} resizeMode="cover" />
      )}
      {!isImage && isActive && showThumbnail && !playbackError && <View pointerEvents="none" style={styles.playPauseOverlay}><ActivityIndicator color="#D2F9FA" /></View>}
      {!isImage && playbackError && <View style={styles.playPauseOverlay}><Text style={{ color: "#fff", padding: 12, textAlign: "center" }}>No se pudo reproducir el video</Text><Pressable accessibilityRole="button" accessibilityLabel="Reintentar video" onPress={() => { setPlaybackError(false); void player.replaceAsync(video.uri).then(() => { if (!paused) player.play(); }).catch(() => setPlaybackError(true)); }}><Text style={{ color: "#99E0E4", padding: 12 }}>Reintentar</Text></Pressable></View>}
      </Animated.View>

      {!previewFrame && <View style={styles.overlay}>
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
          likes={likeCount === null ? "…" : formatCount(likeCount ?? video.likes)}
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
          isFollowing={video.isFollowing}
          followPending={followPending}
          onFollow={onFollow}
          onAvatarPress={onAvatarPress}
          commentCue={commentCue}
        />
      </View>}

      {showDoubleLike && !previewFrame && (
        <View style={styles.doubleLikeOverlay} pointerEvents="none">
          <Feather name="heart" size={86} color="#FE0979" />
        </View>
      )}
      {!isImage && (playPauseFeedback || paused) && !previewFrame && (
        <View style={styles.playPauseOverlay} pointerEvents="none">
          <View style={styles.playPauseBadge}>
            <Feather
              name={paused && !playPauseFeedback ? "play" : playPauseFeedback === "play" ? "play" : "pause"}
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
  videoSurface: { position: "absolute", overflow: "hidden", backgroundColor: "#000" },
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

