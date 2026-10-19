"use client"

import { ChangeEvent, FormEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../../lib/supabaseClient"

export default function OnboardingProfilePage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [username, setUsername] = useState("")
  const [avatar, setAvatar] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace("/")
        return
      }
      setName(user.user_metadata?.display_name || user.user_metadata?.full_name || "")
      setUsername(user.user_metadata?.username || "")
      setLoading(false)
    })()
  }, [router])

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    setAvatar(event.target.files?.[0] ?? null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    const cleanName = name.trim()
    const cleanUsername = username.trim()

    if (!cleanName) {
      setError("Escribe tu nombre.")
      return
    }
    if (!/^[a-zA-Z0-9_.]{3,30}$/.test(cleanUsername)) {
      setError("El usuario debe tener 3–30 caracteres: letras, números, _ o .")
      return
    }

    setSaving(true)
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw userError ?? new Error("Sesión no encontrada.")

      let avatarUrl: string | undefined
      if (avatar) {
        const ext = avatar.name.split(".").pop()?.toLowerCase() || "jpg"
        const path = `${user.id}/avatar.${ext}`
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, avatar, { upsert: true, contentType: avatar.type || "image/jpeg" })
        if (uploadError) throw uploadError
        avatarUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl
      }

      const profile = {
        id: user.id,
        email: user.email ?? null,
        full_name: cleanName,
        username: cleanUsername,
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
      }
      const { error: profileError } = await supabase.from("profiles").upsert(profile)
      if (profileError) throw profileError

      const { error: metadataError } = await supabase.auth.updateUser({
        data: { display_name: cleanName, username: cleanUsername },
      })
      if (metadataError) throw metadataError

      router.replace("/auth/interests")
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : "No se pudo guardar el perfil.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <main className="onboarding"><p>Preparando tu perfil…</p></main>

  return (
    <main className="onboarding">
      <section className="onboarding-card">
        <p className="step">PASO 1 DE 2</p>
        <h1>Completa tu perfil</h1>
        <p>Cuéntanos cómo quieres aparecer en TokVid.</p>
        <form onSubmit={handleSubmit}>
          <label>Foto de perfil (opcional)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} /></label>
          <label>Nombre<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" autoComplete="name" /></label>
          <label>Usuario<input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="tu_usuario" autoComplete="username" /></label>
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={saving}>{saving ? "Guardando…" : "Continuar"}</button>
        </form>
      </section>
    </main>
  )
}
