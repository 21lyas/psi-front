import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Percent, DollarSign, ToggleLeft, ToggleRight } from 'lucide-react'
import Header from '../components/Layout/Header'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { fetchRoleBonusConfigs, createRoleBonusConfig, updateRoleBonusConfig, deleteRoleBonusConfig } from '../api/endpoints/roleBonusConfigs'
import { fetchRoles } from '../api/endpoints/roles'
import { fetchBonusTypes } from '../api/endpoints/bonusTypes'
import type { RoleBonusConfig } from '../types/roleBonusConfig'

export default function RoleBonusConfigsPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [filterRole, setFilterRole] = useState<number | undefined>(undefined)
  const [form, setForm] = useState({ role_id: 0, bonus_type_id: 0, is_enabled: true, max_percentage: '', fixed_amount: '' })

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['roleBonusConfigs', filterRole], queryFn: () => fetchRoleBonusConfigs(filterRole),
  })
  const { data: roles = [] } = useQuery({ queryKey: ['roles'], queryFn: () => fetchRoles() })
  const { data: bonusTypes = [] } = useQuery({ queryKey: ['bonusTypes'], queryFn: fetchBonusTypes })

  const save = useMutation({
    mutationFn: () => createRoleBonusConfig({
      role_id: form.role_id, bonus_type_id: form.bonus_type_id, is_enabled: form.is_enabled,
      max_percentage: form.max_percentage ? +form.max_percentage : null,
      fixed_amount: form.fixed_amount ? +form.fixed_amount : null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roleBonusConfigs'] }); setModal(false) },
  })

  const toggle = useMutation({
    mutationFn: ({ id, is_enabled }: { id: number; is_enabled: boolean }) => updateRoleBonusConfig(id, { is_enabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roleBonusConfigs'] }),
  })

  const remove = useMutation({
    mutationFn: deleteRoleBonusConfig,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roleBonusConfigs'] }); setConfirmId(null) },
  })

  const openCreate = () => {
    setForm({ role_id: 0, bonus_type_id: 0, is_enabled: true, max_percentage: '', fixed_amount: '' })
    setModal(true)
  }
  const set = (k: keyof typeof form, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  return (
    <>
      <Header title="Role Bonus Configs" subtitle="Configure bonus programs for each role" />
      <div className="p-6">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Bonus Configurations
                {configs.length > 0 && <span className="ml-2 px-2 py-0.5 rounded-full bg-primary-50 text-primary-500 text-xs font-medium">{configs.length}</span>}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Linking bonuses to roles</p>
            </div>
            <div className="flex items-center gap-2">
              <select className="input-field py-2 text-xs w-52" value={filterRole ?? ''} onChange={e => setFilterRole(e.target.value ? +e.target.value : undefined)}>
                <option value="">All roles</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.division?.name} — {r.title}</option>)}
              </select>
              <button onClick={openCreate} className="btn-primary flex items-center gap-2 h-9"><Plus size={14} /> Add</button>
            </div>
          </div>

          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Bonus Type</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Max %</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fixed Amount</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="w-16 px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading && [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-gray-50">
                  {[...Array(6)].map((__, j) => <td key={j} className="px-5 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>)}
                </tr>
              ))}
              {!isLoading && configs.map((cfg: RoleBonusConfig) => (
                <tr key={cfg.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors group">
                  <td className="px-5 py-3">
                    <p className="text-sm font-medium text-gray-900">{cfg.role?.title || '—'}</p>
                    <p className="text-xs text-gray-400">{(cfg.role as unknown as { division?: { name: string } })?.division?.name || '—'}</p>
                  </td>
                  <td className="px-5 py-3">
                    <div>
                      <p className="text-sm text-gray-900">{cfg.bonusType?.name || '—'}</p>
                      {cfg.bonusType?.percentage != null && (
                        <span className="inline-flex items-center gap-0.5 text-xs text-emerald-600">
                          <Percent size={9} />{(cfg.bonusType.percentage * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {cfg.max_percentage != null
                      ? <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-xs font-medium"><Percent size={9} />{(cfg.max_percentage * 100).toFixed(0)}%</span>
                      : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-5 py-3">
                    {cfg.fixed_amount != null
                      ? <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-xs font-medium"><DollarSign size={9} />{Number(cfg.fixed_amount).toLocaleString()}</span>
                      : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-5 py-3">
                    <button onClick={() => toggle.mutate({ id: cfg.id, is_enabled: !cfg.is_enabled })} className="text-gray-400 hover:text-primary-500 transition-colors">
                      {cfg.is_enabled
                        ? <ToggleRight size={20} className="text-primary-500" />
                        : <ToggleLeft size={20} />}
                    </button>
                  </td>
                  <td className="px-5 py-3">
                    <button onClick={() => setConfirmId(cfg.id)} className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoading && configs.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">No configurations</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Add Bonus to Role" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Role <span className="text-red-500">*</span></label>
            <select className="input-field" value={form.role_id} onChange={e => set('role_id', +e.target.value)}>
              <option value={0} disabled>Select role</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.division?.name} — {r.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Bonus Type <span className="text-red-500">*</span></label>
            <select className="input-field" value={form.bonus_type_id} onChange={e => set('bonus_type_id', +e.target.value)}>
              <option value={0} disabled>Select bonus</option>
              {bonusTypes.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Max % (0.12 = 12%)</label>
              <input className="input-field" type="number" step="0.01" placeholder="0.03" value={form.max_percentage} onChange={e => set('max_percentage', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Fixed Amount ($)</label>
              <input className="input-field" type="number" placeholder="2000" value={form.fixed_amount} onChange={e => set('fixed_amount', e.target.value)} />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_enabled} onChange={e => set('is_enabled', e.target.checked)} className="rounded border-gray-300 text-primary-500" />
            <span className="text-sm text-gray-700">Enabled</span>
          </label>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={() => save.mutate()} disabled={!form.role_id || !form.bonus_type_id || save.isPending} className="btn-primary flex-1 disabled:opacity-50">
              {save.isPending ? 'Saving...' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmId !== null}
        onClose={() => setConfirmId(null)}
        onConfirm={() => confirmId !== null && remove.mutate(confirmId)}
        message="Delete this bonus configuration?"
        loading={remove.isPending}
      />
    </>
  )
}
