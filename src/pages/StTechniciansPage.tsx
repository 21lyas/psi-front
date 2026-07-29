import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Search, Pencil, Check, X, HardHat, ChevronRight } from 'lucide-react'
import {
  fetchStEmployees,
  upsertStEmployee,
  type StEmployee,
  type UpsertStEmployeeDto,
} from '../api/endpoints/stEmployees'

const displayName = (e: StEmployee) => e.gusto_name || e.label || null

export default function StTechniciansPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data = [], isLoading } = useQuery({
    queryKey: ['st-employees'],
    queryFn: fetchStEmployees,
  })

  const mutation = useMutation({
    mutationFn: ({ techId, dto }: { techId: string; dto: UpsertStEmployeeDto }) =>
      upsertStEmployee(techId, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['st-employees'] }),
  })

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'named' | 'unnamed'>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Record<string, Partial<UpsertStEmployeeDto>>>({})

  const filtered = data.filter(e => {
    const name = displayName(e) ?? ''
    const matchSearch = !search ||
      name.toLowerCase().includes(search.toLowerCase()) ||
      e.tech_id.includes(search)
    const matchFilter =
      filter === 'all' ||
      (filter === 'named' && !!e.gusto_name) ||
      (filter === 'unnamed' && !e.gusto_name)
    return matchSearch && matchFilter
  })

  const named = data.filter(e => !!e.gusto_name).length

  const startEdit = (e: StEmployee, ev: React.MouseEvent) => {
    ev.stopPropagation()
    setEditingId(e.tech_id)
    setEditing(prev => ({
      ...prev,
      [e.tech_id]: {
        gusto_name: e.gusto_name ?? '',
        department: e.department ?? '',
        hourly_rate: e.hourly_rate ?? undefined,
      },
    }))
  }

  const cancelEdit = (techId: string, ev: React.MouseEvent) => {
    ev.stopPropagation()
    setEditingId(null)
    setEditing(prev => { const n = { ...prev }; delete n[techId]; return n })
  }

  const saveEdit = (techId: string, ev: React.MouseEvent) => {
    ev.stopPropagation()
    const dto = editing[techId] ?? {}
    mutation.mutate({
      techId,
      dto: {
        gusto_name: dto.gusto_name || null,
        department: dto.department || null,
        hourly_rate: dto.hourly_rate != null ? Number(dto.hourly_rate) : null,
      },
    }, {
      onSuccess: () => {
        setEditingId(null)
        setEditing(prev => { const n = { ...prev }; delete n[techId]; return n })
      }
    })
  }

  const updateField = (techId: string, field: keyof UpsertStEmployeeDto, value: string) =>
    setEditing(prev => ({ ...prev, [techId]: { ...prev[techId], [field]: value } }))

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <HardHat size={20} className="text-primary-400" />
          Technicians
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          {data.length} total · {named} named · click a row to view jobs
        </p>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-56">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            className="w-full pl-8 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
            placeholder="Search by name or tech ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1">
          {(['all', 'named', 'unnamed'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f ? 'bg-primary-500 text-white' : 'bg-white/5 text-gray-400 hover:text-white'
              }`}>
              {f === 'all' ? 'All' : f === 'named' ? 'Named' : 'No name'}
            </button>
          ))}
        </div>
        <span className="text-gray-500 text-sm">{filtered.length} shown</span>
      </div>

      {isLoading ? (
        <div className="text-gray-500 text-center py-16">Loading…</div>
      ) : (
        <div className="bg-white/3 border border-white/8 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-gray-400 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3">Tech ID</th>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Department</th>
                <th className="text-right px-4 py-3">Rate $/h</th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(e => {
                const isEdit = editingId === e.tech_id
                const vals = editing[e.tech_id] ?? {}
                return (
                  <tr
                    key={e.tech_id}
                    onClick={() => !isEdit && navigate(`/technicians/${e.tech_id}`)}
                    className={`transition-colors ${
                      isEdit
                        ? 'bg-white/5'
                        : e.gusto_name
                          ? 'bg-primary-500/5 hover:bg-primary-500/10 cursor-pointer'
                          : 'hover:bg-white/3 cursor-pointer'
                    }`}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{e.tech_id}</td>

                    {isEdit ? (
                      <>
                        <td className="px-2 py-2">
                          <input
                            autoFocus
                            className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-sm text-white focus:outline-none focus:border-primary-500"
                            placeholder="Full name"
                            value={vals.gusto_name ?? ''}
                            onChange={ev => updateField(e.tech_id, 'gusto_name', ev.target.value)}
                            onClick={ev => ev.stopPropagation()}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-sm text-white focus:outline-none focus:border-primary-500"
                            placeholder="Department"
                            value={vals.department ?? ''}
                            onChange={ev => updateField(e.tech_id, 'department', ev.target.value)}
                            onClick={ev => ev.stopPropagation()}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            className="w-24 ml-auto block px-2 py-1 bg-white/10 border border-white/20 rounded text-sm text-white text-right focus:outline-none focus:border-primary-500"
                            placeholder="0"
                            value={vals.hourly_rate ?? ''}
                            onChange={ev => updateField(e.tech_id, 'hourly_rate', ev.target.value)}
                            onClick={ev => ev.stopPropagation()}
                          />
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3">
                          {e.gusto_name
                            ? <span className="text-white font-medium">{e.gusto_name}</span>
                            : e.label && e.label !== e.tech_id
                              ? <span className="text-gray-300">{e.label}</span>
                              : <span className="text-gray-600 italic text-xs">no name</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-sm">
                          {e.department ?? <span className="text-gray-600">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-300">
                          {e.hourly_rate != null ? `$${e.hourly_rate}` : <span className="text-gray-600">—</span>}
                        </td>
                      </>
                    )}

                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end items-center">
                        {isEdit ? (
                          <>
                            <button onClick={ev => saveEdit(e.tech_id, ev)} disabled={mutation.isPending}
                              className="p-1.5 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors">
                              <Check size={14} />
                            </button>
                            <button onClick={ev => cancelEdit(e.tech_id, ev)}
                              className="p-1.5 rounded bg-white/5 text-gray-400 hover:text-white transition-colors">
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={ev => startEdit(e, ev)}
                              className="p-1.5 rounded text-gray-600 hover:text-primary-400 hover:bg-primary-400/10 transition-colors">
                              <Pencil size={14} />
                            </button>
                            <ChevronRight size={14} className="text-gray-700" />
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
