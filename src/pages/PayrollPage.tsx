import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Search, Download, FileText, DollarSign,
  ChevronRight, RefreshCw, AlertCircle, User, Calendar, Sliders,
} from 'lucide-react'
import Header from '../components/Layout/Header'
import {
  fetchGustoEmployees,
  fetchPayrollDates,
  fetchEarningsSummary,
  fetchEarningsByRange,
  getEarningsStatementPdfUrl,
  type GustoEmployee,
} from '../api/endpoints/payroll'

const fmt = (n: number | undefined | null) =>
  (n ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })

const fmtDate = (s: string) => {
  if (!s) return '—'
  return new Date(s + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function MetricCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="card p-4 flex flex-col gap-1">
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      <p className={`text-xl font-bold ${accent ?? 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

type EarningsData = {
  regularHours: number; regularAmount: number
  overtimeHours: number; overtimeAmount: number
  sickHours: number; sickAmount: number
  fixedComps: { name: string; amount: number }[]
  totalHours: number; grossPay: number
}

type SummaryData = {
  grossPay: number; taxes: number; netPay: number
  netIsEstimated: boolean; totalHoursWorked: number
}

function EarningsBreakdown({
  job, earnings, summary, ytd, isEstimated, loading,
}: {
  job: { title: string; rate: number } | null
  earnings: EarningsData
  summary: SummaryData
  ytd?: { regularAmount: number; overtimeAmount: number; grossPay: number; netPay: number }
  isEstimated: boolean
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <RefreshCw size={20} className="animate-spin" />
          <p className="text-sm">Calculating…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {isEstimated && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg text-amber-700 text-xs">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          Net pay is estimated — compensation records pending Gusto sync for this period.
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Gross Pay" value={fmt(summary.grossPay)} sub="Before taxes" />
        <MetricCard
          label="Net Pay"
          value={fmt(summary.netPay)}
          sub={isEstimated ? 'Estimated' : 'After taxes'}
          accent="text-emerald-600"
        />
        <MetricCard
          label="Hours Worked"
          value={summary.totalHoursWorked.toFixed(1) + 'h'}
          sub="Regular + OT"
        />
      </div>

      {/* Earnings table */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Gross Earnings</p>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/60 border-b border-gray-100">
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Description</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Rate</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Hours</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Amount</th>
                {ytd && <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400">YTD</th>}
              </tr>
            </thead>
            <tbody>
              {earnings.regularHours > 0 && (
                <tr className="border-b border-gray-50">
                  <td className="py-2.5 px-3 text-gray-700">Regular Hours {job ? `| ${job.title}` : ''}</td>
                  <td className="py-2.5 px-3 text-gray-500 text-right">${job?.rate.toFixed(2)}/h</td>
                  <td className="py-2.5 px-3 text-gray-500 text-right">{earnings.regularHours.toFixed(1)}</td>
                  <td className="py-2.5 px-3 font-medium text-gray-900 text-right">{fmt(earnings.regularAmount)}</td>
                  {ytd && <td className="py-2.5 px-3 text-gray-400 text-right">{fmt(ytd.regularAmount)}</td>}
                </tr>
              )}
              {earnings.overtimeHours > 0 && (
                <tr className="border-b border-gray-50">
                  <td className="py-2.5 px-3 text-gray-700">Overtime {job ? `| ${job.title}` : ''}</td>
                  <td className="py-2.5 px-3 text-gray-500 text-right">${((job?.rate ?? 0) * 1.5).toFixed(2)}/h</td>
                  <td className="py-2.5 px-3 text-gray-500 text-right">{earnings.overtimeHours.toFixed(1)}</td>
                  <td className="py-2.5 px-3 font-medium text-gray-900 text-right">{fmt(earnings.overtimeAmount)}</td>
                  {ytd && <td className="py-2.5 px-3 text-gray-400 text-right">{fmt(ytd.overtimeAmount)}</td>}
                </tr>
              )}
              {earnings.sickHours > 0 && (
                <tr className="border-b border-gray-50">
                  <td className="py-2.5 px-3 text-gray-700">Sick</td>
                  <td className="py-2.5 px-3 text-gray-500 text-right">${job?.rate.toFixed(2)}/h</td>
                  <td className="py-2.5 px-3 text-gray-500 text-right">{earnings.sickHours.toFixed(1)}</td>
                  <td className="py-2.5 px-3 font-medium text-gray-900 text-right">{fmt(earnings.sickAmount)}</td>
                  {ytd && <td className="py-2.5 px-3 text-gray-400 text-right">—</td>}
                </tr>
              )}
              {earnings.fixedComps.map(fc => (
                <tr key={fc.name} className="border-b border-gray-50">
                  <td className="py-2.5 px-3 text-gray-700">{fc.name}</td>
                  <td className="py-2.5 px-3 text-gray-400 text-right">—</td>
                  <td className="py-2.5 px-3 text-gray-400 text-right">—</td>
                  <td className="py-2.5 px-3 font-medium text-gray-900 text-right">{fmt(fc.amount)}</td>
                  {ytd && <td className="py-2.5 px-3 text-gray-400 text-right">—</td>}
                </tr>
              ))}
              <tr className="bg-gray-50/60">
                <td className="py-2.5 px-3 font-semibold text-gray-900">Totals</td>
                <td className="py-2.5 px-3 text-right text-gray-400">—</td>
                <td className="py-2.5 px-3 font-semibold text-gray-900 text-right">{earnings.totalHours.toFixed(1)}</td>
                <td className="py-2.5 px-3 font-semibold text-gray-900 text-right">{fmt(earnings.grossPay)}</td>
                {ytd && <td className="py-2.5 px-3 font-semibold text-gray-500 text-right">{fmt(ytd.grossPay)}</td>}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Summary</p>
        <div className="card divide-y divide-gray-50">
          {[
            { label: 'Gross Earnings', current: summary.grossPay, ytdVal: ytd?.grossPay },
            { label: 'Taxes (est.)', current: summary.taxes, ytdVal: ytd ? ytd.grossPay - ytd.netPay : undefined },
            { label: isEstimated ? 'Net Pay (est.)' : 'Net Pay', current: summary.netPay, ytdVal: ytd?.netPay, bold: true },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between px-4 py-2.5">
              <span className={`text-sm ${row.bold ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>{row.label}</span>
              <div className="flex gap-6">
                <span className={`text-sm ${row.bold ? 'font-bold text-emerald-600' : 'text-gray-700'} w-24 text-right`}>{fmt(row.current)}</span>
                {ytd && <span className="text-sm text-gray-400 w-24 text-right">{row.ytdVal != null ? fmt(row.ytdVal) : '—'}</span>}
              </div>
            </div>
          ))}
        </div>
        {ytd && (
          <div className="flex justify-end gap-6 pr-4 mt-1">
            <span className="text-xs text-gray-300 w-24 text-right">Current</span>
            <span className="text-xs text-gray-300 w-24 text-right">YTD</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Pay Period tab ───────────────────────────────────────────────────────────
function PayPeriodTab({ employee }: { employee: GustoEmployee }) {
  const [checkDate, setCheckDate] = useState<string | undefined>()

  const { data: dates = [], isLoading: datesLoading } = useQuery({
    queryKey: ['payroll-dates', employee.uuid],
    queryFn: () => fetchPayrollDates(employee.uuid),
  })

  useEffect(() => {
    if (dates.length > 0 && !checkDate) setCheckDate(dates[0].check_date)
  }, [dates])

  const selectedDate = checkDate ?? dates[0]?.check_date
  const selectedPeriod = dates.find(d => d.check_date === selectedDate)

  const { data: summary, isLoading: summaryLoading, isError } = useQuery({
    queryKey: ['earnings-summary', employee.uuid, selectedDate],
    queryFn: () => fetchEarningsSummary(employee.uuid, selectedDate),
    enabled: !!selectedDate,
  })

  const pdfUrl = getEarningsStatementPdfUrl(employee.uuid, selectedDate)

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1.5">
          <Calendar size={12} /> Pay Period
        </label>
        {datesLoading ? (
          <div className="h-9 bg-gray-100 rounded-lg animate-pulse" />
        ) : dates.length === 0 ? (
          <p className="text-sm text-gray-400">No payroll periods found</p>
        ) : (
          <select className="input-field text-sm" value={selectedDate ?? ''} onChange={e => setCheckDate(e.target.value)}>
            {dates.map(d => (
              <option key={d.check_date} value={d.check_date}>
                {fmtDate(d.pay_period_start_date)} – {fmtDate(d.pay_period_end_date)} · Pay day: {fmtDate(d.check_date)}
              </option>
            ))}
          </select>
        )}
        {selectedPeriod && (
          <p className="text-xs text-gray-400 mt-1">Check date: <strong>{fmtDate(selectedPeriod.check_date)}</strong></p>
        )}
      </div>

      {isError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg text-red-600 text-xs">
          <AlertCircle size={14} /> Failed to load earnings data
        </div>
      )}

      {summary && (
        <>
          <EarningsBreakdown
            job={summary.job}
            earnings={summary.earnings}
            summary={summary.summary}
            ytd={summary.ytd}
            isEstimated={summary.summary.netIsEstimated}
            loading={summaryLoading}
          />
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold transition-colors"
          >
            <Download size={16} /> Download Earnings Statement PDF
          </a>
        </>
      )}

      {summaryLoading && !summary && (
        <EarningsBreakdown
          job={null} earnings={{ regularHours: 0, regularAmount: 0, overtimeHours: 0, overtimeAmount: 0, sickHours: 0, sickAmount: 0, fixedComps: [], totalHours: 0, grossPay: 0 }}
          summary={{ grossPay: 0, taxes: 0, netPay: 0, netIsEstimated: false, totalHoursWorked: 0 }}
          isEstimated={false}
          loading={true}
        />
      )}
    </div>
  )
}

// ─── Custom Range tab ─────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function CustomRangeTab({ employee }: { employee: GustoEmployee }) {
  const today = new Date()
  const firstOfYear = `${today.getFullYear()}-01-01`
  const todayStr = today.toISOString().split('T')[0]

  const [from, setFrom] = useState(firstOfYear)
  const [to, setTo] = useState(todayStr)

  const debouncedFrom = useDebounce(from, 500)
  const debouncedTo = useDebounce(to, 500)

  const isValid = debouncedFrom && debouncedTo && debouncedFrom <= debouncedTo

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ['earnings-range', employee.uuid, debouncedFrom, debouncedTo],
    queryFn: () => fetchEarningsByRange(employee.uuid, debouncedFrom, debouncedTo),
    enabled: !!isValid,
  })

  const dayCount = isValid
    ? Math.round((new Date(debouncedTo).getTime() - new Date(debouncedFrom).getTime()) / 86400000) + 1
    : 0

  return (
    <div className="space-y-4">
      {/* Date range inputs */}
      <div className="card p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
          <Sliders size={12} /> Custom Date Range
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
            <input
              type="date"
              className="input-field text-sm"
              value={from}
              max={to}
              onChange={e => setFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
            <input
              type="date"
              className="input-field text-sm"
              value={to}
              min={from}
              max={todayStr}
              onChange={e => setTo(e.target.value)}
            />
          </div>
        </div>
        {isValid && (
          <p className="text-xs text-gray-400 flex items-center gap-1">
            {isFetching && <RefreshCw size={11} className="animate-spin" />}
            {dayCount} days · {data ? `${data.periods} payroll period${data.periods !== 1 ? 's' : ''} found` : 'Loading…'}
          </p>
        )}
        {!isValid && from && to && (
          <p className="text-xs text-red-400">End date must be after start date</p>
        )}
      </div>

      {isError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg text-red-600 text-xs">
          <AlertCircle size={14} /> Failed to load earnings data
        </div>
      )}

      {!isValid && (
        <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
          <Calendar size={24} className="opacity-40" />
          <p className="text-sm">Select a valid date range</p>
        </div>
      )}

      {isValid && (isLoading && !data) && (
        <EarningsBreakdown
          job={null}
          earnings={{ regularHours: 0, regularAmount: 0, overtimeHours: 0, overtimeAmount: 0, sickHours: 0, sickAmount: 0, fixedComps: [], totalHours: 0, grossPay: 0 }}
          summary={{ grossPay: 0, taxes: 0, netPay: 0, netIsEstimated: false, totalHoursWorked: 0 }}
          isEstimated={false}
          loading={true}
        />
      )}

      {data && (
        <>
          {data.periods === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400 gap-2">
              <FileText size={22} className="opacity-40" />
              <p className="text-sm">No payroll data found for this range</p>
              <p className="text-xs">Try expanding the date range</p>
            </div>
          )}
          {data.periods > 0 && (
            <EarningsBreakdown
              job={data.job}
              earnings={data.earnings}
              summary={data.summary}
              isEstimated={data.summary.netIsEstimated}
              loading={isFetching}
            />
          )}
        </>
      )}
    </div>
  )
}

// ─── Employee detail panel ────────────────────────────────────────────────────
type Tab = 'period' | 'range'

function EmployeePanel({ employee }: { employee: GustoEmployee }) {
  const [tab, setTab] = useState<Tab>('period')

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 flex-shrink-0">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500/20 to-purple-500/20 flex items-center justify-center text-primary-500 font-bold text-sm flex-shrink-0">
          {employee.first_name.charAt(0)}{employee.last_name.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900">{employee.first_name} {employee.last_name}</p>
          <p className="text-xs text-gray-400 truncate">{employee.email} · {employee.department}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-5 pt-4 pb-0 flex-shrink-0">
        {([['period', 'Pay Period', Calendar], ['range', 'Custom Range', Sliders]] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors ${
              tab === key
                ? 'border-primary-500 text-primary-500 bg-primary-50/50'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>
      <div className="h-px bg-gray-100 flex-shrink-0" />

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-5">
        {tab === 'period'
          ? <PayPeriodTab key={employee.uuid} employee={employee} />
          : <CustomRangeTab key={employee.uuid} employee={employee} />
        }
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PayrollPage() {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<GustoEmployee | null>(null)

  const { data: employees = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['gusto-employees'],
    queryFn: fetchGustoEmployees,
  })

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return employees
    return employees.filter(e =>
      `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) ||
      e.email?.toLowerCase().includes(q) ||
      e.department?.toLowerCase().includes(q),
    )
  }, [employees, search])

  return (
    <>
      <Header title="Payroll" subtitle="Earnings statements & custom calculations" />

      <div className="p-6 flex gap-5" style={{ height: 'calc(100vh - 73px)' }}>
        {/* Left: employee list */}
        <div className="card flex flex-col w-72 flex-shrink-0 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                <User size={14} className="text-gray-400" /> Employees
                {employees.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary-50 text-primary-500 text-xs font-medium">
                    {employees.length}
                  </span>
                )}
              </p>
              <button onClick={() => refetch()} disabled={isFetching} className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50">
                <RefreshCw size={12} className={`text-gray-400 ${isFetching ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="input-field pl-8 py-1.5 text-xs w-full"
                placeholder="Search name, department…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading && [...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50">
                <div className="w-8 h-8 rounded-lg bg-gray-100 animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
                  <div className="h-2.5 bg-gray-100 rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
            {!isLoading && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
                <FileText size={24} className="opacity-40" />
                <p className="text-xs">No employees found</p>
              </div>
            )}
            {!isLoading && filtered.map(emp => (
              <button
                key={emp.uuid}
                onClick={() => setSelected(emp)}
                className={`w-full flex items-center gap-3 px-4 py-3 border-b border-gray-50 text-left transition-colors hover:bg-gray-50/70 ${
                  selected?.uuid === emp.uuid ? 'bg-primary-50/60 border-l-2 border-l-primary-500' : ''
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                  selected?.uuid === emp.uuid
                    ? 'bg-primary-500 text-white'
                    : 'bg-gradient-to-br from-primary-500/15 to-purple-500/15 text-primary-600'
                }`}>
                  {emp.first_name.charAt(0)}{emp.last_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{emp.first_name} {emp.last_name}</p>
                  <p className="text-xs text-gray-400 truncate">{emp.department || emp.email}</p>
                </div>
                <ChevronRight size={14} className={`flex-shrink-0 ${selected?.uuid === emp.uuid ? 'text-primary-500' : 'text-gray-300'}`} />
              </button>
            ))}
          </div>
        </div>

        {/* Right: earnings panel */}
        <div className="card flex-1 overflow-hidden">
          {!selected ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-gray-400">
              <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center">
                <DollarSign size={28} className="text-gray-300" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-500">Select an employee</p>
                <p className="text-xs text-gray-400 mt-1">Choose from the list to view earnings</p>
              </div>
            </div>
          ) : (
            <EmployeePanel key={selected.uuid} employee={selected} />
          )}
        </div>
      </div>
    </>
  )
}
