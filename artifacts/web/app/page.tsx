"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import GoogleLogin from "../components/GoogleLogin"
import { supabase } from "../lib/supabaseClient"

export default function Page() {
  const router = useRouter()
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        router.replace("/home")
        return
      }
      setCheckingSession(false)
    })()
  }, [router])

  return (
    <main
      style={{
        display: "flex",
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "#f7f8fb",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 24,
          background: "#fff",
          padding: "32px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.08)",
          textAlign: "center",
        }}
      >
        <h1 style={{ margin: 0, marginBottom: 18, fontSize: 28 }}>
          Iniciar sesión
        </h1>
        {checkingSession ? (
          <p style={{ margin: 0, marginBottom: 28, color: "#666" }}>
            Validando sesión...
          </p>
        ) : (
          <>
            <p style={{ margin: 0, marginBottom: 28, color: "#666" }}>
              Accede con tu cuenta de Google para continuar.
            </p>
            <GoogleLogin />
          </>
        )}
      </section>
    </main>
  )
}
