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
      if (!sessionData.session) { router.replace("/"); return }
      if (sessionData.session.user.user_metadata?.onboarding_completed !== true) {
        router.replace("/auth/onboarding-profile")
        return
      }
      const { data: userData, error } = await supabase.auth.getUser()
      if (error) { console.error(error); return }
      setUser(userData.user)
    })()
  }, [router])

  const handleSignOut = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    router.replace("/")
  }

  return (
    <main style={{ display:"flex", minHeight:"100vh", alignItems:"center", justifyContent:"center", padding:24, background:"#090909", color:"#fff" }}>
      <div style={{ width:"100%", maxWidth:520, borderRadius:24, background:"#141414", padding:32, textAlign:"center" }}>
        <h1>Bienvenido a TokVid</h1>
        <p style={{ color:"#bbb" }}>Has completado tu configuración.</p>
        {user ? <div style={{ marginBottom:24 }}><p style={{ fontWeight:600 }}>{user.user_metadata?.display_name || user.email}</p><p style={{ color:"#888" }}>{user.email}</p></div> : <p style={{ color:"#aaa" }}>Cargando datos...</p>}
        <button type="button" onClick={handleSignOut} disabled={loading} style={{ padding:"12px 20px", borderRadius:999, border:0, background:"#fff", color:"#111" }}>{loading ? "Cerrando sesión..." : "Cerrar sesión"}</button>
      </div>
    </main>
  )
}
