import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useRegistration } from "../context/RegistrationContext";
import { readVideoLikes, setVideoLike } from "../lib/features/feed/videoLikes";
import { supabase } from "../lib/supabase";
import { createDatabaseChannel } from "../lib/realtimeSubscriptions";

export function useFeedVideoLikes(videoIds: string[]) {
  const { user } = useAuth();
  const { completed } = useRegistration();
  const idsKey = JSON.stringify([...new Set(videoIds)].sort());
  const key = `${user?.id ?? "guest"}:${idsKey}`;
  const [state, setState] = useState<{ key: string; counts: Record<string, number>; liked: Set<string> }>({ key, counts: {}, liked: new Set() });
  const [error, setError] = useState("");
  const [operationError, setOperationError] = useState("");
  const epoch = useRef(0);
  const sequence = useRef(0);
  const locks = useRef(new Set<string>());
  const currentState = useRef(state);
  currentState.current = state;
  const reload = useCallback(async () => {
    const currentEpoch = epoch.current;
    const request = ++sequence.current;
    try {
      const result = await readVideoLikes(JSON.parse(idsKey), user?.id);
      if (epoch.current === currentEpoch && sequence.current === request) { setState({ key, ...result }); setError(""); }
    } catch (failure) {
      if (epoch.current === currentEpoch && sequence.current === request) setError(failure instanceof Error ? failure.message : "No se pudieron cargar los Me gusta.");
    }
  }, [key, idsKey, user?.id]);
  useEffect(() => {
    epoch.current++; sequence.current++; locks.current.clear(); setState({ key, counts: {}, liked: new Set() }); setError(""); setOperationError("");
    void reload();
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const invalidate = () => { if (!active) return; clearTimeout(timer); timer = setTimeout(() => { void reload(); }, 100); };
    const channel = createDatabaseChannel(`feed-video-likes:${user?.id ?? "guest"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "feed_video_like_counts" }, invalidate)
      .subscribe(status => { if (!active) return; if (status === "SUBSCRIBED") invalidate(); else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setError("No se pudo actualizar Me gusta en tiempo real. Actualiza el Feed para reintentar."); });
    const appState = AppState.addEventListener("change", next => { if (next === "active") invalidate(); });
    return () => { active = false; epoch.current++; clearTimeout(timer); appState.remove(); void supabase.removeChannel(channel); };
  }, [key, reload, user?.id]);
  useEffect(() => { if (completed) void reload(); }, [completed, reload]);
  const toggleLike = async (videoId: string) => {
    if (!user || locks.current.has(videoId)) return;
    const currentEpoch = epoch.current;
    locks.current.add(videoId); sequence.current++; setOperationError("");
    const desired = !(currentState.current.key === key && currentState.current.liked.has(videoId));
    try {
      const row = await setVideoLike(videoId, desired);
      if (epoch.current !== currentEpoch) return;
      setState(previous => {
        const liked = new Set(previous.liked); if (row.liked) liked.add(row.video_id); else liked.delete(row.video_id);
        const next = { key, liked, counts: { ...previous.counts, [row.video_id]: row.total } }; currentState.current = next; return next;
      });
      await reload();
    } catch (failure) {
      if (epoch.current === currentEpoch) setOperationError(failure instanceof Error ? failure.message : "No se pudo guardar el Me gusta.");
    } finally { if (epoch.current === currentEpoch) locks.current.delete(videoId); }
  };
  return { counts: state.key === key ? state.counts : {}, likedIds: state.key === key ? state.liked : new Set<string>(), error: operationError || error, toggleLike, reload };
}

