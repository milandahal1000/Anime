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

  const reportProgress = () => {
    if (!isAuthenticated || !episode) return
    const video = videoRef.current
    if (!video) return
    const progress = Math.floor(video.currentTime)
    const completed = video.ended || (video.duration > 0 && progress >= video.duration - 5)
    authApi.watchHistory()
      .upsert({
        anime_id: episode.anime,
        episode_id: episode.id,
        progress_seconds: progress,
        is_completed: completed,
      })
      .catch(() => {})
  }

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
          onEnded={reportProgress}
        />
      </div>
      <h1>
        {episode.anime_title} &mdash; EP {episode.number}
      </h1>
      <p className="muted" style={{ marginTop: 4 }}>
        {episode.title}
      </p>

      <h2 className="section-title">Episodes</h2>
      <div className="episode-list">
        {episodes.map((ep) => (
          <Link key={ep.id} to={`/watch/${animeId}/${ep.id}`} className="episode-item">
            <div className="episode-num">EP {ep.number}</div>
            <div className="episode-title">{ep.title}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
