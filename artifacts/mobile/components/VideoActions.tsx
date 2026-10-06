import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface Props {
  likes: string;
  comments: string;
  shares: string;
  isLiked: boolean;
  isSaved: boolean;
  isOwner: boolean;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onSave: () => void;
  onDelete: () => void;
  creatorAvatar: string;
  isGuest: boolean;
  onFollow?: () => void;
  onAvatarPress?: () => void;
  commentCue?: boolean;
}

function SpinningRecord({ avatar }: { avatar: string }) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: true,
      })
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <Animated.View style={[styles.recordOuter, { transform: [{ rotate }] }]}>
      <Image source={{ uri: avatar }} style={styles.recordInner} />
    </Animated.View>
  );
}

export default function VideoActions({
  likes,
  comments,
  shares,
  isLiked,
  isSaved,
  isOwner,
  onLike,
  onComment,
  onShare,
  onSave,
  onDelete,
  creatorAvatar,
  isGuest, onFollow, onAvatarPress, commentCue,
}: Props) {
  const heartScale = useRef(new Animated.Value(1)).current;
  const shareScale = useRef(new Animated.Value(1)).current;
  const saveScale = useRef(new Animated.Value(1)).current;


  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.timing(heartScale, { toValue: 1.4, duration: 100, useNativeDriver: true }),
      Animated.timing(heartScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    onLike();
  };

  const handleShare = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(shareScale, { toValue: 1.35, duration: 100, useNativeDriver: true }),
      Animated.timing(shareScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    onShare();
  };

  const handleSave = () => {
    Haptics.impactAsync(
      isSaved ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium
    );
    Animated.sequence([
      Animated.timing(saveScale, { toValue: 1.4, duration: 120, useNativeDriver: true }),
      Animated.timing(saveScale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    onSave();
  };

  return (
    <View style={styles.container}>
      <View style={[styles.action, styles.profileAction]}>
        <TouchableOpacity
          onPress={onAvatarPress}
          activeOpacity={isGuest ? 0.75 : 1}
          accessibilityRole="button"
          accessibilityLabel="Perfil del creador"
        >
          {isGuest ? (
            <View style={styles.profileBadge}>
              <MaterialCommunityIcons name="account-outline" size={30} color="#fff" />
            </View>
          ) : (
            <SpinningRecord avatar={creatorAvatar} />
          )}
        </TouchableOpacity>
        {isGuest ? (
          <TouchableOpacity
            onPress={onFollow}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Seguir creador"
          >
            <LinearGradient
              colors={["#00F2FE", "#FE0979"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.followPlus}
            >
              <MaterialCommunityIcons name="plus" size={16} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        ) : null}
      </View>

      <TouchableOpacity onPress={isGuest ? onLike : handleLike} style={styles.action} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel="Me gusta">
        <Animated.View style={{ transform: [{ scale: heartScale }] }}>
          <MaterialCommunityIcons name={isLiked && !isGuest ? "heart" : "heart-outline"} size={34} color={isLiked && !isGuest ? "#FF304F" : "#fff"} />
        </Animated.View>
        <Text style={styles.count}>{likes}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onComment} style={styles.action} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel="Comentarios">
        <MaterialCommunityIcons name="comment-outline" size={34} color={commentCue ? "#00F2FE" : "#fff"} />
        <Text style={styles.count}>{comments}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={isGuest ? onShare : handleShare} style={styles.action} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel="Compartir">
        <Animated.View style={{ transform: [{ scale: shareScale }] }}>
          <MaterialCommunityIcons name="share-variant-outline" size={34} color="#fff" />
        </Animated.View>
        <Text style={styles.count}>{shares}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={isGuest ? onSave : handleSave} style={styles.action} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel="Guardar">
        <Animated.View style={{ transform: [{ scale: saveScale }] }}>
          <MaterialCommunityIcons name={isSaved && !isGuest ? "bookmark" : "bookmark-outline"} size={34} color={isSaved && !isGuest ? "#FE0979" : "#fff"} />
        </Animated.View>
      </TouchableOpacity>

      {isOwner && (
        <TouchableOpacity onPress={onDelete} style={styles.action}>
          <Feather name="more-horizontal" size={34} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 100,
    paddingRight: 12,
    alignItems: "center",
    gap: 16,
  },
  action: {
    alignItems: "center",
    gap: 4,
  },
  count: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  profileAction: { marginBottom: 2 },
  followPlus: {
    width: 26,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -2,
  },
  profileBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: "#fff",
    backgroundColor: "rgba(0,0,0,0.34)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  recordOuter: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    borderColor: "#333",
    backgroundColor: "#000",
    overflow: "hidden",
    marginBottom: 8,
  },
  recordInner: {
    width: "100%",
    height: "100%",
  },
});
