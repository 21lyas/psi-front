import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import Header from '../components/Layout/Header'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { fetchDivisions, createDivision, updateDivision, deleteDivision } from '../api/endpoints/divisions'
import type { Division } from '../types/division'

export default function DivisionsPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState<{ open: boolean; item?: Division }>({ open: false })
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [name, setName] = useState('')

  const { data = [], isLoading } = useQuery({ queryKey: ['divisions'], queryFn: fetchDivisions })

  const save = useMutation({
    mutationFn: () => modal.item ? updateDivision(modal.item.id, { name }) : createDivision({ name }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['divisions'] }); closeModal() },
  })

  const remove = useMutation({
    mutationFn: (id: number) => deleteDivision(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['divisions'] }); setConfirmId(null) },
  })

  const openCreate = () => { setName(''); setModal({ open: true }) }
  const openEdit = (item: Division) => { setName(item.name); setModal({ open: true, item }) }
  const closeModal = () => setModal({ open: false })

  return (
    <>
      <Header title="Divisions" subtitle="Manage company divisions" />
      <div className="p-6">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Divisions
                {data.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-primary-50 text-primary-500 text-xs font-medium">{data.length}</span>
                )}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Company organizational structure</p>
            </div>
            <button onClick={openCreate} className="btn-primary flex items-center gap-2">
              <Plus size={14} /> Add Division
            </button>
          </div>

          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">ID</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="px-5 py-3"><div className="h-4 w-8 bg-gray-100 rounded animate-pulse" /></td>
                  <td className="px-5 py-3"><div className="h-4 w-48 bg-gray-100 rounded animate-pulse" /></td>
                  <td className="px-5 py-3" />
                </tr>
              ))}
              {!isLoading && data.map(div => (
                <tr key={div.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors group">
                  <td className="px-5 py-3 text-xs font-mono text-gray-400">#{div.id}</td>
                  <td className="px-5 py-3 text-sm font-medium text-gray-900">{div.name}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(div)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-primary-50 text-gray-400 hover:text-primary-500 transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => setConfirmId(div.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && data.length === 0 && (
                <tr><td colSpan={3} className="px-5 py-10 text-center text-sm text-gray-400">No divisions</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal.open} onClose={closeModal} title={modal.item ? 'Edit Division' : 'New Division'} size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Division name</label>
            <input
              autoFocus
              className="input-field"
              placeholder="e.g. HVAC Installation"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') save.mutate() }}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
            <button
              onClick={() => save.mutate()}
              disabled={!name.trim() || save.isPending}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              {save.isPending ? 'Saving...' : modal.item ? 'Save' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmId !== null}
        onClose={() => setConfirmId(null)}
        onConfirm={() => confirmId !== null && remove.mutate(confirmId)}
        message="Delete this division? All related roles may be affected."
        loading={remove.isPending}
      />
    </>
  )
}
