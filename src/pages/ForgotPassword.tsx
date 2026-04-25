import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!supabase) {
      setErrorMessage(
        'Supabase client is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the root .env.local file.',
      )
      return
    }

    if (!email.trim()) {
      setErrorMessage('Enter your email address to receive a password reset link.')
      setInfoMessage(null)
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)
    setInfoMessage(null)

    const redirectTo = new URL('/reset-password', window.location.origin).toString()

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    })

    if (error) {
      setErrorMessage(error.message)
    } else {
      setInfoMessage(`Reset link sent to ${email.trim()}.`)
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
            Password recovery
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
                OPS — Password recovery
              </span>
            </div>
            <h1 className="font-serif text-2xl font-medium tracking-tight text-slate-900">
              Forgot password
            </h1>
            <p className="text-sm leading-6 text-slate-500">
              We'll send a reset link so you can get back to the workspace quickly.
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

            {errorMessage ? (
              <p className="text-sm" style={{ color: 'var(--danger)' }}>{errorMessage}</p>
            ) : null}

            {infoMessage ? (
              <p className="text-sm" style={{ color: 'var(--success)' }}>{infoMessage}</p>
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
              {isSubmitting ? 'Sending…' : 'Send reset email'}
            </button>

            <div className="border-t border-slate-200 pt-4">
              <Link
                to="/sign-in"
                className="text-[13px] font-medium underline decoration-slate-300 underline-offset-2 hover:decoration-slate-600"
                style={{ color: 'var(--ink)' }}
              >
                Back to sign in
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
