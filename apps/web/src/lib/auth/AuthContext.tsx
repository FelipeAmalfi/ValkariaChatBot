'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'
const DM_TOKEN_KEY = 'valkaria:dmToken'

type Role = 'guest' | 'PLAYER' | 'DM'
type ValidationState = 'pending' | 'challenged' | 'validated' | 'denied'

interface MeResponse {
  playerName: string | null
  role: Role
  validationState: ValidationState
}

interface AuthState {
  playerName: string | null
  role: Role
  dmToken: string | null
  loginDM: (token: string) => void
  logout: () => void
  refreshMe: (threadId: string) => Promise<void>
}

const AuthContext = createContext<AuthState>({
  playerName: null,
  role: 'guest',
  dmToken: null,
  loginDM: () => {},
  logout: () => {},
  refreshMe: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [playerName, setPlayerName] = useState<string | null>(null)
  const [role, setRole] = useState<Role>('guest')
  const [dmToken, setDmToken] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(DM_TOKEN_KEY)
    if (stored) setDmToken(stored)
  }, [])

  const loginDM = useCallback((token: string) => {
    localStorage.setItem(DM_TOKEN_KEY, token)
    setDmToken(token)
    setRole('DM')
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(DM_TOKEN_KEY)
    setDmToken(null)
    setPlayerName(null)
    setRole('guest')
  }, [])

  const refreshMe = useCallback(async (threadId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/me`, {
        headers: { 'x-thread-id': threadId },
      })
      if (!res.ok) return
      const data = (await res.json()) as MeResponse
      if (data.validationState === 'validated') {
        setPlayerName(data.playerName)
        setRole(data.role)
      }
    } catch {
      // network error — keep existing state
    }
  }, [])

  return (
    <AuthContext.Provider value={{ playerName, role, dmToken, loginDM, logout, refreshMe }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
