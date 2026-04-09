import { useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { LogOut } from 'lucide-react'
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
  if (!email) {
    return 'workspace@user'
  }

  if (email.length <= 28) {
    return email
  }

  return `${email.slice(0, 25)}...`
}

function getDisplayName(email: string | null | undefined) {
  if (!email) {
    return 'Workspace user'
  }

  const [localPart] = email.split('@')
  const cleaned = localPart.replace(/[._-]+/g, ' ').trim()

  if (!cleaned) {
    return email
  }

  return cleaned.replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function getAvatarLabel(email: string | null | undefined) {
  if (!email) {
    return 'W'
  }

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
    if (!supabase) {
      return
    }

    setIsSigningOut(true)
    await supabase.auth.signOut()
    setIsSigningOut(false)
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-72 shrink-0 border-r border-slate-200/80 bg-white/80 px-5 py-6 backdrop-blur xl:flex xl:flex-col">
          <div className="mb-8 space-y-4">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white shadow-shell">
              OC
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Ops Core V12
              </p>
              <p className="text-xl font-semibold tracking-tight text-slate-950">
                Operational workspace
              </p>
              <p className="text-sm leading-6 text-slate-600">
                Shared control surface for incidents, vendors, spend, and guest quality.
              </p>
            </div>
          </div>

          <nav className="flex flex-1 flex-col gap-2" aria-label="Main navigation">
            {navigationItems.map(({ icon: Icon, label, to }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/app'}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-slate-950 text-white shadow-shell'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
                  ].join(' ')
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="border-b border-slate-200/80 bg-white/70 backdrop-blur">
            <div className="flex flex-col gap-4 px-5 py-5 md:px-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    {currentItem.label}
                  </p>
                  <p className="max-w-2xl text-sm leading-7 text-slate-600">
                    {currentItem.description}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">
                      {getAvatarLabel(userEmail)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {userName}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {getDisplayEmail(userEmail)}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    disabled={isSigningOut}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    {isSigningOut ? 'Signing out...' : 'Logout'}
                  </button>
                </div>
              </div>

              <nav
                className="flex gap-2 overflow-x-auto xl:hidden"
                aria-label="Mobile navigation"
              >
                {navigationItems.map(({ label, to }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/app'}
                    className={({ isActive }) =>
                      [
                        'whitespace-nowrap rounded-full border px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'border-slate-950 bg-slate-950 text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:text-slate-950',
                      ].join(' ')
                    }
                  >
                    {label}
                  </NavLink>
                ))}
              </nav>
            </div>
          </header>

          <main className="flex-1 px-5 py-6 md:px-8 md:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
