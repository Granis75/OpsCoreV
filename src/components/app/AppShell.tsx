import { DatabaseZap, ShieldCheck } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { navigationItems } from '../../data/navigation'
import { isSupabaseConfigured } from '../../lib/supabase'

function isActivePath(pathname: string, target: string) {
  if (target === '/') {
    return pathname === '/'
  }

  return pathname.startsWith(target)
}

export function AppShell() {
  const location = useLocation()
  const currentItem =
    navigationItems.find((item) => isActivePath(location.pathname, item.to)) ??
    navigationItems[0]

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
                Product workspace
              </p>
              <p className="text-sm leading-6 text-slate-600">
                Base frontend prete pour brancher les modules operations.
              </p>
            </div>
          </div>

          <nav className="flex flex-1 flex-col gap-2" aria-label="Main navigation">
            {navigationItems.map(({ icon: Icon, label, to }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
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

          <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Stack active
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              <li>React 19 + TypeScript</li>
              <li>Vite 8</li>
              <li>Tailwind CSS</li>
              <li>React Router</li>
              <li>Supabase client</li>
            </ul>
          </div>
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
                  <span
                    className={[
                      'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium',
                      isSupabaseConfigured
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-amber-200 bg-amber-50 text-amber-700',
                    ].join(' ')}
                  >
                    <DatabaseZap className="h-3.5 w-3.5" />
                    {isSupabaseConfigured
                      ? 'Supabase env configured'
                      : 'Supabase env missing'}
                  </span>

                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Frontend shell ready
                  </span>
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
                    end={to === '/'}
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
