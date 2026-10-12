import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import RegistrationSheet from "../components/RegistrationSheet";
import { applyPendingAction } from "../lib/features/auth/services/pendingAction";
import { installRegistrationHandler, RegistrationIntent } from "../lib/features/auth/services/registrationBridge";

const KEY = "tokvid_seamless_pending_v1";
const Context = createContext<{
  visible: boolean;
  completed: RegistrationIntent | null;
  tabBarHeight: number;
  setTabBarHeight: (height: number) => void;
  setFeedContext: (videoId: string, position: number, wasPaused: boolean) => void;
  registerPlayback: (videoId: string, read: () => { position: number; wasPaused: boolean }) => void;
  acknowledge: () => void;
  getAuthDestination: () => "/(tabs)";
} | null>(null);

export function RegistrationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState<RegistrationIntent | null>(null);
  const [completed, setCompleted] = useState<RegistrationIntent | null>(null);
  const [ready, setReady] = useState(false);
  const [tabBarHeight, setTabBarHeight] = useState(56);
  const feedContext = useRef<{ videoId: string; position: number; wasPaused: boolean } | null>(null);
  const playback = useRef<{ videoId: string; read: () => { position: number; wasPaused: boolean } } | null>(null);
  const activeRequest = useRef<string | null>(null);
  const processing = useRef(false);
  const storageWrite = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(KEY).then(raw => {
      if (!active) return;
      if (raw && !activeRequest.current) {
        try {
          const intent = JSON.parse(raw) as RegistrationIntent;
          if (["register", "like", "follow", "favorite", "comment", "profile"].includes(intent.kind)) {
            activeRequest.current = intent.requestId ?? null;
            setPending(intent);
            setVisible(true);
          }
        } catch { /* Ignore an invalid cached intention. */ }
      }
      setReady(true);
    }).catch(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    installRegistrationHandler(intent => {
      if (user) return;
      const snapshot = playback.current ? { videoId: playback.current.videoId, ...playback.current.read() } : feedContext.current;
      const next = { ...snapshot, ...intent, requestId: `${Date.now()}-${Math.random()}` };
      activeRequest.current = next.requestId;
      setPending(next);
      setVisible(true);
      storageWrite.current = storageWrite.current.catch(() => {}).then(() => AsyncStorage.setItem(KEY, JSON.stringify(next)));
    });
    return () => installRegistrationHandler(null);
  }, [user]);

  const cancel = useCallback(() => {
    activeRequest.current = null;
    setVisible(false);
    setPending(null);
    storageWrite.current = storageWrite.current.catch(() => {}).then(() => AsyncStorage.removeItem(KEY));
  }, []);

  useEffect(() => {
    if (!ready || !user || !pending || processing.current) return;
    processing.current = true;
    const requestId = pending.requestId;
    (async () => {
      try {
        for (let attempt = 0; ; attempt++) {
          try { await applyPendingAction(user.id, pending); break; }
          catch (error) {
            if (attempt >= 2 || activeRequest.current !== requestId) throw error;
            await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 1000));
          }
        }
        if (activeRequest.current !== requestId) return;
        setCompleted(pending);
        setVisible(false);
        setPending(null);
        activeRequest.current = null;
        storageWrite.current = storageWrite.current.catch(() => {}).then(() => AsyncStorage.removeItem(KEY));
        // All guest entries, including Profile, resume the captured Feed context.
        // Profile opens only on a new tap after authentication.
      } catch {
        // Restore the feed without claiming success; discard a failed action.
        if (activeRequest.current === requestId) {
          setVisible(false);
          setCompleted({ ...pending, kind: "register" });
          setPending(null);
          activeRequest.current = null;
          storageWrite.current = storageWrite.current.catch(() => {}).then(() => AsyncStorage.removeItem(KEY));
        }
      } finally { processing.current = false; }
    })();
  }, [ready, user, pending]);

  const setFeedContext = useCallback((videoId: string, position: number, wasPaused: boolean) => {
    feedContext.current = { videoId, position, wasPaused };
  }, []);
  const registerPlayback = useCallback((videoId: string, read: () => { position: number; wasPaused: boolean }) => { playback.current = { videoId, read }; }, []);
  const getAuthDestination = useCallback((): "/(tabs)" => "/(tabs)", []);
  const acknowledge = useCallback(() => setCompleted(null), []);
  return (
    <Context.Provider value={{ visible, completed, tabBarHeight, setTabBarHeight, setFeedContext, acknowledge, getAuthDestination, registerPlayback }}>
      {children}
      <RegistrationSheet visible={visible && !user} onClose={cancel} tabBarHeight={tabBarHeight}
        beforeAuth={() => storageWrite.current} />
    </Context.Provider>
  );
}
export function useRegistration() {
  const value = useContext(Context);
  if (!value) throw new Error("RegistrationProvider is missing");
  return value;
}
