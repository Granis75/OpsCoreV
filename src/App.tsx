import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/app/AppShell'
import { SurfaceCard } from './components/ui/SurfaceCard'
import { supabase } from './lib/supabase'
import { Dashboard } from './pages/Dashboard'
import { Expenses } from './pages/Expenses'
import { Login } from './pages/Login'
import { Maintenance } from './pages/Maintenance'
import { Reputation } from './pages/Reputation'
import { ResetPassword } from './pages/ResetPassword'
import { Teams } from './pages/Teams'
import { VendorDetail } from './pages/VendorDetail'
import { Vendors } from './pages/Vendors'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [isCheckingSession, setIsCheckingSession] = useState(Boolean(supabase))

  useEffect(() => {
    if (!supabase) {
      return
    }

    let isMounted = true

    void supabase.auth
      .getSession()
      .then(({ data: { session: currentSession } }) => {
        if (isMounted) {
          setSession(currentSession)
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsCheckingSession(false)
        }
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setIsCheckingSession(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  if (isCheckingSession) {
    return (
      <div className="min-h-screen px-5 py-10 md:px-8">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-xl items-center">
          <SurfaceCard
            title="Loading session"
            description="Checking the current Supabase session before opening the workspace."
            className="w-full"
          />
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/login"
        element={session ? <Navigate to="/vendors" replace /> : <Login />}
      />
      <Route element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route
          path="/vendors"
          element={session ? <Vendors /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/vendors/:id"
          element={session ? <VendorDetail /> : <Navigate to="/login" replace />}
        />
        <Route path="/teams" element={<Teams />} />
        <Route path="/maintenance" element={<Maintenance />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/reputation" element={<Reputation />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
