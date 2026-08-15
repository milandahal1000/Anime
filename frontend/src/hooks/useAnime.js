import { useEffect, useState } from 'react'
import { contentApi } from '../services/api'

export function useAnime(params) {
  const paramsKey = JSON.stringify(params ?? {})
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)
    contentApi
      .anime(JSON.parse(paramsKey))
      .then(({ data }) => {
        if (!cancelled) setData(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [paramsKey])

  return { data, isLoading, error }
}
