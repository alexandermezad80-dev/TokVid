import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { RtcTokenBuilder } from "npm:agora-token@2.0.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TOKEN_EXPIRE_SECONDS = 3600;

type Action = "create" | "accept" | "reject" | "cancel" | "end" | "token";

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function uidFromUserId(userId: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(userId));
  const uid = new DataView(digest).getUint32(0);
  return uid === 0 ? 1 : uid;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return response({ error: "Method not allowed" }, 405);

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return response({ error: "Missing authorization" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return response({ error: "Server configuration is incomplete" }, 500);

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const accessToken = authorization.slice("Bearer ".length).trim();
  const { data: { user }, error: authError } = await authClient.auth.getUser(accessToken);
  if (authError || !user) return response({ error: "Unauthorized" }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return response({ error: "Invalid JSON" }, 400);
  }

  const action = body.action as Action;
  const callId = typeof body.call_id === "string" ? body.call_id : null;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  if (action === "create") {
    const conversationId = typeof body.conversation_id === "string" ? body.conversation_id : null;
    const receiverId = typeof body.receiver_id === "string" ? body.receiver_id : null;
    const type = body.type === "video" ? "video" : body.type === "voice" ? "voice" : null;

    if (!conversationId || !receiverId || !type) return response({ error: "Invalid create payload" }, 400);
    if (receiverId === user.id) return response({ error: "Cannot call yourself" }, 400);

    const { data: conversation, error: conversationError } = await admin
      .from("conversations")
      .select("id,user1_id,user2_id")
      .eq("id", conversationId)
      .maybeSingle();

    if (conversationError) return response({ error: "Failed to load conversation" }, 500);
    if (!conversation || ![conversation.user1_id, conversation.user2_id].includes(user.id) ||
        ![conversation.user1_id, conversation.user2_id].includes(receiverId)) {
      return response({ error: "Forbidden" }, 403);
    }

    const { data: call, error } = await admin.from("calls").insert({
      conversation_id: conversationId,
      caller_id: user.id,
      receiver_id: receiverId,
      type,
      status: "ringing",
    }).select("*").single();

    if (error?.code === "23505") return response({ error: "An active call already exists" }, 409);
    if (error || !call) return response({ error: "Failed to create call" }, 500);
    return response({ call });
  }

  if (!callId) return response({ error: "call_id is required" }, 400);

  const { data: call, error: callError } = await admin
    .from("calls")
    .select("id,conversation_id,caller_id,receiver_id,type,status,agora_channel,created_at,started_at,answered_at,ended_at")
    .eq("id", callId)
    .maybeSingle();

  if (callError) return response({ error: "Failed to load call" }, 500);
  if (!call) return response({ error: "Call not found" }, 404);
  if (user.id !== call.caller_id && user.id !== call.receiver_id) return response({ error: "Forbidden" }, 403);

  if (action === "accept") {
    if (user.id !== call.receiver_id || call.status !== "ringing") return response({ error: "Invalid call transition" }, 409);
    const now = new Date().toISOString();
    const { data: updated, error } = await admin.from("calls").update({
      status: "accepted", answered_at: now, started_at: now,
    }).eq("id", call.id).eq("status", "ringing").select("*").single();
    if (error || !updated) return response({ error: "Failed to accept call" }, 409);
    return response({ call: updated });
  }

  if (action === "reject") {
    if (user.id !== call.receiver_id || call.status !== "ringing") return response({ error: "Invalid call transition" }, 409);
    const { data: updated, error } = await admin.from("calls").update({
      status: "rejected", ended_at: new Date().toISOString(),
    }).eq("id", call.id).eq("status", "ringing").select("*").single();
    if (error || !updated) return response({ error: "Failed to reject call" }, 409);
    return response({ call: updated });
  }

  if (action === "cancel") {
    if (user.id !== call.caller_id || call.status !== "ringing") return response({ error: "Invalid call transition" }, 409);
    const { data: updated, error } = await admin.from("calls").update({
      status: "cancelled", ended_at: new Date().toISOString(),
    }).eq("id", call.id).eq("status", "ringing").select("*").single();
    if (error || !updated) return response({ error: "Failed to cancel call" }, 409);
    return response({ call: updated });
  }

  if (action === "end") {
    if (call.status !== "accepted") return response({ error: "Invalid call transition" }, 409);
    const { data: updated, error } = await admin.from("calls").update({
      status: "ended", ended_at: new Date().toISOString(),
    }).eq("id", call.id).eq("status", "accepted").select("*").single();
    if (error || !updated) return response({ error: "Failed to end call" }, 409);
    return response({ call: updated });
  }

  if (action === "token") {
    if (call.status !== "accepted") return response({ error: "Call is not active" }, 409);
    const appId = Deno.env.get("AGORA_APP_ID");
    const appCertificate = Deno.env.get("AGORA_APP_CERTIFICATE");
    if (!appId || !appCertificate) return response({ error: "Agora configuration is incomplete" }, 500);

    const uid = await uidFromUserId(user.id);
    const token = RtcTokenBuilder.buildTokenWithUidAndPrivilege(
      appId,
      appCertificate,
      call.agora_channel,
      uid,
      1,
      Math.floor(Date.now() / 1000) + TOKEN_EXPIRE_SECONDS,
    );

    return response({
      appId,
      channel: call.agora_channel,
      uid,
      token,
      expiresIn: TOKEN_EXPIRE_SECONDS,
      type: call.type,
    });
  }

  return response({ error: "Unknown action" }, 400);
});
