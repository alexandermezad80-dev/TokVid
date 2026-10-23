import { useRegistration } from "../context/RegistrationContext";
import { requestRegistration } from "../lib/features/auth/services/registrationBridge";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { router } from "expo-router";
import { BASE_VIDEOS, VideoItem, mapRowsToVideoItems } from "./useVideoFeed";

/**
 * Resolve a set of saved video IDs into full VideoItems.
 * Demo videos come from BASE_VIDEOS; real uploaded videos are fetched
 * from Supabase by their uuid ids.
 */
export async function resolveSavedVideos(ids: Set<string>): Promise<VideoItem[]> {
  if (ids.size === 0) return [];

  const mockSaved = BASE_VIDEOS.filter((v) => ids.has(v.id)).map((v) => ({
    ...v,
    isFollowing: false,
  }));
  const mockIds = new Set(mockSaved.map((v) => v.id));
  const realIds = [...ids].filter((id) => !mockIds.has(id));

  let realSaved: VideoItem[] = [];
  if (realIds.length > 0) {
    const { data, error } = await supabase.from("videos").select("*").in("id", realIds);
    if (error) throw error; // An unavailable lookup is not an empty saved list.
    realSaved = await mapRowsToVideoItems(data ?? []);
  }

  return [...realSaved, ...mockSaved];
}

export function useSavedVideos() {
  const { completed } = useRegistration();
  const requestSequence = useRef(0);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savedVideos, setSavedVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mutationInFlight = useRef(false);

  const loadSaved = useCallback(async () => {
    const request = ++requestSequence.current;
    setLoading(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (request !== requestSequence.current) return;
      if (!user) {
        setSavedIds(new Set());
        setSavedVideos([]);
        setError(null);
        return;
      }
      const { data, error: listError } = await supabase
        .from("saved_videos")
        .select("video_id")
        .eq("user_id", user.id);
      if (listError) throw listError;
      const ids = new Set<string>((data ?? []).map((r: { video_id: string }) => r.video_id));
      const resolved = await resolveSavedVideos(ids);
      if (request !== requestSequence.current) return;
      setSavedIds(ids);
      setSavedVideos(resolved);
      setError(null);
    } catch (failure) {
      if (request === requestSequence.current) {
        // Preserve the last confirmed list on a failed read, not an invented empty result.
        setError("No pudimos actualizar los guardados. Inténtalo de nuevo.");
      }
      throw failure;
    } finally {
      if (request === requestSequence.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSaved().catch(() => {});
    const { data: sub } = supabase.auth.onAuthStateChange(() => { void loadSaved().catch(() => {}); });
    return () => { requestSequence.current++; sub.subscription.unsubscribe(); };
  }, [loadSaved, completed]);

  const toggleSave = useCallback(async (videoId: string) => {
    if (mutationInFlight.current) return;
    mutationInFlight.current = true;
    let request: number | null = null;
    const originalIds = new Set(savedIds);
    const originalVideos = savedVideos;
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) {
        requestRegistration();
        return;
      }
      request = ++requestSequence.current; // A prior read must not overwrite the change.
      const alreadySaved = originalIds.has(videoId);
      const optimistic = new Set(originalIds);
      alreadySaved ? optimistic.delete(videoId) : optimistic.add(videoId);
      setSavedIds(optimistic);
      setError(null);
      const resolved = await resolveSavedVideos(optimistic);
      if (request !== requestSequence.current) return;
      setSavedVideos(resolved);
      const { error: writeError } = alreadySaved
        ? await supabase.from("saved_videos").delete().eq("user_id", user.id).eq("video_id", videoId)
        : await supabase.from("saved_videos").insert({ user_id: user.id, video_id: videoId });
      if (writeError) throw writeError;
    } catch {
      if (request === null || request === requestSequence.current) {
        setSavedIds(originalIds);
        setSavedVideos(originalVideos);
        setError("No se pudo guardar el favorito. Comprueba tu conexión e inténtalo de nuevo.");
      }
    } finally {
      mutationInFlight.current = false;
    }
  }, [savedIds, savedVideos]);

  return { savedIds, savedVideos, toggleSave, loading, error, refresh: loadSaved };
}
