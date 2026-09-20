import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const router = Router();

function getSupabaseConfig() {
  const url = process.env["EXPO_PUBLIC_SUPABASE_URL"] ?? "";
  const anonKey = process.env["EXPO_PUBLIC_SUPABASE_ANON_KEY"] ?? "";
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";

  if (!url.startsWith("http") || !anonKey || !serviceKey) {
    throw new Error("Supabase server configuration is incomplete");
  }

  return { url, anonKey, serviceKey };
}

function getSupabaseAdmin() {
  const { url, serviceKey } = getSupabaseConfig();

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function getSupabaseAuthClient() {
  const { url, anonKey } = getSupabaseConfig();

  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function getBearerToken(req: Parameters<Parameters<typeof router.post>[1]>[0]) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

const SendSchema = z.object({
  userId: z.string().uuid(),
  type: z.enum(["like", "comment", "follow", "mention", "system", "message"]),
  message: z.string().min(1).max(500),
  actorId: z.string().uuid().optional(),
  actorName: z.string().optional(),
  actorAvatar: z.string().optional(),
  data: z.record(z.unknown()).optional(),
});

router.post("/send", async (req, res) => {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const parsed = SendSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload", details: parsed.error.issues });
    return;
  }

  const { userId, type, message, actorId, actorName, actorAvatar, data } = parsed.data;
  const supabase = getSupabaseAdmin();
  const authClient = getSupabaseAuthClient();

  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) {
    res.status(401).json({ error: "Invalid authentication token" });
    return;
  }

  const callerId = authData.user.id;

  if (!actorId || actorId !== callerId) {
    res.status(403).json({ error: "actorId must match the authenticated user" });
    return;
  }

  if (type === "system") {
    res.status(403).json({ error: "System notifications are server-only" });
    return;
  }

  if (type === "follow") {
    if (userId === callerId) {
      res.status(400).json({ error: "Self-follow notifications are not allowed" });
      return;
    }
  } else if (type === "like" || type === "comment" || type === "mention") {
    const videoId = typeof data?.videoId === "string" ? data.videoId : null;
    if (!videoId) {
      res.status(400).json({ error: "videoId is required for this notification type" });
      return;
    }

    const { data: video, error: videoError } = await supabase
      .from("videos")
      .select("user_id")
      .eq("id", videoId)
      .maybeSingle();

    if (videoError || !video || video.user_id !== userId) {
      res.status(403).json({ error: "Notification recipient is not the video owner" });
      return;
    }
  } else if (type === "message") {
    const conversationId =
      typeof data?.conversationId === "string" ? data.conversationId : null;

    if (!conversationId) {
      res.status(400).json({ error: "conversationId is required for message notifications" });
      return;
    }

    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("user1_id, user2_id")
      .eq("id", conversationId)
      .maybeSingle();

    if (
      conversationError ||
      !conversation ||
      (conversation.user1_id !== callerId && conversation.user2_id !== callerId) ||
      userId === callerId ||
      (conversation.user1_id !== userId && conversation.user2_id !== userId)
    ) {
      res.status(403).json({ error: "Notification recipient is not a conversation participant" });
      return;
    }
  }

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("push_token")
    .eq("id", userId)
    .single();

  const pushToken = profile?.push_token;

  if (pushToken && pushToken.startsWith("ExponentPushToken")) {
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
