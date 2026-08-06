import { instance } from '../instance'
import type { Employee } from '../../types/employee'
import type { LinkOption } from '../../components/ui/EntityLinkPicker'

export const fetchAllEmployees = () => instance.get<Employee[]>('/employees').then(r => r.data)
export const fetchEmployeeById = (id: number) => instance.get<Employee>(`/employees/${id}`).then(r => r.data)

export const createEmployee = (data: Partial<Omit<Employee, 'id' | 'created_at' | 'updated_at' | 'role' | 'systemRole'>>) =>
  instance.post<Employee>('/employees', data).then(r => r.data)

export const updateEmployee = (id: number, data: Partial<Omit<Employee, 'id' | 'created_at' | 'updated_at' | 'role' | 'systemRole'>>) =>
  instance.patch<Employee>(`/employees/${id}`, data).then(r => r.data)

export const deleteEmployee = (id: number) => instance.delete(`/employees/${id}`)

interface ServiceTitanDirectoryEntry {
  id: string
  name: string | null
  email: string | null
  role: string | null
  active: boolean | null
}

interface GustoDirectoryEntry {
  uuid: string
  first_name: string | null
  last_name: string | null
  email: string | null
  department: string | null
  terminated: boolean | null
}

export const fetchServiceTitanDirectory = async (search: string): Promise<LinkOption[]> => {
  const { data } = await instance.get<ServiceTitanDirectoryEntry[]>('/employees/directory/servicetitan', { params: { search } })
  return data.map(e => ({ value: e.id, label: e.name || `#${e.id}`, sublabel: [e.email, e.role].filter(Boolean).join(' · '), disabled: e.active === false }))
}

export const fetchGustoDirectory = async (search: string): Promise<LinkOption[]> => {
  const { data } = await instance.get<GustoDirectoryEntry[]>('/employees/directory/gusto', { params: { search } })
  return data.map(e => ({
    value: e.uuid,
    label: [e.first_name, e.last_name].filter(Boolean).join(' ') || e.uuid,
    sublabel: [e.email, e.department, e.terminated ? 'Terminated' : null].filter(Boolean).join(' · '),
  }))
}

interface TechnicianDirectoryEntry {
  tech_id: string
  label: string | null
  gusto_name: string | null
  department: string | null
}

export const fetchTechnicianDirectory = async (search: string): Promise<LinkOption[]> => {
  const { data } = await instance.get<TechnicianDirectoryEntry[]>('/employees/directory/technicians', { params: { search } })
  return data.map(e => ({
    value: e.tech_id,
    label: e.gusto_name || e.label || `Tech #${e.tech_id}`,
    sublabel: e.department ?? undefined,
  }))
}
