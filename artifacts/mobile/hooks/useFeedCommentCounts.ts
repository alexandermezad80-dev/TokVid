import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { supabase } from "../lib/supabase";
import { createDatabaseChannel } from "../lib/realtimeSubscriptions";
import { readCommentCounts } from "../lib/features/comments/services";

// Only replace counter data. Feed geometry, icons, gestures and playback are unchanged.
export function useFeedCommentCounts(videoIds: string[]) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState("");
  const key = JSON.stringify(videoIds);
  useEffect(() => {
    const ids = JSON.parse(key) as string[];
    if (!ids.length) return;
    let active = true;
    let sequence = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = async () => {
      const request = ++sequence;
      try {
        const next = await readCommentCounts(ids);
        if (active && request === sequence) { setCounts(next); setError(""); }
      } catch {
        if (active && request === sequence) setError("No se pudieron comprobar los contadores de comentarios. Vuelve a abrir el panel para reintentar.");
      }
    };
    const invalidate = () => { if (!active) return; clearTimeout(timer); timer = setTimeout(() => { void refresh(); }, 100); };
    void refresh();
    const channel = createDatabaseChannel("feed-comment-counts")
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, invalidate)
      .subscribe(status => {
        if (!active) return;
        if (status === "SUBSCRIBED") invalidate();
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setError("No se pudieron mantener los contadores de comentarios en tiempo real. Abre el panel para volver a comprobarlos.");
      });
    const appState = AppState.addEventListener("change", next => { if (next === "active") invalidate(); });
    return () => { active = false; clearTimeout(timer); appState.remove(); void supabase.removeChannel(channel); };
  }, [key]);
  return { counts, error };
}

