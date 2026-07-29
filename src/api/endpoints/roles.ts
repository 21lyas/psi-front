import { instance } from '../instance'
import type { Role } from '../../types/role'

export const fetchRoles = (divisionId?: number) =>
  instance.get<Role[]>('/roles', { params: divisionId ? { divisionId } : {} }).then(r => r.data)

export const fetchRole = (id: number) => instance.get<Role>(`/roles/${id}`).then(r => r.data)

export const createRole = (data: Omit<Role, 'id' | 'division' | 'payRateLevels' | 'bonusConfigs'>) =>
  instance.post<Role>('/roles', data).then(r => r.data)

export const updateRole = (id: number, data: Partial<Omit<Role, 'id' | 'division' | 'payRateLevels' | 'bonusConfigs'>>) =>
  instance.patch<Role>(`/roles/${id}`, data).then(r => r.data)

export const deleteRole = (id: number) => instance.delete(`/roles/${id}`)
