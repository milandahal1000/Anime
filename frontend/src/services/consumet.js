const DEFAULT_BASES = [
  'https://api-aniwatch.onrender.com',
  'https://aniwatch-api.vercel.app',
  'https://hianime-api-phi.vercel.app',
]

const INSTANCES = [
  ...(import.meta.env.VITE_CONSUMET_BASE ? [import.meta.env.VITE_CONSUMET_BASE] : []),
  ...DEFAULT_BASES,
].filter(Boolean)

const TIMEOUT_MS = 8000
const QUALITY_PREFERENCE = ['1080p', '720p', 'default', '480p', '360p']

function withTimeout(fn, ms = TIMEOUT_MS) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  return Promise.resolve()
    .then(() => fn(controller.signal))
    .finally(() => clearTimeout(timer))
}

async function getJson(url, signal) {
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  if (json?.success === false) throw new Error(json.message || 'API error')
  return json
}

const normalize = (s) => (s || '').toLowerCase().trim()

function pickBestMatch(query, results) {
  if (!results?.length) return null
  const q = normalize(query)
  return (
    results.find((r) => normalize(r.name) === q || normalize(r.jname) === q) ||
    results.find((r) => normalize(r.name).includes(q) || q.includes(normalize(r.name))) ||
    results[0]
  )
}

function pickSource(sources) {
  const list = (sources || []).filter((s) => s.isM3U8 && s.url)
  if (!list.length) return null
  const rank = (s) => {
    const i = QUALITY_PREFERENCE.indexOf(normalize(s.quality))
    return i === -1 ? QUALITY_PREFERENCE.length : i
  }
  const best = [...list].sort((a, b) => rank(a) - rank(b))[0]
  return { url: best.url, quality: best.quality }
}

async function resolveHianime(base, title, episodeNumber, signal) {
  const search = await getJson(`${base}/api/v2/hianime/search?q=${encodeURIComponent(title)}`, signal)
  const anime = pickBestMatch(title, search?.data?.anime)
  if (!anime) throw new Error('No match found')

  const info = await getJson(`${base}/api/v2/hianime/anime/${anime.id}`, signal)
  const ep = info?.data?.episodes?.find((e) => Number(e.number) === Number(episodeNumber))
  if (!ep) throw new Error(`Episode ${episodeNumber} not found`)

  const sources = await getJson(
    `${base}/api/v2/hianime/episode/sources?animeEpisodeId=${ep.episodeId}`,
    signal,
  )
  const source = pickSource(sources?.data?.sources)
  if (!source) throw new Error('No playable source')
  return { ...source, provider: 'HiAnime', base }
}

async function resolveGogoanime(base, title, episodeNumber, signal) {
  const search = await getJson(`${base}/anime/gogoanime/${encodeURIComponent(title)}?page=1`, signal)
  const anime = pickBestMatch(title, search?.results)
  if (!anime) throw new Error('No match found')

  const info = await getJson(`${base}/anime/gogoanime/info/${anime.id}`, signal)
  const ep = info?.episodes?.find((e) => e.number === Number(episodeNumber))
  if (!ep) throw new Error(`Episode ${episodeNumber} not found`)

  const sources = await getJson(`${base}/anime/gogoanime/watch/${ep.id}`, signal)
  const source = pickSource(sources?.sources)
  if (!source) throw new Error('No playable source')
  return { ...source, provider: 'Gogoanime', base }
}

function cacheKey(base, title, episodeNumber) {
  return `stream:${base}:${title}:${episodeNumber}`
}

function getCached(base, title, episodeNumber) {
  try {
    return sessionStorage.getItem(cacheKey(base, title, episodeNumber))
  } catch {
    return null
  }
}

function setCached(base, title, episodeNumber, value) {
  try {
    sessionStorage.setItem(cacheKey(base, title, episodeNumber), JSON.stringify(value))
  } catch {
    // ignore quota errors
  }
}

export async function resolveStream({ title, episodeNumber, timeoutMs = TIMEOUT_MS * 3 }) {
  if (!title || !episodeNumber) return null

  const resolverByBase = {}
  for (const base of INSTANCES) {
    resolverByBase[base] = async (signal) => {
      const cached = getCached(base, title, episodeNumber)
      if (cached) return JSON.parse(cached)
      const result = await resolveHianime(base, title, episodeNumber, signal).catch(() =>
        resolveGogoanime(base, title, episodeNumber, signal),
      )
      setCached(base, title, episodeNumber, result)
      return result
    }
  }

  const attempt = async () => {
    for (const base of INSTANCES) {
      try {
        const result = await withTimeout(resolverByBase[base])
        if (result) return result
      } catch {
        // try next instance
      }
    }
    return null
  }

  const timeoutController = new AbortController()
  const timer = setTimeout(() => timeoutController.abort(), timeoutMs)
  try {
    return await Promise.race([
      attempt(),
      new Promise((_, reject) =>
        timeoutController.signal.addEventListener('abort', () => reject(new Error('Timed out'))),
      ),
    ])
  } finally {
    clearTimeout(timer)
  }
}
