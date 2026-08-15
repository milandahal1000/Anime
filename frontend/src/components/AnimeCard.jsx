import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useFavorites } from '../hooks/useFavorites'

export default function AnimeCard({ anime }) {
  const { isAuthenticated } = useAuth()
  const { isFavorite, toggle } = useFavorites()
  const navigate = useNavigate()

  const handleFavorite = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    toggle(anime.id)
  }

  const favorite = isFavorite(anime.id)

  return (
    <Link to={`/anime/${anime.id}`} className="card">
      <div className="card-cover">
        <img src={anime.cover_image} alt={anime.title} loading="lazy" decoding="async" />
        <button
          type="button"
          className={`fav-btn ${favorite ? 'active' : ''}`}
          aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
          onClick={handleFavorite}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 21s-7.5-4.7-10-9C.5 8 2 4.5 5.5 4.5c2.2 0 3.7 1.3 4.5 2.7.8-1.4 2.3-2.7 4.5-2.7C18 4.5 19.5 8 18 12c-2.5 4.3-6 9-6 9z" />
          </svg>
        </button>
      </div>
      <div className="card-body">
        <div className="card-title">{anime.title}</div>
        <div className="card-meta">
          {anime.release_year && <span className="badge">{anime.release_year}</span>}
          <span className="badge badge-accent">{anime.episode_count} eps</span>
        </div>
      </div>
    </Link>
  )
}
