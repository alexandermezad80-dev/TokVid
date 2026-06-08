import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

export interface VideoItem {
  id: string;
  uri: string;
  thumbnail: any;
  creator: string;
  creatorHandle: string;
  creatorAvatar: string;
  caption: string;
  song: string;
  likes: number;
  comments: number;
  shares: number;
  isFollowing: boolean;
}

const SAMPLE_VIDEOS: VideoItem[] = [
  {
    id: "1",
    uri: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    thumbnail: require("../assets/images/thumb1.png"),
    creator: "Luna Reyes",
    creatorHandle: "@lunareyes",
    creatorAvatar: "https://i.pravatar.cc/150?img=47",
    caption: "Morning dance routine hits different when the sun is just right ✨ #dance #morning #viral",
    song: "♫ Flowers - Miley Cyrus",
    likes: 284700,
    comments: 3421,
    shares: 8902,
    isFollowing: false,
  },
  {
    id: "2",
    uri: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    thumbnail: require("../assets/images/thumb2.png"),
    creator: "Jake Rivera",
    creatorHandle: "@jakerides",
    creatorAvatar: "https://i.pravatar.cc/150?img=13",
    caption: "New skate park just opened downtown and it is INSANE 🛹🔥 #skateboarding #tricks #fyp",
    song: "♫ Bad Habit - Steve Lacy",
    likes: 192300,
    comments: 2109,
    shares: 5670,
    isFollowing: false,
  },
  {
    id: "3",
    uri: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    thumbnail: require("../assets/images/thumb3.png"),
    creator: "Chef Marco",
    creatorHandle: "@chefmarco",
    creatorAvatar: "https://i.pravatar.cc/150?img=59",
    caption: "Secret ramen recipe my grandmother taught me. Takes 6 hours but worth every second 🍜 #cooking #ramen #foodie",
    song: "♫ Lofi Chill Beats",
    likes: 521000,
    comments: 12430,
    shares: 34100,
    isFollowing: true,
  },
  {
    id: "4",
    uri: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    thumbnail: require("../assets/images/thumb4.png"),
    creator: "Mia Strings",
    creatorHandle: "@miastrings",
    creatorAvatar: "https://i.pravatar.cc/150?img=32",
    caption: "Wrote this song last night, couldn't sleep. Hope it hits you the same way it hit me 🎸💫 #originalmusic #singer",
    song: "♫ Original - Mia Strings",
    likes: 389200,
    comments: 7854,
    shares: 19200,
    isFollowing: false,
  },
  {
    id: "5",
    uri: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
    thumbnail: require("../assets/images/thumb5.png"),
    creator: "ArtByKai",
    creatorHandle: "@artbykai",
    creatorAvatar: "https://i.pravatar.cc/150?img=24",
    caption: "4 hours of work in 45 seconds. Started with a blank wall, ended with a story 🎨 #streetart #mural #art",
    song: "♫ Midnight Rain - Taylor Swift",
    likes: 743100,
    comments: 9203,
    shares: 51400,
    isFollowing: true,
  },
  {
    id: "6",
    uri: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    thumbnail: require("../assets/images/thumb6.png"),
    creator: "Flex Nation",
    creatorHandle: "@flexnation",
    creatorAvatar: "https://i.pravatar.cc/150?img=68",
    caption: "First time hitting this rooftop gap. My heart was pounding the entire time 🤸 #parkour #extreme #freerunning",
    song: "♫ Power - Kanye West",
    likes: 1200000,
    comments: 23100,
    shares: 87600,
    isFollowing: false,
  },
];

const LIKED_KEY = "tokvid_liked";
const FOLLOWING_KEY = "tokvid_following";

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export { formatCount };

export function useVideoFeed() {
  const [videos, setVideos] = useState<VideoItem[]>(SAMPLE_VIDEOS);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [followingHandles, setFollowingHandles] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      try {
        const [likedRaw, followRaw] = await Promise.all([
          AsyncStorage.getItem(LIKED_KEY),
          AsyncStorage.getItem(FOLLOWING_KEY),
        ]);
        if (likedRaw) setLikedIds(new Set(JSON.parse(likedRaw)));
        if (followRaw) {
          const follows = new Set<string>(JSON.parse(followRaw));
          setFollowingHandles(follows);
          setVideos((prev) =>
            prev.map((v) => ({ ...v, isFollowing: follows.has(v.creatorHandle) }))
          );
        }
      } catch {}
    };
    load();
  }, []);

  const toggleLike = useCallback(
    async (id: string) => {
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        AsyncStorage.setItem(LIKED_KEY, JSON.stringify([...next])).catch(() => {});
        return next;
      });
      setVideos((prev) =>
        prev.map((v) =>
          v.id === id
            ? { ...v, likes: likedIds.has(id) ? v.likes - 1 : v.likes + 1 }
            : v
        )
      );
    },
    [likedIds]
  );

  const toggleFollow = useCallback(
    async (handle: string) => {
      setFollowingHandles((prev) => {
        const next = new Set(prev);
        if (next.has(handle)) {
          next.delete(handle);
        } else {
          next.add(handle);
        }
        AsyncStorage.setItem(FOLLOWING_KEY, JSON.stringify([...next])).catch(() => {});
        return next;
      });
      setVideos((prev) =>
        prev.map((v) =>
          v.creatorHandle === handle
            ? { ...v, isFollowing: !v.isFollowing }
            : v
        )
      );
    },
    []
  );

  return { videos, likedIds, toggleLike, toggleFollow };
}
