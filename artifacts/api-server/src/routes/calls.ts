import { Router, type Request } from "express";
import { createHash } from "node:crypto";
import { RtcTokenBuilder } from "agora-token";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const router = Router();

function getAgoraConfig() {
  const appId = process.env["AGORA_APP_ID"] ?? "";
  const appCertificate = process.env["AGORA_APP_CERTIFICATE"] ?? "";

  if (!appId || !appCertificate) {
    throw new Error("Agora server configuration is incomplete");
  }

  return { appId, appCertificate };
}

function getAgoraUid(userId: string) {
  const digest = createHash("sha256").update(userId).digest();
  const uid = digest.readUInt32BE(0) >>> 0;
  return uid === 0 ? 1 : uid;
}

const AGORA_TOKEN_EXPIRE_SECONDS = 60 * 60;

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

function getBearerToken(req: Request) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

async function authenticate(req: Request) {
  const token = getBearerToken(req);
  if (!token) return null;

  const authClient = getSupabaseAuthClient();
  const { data, error } = await authClient.auth.getUser(token);

  if (error || !data.user) return null;
  return data.user.id;
}

const CreateCallSchema = z.object({
  conversation_id: z.string().uuid(),
  receiver_id: z.string().uuid(),
  type: z.enum(["voice", "video"]),
});

const CallIdSchema = z.object({
  id: z.string().uuid(),
});

const AgoraTokenSchema = z.object({
  call_id: z.string().uuid(),
});

router.post("/", async (req, res) => {
  const callerId = await authenticate(req);
  if (!callerId) {
    res.status(401).json({ error: "Invalid authentication token" });
    return;
  }

  const parsed = CreateCallSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload", details: parsed.error.issues });
    return;
  }

  const { conversation_id, receiver_id, type } = parsed.data;

  if (callerId === receiver_id) {
    res.status(400).json({ error: "A user cannot call themselves" });
    return;
  }

  const supabase = getSupabaseAdmin();

  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select("id, user1_id, user2_id")
    .eq("id", conversation_id)
    .maybeSingle();

  if (conversationError) {
    req.log.error({ err: conversationError }, "Failed to load conversation");
    res.status(500).json({ error: "Failed to validate conversation" });
    return;
  }

  if (
    !conversation ||
    (conversation.user1_id !== callerId && conversation.user2_id !== callerId) ||
    (conversation.user1_id !== receiver_id && conversation.user2_id !== receiver_id)
  ) {
    res.status(403).json({ error: "Caller and receiver must belong to the conversation" });
    return;
  }

  const { data: call, error: insertError } = await supabase
    .from("calls")
    .insert({
      conversation_id,
      caller_id: callerId,
      receiver_id,
      type,
      status: "ringing",
    })
    .select(
      "id, conversation_id, caller_id, receiver_id, type, status, agora_channel, created_at, started_at, answered_at, ended_at",
    )
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      res.status(409).json({ error: "An active call already exists for this conversation" });
      return;
    }

    req.log.error({ err: insertError }, "Failed to create call");
    res.status(500).json({ error: "Failed to create call" });
    return;
  }

  res.status(201).json({ call });
});


router.post("/token", async (req, res) => {
  const userId = await authenticate(req);
  if (!userId) {
    res.status(401).json({ error: "Invalid authentication token" });
    return;
  }

  const parsed = AgoraTokenSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid call id" });
    return;
  }

  const supabase = getSupabaseAdmin();
  const { data: call, error } = await supabase
    .from("calls")
    .select("id, caller_id, receiver_id, type, status, agora_channel")
    .eq("id", parsed.data.call_id)
    .maybeSingle();

  if (error) {
    req.log.error({ err: error }, "Failed to load call for Agora token");
    res.status(500).json({ error: "Failed to load call" });
    return;
  }

  if (!call) {
    res.status(404).json({ error: "Call not found" });
    return;
  }

  if (call.caller_id !== userId && call.receiver_id !== userId) {
    res.status(403).json({ error: "User is not a participant in this call" });
    return;
  }

  if (call.status !== "accepted") {
    res.status(409).json({ error: "Call is not active" });
    return;
  }

  try {
    const { appId, appCertificate } = getAgoraConfig();
    const uid = getAgoraUid(userId);
    const publishVideo = call.type === "video" ? AGORA_TOKEN_EXPIRE_SECONDS : 0;

    const token = RtcTokenBuilder.buildTokenWithUidAndPrivilege(
      appId,
      appCertificate,
      call.agora_channel,
      uid,
      AGORA_TOKEN_EXPIRE_SECONDS,
      AGORA_TOKEN_EXPIRE_SECONDS,
      AGORA_TOKEN_EXPIRE_SECONDS,
      publishVideo,
      0,
    );

    res.json({
      appId,
      channel: call.agora_channel,
      uid,
      token,
      expiresIn: AGORA_TOKEN_EXPIRE_SECONDS,
    });
  } catch (error) {
    req.log.error({ err: error }, "Failed to generate Agora token");
    res.status(500).json({ error: "Failed to generate Agora token" });
  }
});

router.post("/:id/accept", async (req, res) => {
  const userId = await authenticate(req);
  if (!userId) {
    res.status(401).json({ error: "Invalid authentication token" });
    return;
  }

  const parsed = CallIdSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid call id" });
    return;
  }

  const supabase = getSupabaseAdmin();

  const { data: call, error } = await supabase
    .from("calls")
    .update({
      status: "accepted",
      answered_at: new Date().toISOString(),
      started_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.id)
    .eq("receiver_id", userId)
    .eq("status", "ringing")
    .select(
      "id, conversation_id, caller_id, receiver_id, type, status, agora_channel, created_at, started_at, answered_at, ended_at",
    )
    .maybeSingle();

  if (error) {
    req.log.error({ err: error }, "Failed to accept call");
    res.status(500).json({ error: "Failed to accept call" });
    return;
  }

  if (!call) {
    res.status(409).json({ error: "Call is no longer available to accept" });
    return;
  }

  res.json({ call });
});

router.post("/:id/reject", async (req, res) => {
  const userId = await authenticate(req);
  if (!userId) {
    res.status(401).json({ error: "Invalid authentication token" });
    return;
  }

  const parsed = CallIdSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid call id" });
    return;
  }

  const supabase = getSupabaseAdmin();

  const { data: call, error } = await supabase
    .from("calls")
    .update({ status: "rejected", ended_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("receiver_id", userId)
    .eq("status", "ringing")
    .select(
      "id, conversation_id, caller_id, receiver_id, type, status, agora_channel, created_at, started_at, answered_at, ended_at",
    )
    .maybeSingle();

  if (error) {
    req.log.error({ err: error }, "Failed to reject call");
    res.status(500).json({ error: "Failed to reject call" });
    return;
  }

  if (!call) {
    res.status(409).json({ error: "Call is no longer available to reject" });
    return;
  }

  res.json({ call });
});

router.post("/:id/cancel", async (req, res) => {
  const userId = await authenticate(req);
  if (!userId) {
    res.status(401).json({ error: "Invalid authentication token" });
    return;
  }

  const parsed = CallIdSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid call id" });
    return;
  }

  const supabase = getSupabaseAdmin();

  const { data: call, error } = await supabase
    .from("calls")
    .update({ status: "cancelled", ended_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("caller_id", userId)
    .eq("status", "ringing")
    .select(
      "id, conversation_id, caller_id, receiver_id, type, status, agora_channel, created_at, started_at, answered_at, ended_at",
    )
    .maybeSingle();

  if (error) {
    req.log.error({ err: error }, "Failed to cancel call");
    res.status(500).json({ error: "Failed to cancel call" });
    return;
  }

  if (!call) {
    res.status(409).json({ error: "Call is no longer available to cancel" });
    return;
  }

  res.json({ call });
});

router.post("/:id/end", async (req, res) => {
  const userId = await authenticate(req);
  if (!userId) {
    res.status(401).json({ error: "Invalid authentication token" });
    return;
  }

  const parsed = CallIdSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid call id" });
    return;
  }

  const supabase = getSupabaseAdmin();

  const { data: call, error } = await supabase
    .from("calls")
    .update({ status: "ended", ended_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .or(`caller_id.eq.${userId},receiver_id.eq.${userId}`)
    .eq("status", "accepted")
    .select(
      "id, conversation_id, caller_id, receiver_id, type, status, agora_channel, created_at, started_at, answered_at, ended_at",
    )
    .maybeSingle();

  if (error) {
    req.log.error({ err: error }, "Failed to end call");
    res.status(500).json({ error: "Failed to end call" });
    return;
  }

  if (!call) {
    res.status(409).json({ error: "Call is not active or user is not a participant" });
    return;
  }

  res.json({ call });
});

export default router;
