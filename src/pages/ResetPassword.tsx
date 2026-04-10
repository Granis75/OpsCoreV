import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { SurfaceCard } from '../components/ui/SurfaceCard'
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
    if (!supabase) {
      return
    }

    let isMounted = true

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) {
        return
      }

      if (event === 'PASSWORD_RECOVERY' || session) {
        setIsReady(true)
        setErrorMessage(null)
        setIsCheckingRecovery(false)
      }
    })

    void supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (!isMounted) {
          return
        }

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
      setSuccessMessage('Password updated successfully. You can now continue to the app.')
      setPassword('')
      setConfirmPassword('')
    }

    setIsSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-transparent px-5 py-10 md:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center">
        <SurfaceCard
          title="Reset password"
          description="Set a new password for your Ops Core account."
          className="w-full"
        >
          <div className="mb-6 space-y-1.5">
            <p className="eyebrow-label">
              Ops Core V12
            </p>
            <p className="text-sm leading-6 text-slate-500">
              Finish recovery and return to the operational workspace.
            </p>
          </div>

          {isCheckingRecovery ? (
            <p className="text-sm text-slate-600">Checking your password reset session...</p>
          ) : null}

          {!isCheckingRecovery && !isReady && errorMessage ? (
            <div className="space-y-4">
              <p className="text-sm text-rose-600">{errorMessage}</p>
              <Link
                to="/sign-in"
                className="button-secondary"
              >
                Back to sign in
              </Link>
            </div>
          ) : null}

          {!isCheckingRecovery && isReady ? (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="block space-y-2">
                <span className="eyebrow-label">
                  New password
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                  className="field-input"
                />
              </label>

              <label className="block space-y-2">
                <span className="eyebrow-label">
                  Confirm password
                </span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                  className="field-input"
                />
              </label>

              {successMessage ? (
                <p className="text-sm text-emerald-700">{successMessage}</p>
              ) : null}

              {errorMessage ? (
                <p className="text-sm text-rose-600">{errorMessage}</p>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting || !isSupabaseConfigured}
                className="button-primary w-full"
              >
                {isSubmitting ? 'Updating password...' : 'Update password'}
              </button>

              {successMessage ? (
                <Link
                  to="/app/vendors"
                  className="button-secondary w-full"
                >
                  Continue to vendors
                </Link>
              ) : null}
            </form>
          ) : null}
        </SurfaceCard>
      </div>
    </div>
  )
}
