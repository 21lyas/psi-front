import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Pencil, Check, X, ExternalLink,
  ChevronLeft, ChevronRight, HardHat, DollarSign, Briefcase,
} from 'lucide-react'
import { fetchStEmployee, upsertStEmployee, type UpsertStEmployeeDto } from '../api/endpoints/stEmployees'
import { fetchEmployeeCalendar, confirmEntry, type CalendarItem } from '../api/endpoints/workEntries'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const monthLabel = (y: number, m: number) =>
  new Date(y, m - 1, 1).toLocaleString('en', { month: 'long', year: 'numeric' })

const pad = (n: number) => String(n).padStart(2, '0')

const monthRange = (y: number, m: number) => ({
  from: `${y}-${pad(m)}-01`,
  to: `${y}-${pad(m)}-${new Date(y, m, 0).getDate()}`,
})

const getDate = (item: CalendarItem): string =>
  item.scheduled_start
    ? new Date(item.scheduled_start).toISOString().split('T')[0]
    : (item.invoice_date ?? '')

const fmtDate = (d: string) =>
  new Date(d + 'T12:00:00').toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })

const STATUS_COLOR: Record<string, string> = {
  pending: 'text-gray-400 bg-white/5',
  confirmed: 'text-emerald-400 bg-emerald-400/10',
  adjusted: 'text-blue-400 bg-blue-400/10',
  admin_approved: 'text-emerald-400 bg-emerald-400/15',
  admin_rejected: 'text-red-400 bg-red-400/10',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TechnicianDetailPage() {
  const { techId } = useParams<{ techId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const now = new Date()
  // Default to previous month for the first 10 days (invoices not yet generated)
  const defaultDate = now.getDate() <= 10
    ? new Date(now.getFullYear(), now.getMonth() - 1, 1)
    : now
  const [year, setYear] = useState(defaultDate.getFullYear())
  const [month, setMonth] = useState(defaultDate.getMonth() + 1)

  // Employee editing state
  const [isEditingEmp, setIsEditingEmp] = useState(false)
  const [empForm, setEmpForm] = useState<Partial<UpsertStEmployeeDto>>({})

  const { data: employee, isLoading: loadingEmp } = useQuery({
    queryKey: ['st-employee', techId],
    queryFn: () => fetchStEmployee(techId!),
    enabled: !!techId,
  })

  const { from, to } = monthRange(year, month)
  const { data: jobs = [], isLoading: loadingJobs } = useQuery({
    queryKey: ['employee-calendar', techId, from, to],
    queryFn: () => fetchEmployeeCalendar(techId!, from, to),
    enabled: !!techId,
  })

  const empMutation = useMutation({
    mutationFn: (dto: UpsertStEmployeeDto) => upsertStEmployee(techId!, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['st-employee', techId] })
      qc.invalidateQueries({ queryKey: ['st-employees'] })
      setIsEditingEmp(false)
    },
  })

  const confirmMutation = useMutation({
    mutationFn: (jobKey: string) => confirmEntry(techId!, jobKey),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employee-calendar', techId] }),
  })

  const prevMonth = () => { if (month === 1) { setYear(y => y - 1); setMonth(12) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 12) { setYear(y => y + 1); setMonth(1) } else setMonth(m => m + 1) }

  const startEditEmp = () => {
    setEmpForm({
      gusto_name: employee?.gusto_name ?? '',
      department: employee?.department ?? '',
      hourly_rate: employee?.hourly_rate ?? undefined,
    })
    setIsEditingEmp(true)
  }

  const saveEmp = () => empMutation.mutate({
    gusto_name: empForm.gusto_name || null,
    department: empForm.department || null,
    hourly_rate: empForm.hourly_rate != null ? Number(empForm.hourly_rate) : null,
  })

  // Group jobs by date
  const grouped = jobs.reduce<Record<string, CalendarItem[]>>((acc, j) => {
    const d = getDate(j)
    if (!acc[d]) acc[d] = []
    acc[d].push(j)
    return acc
  }, {})
  const sortedDates = Object.keys(grouped).sort().reverse()

  const displayName = employee
    ? (employee.gusto_name || employee.label || `Tech #${techId}`)
    : `Tech #${techId}`

  const getJobKey = (item: CalendarItem) => item.appointment_id ?? item.invoice_id ?? ''

  const pendingCount = jobs.filter(j => j.status === 'pending').length
  const totalPay = jobs.reduce((s, j) => s + (j.pay_amount ?? 0), 0)

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Back */}
      <button
        onClick={() => navigate('/technicians')}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
      >
        <ArrowLeft size={16} /> Back to Technicians
      </button>

      {/* Employee card */}
      {loadingEmp ? (
        <div className="h-24 bg-white/5 rounded-xl animate-pulse" />
      ) : employee && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400">
              <HardHat size={22} />
            </div>
            {isEditingEmp ? (
              <div className="flex flex-wrap gap-2">
                <input
                  autoFocus
                  className="px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500 w-48"
                  placeholder="Full name"
                  value={empForm.gusto_name ?? ''}
                  onChange={e => setEmpForm(f => ({ ...f, gusto_name: e.target.value }))}
                />
                <input
                  className="px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500 w-36"
                  placeholder="Department"
                  value={empForm.department ?? ''}
                  onChange={e => setEmpForm(f => ({ ...f, department: e.target.value }))}
                />
                <input
                  type="number"
                  className="px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500 w-24"
                  placeholder="Rate $/h"
                  value={empForm.hourly_rate ?? ''}
                  onChange={e => setEmpForm(f => ({ ...f, hourly_rate: e.target.value as any }))}
                />
              </div>
            ) : (
              <div>
                <h2 className="text-white text-lg font-semibold">{displayName}</h2>
                <div className="flex items-center gap-3 mt-0.5 text-sm text-gray-400">
                  {employee.department && (
                    <span className="flex items-center gap-1">
                      <Briefcase size={12} /> {employee.department}
                    </span>
                  )}
                  {employee.hourly_rate != null && (
                    <span className="flex items-center gap-1">
                      <DollarSign size={12} /> ${employee.hourly_rate}/h
                    </span>
                  )}
                  <span className="text-gray-600 font-mono text-xs">#{techId}</span>
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            {isEditingEmp ? (
              <>
                <button onClick={saveEmp} disabled={empMutation.isPending}
                  className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors">
                  <Check size={16} />
                </button>
                <button onClick={() => setIsEditingEmp(false)}
                  className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </>
            ) : (
              <button onClick={startEditEmp}
                className="p-2 rounded-lg text-gray-500 hover:text-primary-400 hover:bg-primary-400/10 transition-colors">
                <Pencil size={16} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Month picker + summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
            <ChevronLeft size={18} />
          </button>
          <span className="text-white font-medium w-40 text-center">{monthLabel(year, month)}</span>
          <button onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="flex items-center gap-4 text-sm">
          {pendingCount > 0 && (
            <span className="text-amber-400">{pendingCount} pending</span>
          )}
          {totalPay > 0 && (
            <span className="text-emerald-400 font-medium">${totalPay.toFixed(2)} confirmed</span>
          )}
          <span className="text-gray-500">{jobs.length} jobs</span>
        </div>
      </div>

      {/* Jobs */}
      {loadingJobs ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />)}
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-16 text-gray-600">No jobs found for {monthLabel(year, month)}</div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map(date => (
            <div key={date}>
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-2 px-1">{fmtDate(date)}</p>
              <div className="space-y-2">
                {grouped[date].map(job => {
                  const jobKey = getJobKey(job)
                  return (
                    <div key={jobKey || job.invoice_id || job.appointment_id}
                      className="bg-white/3 border border-white/8 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white text-sm font-medium">
                            {job.job_number ? `#${job.job_number}` : job.invoice_id ?? '—'}
                          </span>
                          <span className="text-gray-500 text-xs">{job.business_unit}</span>
                          {job.job_status && (
                            <span className="text-gray-600 text-xs">{job.job_status}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          {job.scheduled_hours > 0 && (
                            <span>{job.scheduled_hours}h scheduled</span>
                          )}
                          {job.invoice_total != null && (
                            <span>${Number(job.invoice_total).toFixed(2)}</span>
                          )}
                          {job.actual_hours != null && (
                            <span className="text-emerald-400">{job.actual_hours}h actual</span>
                          )}
                          {job.pay_amount != null && job.pay_amount > 0 && (
                            <span className="text-emerald-400 font-medium">${job.pay_amount.toFixed(2)} pay</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[job.status] ?? 'text-gray-400 bg-white/5'}`}>
                          {job.status}
                        </span>
                        {job.status === 'pending' && jobKey && (
                          <button
                            onClick={() => confirmMutation.mutate(jobKey)}
                            disabled={confirmMutation.isPending}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs hover:bg-emerald-500/30 transition-colors"
                          >
                            Confirm
                          </button>
                        )}
                        {job.st_url && (
                          <a href={job.st_url} target="_blank" rel="noreferrer"
                            className="p-1.5 rounded text-gray-600 hover:text-primary-400 transition-colors">
                            <ExternalLink size={13} />
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
