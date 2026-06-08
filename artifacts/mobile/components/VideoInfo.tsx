import { Feather } from "@expo/vector-icons";
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
  creator: string;
  creatorHandle: string;
  creatorAvatar: string;
  caption: string;
  song: string;
  isFollowing: boolean;
  onFollow: () => void;
}

export default function VideoInfo({
  creator,
  creatorHandle,
  creatorAvatar,
  caption,
  song,
  isFollowing,
  onFollow,
}: Props) {
  const slideX = useRef(new Animated.Value(-20)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scrollX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideX, { toValue: 0, duration: 400, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(scrollX, {
        toValue: -200,
        duration: 5000,
        useNativeDriver: true,
      })
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateX: slideX }], opacity }]}
    >
      <View style={styles.creator}>
        <Image source={{ uri: creatorAvatar }} style={styles.avatar} />
        <Text style={styles.creatorName}>{creatorHandle}</Text>
        {!isFollowing && (
          <TouchableOpacity onPress={onFollow} style={styles.followBtn}>
            <Text style={styles.followText}>Follow</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.caption} numberOfLines={2}>
        {caption}
      </Text>

      <View style={styles.songRow}>
        <Feather name="music" size={14} color="#fff" />
        <View style={styles.songScroll}>
          <Animated.Text
            style={[styles.songText, { transform: [{ translateX: scrollX }] }]}
            numberOfLines={1}
          >
            {song}{"          "}{song}
          </Animated.Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingLeft: 14,
    paddingBottom: 100,
    paddingRight: 80,
    justifyContent: "flex-end",
    gap: 10,
  },
  creator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#fff",
  },
  creatorName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  followBtn: {
    borderWidth: 1.5,
    borderColor: "#fff",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  followText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  caption: {
    color: "#fff",
    fontSize: 14,
    lineHeight: 20,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  songRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    overflow: "hidden",
    width: "100%",
  },
  songScroll: {
    flex: 1,
    overflow: "hidden",
  },
  songText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "500",
    width: 600,
  },
});
