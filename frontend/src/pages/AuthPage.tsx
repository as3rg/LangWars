import { t, useLocale } from '@/lib/i18n'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { LogIn, ShieldCheck, UserPlus } from 'lucide-react'
import { useLogin, useLogout, useRegister, useSession } from '@/api/hooks'
import { api, ApiError } from '@/api/client'
import { CatMascot } from '@/components/CatMascot'
import { Avatar, Badge, GlowButton, LinkButton, Panel } from '@/components/ui'
import { toast } from '@/store/ui'
import { inviteFromFragment } from '@/lib/invites'

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Login failed'
}

export function AuthPage() {
  useLocale()
  const { user, isAdmin } = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const login = useLogin()
  const register = useRegister()
  const logout = useLogout()
  const config = useQuery({ queryKey: ['config'], queryFn: api.config })

  const [mode, setMode] = useState<'login' | 'register'>(() => inviteFromFragment(location.hash) ? 'register' : 'login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState(() => inviteFromFragment(location.hash))

  useEffect(() => {
    const code = inviteFromFragment(location.hash)
    if (code) {
      setInviteCode(code)
      setMode('register')
    }
    if (new URLSearchParams(location.hash.slice(1)).has('invite')) {
      window.history.replaceState(window.history.state, '', location.pathname + location.search)
    }
  }, [location.hash, location.pathname, location.search])

  const doLogin = (name = username, pass = password) => {
    login.mutate(
      { username: name, password: pass },
      {
        onSuccess: (data) => {
          toast('success', t('Welcome back, {name}.', { name: data.user.displayName }))
          navigate('/tasks')
        },
      },
    )
  }

  const doRegister = () => {
    register.mutate(
      { username, password, inviteCode: inviteCode || undefined },
      {
        onSuccess: (data) => {
          toast('success', t('Account created: {name}', { name: data.user.username }))
          navigate('/tasks')
        },
      },
    )
  }

  if (user) {
    return (
      <div className="auth-wrap">
        <Panel className="auth-card panel-accent">
          <div className="row" style={{ gap: 16 }}>
            <Avatar username={user.username} hue={user.avatarHue} size="lg" />
            <div>
              <div className="eyebrow">{t("session active")}</div>
              <h2 style={{ fontSize: 24, margin: '4px 0' }}>{user.displayName}</h2>
              <div className="row wrap" style={{ gap: 6 }}>
                <Badge tone="cyan">{user.rating} {t("rating")}</Badge>
                <Badge tone="violet">{user.solvedCount} {t("solved")}</Badge>
                {isAdmin && (
                  <Badge tone="amber">
                    <ShieldCheck size={10} /> {t("admin")}</Badge>
                )}
              </div>
            </div>
          </div>

          <div className="row wrap mt-24" style={{ gap: 10 }}>
            <LinkButton to="/tasks" variant="primary">
              {t("Go to tasks")}</LinkButton>
            {isAdmin && (
              <LinkButton to="/admin" icon={<ShieldCheck size={13} />}>
                {t("Admin pane")}</LinkButton>
            )}
            <GlowButton
              variant="danger"
              onClick={() =>
                logout.mutate(undefined, {
                  onSettled: () => toast('info', 'Logged out.'),
                })
              }
            >
              {t("Log out")}</GlowButton>
          </div>
        </Panel>
      </div>
    )
  }

  return (
    <div className="auth-wrap">
      <Panel className="auth-card panel-accent">
        <div className="row" style={{ gap: 16, marginBottom: 20 }}>
          <CatMascot size={72} mood={mode === 'login' ? 'idle' : 'happy'} />
          <div>
            <div className="eyebrow">{t("terminal access")}</div>
            <h2 style={{ fontSize: 24, margin: '4px 0' }}>{mode === "login" ? t("Sign in") : t("Create account")}</h2>
            <div className="muted" style={{ fontSize: 12.5 }}>
              {t("The cat checks your token, not your vibes.")}</div>
          </div>
        </div>

        <div className="auth-tabs">
          <button
            className={mode === 'login' ? 'filter-chip active' : 'filter-chip'}
            onClick={() => setMode('login')}
          >
            {t("login")}</button>
          <button
            className={mode === 'register' ? 'filter-chip active' : 'filter-chip'}
            disabled={config.data?.registrationMode === 'closed'}
            onClick={() => setMode('register')}
          >
            {t("register")}</button>
        </div>

        <div className="stack">
          {config.data?.registrationMode === "closed" && <p className="muted">{t("Registration is currently closed.")}</p>}
          {mode === "register" && config.data?.registrationMode === "invite" && (
            <div className="field">
              <label htmlFor="auth-invite">{t("Invitation code")}</label>
              <input id="auth-invite" className="input" value={inviteCode} autoComplete="off" onChange={(event) => setInviteCode(event.target.value)} />
            </div>
          )}
          <div className="field">
            <label htmlFor="auth-username">{t("Login")}</label>
            <input
              id="auth-username"
              className="input"
              value={username}
              autoComplete="username"
              onChange={(event) => setUsername(event.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="auth-password">{t("password")}</label>
            <input
              id="auth-password"
              className="input"
              type="password"
              minLength={mode === 'register' ? 12 : undefined}
              value={password}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  if (mode === 'login') doLogin()
                  else doRegister()
                }
              }}
            />
          </div>

          {(login.error || register.error) && (
            <div className="form-error">{t(errorMessage(login.error ?? register.error))}</div>
          )}

          {mode === "login" ? (
            <GlowButton
              variant="primary"
              loading={login.isPending}
              icon={<LogIn size={14} />}
              onClick={() => doLogin()}
            >
              {t("Sign in")}</GlowButton>
          ) : (
            <GlowButton
              variant="primary"
              loading={register.isPending}
              icon={<UserPlus size={14} />}
              onClick={doRegister}
            >
              {t("Register")}</GlowButton>
          )}
        </div>

      </Panel>
    </div>
  )
}
