import { instance } from '../instance'

export type WorkEntryStatus = 'pending' | 'confirmed' | 'adjusted' | 'admin_approved' | 'admin_rejected'
export type DataSource = 'appointments' | 'invoices'

// Unified calendar item — shape differs slightly depending on source
export interface CalendarItem {
  source: DataSource
  // Appointment-based
  appointment_id?: string
  scheduled_start?: string   // ISO datetime e.g. "2026-07-02T14:00:00Z"
  scheduled_end?: string
  appointment_status?: string
  special_instructions?: string | null
  // Invoice-based
  invoice_id?: string
  invoice_date?: string | null
  // Common
  job_id: string | null
  job_number: string | null
  job_status: string
  job_summary?: string | null
  business_unit: string
  scheduled_hours: number
  invoice_total: number | null
  default_rate: number | null
  st_url: string | null
  // Work entry
  entry_id: number | null
  actual_hours: number | null
  hourly_rate: number | null
  pay_amount: number | null
  status: WorkEntryStatus
  employee_note: string | null
  admin_note: string | null
  // ServiceTitan on-site reference (informational)
  st_arrived_on?: string | null
  st_completed_on?: string | null
  // Employee-reported clock in/out + breaks
  clock_in: string | null
  clock_out: string | null
  lunch_break_start: string | null
  lunch_break_minutes: number
  rest_break_start: string | null
  rest_break_minutes: number
}

export interface WorkEntry {
  id: number
  employee_id: number
  tech_id: string | null
  tech_name: string | null
  department: string | null
  appointment_id: string | null
  invoice_id: string | null
  invoice_date: string | null
  job_id: string | null
  job_number: string | null
  business_unit: string | null
  job_status: string | null
  invoice_total: number | null
  scheduled_start: string | null
  scheduled_end: string | null
  scheduled_hours: number | null
  actual_hours: number | null
  hourly_rate: number | null
  pay_amount: number | null
  status: WorkEntryStatus
  employee_note: string | null
  admin_note: string | null
  st_url: string | null
  clock_in: string | null
  clock_out: string | null
  lunch_break_start: string | null
  lunch_break_minutes: number
  rest_break_start: string | null
  rest_break_minutes: number
  st_arrived_on: string | null
  st_completed_on: string | null
  created_at: string
  updated_at: string
}

export interface EmployeeSummary {
  tech_id: string
  tech_name: string | null
  department: string | null
  total_jobs: number
  pending: number
  confirmed: number
  adjusted: number
  approved: number
  rejected: number
  total_scheduled_hours: number
  total_actual_hours: number
  total_pay: number
}

export const fetchDataSource = (): Promise<{ source: DataSource; appointments_synced: boolean }> =>
  instance.get('/work-entries/source').then(r => r.data)

export const fetchEmployeeCalendar = (techId: string, from?: string, to?: string): Promise<CalendarItem[]> =>
  instance.get(`/work-entries/employee/${techId}/calendar`, { params: { from, to } }).then(r => r.data)

export const confirmEntry = (techId: string, jobKey: string, employee_note?: string): Promise<WorkEntry> =>
  instance.post(`/work-entries/employee/${techId}/confirm/${jobKey}`, { employee_note }).then(r => r.data)

export const adjustEntry = (techId: string, jobKey: string, actual_hours: number, employee_note?: string): Promise<WorkEntry> =>
  instance.post(`/work-entries/employee/${techId}/adjust/${jobKey}`, { actual_hours, employee_note }).then(r => r.data)

export interface LogTimePayload {
  clock_in: string
  clock_out: string
  lunch_break_start?: string
  lunch_break_minutes?: number
  rest_break_start?: string
  rest_break_minutes?: number
  employee_note?: string
}

export const logTime = (techId: string, jobKey: string, payload: LogTimePayload): Promise<WorkEntry> =>
  instance.post(`/work-entries/employee/${techId}/log-time/${jobKey}`, payload).then(r => r.data)

export const fetchAdminEntries = (from?: string, to?: string, status?: string, techId?: string): Promise<WorkEntry[]> =>
  instance.get('/work-entries/admin', { params: { from, to, status, techId } }).then(r => r.data)

export const fetchAdminSummary = (from?: string, to?: string): Promise<EmployeeSummary[]> =>
  instance.get('/work-entries/admin/summary', { params: { from, to } }).then(r => r.data)

export const adminReviewEntry = (id: number, status: 'admin_approved' | 'admin_rejected', admin_note?: string): Promise<WorkEntry> =>
  instance.patch(`/work-entries/admin/${id}/review`, { status, admin_note }).then(r => r.data)
