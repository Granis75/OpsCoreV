import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!supabase) {
      setErrorMessage(
        'Supabase client is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the root .env.local file.',
      )
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (error) {
      setErrorMessage(error.message)
    }

    setIsSubmitting(false)
  }

  return (
    <div className="flex min-h-screen flex-col" style={{ background: 'var(--paper)' }}>

      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-8 py-4">
          <Link to="/">
            <p
              className="font-serif text-[20px] font-semibold leading-none tracking-[-0.02em]"
              style={{ color: 'var(--black)' }}
            >
              OPS
            </p>
          </Link>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400">
            Authorized access only
          </span>
        </div>
      </header>

      {/* Form */}
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm space-y-8">

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-px w-6 bg-slate-300" />
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                Private platform · Authorized access only
              </span>
            </div>
            <h1 className="font-serif text-2xl font-medium tracking-tight text-slate-900">
              Sign in
            </h1>
            <p className="text-sm leading-6 text-slate-500">
              Use your organization credentials to access the operational workspace.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label className="eyebrow-label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                className="field-input"
              />
            </div>

            <div className="space-y-1.5">
              <label className="eyebrow-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                className="field-input"
              />
            </div>

            {errorMessage ? (
              <p className="text-sm" style={{ color: 'var(--danger)' }}>{errorMessage}</p>
            ) : null}

            {!isSupabaseConfigured ? (
              <p className="text-sm" style={{ color: 'var(--warning)' }}>
                Supabase env missing. Fill the root .env.local file first.
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting || !isSupabaseConfigured}
              className="button-primary w-full"
            >
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>

            <div className="flex items-center justify-between border-t border-slate-200 pt-4">
              <Link
                to="/forgot-password"
                className="text-[13px] font-medium underline decoration-slate-300 underline-offset-2 hover:decoration-slate-600"
                style={{ color: 'var(--ink)' }}
              >
                Forgot password?
              </Link>
            </div>
          </form>

          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-400">
            Access is administrator-provisioned. No self-registration available.
          </p>
        </div>
      </div>
    </div>
  )
}
