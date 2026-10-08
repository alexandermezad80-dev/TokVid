import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { supabase } from "../lib/supabase";
import { mapRowsToVideoItems, VideoItem } from "./useVideoFeed";

export function usePublishedMedia({ userId, search = "", enabled = true }: { userId?: string; search?: string; enabled?: boolean } = {}) {
  const [items, setItems] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const sequence = useRef(0);
  const offset = useRef(0);
  const busy = useRef(false);
  const fetchPage = useCallback(async (append = false) => {
    if (!enabled || (append && busy.current)) return;
    const request = ++sequence.current;
    busy.current = true; setLoading(true); setError(null);
    const start = append ? offset.current : 0;
    try {
      let query = supabase.from("videos").select("*").order("created_at", { ascending: false }).order("id", { ascending: false }).range(start, start + 29);
      if (userId) query = query.eq("user_id", userId);
      if (search.trim()) query = query.ilike("caption", `%${search.trim().replace(/[\\%_]/g, "\\$&")}%`);
      const { data, error: failure } = await query;
      if (failure) throw failure;
      const mapped = await mapRowsToVideoItems(data ?? []);
      if (sequence.current !== request) return;
      setItems(old => append ? [...new Map([...old, ...mapped].map(item => [item.id, item])).values()] : mapped);
      offset.current = start + mapped.length; setHasMore(mapped.length === 30);
    } catch { if (sequence.current === request) setError("No pudimos cargar las publicaciones. Inténtalo de nuevo."); }
    finally { if (sequence.current === request) { busy.current = false; setLoading(false); } }
  }, [userId, search, enabled]);
  useFocusEffect(useCallback(() => { setItems([]); offset.current = 0; setHasMore(false); void fetchPage(); return () => { sequence.current++; busy.current = false; }; }, [fetchPage]));
  return { items, loading, error, hasMore, refresh: () => fetchPage(), loadMore: () => fetchPage(true) };
}
