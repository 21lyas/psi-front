import { instance } from '../instance'
import type { AuthUser } from '../../types/auth'

export interface LoginResponse {
  access_token: string
  employee: AuthUser
}

export const login = (login: string, password: string) =>
  instance.post<LoginResponse>('/auth/login', { login, password }).then(r => r.data)

export const fetchMe = () => instance.get<AuthUser>('/auth/me').then(r => r.data)
