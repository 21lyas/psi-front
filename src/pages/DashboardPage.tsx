import { useQuery } from '@tanstack/react-query'
import { Users, UserCheck, UserX, Building2, Briefcase, TrendingUp } from 'lucide-react'
import { fetchAllEmployees } from '../api/endpoints/employees'
import { fetchDivisions } from '../api/endpoints/divisions'
import { fetchRoles } from '../api/endpoints/roles'
import Header from '../components/Layout/Header'
import type { Employee } from '../types/employee'

function StatCard({ icon: Icon, label, value, color, sub }: { icon: React.ElementType; label: string; value: number | string; color: string; sub?: string }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-400 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-300 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { data: employees = [], isLoading } = useQuery({ queryKey: ['employees'], queryFn: fetchAllEmployees })
  const { data: divisions = [] } = useQuery({ queryKey: ['divisions'], queryFn: fetchDivisions })
  const { data: roles = [] } = useQuery({ queryKey: ['roles'], queryFn: () => fetchRoles() })

  const total = employees.length
  const active = employees.filter((e: Employee) => e.is_active).length
  const inactive = total - active

  const byDivision = divisions.map(d => ({
    ...d,
    count: employees.filter(e => e.role?.division?.name === d.name && e.is_active).length,
  })).sort((a, b) => b.count - a.count).slice(0, 5)

  return (
    <>
      <Header title="Dashboard" subtitle="System overview" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard icon={Users} label="Total Employees" value={isLoading ? '...' : total} color="bg-primary-500" />
          <StatCard icon={UserCheck} label="Active" value={isLoading ? '...' : active} color="bg-emerald-500" />
          <StatCard icon={UserX} label="Inactive" value={isLoading ? '...' : inactive} color="bg-gray-400" />
          <StatCard icon={Building2} label="Divisions" value={divisions.length} color="bg-purple-500" />
          <StatCard icon={Briefcase} label="Roles" value={roles.length} color="bg-amber-500" />
          <StatCard icon={TrendingUp} label="Activity" value={total ? `${Math.round(active / total * 100)}%` : '—'} color="bg-rose-500" sub="of total employees" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card p-5">
            <p className="text-sm font-semibold text-gray-900 mb-4">Employees by Division</p>
            {isLoading ? (
              <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />)}</div>
            ) : byDivision.length > 0 ? (
              <div className="space-y-2">
                {byDivision.map(d => (
                  <div key={d.id} className="flex items-center gap-3">
                    <p className="text-xs text-gray-600 w-44 truncate flex-shrink-0">{d.name}</p>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-primary-500 h-2 rounded-full transition-all"
                        style={{ width: active > 0 ? `${(d.count / active) * 100}%` : '0%' }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-700 w-6 text-right">{d.count}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-gray-400">No data</p>}
          </div>

          <div className="card p-5">
            <p className="text-sm font-semibold text-gray-900 mb-4">Recently Added Employees</p>
            {isLoading ? (
              <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}</div>
            ) : (
              <div className="space-y-2">
                {[...employees].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 6).map(e => (
                  <div key={e.id} className="flex items-center gap-3 py-1">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500/20 to-purple-500/20 flex items-center justify-center text-primary-500 text-xs font-semibold flex-shrink-0">
                      {e.first_name.charAt(0)}{e.last_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">{e.first_name} {e.last_name}</p>
                      <p className="text-xs text-gray-400 truncate">{e.role?.title}</p>
                    </div>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${e.is_active ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
