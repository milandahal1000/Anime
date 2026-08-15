import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Navbar() {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const [open, setOpen] = useState(false)

  const close = () => setOpen(false)

  const handleLogout = () => {
    close()
    logout()
  }

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="brand" onClick={close}>
          Otaku<span>Hub</span>
        </Link>
        <nav className={`nav-links ${open ? 'open' : ''}`}>
          <Link to="/" onClick={close}>
            Home
          </Link>
          <Link to="/browse" onClick={close}>
            Browse
          </Link>
          {isAuthenticated && (
            <Link to="/profile" onClick={close}>
              Profile
            </Link>
          )}
          {isLoading ? null : isAuthenticated ? (
            <div className="nav-auth-mobile">
              <Link to="/profile" onClick={close} className="btn">
                {user?.username}
              </Link>
              <button type="button" className="btn btn-ghost" onClick={handleLogout}>
                Logout
              </button>
            </div>
          ) : (
            <div className="nav-auth-mobile">
              <Link to="/login" onClick={close} className="btn">
                Login
              </Link>
              <Link to="/register" onClick={close} className="btn btn-primary">
                Sign up
              </Link>
            </div>
          )}
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
        <button
          type="button"
          className={`nav-toggle ${open ? 'open' : ''}`}
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </header>
  )
}
