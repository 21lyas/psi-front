import { instance } from '../instance'
import type { SystemRole } from '../../types/employee'

export const fetchSystemRoles = () => instance.get<SystemRole[]>('/system-roles').then(r => r.data)
