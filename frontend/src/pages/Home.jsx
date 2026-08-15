import { Link } from 'react-router-dom'
import AnimeCard from '../components/AnimeCard'
import { useAnime } from '../hooks/useAnime'

export default function Home() {
  const { data, isLoading } = useAnime({ ordering: '-release_year' })

  return (
    <div className="page">
      <section className="hero">
        <h1>Watch the best anime, everywhere.</h1>
        <p>
          Stream trending and classic series with a clean, lightning-fast player.
          Browse by genre, pick a favorite, and pick up right where you left off.
        </p>
        <Link to="/browse" className="btn btn-primary">
          Browse anime
        </Link>
      </section>

      <h2 className="section-title">Latest</h2>
      {isLoading ? (
        <div className="loader">Loading&hellip;</div>
      ) : data?.results?.length ? (
        <div className="grid">
          {data.results.map((anime) => (
            <AnimeCard key={anime.id} anime={anime} />
          ))}
        </div>
      ) : (
        <div className="empty">No anime yet. Run <code>manage.py seed_anime</code> on the backend.</div>
      )}
    </div>
  )
}
