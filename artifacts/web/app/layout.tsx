import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TokVid Web',
  description: 'Inicio de sesión con Google usando Supabase Auth',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
