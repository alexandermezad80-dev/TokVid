"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../lib/supabaseClient"

export default function GoogleLogin() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const routeUser = (user: { user_metadata?: Record<string, unknown> }) => {
    router.replace(user.user_metadata?.onboarding_completed === true ? "/home" : "/auth/onboarding-profile")
  }

  useEffect(() => {
    let mounted = true
    void (async () => {
      const { data } = await supabase.auth.getSession()
      if (mounted && data.session) routeUser(data.session.user)
    })()
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) routeUser(session.user)
    })
    return () => { mounted = false; data.subscription.unsubscribe() }
  }, [router])

  const handleGoogle = async () => {
    setLoading(true)
    try {
      const redirectTo = `${window.location.origin}/auth/callback`
      const { error } = await supabase.auth.signInWithOAuth({ provider:"google", options:{ redirectTo } })
      if (error) throw error
    } catch (error: unknown) {
      setLoading(false)
      console.error(error)
      alert(error instanceof Error ? error.message : "Error iniciando sesión")
    }
  }

  return <div style={{ display:"flex", justifyContent:"center" }}>
    <button type="button" onClick={handleGoogle} disabled={loading} style={{ minWidth:220, padding:"12px 18px", borderRadius:999, border:"1px solid #444", background:"#fff", color:"#111", fontWeight:600, cursor:loading?"not-allowed":"pointer" }}>
      {loading ? "Redirigiendo..." : "Continuar con Google"}
    </button>
  </div>
}
