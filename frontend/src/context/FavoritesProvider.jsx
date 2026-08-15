import { useCallback, useEffect, useMemo, useState } from 'react'
import { authApi } from '../services/api'
import { FavoritesContext } from './favoritesContext'

export function FavoritesProvider({ children }) {
  const [ids, setIds] = useState(new Set())
  const [isLoading, setIsLoading] = useState(false)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data } = await authApi.favorites().list()
      setIds(new Set(data.map((anime) => anime.id)))
    } catch {
      setIds(new Set())
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const isFavorite = useCallback((id) => ids.has(Number(id)), [ids])

  const toggle = useCallback(
    async (id) => {
      const numericId = Number(id)
      const wasFavorite = ids.has(numericId)
      setIds((prev) => {
        const next = new Set(prev)
        if (wasFavorite) {
          next.delete(numericId)
        } else {
          next.add(numericId)
        }
        return next
      })
      try {
        if (wasFavorite) {
          await authApi.favorites().remove(numericId)
        } else {
          await authApi.favorites().add(numericId)
        }
      } catch {
        setIds((prev) => {
          const next = new Set(prev)
          if (wasFavorite) {
            next.add(numericId)
          } else {
            next.delete(numericId)
          }
          return next
        })
      }
    },
    [ids],
  )

  const value = useMemo(
    () => ({ ids, isLoading, isFavorite, toggle, refresh }),
    [ids, isLoading, isFavorite, toggle, refresh],
  )

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}
