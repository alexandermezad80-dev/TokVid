import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { completeAuthCallback } from "./authCallback";
import { supabase } from "../../../supabase";

WebBrowser.maybeCompleteAuthSession();

export async function signInWithGoogle(): Promise<{ error: string | null }> {
  const redirectUrl =
    Platform.OS === "web"
      ? `${window.location.origin}/auth/callback`
      : Linking.createURL("/auth/callback");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: redirectUrl, skipBrowserRedirect: Platform.OS !== "web" },
  });

  if (error) return { error: error.message };
  if (!data.url) return { error: "No se obtuvo la URL de autenticación." };

  if (Platform.OS === "web") {
    window.location.href = data.url;
    return { error: null };
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
  if (result.type === "success") {
    try {
      await completeAuthCallback(result.url);
      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "No se pudo completar la autenticación." };
    }
  }
  if (result.type === "cancel") return { error: "cancel" };
  return { error: "Autenticación fallida. Intentá de nuevo." };
}
