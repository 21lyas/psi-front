import { useState, useMemo, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search, RefreshCw, Sliders, Link2, X,
  ChevronRight, DollarSign, Briefcase, TrendingUp, Clock, Edit2, Check, User, ExternalLink,
} from 'lucide-react'
import Header from '../components/Layout/Header'
import {
  fetchStTechnicians, fetchStTechStats,
  fetchStEmployees, upsertStEmployee, setInvoiceRate,
  type StJob, type StTechStats, type StEmployee,
} from '../api/endpoints/stPayroll'
import { fetchGustoEmployees, fetchEarningsByRange, type GustoEmployee, type RangeEarnings } from '../api/endpoints/payroll'

const ST_JOB_URL = (jobId: string) => `https://go.servicetitan.com/#/Job/Index/${jobId}`

const fmt = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })

const fmtDate = (s: string) => {
  if (!s) return '—'
  return new Date(s + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function useDebounce<T>(value: T, delay: number): T {
  const [d, setD] = useState(value)
  useEffect(() => { const t = setTimeout(() => setD(value), delay); return () => clearTimeout(t) }, [value, delay])
  return d
}

const statusStyles: Record<string, string> = {
  Completed: 'bg-green-50 text-green-600',
  InProgress: 'bg-blue-50 text-blue-600',
  Scheduled: 'bg-amber-50 text-amber-600',
  Hold: 'bg-orange-50 text-orange-600',
  Canceled: 'bg-gray-100 text-gray-500',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-1.5 py-0.5 rounded text-xs font-medium whitespace-nowrap ${statusStyles[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  )
}

// ─── Editable name (small, for the list) ─────────────────────────────────────
function TechLabelEditor({ techId, currentLabel, onSave }: { techId: string; currentLabel: string | null; onSave: (techId: string, label: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(currentLabel ?? '')
  useEffect(() => { setValue(currentLabel ?? '') }, [currentLabel])
  const save = () => { onSave(techId, value); setEditing(false) }
  if (editing) {
    return (
      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
        <input autoFocus className="border border-primary-300 rounded px-1.5 py-0.5 text-xs w-32" value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }} />
        <button onClick={save} className="w-5 h-5 flex items-center justify-center text-primary-500 hover:text-primary-700"><Check size={12} /></button>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1 group/label">
      <span className={value ? 'text-gray-700 text-sm' : 'text-gray-400 text-xs italic'}>{value || `Tech #${techId}`}</span>
      <button onClick={e => { e.stopPropagation(); setEditing(true) }}
        className="opacity-0 group-hover/label:opacity-100 transition-opacity text-gray-300 hover:text-gray-500">
        <Edit2 size={10} />
      </button>
    </div>
  )
}

// ─── Editable name (large, for the header) ───────────────────────────────────
function TechNameHeader({ techId, currentName, onSave }: { techId: string; currentName: string | null; onSave: (techId: string, label: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(currentName ?? '')

  useEffect(() => { setValue(currentName ?? '') }, [techId, currentName])

  const save = () => {
    onSave(techId, value.trim())
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          autoFocus
          className="text-xl font-bold text-gray-900 border-b-2 border-primary-400 bg-transparent outline-none w-72 pb-0.5"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
          placeholder="Enter name…"
        />
        <button onClick={save} className="flex items-center gap-1 text-xs text-primary-500 hover:text-primary-700 font-medium">
          <Check size={14} /> Save
        </button>
        <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 group/name">
      <h2 className={`text-xl font-bold ${currentName ? 'text-gray-900' : 'text-gray-400'}`}>
        {currentName || `Technician #${techId}`}
      </h2>
      <button
        onClick={() => setEditing(true)}
        className="opacity-0 group-hover/name:opacity-100 transition-opacity text-gray-300 hover:text-gray-500"
        title="Edit name"
      >
        <Edit2 size={14} />
      </button>
    </div>
  )
}

// ─── Gusto employee linker ────────────────────────────────────────────────────
function GustoLinker({ techId, employee, gustoEmployees, onLink, onUnlink }: {
  techId: string
  employee: StEmployee | null
  gustoEmployees: GustoEmployee[]
  onLink: (techId: string, emp: GustoEmployee) => void
  onUnlink: (techId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return q
      ? gustoEmployees.filter(e => `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) || e.department?.toLowerCase().includes(q))
      : gustoEmployees
  }, [gustoEmployees, search])

  const link = (emp: GustoEmployee) => {
    onLink(techId, emp)
    setOpen(false)
    setSearch('')
  }

  const unlink = () => onUnlink(techId)

  const linked = !!employee?.gusto_uuid

  if (!open) {
    return (
      <div className="flex items-center gap-2">
        {linked ? (
          <>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-50 border border-green-200 rounded-lg">
              <User size={12} className="text-green-600" />
              <span className="text-xs text-green-600">Gusto</span>
              {employee?.hourly_rate
                ? <span className="text-xs font-semibold text-green-700">${employee.hourly_rate}/h</span>
                : <span className="text-xs text-green-500">no rate</span>}
            </div>
            <button onClick={unlink} title="Unlink" className="text-gray-300 hover:text-red-400 transition-colors"><X size={13} /></button>
            <button onClick={() => setOpen(true)} title="Change" className="text-gray-300 hover:text-primary-500 transition-colors"><Edit2 size={12} /></button>
          </>
        ) : (
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 border border-dashed border-gray-300 rounded-lg text-xs text-gray-400 hover:border-primary-400 hover:text-primary-500 transition-colors"
          >
            <Link2 size={12} /> Link Gusto employee
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input autoFocus className="input-field pl-7 text-xs py-1.5 w-full" placeholder="Search Gusto employee…"
          value={search} onChange={e => setSearch(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); setSearch('') } }} />
        <button onClick={() => { setOpen(false); setSearch('') }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
          <X size={13} />
        </button>
      </div>
      <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
        {filtered.slice(0, 30).map(emp => (
          <button key={emp.uuid} onClick={() => link(emp)}
            className="w-full flex items-center justify-between px-3 py-2 hover:bg-primary-50 text-left transition-colors">
            <div>
              <p className="text-xs font-medium text-gray-800">{emp.first_name} {emp.last_name}</p>
              <p className="text-xs text-gray-400">{emp.department}</p>
            </div>
            {emp.hourly_rate && <span className="text-xs font-semibold text-green-600">${emp.hourly_rate}/h</span>}
          </button>
        ))}
        {filtered.length === 0 && <p className="text-xs text-gray-400 p-3 text-center">No results</p>}
      </div>
    </div>
  )
}

// ─── Pay calculator ───────────────────────────────────────────────────────────
function PayCalculator({ stats, employee, gustoEarnings, gustoHoursLoading }: {
  stats: StTechStats
  employee: StEmployee | null
  gustoEarnings: RangeEarnings | undefined
  gustoHoursLoading: boolean
}) {
  const hoursFromGusto = !!gustoEarnings && gustoEarnings.periods > 0
  const defaultRate = employee?.hourly_rate ?? 0
  const defaultRegularHours = hoursFromGusto ? gustoEarnings!.earnings.regularHours : stats.workingDays * 8
  const defaultOtHours = hoursFromGusto ? gustoEarnings!.earnings.overtimeHours : 0

  const [rate, setRate] = useState(defaultRate)
  const [regularHours, setRegularHours] = useState(defaultRegularHours)
  const [otHours, setOtHours] = useState(defaultOtHours)
  const [commissionPct, setCommissionPct] = useState(0)
  const [bonusPerJob, setBonusPerJob] = useState(0)
  const [extraBonus, setExtraBonus] = useState(0)

  useEffect(() => {
    setRate(employee?.hourly_rate ?? 0)
    setRegularHours(hoursFromGusto ? gustoEarnings!.earnings.regularHours : stats.workingDays * 8)
    setOtHours(hoursFromGusto ? gustoEarnings!.earnings.overtimeHours : 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats.techId, stats.workingDays, employee?.id, hoursFromGusto, gustoEarnings?.earnings.regularHours, gustoEarnings?.earnings.overtimeHours])

  const regularPay = regularHours * rate
  const otPay = otHours * rate * 1.5
  const commissionEarnings = (stats.summary.totalRevenue * commissionPct) / 100
  const jobBonuses = stats.summary.jobCount * bonusPerJob
  const totalPay = regularPay + otPay + commissionEarnings + jobBonuses + extraBonus

  const rateSource = employee?.gusto_uuid ? 'Gusto (linked)' : null

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
          <Sliders size={12} /> Pay Calculator
        </p>
        {rateSource && <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">{rateSource}</span>}
      </div>

      <div>
        <p className="text-xs font-medium text-gray-400 mb-2 flex items-center gap-1.5">
          Hourly pay
          {employee?.gusto_uuid && (
            gustoHoursLoading
              ? <span className="text-gray-400">· loading hours from Gusto…</span>
              : hoursFromGusto
                ? <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded text-xs">Hours from Gusto</span>
                : <span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded text-xs">No Gusto hours for this period · estimated {stats.workingDays} working days × 8h</span>
          )}
          {!employee?.gusto_uuid && <span>· estimated {stats.workingDays} working days × 8h</span>}
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Hourly rate</label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
              <input type="number" min={0} step={0.5} className="input-field pl-5 text-sm" value={rate}
                onChange={e => setRate(Number(e.target.value))} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Regular hours</label>
            <input type="number" min={0} step={1} className="input-field text-sm" value={regularHours}
              onChange={e => setRegularHours(Number(e.target.value))} />
            <p className="text-xs text-gray-400 mt-0.5">{fmt(regularPay)}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">OT hours (×1.5)</label>
            <input type="number" min={0} step={1} className="input-field text-sm" value={otHours}
              onChange={e => setOtHours(Number(e.target.value))} />
            <p className="text-xs text-gray-400 mt-0.5">{otHours > 0 ? fmt(otPay) : '—'}</p>
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-gray-400 mb-2">Optional · commission & bonuses</p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Commission %</label>
            <div className="relative">
              <input type="number" min={0} max={100} step={0.5} className="input-field pr-6 text-sm" value={commissionPct}
                onChange={e => setCommissionPct(Number(e.target.value))} />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{commissionPct > 0 ? fmt(commissionEarnings) : '—'}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Bonus per job</label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
              <input type="number" min={0} step={5} className="input-field pl-5 text-sm" value={bonusPerJob}
                onChange={e => setBonusPerJob(Number(e.target.value))} />
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{bonusPerJob > 0 ? `${stats.summary.jobCount} × ${fmt(bonusPerJob)}` : '—'}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Extra bonus</label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
              <input type="number" min={0} step={50} className="input-field pl-5 text-sm" value={extraBonus}
                onChange={e => setExtraBonus(Number(e.target.value))} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-primary-50 to-purple-50 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 font-medium">Total Pay</p>
          <p className="text-2xl font-bold text-gray-900 mt-0.5">{fmt(totalPay)}</p>
        </div>
        <div className="text-right space-y-0.5 text-xs text-gray-500">
          <p>{regularHours}h × {fmt(rate)} = <span className="text-gray-700 font-semibold">{fmt(regularPay)}</span></p>
          {otHours > 0 && <p>{otHours}h OT × {fmt(rate * 1.5)} = <span className="text-gray-700 font-semibold">{fmt(otPay)}</span></p>}
          {commissionPct > 0 && <p>{commissionPct}% of {fmt(stats.summary.totalRevenue)} = <span className="text-gray-700 font-semibold">{fmt(commissionEarnings)}</span></p>}
          {bonusPerJob > 0 && <p>{stats.summary.jobCount} jobs × {fmt(bonusPerJob)} = <span className="text-gray-700 font-semibold">{fmt(jobBonuses)}</span></p>}
          {extraBonus > 0 && <p>Extra: <span className="text-gray-700 font-semibold">{fmt(extraBonus)}</span></p>}
        </div>
      </div>
    </div>
  )
}

// ─── Inline-editable number cell (rate / hours) ────────────────────────────────
function EditableNumberCell({ value, prefix, suffix, onSave }: {
  value: number | null
  prefix?: string
  suffix?: string
  onSave: (value: number) => void
}) {
  const [draft, setDraft] = useState(value != null ? String(value) : '')
  useEffect(() => { setDraft(value != null ? String(value) : '') }, [value])

  const commit = () => {
    const parsed = Number(draft)
    if (!Number.isNaN(parsed) && parsed !== value) onSave(parsed)
  }

  return (
    <div className="relative w-20">
      {prefix && <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">{prefix}</span>}
      <input
        type="number"
        min={0}
        step={0.5}
        className={`w-full text-xs border border-gray-200 rounded px-1.5 py-1 ${prefix ? 'pl-4' : ''} ${suffix ? 'pr-4' : ''} focus:border-primary-400 focus:outline-none`}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
      />
      {suffix && <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">{suffix}</span>}
    </div>
  )
}

// ─── Jobs table ───────────────────────────────────────────────────────────────
function JobsTable({ jobs, onRateChange, onHoursChange }: {
  jobs: StJob[]
  onRateChange: (invoiceId: string, rate: number) => void
  onHoursChange: (invoiceId: string, hours: number) => void
}) {
  if (jobs.length === 0) {
    return (
      <div className="card p-8 flex flex-col items-center text-gray-400 gap-2">
        <Briefcase size={24} className="opacity-40" />
        <p className="text-sm">No invoices found for this period</p>
      </div>
    )
  }
  const total = jobs.reduce((s, j) => s + Number(j.invoice_total), 0)
  const totalPay = jobs.reduce((s, j) => s + (j.pay ?? 0), 0)
  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Invoices <span className="ml-1 px-1.5 py-0.5 bg-primary-50 text-primary-500 rounded-full font-medium">{jobs.length}</span>
        </p>
        <div className="flex items-center gap-4">
          <p className="text-sm font-semibold text-gray-700">Invoice Total: {fmt(total)}</p>
          <p className="text-sm font-semibold text-primary-600">Pay: {fmt(totalPay)}</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/60 border-b border-gray-100">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Date</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Job #</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Status</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Business Unit</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Invoice Total</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Rate</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Hours</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Pay</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map(j => (
              <tr key={j.invoice_id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{fmtDate(j.invoice_date)}</td>
                <td className="px-4 py-2.5 font-mono text-xs">
                  {j.job_id ? (
                    <a
                      href={ST_JOB_URL(j.job_id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary-500 hover:text-primary-700 hover:underline"
                    >
                      #{j.job_number || j.job_id} <ExternalLink size={10} />
                    </a>
                  ) : (
                    <span className="text-gray-500">#{j.job_number || '—'}</span>
                  )}
                </td>
                <td className="px-4 py-2.5"><StatusBadge status={j.job_status} /></td>
                <td className="px-4 py-2.5 text-gray-700 max-w-[160px] truncate">{j.business_unit}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-gray-900 whitespace-nowrap">{fmt(Number(j.invoice_total))}</td>
                <td className="px-4 py-2.5">
                  <EditableNumberCell
                    value={j.rate}
                    prefix="$"
                    onSave={v => onRateChange(j.invoice_id, v)}
                  />
                </td>
                <td className="px-4 py-2.5">
                  <EditableNumberCell
                    value={j.hours}
                    suffix="h"
                    onSave={v => onHoursChange(j.invoice_id, v)}
                  />
                </td>
                <td className="px-4 py-2.5 text-right font-semibold whitespace-nowrap text-gray-900">{j.pay != null ? fmt(j.pay) : '—'}</td>
              </tr>
            ))}
            <tr className="bg-gray-50/80">
              <td colSpan={4} className="px-4 py-2.5 text-xs font-semibold text-gray-500">Total</td>
              <td className="px-4 py-2.5 text-right font-bold text-gray-900">{fmt(total)}</td>
              <td colSpan={2}></td>
              <td className="px-4 py-2.5 text-right font-bold text-primary-600">{fmt(totalPay)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function StPayrollPage() {
  const today = new Date()
  const [from, setFrom] = useState(`${today.getFullYear()}-01-01`)
  const [to, setTo] = useState(today.toISOString().split('T')[0])
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const dFrom = useDebounce(from, 400)
  const dTo = useDebounce(to, 400)
  const queryClient = useQueryClient()

  const { data: technicians = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['st-technicians', dFrom, dTo],
    queryFn: () => fetchStTechnicians(dFrom, dTo),
    enabled: !!dFrom && !!dTo && dFrom <= dTo,
  })

  const { data: techStats, isLoading: statsLoading } = useQuery({
    queryKey: ['st-tech-stats', selectedId, dFrom, dTo],
    queryFn: () => fetchStTechStats(selectedId!, dFrom, dTo),
    enabled: !!selectedId && !!dFrom && !!dTo,
  })

  const { data: gustoEmployees = [] } = useQuery({
    queryKey: ['gusto-employees'],
    queryFn: fetchGustoEmployees,
    staleTime: 5 * 60 * 1000,
  })

  const { data: stEmployees = [] } = useQuery({
    queryKey: ['st-employees'],
    queryFn: fetchStEmployees,
  })

  const employeesByTech = useMemo(() => {
    const map: Record<string, StEmployee> = {}
    for (const e of stEmployees) map[e.tech_id] = e
    return map
  }, [stEmployees])

  const upsertEmployeeMutation = useMutation({
    mutationFn: ({ techId, dto }: { techId: string; dto: Parameters<typeof upsertStEmployee>[1] }) =>
      upsertStEmployee(techId, dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['st-employees'] }),
  })

  const invoiceRateMutation = useMutation({
    mutationFn: ({ techId, invoiceId, dto }: { techId: string; invoiceId: string; dto: { rate?: number; hours?: number } }) =>
      setInvoiceRate(techId, invoiceId, dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['st-tech-stats', selectedId, dFrom, dTo] }),
  })

  const saveLabel = useCallback((techId: string, label: string) => {
    upsertEmployeeMutation.mutate({ techId, dto: { label } })
  }, [upsertEmployeeMutation])

  const linkGusto = useCallback((techId: string, emp: GustoEmployee) => {
    upsertEmployeeMutation.mutate({
      techId,
      dto: {
        gusto_uuid: emp.uuid,
        gusto_name: `${emp.first_name} ${emp.last_name}`,
        hourly_rate: emp.hourly_rate,
        department: emp.department,
      },
    })
  }, [upsertEmployeeMutation])

  const unlinkGusto = useCallback((techId: string) => {
    upsertEmployeeMutation.mutate({
      techId,
      dto: { gusto_uuid: null, gusto_name: null, hourly_rate: null, department: null },
    })
  }, [upsertEmployeeMutation])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return technicians
    return technicians.filter(t => {
      const stName = t.tech_name?.toLowerCase() || ''
      const emp = employeesByTech[t.tech_id]
      const label = (emp?.label || '').toLowerCase()
      const link = (emp?.gusto_name || '').toLowerCase()
      return stName.includes(q) || label.includes(q) || link.includes(q) || t.tech_id.includes(q) || t.business_units?.toLowerCase().includes(q)
    })
  }, [technicians, search, employeesByTech])

  // Priority: Gusto link > ST auto-detected name > manual label
  const displayName = (techId: string, stName?: string) => {
    const emp = employeesByTech[techId]
    return emp?.gusto_name || stName?.trim() || emp?.label || null
  }

  const selectedEmployee = selectedId ? employeesByTech[selectedId] ?? null : null
  const selectedGustoUuid = selectedEmployee?.gusto_uuid ?? null

  const { data: gustoEarnings, isLoading: gustoHoursLoading } = useQuery({
    queryKey: ['gusto-earnings-range', selectedGustoUuid, dFrom, dTo],
    queryFn: () => fetchEarningsByRange(selectedGustoUuid!, dFrom, dTo),
    enabled: !!selectedGustoUuid && !!dFrom && !!dTo,
  })

  return (
    <>
      <Header title="ST Pay Calculator" subtitle="ServiceTitan jobs → pay calculation" />

      <div className="p-6 flex gap-5" style={{ height: 'calc(100vh - 73px)' }}>
        {/* Left panel */}
        <div className="card flex flex-col w-80 flex-shrink-0 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex-shrink-0 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Period</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-400 mb-1">From</label>
                <input type="date" className="input-field text-xs py-1.5" value={from} max={to} onChange={e => setFrom(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">To</label>
                <input type="date" className="input-field text-xs py-1.5" value={to} min={from} max={today.toISOString().split('T')[0]} onChange={e => setTo(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input className="input-field pl-7 py-1.5 text-xs w-full" placeholder="Search by name or ID…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <button onClick={() => refetch()} disabled={isFetching} className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50">
                <RefreshCw size={12} className={`text-gray-400 ${isFetching ? 'animate-spin' : ''}`} />
              </button>
            </div>
            {technicians.length > 0 && (
              <p className="text-xs text-gray-400">{filtered.length} of {technicians.length} technicians</p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading && [...Array(6)].map((_, i) => (
              <div key={i} className="px-4 py-3 border-b border-gray-50 space-y-1.5">
                <div className="h-3.5 bg-gray-100 rounded animate-pulse w-2/3" />
                <div className="h-2.5 bg-gray-100 rounded animate-pulse w-1/2" />
              </div>
            ))}
            {!isLoading && filtered.map(tech => {
              const name = displayName(tech.tech_id, tech.tech_name)
              const emp = employeesByTech[tech.tech_id]
              return (
                <button
                  key={tech.tech_id}
                  onClick={() => setSelectedId(tech.tech_id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 border-b border-gray-50 text-left transition-colors hover:bg-gray-50/70 ${selectedId === tech.tech_id ? 'bg-primary-50/60 border-l-2 border-l-primary-500' : ''}`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${selectedId === tech.tech_id ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {name ? name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() : `#${tech.tech_id.slice(-2)}`}
                  </div>
                  <div className="flex-1 min-w-0">
                    {name ? (
                      <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
                    ) : (
                      <TechLabelEditor techId={tech.tech_id} currentLabel={emp?.label ?? null} onSave={saveLabel} />
                    )}
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {emp?.department && <span className="text-blue-500 mr-1">{emp.department}</span>}
                      {tech.invoice_count} jobs · {fmt(Number(tech.total_revenue))}
                      {emp?.hourly_rate && <span className="ml-1 text-green-600"> · ${emp.hourly_rate}/h</span>}
                    </p>
                  </div>
                  <ChevronRight size={13} className={`flex-shrink-0 ${selectedId === tech.tech_id ? 'text-primary-500' : 'text-gray-300'}`} />
                </button>
              )
            })}
            {!isLoading && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
                <DollarSign size={22} className="opacity-40" />
                <p className="text-xs">No technicians found</p>
              </div>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 overflow-y-auto space-y-4">
          {!selectedId && (
            <div className="card h-full flex flex-col items-center justify-center gap-4 text-gray-400">
              <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center">
                <TrendingUp size={28} className="text-gray-300" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-500">Select a technician</p>
                <p className="text-xs text-gray-400 mt-1">Link to a Gusto employee to pull their hourly rate</p>
              </div>
            </div>
          )}

          {selectedId && (
            <>
              {/* Header card */}
              <div className="card p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded font-mono text-xs">ID: {selectedId}</span>
                      {selectedEmployee?.department && (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">{selectedEmployee.department}</span>
                      )}
                      {selectedEmployee?.hourly_rate && (
                        <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs font-semibold">${selectedEmployee.hourly_rate}/hr</span>
                      )}
                    </div>
                    <div className="mb-2">
                      <TechNameHeader
                        techId={selectedId}
                        currentName={displayName(selectedId, techStats?.techName)}
                        onSave={saveLabel}
                      />
                    </div>
                    <GustoLinker
                      techId={selectedId}
                      employee={selectedEmployee}
                      gustoEmployees={gustoEmployees}
                      onLink={linkGusto}
                      onUnlink={unlinkGusto}
                    />
                    <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                      <Clock size={11} />
                      {fmtDate(from)} – {fmtDate(to)}
                      {techStats && <span className="ml-1">· {techStats.workingDays} working days</span>}
                    </p>
                  </div>
                  {statsLoading && <RefreshCw size={16} className="animate-spin text-gray-400 ml-4" />}
                </div>

                {techStats && (
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    {[
                      { label: 'Invoices', value: techStats.summary.jobCount.toString(), icon: Briefcase },
                      { label: 'Total Revenue', value: fmt(techStats.summary.totalRevenue), icon: DollarSign },
                      { label: 'Avg per Job', value: fmt(techStats.summary.avgJobRevenue), icon: TrendingUp },
                    ].map(({ label, value, icon: Icon }) => (
                      <div key={label} className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm flex-shrink-0">
                          <Icon size={14} className="text-primary-500" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">{label}</p>
                          <p className="text-sm font-bold text-gray-900">{value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Business units */}
              {techStats && techStats.byBusinessUnit.length > 1 && (
                <div className="card p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">By Business Unit</p>
                  <div className="space-y-2">
                    {techStats.byBusinessUnit.sort((a, b) => b.revenue - a.revenue).map(bu => {
                      const pct = techStats.summary.totalRevenue > 0 ? (bu.revenue / techStats.summary.totalRevenue) * 100 : 0
                      return (
                        <div key={bu.name}>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs text-gray-600 truncate max-w-[60%]">{bu.name}</span>
                            <span className="text-xs font-medium text-gray-900">{fmt(bu.revenue)} <span className="text-gray-400">({bu.count})</span></span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Pay calculator */}
              {techStats && techStats.summary.jobCount > 0 && (
                <PayCalculator
                  stats={techStats}
                  employee={selectedEmployee}
                  gustoEarnings={gustoEarnings}
                  gustoHoursLoading={gustoHoursLoading}
                />
              )}

              {/* Jobs table */}
              {techStats && (
                <JobsTable
                  jobs={techStats.jobs}
                  onRateChange={(invoiceId, rate) => invoiceRateMutation.mutate({ techId: selectedId, invoiceId, dto: { rate } })}
                  onHoursChange={(invoiceId, hours) => invoiceRateMutation.mutate({ techId: selectedId, invoiceId, dto: { hours } })}
                />
              )}

              {statsLoading && !techStats && (
                <div className="card p-12 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3 text-gray-400">
                    <RefreshCw size={20} className="animate-spin" />
                    <p className="text-sm">Loading jobs…</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
