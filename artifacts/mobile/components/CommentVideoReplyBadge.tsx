import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { supabase } from "../lib/supabase";
import { readVideoReplyTarget, VideoReplyTarget } from "../lib/features/comments/videoReply";

export default function CommentVideoReplyBadge({ commentId }: { commentId?: string | null }) {
  const [target, setTarget] = useState<VideoReplyTarget | null>(null);
  useEffect(() => {
    let active = true; setTarget(null);
    if (commentId) void readVideoReplyTarget(supabase, commentId).then(row => { if (active) setTarget(row); }).catch(() => {});
    return () => { active = false; };
  }, [commentId]);
  if (!target) return null;
  return <Pressable accessibilityRole="button" accessibilityLabel={`Ver comentario de ${target.username}`}
    onPress={() => router.push({ pathname: "/publication", params: { id: target.video_id, commentId: target.id } })} style={styles.badge}>
    <Text numberOfLines={1} style={styles.name}><Feather name="message-circle" size={12} /> Respuesta a @{target.username.replace(/^@/, "")}</Text>
    <Text numberOfLines={2} style={styles.text}>{target.text}</Text>
  </Pressable>;
}
const styles = StyleSheet.create({
  badge: { backgroundColor: "rgba(255,255,255,0.92)", padding: 10, borderRadius: 12, gap: 4, alignSelf: "flex-start" },
  name: { fontFamily: "Inter_400Regular", color: "#6B6B66", fontSize: 12 }, text: { fontFamily: "Inter_400Regular", color: "#131313", fontSize: 14 },
});
