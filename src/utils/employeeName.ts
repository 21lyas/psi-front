import type { Employee } from '../types/employee'

type NameSource = Pick<Employee, 'id' | 'first_name' | 'last_name' | 'gusto_name' | 'label' | 'tech_id'>

const isDigitsOnly = (s: string) => /^\d+$/.test(s)

// Bulk-merged st_employees rows mostly have no first/last name (only a tech_id) —
// fall back through gusto_name / label / tech_id before resorting to the row id.
export function employeeDisplayName(e: NameSource): string {
  const full = [e.first_name, e.last_name].filter(Boolean).join(' ').trim()
  if (full) return full
  if (e.gusto_name?.trim()) return e.gusto_name.trim()
  if (e.label?.trim() && !isDigitsOnly(e.label.trim())) return e.label.trim()
  if (e.tech_id) return `Tech #${e.tech_id}`
  return `#${e.id}`
}

export function employeeHasName(e: NameSource): boolean {
  return !!(e.first_name || e.last_name || e.gusto_name?.trim())
}

export function employeeInitials(e: Pick<Employee, 'first_name' | 'last_name' | 'gusto_name'>): string {
  if (e.first_name || e.last_name) return `${e.first_name?.charAt(0) ?? ''}${e.last_name?.charAt(0) ?? ''}`
  if (e.gusto_name?.trim()) {
    const [a, b] = e.gusto_name.trim().split(/\s+/)
    return `${a?.charAt(0) ?? ''}${b?.charAt(0) ?? ''}`
  }
  return '?'
}
