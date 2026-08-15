import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthProvider'
import { FavoritesProvider } from './context/FavoritesProvider'

const AnimeDetail = lazy(() => import('./pages/AnimeDetail'))
const Browse = lazy(() => import('./pages/Browse'))
const Home = lazy(() => import('./pages/Home'))
const Login = lazy(() => import('./pages/Login'))
const Profile = lazy(() => import('./pages/Profile'))
const Register = lazy(() => import('./pages/Register'))
const Watch = lazy(() => import('./pages/Watch'))

function NotFound() {
  return (
    <div className="empty" style={{ paddingTop: 80 }}>
      <h1>404</h1>
      <p>Page not found.</p>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <FavoritesProvider>
        <BrowserRouter>
          <Suspense fallback={<div className="loader">Loading&hellip;</div>}>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<Home />} />
                <Route path="/browse" element={<Browse />} />
                <Route path="/anime/:id" element={<AnimeDetail />} />
                <Route path="/watch/:animeId/:episodeId" element={<Watch />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route element={<ProtectedRoute />}>
                  <Route path="/profile" element={<Profile />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </FavoritesProvider>
    </AuthProvider>
  )
}

export default App
