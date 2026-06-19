import React from 'react'
import GoogleLogin from '../components/GoogleLogin'

export default function LoginPage(): JSX.Element {
  return (
    <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <GoogleLogin />
    </main>
  )
}
