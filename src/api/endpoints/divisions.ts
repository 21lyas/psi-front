import { instance } from '../instance'
import type { Division } from '../../types/division'

export const fetchDivisions = () => instance.get<Division[]>('/divisions').then(r => r.data)
export const createDivision = (data: { name: string }) => instance.post<Division>('/divisions', data).then(r => r.data)
export const updateDivision = (id: number, data: Partial<{ name: string }>) => instance.patch<Division>(`/divisions/${id}`, data).then(r => r.data)
export const deleteDivision = (id: number) => instance.delete(`/divisions/${id}`)
