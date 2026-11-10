import { Link, NavLink, Outlet } from 'react-router-dom'
import { LogOut, ScanLine, ShieldCheck } from 'lucide-react'
import clsx from 'clsx'
import { CatMascot } from './CatMascot'
import { Avatar, LinkButton } from './ui'
import { ToastHost } from './ToastHost'
import { useSession, useLogout } from '@/api/hooks'
import { useUiStore, toast } from '@/store/ui'

const NAV = [
  { to: '/', label: 'News', end: true },
  { to: '/tasks', label: 'Tasks' },
  { to: '/submissions', label: 'Submissions' },
  { to: '/rating', label: 'Rating' },
]

export function Layout() {
  const { user, isAdmin } = useSession()
  const logout = useLogout()
  const scanlines = useUiStore((state) => state.scanlines)
  const toggleScanlines = useUiStore((state) => state.toggleScanlines)

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSettled: () => toast('info', 'Logged out. The cat will remember you.'),
    })
  }

  return (
    <div className={clsx('app-shell', scanlines && 'scanlines')}>
      <header className="site-header">
        <div className="shell header-inner">
          <Link to="/" className="brand" aria-label="LangWars home">
            <CatMascot size={38} animated={false} className="brand-mark" />
            <span>
              <span className="brand-title">LANGWARS</span>
              <span className="brand-sub">lwlang arena</span>
            </span>
          </Link>

          <nav className="nav-links" aria-label="Main">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end}>
                {item.label}
              </NavLink>
            ))}
            {isAdmin && (
              <NavLink to="/admin">
                <span className="row" style={{ gap: 6 }}>
                  <ShieldCheck size={13} /> Admin
                </span>
              </NavLink>
            )}
          </nav>

          <div className="header-actions">
            <button
              className="icon-btn"
              onClick={toggleScanlines}
              aria-label={scanlines ? 'Disable scanlines' : 'Enable scanlines'}
              title={scanlines ? 'CRT effect: on' : 'CRT effect: off'}
            >
              <ScanLine size={16} />
            </button>

            {user ? (
              <>
                <Link to="/rating" className="user-chip" title="Global rating">
                  <Avatar username={user.username} hue={user.avatarHue} />
                  <span className="mono" style={{ fontSize: 12 }}>
                    {user.username}
                  </span>
                  <span className="rating">{user.rating}</span>
                </Link>
                <button className="icon-btn" onClick={handleLogout} aria-label="Log out" title="Log out">
                  <LogOut size={15} />
                </button>
              </>
            ) : (
              <LinkButton to="/auth" variant="primary" size="sm">
                Sign in
              </LinkButton>
            )}
          </div>
        </div>
      </header>

      <main className="site-main">
        <div className="shell">
          <Outlet />
        </div>
      </main>

      <footer className="site-footer">
        <div className="shell footer-inner">
          <span>LANGWARS // frontend slice · mock backend online</span>
          <span className="muted">Neko-9 says: ship it, senpai.</span>
          <span>LWLang v0.3 · build 2026.11</span>
        </div>
      </footer>

      <ToastHost />
    </div>
  )
}
