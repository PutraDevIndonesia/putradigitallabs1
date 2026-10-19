import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { ServiceIcon } from '../components/ServiceIcon.jsx'
import { EmptyState, ErrorBlock, LoadingBlock, PageHeader } from '../components/ui.jsx'
import { useI18n } from '../i18n/index.jsx'
import { publicApi } from '../lib/api.js'
import { pick } from '../lib/format.js'
import { useAsync } from '../lib/useAsync.js'
import { useDocumentTitle } from '../lib/useDocumentTitle.js'

export default function Layanan() {
  const { t, locale } = useI18n()
  useDocumentTitle(t('services.title'))

  const { data: services, loading, error, reload } = useAsync(() => publicApi.listServices(), [])

  return (
    <>
      <PageHeader eyebrow={t('services.eyebrow')} title={t('services.title')} lede={t('services.lede')} />

      <section className="section section--plain">
        <div className="container">
          {loading ? <LoadingBlock rows={5} /> : null}
          {error ? <ErrorBlock error={error} onRetry={reload} /> : null}

          {!loading && !error && services.length === 0 ? (
            <EmptyState
              title={t('work.emptyTitle')}
              body={t('admin.overview.seedReminder')}
              action={
                <Link to="/brief" className="btn btn--outline btn--sm">
                  {t('services.ctaButton')}
                </Link>
              }
            />
          ) : null}

          {(services || []).map((service) => (
            <article className="service-row" key={service.id}>
              <span className="service-row__icon">
                <ServiceIcon name={service.icon} />
              </span>
              <div>
                <h3>{pick(service, 'title', locale)}</h3>
                <p>{pick(service, 'summary', locale)}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="container split split--2">
          <div className="stack stack--tight">
            <h2>{t('services.ctaTitle')}</h2>
            <p className="lede">{t('services.ctaBody')}</p>
          </div>
          <div className="cluster" style={{ alignSelf: 'end' }}>
            <Link to="/brief" className="btn btn--primary">
              {t('services.ctaButton')}
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <Link to="/paket" className="btn btn--outline">
              {t('nav.plans')}
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
