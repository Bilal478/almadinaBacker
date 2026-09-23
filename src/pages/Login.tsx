import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/common/Button'

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const ok = await login(username, password)
      if (ok) {
        navigate('/')
      } else {
        setError('Invalid username or password.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-navy-900">
      <div className="w-full max-w-sm rounded border border-white/10 bg-panel p-6 shadow-xl">
        <div className="mb-5 flex flex-col items-center gap-2 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded bg-brand-500 text-[16px] font-bold text-white">
            POS
          </div>
          <div className="text-[17px] font-bold text-ink">Bakery POS</div>
          <div className="text-xs text-ink-faint">Point of Sale — Counter Login</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">Username</label>
            <input
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="w-full rounded border border-border-strong bg-panel px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded border border-border-strong bg-panel px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>
          {error && <div className="rounded bg-danger-bg px-2.5 py-1.5 text-xs text-danger">{error}</div>}
          <Button type="submit" variant="primary" size="lg" className="w-full font-bold" disabled={submitting}>
            <LogIn size={16} />
            {submitting ? 'Signing In…' : 'Sign In'}
          </Button>
        </form>
      </div>
    </div>
  )
}
