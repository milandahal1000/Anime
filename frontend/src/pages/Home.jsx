import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AnimeCard from '../components/AnimeCard'
import { authApi, contentApi } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import { useAnime } from '../hooks/useAnime'

export default function Home() {
  const { isAuthenticated } = useAuth()
  const { data, isLoading } = useAnime({ ordering: '-release_year' })
  const [history, setHistory] = useState([])
  const [featuredDetail, setFeaturedDetail] = useState(null)

  useEffect(() => {
    if (!isAuthenticated) return
    authApi
      .watchHistory()
      .list()
      .then(({ data }) => setHistory(data))
      .catch(() => {})
  }, [isAuthenticated])

  const featured = data?.results?.[0]
  const featuredId = featured?.id

  useEffect(() => {
    if (!featuredId) return
    contentApi
      .animeDetail(featuredId)
      .then(({ data }) => setFeaturedDetail(data))
      .catch(() => {})
  }, [featuredId])

  const inProgress = history.filter((h) => !h.is_completed).slice(0, 4)

  return (
    <div className="page">
      {isLoading ? (
        <div className="hero-skeleton skeleton" />
      ) : featured ? (
        <section
          className="hero-banner"
          style={{
            backgroundImage: `linear-gradient(90deg, rgba(11,13,18,0.92) 0%, rgba(11,13,18,0.7) 55%, rgba(11,13,18,0.35) 100%), url(${featured.cover_image})`,
          }}
        >
          <div className="hero-banner-body">
            <span className="badge badge-accent">Featured</span>
            <h1>{featured.title}</h1>
            <p>{featured.synopsis}</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link to={`/anime/${featured.id}`} className="btn btn-primary">
                View details
              </Link>
              {featuredDetail?.episodes?.length > 0 && (
                <Link to={`/watch/${featured.id}/${featuredDetail.episodes[0].id}`} className="btn">
                  Watch now
                </Link>
              )}
            </div>
          </div>
        </section>
      ) : (
        <div className="empty" style={{ padding: '48px 0' }}>
          No anime yet. Run <code>manage.py seed_anime</code> on the backend.
        </div>
      )}

      {isAuthenticated && inProgress.length > 0 && (
        <>
          <h2 className="section-title">Continue watching</h2>
          <div className="grid">
            {inProgress.map((entry) => {
              const pct = Math.min(100, Math.round((entry.progress_seconds / 1440) * 100))
              const target = entry.episode
                ? `/watch/${entry.anime.id}/${entry.episode.id}`
                : `/anime/${entry.anime.id}`
              return (
                <Link key={entry.id} to={target} className="card">
                  <div className="card-cover">
                    <img src={entry.anime.cover_image} alt={entry.anime.title} loading="lazy" />
                  </div>
                  <div className="card-body">
                    <div className="card-title">{entry.anime.title}</div>
                    <div className="card-meta">
                      <span className="badge">
                        {entry.episode ? `EP ${entry.episode.number}` : 'Started'}
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </>
      )}

      <h2 className="section-title">Latest</h2>
      {isLoading ? (
        <div className="grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card">
              <div className="card-cover skeleton" />
              <div className="card-body">
                <div className="skeleton" style={{ height: 14, marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 12, width: '60%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : data?.results?.length ? (
        <div className="grid">
          {data.results.map((anime) => (
            <AnimeCard key={anime.id} anime={anime} />
          ))}
        </div>
      ) : null}
    </div>
  )
}
