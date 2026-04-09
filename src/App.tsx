import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from './components/app/AppShell'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { SurfaceCard } from './components/ui/SurfaceCard'
import { supabase } from './lib/supabase'
import { Dashboard } from './pages/Dashboard'
import { Directory } from './pages/Directory'
import { DirectoryStaffDetailPlaceholder } from './pages/DirectoryStaffDetailPlaceholder'
import { Expenses } from './pages/Expenses'
import { ForgotPassword } from './pages/ForgotPassword'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { Maintenance } from './pages/Maintenance'
import { Operations } from './pages/Operations'
import { Reputation } from './pages/Reputation'
import { ResetPassword } from './pages/ResetPassword'
import { SignUp } from './pages/SignUp'
import { Teams } from './pages/Teams'
import { VendorDetail } from './pages/VendorDetail'
import { Vendors } from './pages/Vendors'

function LegacyAppRedirect() {
  const location = useLocation()

  return (
    <Navigate
      to={`/app${location.pathname}${location.search}${location.hash}`}
      replace
    />
  )
}

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
      <Route path="/" element={<Landing />} />
      <Route path="/sign-in" element={session ? <Navigate to="/app" replace /> : <Login />} />
      <Route path="/sign-up" element={session ? <Navigate to="/app" replace /> : <SignUp />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/login" element={<Navigate to="/sign-in" replace />} />
      <Route path="/vendors/*" element={<LegacyAppRedirect />} />
      <Route path="/teams" element={<LegacyAppRedirect />} />
      <Route path="/maintenance" element={<LegacyAppRedirect />} />
      <Route path="/operations" element={<LegacyAppRedirect />} />
      <Route path="/expenses" element={<LegacyAppRedirect />} />
      <Route path="/reputation" element={<LegacyAppRedirect />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute session={session}>
            <AppShell session={session} />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="directory" element={<Directory />} />
        <Route
          path="directory/staff/:id"
          element={<DirectoryStaffDetailPlaceholder />}
        />
        <Route path="vendors" element={<Vendors />} />
        <Route path="vendors/:id" element={<VendorDetail />} />
        <Route path="teams" element={<Teams />} />
        <Route path="maintenance" element={<Maintenance />} />
        <Route path="operations" element={<Operations />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="reputation" element={<Reputation />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
