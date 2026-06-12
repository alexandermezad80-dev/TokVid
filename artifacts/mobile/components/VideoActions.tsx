import { Feather } from "@expo/vector-icons";
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
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onSave: () => void;
  creatorAvatar: string;
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
  onLike,
  onComment,
  onShare,
  onSave,
  creatorAvatar,
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
      <SpinningRecord avatar={creatorAvatar} />

      <TouchableOpacity onPress={handleLike} style={styles.action}>
        <Animated.View style={{ transform: [{ scale: heartScale }] }}>
          <Feather
            name="heart"
            size={34}
            color={isLiked ? "#FE2C55" : "#fff"}
          />
        </Animated.View>
        <Text style={styles.count}>{likes}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onComment} style={styles.action}>
        <Feather name="message-circle" size={34} color="#fff" />
        <Text style={styles.count}>{comments}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleShare} style={styles.action}>
        <Animated.View style={{ transform: [{ scale: shareScale }] }}>
          <Feather name="share-2" size={34} color="#fff" />
        </Animated.View>
        <Text style={styles.count}>{shares}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleSave} style={styles.action}>
        <Animated.View style={{ transform: [{ scale: saveScale }] }}>
          <Feather
            name="bookmark"
            size={34}
            color={isSaved ? "#FFD60A" : "#fff"}
          />
        </Animated.View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.action}>
        <Feather name="more-horizontal" size={34} color="#fff" />
      </TouchableOpacity>
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
    textShadow: "0px 1px 4px rgba(0,0,0,0.6)",
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
