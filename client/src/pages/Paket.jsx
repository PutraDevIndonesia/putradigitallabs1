import { Link } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'
import { EmptyState, ErrorBlock, LoadingBlock, PageHeader } from '../components/ui.jsx'
import { useI18n } from '../i18n/index.jsx'
import { publicApi } from '../lib/api.js'
import { formatRupiah, pick, pickList } from '../lib/format.js'
import { useAsync } from '../lib/useAsync.js'
import { useDocumentTitle } from '../lib/useDocumentTitle.js'

export default function Paket() {
  const { t, locale } = useI18n()
  useDocumentTitle(t('plans.title'))

  const { data: packages, loading, error, reload } = useAsync(() => publicApi.listPackages(), [])
  const pricingNotes = t('plans.pricingNotes')

  return (
    <>
      <PageHeader eyebrow={t('plans.eyebrow')} title={t('plans.title')} lede={t('plans.lede')} />

      <section className="section section--plain">
        <div className="container">
          {loading ? <LoadingBlock rows={3} /> : null}
          {error ? <ErrorBlock error={error} onRetry={reload} /> : null}

          {!loading && !error && packages.length === 0 ? (
            <EmptyState
              title={t('work.emptyTitle')}
              body={t('admin.overview.seedReminder')}
              action={
                <Link to="/brief" className="btn btn--outline btn--sm">
                  {t('plans.priceFallback')}
                </Link>
              }
            />
          ) : null}

          {(packages || []).length > 0 ? (
            <div className="plans">
              {(packages || []).map((plan) => {
                const price = formatRupiah(plan.priceFrom, locale)
                const features = pickList(plan, 'features', locale)
                const delivery = pick(plan, 'delivery', locale)

                return (
                  <article className={`plan${plan.recommended ? ' plan--recommended' : ''}`} key={plan.id}>
                    <div className="cluster" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h3>{pick(plan, 'name', locale)}</h3>
                      {plan.recommended ? <span className="badge badge--brand">{t('plans.recommended')}</span> : null}
                    </div>

                    <p className="muted" style={{ fontSize: 'var(--step-2)' }}>
                      {pick(plan, 'tagline', locale)}
                    </p>

                    <p className="plan__price">
                      {price || pick(plan, 'priceNote', locale) || t('plans.priceFallback')}
                    </p>

                    {features.length > 0 ? (
                      <>
                        <span className="mono muted">{t('plans.includes')}</span>
                        <ul className="plan__features">
                          {features.map((feature) => (
                            <li key={feature}>
                              <Check size={15} aria-hidden="true" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : null}

                    <div className="plan__foot">
                      <span className="mono muted">
                        {t('plans.deliveryLabel')}: {delivery || '-'}
                      </span>
                      <Link to="/brief" state={{ projectType: plan.slug }} className="btn btn--outline btn--sm">
                        {t('plans.ctaPerPlan')}
                      </Link>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : null}

          {!loading && (packages || []).length > 0 ? (
            <p className="muted" style={{ marginTop: 20, fontSize: 'var(--step-2)' }}>
              {t('plans.introNote')}
            </p>
          ) : null}
        </div>
      </section>

      <section className="section">
        <div className="container split split--2">
          <div className="section__head" style={{ marginBottom: 0 }}>
            <h2>{t('plans.pricingTitle')}</h2>
            <p className="lede">{t('plans.pricingLede')}</p>
          </div>

          <ul className="plan__features" style={{ fontSize: 'var(--step-3)' }}>
            {(Array.isArray(pricingNotes) ? pricingNotes : []).map((note) => (
              <li key={note}>
                <Check size={16} aria-hidden="true" />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="container" style={{ marginTop: 32 }}>
          <Link to="/brief" className="btn btn--primary">
            {t('services.ctaButton')}
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  )
}
