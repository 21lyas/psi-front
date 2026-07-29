import { instance } from '../instance'

export interface StTechnician {
  tech_id: string
  tech_name: string
  invoice_count: number
  total_revenue: number
  avg_invoice: number
  total_sold_hours: number
  first_date: string
  last_date: string
  business_units: string
}

export interface StJob {
  invoice_id: string
  invoice_date: string
  invoice_total: number
  job_id: string
  job_number: string
  job_status: string
  business_unit: string
  item_types: string
  service_count: number
  material_count: number
  equipment_count: number
  items_subtotal: number
  sold_hours: number
  default_rate: number | null
  rate: number | null
  hours: number
  pay: number | null
  rate_is_override: boolean
  hours_is_override: boolean
}

export interface StTechStats {
  techId: string
  techName: string
  workingDays: number
  period: { from: string; to: string }
  summary: { jobCount: number; totalRevenue: number; avgJobRevenue: number; totalSoldHours: number }
  byBusinessUnit: { name: string; count: number; revenue: number }[]
  jobs: StJob[]
}

export const fetchStTechnicians = (from?: string, to?: string): Promise<StTechnician[]> =>
  instance.get('/st/technicians', { params: { from, to } }).then(r => r.data)

export const fetchStTechStats = (techId: string, from: string, to: string): Promise<StTechStats> =>
  instance.get(`/st/technicians/${techId}/stats`, { params: { from, to } }).then(r => r.data)

// Persisted ST technician ↔ Gusto employee mapping (test.employees on the server)
export interface StEmployee {
  id: number
  tech_id: string
  label: string | null
  gusto_uuid: string | null
  gusto_name: string | null
  department: string | null
  hourly_rate: number | null
}

export const fetchStEmployees = (): Promise<StEmployee[]> =>
  instance.get('/st-employees').then(r => r.data)

export const upsertStEmployee = (
  techId: string,
  dto: Partial<Pick<StEmployee, 'label' | 'gusto_uuid' | 'gusto_name' | 'department' | 'hourly_rate'>>,
): Promise<StEmployee> =>
  instance.put(`/st-employees/${techId}`, dto).then(r => r.data)

export const deleteStEmployee = (techId: string): Promise<void> =>
  instance.delete(`/st-employees/${techId}`).then(() => undefined)

// Per-invoice rate/hours override (test.invoice_rates)
export const setInvoiceRate = (
  techId: string,
  invoiceId: string,
  dto: { rate?: number | null; hours?: number | null },
) => instance.put(`/st-employees/${techId}/invoice-rates/${invoiceId}`, dto).then(r => r.data)
