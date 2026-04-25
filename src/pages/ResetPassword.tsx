import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

function hasRecoveryParams() {
  const searchParams = new URLSearchParams(window.location.search)
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))

  return (
    searchParams.get('type') === 'recovery' ||
    hashParams.get('type') === 'recovery' ||
    searchParams.has('code') ||
    searchParams.has('token_hash') ||
    hashParams.has('access_token')
  )
}

export function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(
    supabase
      ? null
      : 'Supabase client is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the root .env.local file.',
  )
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [isCheckingRecovery, setIsCheckingRecovery] = useState(Boolean(supabase))

  useEffect(() => {
    if (!supabase) return

    let isMounted = true

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return
      if (event === 'PASSWORD_RECOVERY' || session) {
        setIsReady(true)
        setErrorMessage(null)
        setIsCheckingRecovery(false)
      }
    })

    void supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!isMounted) return
      if (error) {
        setErrorMessage(error.message)
        setIsCheckingRecovery(false)
        return
      }
      if (session) {
        setIsReady(true)
        setErrorMessage(null)
        setIsCheckingRecovery(false)
        return
      }
      if (hasRecoveryParams()) {
        setErrorMessage('Reset link is invalid or expired. Request a new password reset email.')
      } else {
        setErrorMessage('Open this page from the password reset email to choose a new password.')
      }
      setIsCheckingRecovery(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!supabase) {
      setErrorMessage(
        'Supabase client is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the root .env.local file.',
      )
      return
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setErrorMessage(error.message)
    } else {
      setSuccessMessage('Password updated. You can now continue to the workspace.')
      setPassword('')
      setConfirmPassword('')
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
                OPS — Set new password
              </span>
            </div>
            <h1 className="font-serif text-2xl font-medium tracking-tight text-slate-900">
              Reset password
            </h1>
            <p className="text-sm leading-6 text-slate-500">
              Finish recovery and return to the operational workspace.
            </p>
          </div>

          {isCheckingRecovery ? (
            <p className="text-sm text-slate-500">Checking your password reset session…</p>
          ) : null}

          {!isCheckingRecovery && !isReady && errorMessage ? (
            <div className="space-y-4">
              <p className="text-sm" style={{ color: 'var(--danger)' }}>{errorMessage}</p>
              <Link to="/sign-in" className="button-secondary">
                Back to sign in
              </Link>
            </div>
          ) : null}

          {!isCheckingRecovery && isReady ? (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <label className="eyebrow-label" htmlFor="new-password">New password</label>
                <input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                  className="field-input"
                />
              </div>

              <div className="space-y-1.5">
                <label className="eyebrow-label" htmlFor="confirm-password">Confirm password</label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                  className="field-input"
                />
              </div>

              {successMessage ? (
                <p className="text-sm" style={{ color: 'var(--success)' }}>{successMessage}</p>
              ) : null}

              {errorMessage ? (
                <p className="text-sm" style={{ color: 'var(--danger)' }}>{errorMessage}</p>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting || !isSupabaseConfigured}
                className="button-primary w-full"
              >
                {isSubmitting ? 'Updating password…' : 'Update password'}
              </button>

              {successMessage ? (
                <Link to="/app/vendors" className="button-secondary w-full">
                  Continue to workspace
                </Link>
              ) : null}
            </form>
          ) : null}
        </div>
      </div>
    </div>
  )
}
