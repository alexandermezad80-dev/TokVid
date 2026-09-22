import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { createHash } from "node:crypto";
import { RtcTokenBuilder } from "npm:agora-token@2.0.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TOKEN_EXPIRE_SECONDS = 3600;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function uidFromUserId(userId: string) {
  const digest = createHash("sha256").update(userId).digest();
  const uid = digest.readUInt32BE(0);
  return uid === 0 ? 1 : uid;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const appId = Deno.env.get("AGORA_APP_ID");
  const appCertificate = Deno.env.get("AGORA_APP_CERTIFICATE");

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !appId || !appCertificate) {
    return json({ error: "Server configuration is incomplete" }, 500);
  }

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return json({ error: "Missing authorization" }, 401);
  }

  const accessToken = authorization.slice("Bearer ".length).trim();
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });

  const { data: { user }, error: authError } = await authClient.auth.getUser(accessToken);
  if (authError || !user) {
    return json({ error: "Unauthorized" }, 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).call_id !== "string"
  ) {
    return json({ error: "call_id is required" }, 400);
  }

  const callId = (body as Record<string, string>).call_id;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: call, error: callError } = await admin
    .from("calls")
    .select("id, caller_id, receiver_id, type, status, agora_channel")
    .eq("id", callId)
    .maybeSingle();

  if (callError) {
    return json({ error: "Failed to load call" }, 500);
  }

  if (!call) {
    return json({ error: "Call not found" }, 404);
  }

  if (user.id !== call.caller_id && user.id !== call.receiver_id) {
    return json({ error: "Forbidden" }, 403);
  }

  if (call.status !== "accepted") {
    return json({ error: "Call is not active" }, 409);
  }

  const uid = uidFromUserId(user.id);
  const token = RtcTokenBuilder.buildTokenWithUidAndPrivilege(
    appId,
    appCertificate,
    call.agora_channel,
    uid,
    1,
    Math.floor(Date.now() / 1000) + TOKEN_EXPIRE_SECONDS,
  );

  return json({
    appId,
    channel: call.agora_channel,
    uid,
    token,
    expiresIn: TOKEN_EXPIRE_SECONDS,
    type: call.type,
  });
});
