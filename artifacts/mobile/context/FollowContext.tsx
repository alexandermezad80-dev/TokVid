import { readDemoFollows, setDemoFollow } from "../lib/features/auth/services/demoFollows";
import { useRegistration } from "./RegistrationContext";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";

interface FollowContextValue {
  followedIds: Set<string>;
  isFollowing: (creatorId: string) => boolean;
  toggleFollow: (creatorId: string) => Promise<void>;
  loadingIds: Set<string>;
}

const FollowContext = createContext<FollowContextValue | null>(null);

export function FollowProvider({ children }: { children: React.ReactNode }) {
  const { user, requireAuth } = useAuth();
  const { completed } = useRegistration();
  const loadSequence = useRef(0);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const request = ++loadSequence.current;
    if (!user) {
      setFollowedIds(new Set());
      return;
    }
    supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id)
      .then(async ({ data }) => {
        if (data) {
          const ids = new Set([...data.map((r) => r.following_id as string), ...await readDemoFollows(user.id)]);
          if (request === loadSequence.current) setFollowedIds(ids);
        }
      });
  }, [user, completed]);

  const isFollowing = useCallback(
    (creatorId: string) => followedIds.has(creatorId),
    [followedIds]
  );

  const toggleFollow = useCallback(
    async (creatorId: string) => {
      const currentUser = user ?? await requireAuth();
      if (!currentUser || creatorId === currentUser.id) return;

      const alreadyFollowing = followedIds.has(creatorId);

      // Optimistic update
      setFollowedIds((prev) => {
        const next = new Set(prev);
        alreadyFollowing ? next.delete(creatorId) : next.add(creatorId);
        return next;
      });
      setLoadingIds((prev) => new Set(prev).add(creatorId));

      if (/^([1-6])\1{7}-/.test(creatorId)) {
        try { await setDemoFollow(currentUser.id, creatorId, !alreadyFollowing); }
        catch { setFollowedIds(prev => { const next = new Set(prev); alreadyFollowing ? next.add(creatorId) : next.delete(creatorId); return next; }); }
        setLoadingIds(prev => { const next = new Set(prev); next.delete(creatorId); return next; });
        return;
      }
      let error = null;

      if (alreadyFollowing) {
        ({ error } = await supabase
          .from("follows")
          .delete()
          .match({ follower_id: currentUser.id, following_id: creatorId }));
      } else {
        ({ error } = await supabase
          .from("follows")
          .insert({ follower_id: currentUser.id, following_id: creatorId }));
      }

      if (!error && !alreadyFollowing) {
        await supabase.from("notifications").insert({
          user_id: creatorId,
          actor_id: currentUser.id,
          actor_name: currentUser.user_metadata?.username ?? currentUser.user_metadata?.display_name ?? null,
          actor_avatar: null,
          type: "follow",
          message: "Comenzó a seguirte",
          data: { actorId: currentUser.id },
        });
      }

      if (error) {
        setFollowedIds((prev) => {
          const next = new Set(prev);
          alreadyFollowing ? next.add(creatorId) : next.delete(creatorId);
          return next;
        });
      }

      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(creatorId);
        return next;
      });
    },
    [user, followedIds, requireAuth]
  );

  return (
    <FollowContext.Provider value={{ followedIds, isFollowing, toggleFollow, loadingIds }}>
      {children}
    </FollowContext.Provider>
  );
}

export function useFollow() {
  const ctx = useContext(FollowContext);
  if (!ctx) throw new Error("useFollow must be used within FollowProvider");
  return ctx;
}
