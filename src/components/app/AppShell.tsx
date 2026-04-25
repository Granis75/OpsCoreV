import { useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { LogOut, ShieldCheck } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { navigationItems } from '../../data/navigation'
import { supabase } from '../../lib/supabase'

function isActivePath(pathname: string, target: string) {
  if (target === '/app') {
    return pathname === '/app'
  }

  return pathname.startsWith(target)
}

function getDisplayEmail(email: string | null | undefined) {
  if (!email) return 'workspace@user'
  if (email.length <= 28) return email
  return `${email.slice(0, 25)}...`
}

function getDisplayName(email: string | null | undefined) {
  if (!email) return 'Workspace user'
  const [localPart] = email.split('@')
  const cleaned = localPart.replace(/[._-]+/g, ' ').trim()
  if (!cleaned) return email
  return cleaned.replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function getAvatarLabel(email: string | null | undefined) {
  if (!email) return 'W'
  return email.charAt(0).toUpperCase()
}

interface AppShellProps {
  session: Session | null
}

export function AppShell({ session }: AppShellProps) {
  const location = useLocation()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const currentItem =
    navigationItems.find((item) => isActivePath(location.pathname, item.to)) ??
    navigationItems[0]
  const userEmail = session?.user.email
  const userName = getDisplayName(userEmail)

  async function handleSignOut() {
    if (!supabase) return
    setIsSigningOut(true)
    await supabase.auth.signOut()
    setIsSigningOut(false)
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">

        {/* ── Sidebar ────────────────────────────────────────────── */}
        <aside
          className="hidden w-60 shrink-0 flex-col border-r border-slate-200 xl:flex"
          style={{ background: 'var(--paper-warm)' }}
        >
          {/* Brand */}
          <div className="border-b border-slate-200 px-6 py-5">
            <p
              className="font-serif text-[22px] font-semibold leading-none tracking-[-0.02em]"
              style={{ color: 'var(--black)' }}
            >
              OPS
            </p>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em]"
               style={{ color: 'var(--muted)' }}>
              Internal Platform
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex flex-1 flex-col gap-0.5 px-3 py-4" aria-label="Main navigation">
            {navigationItems.map(({ icon: Icon, label, to }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/app'}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150',
                    isActive
                      ? 'bg-slate-900 text-slate-50'
                      : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900',
                  ].join(' ')
                }
              >
                <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Private badge */}
          <div className="border-t border-slate-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-3 w-3 shrink-0" style={{ color: 'var(--muted)' }} strokeWidth={1.5} />
              <p className="font-mono text-[9px] uppercase tracking-[0.14em]"
                 style={{ color: 'var(--muted)' }}>
                Private · Authorized access only
              </p>
            </div>
          </div>
        </aside>

        {/* ── Main content ───────────────────────────────────────── */}
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">

          {/* Header */}
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
            <div className="flex flex-col gap-3 px-5 py-4 md:px-8">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

                {/* Page label */}
                <div className="space-y-1">
                  <p className="eyebrow-label">{currentItem.label}</p>
                  <p className="text-xs leading-5 text-slate-500">{currentItem.description}</p>
                </div>

                {/* User + sign out */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <span
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full font-mono text-[11px] font-medium text-slate-50"
                      style={{ background: 'var(--black)' }}
                    >
                      {getAvatarLabel(userEmail)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-slate-900">{userName}</p>
                      <p className="truncate font-mono text-[10px] text-slate-500">
                        {getDisplayEmail(userEmail)}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    disabled={isSigningOut}
                    className="button-pill gap-1.5"
                  >
                    <LogOut className="h-3 w-3" strokeWidth={1.5} />
                    {isSigningOut ? 'Signing out…' : 'Logout'}
                  </button>
                </div>
              </div>

              {/* Mobile navigation pills */}
              <nav className="flex gap-1.5 overflow-x-auto xl:hidden" aria-label="Mobile navigation">
                {navigationItems.map(({ label, to }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/app'}
                    className={({ isActive }) =>
                      [
                        'whitespace-nowrap rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] transition-all duration-150',
                        isActive
                          ? 'border-slate-900 bg-slate-900 text-slate-50'
                          : 'border-slate-200 text-slate-600 hover:border-slate-400 hover:text-slate-900',
                      ].join(' ')
                    }
                  >
                    {label}
                  </NavLink>
                ))}
              </nav>
            </div>
          </header>

          <main className="flex-1 px-5 py-8 md:px-8 md:py-10">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
