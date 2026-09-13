import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type SupabaseClientFactory = (
  url: string,
  key: string,
  options: {
    auth: {
      autoRefreshToken: boolean;
      persistSession: boolean;
    };
  },
) => SupabaseClient;

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getSupabaseAdmin(
  clientFactory: SupabaseClientFactory = createClient,
): SupabaseClient {
  const supabaseUrl =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl) {
    throw new Error(
      "Missing required environment variable: SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL",
    );
  }

  return clientFactory(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export type SupabaseConnectionResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Performs a lightweight database query to verify that the server can reach
 * Supabase with its configured credentials. Errors are returned instead of
 * being thrown so callers can handle connection failures gracefully.
 */
export async function checkSupabaseConnection(
  clientFactory: SupabaseClientFactory = createClient,
): Promise<SupabaseConnectionResult> {
  try {
    const supabase = getSupabaseAdmin(clientFactory);
    const { error } = await supabase.from("profiles").select("id").limit(1);

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown Supabase connection error",
    };
  }
}
