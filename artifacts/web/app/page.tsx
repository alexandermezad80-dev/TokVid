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
        router.replace(
          data.session.user.user_metadata?.onboarding_completed === true
            ? "/home"
            : "/auth/onboarding-profile",
        )
        return
      }
      setCheckingSession(false)
    })()
  }, [router])

  return (
    <main style={{ display:"flex", minHeight:"100vh", alignItems:"center", justifyContent:"center", padding:24, background:"#090909", color:"#fff" }}>
      <section style={{ width:"100%", maxWidth:420, borderRadius:24, background:"#141414", padding:32, boxShadow:"0 20px 60px rgba(0,0,0,.45)", textAlign:"center" }}>
        <p style={{ color:"#aaa", margin:0 }}>TokVid</p>
        <h1 style={{ margin:"10px 0 12px", fontSize:32 }}>Historias que se sienten reales</h1>
        <p style={{ color:"#bbb", lineHeight:1.5, marginBottom:28 }}>Video corto para creadores de Latinoamérica.</p>
        {checkingSession ? <p style={{ color:"#aaa" }}>Validando sesión...</p> : <GoogleLogin />}
        <p style={{ color:"#888", fontSize:12, marginTop:24 }}>Al continuar aceptas nuestros términos y políticas.</p>
      </section>
    </main>
  )
}
