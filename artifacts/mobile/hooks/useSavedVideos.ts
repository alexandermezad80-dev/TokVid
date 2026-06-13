import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { BASE_VIDEOS, VideoItem, mapRowsToVideoItems } from "./useVideoFeed";

/**
 * Resolve a set of saved video IDs into full VideoItems.
 * Demo videos come from BASE_VIDEOS; real uploaded videos are fetched
 * from Supabase by their uuid ids.
 */
async function resolveSavedVideos(ids: Set<string>): Promise<VideoItem[]> {
  if (ids.size === 0) return [];

  const mockSaved = BASE_VIDEOS.filter((v) => ids.has(v.id)).map((v) => ({
    ...v,
    isFollowing: false,
  }));
  const mockIds = new Set(mockSaved.map((v) => v.id));
  const realIds = [...ids].filter((id) => !mockIds.has(id));

  let realSaved: VideoItem[] = [];
  if (realIds.length > 0) {
    const { data } = await supabase.from("videos").select("*").in("id", realIds);
    realSaved = await mapRowsToVideoItems(data ?? []);
  }

  return [...realSaved, ...mockSaved];
}

export function useSavedVideos() {
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savedVideos, setSavedVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSaved = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSavedIds(new Set());
      setSavedVideos([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("saved_videos")
      .select("video_id")
      .eq("user_id", user.id);

    const ids = new Set((data ?? []).map((r: { video_id: string }) => r.video_id));
    setSavedIds(ids);
    setSavedVideos(await resolveSavedVideos(ids));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSaved();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { loadSaved(); });
    return () => sub.subscription.unsubscribe();
  }, [loadSaved]);

  const toggleSave = useCallback(async (videoId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const alreadySaved = savedIds.has(videoId);

    // Optimistic update
    const optimistic = new Set(savedIds);
    alreadySaved ? optimistic.delete(videoId) : optimistic.add(videoId);
    setSavedIds(optimistic);
    setSavedVideos(await resolveSavedVideos(optimistic));

    const { error } = alreadySaved
      ? await supabase
          .from("saved_videos")
          .delete()
          .eq("user_id", user.id)
          .eq("video_id", videoId)
      : await supabase
          .from("saved_videos")
          .insert({ user_id: user.id, video_id: videoId });

    // Roll back if Supabase rejected the change
    if (error) {
      setSavedIds(new Set(savedIds));
      setSavedVideos(await resolveSavedVideos(savedIds));
    }
  }, [savedIds]);

  return { savedIds, savedVideos, toggleSave, loading };
}
