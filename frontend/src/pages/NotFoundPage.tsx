import { t, useLocale } from '@/lib/i18n'
import { CatMascot } from '@/components/CatMascot'
import { LinkButton, Panel } from '@/components/ui'

export function NotFoundPage() {
  useLocale()
  return (
    <div style={{ maxWidth: 620, margin: '60px auto' }}>
      <Panel className="panel-pad" style={{ textAlign: 'center' }}>
        <CatMascot size={140} mood="sad" />
        <div className="eyebrow" style={{ marginTop: 16 }}>
          {t("404 · lost in the void")}</div>
        <h1 style={{ fontSize: 34, margin: '10px 0' }}>{t("This page has nine lives, none here.")}</h1>
        <p className="muted" style={{ marginBottom: 22 }}>
          {t("The cat searched the filesystem and found only crumbs. Check the URL, or head back to the arena.")}</p>
        <div className="row" style={{ justifyContent: 'center', gap: 10 }}>
          <LinkButton to="/" variant="primary">
            {t("News feed")}</LinkButton>
          <LinkButton to="/tasks">{t("Browse tasks")}</LinkButton>
        </div>
      </Panel>
    </div>
  )
}
