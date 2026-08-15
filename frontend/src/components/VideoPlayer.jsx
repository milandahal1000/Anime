import { useEffect, useRef } from 'react'

const isHlsUrl = (url) => /\.m3u8(\?|$)/i.test(url)

export default function VideoPlayer({
  videoRef,
  src,
  poster,
  autoPlay = false,
  startSeconds = 0,
  onTimeUpdate,
  onPause,
  onEnded,
}) {
  const seekedRef = useRef(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !src) return

    seekedRef.current = false
    video.removeAttribute('src')
    video.load()
    video.poster = poster || ''

    let hls = null
    let active = true

    const setupNative = () => {
      video.src = src
      video.addEventListener('loadedmetadata', () => {
        if (autoPlay) video.play().catch(() => {})
      })
    }

    const cleanup = () => {
      active = false
      if (hls) {
        hls.destroy()
        hls = null
      }
      video.pause()
      video.removeAttribute('src')
      video.load()
    }

    const handleSeekReady = () => {
      if (startSeconds > 0 && !seekedRef.current && video.readyState >= 1 && video.duration > startSeconds) {
        video.currentTime = startSeconds
        seekedRef.current = true
      }
    }

    video.addEventListener('loadedmetadata', handleSeekReady)
    video.addEventListener('canplay', handleSeekReady)

    if (!isHlsUrl(src)) {
      setupNative()
      return () => {
        video.removeEventListener('loadedmetadata', handleSeekReady)
        video.removeEventListener('canplay', handleSeekReady)
        cleanup()
      }
    }

    import('hls.js')
      .then(({ default: Hls }) => {
        if (!active) return
        if (!Hls.isSupported()) {
          setupNative()
          return
        }
        hls = new Hls({ autoStartLoad: true, startPosition: startSeconds > 0 ? startSeconds : -1 })
        hls.loadSource(src)
        hls.attachMedia(video)
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (autoPlay) video.play().catch(() => {})
        })
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            const levelRetry = data.type === Hls.ErrorTypes.NETWORK_ERROR && data.context?.levelRetry
            if (!levelRetry) hls?.startLoad()
          }
        })
      })
      .catch(() => setupNative())

    return () => {
      video.removeEventListener('loadedmetadata', handleSeekReady)
      video.removeEventListener('canplay', handleSeekReady)
      cleanup()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, poster])

  return (
    <video
      ref={videoRef}
      controls
      autoPlay={autoPlay}
      poster={poster}
      onTimeUpdate={onTimeUpdate}
      onPause={onPause}
      onEnded={onEnded}
    />
  )
}
