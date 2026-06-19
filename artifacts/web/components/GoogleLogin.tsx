"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../lib/supabaseClient"

export default function GoogleLogin() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let mounted = true

    void (async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (mounted && data.session) {
          router.replace("/home")
        }
      } catch {
        // ignore session check errors
      }
    })()

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        router.replace("/home")
      }
    })

    return () => {
      mounted = false
      data.subscription.unsubscribe()
    }
  }, [router])

  const handleGoogle = async () => {
    setLoading(true)

    try {
      const redirectTo = `${window.location.origin}/auth/callback`
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      })

      if (error) {
        throw error
      }
    } catch (error: unknown) {
      setLoading(false)
      console.error(error)
      const message =
        error instanceof Error ? error.message : "Error iniciando sesión"
      alert(message)
    }
  }

  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading}
        style={{
          minWidth: 220,
          padding: "12px 18px",
          borderRadius: 999,
          border: "1px solid #ccc",
          cursor: loading ? "not-allowed" : "pointer",
          background: "#fff",
          color: "#111",
          fontWeight: 600,
        }}
      >
        {loading ? "Redirigiendo..." : "Continuar con Google"}
      </button>
    </div>
  )
}
