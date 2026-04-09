import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { SurfaceCard } from '../components/ui/SurfaceCard'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

export function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
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
    setInfoMessage(null)

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    })

    if (error) {
      setErrorMessage(error.message)
    } else if (data.session) {
      setInfoMessage('Account created. Redirecting to the workspace...')
    } else {
      setInfoMessage('Account created. Check your email to confirm access.')
    }

    setIsSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-slate-50/60 px-5 py-10 md:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center">
        <SurfaceCard
          title="Create account"
          description="Set up your Ops Core workspace access with your email and password."
          className="w-full"
        >
          <div className="mb-6 space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-400">
              Ops Core V12
            </p>
            <p className="text-sm text-slate-600">
              Start with a clean operational workspace built for incidents, vendors,
              expenses, and guest quality.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-400">
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition-colors focus:border-slate-950"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-400">
                Password
              </span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                required
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition-colors focus:border-slate-950"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-400">
                Confirm password
              </span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                required
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition-colors focus:border-slate-950"
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
              className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>

            <p className="text-sm text-slate-600">
              Already have access?{' '}
              <Link to="/sign-in" className="font-medium text-slate-950">
                Sign in
              </Link>
            </p>
          </form>
        </SurfaceCard>
      </div>
    </div>
  )
}
