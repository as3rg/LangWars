import clsx from 'clsx'
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import type { Difficulty, VerdictStatus } from '@/api/types'

export function Panel({
  accent,
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { accent?: boolean }) {
  return (
    <div className={clsx('panel', accent && 'panel-accent', className)} {...rest}>
      {children}
    </div>
  )
}

type ButtonVariant = 'primary' | 'ghost' | 'danger'

interface GlowButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: ReactNode
}

export function GlowButton({
  variant = 'ghost',
  size = 'md',
  loading = false,
  icon,
  className,
  children,
  disabled,
  ...rest
}: GlowButtonProps) {
  return (
    <button
      className={clsx(
        'btn',
        `btn-${variant}`,
        size === 'sm' && 'btn-sm',
        size === 'lg' && 'btn-lg',
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <span className="spinner" aria-hidden="true" /> : icon}
      {children}
    </button>
  )
}

interface LinkButtonProps extends LinkProps {
  variant?: ButtonVariant
  size?: 'sm' | 'md' | 'lg'
  icon?: ReactNode
}

export function LinkButton({
  variant = 'ghost',
  size = 'md',
  icon,
  className,
  children,
  ...rest
}: LinkButtonProps) {
  return (
    <Link
      className={clsx(
        'btn',
        `btn-${variant}`,
        size === 'sm' && 'btn-sm',
        size === 'lg' && 'btn-lg',
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </Link>
  )
}

export function Badge({
  children,
  tone = 'default',
  className,
}: {
  children: ReactNode
  tone?: 'default' | 'cyan' | 'magenta' | 'violet' | 'amber'
  className?: string
}) {
  return <span className={clsx('badge', tone !== 'default' && `badge-${tone}`, className)}>{children}</span>
}

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  nightmare: 'Nightmare',
}

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return <span className={clsx('badge', `diff-${difficulty}`)}>{DIFFICULTY_LABEL[difficulty]}</span>
}

export const STATUS_LABEL: Record<VerdictStatus, string> = {
  OK: 'Accepted',
  FAIL: 'Failed',
  WRONG_ANSWER: 'Wrong answer',
  TLE: 'Time limit',
  CE: 'Compile error',
}

export function StatusPill({ status }: { status: VerdictStatus }) {
  const className = status === 'OK' ? 'status-ok' : status === 'TLE' ? 'status-warn' : 'status-bad'
  return (
    <span className={clsx('status-pill', className)}>
      <span className={clsx('status-dot', status === 'OK' ? 'ok' : status === 'TLE' ? 'warn' : 'bad')} />
      {STATUS_LABEL[status]}
    </span>
  )
}

export function PixelDivider() {
  return <div className="pixel-divider" aria-hidden="true" />
}

export function EmptyState({
  title,
  children,
  icon,
}: {
  title: string
  children?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="empty-state">
      {icon}
      <h3>{title}</h3>
      {children ? <div className="muted">{children}</div> : null}
    </div>
  )
}

export function Loading({ label = 'summoning cats…' }: { label?: string }) {
  return (
    <div className="loading-block">
      <span className="spinner" aria-hidden="true" />
      {label}
    </div>
  )
}

export function ErrorNotice({ message }: { message: string }) {
  return <div className="error-box">{message}</div>
}

export function StatTile({
  label,
  value,
  icon,
}: {
  label: string
  value: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="panel stat-tile">
      <div className="row-between">
        <span className="stat-label">{label}</span>
        {icon}
      </div>
      <div className="stat-value">{value}</div>
    </div>
  )
}

export function Avatar({
  username,
  hue,
  size = 'sm',
}: {
  username: string
  hue: number
  size?: 'sm' | 'lg'
}) {
  const initials = username.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase() || '??'
  return (
    <span
      className={clsx('avatar', size === 'lg' && 'avatar-lg')}
      style={{
        background: `linear-gradient(140deg, hsl(${hue} 90% 66%), hsl(${(hue + 50) % 360} 90% 58%))`,
      }}
      aria-hidden="true"
    >
      {initials}
    </span>
  )
}

export function ScorePill({ score }: { score: number }) {
  return (
    <span className="badge badge-cyan" title="Task score">
      {score} pts
    </span>
  )
}
