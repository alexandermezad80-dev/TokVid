import { useRegistration } from "../context/RegistrationContext";
import { useAuth } from "../context/AuthContext";
import { requestRegistration } from "../lib/features/auth/services/registrationBridge";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import CommentVideoReplyBadge from "./CommentVideoReplyBadge";
import { supabase } from "../lib/supabase";

async function goToMention(username: string) {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", username)
    .maybeSingle();
  if (data?.id) router.push(`/user-profile?userId=${data.id}`);
}

/** Renders a caption with clickable blue #hashtags and @mentions. */
function CaptionText({ caption,expanded }: { caption: string;expanded:boolean }) {
  const { user } = useAuth();
  if (!caption) return null;
  const parts = caption.split(/([#@]\w+)/g);
  return (
    <Text maxFontSizeMultiplier={1.2} style={styles.caption} numberOfLines={expanded?undefined:2}>
      {parts.map((part, i) => {
        if (/^#\w+$/.test(part)) {
          const tag = part.slice(1).toLowerCase();
          return (
            <Text
              key={i}
              style={styles.tag}
              onPress={() => user ? router.push(`/tag?tag=${encodeURIComponent(tag)}`) : requestRegistration()}
            >
              {part}
            </Text>
          );
        }
        if (/^@\w+$/.test(part)) {
          const username = part.slice(1);
          return (
            <Text key={i} style={styles.tag} onPress={() => user ? goToMention(username) : requestRegistration()}>
              {part}
            </Text>
          );
        }
        return <Text key={i}>{part}</Text>;
      })}
    </Text>
  );
}

interface Props {
  creator: string;
  creatorHandle: string;
  creatorAvatar: string;
  caption: string;
  replyCommentId?: string | null;
  song: string;
  isFollowing: boolean;
  isOwner?: boolean;
  followPending?: boolean;
  onFollow: () => void;
  onAvatarPress?: () => void;
}

export default function VideoInfo({
  creator,
  creatorHandle,
  creatorAvatar,
  caption, replyCommentId,
  song,
  isFollowing,
  isOwner=false,
  followPending=false,
  onFollow,
  onAvatarPress,
}: Props) {
  const {tabBarHeight}=useRegistration();
  const [expanded,setExpanded]=useState(false);
  useEffect(()=>setExpanded(false),[caption]);
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
      style={[styles.container, {paddingBottom:tabBarHeight+16, transform: [{ translateX: slideX }], opacity }]}
    >
      {!!replyCommentId && <CommentVideoReplyBadge commentId={replyCommentId} />}
      <View style={styles.creator}>
        <TouchableOpacity style={{flex:1,minWidth:0}} onPress={onAvatarPress} activeOpacity={0.85}>
          <Text numberOfLines={1} style={styles.creatorName}>{creatorHandle}</Text>
        </TouchableOpacity>

      </View>

      <CaptionText caption={caption} expanded={expanded}/>{!!caption&&<TouchableOpacity accessibilityRole="button" onPress={()=>setExpanded(!expanded)}><Text style={[styles.caption,{fontWeight:"700"}]}>{expanded?"menos":"más…"}</Text></TouchableOpacity>}

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
    paddingLeft: 16,
    paddingBottom: 100,
    paddingRight: 80,
    justifyContent: "flex-end",
    gap: 8,
  },
  creator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
    fontSize: 15,
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  followBtn: {
    borderWidth: 1.5,
    borderColor: "#fff",
    borderRadius: 6,
    paddingHorizontal: 8,
    minHeight: 44,
    maxWidth: "42%",
    justifyContent: "center",
    paddingVertical: 4,
  },
  followText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  caption: {
    color: "#fff",
    fontSize: 13,
    lineHeight: 18,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  tag: {
    color: "#62D6FF",
    fontWeight: "600",
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
    fontSize: 12,
    fontWeight: "500",
    width: 600,
  },
});

