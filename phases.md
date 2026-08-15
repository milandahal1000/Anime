# Anime Streaming Website - Development Phases

An anime streaming platform built with a **React** frontend and a **Django** backend, split into separate folders for clean separation of concerns.

---

## Phase 1: Project Setup & Structure

- [ ] Create root project structure with `frontend/` and `backend/` folders
- [ ] Set up Django backend:
  - [ ] Django project + virtual environment
  - [ ] Configure settings, CORS, and environment variables
- [ ] Set up React frontend:
  - [ ] Vite + React project
  - [ ] Configure proxy to backend during development
- [ ] Version control with git + `.gitignore`

## Phase 2: Database & Models

- [ ] Design database schema:
  - [ ] Anime (title, synopsis, genres, studio, release year, cover image)
  - [ ] Episode (anime FK, number, title, video URL, thumbnail)
  - [ ] Genre / Tag
  - [ ] User profile (watch history, favorites)
- [ ] Create Django models + migrations
- [ ] Create seed/management commands to populate sample data

## Phase 3: Backend API (Django REST Framework)

- [ ] Install & configure DRF
- [ ] Build serializers for Anime, Episode, Genre, User
- [ ] Endpoints:
  - [ ] GET /api/anime/ (list, filter by genre/search/sort)
  - [ ] GET /api/anime/:id/ (detail)
  - [ ] GET /api/anime/:id/episodes/
  - [ ] GET /api/episodes/:id/ (stream/video info)
  - [ ] GET /api/genres/
  - [ ] Auth: register/login/logout (JWT or session)
  - [ ] User favorites + watch history
- [ ] Pagination, filtering, and search support
- [ ] Admin panel for managing content

## Phase 4: Frontend Core (React)

- [ ] Project structure (components, pages, services, hooks)
- [ ] Routing (react-router)
- [ ] API client/service layer (axios)
- [ ] State management (Context or Redux/Zustand)
- [ ] Theme & global styles

## Phase 5: Frontend Pages

- [ ] Home page (hero banner, trending, continue watching)
- [ ] Browse/Search page (filter by genre, search, sort)
- [ ] Anime detail page (info, episode list)
- [ ] Watch page (video player, episode switching)
- [ ] Auth pages (login/signup)
- [ ] Profile page (favorites, watch history)
- [ ] Responsive design (mobile-friendly)

## Phase 6: Video Streaming & Player

- [ ] Integrate video player (e.g., hls.js / video.js / react-player)
- [ ] Support HLS/adaptive streaming
- [ ] Resume playback (continue watching)
- [ ] Episode switching within player

## Phase 7: User Features & Auth Integration

- [ ] Connect frontend auth flows to backend
- [ ] Favorites (add/remove)
- [ ] Watch history tracking
- [ ] User-specific "Continue Watching"

## Phase 8: Performance & Optimization

- [ ] Image lazy loading & CDN-ready assets
- [ ] Code splitting / lazy loading routes
- [ ] Caching (frontend + backend)
- [ ] Database query optimization (select_related, prefetch_related)
- [ ] SEO meta tags

## Phase 9: Deployment & Production

- [ ] Build frontend for production
- [ ] Configure static/media file serving
- [ ] Deploy backend (gunicorn/uWSGI + nginx) and frontend (Vercel/Netlify/same server)
- [ ] Environment-specific configs (.env.production, etc.)
- [ ] Docker setup (optional)

## Phase 10: Testing & Polish

- [ ] Backend tests (models, API, auth)
- [ ] Frontend tests (components, services)
- [ ] E2E testing (optional)
- [ ] Final UI/UX polish, error handling, loading states
- [ ] Documentation (README)
