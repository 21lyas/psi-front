import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2, XCircle, Clock, Edit3, AlertCircle,
  RefreshCw, ChevronRight, Users, DollarSign, Search,
  LogIn, LogOut, Utensils, Coffee,
} from 'lucide-react'
import Header from '../components/Layout/Header'
import {
  fetchAdminEntries, fetchAdminSummary, adminReviewEntry,
  type WorkEntry, type WorkEntryStatus, type EmployeeSummary,
} from '../api/endpoints/workEntries'

const fmt = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })

const fmtDate = (s: string | null | undefined) => {
  if (!s) return '—'
  // ISO datetime (has T) or plain date
  const d = s.includes('T') ? new Date(s) : new Date(s + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const fmtTime = (s: string | null | undefined) => {
  if (!s || !s.includes('T')) return null
  return new Date(s).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

const fmtHours = (h: number | null | undefined) =>
  h != null ? `${Number(h).toFixed(1)}h` : '—'

const STATUS_CONFIG: Record<WorkEntryStatus, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  pending: { label: 'Pending', color: 'bg-amber-50 text-amber-600', icon: Clock },
  confirmed: { label: 'Confirmed', color: 'bg-green-50 text-green-600', icon: CheckCircle2 },
  adjusted: { label: 'Adjusted', color: 'bg-blue-50 text-blue-600', icon: Edit3 },
  admin_approved: { label: 'Approved', color: 'bg-emerald-50 text-emerald-600', icon: CheckCircle2 },
  admin_rejected: { label: 'Rejected', color: 'bg-red-50 text-red-500', icon: AlertCircle },
}

function StatusBadge({ status }: { status: WorkEntryStatus }) {
  const cfg = STATUS_CONFIG[status]
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${cfg.color}`}>
      <Icon size={10} /> {cfg.label}
    </span>
  )
}

// ─── Review modal ─────────────────────────────────────────────────────────────
function ReviewModal({ entry, onClose }: { entry: WorkEntry; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [note, setNote] = useState(entry.admin_note ?? '')

  const mutation = useMutation({
    mutationFn: (status: 'admin_approved' | 'admin_rejected') =>
      adminReviewEntry(entry.id, status, note || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-entries'] })
      queryClient.invalidateQueries({ queryKey: ['admin-summary'] })
      onClose()
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md space-y-4 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Review Entry</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {entry.tech_name ?? `Tech #${entry.tech_id}`} · {entry.job_number ? `Job #${entry.job_number}` : `Invoice #${entry.invoice_id}`}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XCircle size={18} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-gray-400 mb-0.5">Date / Time</p>
            {entry.scheduled_start ? (
              <>
                <p className="font-medium">{fmtDate(entry.scheduled_start)}</p>
                <p className="text-gray-500">{fmtTime(entry.scheduled_start)} – {fmtTime(entry.scheduled_end)}</p>
              </>
            ) : (
              <p className="font-medium">{fmtDate(entry.invoice_date)}</p>
            )}
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-gray-400 mb-0.5">Status</p>
            <StatusBadge status={entry.status} />
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-gray-400 mb-0.5">Scheduled</p>
            <p className="font-semibold">{fmtHours(entry.scheduled_hours)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-gray-400 mb-0.5">Actual</p>
            <p className={`font-semibold ${entry.actual_hours != null ? 'text-gray-900' : 'text-gray-400'}`}>
              {fmtHours(entry.actual_hours)}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-gray-400 mb-0.5">Rate</p>
            <p className="font-semibold">{entry.hourly_rate != null ? `$${entry.hourly_rate}/h` : '—'}</p>
          </div>
          <div className="bg-primary-50 rounded-lg p-3">
            <p className="text-primary-400 mb-0.5">Pay amount</p>
            <p className="font-bold text-primary-700">{fmt(entry.pay_amount)}</p>
          </div>
        </div>

        {entry.clock_in && entry.clock_out && (
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <p className="text-xs text-gray-500 font-medium">Logged time</p>
            <div className="flex items-center justify-between text-sm text-gray-800">
              <span className="flex items-center gap-1.5"><LogIn size={12} className="text-gray-400" /> {fmtTime(entry.clock_in)}</span>
              <span className="text-gray-300">→</span>
              <span className="flex items-center gap-1.5"><LogOut size={12} className="text-gray-400" /> {fmtTime(entry.clock_out)}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              {entry.lunch_break_start && (
                <span className="flex items-center gap-1"><Utensils size={11} className="text-amber-500" /> {fmtTime(entry.lunch_break_start)} · {entry.lunch_break_minutes}m</span>
              )}
              {entry.rest_break_start && (
                <span className="flex items-center gap-1"><Coffee size={11} className="text-teal-500" /> {fmtTime(entry.rest_break_start)} · {entry.rest_break_minutes}m</span>
              )}
            </div>
          </div>
        )}

        {entry.employee_note && (
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-blue-500 font-medium mb-1">Employee note</p>
            <p className="text-sm text-blue-800">{entry.employee_note}</p>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Admin note (optional)</label>
          <textarea
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-400 resize-none"
            rows={2}
            placeholder="Add a note for the employee…"
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => mutation.mutate('admin_approved')}
            disabled={mutation.isPending}
            className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-medium rounded-xl py-2.5 transition-colors"
          >
            {mutation.isPending ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
            Approve
          </button>
          <button
            onClick={() => mutation.mutate('admin_rejected')}
            disabled={mutation.isPending}
            className="flex-1 flex items-center justify-center gap-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium rounded-xl py-2.5 transition-colors"
          >
            <XCircle size={13} />
            Reject
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Summary panel ────────────────────────────────────────────────────────────
function SummaryPanel({ data, onSelectTech }: { data: EmployeeSummary[]; onSelectTech: (id: string | null) => void }) {
  const totalPay = data.reduce((s, e) => s + e.total_pay, 0)
  const totalHours = data.reduce((s, e) => s + e.total_actual_hours, 0)
  const totalPending = data.reduce((s, e) => s + e.pending, 0)

  return (
    <div className="space-y-4">
      {/* Global stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Pay', value: fmt(totalPay), icon: DollarSign, color: 'text-primary-600' },
          { label: 'Total Hours', value: `${totalHours.toFixed(1)}h`, icon: Clock, color: 'text-blue-600' },
          { label: 'Pending', value: String(totalPending), icon: AlertCircle, color: 'text-amber-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-4">
            <div className={`w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center mb-2`}>
              <Icon size={14} className={color} />
            </div>
            <p className="text-xs text-gray-400">{label}</p>
            <p className={`text-lg font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Per-employee table */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <Users size={12} /> Employees
          </p>
          <button
            onClick={() => onSelectTech(null)}
            className="text-xs text-primary-500 hover:text-primary-700"
          >
            Show all jobs
          </button>
        </div>
        <div className="divide-y divide-gray-50">
          {data.map(emp => (
            <button
              key={emp.tech_id}
              onClick={() => onSelectTech(emp.tech_id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors group"
            >
              <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">
                {emp.tech_name ? emp.tech_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '??'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{emp.tech_name ?? `Tech #${emp.tech_id}`}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {emp.pending > 0 && <span className="text-xs text-amber-600">{emp.pending} pending</span>}
                  {emp.adjusted > 0 && <span className="text-xs text-blue-600">{emp.adjusted} adjusted</span>}
                  {emp.approved > 0 && <span className="text-xs text-emerald-600">{emp.approved} approved</span>}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-gray-900">{fmt(emp.total_pay)}</p>
                <p className="text-xs text-gray-400">{fmtHours(emp.total_actual_hours)}</p>
              </div>
              <ChevronRight size={13} className="text-gray-300 group-hover:text-gray-500 flex-shrink-0" />
            </button>
          ))}
          {data.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-6">No data yet</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Entries table ────────────────────────────────────────────────────────────
function EntriesTable({ entries, onReview }: { entries: WorkEntry[]; onReview: (e: WorkEntry) => void }) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return entries
    return entries.filter(e =>
      e.tech_name?.toLowerCase().includes(q) ||
      e.business_unit?.toLowerCase().includes(q) ||
      e.job_number?.toLowerCase().includes(q) ||
      e.invoice_id?.includes(q),
    )
  }, [entries, search])

  return (
    <div className="card overflow-hidden space-y-0">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
          Jobs <span className="ml-1 px-1.5 py-0.5 bg-primary-50 text-primary-500 rounded-full font-medium">{entries.length}</span>
        </p>
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-primary-400 w-44"
            placeholder="Search…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/60 border-b border-gray-100">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">Employee</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">Date</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">Job</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">Status</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">Sched.</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">Actual</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 whitespace-nowrap">Pay</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(entry => (
              <tr key={entry.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-2.5">
                  <p className="text-sm font-medium text-gray-900 whitespace-nowrap">{entry.tech_name ?? `Tech #${entry.tech_id}`}</p>
                  {entry.department && <p className="text-xs text-gray-400">{entry.department}</p>}
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-600 whitespace-nowrap">
                  <p>{fmtDate(entry.scheduled_start ?? entry.invoice_date)}</p>
                  {entry.scheduled_start && fmtTime(entry.scheduled_start) && (
                    <p className="text-gray-400">{fmtTime(entry.scheduled_start)} – {fmtTime(entry.scheduled_end)}</p>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <p className="text-xs font-medium text-gray-800 whitespace-nowrap">
                    {entry.job_number ? `#${entry.job_number}` : entry.appointment_id ? `Appt. ${entry.appointment_id}` : `Inv. ${entry.invoice_id}`}
                  </p>
                  <p className="text-xs text-gray-400 max-w-[140px] truncate">{entry.business_unit}</p>
                </td>
                <td className="px-4 py-2.5"><StatusBadge status={entry.status} /></td>
                <td className="px-4 py-2.5 text-right text-xs text-gray-600 whitespace-nowrap">{fmtHours(entry.scheduled_hours)}</td>
                <td className="px-4 py-2.5 text-right text-xs font-semibold text-gray-900 whitespace-nowrap">
                  {fmtHours(entry.actual_hours)}
                  {entry.actual_hours != null && entry.scheduled_hours != null && entry.actual_hours !== entry.scheduled_hours && (
                    <span className={`ml-1 ${entry.actual_hours > entry.scheduled_hours ? 'text-orange-500' : 'text-blue-500'}`}>
                      ({entry.actual_hours > entry.scheduled_hours ? '+' : ''}
                      {(entry.actual_hours - entry.scheduled_hours).toFixed(1)}h)
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right text-sm font-semibold text-gray-900 whitespace-nowrap">
                  {entry.pay_amount != null ? fmt(entry.pay_amount) : '—'}
                </td>
                <td className="px-4 py-2.5">
                  {(entry.status === 'confirmed' || entry.status === 'adjusted') && (
                    <button
                      onClick={() => onReview(entry)}
                      className="px-2.5 py-1 bg-primary-50 hover:bg-primary-100 text-primary-600 text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
                    >
                      Review
                    </button>
                  )}
                  {(entry.status === 'admin_approved' || entry.status === 'admin_rejected') && (
                    <button
                      onClick={() => onReview(entry)}
                      className="px-2.5 py-1 bg-gray-50 hover:bg-gray-100 text-gray-500 text-xs font-medium rounded-lg transition-colors"
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50/80">
                <td colSpan={4} className="px-4 py-2.5 text-xs font-semibold text-gray-500">Totals</td>
                <td className="px-4 py-2.5 text-right text-xs font-bold text-gray-700">
                  {fmtHours(filtered.reduce((s, e) => s + (e.scheduled_hours ?? 0), 0))}
                </td>
                <td className="px-4 py-2.5 text-right text-xs font-bold text-gray-700">
                  {fmtHours(filtered.reduce((s, e) => s + (e.actual_hours ?? 0), 0))}
                </td>
                <td className="px-4 py-2.5 text-right text-sm font-bold text-primary-600">
                  {fmt(filtered.reduce((s, e) => s + (e.pay_amount ?? 0), 0))}
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
        {filtered.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-8">No entries found</p>
        )}
      </div>
    </div>
  )
}

// ─── Status filter tabs ───────────────────────────────────────────────────────
const STATUS_FILTERS = [
  { key: undefined, label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'adjusted', label: 'Adjusted' },
  { key: 'admin_approved', label: 'Approved' },
  { key: 'admin_rejected', label: 'Rejected' },
] as const

// ─── Main page ────────────────────────────────────────────────────────────────
type ViewMode = 'summary' | 'entries'

export default function AdminWorkEntriesPage() {
  const today = new Date()
  const firstOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`
  const [from, setFrom] = useState(firstOfMonth)
  const [to, setTo] = useState(today.toISOString().split('T')[0])
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [viewMode, setViewMode] = useState<ViewMode>('summary')
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null)
  const [reviewEntry, setReviewEntry] = useState<WorkEntry | null>(null)

  const { data: summary = [], isLoading: summaryLoading, refetch: refetchSummary } = useQuery({
    queryKey: ['admin-summary', from, to],
    queryFn: () => fetchAdminSummary(from, to),
  })

  const { data: entries = [], isLoading: entriesLoading, isFetching, refetch: refetchEntries } = useQuery({
    queryKey: ['admin-entries', from, to, statusFilter],
    queryFn: () => fetchAdminEntries(from, to, statusFilter),
    enabled: viewMode === 'entries' || selectedTechId !== null,
  })

  const displayedEntries = useMemo(() => {
    if (!selectedTechId) return entries
    return entries.filter(e => e.tech_id === selectedTechId)
  }, [entries, selectedTechId])

  const handleSelectTech = (techId: string | null) => {
    setSelectedTechId(techId)
    if (techId !== null) setViewMode('entries')
  }

  return (
    <>
      <Header title="Work Entries" subtitle="Employee time confirmations & payroll review" />

      <div className="p-6 space-y-5">
        {/* Controls bar */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div>
              <label className="block text-xs text-gray-400 mb-1">From</label>
              <input type="date" className="input-field text-xs py-1.5" value={from} max={to} onChange={e => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">To</label>
              <input type="date" className="input-field text-xs py-1.5" value={to} min={from} max={today.toISOString().split('T')[0]} onChange={e => setTo(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => { setViewMode('summary'); setSelectedTechId(null) }}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'summary' && !selectedTechId ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                Summary
              </button>
              <button
                onClick={() => setViewMode('entries')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'entries' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                All Jobs
              </button>
            </div>

            <button
              onClick={() => { refetchSummary(); refetchEntries() }}
              disabled={isFetching || summaryLoading}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"
            >
              <RefreshCw size={13} className={`text-gray-400 ${isFetching || summaryLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Status filter tabs (only in entries view) */}
        {viewMode === 'entries' && (
          <div className="flex gap-2 overflow-x-auto">
            {STATUS_FILTERS.map(f => {
              const count = f.key === undefined
                ? entries.length
                : entries.filter(e => e.status === f.key).length
              if (f.key !== undefined && count === 0) return null
              return (
                <button
                  key={f.label}
                  onClick={() => setStatusFilter(f.key as string | undefined)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                    statusFilter === f.key
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {f.label} <span className="ml-1 opacity-60">{count}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Selected employee breadcrumb */}
        {selectedTechId && (
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => { setSelectedTechId(null); setViewMode('summary') }}
              className="text-primary-500 hover:text-primary-700"
            >
              All employees
            </button>
            <ChevronRight size={14} className="text-gray-300" />
            <span className="text-gray-700 font-medium">
              {summary.find(e => e.tech_id === selectedTechId)?.tech_name ?? `Tech #${selectedTechId}`}
            </span>
          </div>
        )}

        {/* Content */}
        {(viewMode === 'summary' && !selectedTechId) ? (
          summaryLoading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
              <RefreshCw size={16} className="animate-spin" />
              <span className="text-sm">Loading…</span>
            </div>
          ) : (
            <SummaryPanel data={summary} onSelectTech={handleSelectTech} />
          )
        ) : (
          entriesLoading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
              <RefreshCw size={16} className="animate-spin" />
              <span className="text-sm">Loading…</span>
            </div>
          ) : (
            <EntriesTable entries={displayedEntries} onReview={e => setReviewEntry(e)} />
          )
        )}
      </div>

      {reviewEntry && (
        <ReviewModal entry={reviewEntry} onClose={() => setReviewEntry(null)} />
      )}
    </>
  )
}
