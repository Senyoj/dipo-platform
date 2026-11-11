import { useState, type FormEvent } from 'react'
import { supabase } from './client'

export function SignIn() {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    const values = new FormData(event.currentTarget)
    setBusy(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: String(values.get('email')),
        password: String(values.get('password')),
      })
      setMessage(error ? error.message : '')
    } catch {
      setMessage('Sign-in could not connect. Try again online.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="operation">
      <label>Email<input name="email" type="email" autoComplete="username" required /></label>
      <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
      <button disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      {message && <p role="alert">{message}</p>}
    </form>
  )
}
