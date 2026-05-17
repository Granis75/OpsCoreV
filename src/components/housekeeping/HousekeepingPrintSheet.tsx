import type {
  HousekeepingConfiguration,
  HousekeepingDailyPlan,
  HousekeepingEntry,
} from '../../types/housekeeping'
import {
  aggregateDailyItemConsumption,
  countInterventionTypes,
  getInterventionTypeLabel,
} from '../../lib/housekeeping/calculations'

interface HousekeepingPrintSheetProps {
  dailyPlan: HousekeepingDailyPlan
  entries: HousekeepingEntry[]
  configuration: HousekeepingConfiguration
}

function formatDateOnly(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatPrintedAt() {
  return new Date().toLocaleString('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export function HousekeepingPrintSheet({
  dailyPlan,
  entries,
  configuration,
}: HousekeepingPrintSheetProps) {
  const serviceCounts = countInterventionTypes(entries, configuration.interventionTypes)
    .filter((service) => service.count > 0)
  const itemsToPrepare = aggregateDailyItemConsumption(
    entries,
    configuration.items,
    configuration.consumptionRules,
  ).filter((item) => item.includeInPrint && item.quantity > 0)
  const formattedDate = formatDateOnly(dailyPlan.serviceDate)
  const printedAt = formatPrintedAt()

  return (
    <>
      <style>{printStyles}</style>
      <div className="print-sheet bg-white">
        <div className="no-print mb-6 flex gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="button-primary gap-2"
          >
            Print sheet
          </button>
        </div>

        <div id="printable-content" className="bg-white p-8 print:p-0">
          <div className="print-header mb-5 border-b-2 border-slate-900 pb-4">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-xs font-mono font-semibold uppercase tracking-widest text-slate-600">
                  OPS Housekeeping Sheet
                </p>
                <h1 className="mt-1 text-2xl font-serif font-bold text-slate-900">
                  Gouvernante Sheet
                </h1>
                <p className="mt-1 text-sm font-medium text-slate-800">{formattedDate}</p>
              </div>

              <div className="text-right text-xs text-slate-600">
                <p>Printed: {printedAt}</p>
                <p>
                  Cleaners ordered:{' '}
                  <span className="font-semibold text-slate-900">{dailyPlan.cleanersOrdered}</span>
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-5 gap-2 text-xs">
              <SummaryBox label="Apartments" value={entries.length} />
              <SummaryBox label="Cleaners" value={dailyPlan.cleanersOrdered} />
              {serviceCounts.slice(0, 3).map((service) => (
                <SummaryBox key={service.interventionTypeId} label={service.label} value={service.count} />
              ))}
            </div>

            {dailyPlan.generalNote ? (
              <div className="mt-3 border border-slate-900 px-3 py-2 text-xs">
                <span className="font-semibold uppercase">Daily note: </span>
                {dailyPlan.generalNote}
              </div>
            ) : null}
          </div>

          <div className="mb-5">
            <table className="main-print-table w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="w-[3%] border border-slate-400 px-1.5 py-1.5 text-center font-semibold">#</th>
                  <th className="w-[9%] border border-slate-400 px-1.5 py-1.5 text-left font-semibold">Apartment</th>
                  <th className="w-[14%] border border-slate-400 px-1.5 py-1.5 text-left font-semibold">Service</th>
                  <th className="w-[5%] border border-slate-400 px-1.5 py-1.5 text-center font-semibold">PX</th>
                  <th className="w-[5%] border border-slate-400 px-1.5 py-1.5 text-center font-semibold">GL</th>
                  <th className="w-[5%] border border-slate-400 px-1.5 py-1.5 text-center font-semibold">LS</th>
                  <th className="w-[6%] border border-slate-400 px-1.5 py-1.5 text-center font-semibold">LITBB</th>
                  <th className="border border-slate-400 px-1.5 py-1.5 text-left font-semibold">Reception memo</th>
                  <th className="w-[8%] border border-slate-400 px-1.5 py-1.5 text-center font-semibold">Done</th>
                  <th className="w-[8%] border border-slate-400 px-1.5 py-1.5 text-center font-semibold">Checked</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, index) => (
                  <tr key={entry.id}>
                    <td className="border border-slate-400 px-1.5 py-2 text-center font-mono">{index + 1}</td>
                    <td className="border border-slate-400 px-1.5 py-2 font-mono font-semibold">{entry.apartmentLabel}</td>
                    <td className="border border-slate-400 px-1.5 py-2">
                      {getInterventionTypeLabel(entry.interventionTypeId, configuration.interventionTypes)}
                    </td>
                    <td className="border border-slate-400 px-1.5 py-2 text-center">{entry.guestsCount}</td>
                    <td className="border border-slate-400 px-1.5 py-2 text-center">{entry.doubleBedsGl}</td>
                    <td className="border border-slate-400 px-1.5 py-2 text-center">{entry.singleBedsLs}</td>
                    <td className="border border-slate-400 px-1.5 py-2 text-center">{entry.babyBedsLitbb}</td>
                    <td className="border border-slate-400 px-1.5 py-2 text-xs font-medium">{entry.receptionMemo || ''}</td>
                    <td className="border border-slate-400 px-1.5 py-2 text-center"><span className="print-checkbox" /></td>
                    <td className="border border-slate-400 px-1.5 py-2 text-center"><span className="print-checkbox" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="linen-print-block border-t-2 border-slate-900 pt-3">
            <h2 className="mb-2 text-base font-serif font-bold text-slate-900">
              Items to Prepare
            </h2>

            {itemsToPrepare.length === 0 ? (
              <p className="text-xs text-slate-500">No configured items to prepare.</p>
            ) : (
              <table className="linen-print-table w-full border-collapse text-xs">
                <tbody>
                  {itemsToPrepare.map((item) => (
                    <tr key={item.itemId}>
                      <td className="border border-slate-400 px-2 py-1.5 font-medium">{item.itemLabel}</td>
                      <td className="border border-slate-400 px-2 py-1.5 text-right font-mono font-semibold">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function SummaryBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-slate-300 px-2 py-1.5">
      <p className="font-mono text-[10px] uppercase text-slate-500">{label}</p>
      <p className="text-lg font-semibold leading-tight">{value}</p>
    </div>
  )
}

const printStyles = `
  @media print {
    @page {
      size: A4 landscape;
      margin: 10mm;
    }

    * {
      -webkit-print-color-adjust: exact !important;
      color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body * {
      visibility: hidden !important;
    }

    #printable-content,
    #printable-content * {
      visibility: visible !important;
    }

    body,
    .print-sheet {
      background: white;
      margin: 0;
      padding: 0;
    }

    .no-print {
      display: none !important;
    }

    #printable-content {
      position: absolute;
      inset: 0 auto auto 0;
      width: 100%;
      margin: 0;
      padding: 0;
      color: #0f172a;
      page-break-after: auto;
    }

    table {
      border-collapse: collapse;
      page-break-inside: avoid;
    }

    tr {
      page-break-inside: avoid;
    }

    .main-print-table {
      table-layout: fixed;
      font-size: 10px;
      line-height: 1.2;
    }

    .main-print-table th,
    .main-print-table td {
      vertical-align: middle;
    }

    .print-checkbox {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 1.5px solid #0f172a;
    }

    .linen-print-block {
      break-inside: avoid;
    }

    .linen-print-table tbody {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0;
    }

    .linen-print-table tr {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 42px;
    }

    h1,
    h2,
    h3,
    .print-header {
      page-break-after: avoid;
    }
  }
`
