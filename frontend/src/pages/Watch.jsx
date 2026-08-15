import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { authApi, contentApi } from '../services/api'

export default function Watch() {
  const { animeId, episodeId } = useParams()
  const { isAuthenticated } = useAuth()
  const videoRef = useRef(null)
  const [episode, setEpisode] = useState(null)
  const [episodes, setEpisodes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setIsLoading(true)
    Promise.all([contentApi.episode(episodeId), contentApi.animeEpisodes(animeId)])
      .then(([ep, list]) => {
        setEpisode(ep.data)
        setEpisodes(list.data.results)
      })
      .catch(() => setError('Episode not found.'))
      .finally(() => setIsLoading(false))
  }, [animeId, episodeId])

  const reportProgress = (completed = false) => {
    if (!isAuthenticated || !episode) return
    const video = videoRef.current
    if (!video) return
    const progress = Math.floor(video.currentTime)
    authApi.watchHistory()
      .upsert({
        anime_id: episode.anime,
        episode_id: episode.id,
        progress_seconds: progress,
        is_completed: completed,
      })
      .catch(() => {})
  }

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
        <video
          ref={videoRef}
          controls
          autoPlay
          src={episode.video_url}
          poster={episode.thumbnail}
          onTimeUpdate={() => {
            if (Math.floor(videoRef.current.currentTime) % 5 === 0) reportProgress()
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
        <h1 style={{ textAlign: 'center', margin: 0 }}>
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
