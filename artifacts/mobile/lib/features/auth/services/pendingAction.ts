import { setDemoFollow } from "./demoFollows";
import { supabase } from "../../../supabase";
import type { RegistrationIntent } from "./registrationBridge";

// Ensures the requested state; a replay must never toggle a completed action off.
export async function applyPendingAction(userId: string, intent: RegistrationIntent) {
  if (intent.kind === "like" || intent.kind === "favorite") {
    if (!intent.videoId) throw new Error("Missing video context");
    const { error } = await supabase.from(intent.kind === "like" ? "video_likes" : "saved_videos")
      .upsert({ user_id: userId, video_id: intent.videoId }, { onConflict: "user_id,video_id", ignoreDuplicates: true });
    if (error) throw error;
  } else if (intent.kind === "follow") {
    if (!intent.creatorId) throw new Error("Missing creator context");
    // Demo creators are placeholders, not Auth identities. Their preview state
    // stays on this device; real creator follows are persisted under RLS.
    if (intent.isDemo) { await setDemoFollow(userId, intent.creatorId, true); return; }
    if (intent.creatorId === userId) return;
    const { error } = await supabase.from("follows").upsert({
      follower_id: userId, following_id: intent.creatorId,
    }, { onConflict: "follower_id,following_id", ignoreDuplicates: true });
    if (error) throw error;
  }
  // Comment is only a cue. Other controls, including Profile, only register.
}
