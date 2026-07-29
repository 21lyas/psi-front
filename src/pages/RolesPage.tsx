import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, DollarSign } from 'lucide-react'
import Header from '../components/Layout/Header'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { fetchRoles, createRole, updateRole, deleteRole } from '../api/endpoints/roles'
import { fetchDivisions } from '../api/endpoints/divisions'
import { createPayRateLevel, updatePayRateLevel, deletePayRateLevel } from '../api/endpoints/payRateLevels'
import type { Role } from '../types/role'
import type { PayRateLevel } from '../types/payRateLevel'

const PAY_TYPES = ['hourly', 'hourly_bonus', 'fix', 'fix_bonus', 'commission', 'hourly_bonus_commission'] as const
const PAY_LABELS: Record<string, string> = {
  hourly: 'Hourly', hourly_bonus: 'Hourly + Bonus', fix: 'Fixed',
  fix_bonus: 'Fixed + Bonus', commission: 'Commission', hourly_bonus_commission: 'Hourly + Bonus + Commission',
}
const PAY_COLORS: Record<string, string> = {
  hourly: 'bg-blue-50 text-blue-700', hourly_bonus: 'bg-purple-50 text-purple-700',
  fix: 'bg-gray-100 text-gray-600', fix_bonus: 'bg-amber-50 text-amber-700',
  commission: 'bg-green-50 text-green-700', hourly_bonus_commission: 'bg-rose-50 text-rose-700',
}

const emptyRole = (): Omit<Role, 'id' | 'division' | 'payRateLevels' | 'bonusConfigs'> => ({
  division_id: 0, title: '', pay_type: 'hourly',
  cell_phone_reimbursement: 20, mileage_reimbursement: 0.725, has_additional_bonus_fix: true,
})

export default function RolesPage() {
  const qc = useQueryClient()
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [modal, setModal] = useState<{ open: boolean; item?: Role }>({ open: false })
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyRole())
  const [rateForm, setRateForm] = useState<{ role_id: number; level: number; hourly_rate: number } | null>(null)
  const [editRate, setEditRate] = useState<PayRateLevel | null>(null)

  const { data: roles = [], isLoading } = useQuery({ queryKey: ['roles'], queryFn: () => fetchRoles() })
  const { data: divisions = [] } = useQuery({ queryKey: ['divisions'], queryFn: fetchDivisions })

  const save = useMutation({
    mutationFn: () => modal.item ? updateRole(modal.item.id, form) : createRole(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); closeModal() },
  })

  const remove = useMutation({
    mutationFn: deleteRole,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); setConfirmId(null) },
  })

  const saveRate = useMutation({
    mutationFn: () => editRate
      ? updatePayRateLevel(editRate.id, { hourly_rate: rateForm!.hourly_rate })
      : createPayRateLevel(rateForm!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); setRateForm(null); setEditRate(null) },
  })

  const removeRate = useMutation({
    mutationFn: deletePayRateLevel,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }),
  })

  const openCreate = () => { setForm(emptyRole()); setModal({ open: true }) }
  const openEdit = (r: Role) => {
    setForm({ division_id: r.division_id, title: r.title, pay_type: r.pay_type, cell_phone_reimbursement: r.cell_phone_reimbursement, mileage_reimbursement: r.mileage_reimbursement, has_additional_bonus_fix: r.has_additional_bonus_fix })
    setModal({ open: true, item: r })
  }
  const closeModal = () => setModal({ open: false })
  const set = (k: keyof typeof form, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  return (
    <>
      <Header title="Roles" subtitle="Manage roles and pay rates" />
      <div className="p-6">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                All Roles
                {roles.length > 0 && <span className="ml-2 px-2 py-0.5 rounded-full bg-primary-50 text-primary-500 text-xs font-medium">{roles.length}</span>}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Expand a row to manage pay rates</p>
            </div>
            <button onClick={openCreate} className="btn-primary flex items-center gap-2"><Plus size={14} /> Add Role</button>
          </div>

          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="w-8 px-3 py-3" />
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Division / Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pay Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rates</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Mileage</th>
                <th className="w-20 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading && [...Array(6)].map((_, i) => (
                <tr key={i} className="border-b border-gray-50">
                  {[...Array(7)].map((__, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>)}
                </tr>
              ))}
              {!isLoading && roles.map(role => (
                <>
                  <tr
                    key={role.id}
                    className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors group cursor-pointer"
                    onClick={() => setExpandedId(expandedId === role.id ? null : role.id)}
                  >
                    <td className="px-3 py-3 text-center">
                      {expandedId === role.id ? <ChevronUp size={14} className="text-gray-400 mx-auto" /> : <ChevronDown size={14} className="text-gray-400 mx-auto" />}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{role.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{role.division?.name || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PAY_COLORS[role.pay_type] || 'bg-gray-100 text-gray-600'}`}>
                        {PAY_LABELS[role.pay_type] || role.pay_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{role.payRateLevels?.length ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">${role.cell_phone_reimbursement}/mo</td>
                    <td className="px-4 py-3 text-sm text-gray-500">${role.mileage_reimbursement}/mi</td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                        <button onClick={() => openEdit(role)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-primary-50 text-gray-400 hover:text-primary-500"><Pencil size={13} /></button>
                        <button onClick={() => setConfirmId(role.id)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>

                  {expandedId === role.id && (
                    <tr key={`exp-${role.id}`} className="bg-gray-50/80 border-b border-gray-100">
                      <td />
                      <td colSpan={6} className="px-4 py-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                            <DollarSign size={12} />Hourly rates by level
                          </p>
                          <button
                            onClick={() => { setEditRate(null); setRateForm({ role_id: role.id, level: (role.payRateLevels?.length ?? 0) + 1, hourly_rate: 0 }) }}
                            className="text-xs text-primary-500 hover:text-primary-600 flex items-center gap-1 font-medium"
                          >
                            <Plus size={11} /> Add level
                          </button>
                        </div>
                        {role.payRateLevels && role.payRateLevels.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {role.payRateLevels.map(lvl => (
                              <div key={lvl.id} className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs group/lvl">
                                <span className="font-medium text-gray-500">Lv{lvl.level}</span>
                                <span className="font-semibold text-gray-900">${Number(lvl.hourly_rate).toFixed(2)}/h</span>
                                <div className="flex gap-0.5 opacity-0 group-hover/lvl:opacity-100 transition-opacity ml-1">
                                  <button onClick={() => { setEditRate(lvl); setRateForm({ role_id: role.id, level: lvl.level, hourly_rate: lvl.hourly_rate }) }} className="hover:text-primary-500 text-gray-400"><Pencil size={10} /></button>
                                  <button onClick={() => removeRate.mutate(lvl.id)} className="hover:text-red-500 text-gray-400"><Trash2 size={10} /></button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : <p className="text-xs text-gray-400">No rates — add levels</p>}

                        {rateForm && rateForm.role_id === role.id && (
                          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200">
                            <div className="flex items-center gap-1.5">
                              <label className="text-xs text-gray-500">Level:</label>
                              <input type="number" min={1} max={7} className="input-field w-16 text-center py-1 text-xs" value={rateForm.level} onChange={e => setRateForm(f => f && ({ ...f, level: +e.target.value }))} />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <label className="text-xs text-gray-500">$/h:</label>
                              <input type="number" step="0.01" className="input-field w-24 py-1 text-xs" value={rateForm.hourly_rate} onChange={e => setRateForm(f => f && ({ ...f, hourly_rate: +e.target.value }))} />
                            </div>
                            <button onClick={() => saveRate.mutate()} disabled={saveRate.isPending} className="btn-primary py-1 px-3 text-xs disabled:opacity-50">
                              {saveRate.isPending ? '...' : 'Save'}
                            </button>
                            <button onClick={() => { setRateForm(null); setEditRate(null) }} className="btn-secondary py-1 px-3 text-xs">Cancel</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal.open} onClose={closeModal} title={modal.item ? 'Edit Role' : 'New Role'} size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Division <span className="text-red-500">*</span></label>
            <select className="input-field" value={form.division_id} onChange={e => set('division_id', +e.target.value)}>
              <option value={0} disabled>Select division</option>
              {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Role title <span className="text-red-500">*</span></label>
            <input className="input-field" placeholder="HVAC Installer" value={form.title} onChange={e => set('title', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Pay type <span className="text-red-500">*</span></label>
            <select className="input-field" value={form.pay_type} onChange={e => set('pay_type', e.target.value)}>
              {PAY_TYPES.map(t => <option key={t} value={t}>{PAY_LABELS[t]}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Phone/internet ($/mo)</label>
              <input className="input-field" type="number" value={form.cell_phone_reimbursement} onChange={e => set('cell_phone_reimbursement', +e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Mileage reimbursement ($/mi)</label>
              <input className="input-field" type="number" step="0.001" value={form.mileage_reimbursement} onChange={e => set('mileage_reimbursement', +e.target.value)} />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.has_additional_bonus_fix} onChange={e => set('has_additional_bonus_fix', e.target.checked)} className="rounded border-gray-300 text-primary-500 focus:ring-primary-500" />
            <span className="text-sm text-gray-700">Additional Bonus (Fix)</span>
          </label>
          <div className="flex gap-2 pt-1">
            <button onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
            <button onClick={() => save.mutate()} disabled={!form.title || !form.division_id || save.isPending} className="btn-primary flex-1 disabled:opacity-50">
              {save.isPending ? 'Saving...' : modal.item ? 'Save' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmId !== null}
        onClose={() => setConfirmId(null)}
        onConfirm={() => confirmId !== null && remove.mutate(confirmId)}
        message="Delete this role? All related data (rates, bonuses, employees) may be affected."
        loading={remove.isPending}
      />
    </>
  )
}
