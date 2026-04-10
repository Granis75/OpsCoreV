import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { SurfaceCard } from '../components/ui/SurfaceCard'
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
      setInfoMessage(`Password reset email sent to ${email.trim()}.`)
    }

    setIsSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-transparent px-5 py-10 md:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center">
        <SurfaceCard
          title="Forgot password"
          description="Request a secure password reset link for your Ops Core account."
          className="w-full"
        >
          <div className="mb-6 space-y-1.5">
            <p className="eyebrow-label">
              Ops Core V12
            </p>
            <p className="text-sm leading-6 text-slate-500">
              We’ll send a reset link so you can get back to the workspace quickly.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="eyebrow-label">
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                className="field-input"
              />
            </label>

            {errorMessage ? (
              <p className="text-sm text-rose-600">{errorMessage}</p>
            ) : null}

            {infoMessage ? (
              <p className="text-sm text-emerald-700">{infoMessage}</p>
            ) : null}

            {!isSupabaseConfigured ? (
              <p className="text-sm text-amber-700">
                Supabase env missing. Fill the root .env.local file first.
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting || !isSupabaseConfigured}
              className="button-primary w-full"
            >
              {isSubmitting ? 'Sending reset email...' : 'Send reset email'}
            </button>

            <p className="text-sm text-slate-500">
              Back to{' '}
              <Link to="/sign-in" className="font-medium text-slate-950">
                sign in
              </Link>
            </p>
          </form>
        </SurfaceCard>
      </div>
    </div>
  )
}
