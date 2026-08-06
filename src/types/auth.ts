export interface AuthUser {
  sub: number
  login: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  is_active: boolean
  role_id: number | null
  system_role_id: number | null
  systemRole: { id: number; name: string } | null
  tech_id: string | null
  service_titan_id: string | null
  gusto_id: string | null
}
