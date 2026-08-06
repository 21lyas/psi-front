import axios from 'axios'
import { getToken, setToken, clearToken, UNAUTHORIZED_EVENT } from './tokenStore'

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  // baseURL: 'http://localhost:3000/api',
  withCredentials: false,
  headers: {},
})

instance.interceptors.request.use(config => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

instance.interceptors.response.use(
  response => {
    // Sliding 3h idle window: the backend refreshes the token on every
    // authenticated request — keep whatever it hands back as the new one.
    const refreshed = response.headers['x-access-token']
    if (refreshed) setToken(refreshed)
    return response
  },
  error => {
    if (error.response?.status === 401) {
      clearToken()
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
    }
    return Promise.reject(error)
  },
)

export { instance }
