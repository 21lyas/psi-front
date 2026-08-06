import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Pencil, Check, X, Wrench, Wallet, Mail, Phone, KeyRound, Calendar,
  HardHat, ChevronLeft, ChevronRight, ExternalLink, Link2, ShieldCheck, Building2, DollarSign,
} from 'lucide-react'
import Header from '../components/Layout/Header'
import EntityLinkPicker from '../components/ui/EntityLinkPicker'
import {
  fetchEmployeeById, updateEmployee, fetchServiceTitanDirectory, fetchGustoDirectory, fetchTechnicianDirectory,
} from '../api/endpoints/employees'
import { fetchRoles } from '../api/endpoints/roles'
import { fetchSystemRoles } from '../api/endpoints/systemRoles'
import { fetchEmployeeCalendar, type CalendarItem } from '../api/endpoints/workEntries'
import { employeeDisplayName, employeeInitials } from '../utils/employeeName'

type FormData = {
  first_name: string; last_name: string; role_id: number | null
  pay_level: number; hire_date: string; email: string; phone: string; login: string
  is_active: boolean; gusto_id: string | null; service_titan_id: string | null; tech_id: string | null
  system_role_id: number | null
}

// ─── Job history helpers ───────────────────────────────────────────────────

const CONFIRMED_STATUSES: CalendarItem['status'][] = ['confirmed', 'adjusted', 'admin_approved']

const monthLabel = (y: number, m: number) =>
  new Date(y, m - 1, 1).toLocaleString('en', { month: 'long', year: 'numeric' })

const pad = (n: number) => String(n).padStart(2, '0')

const monthRange = (y: number, m: number) => ({
  from: `${y}-${pad(m)}-01`,
  to: `${y}-${pad(m)}-${new Date(y, m, 0).getDate()}`,
})

const getJobDate = (item: CalendarItem): string =>
  item.scheduled_start
    ? new Date(item.scheduled_start).toISOString().split('T')[0]
    : (item.invoice_date ?? '')

const fmtDate = (d: string) =>
  new Date(d + 'T12:00:00').toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Confirmed', adjusted: 'Adjusted (confirmed)', admin_approved: 'Approved',
}
const STATUS_COLOR: Record<string, string> = {
  confirmed: 'text-emerald-700 bg-emerald-50', adjusted: 'text-blue-700 bg-blue-50', admin_approved: 'text-emerald-700 bg-emerald-100',
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-gray-400'}`} />
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const employeeId = Number(id)

  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState<FormData | null>(null)
  const [linkLabels, setLinkLabels] = useState<{ st: string | null; gusto: string | null; tech: string | null }>({ st: null, gusto: null, tech: null })

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const { data: employee, isLoading, isError } = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: () => fetchEmployeeById(employeeId),
    enabled: Number.isFinite(employeeId),
  })
  const { data: roles = [] } = useQuery({ queryKey: ['roles'], queryFn: () => fetchRoles() })
  const { data: systemRoles = [] } = useQuery({ queryKey: ['system-roles'], queryFn: fetchSystemRoles })

  const { from, to } = monthRange(year, month)
  const { data: allJobs = [], isLoading: loadingJobs } = useQuery({
    queryKey: ['employee-confirmed-jobs', employee?.tech_id, from, to],
    queryFn: () => fetchEmployeeCalendar(employee!.tech_id!, from, to),
    enabled: !!employee?.tech_id,
  })
  const jobs = allJobs.filter(j => CONFIRMED_STATUSES.includes(j.status))

  const save = useMutation({
    mutationFn: (dto: FormData) => updateEmployee(employeeId, {
      ...dto,
      first_name: dto.first_name || null,
      last_name: dto.last_name || null,
      email: dto.email || null,
      phone: dto.phone || null,
      login: dto.login || null,
      hire_date: dto.hire_date || null,
      role_id: dto.role_id || null,
      system_role_id: dto.system_role_id || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee', employeeId] })
      qc.invalidateQueries({ queryKey: ['employees'] })
      setIsEditing(false)
    },
  })

  const startEdit = () => {
    if (!employee) return
    setForm({
      first_name: employee.first_name ?? '', last_name: employee.last_name ?? '',
      role_id: employee.role_id, pay_level: employee.pay_level,
      hire_date: employee.hire_date ?? '', email: employee.email ?? '',
      phone: employee.phone ?? '', login: employee.login ?? '',
      is_active: employee.is_active,
      gusto_id: employee.gusto_id, service_titan_id: employee.service_titan_id, tech_id: employee.tech_id,
      system_role_id: employee.system_role_id,
    })
    setLinkLabels({ st: null, gusto: null, tech: null })
    if (employee.service_titan_id) {
      fetchServiceTitanDirectory(employee.service_titan_id).then(opts => {
        const match = opts.find(o => o.value === employee.service_titan_id)
        if (match) setLinkLabels(l => ({ ...l, st: match.label }))
      })
    }
    if (employee.gusto_id) {
      fetchGustoDirectory(employee.gusto_id).then(opts => {
        const match = opts.find(o => o.value === employee.gusto_id)
        if (match) setLinkLabels(l => ({ ...l, gusto: match.label }))
      })
    }
    if (employee.tech_id) {
      fetchTechnicianDirectory(employee.tech_id).then(opts => {
        const match = opts.find(o => o.value === employee.tech_id)
        if (match) setLinkLabels(l => ({ ...l, tech: match.label }))
      })
    }
    setIsEditing(true)
  }
  const cancelEdit = () => { setIsEditing(false); setForm(null) }
  const set = (k: keyof FormData, v: unknown) => setForm(f => f ? { ...f, [k]: v } : f)

  const prevMonth = () => { if (month === 1) { setYear(y => y - 1); setMonth(12) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 12) { setYear(y => y + 1); setMonth(1) } else setMonth(m => m + 1) }

  const selectedRole = roles.find(r => r.id === form?.role_id)
  const maxLevel = selectedRole?.payRateLevels?.length ?? 7

  if (isLoading) {
    return (
      <>
        <Header title="Employee Profile" />
        <div className="p-6 max-w-3xl space-y-4">
          <div className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
        </div>
      </>
    )
  }

  if (isError || !employee) {
    return (
      <>
        <Header title="Employee Profile" />
        <div className="p-6 max-w-3xl">
          <p className="text-sm text-gray-500">Employee not found.</p>
          <button onClick={() => navigate('/employees')} className="btn-secondary mt-4 flex items-center gap-2">
            <ArrowLeft size={14} /> Back to Employees
          </button>
        </div>
      </>
    )
  }

  const totalPay = jobs.reduce((s, j) => s + (j.pay_amount ?? 0), 0)

  return (
    <>
      <Header title="Employee Profile" subtitle={employeeDisplayName(employee)} />
      <div className="p-6 max-w-6xl space-y-5">
        <button
          onClick={() => navigate('/employees')}
          className="flex items-center gap-2 text-gray-400 hover:text-gray-700 transition-colors text-sm"
        >
          <ArrowLeft size={16} /> Back to Employees
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5 items-start">
        <div className="space-y-5">
        <div className="card p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500/20 to-purple-500/20 flex items-center justify-center text-primary-500 text-lg font-semibold flex-shrink-0">
                {employeeInitials(employee)}
              </div>
              {isEditing && form ? (
                <div className="grid grid-cols-2 gap-2">
                  <input autoFocus className="input-field" placeholder="First name" value={form.first_name} onChange={e => set('first_name', e.target.value)} />
                  <input className="input-field" placeholder="Last name" value={form.last_name} onChange={e => set('last_name', e.target.value)} />
                </div>
              ) : (
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className={`text-lg font-semibold truncate ${employee.first_name || employee.last_name ? 'text-gray-900' : 'text-gray-400 italic'}`}>{employeeDisplayName(employee)}</h2>
                    {employee.service_titan_id && <Wrench size={13} className="text-blue-400 flex-shrink-0" />}
                    {employee.gusto_id && <Wallet size={13} className="text-emerald-500 flex-shrink-0" />}
                    {employee.tech_id && <HardHat size={13} className="text-amber-500 flex-shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge active={employee.is_active} />
                    <span className="text-gray-400 text-xs font-mono">#{employee.id}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {isEditing ? (
                <>
                  <button onClick={() => form && save.mutate(form)} disabled={save.isPending}
                    className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors disabled:opacity-50">
                    <Check size={16} />
                  </button>
                  <button onClick={cancelEdit} className="p-2 rounded-lg bg-gray-50 text-gray-400 hover:text-gray-700 transition-colors">
                    <X size={16} />
                  </button>
                </>
              ) : (
                <button onClick={startEdit} className="p-2 rounded-lg text-gray-400 hover:text-primary-500 hover:bg-primary-50 transition-colors">
                  <Pencil size={16} />
                </button>
              )}
            </div>
          </div>

          {save.isError && (
            <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg mt-4">
              Save error. Please check the data.
            </p>
          )}
        </div>

        <div className="card p-5 space-y-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Role & Pay</p>
          {isEditing && form ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Role</label>
                <select className="input-field" value={form.role_id ?? 0} onChange={e => set('role_id', +e.target.value || null)}>
                  <option value={0}>Not assigned</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.division?.name} — {r.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Pay level {selectedRole?.payRateLevels?.find(l => l.level === form.pay_level) && (
                    <span className="text-primary-500 font-semibold ml-1">
                      ${Number(selectedRole.payRateLevels.find(l => l.level === form.pay_level)!.hourly_rate).toFixed(2)}/h
                    </span>
                  )}
                </label>
                <input className="input-field" type="number" min={1} max={maxLevel} value={form.pay_level} onChange={e => set('pay_level', +e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Hire date</label>
                <input className="input-field" type="date" value={form.hire_date} onChange={e => set('hire_date', e.target.value)} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400 text-xs">Role</p>
                <p className="text-gray-900">{employee.role?.title || '—'}</p>
                <p className="text-gray-400 text-xs">{employee.role?.division?.name}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">Pay level</p>
                <p className="text-gray-900">Lv{employee.pay_level}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs flex items-center gap-1"><Calendar size={11} /> Hire date</p>
                <p className="text-gray-900">{employee.hire_date ? new Date(employee.hire_date).toLocaleDateString('ru-RU') : '—'}</p>
              </div>
            </div>
          )}
        </div>

        <div className="card p-5 space-y-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Contacts</p>
          {isEditing && form ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Email</label>
                <input className="input-field" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Phone</label>
                <input className="input-field" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Login</label>
                <input className="input-field" value={form.login} onChange={e => set('login', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">System role</label>
                <select className="input-field" value={form.system_role_id ?? 0} onChange={e => set('system_role_id', +e.target.value || null)}>
                  <option value={0}>None</option>
                  {systemRoles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer mt-6">
                <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="rounded border-gray-300 text-primary-500 focus:ring-primary-500" />
                <span className="text-sm text-gray-700">Active employee</span>
              </label>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400 text-xs flex items-center gap-1"><Mail size={11} /> Email</p>
                <p className="text-gray-900">{employee.email || '—'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs flex items-center gap-1"><Phone size={11} /> Phone</p>
                <p className="text-gray-900">{employee.phone || '—'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs flex items-center gap-1"><KeyRound size={11} /> Login</p>
                <p className="text-gray-900">{employee.login || '—'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs flex items-center gap-1"><ShieldCheck size={11} /> System role</p>
                <p className="text-gray-900">{employee.systemRole?.name || '—'}</p>
              </div>
            </div>
          )}
        </div>

        {(employee.department || employee.hourly_rate || employee.gusto_name || employee.label) && (
          <div className="card p-5 space-y-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Technician roster data</p>
            <p className="text-xs text-gray-400 -mt-3">Mirrored from the ServiceTitan technician roster (psi.st_employees) — read-only here.</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400 text-xs flex items-center gap-1"><Building2 size={11} /> Department</p>
                <p className="text-gray-900">{employee.department || '—'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs flex items-center gap-1"><DollarSign size={11} /> Hourly rate</p>
                <p className="text-gray-900">{employee.hourly_rate ? `$${Number(employee.hourly_rate).toFixed(2)}/h` : '—'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-400 text-xs">Gusto name / label</p>
                <p className="text-gray-900">{employee.gusto_name || employee.label || '—'}</p>
              </div>
            </div>
          </div>
        )}

        <div className="card p-5 space-y-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">External systems</p>
          {isEditing && form ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Wrench size={12} className="text-blue-400" /> ServiceTitan
                </label>
                <EntityLinkPicker
                  queryKey="st-directory"
                  value={form.service_titan_id}
                  valueLabel={linkLabels.st}
                  placeholder="Search technicians…"
                  fetchOptions={fetchServiceTitanDirectory}
                  onChange={(v, opt) => { set('service_titan_id', v); setLinkLabels(l => ({ ...l, st: opt?.label ?? null })) }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Wallet size={12} className="text-emerald-500" /> Gusto
                </label>
                <EntityLinkPicker
                  queryKey="gusto-directory"
                  value={form.gusto_id}
                  valueLabel={linkLabels.gusto}
                  placeholder="Search payroll…"
                  fetchOptions={fetchGustoDirectory}
                  onChange={(v, opt) => { set('gusto_id', v); setLinkLabels(l => ({ ...l, gusto: opt?.label ?? null })) }}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <HardHat size={12} className="text-amber-500" /> Technician (job/work history)
                </label>
                <EntityLinkPicker
                  queryKey="tech-directory"
                  value={form.tech_id}
                  valueLabel={linkLabels.tech}
                  placeholder="Search technicians by name…"
                  fetchOptions={fetchTechnicianDirectory}
                  onChange={(v, opt) => { set('tech_id', v); setLinkLabels(l => ({ ...l, tech: opt?.label ?? null })) }}
                />
                <p className="text-xs text-gray-400 mt-1">Links to the technician record used to track confirmed jobs below — a different id space than the ServiceTitan account link above.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400 text-xs flex items-center gap-1"><Wrench size={11} className="text-blue-400" /> ServiceTitan ID</p>
                <p className="text-gray-900 font-mono">{employee.service_titan_id || '—'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs flex items-center gap-1"><Wallet size={11} className="text-emerald-500" /> Gusto ID</p>
                <p className="text-gray-900 font-mono truncate">{employee.gusto_id || '—'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-400 text-xs flex items-center gap-1"><HardHat size={11} className="text-amber-500" /> Technician ID</p>
                <p className="text-gray-900 font-mono">{employee.tech_id || '—'}</p>
              </div>
            </div>
          )}
        </div>
        </div>

        <div className="card p-5 space-y-4 lg:sticky lg:top-6">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Confirmed Work</p>
            {employee.tech_id && (
              <div className="flex items-center gap-2">
                <button onClick={prevMonth} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                  <ChevronLeft size={16} />
                </button>
                <span className="text-gray-700 text-sm font-medium w-36 text-center">{monthLabel(year, month)}</span>
                <button onClick={nextMonth} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>

          {!employee.tech_id ? (
            <div className="text-center py-8">
              <Link2 size={20} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400 max-w-sm mx-auto">
                Not linked to a technician record — link one above to see confirmed jobs here.
              </p>
            </div>
          ) : loadingJobs ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : jobs.length === 0 ? (
            <p className="text-center py-8 text-sm text-gray-400">No confirmed jobs for {monthLabel(year, month)}</p>
          ) : (
            <>
              <p className="text-xs text-gray-400">
                {jobs.length} confirmed job{jobs.length === 1 ? '' : 's'}
                {totalPay > 0 && <span className="text-emerald-600 font-medium ml-2">${totalPay.toFixed(2)} pay</span>}
              </p>
              <div className="space-y-2">
                {jobs
                  .sort((a, b) => getJobDate(b).localeCompare(getJobDate(a)))
                  .map(job => {
                    const key = job.appointment_id ?? job.invoice_id ?? job.entry_id
                    return (
                      <div key={key} className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-gray-900">
                              {job.job_number ? `#${job.job_number}` : '—'}
                            </span>
                            <span className="text-xs text-gray-400">{job.business_unit}</span>
                            <span className="text-xs text-gray-400">{fmtDate(getJobDate(job))}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            {job.actual_hours != null && <span className="text-emerald-600">{job.actual_hours}h</span>}
                            {job.pay_amount != null && job.pay_amount > 0 && <span className="text-emerald-600 font-medium">${job.pay_amount.toFixed(2)}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[job.status] ?? 'text-gray-500 bg-gray-100'}`}>
                            {STATUS_LABEL[job.status] ?? job.status}
                          </span>
                          {job.st_url && (
                            <a href={job.st_url} target="_blank" rel="noreferrer" className="p-1 rounded text-gray-400 hover:text-primary-500 transition-colors">
                              <ExternalLink size={13} />
                            </a>
                          )}
                        </div>
                      </div>
                    )
                  })}
              </div>
            </>
          )}
        </div>
        </div>
      </div>
    </>
  )
}
