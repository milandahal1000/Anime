import { Link } from 'react-router-dom'

export default function AnimeCard({ anime }) {
  return (
    <Link to={`/anime/${anime.id}`} className="card">
      <div className="card-cover">
        <img src={anime.cover_image} alt={anime.title} loading="lazy" />
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
