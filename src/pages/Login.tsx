import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { SurfaceCard } from '../components/ui/SurfaceCard'
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
    <div className="min-h-screen bg-transparent px-5 py-10 md:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center">
        <SurfaceCard
          title="Sign in"
          description="Use your Ops Core credentials to open the operational workspace."
          className="w-full"
        >
          <div className="mb-6 space-y-1.5">
            <p className="eyebrow-label">
              Ops Core V12
            </p>
            <p className="text-sm leading-6 text-slate-500">
              Sign in to continue with today’s incidents, spend, and guest feedback.
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

            <label className="block space-y-2">
              <span className="eyebrow-label">
                Password
              </span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                className="field-input"
              />
            </label>

            {errorMessage ? (
              <p className="text-sm text-rose-600">{errorMessage}</p>
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
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>

            <div className="flex flex-col gap-2 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
              <Link to="/forgot-password" className="font-medium text-slate-950">
                Forgot password?
              </Link>
              <span>
                New here?{' '}
                <Link to="/sign-up" className="font-medium text-slate-950">
                  Create account
                </Link>
              </span>
            </div>
          </form>
        </SurfaceCard>
      </div>
    </div>
  )
}
