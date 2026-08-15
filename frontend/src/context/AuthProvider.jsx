import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from './authContext'
import { authApi } from '../services/api'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const access = localStorage.getItem('access')
    if (!access) {
      setIsLoading(false)
      return
    }
    authApi
      .me()
      .then(({ data }) => setUser(data.user))
      .catch(() => {
        localStorage.removeItem('access')
        localStorage.removeItem('refresh')
      })
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(async (username, password) => {
    const { data } = await authApi.login({ username, password })
    localStorage.setItem('access', data.access)
    localStorage.setItem('refresh', data.refresh)
    const me = await authApi.me()
    setUser(me.data.user)
  }, [])

  const register = useCallback(async (payload) => {
    const { data } = await authApi.register(payload)
    localStorage.setItem('access', data.access)
    localStorage.setItem('refresh', data.refresh)
    setUser(data.user)
  }, [])

  const logout = useCallback(async () => {
    const refresh = localStorage.getItem('refresh')
    if (refresh) {
      try {
        await authApi.logout(refresh)
      } catch {
        // ignore network errors; clear locally regardless
      }
    }
    localStorage.removeItem('access')
    localStorage.removeItem('refresh')
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, isLoading, isAuthenticated: Boolean(user), login, register, logout }),
    [user, isLoading, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
