import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export interface VideoItem {
  id: string;
  uri: string;
  thumbnail: any;
  creator: string;
  creatorHandle: string;
  creatorAvatar: string;
  creatorId: string;
  caption: string;
  song: string;
  likes: number;
  comments: number;
  shares: number;
  isFollowing: boolean;
  isReal?: boolean; // true = comes from Supabase DB
}

// Stable fake UUIDs for mock creators so follows persist in Supabase
export const MOCK_CREATOR_IDS: Record<string, string> = {
  "@lunareyes":   "11111111-1111-1111-1111-111111111111",
  "@jakerides":   "22222222-2222-2222-2222-222222222222",
  "@chefmarco":   "33333333-3333-3333-3333-333333333333",
  "@miastrings":  "44444444-4444-4444-4444-444444444444",
  "@artbykai":    "55555555-5555-5555-5555-555555555555",
  "@flexnation":  "66666666-6666-6666-6666-666666666666",
};

const MOCK_VIDEOS_RAW: Omit<VideoItem, "isFollowing" | "isReal">[] = [
  {
    id: "1",
    uri: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    thumbnail: require("../assets/images/thumb1.png"),
    creator: "Luna Reyes",
    creatorHandle: "@lunareyes",
    creatorAvatar: "https://i.pravatar.cc/150?img=47",
    creatorId: MOCK_CREATOR_IDS["@lunareyes"],
    caption: "Morning dance routine hits different when the sun is just right ✨ #dance #morning #viral",
    song: "♫ Flowers - Miley Cyrus",
    likes: 284700,
    comments: 3421,
    shares: 8902,
  },
  {
    id: "2",
    uri: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    thumbnail: require("../assets/images/thumb2.png"),
    creator: "Jake Rivera",
    creatorHandle: "@jakerides",
    creatorAvatar: "https://i.pravatar.cc/150?img=13",
    creatorId: MOCK_CREATOR_IDS["@jakerides"],
    caption: "New skate park just opened downtown and it is INSANE 🛹🔥 #skateboarding #tricks #fyp",
    song: "♫ Bad Habit - Steve Lacy",
    likes: 192300,
    comments: 2109,
    shares: 5670,
  },
  {
    id: "3",
    uri: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    thumbnail: require("../assets/images/thumb3.png"),
    creator: "Chef Marco",
    creatorHandle: "@chefmarco",
    creatorAvatar: "https://i.pravatar.cc/150?img=59",
    creatorId: MOCK_CREATOR_IDS["@chefmarco"],
    caption: "Secret ramen recipe my grandmother taught me. Takes 6 hours but worth every second 🍜 #cooking #ramen #foodie",
    song: "♫ Lofi Chill Beats",
    likes: 521000,
    comments: 12430,
    shares: 34100,
  },
  {
    id: "4",
    uri: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    thumbnail: require("../assets/images/thumb4.png"),
    creator: "Mia Strings",
    creatorHandle: "@miastrings",
    creatorAvatar: "https://i.pravatar.cc/150?img=32",
    creatorId: MOCK_CREATOR_IDS["@miastrings"],
    caption: "Wrote this song last night, couldn't sleep. Hope it hits you the same way it hit me 🎸💫 #originalmusic #singer",
    song: "♫ Original - Mia Strings",
    likes: 389200,
    comments: 7854,
    shares: 19200,
  },
  {
    id: "5",
    uri: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
    thumbnail: require("../assets/images/thumb5.png"),
    creator: "ArtByKai",
    creatorHandle: "@artbykai",
    creatorAvatar: "https://i.pravatar.cc/150?img=24",
    creatorId: MOCK_CREATOR_IDS["@artbykai"],
    caption: "4 hours of work in 45 seconds. Started with a blank wall, ended with a story 🎨 #streetart #mural #art",
    song: "♫ Midnight Rain - Taylor Swift",
    likes: 743100,
    comments: 9203,
    shares: 51400,
  },
  {
    id: "6",
    uri: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    thumbnail: require("../assets/images/thumb6.png"),
    creator: "Flex Nation",
    creatorHandle: "@flexnation",
    creatorAvatar: "https://i.pravatar.cc/150?img=68",
    creatorId: MOCK_CREATOR_IDS["@flexnation"],
    caption: "First time hitting this rooftop gap. My heart was pounding the entire time 🤸 #parkour #extreme #freerunning",
    song: "♫ Power - Kanye West",
    likes: 1200000,
    comments: 23100,
    shares: 87600,
  },
];

export const BASE_VIDEOS: VideoItem[] = MOCK_VIDEOS_RAW.map((v) => ({
  ...v,
  isFollowing: false,
  isReal: false,
}));

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export { formatCount };

function rankScore(v: VideoItem): number {
  return v.likes + v.shares * 2 + v.comments * 0.5;
}

async function fetchRealVideos(): Promise<VideoItem[]> {
  try {
    // select("*") avoids 400s caused by explicitly naming missing columns
    const { data: vids, error } = await supabase
      .from("videos")
      .select("*")
      .limit(30);

    if (error || !vids || vids.length === 0) return [];

    const userIds = [...new Set(vids.map((v: any) => v.user_id as string))];

    // Guard: .in() with empty array returns 400 in PostgREST
    let profileMap = new Map<string, any>();
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", userIds);
      profileMap = new Map((profs ?? []).map((p: any) => [p.id as string, p]));
    }

    return vids.map((v: any): VideoItem => {
      const prof: any = profileMap.get(v.user_id);
      const username = prof?.username ?? "usuario";
      const avatarUrl =
        prof?.avatar_url ??
        `https://api.dicebear.com/9.x/initials/png?seed=${encodeURIComponent(username)}&backgroundColor=FE2C55&textColor=ffffff`;
      const videoUrl = v.url ?? v.video_url ?? "";
      return {
        id: v.id,
        uri: videoUrl,
        thumbnail: { uri: videoUrl },
        creator: username,
        creatorHandle: `@${username}`,
        creatorAvatar: avatarUrl,
        creatorId: v.user_id,
        caption: v.caption ?? "",
        song: "♫ Sonido original",
        likes: v.likes_count ?? 0,
        comments: v.comments_count ?? 0,
        shares: v.shares_count ?? 0,
        isFollowing: false,
        isReal: true,
      };
    });
  } catch {
    return [];
  }
}

const LIKED_KEY = "tokvid_liked";

export function useVideoFeed(followedIds: Set<string>) {
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [realVideos, setRealVideos] = useState<VideoItem[]>([]);

  // Load liked IDs from AsyncStorage
  useEffect(() => {
    AsyncStorage.getItem(LIKED_KEY)
      .then((raw) => { if (raw) setLikedIds(new Set(JSON.parse(raw))); })
      .catch(() => {});
  }, []);

  // Fetch real videos from Supabase on mount
  useEffect(() => {
    fetchRealVideos().then(setRealVideos);
  }, []);

  const toggleLike = useCallback(async (id: string) => {
    setLikedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      AsyncStorage.setItem(LIKED_KEY, JSON.stringify([...next])).catch(() => {});
      return next;
    });
  }, []);

  // Ranked real videos (newest real content first in the feed)
  const rankedReal = [...realVideos].sort((a, b) => rankScore(b) - rankScore(a));

  // Mock IDs that don't overlap with real video IDs
  const realIds = new Set(realVideos.map((v) => v.id));
  const mockFallback = BASE_VIDEOS.filter((v) => !realIds.has(v.id));

  // Combined feed: real videos first, then mock padding
  const combined: VideoItem[] = [...rankedReal, ...mockFallback];

  // Merge follow state
  const videos: VideoItem[] = combined.map((v) => ({
    ...v,
    isFollowing: followedIds.has(v.creatorId),
  }));

  const followingVideos = videos.filter((v) => followedIds.has(v.creatorId));

  // Liked videos (for the liked tab)
  const likedVideos = videos.filter((v) => likedIds.has(v.id));

  return { videos, followingVideos, likedIds, likedVideos, toggleLike };
}
