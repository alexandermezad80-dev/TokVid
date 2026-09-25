import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";
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
/**\n * The feed uses only videos persisted in Supabase. Demo videos are kept out of\n * the production feed so an empty database is represented by a real empty state.\n */\nfunction formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export { formatCount };

function rankScore(v: VideoItem): number {
  return v.likes + v.shares * 2 + v.comments * 0.5;
}

/**
 * Maps raw `videos` rows into VideoItem objects, joining their author profiles.
 * Shared by the main feed and the hashtag (TagScreen) feed.
 */
export async function mapRowsToVideoItems(vids: any[]): Promise<VideoItem[]> {
  if (!vids || vids.length === 0) return [];

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
}

const PAGE_SIZE = 12;

function normalizeInterest(value: string): string {
  return value
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .trim();
}

function interestScore(video: VideoItem, interests: string[], tags: string[] = []): number {
  if (interests.length === 0) return 0;
  const haystack = normalizeInterest(
    [video.caption, ...tags].join(" ")
  );
  return interests.reduce((score, interest) => {
    const normalized = normalizeInterest(interest);
    return normalized && haystack.includes(normalized) ? score + 1 : score;
  }, 0);
}

async function fetchRealVideos(page = 0, interests: string[] = []): Promise<VideoItem[]> {
  try {
    // select("*") avoids 400s caused by explicitly naming missing columns
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data: vids, error } = await supabase
      .from("videos")
      .select("*, video_hashtags(hashtag:hashtags(tag))")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error || !vids || vids.length === 0) return [];

    const mapped = await mapRowsToVideoItems(vids);
    if (interests.length === 0) return mapped;

    const tagMap = new Map<string, string[]>();
    for (const row of vids as any[]) {
      const tags = (row.video_hashtags ?? [])
        .map((relation: any) => relation?.hashtag?.tag)
        .filter((tag: any): tag is string => typeof tag === "string");
      tagMap.set(row.id, tags);
    }

    return mapped.sort(
      (a, b) =>
        interestScore(b, interests, tagMap.get(b.id) ?? []) -
        interestScore(a, interests, tagMap.get(a.id) ?? []) ||
        rankScore(b) - rankScore(a)
    );
  } catch {
    return [];
  }
}

const LIKED_KEY = "tokvid_liked";

export function useVideoFeed(followedIds: Set<string>) {
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [realVideos, setRealVideos] = useState<VideoItem[]>([]);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [likedLoading, setLikedLoading] = useState(true);
  const [interests, setInterests] = useState<string[]>([]);
  const pageRef = useRef(0);

  const removeVideo = useCallback((id: string) => {
    setRemovedIds((prev) => new Set([...prev, id]));
  }, []);

  const loadLikedIds = useCallback(async () => {
    setLikedLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const raw = await AsyncStorage.getItem(LIKED_KEY);
        if (raw) setLikedIds(new Set(JSON.parse(raw)));
      } else {
        const { data, error } = await supabase
          .from("video_likes")
          .select("video_id")
          .eq("user_id", user.id);
        if (!error && data) {
          setLikedIds(new Set((data as { video_id: string }[]).map((row) => row.video_id)));
        }
      }
    } catch {
      // fallback to cached likes
      const raw = await AsyncStorage.getItem(LIKED_KEY);
      if (raw) setLikedIds(new Set(JSON.parse(raw)));
    } finally {
      setLikedLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLikedIds();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      loadLikedIds();
    });
    return () => sub.subscription.unsubscribe();
  }, [loadLikedIds]);

  const loadPage = useCallback(async (nextPage = 0) => {
    setError(null);
    if (nextPage === 0) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const items = await fetchRealVideos(nextPage);
      if (nextPage === 0) {
        setRealVideos(items);
      } else {
        setRealVideos((prev) => [...prev, ...items]);
      }
      setPage(nextPage);
      pageRef.current = nextPage;
      setHasMore(items.length === PAGE_SIZE);
    } catch (err) {
      setError("No se pudo cargar el feed");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadInterestsAndFeed = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      let userInterests: string[] = [];

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("interests")
          .eq("id", user.id)
          .maybeSingle();

        userInterests = Array.isArray(profile?.interests)
          ? profile.interests.filter((value: any): value is string => typeof value === "string")
          : [];
      }

      if (cancelled) return;
      setInterests(userInterests);

      setError(null);
      setIsRefreshing(true);
      try {
        const items = await fetchRealVideos(0, userInterests);
        if (!cancelled) {
          setRealVideos(items);
          setPage(0);
          pageRef.current = 0;
          setHasMore(items.length === PAGE_SIZE);
        }
      } catch {
        if (!cancelled) setError("No se pudo cargar el feed");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    loadInterestsAndFeed();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadMore = useCallback(() => {
    if (isLoading || !hasMore) return;
    loadPage(pageRef.current + 1);
  }, [hasMore, isLoading, loadPage]);

  const refreshFeed = useCallback(() => {
    if (isRefreshing) return;
    loadPage(0);
  }, [isRefreshing, loadPage]);

  const toggleLike = useCallback(async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    let alreadyLiked = false;

    setLikedIds((prev) => {
      alreadyLiked = prev.has(id);
      const next = new Set(prev);
      alreadyLiked ? next.delete(id) : next.add(id);
      return next;
    });

    if (!user) {
      const next = new Set(likedIds);
      alreadyLiked ? next.delete(id) : next.add(id);
      AsyncStorage.setItem(LIKED_KEY, JSON.stringify([...next])).catch(() => {});
      return;
    }

    if (alreadyLiked) {
      const { error } = await supabase
        .from("video_likes")
        .delete()
        .match({ user_id: user.id, video_id: id });
      if (error) {
        setLikedIds((prev) => {
          const next = new Set(prev);
          next.add(id);
          return next;
        });
      }
      return;
    }

    const { error } = await supabase.from("video_likes").insert({
      user_id: user.id,
      video_id: id,
    });
    if (error) {
      setLikedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      return;
    }

    const { data: video } = await supabase
      .from("videos")
      .select("user_id")
      .eq("id", id)
      .maybeSingle();

    if (video?.user_id && video.user_id !== user.id) {
      await supabase.from("notifications").insert({
        user_id: video.user_id,
        actor_id: user.id,
        actor_name: user.user_metadata?.username ?? user.user_metadata?.display_name ?? null,
        actor_avatar: null,
        type: "like",
        message: "Le dio me gusta a tu video",
        data: { video_id: id },
      });
    }
  }, [likedIds]);

  // Only persisted videos belong in the feed. Interests influence ranking when available.\n  const rankedReal = [...realVideos].sort((a, b) => rankScore(b) - rankScore(a));\n  const combined: VideoItem[] = rankedReal.filter(\n    (v) => !removedIds.has(v.id)\n  );\n\n  // Merge follow state.\n  const videos: VideoItem[] = combined.map((v) => ({\n    ...v,\n    isFollowing: followedIds.has(v.creatorId),\n  }));\n\n  const followingVideos = videos.filter((v) => followedIds.has(v.creatorId));\n\n  // Liked videos (for the liked tab).\n  const likedVideos = videos.filter((v) => likedIds.has(v.id));\n\n  return {
    videos,
    followingVideos,
    likedIds,
    likedVideos,
    toggleLike,
    removeVideo,
    loadMore,
    refreshFeed,
    hasMore,
    isLoading,
    isRefreshing,
    error,
    likedLoading,
  };
}
