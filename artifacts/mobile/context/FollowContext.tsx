import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { supabase } from "../lib/supabase";
import { toggleFollow as updateFollow, type ToggleFollowResult } from "../lib/video/toggleFollow";
import { useAuth } from "./AuthContext";

interface FollowContextValue {
  followedIds: Set<string>;
  isFollowing: (creatorId: string) => boolean;
  toggleFollow: (creatorId: string) => Promise<void>;
  loadingIds: Set<string>;
}

const FollowContext = createContext<FollowContextValue | null>(null);

export function FollowProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      setFollowedIds(new Set());
      return;
    }
    supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id)
      .then(({ data }) => {
        if (data) {
          setFollowedIds(new Set(data.map((r) => r.following_id as string)));
        }
      });
  }, [user]);

  const isFollowing = useCallback(
    (creatorId: string) => followedIds.has(creatorId),
    [followedIds]
  );

  const toggleFollow = useCallback(
    async (creatorId: string) => {
      if (!user) return;

      const alreadyFollowing = followedIds.has(creatorId);

      // Optimistic update
      setFollowedIds((prev) => {
        const next = new Set(prev);
        alreadyFollowing ? next.delete(creatorId) : next.add(creatorId);
        return next;
      });
      setLoadingIds((prev) => new Set(prev).add(creatorId));

      let result: ToggleFollowResult;

      try {
        result = await updateFollow(
          {
            userId: user.id,
            creatorId,
            following: alreadyFollowing,
          },
          supabase,
        );
      } catch {
        result = {
          following: alreadyFollowing,
          error: "No se pudo actualizar el seguimiento",
        };
      }

      if (result.error) {
        // Roll back the optimistic update when the database operation fails.
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
    [user, followedIds]
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
