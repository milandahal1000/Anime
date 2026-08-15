const DEFAULT_BASE = 'http://localhost:3000/api'

const BASE = (import.meta.env.VITE_MIRURO_BASE || DEFAULT_BASE).replace(/\/+$/, '')

const TIMEOUT_MS = 12000
const QUALITY_PREFERENCE = ['1080p', '720p', '480p', '360p']
const PROVIDER_ORDER = ['kiwi', 'pewe', 'bonk', 'bee', 'ally', 'moo', 'hop']
const CATEGORY = 'sub'

const normalize = (s) => (s || '').toLowerCase().trim()

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
  if (json?.success === false) throw new Error(json?.message || 'API error')
  return json
}

function pickBestMatch(query, results) {
  if (!results?.length) return null
  const q = normalize(query)
  return (
    results.find((r) => {
      const t = r.title || {}
      return [t.english, t.romaji, t.native].map(normalize).includes(q)
    }) ||
    results.find((r) => {
      const t = r.title || {}
      return [t.english, t.romaji, t.native].some((n) => normalize(n).includes(q) || q.includes(normalize(n)))
    }) ||
    results[0]
  )
}

function pickStream(data) {
  const best = data?.bestStream
  if (best?.url) return best

  const list = (data?.streams || []).filter(
    (s) => s?.url && (s.type === 'hls' || !s.type || /\.m3u8(\?|$)/i.test(s.url)),
  )
  if (!list.length) return null

  const active = list.find((s) => s.isActive) || list[0]
  const rank = (s) => {
    const q = normalize(s.quality || s.label)
    const i = QUALITY_PREFERENCE.indexOf(q)
    return i === -1 ? QUALITY_PREFERENCE.length : i
  }
  return [...list].sort((a, b) => rank(a) - rank(b))[0] || active
}

function cacheGet(key) {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function cacheSet(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore quota errors
  }
}

async function resolveAnilistId(title, signal) {
  const key = `miruro:anilist:${title}`
  const cached = cacheGet(key)
  if (cached) return cached

  const json = await getJson(`${BASE}/search?query=${encodeURIComponent(title)}&per_page=10`, signal)
  const match = pickBestMatch(title, json?.results?.results)
  if (!match?.id) throw new Error('No AniList match found')
  cacheSet(key, match.id)
  return match.id
}

async function resolveEpisodeTarget(anilistId, episodeNumber, signal) {
  const key = `miruro:episodes:${anilistId}`
  let providers = cacheGet(key)
  if (!providers) {
    const json = await getJson(`${BASE}/episodes/${anilistId}`, signal)
    providers = json?.providers || {}
    cacheSet(key, providers)
  }

  for (const provider of PROVIDER_ORDER) {
    const list = providers[provider]?.episodes?.[CATEGORY]
    if (!Array.isArray(list)) continue
    const ep = list.find((e) => Number(e.number) === Number(episodeNumber))
    if (!ep?.id) continue
    return { provider, slug: ep.id.split('/').pop() }
  }

  for (const [provider, data] of Object.entries(providers)) {
    const list = data?.episodes?.[CATEGORY]
    if (!Array.isArray(list)) continue
    const ep = list.find((e) => Number(e.number) === Number(episodeNumber))
    if (!ep?.id) continue
    return { provider, slug: ep.id.split('/').pop() }
  }

  throw new Error(`Episode ${episodeNumber} not found on Miruro`)
}

async function resolveStreamUrl(anilistId, provider, slug, signal) {
  const params = new URLSearchParams({ provider, anilistId, category: CATEGORY, slug })
  const json = await getJson(`${BASE}/stream?${params}`, signal)
  const stream = pickStream(json)
  if (!stream?.url) throw new Error('No playable Miruro source')
  return stream
}

export async function resolveMiruroStream({ title, episodeNumber, anilistId, timeoutMs = TIMEOUT_MS * 2 }) {
  if (!title || !episodeNumber) return null

  const key = `miruro:stream:${anilistId || title}:${episodeNumber}`
  const cached = cacheGet(key)
  if (cached) return cached

  const resolve = async (signal) => {
    const id = anilistId || (await resolveAnilistId(title, signal))
    const { provider, slug } = await resolveEpisodeTarget(id, episodeNumber, signal)
    const stream = await resolveStreamUrl(id, provider, slug, signal)
    return {
      url: stream.url,
      quality: stream.quality || stream.label || 'auto',
      provider: 'Miruro',
      providerName: provider,
      anilistId: id,
      base: BASE,
    }
  }

  const timeoutController = new AbortController()
  const timer = setTimeout(() => timeoutController.abort(), timeoutMs)
  try {
    const result = await Promise.race([
      withTimeout(resolve, timeoutMs),
      new Promise((_, reject) =>
        timeoutController.signal.addEventListener('abort', () => reject(new Error('Timed out'))),
      ),
    ])
    cacheSet(key, result)
    return result
  } finally {
    clearTimeout(timer)
  }
}

export default { resolveMiruroStream }
