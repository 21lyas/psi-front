import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Building2, Loader2 } from 'lucide-react'
import { isAxiosError } from 'axios'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { user, isLoading, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [loginValue, setLoginValue] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!isLoading && user) {
    const from = (location.state as { from?: Location })?.from?.pathname || '/'
    return <Navigate to={from} replace />
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(loginValue, password)
      const from = (location.state as { from?: Location })?.from?.pathname || '/'
      navigate(from, { replace: true })
    } catch (err) {
      if (isAxiosError(err)) {
        if (err.response?.status === 401) setError('Invalid login or password')
        else if (!err.response) setError('Cannot reach the server. Is the backend running?')
        else setError(`Server error (${err.response.status}). Please try again.`)
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-11 h-11 rounded-xl bg-primary-500 flex items-center justify-center mb-3">
            <Building2 size={20} className="text-white" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900">PSI CRM</h1>
          <p className="text-xs text-gray-400 mt-0.5">Sign in to continue</p>
        </div>

        <form onSubmit={submit} className="card p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Login</label>
            <input
              autoFocus
              className="input-field"
              value={loginValue}
              onChange={e => setLoginValue(e.target.value)}
              placeholder="admin"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Password</label>
            <input
              className="input-field"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || !loginValue || !password}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
