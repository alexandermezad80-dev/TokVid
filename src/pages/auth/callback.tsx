import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'

export default function AuthCallbackPage(): JSX.Element {
  const router = useRouter()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    ;(async () => {
      try {
        const href = window.location.href
        const { data, error } = await supabase.auth.exchangeCodeForSession(href)

        if (error) {
          console.error(error)
          if (mounted) setErrorMessage(error.message)
          return
        }

        if (data.session) {
          router.replace('/home')
        }
      } catch (err: any) {
        console.error(err)
        if (mounted) setErrorMessage(err?.message || 'Error procesando autenticación')
      }
    })()

    return () => {
      mounted = false
    }
  }, [router])

  return (
    <main style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 520, borderRadius: 12, background: '#fff', padding: 24, textAlign: 'center' }}>
        <h1 style={{ margin: 0, marginBottom: 12, fontSize: 24 }}>Procesando autenticación</h1>
        <p style={{ margin: 0, marginBottom: 12, color: '#666' }}>Por favor espera mientras terminamos el inicio de sesión.</p>
        {errorMessage ? <p style={{ color: '#c00' }}>{errorMessage}</p> : <p style={{ color: '#666' }}>Redirigiendo...</p>}
      </div>
    </main>
  )
}
