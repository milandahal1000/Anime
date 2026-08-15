import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Navbar() {
  const { user, isAuthenticated, isLoading, logout } = useAuth()

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="brand">
          Otaku<span>Hub</span>
        </Link>
        <nav className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/browse">Browse</Link>
          {isAuthenticated && <Link to="/profile">Profile</Link>}
        </nav>
        <div className="nav-actions">
          {isLoading ? null : isAuthenticated ? (
            <>
              <Link to="/profile" className="btn">
                {user?.username}
              </Link>
              <button type="button" className="btn btn-ghost" onClick={logout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost">
                Login
              </Link>
              <Link to="/register" className="btn btn-primary">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
