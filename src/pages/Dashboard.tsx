import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageSection } from '../components/ui/PageSection'
import { SurfaceCard } from '../components/ui/SurfaceCard'
import { navigationItems } from '../data/navigation'
import { isSupabaseConfigured } from '../lib/supabase'

export function Dashboard() {
  const modules = navigationItems.filter((item) => item.to !== '/')

  return (
    <PageSection
      title="Dashboard"
      description="Socle frontend configure pour brancher rapidement les modules metier sans conserver le boilerplate Vite."
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
        <SurfaceCard
          title="Workspace pret"
          description="Routing, AppShell, Tailwind et structure produit sont en place avec un layout stable pour les prochaines iterations UI."
        />

        <SurfaceCard
          title="Supabase"
          description={
            isSupabaseConfigured
              ? 'Les variables VITE_SUPABASE_* sont presentes et le client frontend est initialisable.'
              : 'Renseigner VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY pour activer le client frontend.'
          }
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {modules.map(({ description, icon: Icon, label, to }) => (
          <Link key={to} to={to}>
            <SurfaceCard title={label} description={description} className="h-full">
              <div className="flex items-center justify-between">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <Icon className="h-5 w-5" />
                </span>
                <ArrowUpRight className="h-4 w-4 text-slate-400" />
              </div>
            </SurfaceCard>
          </Link>
        ))}
      </div>
    </PageSection>
  )
}
