import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { RtcTokenBuilder } from "npm:agora-token@2.0.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TOKEN_EXPIRE_SECONDS = 3600;

type Participant = {
  user_id: string;
  role: "host" | "guest" | "spectator";
  participation_state: string;
  camera_authorized: boolean;
  mic_authorized: boolean;
  camera_state: "on" | "off";
  mic_state: "on" | "off";
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function agoraUidFromUserId(userId: string) {
  let hash = 2166136261;
  for (let index = 0; index < userId.length; index += 1) {
    hash ^= userId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const uid = hash >>> 0;
  return uid === 0 ? 1 : uid;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return response({ error: "Method not allowed" }, 405);

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return response({ error: "Missing authorization" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const appId = Deno.env.get("AGORA_APP_ID");
  const appCertificate = Deno.env.get("AGORA_APP_CERTIFICATE");

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !appId || !appCertificate) {
    return response({ error: "LIVE RTC server configuration is incomplete" }, 500);
  }

  const accessToken = authorization.slice("Bearer ".length).trim();
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: { user }, error: authError } = await authClient.auth.getUser(accessToken);

  if (authError || !user) return response({ error: "Unauthorized" }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return response({ error: "Invalid JSON" }, 400);
  }

  const roomId = typeof body.room_id === "string" ? body.room_id : null;
  if (!roomId) return response({ error: "room_id is required" }, 400);

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: room, error: roomError } = await admin
    .from("live_rooms")
    .select("id,host_id,state,mode")
    .eq("id", roomId)
    .maybeSingle();

  if (roomError) return response({ error: "Failed to load LIVE room" }, 500);
  if (!room) return response({ error: "LIVE room not found" }, 404);
  if (room.state !== "active") return response({ error: "LIVE room is not active" }, 409);

  const { data: participant, error: participantError } = await admin
    .from("live_participants")
    .select("user_id,role,participation_state,camera_authorized,mic_authorized,camera_state,mic_state")
    .eq("room_id", roomId)
    .eq("user_id", user.id)
    .in("participation_state", ["active", "spectator"])
    .maybeSingle();

  if (participantError) return response({ error: "Failed to load LIVE membership" }, 500);

  const membership = participant as Participant | null;
  const role: Participant["role"] = membership?.role ?? "spectator";

  if (membership && membership.participation_state !== "active" && membership.role !== "spectator") {
    return response({ error: "LIVE membership is not active" }, 409);
  }

  const uid = agoraUidFromUserId(user.id);
  const channel = `tokvid-live-${roomId}`;
  const privilegeRole = role === "spectator" ? 2 : 1;
  const expireAt = Math.floor(Date.now() / 1000) + TOKEN_EXPIRE_SECONDS;

  const token = RtcTokenBuilder.buildTokenWithUidAndPrivilege(
    appId,
    appCertificate,
    channel,
    uid,
    privilegeRole,
    expireAt,
  );

  return response({
    appId,
    channel,
    uid,
    token,
    expiresIn: TOKEN_EXPIRE_SECONDS,
    role,
    cameraAuthorized: membership?.camera_authorized ?? false,
    micAuthorized: membership?.mic_authorized ?? false,
    cameraState: membership?.camera_state ?? "off",
    micState: membership?.mic_state ?? "off",
  });
});
