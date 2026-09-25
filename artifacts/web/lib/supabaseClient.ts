import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Next.js prerenders client components during the production build. Keep the
// module import build-safe when CI does not provide runtime environment values.
// The real Supabase configuration is still required when the browser uses it.
const isConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!isConfigured && typeof window !== "undefined") {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
  )
}

export const supabase = createClient(
  supabaseUrl ?? "https://placeholder.supabase.co",
  supabaseAnonKey ?? "build-placeholder-anon-key",
)

export default supabase
