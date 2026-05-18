import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowDown, ArrowUp, Package } from 'lucide-react'
import { SurfaceCard } from '../ui/SurfaceCard'
import { ActionDrawer } from '../ui/ActionDrawer'
import type {
  HousekeepingConfiguration,
  HousekeepingItem,
  HousekeepingItemStockSetting,
  HousekeepingStockMovement,
  HousekeepingStockMovementType,
  StockForecastRow,
  StockOverviewSummary,
  StockStatus,
} from '../../types/housekeeping'
import { stockMovementTypeLabels, stockStatusLabels } from '../../types/housekeeping'
import {
  aggregateDailyItemConsumption,
  buildStockForecastRows,
  computeStockOverviewSummary,
} from '../../lib/housekeeping/calculations'
import {
  createStockMovement,
  getDailyPlansWithEntriesInRange,
  getItemStockSettings,
  getRecentStockMovements,
  upsertItemStockSetting,
} from '../../lib/housekeeping/stockData'
import type { StockMovementInput, StockSettingInput } from '../../lib/housekeeping/stockData'

// ── Date helpers ──────────────────────────────────────────────────────────────

function localDateString(offsetDays = 0): string {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ── Status badge ──────────────────────────────────────────────────────────────

const statusStyles: Record<StockStatus, string> = {
  healthy: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  low: 'bg-amber-50 text-amber-700 border border-amber-200',
  critical: 'bg-red-50 text-red-700 border border-red-200',
}

function StatusBadge({ status }: { status: StockStatus }) {
  return (
    <span className={['inline-block rounded px-2 py-0.5 text-xs font-medium', statusStyles[status]].join(' ')}>
      {stockStatusLabels[status]}
    </span>
  )
}

// ── KPI card ──────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string
  value: number
  suffix?: string
  variant?: 'default' | 'warning' | 'danger'
}

function KpiCard({ label, value, suffix, variant = 'default' }: KpiCardProps) {
  const isWarning = variant === 'warning'
  const isDanger = variant === 'danger'
  const bg = isDanger ? 'bg-red-50 border-red-200' : isWarning ? 'bg-amber-50 border-amber-200' : 'bg-slate-100 border-slate-200'
  const labelColor = isDanger ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-slate-600'
  const valueColor = isDanger ? 'text-red-900' : isWarning ? 'text-amber-900' : 'text-slate-900'

  return (
    <div className={['p-4 rounded-lg border text-center', bg].join(' ')}>
      <p className={['text-xs font-mono uppercase tracking-widest mb-2', labelColor].join(' ')}>
        {label}
      </p>
      <p className={['text-4xl font-serif font-bold', valueColor].join(' ')}>
        {value}
        {suffix ? <span className="text-xl ml-1 font-medium">{suffix}</span> : null}
      </p>
    </div>
  )
}

// ── Risk table ────────────────────────────────────────────────────────────────

interface StockRiskTableProps {
  rows: StockForecastRow[]
  onAdjust: (itemId: string) => void
}

function StockRiskTable({ rows, onAdjust }: StockRiskTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="px-4 py-3 text-left font-medium text-slate-600">Item</th>
            <th className="px-4 py-3 text-right font-medium text-slate-600">Current</th>
            <th className="px-4 py-3 text-right font-medium text-slate-600">Incoming</th>
            <th className="px-4 py-3 text-right font-medium text-slate-600">Forecast demand</th>
            <th className="px-4 py-3 text-right font-medium text-slate-600">Projected</th>
            <th className="px-4 py-3 text-right font-medium text-slate-600">Min</th>
            <th className="px-4 py-3 text-right font-medium text-slate-600">Target</th>
            <th className="px-4 py-3 text-right font-medium text-slate-600">Suggested reorder</th>
            <th className="px-4 py-3 text-center font-medium text-slate-600">Status</th>
            <th className="px-4 py-3 text-center font-medium text-slate-600">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.itemId} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="px-4 py-3">
                <p className="font-medium text-slate-900">{row.itemLabel}</p>
                <p className="text-xs text-slate-400">{row.unitLabel}</p>
              </td>
              <td className="px-4 py-3 text-right font-mono">{row.currentStock}</td>
              <td className="px-4 py-3 text-right font-mono">
                {row.incomingStock > 0 ? (
                  <span className="text-emerald-700">+{row.incomingStock}</span>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-right font-mono text-slate-700">{row.forecastDemand}</td>
              <td className="px-4 py-3 text-right font-mono font-semibold">
                <span className={row.projectedStock < 0 ? 'text-red-700' : row.projectedStock < row.minimumStock ? 'text-amber-700' : 'text-slate-900'}>
                  {row.projectedStock}
                </span>
              </td>
              <td className="px-4 py-3 text-right font-mono text-slate-500">{row.minimumStock}</td>
              <td className="px-4 py-3 text-right font-mono text-slate-500">{row.targetStock}</td>
              <td className="px-4 py-3 text-right font-mono font-semibold">
                {row.suggestedReorder > 0 ? (
                  <span className="text-slate-900">{row.suggestedReorder}</span>
                ) : (
                  <span className="text-slate-300">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-center">
                <StatusBadge status={row.status} />
              </td>
              <td className="px-4 py-3 text-center">
                <button
                  type="button"
                  onClick={() => onAdjust(row.itemId)}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  Adjust
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyStateNoTrackedItems({ onConfigure }: { onConfigure: () => void }) {
  return (
    <div className="py-16 text-center">
      <Package className="mx-auto h-10 w-10 text-slate-300 mb-4" strokeWidth={1.5} />
      <p className="font-medium text-slate-700 mb-1">No items are being tracked in stock yet.</p>
      <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
        Enable stock tracking for selected housekeeping items to monitor availability and
        replenishment needs.
      </p>
      <button type="button" onClick={onConfigure} className="button-pill">
        Configure stock tracking
      </button>
    </div>
  )
}

// ── Movements table ───────────────────────────────────────────────────────────

const movementTypeIcon = {
  adjustment: ArrowDown,
  replenishment: ArrowUp,
  consumption_correction: ArrowDown,
}

interface MovementsTableProps {
  movements: HousekeepingStockMovement[]
  items: HousekeepingItem[]
}

function MovementsTable({ movements, items }: MovementsTableProps) {
  if (movements.length === 0) {
    return (
      <p className="text-sm text-slate-400 py-4">No stock adjustments recorded yet.</p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="px-4 py-3 text-left font-medium text-slate-600">Date</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Item</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Type</th>
            <th className="px-4 py-3 text-right font-medium text-slate-600">Quantity change</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Note</th>
          </tr>
        </thead>
        <tbody>
          {movements.map((mvt) => {
            const item = items.find((i) => i.id === mvt.itemId)
            const Icon = movementTypeIcon[mvt.movementType]
            const isPositive = mvt.quantityDelta > 0

            return (
              <tr key={mvt.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                  {formatDateTime(mvt.createdAt)}
                </td>
                <td className="px-4 py-3 font-medium text-slate-900">
                  {item?.label ?? mvt.itemId}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {stockMovementTypeLabels[mvt.movementType]}
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={[
                      'inline-flex items-center gap-1 font-mono font-semibold',
                      isPositive ? 'text-emerald-700' : 'text-red-700',
                    ].join(' ')}
                  >
                    <Icon className="h-3 w-3" strokeWidth={2} />
                    {isPositive ? '+' : ''}{mvt.quantityDelta}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {mvt.note ?? <span className="text-slate-300">—</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Configure stock tracking ──────────────────────────────────────────────────

interface StockConfigureRowProps {
  item: HousekeepingItem
  setting: HousekeepingItemStockSetting | undefined
  onSaved: (updated: HousekeepingItemStockSetting) => void
}

function StockConfigureRow({ item, setting, onSaved }: StockConfigureRowProps) {
  const [enabled, setEnabled] = useState(setting?.stockTrackingEnabled ?? false)
  const [currentStock, setCurrentStock] = useState(setting?.currentStock ?? 0)
  const [minimumStock, setMinimumStock] = useState(setting?.minimumStock ?? 0)
  const [targetStock, setTargetStock] = useState(setting?.targetStock ?? 0)
  const [incomingStock, setIncomingStock] = useState(setting?.incomingStock ?? 0)
  const [isSaving, setIsSaving] = useState(false)
  const [savedOk, setSavedOk] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setIsSaving(true)
    setSavedOk(false)
    setError(null)

    const input: StockSettingInput = {
      itemId: item.id,
      stockTrackingEnabled: enabled,
      currentStock,
      minimumStock,
      targetStock,
      incomingStock,
    }

    try {
      const updated = await upsertItemStockSetting(input)
      onSaved(updated)
      setSavedOk(true)
      setTimeout(() => setSavedOk(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 p-4 space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-medium text-slate-900 text-sm">{item.label}</p>
          <p className="text-xs text-slate-400">{item.unitLabel}</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="rounded border-slate-300"
          />
          Track stock
        </label>
      </div>

      {enabled && (
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">Current stock</span>
            <input
              type="number"
              min={0}
              value={currentStock}
              onChange={(e) => setCurrentStock(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="field-input"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">Incoming</span>
            <input
              type="number"
              min={0}
              value={incomingStock}
              onChange={(e) => setIncomingStock(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="field-input"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">Minimum stock</span>
            <input
              type="number"
              min={0}
              value={minimumStock}
              onChange={(e) => setMinimumStock(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="field-input"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">Target stock</span>
            <input
              type="number"
              min={0}
              value={targetStock}
              onChange={(e) => setTargetStock(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="field-input"
            />
          </label>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex items-center justify-between gap-2">
        {savedOk ? (
          <p className="text-xs text-emerald-600 font-medium">Saved</p>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSaving}
          className="button-pill ml-auto"
        >
          {isSaving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

interface StockConfigureContentProps {
  items: HousekeepingItem[]
  stockSettings: HousekeepingItemStockSetting[]
  onSaved: (updated: HousekeepingItemStockSetting) => void
}

function StockConfigureContent({ items, stockSettings, onSaved }: StockConfigureContentProps) {
  const settingByItemId = new Map(stockSettings.map((s) => [s.itemId, s]))

  if (items.length === 0) {
    return (
      <p className="text-sm text-slate-500 py-4">
        No active housekeeping items found. Add items in Settings first.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        Enable stock tracking for items you want to monitor. Set thresholds to drive status and
        reorder suggestions.
      </p>
      {items.map((item) => (
        <StockConfigureRow
          key={item.id}
          item={item}
          setting={settingByItemId.get(item.id)}
          onSaved={onSaved}
        />
      ))}
    </div>
  )
}

// ── Adjust stock drawer ───────────────────────────────────────────────────────

interface StockAdjustContentProps {
  row: StockForecastRow | null
  onSaved: () => void
}

const movementTypes: HousekeepingStockMovementType[] = [
  'replenishment',
  'adjustment',
  'consumption_correction',
]

function StockAdjustContent({ row, onSaved }: StockAdjustContentProps) {
  const [movementType, setMovementType] = useState<HousekeepingStockMovementType>('replenishment')
  const [quantityDelta, setQuantityDelta] = useState(0)
  const [note, setNote] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!row) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (quantityDelta === 0) {
      setError('Quantity delta must be non-zero.')
      return
    }

    setIsSaving(true)
    setError(null)

    const input: StockMovementInput = {
      itemId: row!.itemId,
      movementType,
      quantityDelta,
      note: note.trim() || null,
    }

    try {
      await createStockMovement(input)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record movement.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-medium text-slate-500 mb-1">Item</p>
        <p className="font-medium text-slate-900">{row.itemLabel}</p>
        <p className="text-xs text-slate-400 mt-0.5">
          Current stock: <span className="font-mono font-semibold">{row.currentStock}</span>{' '}
          {row.unitLabel}
        </p>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-700">Movement type</span>
        <select
          value={movementType}
          onChange={(e) => setMovementType(e.target.value as HousekeepingStockMovementType)}
          className="field-input"
        >
          {movementTypes.map((type) => (
            <option key={type} value={type}>
              {stockMovementTypeLabels[type]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-700">
          Quantity delta{' '}
          <span className="font-normal text-slate-400 text-xs">(positive = stock in, negative = stock out)</span>
        </span>
        <input
          type="number"
          value={quantityDelta}
          onChange={(e) => setQuantityDelta(parseInt(e.target.value, 10) || 0)}
          placeholder="+40 received, -5 correction"
          className="field-input"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-700">
          Note <span className="font-normal text-slate-400 text-xs">(optional)</span>
        </span>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Laundry return, recount correction…"
          className="field-input"
        />
      </label>

      {quantityDelta !== 0 && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs text-slate-500">
            New stock after this movement:{' '}
            <span className="font-mono font-semibold text-slate-900">
              {row.currentStock + quantityDelta}
            </span>{' '}
            {row.unitLabel}
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <button type="submit" disabled={isSaving} className="button-pill w-full justify-center">
        {isSaving ? 'Recording…' : 'Record movement'}
      </button>
    </form>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface HousekeepingStockReplenishmentProps {
  configuration: HousekeepingConfiguration
}

export function HousekeepingStockReplenishment({
  configuration,
}: HousekeepingStockReplenishmentProps) {
  const [forecastHorizon, setForecastHorizon] = useState(7)
  const [stockSettings, setStockSettings] = useState<HousekeepingItemStockSetting[]>([])
  const [forecastRows, setForecastRows] = useState<StockForecastRow[]>([])
  const [movements, setMovements] = useState<HousekeepingStockMovement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [adjustItemId, setAdjustItemId] = useState<string | null>(null)
  const [isConfigureOpen, setIsConfigureOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const summary: StockOverviewSummary = computeStockOverviewSummary(forecastRows)
  const adjustRow = forecastRows.find((r) => r.itemId === adjustItemId) ?? null
  const activeItems = configuration.items.filter((i) => i.active)

  useEffect(() => {
    let isMounted = true

    async function load() {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const startDate = localDateString(0)
        const endDate = localDateString(forecastHorizon - 1)

        const [settingsData, movementsData, plansWithEntries] = await Promise.all([
          getItemStockSettings(),
          getRecentStockMovements(20),
          getDailyPlansWithEntriesInRange(startDate, endDate),
        ])

        const allEntries = plansWithEntries.flatMap((p) => p.entries)
        const forecastConsumption = aggregateDailyItemConsumption(
          allEntries,
          configuration.items,
          configuration.consumptionRules,
        )
        const rows = buildStockForecastRows(settingsData, configuration.items, forecastConsumption)

        if (isMounted) {
          setStockSettings(settingsData)
          setMovements(movementsData)
          setForecastRows(rows)
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load stock data.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      isMounted = false
    }
  }, [forecastHorizon, configuration, refreshKey])

  function handleStockSettingUpdated(updated: HousekeepingItemStockSetting) {
    setStockSettings((prev) => {
      const idx = prev.findIndex((s) => s.itemId === updated.itemId)
      return idx >= 0 ? prev.map((s, i) => (i === idx ? updated : s)) : [...prev, updated]
    })
    setRefreshKey((k) => k + 1)
  }

  function handleMovementSaved() {
    setAdjustItemId(null)
    setRefreshKey((k) => k + 1)
  }

  return (
    <div className="space-y-8">
      {/* Overview & risk table */}
      <SurfaceCard
        title="Stock & Replenishment"
        description="Track available operating stock, anticipate demand from scheduled housekeeping plans, and identify what should be replenished."
      >
        {/* Controls row */}
        <div className="flex items-start gap-4 mb-8 flex-wrap">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">Forecast horizon</span>
            <select
              value={forecastHorizon}
              onChange={(e) => setForecastHorizon(parseInt(e.target.value, 10))}
              className="field-input w-36"
            >
              <option value={3}>3 days</option>
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
            </select>
          </label>
          <p className="text-xs text-slate-400 mt-6 leading-5 max-w-xs">
            Demand is calculated from housekeeping plans already scheduled within the selected
            horizon.
          </p>
          <button
            type="button"
            onClick={() => setIsConfigureOpen(true)}
            className="button-pill mt-5 ml-auto"
          >
            Configure stock tracking
          </button>
        </div>

        {/* KPI cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <KpiCard label="Tracked Items" value={summary.trackedItems} />
          <KpiCard label="Items at Risk" value={summary.itemsAtRisk} variant="warning" />
          <KpiCard label="Critical Shortages" value={summary.criticalShortages} variant="danger" />
          <KpiCard
            label="Total Suggested Reorder"
            value={summary.totalSuggestedReorderUnits}
            suffix="units"
          />
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 flex gap-3">
            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" strokeWidth={1.5} />
            <p className="text-sm text-red-700">{errorMessage}</p>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-sm text-slate-500">Loading stock data…</p>
          </div>
        ) : forecastRows.length === 0 ? (
          <EmptyStateNoTrackedItems onConfigure={() => setIsConfigureOpen(true)} />
        ) : (
          <>
            <p className="text-xs text-slate-400 mb-3">
              Suggested reorder restores projected stock to the target level.
            </p>
            <StockRiskTable rows={forecastRows} onAdjust={(id) => setAdjustItemId(id)} />
          </>
        )}
      </SurfaceCard>

      {/* Recent movements */}
      <SurfaceCard
        title="Recent stock movements"
        description="Manual adjustments and replenishments recorded for tracked items."
      >
        <MovementsTable movements={movements} items={configuration.items} />
      </SurfaceCard>

      {/* Configure stock tracking */}
      <ActionDrawer
        isOpen={isConfigureOpen}
        onClose={() => setIsConfigureOpen(false)}
        title="Configure stock tracking"
      >
        <StockConfigureContent
          items={activeItems}
          stockSettings={stockSettings}
          onSaved={handleStockSettingUpdated}
        />
      </ActionDrawer>

      {/* Adjust stock */}
      <ActionDrawer
        isOpen={adjustItemId !== null}
        onClose={() => setAdjustItemId(null)}
        title="Adjust stock"
      >
        <StockAdjustContent row={adjustRow} onSaved={handleMovementSaved} />
      </ActionDrawer>
    </div>
  )
}
