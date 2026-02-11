'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { UserProfile } from './api'

interface AuthState {
  user: UserProfile | null
  loading: boolean
}

interface AuthContextValue extends AuthState {
  /** Call after login/register — refetches the current user from the cookie session. */
  refresh: () => Promise<void>
  /** Clears the session cookie and resets state. */
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true })

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        credentials: 'include',
      })
      if (res.ok) {
        const user: UserProfile = await res.json()
        setState({ user, loading: false })
      } else {
        setState({ user: null, loading: false })
      }
    } catch {
      setState({ user: null, loading: false })
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      // Best-effort
    }
    setState({ user: null, loading: false })
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <AuthContext.Provider value={{ ...state, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
