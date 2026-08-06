const TOKEN_KEY = 'psi_token'

// Fired on window whenever a request comes back 401 — AuthContext listens
// for this to clear its user state and bounce to /login, without instance.ts
// (a plain module, outside React) needing to know about the router.
export const UNAUTHORIZED_EVENT = 'psi:unauthorized'

export const getToken = () => localStorage.getItem(TOKEN_KEY)

export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token)

export const clearToken = () => localStorage.removeItem(TOKEN_KEY)
