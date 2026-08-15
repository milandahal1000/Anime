import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { authApi, contentApi } from '../services/api'

export default function AnimeDetail() {
  const { id } = useParams()
  const { isAuthenticated } = useAuth()
  const [anime, setAnime] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFavorite, setIsFavorite] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    setIsLoading(true)
    contentApi
      .animeDetail(id)
      .then(({ data }) => setAnime(data))
      .catch(() => setError('Anime not found.'))
      .finally(() => setIsLoading(false))
  }, [id])

  useEffect(() => {
    if (!isAuthenticated) return
    authApi
      .favorites()
      .list()
      .then(({ data }) => setIsFavorite(data.some((a) => a.id === Number(id))))
      .catch(() => {})
  }, [id, isAuthenticated])

  const toggleFavorite = useCallback(async () => {
    try {
      if (isFavorite) {
        await authApi.favorites().remove(id)
      } else {
        await authApi.favorites().add(id)
      }
      setIsFavorite((prev) => !prev)
    } catch {
      // ignore; optimistic toggle stays on current value
    }
  }, [id, isFavorite])

  if (isLoading) {
    return (
      <div className="page">
        <div className="detail-layout">
          <div className="detail-cover skeleton" />
          <div>
            <div className="skeleton" style={{ height: 32, width: '70%', marginBottom: 16 }} />
            <div className="skeleton" style={{ height: 16, width: '40%', marginBottom: 24 }} />
            <div className="skeleton" style={{ height: 14, width: '100%', marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 14, width: '90%', marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 14, width: '60%' }} />
          </div>
        </div>
      </div>
    )
  }
  if (error || !anime) {
    return <div className="empty">{error}</div>
  }

  return (
    <div className="page">
      <div className="detail-layout">
        <div>
          <div className="detail-cover">
            <img src={anime.cover_image} alt={anime.title} />
          </div>
          {isAuthenticated && (
            <button type="button" className="btn btn-block" style={{ marginTop: 12 }} onClick={toggleFavorite}>
              {isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            </button>
          )}
        </div>
        <div>
          <h1>{anime.title}</h1>
          <div className="detail-meta">
            {anime.studio && <span className="badge">{anime.studio}</span>}
            {anime.release_year && <span className="badge">{anime.release_year}</span>}
            <span className="badge badge-accent">{anime.episodes.length} episodes</span>
          </div>
          <div className="detail-meta">
            {anime.genres.map((g) => (
              <Link key={g.id} to={`/browse?genre=${g.slug}`} className="badge">
                {g.name}
              </Link>
            ))}
          </div>
          <p className="muted">{anime.synopsis}</p>

          <h2 className="section-title">Episodes</h2>
          <div className="episode-list">
            {anime.episodes.map((ep) => (
              <Link key={ep.id} to={`/watch/${anime.id}/${ep.id}`} className="episode-item">
                <div className="episode-num">EP {ep.number}</div>
                <div className="episode-title">{ep.title}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
