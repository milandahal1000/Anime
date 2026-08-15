import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '../services/api'
import { useAuth } from '../hooks/useAuth'

export default function Profile() {
  const { user } = useAuth()
  const [favorites, setFavorites] = useState([])
  const [history, setHistory] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    Promise.all([authApi.favorites().list(), authApi.watchHistory().list()])
      .then(([favs, hist]) => {
        setFavorites(favs.data)
        setHistory(hist.data)
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) {
    return <div className="loader">Loading&hellip;</div>
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>{user?.username}</h1>
        <p className="muted">Your favorites and watch history</p>
      </div>

      <h2 className="section-title">Favorites ({favorites.length})</h2>
      {favorites.length ? (
        favorites.map((anime) => (
          <Link key={anime.id} to={`/anime/${anime.id}`} className="fav-row">
            <img className="fav-thumb" src={anime.cover_image} alt="" />
            <div>
              <div style={{ fontWeight: 700 }}>{anime.title}</div>
              <div className="muted">
                {anime.release_year || 'Unknown year'} &middot; {anime.episode_count} episodes
              </div>
            </div>
          </Link>
        ))
      ) : (
        <div className="empty">
          No favorites yet. <Link to="/browse">Browse anime</Link> to add some.
        </div>
      )}

      <h2 className="section-title">Continue watching ({history.length})</h2>
      {history.length ? (
        history.map((entry) => {
          const duration = entry.episode?.duration || 1440
          const pct = Math.min(100, Math.round((entry.progress_seconds / duration) * 100))
          const targetEpisode = entry.episode
            ? `/watch/${entry.anime.id}/${entry.episode.id}`
            : `/anime/${entry.anime.id}`
          return (
            <Link key={entry.id} to={targetEpisode} className="history-row">
              <img className="history-thumb" src={entry.anime.cover_image} alt="" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{entry.anime.title}</div>
                <div className="muted">
                  {entry.episode ? `EP ${entry.episode.number}` : 'Started watching'}
                  {entry.is_completed ? ' &middot; Completed' : ''}
                </div>
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </Link>
          )
        })
      ) : (
        <div className="empty">Nothing watched yet.</div>
      )}
    </div>
  )
}
