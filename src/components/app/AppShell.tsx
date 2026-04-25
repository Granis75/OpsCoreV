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
        <aside className="hidden w-72 shrink-0 flex-col border-r border-slate-200/70 bg-white/72 px-6 py-5 backdrop-blur-xl xl:flex">
          <div className="mb-8 space-y-4">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white shadow-sm">
                OC
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight text-slate-950">Ops Core</p>
                <p className="text-[11px] leading-tight text-slate-400">Internal Platform</p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold tracking-tight text-slate-950">
                Operational workspace
              </p>
              <p className="text-sm leading-6 text-slate-500">
                Incidents, vendors, spend, and guest quality in one control surface.
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
                    'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-slate-950 text-white shadow-sm'
                      : 'text-slate-600 hover:-translate-y-px hover:bg-white hover:text-slate-950 hover:shadow-sm',
                  ].join(' ')
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="mt-6 flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-2.5">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <p className="text-[11px] leading-tight text-slate-400">
              Private platform · Authorized access only
            </p>
          </div>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/70 backdrop-blur-xl">
            <div className="flex flex-col gap-4 px-5 py-4 md:px-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <p className="eyebrow-label">
                    {currentItem.label}
                  </p>
                  <p className="max-w-2xl text-sm leading-6 text-slate-500">
                    {currentItem.description}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/90 px-3 py-2 text-sm text-slate-700 shadow-sm">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white shadow-sm">
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
                    className="button-pill gap-2"
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
                        'whitespace-nowrap rounded-full border px-3 py-2 text-sm font-medium transition-all duration-150',
                        isActive
                          ? 'border-slate-950 bg-slate-950 text-white shadow-sm'
                          : 'border-slate-200/80 bg-white/85 text-slate-600 hover:-translate-y-px hover:bg-white hover:text-slate-950 hover:shadow-sm',
                      ].join(' ')
                    }
                  >
                    {label}
                  </NavLink>
                ))}
              </nav>
            </div>
          </header>

          <main className="flex-1 px-5 py-7 md:px-8 md:py-10">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
