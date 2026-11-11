import { LanguageGuide } from '@/components/LanguageGuide'
import { t, useLocale } from '@/lib/i18n'

export function GuidePage() {
  useLocale()
  return <div className="stack"><h1>{t('LWLang guide')}</h1><LanguageGuide /></div>
}
