import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'

export default function Layout() {
  return (
    <>
      <Navbar />
      <main className="main">
        <div className="container">
          <Outlet />
        </div>
      </main>
      <footer className="muted" style={{ textAlign: 'center', padding: '24px 0' }}>
        OtakuHub &middot; React + Django
      </footer>
    </>
  )
}
