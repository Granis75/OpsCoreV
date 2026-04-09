import { useEffect, useState } from 'react'
import { PageSection } from '../components/ui/PageSection'
import { SurfaceCard } from '../components/ui/SurfaceCard'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type ExpenseStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'reimbursed'

interface ExpenseCategoryRow {
  id: string
  name: string
}

interface ExpenseRecord {
  id: string
  expense_category_id: string
  expense_date: string
  amount: number | string
  currency_code: string
  description: string
  status: ExpenseStatus
}

function getLocalDateString(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getMonthPrefix(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')

  return `${year}-${month}`
}

function getPreviousMonthPrefix(date: Date) {
  return getMonthPrefix(new Date(date.getFullYear(), date.getMonth() - 1, 1))
}

function getAmountValue(expense: ExpenseRecord) {
  return Number(expense.amount ?? 0)
}

function isFlagged(expense: ExpenseRecord) {
  return getAmountValue(expense) > 200
}

function calculateDelta(current: number, previous: number) {
  if (previous === 0) {
    return current > 0 ? 100 : 0
  }

  return ((current - previous) / previous) * 100
}

function formatCurrency(value: number, currencyCode = 'EUR') {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatExpenseDate(value: string) {
  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function getStatusLabel(status: ExpenseStatus) {
  return status.replace(/_/g, ' ')
}

interface ExpenseKpis {
  todaySpend: number
  monthlySpend: number
  delta: number
  flaggedExpensesCount: number
}

function buildExpenseKpis(expenses: ExpenseRecord[]): ExpenseKpis {
  const now = new Date()
  const today = getLocalDateString(now)
  const currentMonthPrefix = getMonthPrefix(now)
  const previousMonthPrefix = getPreviousMonthPrefix(now)

  const todaySpend = expenses
    .filter((expense) => expense.expense_date === today)
    .reduce((sum, expense) => sum + getAmountValue(expense), 0)

  const monthlySpend = expenses
    .filter((expense) => expense.expense_date.startsWith(currentMonthPrefix))
    .reduce((sum, expense) => sum + getAmountValue(expense), 0)

  const previousMonthSpend = expenses
    .filter((expense) => expense.expense_date.startsWith(previousMonthPrefix))
    .reduce((sum, expense) => sum + getAmountValue(expense), 0)

  return {
    todaySpend,
    monthlySpend,
    delta: calculateDelta(monthlySpend, previousMonthSpend),
    flaggedExpensesCount: expenses.filter(isFlagged).length,
  }
}

interface ExpenseKpiCardProps {
  label: string
  value: string
  helper: string
}

function ExpenseKpiCard({ label, value, helper }: ExpenseKpiCardProps) {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-shell backdrop-blur">
      <div className="space-y-2">
        <p className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
          {value}
        </p>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-700">{label}</p>
          <p className="text-sm leading-6 text-slate-500">{helper}</p>
        </div>
      </div>
    </div>
  )
}

export function Expenses() {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([])
  const [categoryMap, setCategoryMap] = useState<Map<string, string>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let isCancelled = false

    async function loadExpenses() {
      if (!isSupabaseConfigured || !supabase) {
        if (!isCancelled) {
          setErrorMessage(
            'Supabase env missing. Fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to load live expenses data.',
          )
          setIsLoading(false)
        }
        return
      }

      setIsLoading(true)
      setErrorMessage(null)

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) {
          throw sessionError
        }

        if (!session) {
          if (!isCancelled) {
            setErrorMessage('Sign in to view live expense control.')
            setIsLoading(false)
          }
          return
        }

        const [
          { data: expenseRows, error: expensesError },
          { data: categoryRows, error: categoriesError },
        ] = await Promise.all([
          supabase
            .from('cash_expenses')
            .select(
              'id, expense_category_id, expense_date, amount, currency_code, description, status',
            )
            .order('expense_date', { ascending: false }),
          supabase.from('expense_categories').select('id, name'),
        ])

        if (expensesError) {
          throw expensesError
        }

        if (categoriesError) {
          throw categoriesError
        }

        if (!isCancelled) {
          setExpenses((expenseRows as ExpenseRecord[] | null) ?? [])
          setCategoryMap(
            new Map(
              ((categoryRows as ExpenseCategoryRow[] | null) ?? []).map((category) => [
                category.id,
                category.name,
              ]),
            ),
          )
        }
      } catch (error) {
        console.error('Unable to load expenses', error)

        if (!isCancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Unable to load expense control right now.',
          )
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadExpenses()

    return () => {
      isCancelled = true
    }
  }, [])

  const primaryCurrencyCode = expenses[0]?.currency_code ?? 'EUR'
  const kpis = buildExpenseKpis(expenses)
  const sortedExpenses = [...expenses].sort(
    (left, right) =>
      new Date(right.expense_date).getTime() - new Date(left.expense_date).getTime(),
  )

  return (
    <PageSection
      title="Expenses"
      description="Live financial control view for today’s spend, monthly pace, and approvals requiring attention."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ExpenseKpiCard
          label="Today spend"
          value={isLoading ? '...' : formatCurrency(kpis.todaySpend, primaryCurrencyCode)}
          helper="Cash and card activity recorded today."
        />
        <ExpenseKpiCard
          label="Monthly spend"
          value={isLoading ? '...' : formatCurrency(kpis.monthlySpend, primaryCurrencyCode)}
          helper="Current month expense run rate."
        />
        <ExpenseKpiCard
          label="Delta vs last month"
          value={isLoading ? '...' : `${kpis.delta >= 0 ? '+' : ''}${Math.round(kpis.delta)}%`}
          helper="Relative spend shift versus the prior month."
        />
        <ExpenseKpiCard
          label="Flagged expenses"
          value={isLoading ? '...' : String(kpis.flaggedExpensesCount)}
          helper="High-value items requiring closer review."
        />
      </div>

      {!isLoading &&
      !errorMessage &&
      (kpis.flaggedExpensesCount > 0 || kpis.delta > 20) ? (
        <SurfaceCard
          title="Financial alerts"
          description="Operational spending signals that need review."
        >
          <div className="space-y-2">
            {kpis.flaggedExpensesCount > 0 ? (
              <p className="text-sm font-medium text-amber-700">
                ⚠️ {kpis.flaggedExpensesCount} flagged {kpis.flaggedExpensesCount > 1 ? 'expenses require' : 'expense requires'} approval
              </p>
            ) : null}

            {kpis.delta > 20 ? (
              <p className="text-sm font-medium text-amber-700">
                ⚠️ Monthly spend is up {Math.round(kpis.delta)}% versus last month
              </p>
            ) : null}
          </div>
        </SurfaceCard>
      ) : null}

      <SurfaceCard
        title="Expense control"
        description="Recent operational spend with approval signals and category context."
      >
        {isLoading ? (
          <p className="text-sm leading-7 text-slate-600">Loading expenses...</p>
        ) : null}

        {!isLoading && errorMessage ? (
          <p className="text-sm leading-7 text-slate-600">{errorMessage}</p>
        ) : null}

        {!isLoading && !errorMessage && sortedExpenses.length === 0 ? (
          <p className="text-sm leading-7 text-slate-600">No expenses recorded</p>
        ) : null}

        {!isLoading && !errorMessage && sortedExpenses.length > 0 ? (
          <div className="space-y-3">
            {sortedExpenses.map((expense) => {
              const flagged = isFlagged(expense)
              const categoryName =
                categoryMap.get(expense.expense_category_id) ?? 'Uncategorized'

              return (
                <div
                  key={expense.id}
                  className={[
                    'rounded-3xl border p-5 transition-colors',
                    flagged
                      ? 'border-amber-200 bg-amber-50/30'
                      : 'border-slate-200 bg-white/80',
                  ].join(' ')}
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                            {expense.description}
                          </h2>
                          <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold text-slate-600">
                            {categoryName}
                          </span>
                          <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold capitalize text-slate-600">
                            {getStatusLabel(expense.status)}
                          </span>
                        </div>

                        <p className="text-sm leading-6 text-slate-600">
                          {formatExpenseDate(expense.expense_date)}
                        </p>
                      </div>

                      <div className="text-lg font-semibold tracking-tight text-slate-950">
                        {formatCurrency(getAmountValue(expense), expense.currency_code)}
                      </div>
                    </div>

                    {flagged ? (
                      <div className="text-sm font-medium text-amber-700">
                        Requires approval
                      </div>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        ) : null}
      </SurfaceCard>
    </PageSection>
  )
}
