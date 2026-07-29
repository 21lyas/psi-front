import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp,
  ExternalLink, RefreshCw, Edit3, Check, MessageSquare, Calendar, Info, Coffee, Utensils, LogIn, LogOut,
} from 'lucide-react'
import {
  fetchEmployeeCalendar, confirmEntry, logTime, fetchDataSource,
  type CalendarItem, type WorkEntryStatus,
} from '../api/endpoints/workEntries'
import { fetchStEmployees } from '../api/endpoints/stPayroll'

const fmt = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })

const fmtHours = (h: number | null | undefined) =>
  h != null ? `${Number(h).toFixed(1)}h` : '—'

// Format date header: "Tuesday, July 2"
const fmtDayHeader = (dateStr: string) =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

// Format time: "2:00 PM"
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

// Get the effective date string (YYYY-MM-DD) for grouping
const getItemDate = (item: CalendarItem): string => {
  if (item.scheduled_start) return item.scheduled_start.split('T')[0]
  if (item.invoice_date) return item.invoice_date
  return '0000-00-00'
}

const getJobKey = (item: CalendarItem): string =>
  item.appointment_id ?? item.invoice_id ?? ''

const STATUS_CONFIG: Record<WorkEntryStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  pending:        { label: 'Pending',       color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-200',   icon: Clock },
  confirmed:      { label: 'Confirmed',     color: 'text-green-600',   bg: 'bg-green-50 border-green-200',   icon: CheckCircle2 },
  adjusted:       { label: 'Adjusted',      color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-200',     icon: Edit3 },
  admin_approved: { label: 'Approved',      color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  admin_rejected: { label: 'Needs revision',color: 'text-red-600',     bg: 'bg-red-50 border-red-200',       icon: AlertCircle },
}

function StatusBadge({ status }: { status: WorkEntryStatus }) {
  const cfg = STATUS_CONFIG[status]
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.color}`}>
      <Icon size={10} /> {cfg.label}
    </span>
  )
}

// ─── Local datetime-local <input> helpers ──────────────────────────────────────
// datetime-local values are interpreted in the browser's local timezone, so we
// build/parse them from local date parts rather than ISO/UTC strings.
const pad2 = (n: number) => String(n).padStart(2, '0')

const toLocalInput = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`

const defaultLocalInput = (baseDate: string, hour: number, minute = 0) => {
  const d = new Date(baseDate + 'T00:00:00')
  d.setHours(hour, minute, 0, 0)
  return toLocalInput(d)
}

const fmtRefTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : null

// ─── Log time (clock in/out + lunch & rest breaks) ─────────────────────────────
function LogTimeForm({ item, techId, onDone }: { item: CalendarItem; techId: string; onDone: () => void }) {
  const queryClient = useQueryClient()
  const day = getItemDate(item)

  const [clockIn, setClockIn] = useState(item.clock_in ? toLocalInput(new Date(item.clock_in)) : defaultLocalInput(day, 8))
  const [clockOut, setClockOut] = useState(item.clock_out ? toLocalInput(new Date(item.clock_out)) : defaultLocalInput(day, 17))
  const [lunchStart, setLunchStart] = useState(item.lunch_break_start ? toLocalInput(new Date(item.lunch_break_start)) : defaultLocalInput(day, 12))
  const [lunchMinutes, setLunchMinutes] = useState(item.lunch_break_minutes ?? 60)
  const [restStart, setRestStart] = useState(item.rest_break_start ? toLocalInput(new Date(item.rest_break_start)) : defaultLocalInput(day, 15))
  const [restMinutes, setRestMinutes] = useState(item.rest_break_minutes ?? 60)
  const [note, setNote] = useState(item.employee_note ?? '')
  const [showNote, setShowNote] = useState(!!item.employee_note)

  const grossHours = (new Date(clockOut).getTime() - new Date(clockIn).getTime()) / 3_600_000
  const netHours = grossHours - (lunchMinutes + restMinutes) / 60
  const valid = grossHours > 0 && netHours >= 0

  const rate = item.default_rate
  const pay = rate && netHours > 0 ? rate * netHours : null

  const mutation = useMutation({
    mutationFn: () => logTime(techId, getJobKey(item), {
      clock_in: new Date(clockIn).toISOString(),
      clock_out: new Date(clockOut).toISOString(),
      lunch_break_start: new Date(lunchStart).toISOString(),
      lunch_break_minutes: lunchMinutes,
      rest_break_start: new Date(restStart).toISOString(),
      rest_break_minutes: restMinutes,
      employee_note: note || undefined,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['employee-calendar', techId] }); onDone() },
  })

  return (
    <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-200 space-y-3">
      <p className="text-xs font-semibold text-blue-700">Log time worked</p>

      {(item.st_arrived_on || item.st_completed_on) && (
        <div className="flex items-start gap-1.5 bg-white/70 border border-blue-200 rounded-lg px-2.5 py-2 text-xs text-blue-700">
          <Info size={12} className="mt-0.5 flex-shrink-0" />
          <span>
            ServiceTitan recorded {item.st_arrived_on && <>arrival <b>{fmtRefTime(item.st_arrived_on)}</b></>}
            {item.st_arrived_on && item.st_completed_on && ' · '}
            {item.st_completed_on && <>completion <b>{fmtRefTime(item.st_completed_on)}</b></>}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="flex items-center gap-1 text-xs font-medium text-blue-700 mb-1"><LogIn size={11} /> Clock in</span>
          <input type="datetime-local" value={clockIn} onChange={e => setClockIn(e.target.value)}
            className="w-full border border-blue-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-500 bg-white" />
        </label>
        <label className="block">
          <span className="flex items-center gap-1 text-xs font-medium text-blue-700 mb-1"><LogOut size={11} /> Clock out</span>
          <input type="datetime-local" value={clockOut} onChange={e => setClockOut(e.target.value)}
            className="w-full border border-blue-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-500 bg-white" />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="flex items-center gap-1 text-xs font-medium text-amber-700 mb-1"><Utensils size={11} /> Lunch break</span>
          <div className="flex gap-1">
            <input type="datetime-local" value={lunchStart} onChange={e => setLunchStart(e.target.value)}
              className="flex-1 min-w-0 border border-amber-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-amber-500 bg-white" />
            <input type="number" min={0} max={240} step={5} value={lunchMinutes} onChange={e => setLunchMinutes(Number(e.target.value))}
              className="w-14 border border-amber-300 rounded-lg px-1.5 py-1.5 text-xs text-center focus:outline-none focus:border-amber-500 bg-white" title="Minutes" />
          </div>
        </label>
        <label className="block">
          <span className="flex items-center gap-1 text-xs font-medium text-teal-700 mb-1"><Coffee size={11} /> Rest break</span>
          <div className="flex gap-1">
            <input type="datetime-local" value={restStart} onChange={e => setRestStart(e.target.value)}
              className="flex-1 min-w-0 border border-teal-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-teal-500 bg-white" />
            <input type="number" min={0} max={240} step={5} value={restMinutes} onChange={e => setRestMinutes(Number(e.target.value))}
              className="w-14 border border-teal-300 rounded-lg px-1.5 py-1.5 text-xs text-center focus:outline-none focus:border-teal-500 bg-white" title="Minutes" />
          </div>
        </label>
      </div>

      <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-blue-200">
        <span className="text-xs text-gray-500">Net time worked</span>
        <span className={`text-sm font-bold ${valid ? 'text-blue-700' : 'text-red-500'}`}>
          {valid ? fmtHours(netHours) : 'Invalid range'}
          {pay != null && valid && <span className="ml-1.5 font-normal text-gray-400">≈ {fmt(pay)}</span>}
        </span>
      </div>

      {!showNote ? (
        <button type="button" onClick={() => setShowNote(true)} className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700">
          <MessageSquare size={11} /> Add note
        </button>
      ) : (
        <textarea className="w-full border border-blue-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white resize-none"
          rows={2} placeholder="Optional note…" value={note} onChange={e => setNote(e.target.value)} />
      )}

      <div className="flex items-center gap-2">
        <button onClick={() => mutation.mutate()} disabled={!valid || mutation.isPending}
          className="flex-1 flex items-center justify-center gap-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition-colors">
          {mutation.isPending ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />} Save
        </button>
        <button onClick={onDone} className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
      </div>
      {mutation.isError && <p className="text-xs text-red-500">Failed to save. Try again.</p>}
    </div>
  )
}

// ─── Single appointment card ───────────────────────────────────────────────────
function AppointmentCard({ item, techId }: { item: CalendarItem; techId: string }) {
  const [expanded, setExpanded] = useState(false)
  const [logging, setLogging] = useState(false)
  const queryClient = useQueryClient()

  const confirmMutation = useMutation({
    mutationFn: () => confirmEntry(techId, getJobKey(item)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employee-calendar', techId] }),
  })

  const isLocked = item.status === 'admin_approved'
  const needsRevision = item.status === 'admin_rejected'
  const isPending = item.status === 'pending'

  const borderColor = needsRevision ? 'border-l-red-400' : item.status === 'admin_approved' ? 'border-l-emerald-400' : item.status !== 'pending' ? 'border-l-blue-400' : 'border-l-gray-200'

  return (
    <div className={`bg-white rounded-2xl border border-gray-200 border-l-4 ${borderColor} shadow-sm overflow-hidden`}>
      <button className="w-full text-left px-4 pt-4 pb-3" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Time slot (appointments) or date (invoices) */}
            {item.scheduled_start && item.scheduled_end ? (
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-bold text-gray-900 bg-gray-100 rounded-lg px-2 py-0.5">
                  {fmtTime(item.scheduled_start)} – {fmtTime(item.scheduled_end)}
                </span>
                <span className="text-xs text-gray-400">{fmtHours(item.scheduled_hours)} scheduled</span>
                <StatusBadge status={item.status} />
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-1.5">
                <StatusBadge status={item.status} />
                {item.scheduled_hours > 0 && <span className="text-xs text-gray-400">{fmtHours(item.scheduled_hours)}</span>}
              </div>
            )}
            <p className="text-sm font-semibold text-gray-900 truncate">{item.business_unit}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {item.job_number ? `Job #${item.job_number}` : item.job_id ? `Job ${item.job_id}` : 'No job number'}
              {' · '}
              <span className={item.job_status === 'Completed' ? 'text-green-600' : item.job_status === 'Canceled' ? 'text-gray-400' : 'text-blue-600'}>
                {item.appointment_status ?? item.job_status}
              </span>
            </p>
            {item.job_summary && (
              <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{item.job_summary}</p>
            )}
          </div>
          <div className="text-right flex-shrink-0 flex flex-col items-end gap-0.5">
            {item.pay_amount != null ? (
              <p className="text-sm font-bold text-primary-600">{fmt(item.pay_amount)}</p>
            ) : item.actual_hours != null ? (
              <p className="text-sm font-semibold text-gray-900">{fmtHours(item.actual_hours)}</p>
            ) : null}
            {expanded ? <ChevronUp size={14} className="text-gray-400 mt-1" /> : <ChevronDown size={14} className="text-gray-400 mt-1" />}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-gray-50 rounded-lg p-2.5">
              <p className="text-gray-400 mb-0.5">Scheduled</p>
              <p className="font-semibold text-gray-900">{fmtHours(item.scheduled_hours)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2.5">
              <p className="text-gray-400 mb-0.5">Actual</p>
              <p className={`font-semibold ${item.actual_hours != null ? 'text-gray-900' : 'text-gray-400'}`}>
                {fmtHours(item.actual_hours)}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2.5">
              <p className="text-gray-400 mb-0.5">Rate</p>
              <p className="font-semibold text-gray-900">
                {item.hourly_rate != null ? `$${item.hourly_rate}/h` : item.default_rate != null ? `$${item.default_rate}/h` : '—'}
              </p>
            </div>
            {item.invoice_total != null && (
              <div className="bg-gray-50 rounded-lg p-2.5">
                <p className="text-gray-400 mb-0.5">Invoice</p>
                <p className="font-semibold text-gray-900">{fmt(item.invoice_total)}</p>
              </div>
            )}
          </div>

          {item.st_url && (
            <a href={item.st_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-primary-500 hover:text-primary-700"
              onClick={e => e.stopPropagation()}>
              <ExternalLink size={11} /> View in ServiceTitan
            </a>
          )}
          {item.special_instructions && (
            <div className="bg-amber-50 rounded-lg p-2.5 border border-amber-200">
              <p className="text-xs text-amber-600 font-medium mb-0.5">Instructions</p>
              <p className="text-xs text-amber-800">{item.special_instructions}</p>
            </div>
          )}
          {item.employee_note && (
            <div className="bg-blue-50 rounded-lg p-2.5">
              <p className="text-xs text-blue-500 font-medium mb-0.5">Your note</p>
              <p className="text-xs text-blue-800">{item.employee_note}</p>
            </div>
          )}
          {item.admin_note && (
            <div className="bg-orange-50 rounded-lg p-2.5 border border-orange-200">
              <p className="text-xs text-orange-600 font-medium mb-0.5">Admin note</p>
              <p className="text-xs text-orange-800">{item.admin_note}</p>
            </div>
          )}
          {item.clock_in && item.clock_out && (
            <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100 space-y-1.5">
              <p className="text-xs text-gray-500 font-medium flex items-center gap-1"><Clock size={11} /> Logged time</p>
              <div className="flex items-center justify-between text-xs text-gray-700">
                <span className="flex items-center gap-1"><LogIn size={10} className="text-gray-400" /> {fmtTime(item.clock_in)}</span>
                <span className="text-gray-300">→</span>
                <span className="flex items-center gap-1"><LogOut size={10} className="text-gray-400" /> {fmtTime(item.clock_out)}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                {item.lunch_break_start && <span className="flex items-center gap-1"><Utensils size={10} className="text-amber-500" /> {fmtTime(item.lunch_break_start)} · {item.lunch_break_minutes}m</span>}
                {item.rest_break_start && <span className="flex items-center gap-1"><Coffee size={10} className="text-teal-500" /> {fmtTime(item.rest_break_start)} · {item.rest_break_minutes}m</span>}
              </div>
            </div>
          )}

          {/* Actions */}
          {!isLocked && !logging && (
            <div className="flex items-center gap-2 pt-1">
              {isPending && (
                <button onClick={() => confirmMutation.mutate()} disabled={confirmMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-medium rounded-xl py-2.5 transition-colors">
                  {confirmMutation.isPending ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                  Confirm {fmtHours(item.scheduled_hours)}
                </button>
              )}
              <button onClick={() => setLogging(true)}
                className={`${isPending ? 'px-4' : 'flex-1'} flex items-center justify-center gap-1.5 border border-gray-300 hover:border-gray-400 text-gray-600 text-sm font-medium rounded-xl py-2.5 transition-colors`}>
                <Edit3 size={13} />
                {needsRevision ? 'Revise time' : isPending ? 'Log time' : 'Edit time'}
              </button>
            </div>
          )}
          {isLocked && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">
              <CheckCircle2 size={12} /> Approved — no further changes
            </div>
          )}
          {logging && <LogTimeForm item={item} techId={techId} onDone={() => setLogging(false)} />}
        </div>
      )}
    </div>
  )
}

// ─── Day group ────────────────────────────────────────────────────────────────
function DayGroup({ date, items, techId }: { date: string; items: CalendarItem[]; techId: string }) {
  const pending = items.filter(i => i.status === 'pending').length
  const totalPay = items.reduce((s, i) => s + (i.pay_amount ?? 0), 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <Calendar size={13} className="text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-700">{date === '0000-00-00' ? 'No date' : fmtDayHeader(date)}</h3>
          {pending > 0 && (
            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">{pending} pending</span>
          )}
        </div>
        {totalPay > 0 && <span className="text-xs font-semibold text-primary-600">{fmt(totalPay)}</span>}
      </div>
      <div className="space-y-2">
        {items.map(item => (
          <AppointmentCard key={getJobKey(item)} item={item} techId={techId} />
        ))}
      </div>
    </div>
  )
}

// ─── Stats bar ────────────────────────────────────────────────────────────────
function StatsBar({ items }: { items: CalendarItem[] }) {
  const pending = items.filter(i => i.status === 'pending').length
  const done = items.filter(i => i.status !== 'pending').length
  const totalPay = items.reduce((s, i) => s + (i.pay_amount ?? 0), 0)
  const totalHours = items.reduce((s, i) => s + (i.actual_hours ?? 0), 0)

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <p className="text-xs text-gray-400 mb-1">Needs confirmation</p>
        <p className="text-2xl font-bold text-amber-500">{pending}</p>
        <p className="text-xs text-gray-400">{done} done · {items.length} total</p>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <p className="text-xs text-gray-400 mb-1">Pay confirmed so far</p>
        <p className="text-2xl font-bold text-primary-600">{fmt(totalPay)}</p>
        <p className="text-xs text-gray-400">{totalHours.toFixed(1)}h actual</p>
      </div>
    </div>
  )
}

// ─── Month picker ─────────────────────────────────────────────────────────────
function MonthPicker({ year, month, onChange }: { year: number; month: number; onChange: (y: number, m: number) => void }) {
  const label = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const prev = () => { const d = new Date(year, month - 2, 1); onChange(d.getFullYear(), d.getMonth() + 1) }
  const next = () => { const d = new Date(year, month, 1); onChange(d.getFullYear(), d.getMonth() + 1) }
  const isCurrentMonth = year === new Date().getFullYear() && month === new Date().getMonth() + 1

  return (
    <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 px-3 py-2">
      <button onClick={prev} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500">‹</button>
      <span className="text-sm font-semibold text-gray-900 flex-1 text-center">{label}</span>
      <button onClick={next} disabled={isCurrentMonth} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-30">›</button>
    </div>
  )
}

// ─── Filter chips ─────────────────────────────────────────────────────────────
const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'adjusted', label: 'Adjusted' },
  { key: 'admin_approved', label: 'Approved' },
  { key: 'admin_rejected', label: 'Revision' },
] as const

// ─── Main page ────────────────────────────────────────────────────────────────
export default function EmployeePortalPage() {
  const { techId } = useParams<{ techId: string }>()
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [filter, setFilter] = useState<'all' | WorkEntryStatus>('all')

  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const { data: sourceInfo } = useQuery({
    queryKey: ['data-source'],
    queryFn: fetchDataSource,
    staleTime: 60_000,
  })

  const { data: employees = [] } = useQuery({
    queryKey: ['st-employees'],
    queryFn: fetchStEmployees,
    staleTime: 5 * 60_000,
  })

  const employee = employees.find(e => e.tech_id === techId)
  const displayName = employee?.gusto_name ?? employee?.label ?? `Technician #${techId}`

  const { data: items = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['employee-calendar', techId, from, to],
    queryFn: () => fetchEmployeeCalendar(techId!, from, to),
    enabled: !!techId,
  })

  const filtered = filter === 'all' ? items : items.filter(i => i.status === filter)

  // Group by date, sorted newest first
  const grouped = useMemo(() => {
    const map = new Map<string, CalendarItem[]>()
    for (const item of filtered) {
      const d = getItemDate(item)
      if (!map.has(d)) map.set(d, [])
      map.get(d)!.push(item)
    }
    // Sort within each day by start time
    map.forEach(group => group.sort((a, b) => {
      const at = a.scheduled_start ?? a.invoice_date ?? ''
      const bt = b.scheduled_start ?? b.invoice_date ?? ''
      return at.localeCompare(bt)
    }))
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a))
  }, [filtered])

  if (!techId) return <div className="py-20 text-center text-sm text-gray-400">No technician ID provided.</div>

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">{displayName}</h1>
          {employee?.department && <p className="text-sm text-gray-500">{employee.department}</p>}
        </div>
        <button onClick={() => refetch()} disabled={isFetching}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50">
          <RefreshCw size={15} className={`text-gray-400 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Data source badge */}
      {sourceInfo && (
        <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border ${
          sourceInfo.appointments_synced
            ? 'bg-green-50 text-green-700 border-green-200'
            : 'bg-amber-50 text-amber-700 border-amber-200'
        }`}>
          <Info size={11} />
          {sourceInfo.appointments_synced
            ? 'Showing scheduled appointments from ServiceTitan'
            : 'Appointments not synced yet — showing invoice-based jobs'}
        </div>
      )}

      {/* Month picker */}
      <MonthPicker year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m) }} />

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4 space-y-2">
              <div className="h-3 bg-gray-100 rounded animate-pulse w-1/4" />
              <div className="h-4 bg-gray-100 rounded animate-pulse w-2/3" />
              <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
          <Calendar size={32} className="opacity-30" />
          <p className="text-sm font-medium">No jobs this month</p>
        </div>
      ) : (
        <>
          <StatsBar items={items} />

          {/* Filter chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {FILTERS.map(f => {
              const count = f.key === 'all' ? items.length : items.filter(i => i.status === f.key).length
              if (f.key !== 'all' && count === 0) return null
              return (
                <button key={f.key} onClick={() => setFilter(f.key as typeof filter)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    filter === f.key ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}>
                  {f.label} <span className="ml-1 opacity-60">{count}</span>
                </button>
              )
            })}
          </div>

          {/* Calendar grouped by day */}
          <div className="space-y-5">
            {grouped.map(([date, dayItems]) => (
              <DayGroup key={date} date={date} items={dayItems} techId={techId} />
            ))}
            {grouped.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-6">No jobs match this filter.</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
