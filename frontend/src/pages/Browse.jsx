import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import AnimeCard from '../components/AnimeCard'
import { contentApi } from '../services/api'
import { useAnime } from '../hooks/useAnime'
import { usePageMeta } from '../hooks/usePageMeta'

export default function Browse() {
  usePageMeta('Browse Anime', 'Search and filter the anime catalog by title, genre, year and more.')
  const [searchParams, setSearchParams] = useSearchParams()
  const [genres, setGenres] = useState([])

  const genre = searchParams.get('genre') || ''
  const search = searchParams.get('search') || ''
  const ordering = searchParams.get('ordering') || '-release_year'
  const page = Number(searchParams.get('page')) || 1

  const { data, isLoading } = useAnime({ genre, search, ordering, page })

  useEffect(() => {
    contentApi
      .genres()
      .then(({ data }) => setGenres(data.results))
      .catch(() => {})
  }, [])

  const update = (patch) => {
    const next = { genre, search, ordering, page: String(page) }
    if (patch.genre === genre) {
      delete next.genre
    } else if (patch.genre !== undefined) {
      next.genre = patch.genre
    }
    if (patch.search !== undefined) next.search = patch.search
    if (patch.ordering !== undefined) next.ordering = patch.ordering
    if (patch.page !== undefined) next.page = String(patch.page)
    if (next.genre === '') delete next.genre
    if (next.search === '') delete next.search
    if (next.ordering === '-release_year') delete next.ordering
    if (next.page === '1') delete next.page
    setSearchParams(next)
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Browse anime</h1>
      </div>

      <div className="filters">
        <input
          className="input search-input"
          placeholder="Search titles, synopsis, studios…"
          defaultValue={search}
          onKeyDown={(e) => {
            if (e.key === 'Enter') update({ search: e.target.value, page: 1 })
          }}
        />
        <select className="select" value={ordering} onChange={(e) => update({ ordering: e.target.value, page: 1 })}>
          <option value="-release_year">Newest</option>
          <option value="release_year">Oldest</option>
          <option value="title">Title A-Z</option>
          <option value="-title">Title Z-A</option>
        </select>
      </div>

      <div className="filters">
        <button type="button" className={`chip ${genre === '' ? 'active' : ''}`} onClick={() => update({ genre: '', page: 1 })}>
          All
        </button>
        {genres.map((g) => (
          <button
            key={g.id}
            type="button"
            className={`chip ${genre === g.slug ? 'active' : ''}`}
            onClick={() => update({ genre: genre === g.slug ? '' : g.slug, page: 1 })}
          >
            {g.name}
          </button>
        ))}
      </div>

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
        <>
          <p className="muted" style={{ marginBottom: 12 }}>
            {data.count} result{data.count === 1 ? '' : 's'}
            {search ? ` for "${search}"` : ''}
          </p>
          <div className="grid">
            {data.results.map((anime) => (
              <AnimeCard key={anime.id} anime={anime} />
            ))}
          </div>
          {data.count > 20 && (
            <div className="pagination">
              <button
                type="button"
                className="btn"
                disabled={!data.previous}
                onClick={() => update({ page: page - 1 })}
              >
                Previous
              </button>
              <span className="muted" style={{ alignSelf: 'center' }}>
                Page {page} of {Math.max(1, Math.ceil(data.count / 20))}
              </span>
              <button
                type="button"
                className="btn"
                disabled={!data.next}
                onClick={() => update({ page: page + 1 })}
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="empty">No anime match your filters.</div>
      )}
    </div>
  )
}
