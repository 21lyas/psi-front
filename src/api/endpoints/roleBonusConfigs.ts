import { instance } from '../instance'
import type { RoleBonusConfig } from '../../types/roleBonusConfig'

export const fetchRoleBonusConfigs = (roleId?: number) =>
  instance.get<RoleBonusConfig[]>('/role-bonus-configs', { params: roleId ? { roleId } : {} }).then(r => r.data)

export const createRoleBonusConfig = (data: Omit<RoleBonusConfig, 'id' | 'bonusType' | 'role'>) =>
  instance.post<RoleBonusConfig>('/role-bonus-configs', data).then(r => r.data)

export const updateRoleBonusConfig = (id: number, data: Partial<Omit<RoleBonusConfig, 'id' | 'bonusType' | 'role'>>) =>
  instance.patch<RoleBonusConfig>(`/role-bonus-configs/${id}`, data).then(r => r.data)

export const deleteRoleBonusConfig = (id: number) => instance.delete(`/role-bonus-configs/${id}`)
