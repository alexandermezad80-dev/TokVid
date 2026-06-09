import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const router = Router();

function getSupabaseAdmin() {
  // Env vars are inverted in this Replit project:
  // EXPO_PUBLIC_SUPABASE_ANON_KEY actually holds the URL (starts with "https://")
  // EXPO_PUBLIC_SUPABASE_URL actually holds the anon key
  const c1 = process.env["EXPO_PUBLIC_SUPABASE_URL"] ?? "";
  const c2 = process.env["EXPO_PUBLIC_SUPABASE_ANON_KEY"] ?? "";
  const realUrl = c1.startsWith("http") ? c1 : c2;
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";

  return createClient(realUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const SendSchema = z.object({
  userId: z.string().uuid(),
  type: z.enum(["like", "comment", "follow", "mention", "system"]),
  message: z.string().min(1).max(500),
  actorId: z.string().uuid().optional(),
  actorName: z.string().optional(),
  actorAvatar: z.string().optional(),
  data: z.record(z.unknown()).optional(),
});

// POST /api/notifications/send
router.post("/send", async (req, res) => {
  const parsed = SendSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload", details: parsed.error.issues });
    return;
  }

  const { userId, type, message, actorId, actorName, actorAvatar, data } = parsed.data;
  const supabase = getSupabaseAdmin();

  // 1. Insert notification record
  const { data: notif, error: insertError } = await supabase
    .from("notifications")
    .insert({
      user_id: userId,
      actor_id: actorId ?? null,
      actor_name: actorName ?? null,
      actor_avatar: actorAvatar ?? null,
      type,
      message,
      data: data ?? {},
    })
    .select()
    .single();

  if (insertError) {
    req.log.error({ err: insertError }, "Failed to insert notification");
    res.status(500).json({ error: "Failed to create notification" });
    return;
  }

  // 2. Fetch push token
  const { data: profile } = await supabase
    .from("profiles")
    .select("push_token")
    .eq("id", userId)
    .single();

  const pushToken = profile?.push_token;

  if (pushToken && pushToken.startsWith("ExponentPushToken")) {
    // 3. Send via Expo Push API
    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: pushToken,
          sound: "default",
          title: actorName ?? "Tokvid",
          body: message,
          data: { notificationId: notif.id, type, ...(data ?? {}) },
          badge: 1,
          channelId: "default",
        }),
      });
      const pushResult = await response.json();
      req.log.info({ pushResult }, "Push notification sent");
    } catch (err) {
      req.log.warn({ err }, "Push send failed (non-fatal)");
    }
  }

  res.json({ ok: true, notificationId: notif.id });
});

export default router;
