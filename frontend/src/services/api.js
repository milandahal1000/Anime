import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

let refreshPromise = null

api.interceptors.request.use((config) => {
  const access = localStorage.getItem('access')
  if (access) {
    config.headers.Authorization = `Bearer ${access}`
  }
  return config
})

const refreshAccess = async () => {
  const refresh = localStorage.getItem('refresh')
  if (!refresh) {
    throw new Error('No refresh token available')
  }
  const { data } = await axios.post('/api/auth/refresh/', { refresh })
  localStorage.setItem('access', data.access)
  return data.access
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (
      error.response?.status === 401 &&
      !original._retry &&
      localStorage.getItem('refresh')
    ) {
      original._retry = true
      try {
        if (!refreshPromise) {
          refreshPromise = refreshAccess().finally(() => {
            refreshPromise = null
          })
        }
        const access = await refreshPromise
        original.headers.Authorization = `Bearer ${access}`
        return api(original)
      } catch {
        localStorage.removeItem('access')
        localStorage.removeItem('refresh')
      }
    }
    return Promise.reject(error)
  },
)

export const authApi = {
  register: (data) => api.post('/auth/register/', data),
  login: (data) => api.post('/auth/login/', data),
  logout: (refresh) => api.post('/auth/logout/', { refresh }),
  me: () => api.get('/auth/me/'),
  favorites: {
    list: () => api.get('/auth/me/favorites/'),
    add: (animeId) => api.post('/auth/me/favorites/', { anime_id: animeId }),
    remove: (animeId) => api.delete(`/auth/me/favorites/${animeId}/`),
  },
  watchHistory: {
    list: () => api.get('/auth/me/watch-history/'),
    upsert: (data) => api.post('/auth/me/watch-history/', data),
  },
}

export const contentApi = {
  anime: (params) => api.get('/anime/', { params }),
  animeDetail: (id) => api.get(`/anime/${id}/`),
  animeEpisodes: (id, params) => api.get(`/anime/${id}/episodes/`, { params }),
  episode: (id) => api.get(`/episodes/${id}/`),
  genres: () => api.get('/genres/'),
}

export default api
