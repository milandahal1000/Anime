import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import VideoPlayer from '../components/VideoPlayer'
import { useAuth } from '../hooks/useAuth'
import { authApi, contentApi } from '../services/api'

export default function Watch() {
  const { animeId, episodeId } = useParams()
  const { isAuthenticated } = useAuth()
  const episodeRef = useRef(null)
  const lastReportedRef = useRef(0)
  const videoRef = useRef(null)
  const [episode, setEpisode] = useState(null)
  const [episodes, setEpisodes] = useState([])
  const [resumeSeconds, setResumeSeconds] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setIsLoading(true)
    setResumeSeconds(0)
    Promise.all([
      contentApi.episode(episodeId),
      contentApi.animeEpisodes(animeId),
      isAuthenticated ? authApi.watchHistory().list() : Promise.resolve(null),
    ])
      .then(([ep, list, history]) => {
        setEpisode(ep.data)
        episodeRef.current = ep.data
        setEpisodes(list.data.results)
        const entry = history?.data?.find((h) => h.anime.id === Number(animeId))
        if (entry && !entry.is_completed && entry.episode?.id === Number(episodeId)) {
          setResumeSeconds(entry.progress_seconds)
        }
      })
      .catch(() => setError('Episode not found.'))
      .finally(() => setIsLoading(false))
  }, [animeId, episodeId, isAuthenticated])

  const reportProgress = (completed = false) => {
    if (!isAuthenticated || !episodeRef.current) return
    const video = videoRef.current
    if (!video) return
    const progress = Math.floor(video.currentTime || 0)
    if (!completed && progress === lastReportedRef.current) return
    lastReportedRef.current = progress
    authApi.watchHistory()
      .upsert({
        anime_id: episodeRef.current.anime,
        episode_id: episodeRef.current.id,
        progress_seconds: progress,
        is_completed: completed,
      })
      .catch(() => {})
  }

  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === 'hidden') reportProgress()
    }
    document.addEventListener('visibilitychange', onHidden)
    window.addEventListener('beforeunload', reportProgress)
    return () => {
      document.removeEventListener('visibilitychange', onHidden)
      window.removeEventListener('beforeunload', reportProgress)
      reportProgress()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  const index = episodes.findIndex((ep) => ep.id === Number(episodeId))
  const prev = index > 0 ? episodes[index - 1] : null
  const next = index >= 0 && index < episodes.length - 1 ? episodes[index + 1] : null

  if (isLoading) {
    return <div className="loader">Loading&hellip;</div>
  }
  if (error || !episode) {
    return <div className="empty">{error}</div>
  }

  return (
    <div className="page">
      <div className="player-wrap">
        <VideoPlayer
          key={episode.id}
          videoRef={videoRef}
          src={episode.video_url}
          poster={episode.thumbnail}
          autoPlay
          startSeconds={resumeSeconds}
          onTimeUpdate={() => {
            const video = videoRef.current
            const t = Math.floor(video?.currentTime || 0)
            if (t >= lastReportedRef.current + 5) reportProgress()
          }}
          onPause={() => reportProgress()}
          onEnded={() => reportProgress(true)}
        />
      </div>

      <div className="player-actions">
        {prev ? (
          <Link to={`/watch/${animeId}/${prev.id}`} className="btn">
            &larr; EP {prev.number}
          </Link>
        ) : (
          <span />
        )}
        <h1>
          {episode.anime_title} &mdash; EP {episode.number}
        </h1>
        {next ? (
          <Link to={`/watch/${animeId}/${next.id}`} className="btn btn-primary">
            EP {next.number} &rarr;
          </Link>
        ) : (
          <span />
        )}
      </div>
      <p className="muted" style={{ textAlign: 'center', marginTop: 4 }}>
        {episode.title}
      </p>

      <h2 className="section-title">Episodes</h2>
      <div className="episode-list">
        {episodes.map((ep) => (
          <Link
            key={ep.id}
            to={`/watch/${animeId}/${ep.id}`}
            className={`episode-item ${ep.id === episode.id ? 'current' : ''}`}
          >
            <div className="episode-num">EP {ep.number}</div>
            <div className="episode-title">{ep.title}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
