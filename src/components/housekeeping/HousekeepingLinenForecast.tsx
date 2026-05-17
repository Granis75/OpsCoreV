import { SurfaceCard } from '../ui/SurfaceCard'
import type { HousekeepingEntry } from '../../types/housekeeping'
import { aggregateDailyLinenConsumption, getTotalLinenUnits } from '../../lib/housekeeping/calculations'

interface HousekeepingLinenForecastProps {
  entries: HousekeepingEntry[]
}

export function HousekeepingLinenForecast({
  entries,
}: HousekeepingLinenForecastProps) {
  const linens = aggregateDailyLinenConsumption(entries)
  const totalUnits = getTotalLinenUnits(linens)

  const linenItems = [
    { name: 'Large sheets', quantity: linens.largeSheets, color: 'blue' },
    { name: 'Large duvet covers', quantity: linens.largeDuvetCovers, color: 'blue' },
    { name: 'Small sheets', quantity: linens.smallSheets, color: 'slate' },
    { name: 'Small duvet covers', quantity: linens.smallDuvetCovers, color: 'slate' },
    { name: 'Pillowcases', quantity: linens.pillowcases, color: 'amber' },
    { name: 'Large towels', quantity: linens.largeTowels, color: 'emerald' },
    { name: 'Small towels', quantity: linens.smallTowels, color: 'emerald' },
    { name: 'Kitchen towels', quantity: linens.kitchenTowels, color: 'orange' },
    { name: 'Bath mats', quantity: linens.bathMats, color: 'purple' },
  ]

  const colorMap: Record<string, { bg: string; text: string; bar: string }> = {
    blue: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      bar: 'bg-blue-500',
    },
    slate: {
      bg: 'bg-slate-50',
      text: 'text-slate-700',
      bar: 'bg-slate-500',
    },
    amber: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      bar: 'bg-amber-500',
    },
    emerald: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      bar: 'bg-emerald-500',
    },
    orange: {
      bg: 'bg-orange-50',
      text: 'text-orange-700',
      bar: 'bg-orange-500',
    },
    purple: {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      bar: 'bg-purple-500',
    },
  }

  return (
    <div className="space-y-8">
      {/* Total summary */}
      <SurfaceCard
        title="Daily linen requirements"
        description="Complete forecast of all linen needed for today's operations."
      >
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <div className="p-4 rounded-lg bg-slate-100 border border-slate-200 text-center">
            <p className="text-xs font-mono text-slate-600 uppercase tracking-widest mb-2">
              Total linen units
            </p>
            <p className="text-4xl font-serif font-bold text-slate-900">{totalUnits}</p>
          </div>

          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 text-center">
            <p className="text-xs font-mono text-blue-600 uppercase tracking-widest mb-2">
              Bed linen
            </p>
            <p className="text-4xl font-serif font-bold text-blue-900">
              {linens.largeSheets + linens.largeDuvetCovers + linens.smallSheets + linens.smallDuvetCovers}
            </p>
          </div>

          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-center">
            <p className="text-xs font-mono text-emerald-600 uppercase tracking-widest mb-2">
              Towels
            </p>
            <p className="text-4xl font-serif font-bold text-emerald-900">
              {linens.largeTowels + linens.smallTowels + linens.kitchenTowels + linens.bathMats}
            </p>
          </div>
        </div>
      </SurfaceCard>

      {/* Detailed breakdown */}
      <SurfaceCard
        title="Detailed breakdown"
        description="Item-by-item linen consumption."
      >
        <div className="space-y-4">
          {linenItems.map((item) => {
            const colors = colorMap[item.color]
            const maxWidth = Math.max(...linenItems.map(i => i.quantity))

            return (
              <div key={item.name} className={`p-4 rounded-lg ${colors.bg} border border-slate-200`}>
                <div className="flex items-center justify-between mb-2">
                  <p className={`font-medium ${colors.text}`}>{item.name}</p>
                  <p className={`font-mono font-semibold text-lg ${colors.text}`}>
                    {item.quantity}
                  </p>
                </div>

                {/* Progress bar */}
                {maxWidth > 0 && (
                  <div className="w-full h-2 bg-white rounded-full overflow-hidden border border-slate-200">
                    <div
                      className={`h-full ${colors.bar} transition-all duration-300`}
                      style={{
                        width: `${(item.quantity / maxWidth) * 100}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </SurfaceCard>

      {/* Categories */}
      <SurfaceCard
        title="Linen categories"
        description="Organized by linen type and usage."
      >
        <div className="grid gap-6 md:grid-cols-3">
          {/* Bed linen */}
          <div className="border-l-4 border-blue-500 pl-4">
            <h3 className="font-semibold text-slate-900 mb-3">Bed Linen</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Large sheets</span>
                <span className="font-mono font-medium">{linens.largeSheets}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Large duvet covers</span>
                <span className="font-mono font-medium">{linens.largeDuvetCovers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Small sheets</span>
                <span className="font-mono font-medium">{linens.smallSheets}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Small duvet covers</span>
                <span className="font-mono font-medium">{linens.smallDuvetCovers}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-blue-200">
                <span className="text-slate-600 font-medium">Subtotal</span>
                <span className="font-mono font-semibold">
                  {linens.largeSheets + linens.largeDuvetCovers + linens.smallSheets + linens.smallDuvetCovers}
                </span>
              </div>
            </div>
          </div>

          {/* Personal linen */}
          <div className="border-l-4 border-amber-500 pl-4">
            <h3 className="font-semibold text-slate-900 mb-3">Personal Items</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Pillowcases</span>
                <span className="font-mono font-medium">{linens.pillowcases}</span>
              </div>
              <div className="pt-2 border-t border-amber-200">
                <span className="text-slate-600 font-medium">Subtotal</span>
                <span className="font-mono font-semibold block">{linens.pillowcases}</span>
              </div>
            </div>
          </div>

          {/* Towels & miscellaneous */}
          <div className="border-l-4 border-emerald-500 pl-4">
            <h3 className="font-semibold text-slate-900 mb-3">Towels & Other</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Large towels</span>
                <span className="font-mono font-medium">{linens.largeTowels}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Small towels</span>
                <span className="font-mono font-medium">{linens.smallTowels}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Kitchen towels</span>
                <span className="font-mono font-medium">{linens.kitchenTowels}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Bath mats</span>
                <span className="font-mono font-medium">{linens.bathMats}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-emerald-200">
                <span className="text-slate-600 font-medium">Subtotal</span>
                <span className="font-mono font-semibold">
                  {linens.largeTowels + linens.smallTowels + linens.kitchenTowels + linens.bathMats}
                </span>
              </div>
            </div>
          </div>
        </div>
      </SurfaceCard>
    </div>
  )
}
