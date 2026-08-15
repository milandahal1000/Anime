import { useEffect, useRef, useState } from 'react'
import { resolveStream as resolveConsumetStream } from '../services/consumet'
import { resolveMiruroStream } from '../services/miruro'

export function useStream({ title, episodeNumber, anilistId, enabled = true }) {
  const [stream, setStream] = useState(null)
  const [status, setStatus] = useState('idle')
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled

  useEffect(() => {
    if (!enabled || !title || !episodeNumber) return
    let active = true
    setStream(null)
    setStatus('resolving')

    const resolve = () =>
      resolveMiruroStream({ title, episodeNumber, anilistId }).catch(() =>
        resolveConsumetStream({ title, episodeNumber }),
      )

    let timeoutId = null
    Promise.race([
      resolve(),
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Stream resolve timed out')), 20000)
      }),
    ])
      .then((result) => {
        if (!active) return
        if (result) {
          setStream(result)
          setStatus('ready')
        } else {
          setStatus('fallback')
        }
      })
      .catch(() => {
        if (active) setStatus('fallback')
      })
    return () => {
      active = false
      clearTimeout(timeoutId)
    }
  }, [title, episodeNumber, anilistId, enabled])

  return { stream, status }
}
