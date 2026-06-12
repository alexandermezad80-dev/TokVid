import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { BASE_VIDEOS, VideoItem } from "./useVideoFeed";

export function useSavedVideos() {
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const loadSaved = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from("saved_videos")
      .select("video_id")
      .eq("user_id", user.id);

    if (data) {
      setSavedIds(new Set(data.map((r: { video_id: string }) => r.video_id)));
    }
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

    setSavedIds((prev) => {
      const next = new Set(prev);
      alreadySaved ? next.delete(videoId) : next.add(videoId);
      return next;
    });

    try {
      if (alreadySaved) {
        await supabase
          .from("saved_videos")
          .delete()
          .eq("user_id", user.id)
          .eq("video_id", videoId);
      } else {
        await supabase
          .from("saved_videos")
          .insert({ user_id: user.id, video_id: videoId });
      }
    } catch {
      setSavedIds((prev) => {
        const next = new Set(prev);
        alreadySaved ? next.add(videoId) : next.delete(videoId);
        return next;
      });
    }
  }, [savedIds]);

  const savedVideos: VideoItem[] = BASE_VIDEOS
    .filter((v) => savedIds.has(v.id))
    .map((v) => ({ ...v, isFollowing: false }));

  return { savedIds, savedVideos, toggleSave, loading };
}
