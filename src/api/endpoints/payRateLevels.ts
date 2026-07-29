import { instance } from '../instance'
import type { PayRateLevel } from '../../types/payRateLevel'

export const fetchPayRateLevels = (roleId?: number) =>
  instance.get<PayRateLevel[]>('/pay-rate-levels', { params: roleId ? { roleId } : {} }).then(r => r.data)

export const createPayRateLevel = (data: Omit<PayRateLevel, 'id'>) =>
  instance.post<PayRateLevel>('/pay-rate-levels', data).then(r => r.data)

export const updatePayRateLevel = (id: number, data: Partial<Omit<PayRateLevel, 'id'>>) =>
  instance.patch<PayRateLevel>(`/pay-rate-levels/${id}`, data).then(r => r.data)

export const deletePayRateLevel = (id: number) => instance.delete(`/pay-rate-levels/${id}`)
