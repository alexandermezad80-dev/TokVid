"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../../lib/supabaseClient"

export default function AuthCallbackPage() {
  const router = useRouter()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      const href = window.location.href
      const { data, error } = await supabase.auth.exchangeCodeForSession(href)

      if (error) {
        console.error(error)
        setErrorMessage(error.message)
        return
      }

      if (data.session) {
        router.replace(
          data.session.user.user_metadata?.onboarding_completed === true
            ? "/home"
            : "/auth/onboarding-profile",
        )
      }
    }
    void handleCallback()
  }, [router])

  return (
    <main style={{ display:"flex", minHeight:"100vh", alignItems:"center", justifyContent:"center", padding:24, background:"#090909", color:"#fff" }}>
      <div style={{ width:"100%", maxWidth:520, borderRadius:24, background:"#141414", padding:32, textAlign:"center" }}>
        <h1>Procesando autenticación</h1>
        <p style={{ color:"#bbb" }}>Por favor espera mientras terminamos el inicio de sesión.</p>
        {errorMessage ? <p style={{ color:"#ff8f8f" }}>{errorMessage}</p> : <p style={{ color:"#aaa" }}>Redirigiendo...</p>}
      </div>
    </main>
  )
}
