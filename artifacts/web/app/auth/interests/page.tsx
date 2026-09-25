"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../../lib/supabaseClient"

const categories = [
  "Música", "Humor", "Deportes", "Cocina", "Arte", "Gaming", "Viajes", "Moda",
  "Belleza", "Tecnología", "Educación", "Fitness", "Noticias", "Baile", "Comedia", "Cine",
]

export default function InterestsPage() {
  const router = useRouter()
  const [selected, setSelected] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const toggle = (category: string) => {
    setSelected((current) =>
      current.includes(category) ? current.filter((item) => item !== category) : [...current, category],
    )
  }

  const finish = async () => {
    if (selected.length < 3) {
      setError("Selecciona al menos 3 intereses.")
      return
    }
    setSaving(true)
    setError("")
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError("No hay una sesión activa.")
      setSaving(false)
      return
    }
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ interests: selected })
      .eq("id", user.id)
    if (profileError) {
      setError(profileError.message)
      setSaving(false)
      return
    }
    const { error: updateError } = await supabase.auth.updateUser({
      data: { interests: selected, onboarding_completed: true },
    })
    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }
    router.replace("/home")
  }

  return (
    <main className="onboarding">
      <section className="onboarding-card">
        <p className="step">PASO 2 DE 2</p>
        <h1>¿Qué te interesa?</h1>
        <p>Elige al menos 3 temas para personalizar tu experiencia.</p>
        <div className="interest-grid">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={selected.includes(category) ? "interest selected" : "interest"}
              onClick={() => toggle(category)}
            >
              {category}
            </button>
          ))}
        </div>
        {error && <p className="error">{error}</p>}
        <button type="button" onClick={() => void finish()} disabled={saving || selected.length < 3}>
          {saving ? "Guardando…" : `Continuar con ${selected.length} seleccionados`}
        </button>
      </section>
    </main>
  )
}
