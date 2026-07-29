import { instance } from '../instance'
import type { BonusType } from '../../types/bonusType'

export const fetchBonusTypes = () => instance.get<BonusType[]>('/bonus-types').then(r => r.data)

export const createBonusType = (data: Omit<BonusType, 'id'>) =>
  instance.post<BonusType>('/bonus-types', data).then(r => r.data)

export const updateBonusType = (id: number, data: Partial<Omit<BonusType, 'id'>>) =>
  instance.patch<BonusType>(`/bonus-types/${id}`, data).then(r => r.data)

export const deleteBonusType = (id: number) => instance.delete(`/bonus-types/${id}`)
