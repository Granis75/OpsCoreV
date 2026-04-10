import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageSection } from '../components/ui/PageSection'
import { SurfaceCard } from '../components/ui/SurfaceCard'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type ExpenseStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'reimbursed'

interface ExpenseCategoryRow {
  id: string
  name: string
}

interface OrganizationProfileRow {
  organization_id: string | null
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

function getAmountValue(expense: ExpenseRecord) {
  return Number(expense.amount ?? 0)
}

function isFlagged(expense: ExpenseRecord) {
  return getAmountValue(expense) > 200
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
}

function buildExpenseKpis(expenses: ExpenseRecord[]): ExpenseKpis {
  const now = new Date()
  const today = getLocalDateString(now)
  const currentMonthPrefix = getMonthPrefix(now)

  const todaySpend = expenses
    .filter((expense) => expense.expense_date === today)
    .reduce((sum, expense) => sum + getAmountValue(expense), 0)

  const monthlySpend = expenses
    .filter((expense) => expense.expense_date.startsWith(currentMonthPrefix))
    .reduce((sum, expense) => sum + getAmountValue(expense), 0)

  return {
    todaySpend,
    monthlySpend,
  }
}

interface ExpenseFormState {
  label: string
  amount: string
  expenseCategoryId: string
}

interface ExpenseKpiCardProps {
  label: string
  value: string
  helper: string
}

function ExpenseKpiCard({ label, value, helper }: ExpenseKpiCardProps) {
  return (
    <div className="surface-panel p-6">
      <div className="space-y-2">
        <p className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
          {value}
        </p>
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-700">{label}</p>
          <p className="text-sm leading-6 text-slate-500">{helper}</p>
        </div>
      </div>
    </div>
  )
}

export function Expenses() {
  const [searchParams] = useSearchParams()
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([])
  const [categories, setCategories] = useState<ExpenseCategoryRow[]>([])
  const [categoryMap, setCategoryMap] = useState<Map<string, string>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formState, setFormState] = useState<ExpenseFormState>({
    label: '',
    amount: '',
    expenseCategoryId: '',
  })

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
          setCategories((categoryRows as ExpenseCategoryRow[] | null) ?? [])
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
  const statusFilter = searchParams.get('status')
  const flaggedOnly = searchParams.get('flagged') === 'true'
  const searchQuery = searchParams.get('q')?.trim().toLowerCase() ?? ''
  const filteredExpenses = sortedExpenses.filter((expense) => {
    if (statusFilter && expense.status !== statusFilter) {
      return false
    }

    if (flaggedOnly && !isFlagged(expense)) {
      return false
    }

    if (!searchQuery) {
      return true
    }

    const categoryName = categoryMap.get(expense.expense_category_id) ?? ''

    return [expense.description, categoryName].join(' ').toLowerCase().includes(searchQuery)
  })

  async function handleCreateExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!supabase) {
      setErrorMessage(
        'Supabase env missing. Fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to load live expenses data.',
      )
      return
    }

    const label = formState.label.trim()
    const amount = Number(formState.amount)

    if (!label || !formState.expenseCategoryId || Number.isNaN(amount) || amount <= 0) {
      setErrorMessage('Enter a label, amount, and category to add an expense.')
      return
    }

    setIsSubmitting(true)
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
        throw new Error('Sign in to add an expense.')
      }

      const { data: profileRow, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', session.user.id)
        .maybeSingle()

      if (profileError) {
        throw profileError
      }

      const organizationId = (profileRow as OrganizationProfileRow | null)?.organization_id

      if (!organizationId) {
        throw new Error('Your profile is not linked to an organization.')
      }

      const { data: insertedExpense, error: insertError } = await supabase
        .from('cash_expenses')
        .insert({
          organization_id: organizationId,
          expense_category_id: formState.expenseCategoryId,
          description: label,
          amount,
          expense_date: getLocalDateString(new Date()),
        })
        .select(
          'id, expense_category_id, expense_date, amount, currency_code, description, status',
        )
        .single()

      if (insertError) {
        throw insertError
      }

      setExpenses((currentExpenses) => [insertedExpense as ExpenseRecord, ...currentExpenses])
      setFormState({
        label: '',
        amount: '',
        expenseCategoryId: categories[0]?.id ?? '',
      })
      setIsModalOpen(false)
    } catch (error) {
      console.error('Unable to create expense', error)
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to create the expense right now.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  function openExpenseModal() {
    setErrorMessage(null)
    setFormState({
      label: '',
      amount: '',
      expenseCategoryId: categories[0]?.id ?? '',
    })
    setIsModalOpen(true)
  }

  return (
    <PageSection
      title="Expenses"
      description="Lightweight control surface for operational expenses and approval-sensitive spend."
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="grid flex-1 gap-4 md:grid-cols-2">
          <ExpenseKpiCard
            label="Today spend"
            value={isLoading ? '...' : formatCurrency(kpis.todaySpend, primaryCurrencyCode)}
            helper="Operational expenses recorded today."
          />
          <ExpenseKpiCard
            label="This month"
            value={isLoading ? '...' : formatCurrency(kpis.monthlySpend, primaryCurrencyCode)}
            helper="Operational spend recorded this month."
          />
        </div>

        <button
          type="button"
          onClick={openExpenseModal}
          disabled={!isSupabaseConfigured || categories.length === 0}
          className="button-secondary min-h-11"
        >
          Add expense
        </button>
      </div>

      <SurfaceCard
        title="Operational expenses"
        description="Compact register of spend by date, label, category, amount, and current status."
      >
        {isLoading ? (
          <p className="text-sm leading-7 text-slate-600">Loading expenses...</p>
        ) : null}

        {!isLoading && errorMessage ? (
          <p className="text-sm leading-7 text-slate-600">{errorMessage}</p>
        ) : null}

        {!isLoading && !errorMessage && expenses.length === 0 ? (
          <p className="text-sm leading-7 text-slate-600">No expenses recorded</p>
        ) : null}

        {!isLoading && !errorMessage && expenses.length > 0 && filteredExpenses.length === 0 ? (
          <p className="text-sm leading-7 text-slate-600">No expenses match this view</p>
        ) : null}

        {!isLoading && !errorMessage && filteredExpenses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr className="text-left">
                  <th className="border-b border-slate-200 px-0 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Date
                  </th>
                  <th className="border-b border-slate-200 px-0 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Label
                  </th>
                  <th className="border-b border-slate-200 px-0 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Amount
                  </th>
                  <th className="border-b border-slate-200 px-0 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredExpenses.map((expense) => {
                  const flagged = isFlagged(expense)
                  const categoryName =
                    categoryMap.get(expense.expense_category_id) ?? 'Uncategorized'

                  return (
                    <tr
                      key={expense.id}
                      className={flagged ? 'bg-amber-50/30' : undefined}
                    >
                      <td className="border-b border-slate-100 py-4 pr-6 text-sm text-slate-600">
                        {formatExpenseDate(expense.expense_date)}
                      </td>
                      <td className="border-b border-slate-100 py-4 pr-6">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-slate-900">
                            {expense.description}
                          </p>
                          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                            {categoryName}
                          </p>
                        </div>
                      </td>
                      <td className="border-b border-slate-100 py-4 pr-6 text-sm font-semibold text-slate-900">
                        {formatCurrency(getAmountValue(expense), expense.currency_code)}
                      </td>
                      <td className="border-b border-slate-100 py-4">
                        <div className="space-y-1">
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-600">
                            {getStatusLabel(expense.status)}
                          </span>
                          {flagged ? (
                            <p className="text-xs font-medium text-amber-700">
                              Requires approval
                            </p>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </SurfaceCard>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/25 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-lg">
            <SurfaceCard
              title="Add expense"
              description="Log a new operational expense with the minimum details required."
            >
              <form className="space-y-4" onSubmit={handleCreateExpense}>
                <div className="space-y-2">
                  <label
                    htmlFor="expense-label"
                    className="eyebrow-label"
                  >
                    Label
                  </label>
                  <input
                    id="expense-label"
                    type="text"
                    value={formState.label}
                    onChange={(event) =>
                      setFormState((currentState) => ({
                        ...currentState,
                        label: event.target.value,
                      }))
                    }
                    className="field-input"
                    placeholder="Room relocation taxi"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label
                      htmlFor="expense-amount"
                      className="eyebrow-label"
                    >
                      Amount
                    </label>
                    <input
                      id="expense-amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formState.amount}
                      onChange={(event) =>
                        setFormState((currentState) => ({
                          ...currentState,
                          amount: event.target.value,
                        }))
                      }
                      className="field-input"
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="expense-category"
                      className="eyebrow-label"
                    >
                      Category
                    </label>
                    <select
                      id="expense-category"
                      value={formState.expenseCategoryId}
                      onChange={(event) =>
                        setFormState((currentState) => ({
                          ...currentState,
                          expenseCategoryId: event.target.value,
                        }))
                      }
                      className="field-input"
                    >
                      <option value="">Select category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-2 md:flex-row md:justify-end">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="button-secondary min-h-11"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || categories.length === 0}
                    className="button-primary min-h-11"
                  >
                    {isSubmitting ? 'Saving...' : 'Save expense'}
                  </button>
                </div>
              </form>
            </SurfaceCard>
          </div>
        </div>
      ) : null}
    </PageSection>
  )
}

