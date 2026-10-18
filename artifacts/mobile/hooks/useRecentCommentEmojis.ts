import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import { DEFAULT_COMMENT_EMOJIS, normalizeCommentEmojis, rememberCommentEmojis } from "../lib/commentRecentEmojis";

let storageQueue: Promise<unknown> = Promise.resolve();
export function useRecentCommentEmojis(accountId?: string) {
  const key = `tokvid:comment-emojis:v1:${accountId ?? "guest"}`;
  const [recent, setRecent] = useState(DEFAULT_COMMENT_EMOJIS);
  const state = useRef({ key, values: DEFAULT_COMMENT_EMOJIS, loaded: false, duringLoad: [] as string[] });
  if (state.current.key !== key) state.current = { key, values: DEFAULT_COMMENT_EMOJIS, loaded: false, duringLoad: [] };
  const persist = (values: string[]) => {
    const encoded = JSON.stringify(values);
    storageQueue = storageQueue.catch(() => {}).then(() => AsyncStorage.setItem(key, encoded)).catch(() => {});
  };
  useEffect(() => {
    let active = true;
    setRecent(DEFAULT_COMMENT_EMOJIS);
    void AsyncStorage.getItem(key).then(raw => {
      let loaded: unknown;
      try { loaded = raw ? JSON.parse(raw) : undefined; } catch { loaded = undefined; }
      return normalizeCommentEmojis(loaded);
    }).catch(() => [...DEFAULT_COMMENT_EMOJIS]).then(loaded => {
      if (!active || state.current.key !== key) return;
      const values = rememberCommentEmojis(loaded, state.current.duringLoad);
      const touched = state.current.duringLoad.length > 0;
      state.current = { key, values, loaded: true, duringLoad: [] };
      setRecent(values);
      if (touched) persist(values);
    });
    return () => { active = false; };
  }, [key]);
  const remember = (used: string[]) => {
    if (!used.length) return;
    const current = state.current;
    const values = rememberCommentEmojis(current.values, used);
    state.current = { ...current, values, duringLoad: current.loaded ? [] : [...current.duringLoad, ...used].slice(-50) };
    setRecent(values);
    if (current.loaded) persist(values);
  };
  return { recent, remember };
}
