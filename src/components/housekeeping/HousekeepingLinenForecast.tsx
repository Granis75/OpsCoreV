import { SurfaceCard } from '../ui/SurfaceCard'
import type { HousekeepingConfiguration, HousekeepingEntry, HousekeepingItemCategory } from '../../types/housekeeping'
import { itemCategoryLabels } from '../../types/housekeeping'
import { aggregateDailyItemConsumption, getTotalItemUnits } from '../../lib/housekeeping/calculations'

interface HousekeepingLinenForecastProps {
  entries: HousekeepingEntry[]
  configuration: HousekeepingConfiguration
}

export function HousekeepingLinenForecast({
  entries,
  configuration,
}: HousekeepingLinenForecastProps) {
  const items = aggregateDailyItemConsumption(
    entries,
    configuration.items,
    configuration.consumptionRules,
  ).filter((item) => item.includeInForecast)
  const visibleItems = items.filter((item) => item.quantity > 0)
  const totalUnits = getTotalItemUnits(items, 'forecast')
  const groupedItems = visibleItems.reduce<Record<string, typeof visibleItems>>((groups, item) => {
    const key = item.category ?? 'other'
    groups[key] = groups[key] ?? []
    groups[key].push(item)
    return groups
  }, {})

  return (
    <div className="space-y-8">
      <SurfaceCard
        title="Daily item requirements"
        description="Forecast based on configured items and consumption rules."
      >
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <div className="p-4 rounded-lg bg-slate-100 border border-slate-200 text-center">
            <p className="text-xs font-mono text-slate-600 uppercase tracking-widest mb-2">
              Total units
            </p>
            <p className="text-4xl font-serif font-bold text-slate-900">{totalUnits}</p>
          </div>

          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 text-center">
            <p className="text-xs font-mono text-blue-600 uppercase tracking-widest mb-2">
              Tracked items
            </p>
            <p className="text-4xl font-serif font-bold text-blue-900">{visibleItems.length}</p>
          </div>

          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-center">
            <p className="text-xs font-mono text-emerald-600 uppercase tracking-widest mb-2">
              Configured rules
            </p>
            <p className="text-4xl font-serif font-bold text-emerald-900">
              {configuration.consumptionRules.length}
            </p>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard
        title="Item breakdown"
        description="Only forecast-enabled items with expected usage are shown."
      >
        {visibleItems.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-slate-500">No item consumption forecasted for this date.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleItems.map((item) => {
              const maxQuantity = Math.max(...visibleItems.map((candidate) => candidate.quantity))
              return (
                <div key={item.itemId} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-slate-900">{item.itemLabel}</p>
                      <p className="text-xs text-slate-500">{item.unitLabel}</p>
                    </div>
                    <p className="font-mono font-semibold text-lg text-slate-900">{item.quantity}</p>
                  </div>

                  {maxQuantity > 0 && (
                    <div className="h-2 overflow-hidden rounded-full border border-slate-200 bg-white">
                      <div
                        className="h-full bg-slate-500"
                        style={{ width: `${(item.quantity / maxQuantity) * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </SurfaceCard>

      {Object.keys(groupedItems).length > 0 && (
        <SurfaceCard
          title="Categories"
          description="Configured item groups for operational preparation."
        >
          <div className="grid gap-6 md:grid-cols-3">
            {Object.entries(groupedItems).map(([category, categoryItems]) => (
              <div key={category} className="border-l-4 border-slate-400 pl-4">
                <h3 className="font-semibold text-slate-900 mb-3">
                  {itemCategoryLabels[category as HousekeepingItemCategory] ?? 'Other'}
                </h3>
                <div className="space-y-2 text-sm">
                  {categoryItems.map((item) => (
                    <div key={item.itemId} className="flex justify-between gap-4">
                      <span className="text-slate-600">{item.itemLabel}</span>
                      <span className="font-mono font-medium">{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>
      )}
    </div>
  )
}
