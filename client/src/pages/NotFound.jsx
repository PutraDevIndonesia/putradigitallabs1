import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/index.jsx'
import { useDocumentTitle } from '../lib/useDocumentTitle.js'

export default function NotFound() {
  const { t } = useI18n()
  useDocumentTitle('404')

  return (
    <section className="section section--plain">
      <div className="container stack">
        <p className="eyebrow">404</p>
        <h1 style={{ fontSize: 'var(--step-5)' }}>{t('errors.not_found')}</h1>
        <p className="lede">{t('footer.aboutBody')}</p>
        <div className="cluster">
          <Link to="/" className="btn btn--primary">
            {t('common.back')}
          </Link>
          <Link to="/brief" className="btn btn--outline">
            {t('nav.brief')}
          </Link>
        </div>
      </div>
    </section>
  )
}
