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
        router.replace("/home")
      }
    }

    void handleCallback()
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
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          borderRadius: 24,
          background: "#fff",
          padding: "32px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.08)",
          textAlign: "center",
        }}
      >
        <h1 style={{ margin: 0, marginBottom: 20, fontSize: 30 }}>
          Procesando autenticación
        </h1>
        <p style={{ margin: 0, marginBottom: 24, color: "#666" }}>
          Por favor espera mientras terminamos el inicio de sesión.
        </p>
        {errorMessage ? (
          <p style={{ color: "#c00" }}>{errorMessage}</p>
        ) : (
          <p style={{ color: "#666" }}>Redirigiendo...</p>
        )}
      </div>
    </main>
  )
}
