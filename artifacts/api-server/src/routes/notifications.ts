import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const router = Router();

function getSupabaseConfig() {
  // Env var names are inverted in this project:
  // EXPO_PUBLIC_SUPABASE_ANON_KEY may actually hold the URL (starts with "https://")
  // EXPO_PUBLIC_SUPABASE_URL may actually hold the anon key
  const c1 = process.env["EXPO_PUBLIC_SUPABASE_URL"] ?? "";
  const c2 = process.env["EXPO_PUBLIC_SUPABASE_ANON_KEY"] ?? "";
  return {
    url: c1.startsWith("http") ? c1 : c2,
    anonKey: c1.startsWith("http") ? c2 : c1,
    serviceKey: process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "",
  };
}

function getSupabaseAdmin() {
  const { url, serviceKey } = getSupabaseConfig();
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function authenticateRequest(req: { headers: { authorization?: string } }) {
  const authorization = req.headers.authorization ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  if (!match) return null;

  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) return null;

  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${match[1]}` } },
  });

  const { data, error } = await client.auth.getUser(match[1]);
  if (error || !data.user) return null;
  return data.user;
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
  const actor = await authenticateRequest(req);
  if (!actor) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const parsed = SendSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload", details: parsed.error.issues });
    return;
  }

  const { userId, type, message, data } = parsed.data;
  const supabase = getSupabaseAdmin();

  // The authenticated user is always the actor. Client-supplied actor identity
  // is intentionally ignored so it cannot be spoofed.
  const { data: actorProfile } = await supabase
    .from("profiles")
    .select("username, avatar_url")
    .eq("id", actor.id)
    .single();

  const actorName = actorProfile?.username ?? null;
  const actorAvatar = actorProfile?.avatar_url ?? null;

  // 1. Insert notification record
  const { data: notif, error: insertError } = await supabase
    .from("notifications")
    .insert({
      user_id: userId,
      actor_id: actor.id,
      actor_name: actorName,
      actor_avatar: actorAvatar,
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
