import type { Role } from './role'

export interface SystemRole {
  id: number
  name: string
}

export interface Employee {
  id: number
  first_name: string | null
  last_name: string | null
  role_id: number | null
  pay_level: number
  hire_date: string | null
  email: string | null
  phone: string | null
  login: string | null
  is_active: boolean
  gusto_id: string | null
  service_titan_id: string | null
  tech_id: string | null
  system_role_id: number | null
  // Mirrored from psi.st_employees
  label: string | null
  gusto_uuid: string | null
  gusto_name: string | null
  department: string | null
  hourly_rate: number | null
  created_at: string
  updated_at: string
  role?: Role & { division?: { id: number; name: string } }
  systemRole?: SystemRole | null
}
