"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { User } from "@supabase/supabase-js"
import { supabase } from "../../lib/supabaseClient"

export default function HomePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    void (async () => {
      const { data: sessionData } = await supabase.auth.getSession()

      if (!sessionData.session) {
        router.replace("/")
        return
      }

      const { data: userData, error } = await supabase.auth.getUser()
      if (error) {
        console.error(error)
        return
      }
      setUser(userData.user)
    })()
  }, [router])

  const handleSignOut = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    router.replace("/")
  }

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
          Bienvenido a TokVid
        </h1>
        <p style={{ margin: 0, marginBottom: 28, color: "#666" }}>
          Has iniciado sesión correctamente con Google.
        </p>
        {user ? (
          <div style={{ marginBottom: 24, color: "#333" }}>
            <p style={{ margin: 0, fontWeight: 600 }}>
              {user.user_metadata?.full_name || user.email}
            </p>
            <p style={{ margin: 0, color: "#666" }}>{user.email}</p>
          </div>
        ) : (
          <p style={{ marginBottom: 24, color: "#666" }}>
            Cargando datos de usuario...
          </p>
        )}
        <button
          type="button"
          onClick={handleSignOut}
          disabled={loading}
          style={{
            padding: "12px 20px",
            borderRadius: 999,
            border: "none",
            background: "#111",
            color: "#fff",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Cerrando sesión..." : "Cerrar sesión"}
        </button>
      </div>
    </main>
  )
}
