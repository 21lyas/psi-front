import { instance } from '../instance'

export interface StEmployee {
  id: number
  tech_id: string
  label: string | null
  gusto_name: string | null
  department: string | null
  hourly_rate: number | null
}

export interface StEmployeeWithStats extends StEmployee {
  recent_invoices: number
  last_invoice: string | null
}

export interface UpsertStEmployeeDto {
  label?: string | null
  gusto_name?: string | null
  department?: string | null
  hourly_rate?: number | null
}

export const fetchStEmployees = (): Promise<StEmployee[]> =>
  instance.get('/st-employees').then(r => r.data)

export const fetchStEmployee = (techId: string): Promise<StEmployee> =>
  instance.get(`/st-employees/${techId}`).then(r => r.data)

export const fetchStEmployeesWithStats = (): Promise<StEmployeeWithStats[]> =>
  instance.get('/st-employees/stats').then(r => r.data)

export const upsertStEmployee = (techId: string, dto: UpsertStEmployeeDto): Promise<StEmployee> =>
  instance.put(`/st-employees/${techId}`, dto).then(r => r.data)

export const deleteStEmployee = (techId: string): Promise<void> =>
  instance.delete(`/st-employees/${techId}`).then(r => r.data)
