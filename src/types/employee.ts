import type { Role } from './role'

export interface Employee {
  id: number
  first_name: string
  last_name: string
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
  created_at: string
  updated_at: string
  role?: Role & { division?: { id: number; name: string } }
}
