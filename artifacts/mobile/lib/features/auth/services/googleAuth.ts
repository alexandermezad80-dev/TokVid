import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { completeAuthCallback } from "./authCallback";
import { supabase } from "../../../supabase";
import { recordAuthDiagnostic, rememberAuthUrl, startAuthDiagnostic } from "../../../authDiagnostics";

WebBrowser.maybeCompleteAuthSession();

export async function signInWithGoogle(): Promise<{ error: string | null }> {
  startAuthDiagnostic();
  const redirectUrl =
    Platform.OS === "web"
      ? `${window.location.origin}/auth/callback`
      : Linking.createURL("/auth/callback");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: redirectUrl, skipBrowserRedirect: Platform.OS !== "web" },
  });

  if (error) { recordAuthDiagnostic("google.authorize.failed"); return { error: error.message }; }
  if (!data.url) return { error: "No se obtuvo la URL de autenticación." };
  rememberAuthUrl(data.url);
  recordAuthDiagnostic("google.authorize.ready");

  if (Platform.OS === "web") {
    window.location.href = data.url;
    return { error: null };
  }

  recordAuthDiagnostic("google.browser.open");
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
  if (result.type === "success") {
    rememberAuthUrl(result.url);
    recordAuthDiagnostic("google.browser.success");
    try {
      recordAuthDiagnostic("google.session.start");
      await completeAuthCallback(result.url);
      recordAuthDiagnostic("google.session.ready");
      return { error: null };
    } catch (error) {
      recordAuthDiagnostic("google.session.failed");
      return { error: error instanceof Error ? error.message : "No se pudo completar la autenticación." };
    }
  }
  if (result.type === "cancel") { recordAuthDiagnostic("google.browser.cancel"); return { error: "cancel" }; }
  recordAuthDiagnostic("google.browser.other");
  return { error: "Autenticación fallida. Intentá de nuevo." };
}
