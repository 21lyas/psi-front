import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Search, RefreshCw, ChevronLeft, ChevronRight, ChevronRight as ViewIcon, Wrench, Wallet, HardHat } from 'lucide-react'
import Header from '../components/Layout/Header'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import EntityLinkPicker from '../components/ui/EntityLinkPicker'
import {
  fetchAllEmployees, createEmployee, updateEmployee, deleteEmployee,
  fetchServiceTitanDirectory, fetchGustoDirectory,
} from '../api/endpoints/employees'
import { fetchRoles } from '../api/endpoints/roles'
import type { Employee } from '../types/employee'

const PAGE_SIZE = 15

type FormData = {
  first_name: string; last_name: string; role_id: number
  pay_level: number; hire_date: string; email: string; phone: string; is_active: boolean
  gusto_id: string | null; service_titan_id: string | null
}

const emptyForm = (): FormData => ({
  first_name: '', last_name: '', role_id: 0, pay_level: 1,
  hire_date: new Date().toISOString().split('T')[0], email: '', phone: '', is_active: true,
  gusto_id: null, service_titan_id: null,
})

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-gray-400'}`} />
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-50">
      {[...Array(8)].map((_, i) => (
        <td key={i} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${50 + (i * 17) % 50}%` }} /></td>
      ))}
    </tr>
  )
}

export default function EmployeesPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [modal, setModal] = useState<{ open: boolean; item?: Employee }>({ open: false })
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [linkLabels, setLinkLabels] = useState<{ st: string | null; gusto: string | null }>({ st: null, gusto: null })
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data: employees = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['employees'], queryFn: fetchAllEmployees,
  })
  const { data: roles = [] } = useQuery({ queryKey: ['roles'], queryFn: () => fetchRoles() })

  const filtered = useMemo(() => {
    if (!search.trim()) return employees
    const q = search.toLowerCase()
    return employees.filter(e =>
      `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) ||
      e.email?.toLowerCase().includes(q) ||
      e.role?.title?.toLowerCase().includes(q) ||
      e.role?.division?.name?.toLowerCase().includes(q),
    )
  }, [employees, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageData = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, page])

  const save = useMutation({
    mutationFn: () => {
      const payload = { ...form, email: form.email || null, phone: form.phone || null, login: modal.item?.login ?? null, tech_id: modal.item?.tech_id ?? null }
      return modal.item ? updateEmployee(modal.item.id, payload) : createEmployee(payload)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); closeModal() },
  })

  const remove = useMutation({
    mutationFn: deleteEmployee,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); setConfirmId(null) },
  })

  const openCreate = () => { setForm(emptyForm()); setLinkLabels({ st: null, gusto: null }); setModal({ open: true }) }
  const openEdit = (e: Employee) => {
    setForm({
      first_name: e.first_name, last_name: e.last_name, role_id: e.role_id ?? 0, pay_level: e.pay_level,
      hire_date: e.hire_date ?? '', email: e.email ?? '', phone: e.phone ?? '', is_active: e.is_active,
      gusto_id: e.gusto_id, service_titan_id: e.service_titan_id,
    })
    setLinkLabels({ st: null, gusto: null })
    if (e.service_titan_id) {
      fetchServiceTitanDirectory(e.service_titan_id).then(opts => {
        const match = opts.find(o => o.value === e.service_titan_id)
        if (match) setLinkLabels(l => ({ ...l, st: match.label }))
      })
    }
    if (e.gusto_id) {
      fetchGustoDirectory(e.gusto_id).then(opts => {
        const match = opts.find(o => o.value === e.gusto_id)
        if (match) setLinkLabels(l => ({ ...l, gusto: match.label }))
      })
    }
    setModal({ open: true, item: e })
  }
  const closeModal = () => setModal({ open: false })
  const set = (k: keyof FormData, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const selectedRole = roles.find(r => r.id === form.role_id)
  const maxLevel = selectedRole?.payRateLevels?.length ?? 7

  return (
    <>
      <Header title="Employees" subtitle="Manage company employees" />
      <div className="p-6">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                All Employees
                {filtered.length > 0 && <span className="ml-2 px-2 py-0.5 rounded-full bg-primary-50 text-primary-500 text-xs font-medium">{filtered.length}</span>}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Full list of company employees</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className="input-field pl-9 py-2 w-56 text-xs"
                  placeholder="Search by name, role..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1) }}
                />
              </div>
              <button onClick={() => refetch()} disabled={isFetching} className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50">
                <RefreshCw size={14} className={`text-gray-500 ${isFetching ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={openCreate} className="btn-primary flex items-center gap-2 h-9"><Plus size={14} /> Add</button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-14">ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Division / Role</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Level</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rate</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contacts</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Hired</th>
                  <th className="w-20 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {isLoading && [...Array(10)].map((_, i) => <SkeletonRow key={i} />)}
                {!isLoading && pageData.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-gray-400">
                    {search ? 'Nothing found' : 'No employees'}
                  </td></tr>
                )}
                {!isLoading && pageData.map(emp => {
                  const rate = emp.role?.payRateLevels?.find(l => l.level === emp.pay_level)
                  return (
                    <tr key={emp.id} onClick={() => navigate(`/employees/${emp.id}`)} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors group cursor-pointer">
                      <td className="px-4 py-3 text-xs font-mono text-gray-400">#{emp.id}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500/20 to-purple-500/20 flex items-center justify-center text-primary-500 text-xs font-semibold flex-shrink-0">
                            {emp.first_name.charAt(0)}{emp.last_name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium text-gray-900">{emp.first_name} {emp.last_name}</p>
                              {emp.service_titan_id && <Wrench size={11} className="text-blue-400" />}
                              {emp.gusto_id && <Wallet size={11} className="text-emerald-500" />}
                              {emp.tech_id && <HardHat size={11} className="text-amber-500" />}
                            </div>
                            {emp.email && <p className="text-xs text-gray-400 truncate max-w-[140px]">{emp.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-900">{emp.role?.title || '—'}</p>
                        <p className="text-xs text-gray-400">{emp.role?.division?.name || '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">Lv{emp.pay_level}</span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                        {rate ? `$${Number(rate.hourly_rate).toFixed(2)}/h` : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {emp.phone || emp.email
                          ? <div>{emp.phone && <div>{emp.phone}</div>}{emp.email && <div className="truncate max-w-[120px]">{emp.email}</div>}</div>
                          : <span className="text-gray-300">—</span>
                        }
                      </td>
                      <td className="px-4 py-3"><StatusBadge active={emp.is_active} /></td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {emp.hire_date ? new Date(emp.hire_date).toLocaleDateString('ru-RU') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                          <button onClick={e => { e.stopPropagation(); openEdit(emp) }} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-primary-50 text-gray-400 hover:text-primary-500"><Pencil size={13} /></button>
                          <button onClick={e => { e.stopPropagation(); setConfirmId(emp.id) }} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 size={13} /></button>
                          <ViewIcon size={14} className="text-gray-300" />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              {filtered.length > 0 ? `${Math.min((page-1)*PAGE_SIZE+1, filtered.length)}–${Math.min(page*PAGE_SIZE, filtered.length)} of ${filtered.length}` : 'No data'}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-200 hover:bg-gray-50 disabled:opacity-40">
                <ChevronLeft size={14} className="text-gray-600" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i+1).slice(Math.max(0,page-3), page+2).map(p => (
                <button key={p} onClick={() => setPage(p)} className={`w-7 h-7 flex items-center justify-center rounded-md text-xs font-medium ${p===page ? 'bg-primary-500 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{p}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages} className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-200 hover:bg-gray-50 disabled:opacity-40">
                <ChevronRight size={14} className="text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <Modal open={modal.open} onClose={closeModal} title={modal.item ? 'Edit Employee' : 'New Employee'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">First name <span className="text-red-500">*</span></label>
              <input autoFocus className="input-field" placeholder="James" value={form.first_name} onChange={e => set('first_name', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Last name <span className="text-red-500">*</span></label>
              <input className="input-field" placeholder="Mitchell" value={form.last_name} onChange={e => set('last_name', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Role <span className="text-red-500">*</span></label>
            <select className="input-field" value={form.role_id} onChange={e => set('role_id', +e.target.value)}>
              <option value={0} disabled>Select role</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.division?.name} — {r.title}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
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
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Hire date <span className="text-red-500">*</span></label>
              <input className="input-field" type="date" value={form.hire_date} onChange={e => set('hire_date', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Email</label>
              <input className="input-field" type="email" placeholder="j.mitchell@company.com" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Phone</label>
              <input className="input-field" type="tel" placeholder="555-0101" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="rounded border-gray-300 text-primary-500 focus:ring-primary-500" />
            <span className="text-sm text-gray-700">Active employee</span>
          </label>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">External systems</p>
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
            </div>
          </div>
          {save.isError && (
            <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">
              Save error. Please check the data.
            </p>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
            <button onClick={() => save.mutate()} disabled={!form.first_name || !form.last_name || !form.role_id || save.isPending} className="btn-primary flex-1 disabled:opacity-50">
              {save.isPending ? 'Saving...' : modal.item ? 'Save' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmId !== null}
        onClose={() => setConfirmId(null)}
        onConfirm={() => confirmId !== null && remove.mutate(confirmId)}
        message="Remove this employee from the system?"
        loading={remove.isPending}
      />
    </>
  )
}
