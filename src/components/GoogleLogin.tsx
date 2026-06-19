import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

export default function GoogleLogin(): JSX.Element {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let mounted = true

    ;(async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (data.session) {
          router.replace('/home')
        }
      } catch (e) {
        // ignore
      }
    })()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) router.replace('/home')
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [router])

  const handleGoogle = async () => {
    setLoading(true)
    try {
      const redirectTo = `${window.location.origin}/home`
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
      if (error) throw error
      // Supabase will redirect the user; nothing else to do here
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Error iniciando sesión')
      setLoading(false)
    }
  }

  return (
    <div>
      <button onClick={handleGoogle} disabled={loading} style={{ padding: '8px 14px', borderRadius: 6 }}>
        {loading ? 'Redirigiendo...' : 'Continuar con Google'}
      </button>
    </div>
  )
}
