import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../../supabase";

// Browser completion and Expo Router can receive the same one-use code.
let lastKey: string | null = null;
let lastCompletion: Promise<Session> | null = null;

export function completeAuthCallback(url: string): Promise<Session> {
  let parsed: URL;
  try { parsed = new URL(url); } catch {
    return Promise.reject(new Error("El retorno de autenticación no es válido."));
  }
  const params = new URLSearchParams(parsed.search);
  new URLSearchParams(parsed.hash.replace(/^#/, "")).forEach((value, key) => {
    if (!params.has(key)) params.set(key, value);
  });
  const key = params.get("code") ?? params.get("token_hash") ?? params.get("access_token");
  if (key && key === lastKey && lastCompletion) return lastCompletion;

  const completion = (async () => {
    if (params.get("error")) throw new Error(params.get("error_description") ?? "No se pudo completar la autenticación.");
    const code = params.get("code");
    const tokenHash = params.get("token_hash");
    const type = params.get("type");
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
      if (data.session) return data.session;
    } else if (tokenHash && (type === "signup" || type === "email" || type === "magiclink")) {
      const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
      if (error) throw error;
      if (data.session) return data.session;
    } else if (params.get("access_token") && params.get("refresh_token")) {
      const { data, error } = await supabase.auth.setSession({
        access_token: params.get("access_token")!,
        refresh_token: params.get("refresh_token")!,
      });
      if (error) throw error;
      if (data.session) return data.session;
    } else {
      throw new Error("El retorno de autenticación no contiene un código válido.");
    }
    throw new Error("No se pudo establecer la sesión.");
  })();
  if (key) {
    lastKey = key;
    lastCompletion = completion;
    completion.catch(() => {
      if (lastCompletion === completion) { lastKey = null; lastCompletion = null; }
    });
  }
  return completion;
}
