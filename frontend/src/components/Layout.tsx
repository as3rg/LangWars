import { Link, NavLink, Outlet } from 'react-router-dom'
import { LogOut, ScanLine, ShieldCheck } from 'lucide-react'
import clsx from 'clsx'
import { CatMascot } from './CatMascot'
import { Avatar, LinkButton } from './ui'
import { ToastHost } from './ToastHost'
import { NotificationBell } from './NotificationBell'
import { useSession, useLogout } from '@/api/hooks'
import { useUiStore, toast } from '@/store/ui'
import { useLocale, t } from '@/lib/i18n'
import { useEffect } from 'react'
import { formatNumber } from '@/lib/numbers'

const NAV = [
  { to: '/', label: 'News', end: true },
  { to: '/tasks', label: 'Tasks' },
  { to: '/submissions', label: 'Submissions' },
  { to: '/rating', label: 'Rating' },
  { to: '/world', label: 'World' },
  { to: '/guide', label: 'Guide' },
]

export function Layout() {
  const { locale, setLocale } = useLocale()
  useEffect(() => { document.documentElement.lang = locale }, [locale])
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
          <Link to="/" className="brand" aria-label={t("LangWars home")}>
            <CatMascot size={38} animated={false} className="brand-mark" />
            <span>
              <span className="brand-title">{t("LANGWARS")}</span>
              <span className="brand-sub">{t("lwlang arena")}</span>
            </span>
          </Link>

          <nav className="nav-links" aria-label={t("Main")}>
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end}>
                {t(item.label)}
              </NavLink>
            ))}
            {isAdmin && (
              <NavLink to="/admin">
                <span className="row" style={{ gap: 6 }}>
                  <ShieldCheck size={13} /> {t("Admin")}</span>
              </NavLink>
            )}
          </nav>

          <div className="header-actions">
            <button className="icon-btn mono" onClick={() => setLocale(locale === 'ru' ? 'en' : 'ru')} aria-label={t('Change language')} title={locale === "ru" ? t("Switch to English") : 'Переключить на русский'} style={{ minWidth: 34 }}>{locale.toUpperCase()}</button>
            <button
              className="icon-btn"
              onClick={toggleScanlines}
              aria-label={scanlines ? t("Disable scanlines") : t("Enable scanlines")}
              title={scanlines ? t("CRT effect: on") : t("CRT effect: off")}
            >
              <ScanLine size={16} />
            </button>

            {user ? (
              <>
                <NotificationBell />
                <Link to="/rating" className="user-chip" title={t("Global rating")}>
                  <Avatar username={user.username} hue={user.avatarHue} />
                  <span className="mono" style={{ fontSize: 12 }}>
                    {user.username}
                  </span>
                  <span className="rating">{formatNumber(user.rating)}</span>
                </Link>
                <button className="icon-btn" onClick={handleLogout} aria-label={t("Log out")} title={t("Log out")}>
                  <LogOut size={15} />
                </button>
              </>
            ) : (
              <LinkButton to="/auth" variant="primary" size="sm">
                {t("Sign in")}</LinkButton>
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
          <span>{t("LANGWARS // one shared world")}</span>
          <span className="muted">{t("Neko-9 says: ship it, senpai.")}</span>
          <span>{t("LWLang v0.3 · build 2026.11")}</span>
        </div>
      </footer>

      <ToastHost />
    </div>
  )
}
