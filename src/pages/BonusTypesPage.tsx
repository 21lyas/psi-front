import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Percent } from 'lucide-react'
import Header from '../components/Layout/Header'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { fetchBonusTypes, createBonusType, updateBonusType, deleteBonusType } from '../api/endpoints/bonusTypes'
import type { BonusType } from '../types/bonusType'

const empty = (): Omit<BonusType, 'id'> => ({ code: '', name: '', formula: null, description: null, percentage: null })

export default function BonusTypesPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState<{ open: boolean; item?: BonusType }>({ open: false })
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [form, setForm] = useState(empty())

  const { data = [], isLoading } = useQuery({ queryKey: ['bonusTypes'], queryFn: fetchBonusTypes })

  const save = useMutation({
    mutationFn: () => modal.item ? updateBonusType(modal.item.id, form) : createBonusType(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bonusTypes'] }); closeModal() },
  })

  const remove = useMutation({
    mutationFn: deleteBonusType,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bonusTypes'] }); setConfirmId(null) },
  })

  const openCreate = () => { setForm(empty()); setModal({ open: true }) }
  const openEdit = (item: BonusType) => { setForm({ code: item.code, name: item.name, formula: item.formula, description: item.description, percentage: item.percentage }); setModal({ open: true, item }) }
  const closeModal = () => setModal({ open: false })
  const set = (k: keyof typeof form, v: string | number | null) => setForm(f => ({ ...f, [k]: v }))

  return (
    <>
      <Header title="Bonus Types" subtitle="Bonus programs reference" />
      <div className="p-6">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Bonuses
                {data.length > 0 && <span className="ml-2 px-2 py-0.5 rounded-full bg-primary-50 text-primary-500 text-xs font-medium">{data.length}</span>}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Bonus formulas and accrual rules</p>
            </div>
            <button onClick={openCreate} className="btn-primary flex items-center gap-2"><Plus size={14} /> Add</button>
          </div>

          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Code</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Formula</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">%</th>
                <th className="w-20 px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading && [...Array(4)].map((_, i) => (
                <tr key={i} className="border-b border-gray-50">
                  {[...Array(5)].map((__, j) => <td key={j} className="px-5 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>)}
                </tr>
              ))}
              {!isLoading && data.map(bt => (
                <tr key={bt.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors group">
                  <td className="px-5 py-3">
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs font-mono">{bt.code}</span>
                  </td>
                  <td className="px-5 py-3 text-sm font-medium text-gray-900">{bt.name}</td>
                  <td className="px-5 py-3 text-sm text-gray-500 max-w-xs truncate">{bt.formula || '—'}</td>
                  <td className="px-5 py-3">
                    {bt.percentage != null ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">
                        <Percent size={10} />{(bt.percentage * 100).toFixed(0)}%
                      </span>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                      <button onClick={() => openEdit(bt)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-primary-50 text-gray-400 hover:text-primary-500 transition-colors"><Pencil size={13} /></button>
                      <button onClick={() => setConfirmId(bt.id)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal.open} onClose={closeModal} title={modal.item ? 'Edit Bonus Type' : 'New Bonus Type'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Code <span className="text-red-500">*</span></label>
              <input className="input-field" placeholder="lead_referral" value={form.code} onChange={e => set('code', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Name <span className="text-red-500">*</span></label>
              <input className="input-field" placeholder="Lead Referral Bonus" value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Formula</label>
            <input className="input-field" placeholder="Job Revenue × 2%" value={form.formula ?? ''} onChange={e => set('formula', e.target.value || null)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Description</label>
            <textarea className="input-field resize-none" rows={3} placeholder="Describe the bonus conditions" value={form.description ?? ''} onChange={e => set('description', e.target.value || null)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Base percentage (0.02 = 2%)</label>
            <input className="input-field" type="number" step="0.001" placeholder="0.02" value={form.percentage ?? ''} onChange={e => set('percentage', e.target.value ? +e.target.value : null)} />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
            <button onClick={() => save.mutate()} disabled={!form.code || !form.name || save.isPending} className="btn-primary flex-1 disabled:opacity-50">
              {save.isPending ? 'Saving...' : modal.item ? 'Save' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmId !== null}
        onClose={() => setConfirmId(null)}
        onConfirm={() => confirmId !== null && remove.mutate(confirmId)}
        message="Delete this bonus type?"
        loading={remove.isPending}
      />
    </>
  )
}
