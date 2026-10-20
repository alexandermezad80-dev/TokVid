import BrandAvatar from "./reference/BrandAvatar";
import {useVideoSaveCount} from "../hooks/useVideoSaveCount";
import { useRegistration } from "../context/RegistrationContext";
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
  videoId?:string;
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
  isFollowing?: boolean;
  followPending?: boolean;
  onFollow?: () => void;
  onAvatarPress?: () => void;
  commentCue?: boolean;
}

function CreatorAvatar({avatar}:{avatar:string}){return <View style={styles.recordOuter}><Image source={{uri:avatar}} style={styles.recordInner}/></View>;}

export default function VideoActions({
  videoId,likes,
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
  isGuest, isFollowing = false, followPending = false, onFollow, onAvatarPress, commentCue,
}: Props) {
  const liveCounts=useVideoSaveCount(videoId),saves=liveCounts.saves;
  const fmt=(n:number)=>n>=1000000?`${(n/1000000).toFixed(1)}M`:n>=1000?`${(n/1000).toFixed(1)}K`:String(n);
  const {tabBarHeight}=useRegistration();
  const heartScale = useRef(new Animated.Value(1)).current;
  const shareScale = useRef(new Animated.Value(1)).current;
  const saveScale = useRef(new Animated.Value(1)).current;


  useEffect(() => {
    if (isGuest) return;
    const value = isLiked ? heartScale : isSaved ? saveScale : null;
    if (!value) return;
    Animated.sequence([Animated.timing(value, { toValue: 1.12, duration: 140, useNativeDriver: true }), Animated.timing(value, { toValue: 1, duration: 180, useNativeDriver: true })]).start();
  }, [isLiked, isSaved, isGuest]);

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
    <View style={[styles.container,{paddingBottom:tabBarHeight+16}]}>
      <View style={[styles.action, styles.profileAction]}>
        <TouchableOpacity
          onPress={onAvatarPress}
          activeOpacity={isGuest ? 0.75 : 1}
          accessibilityRole="button"
          accessibilityLabel="Perfil del creador"
        >
          <BrandAvatar uri={creatorAvatar} size={48} radius={12}/>
        </TouchableOpacity>
        {(isGuest || (!isOwner && !isFollowing)) && onFollow ? (
          <TouchableOpacity
            onPress={onFollow}
            disabled={followPending}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Seguir creador"
            accessibilityState={{ disabled: followPending }}
            style={{position:"absolute",bottom:-6,alignSelf:"center",opacity:followPending ? 0.5 : 1}}
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
          <Feather name="heart" size={28} color={isLiked && !isGuest ? "#FF304F" : "#fff"} />
        </Animated.View>
        <Text style={styles.count}>{likes}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onComment} style={styles.action} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel="Comentarios">
        <Feather name="message-circle" size={28} color={commentCue ? "#00F2FE" : "#fff"} />
        <Text style={styles.count}>{comments}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={isGuest ? onShare : handleShare} style={styles.action} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel="Compartir">
        <Animated.View style={{ transform: [{ scale: shareScale }] }}>
          <Feather name="share-2" size={28} color="#fff" />
        </Animated.View>
        <Text style={styles.count}>{liveCounts.shares===null?shares:fmt(liveCounts.shares)}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={isGuest ? onSave : handleSave} style={styles.action} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel="Guardar">
        <Animated.View style={{ transform: [{ scale: saveScale }] }}>
          <Feather name="bookmark" size={28} color={isSaved && !isGuest ? "#FE0979" : "#fff"} />
        </Animated.View>
        <Text style={styles.count}>{saves>=1000?`${(saves/1000).toFixed(1)}K`:saves}</Text>
      </TouchableOpacity>


    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 100,
    paddingRight: 12,
    alignItems: "center",
    gap: 18,
  },
  action: {
    width:52,minHeight:48,
    alignItems: "center",
    gap: 4,
  },
  count: { fontFamily: "Inter_500Medium",
    color: "#fff",
    fontSize: 12,
    fontWeight: "normal",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  profileAction: { marginBottom: 6,height:48 },
  followPlus: {
    width: 26,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -2,
  },
  profileBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#fff",
    backgroundColor: "rgba(0,0,0,0.34)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  recordOuter: {
    width: 48,
    height: 48,
    borderRadius: 12,
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

