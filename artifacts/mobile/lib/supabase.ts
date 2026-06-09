import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

// EXPO_PUBLIC_ vars are intentionally public (bundled into the client)
const envUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const envKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Swap if the values were stored inverted (URL ends up in KEY slot and vice versa)
const supabaseUrl = envUrl.startsWith("http") ? envUrl : envKey;
const supabaseAnonKey = envUrl.startsWith("http") ? envKey : envUrl;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
