import { Link } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'
import { ServiceIcon } from '../components/ServiceIcon.jsx'
import { EmptyState, ErrorBlock, LoadingBlock, SectionHead } from '../components/ui.jsx'
import { useI18n } from '../i18n/index.jsx'
import { publicApi } from '../lib/api.js'
import { formatRupiah, pick, pickList } from '../lib/format.js'
import { useAsync } from '../lib/useAsync.js'
import { useDocumentTitle } from '../lib/useDocumentTitle.js'

export default function Home() {
  const { t, locale } = useI18n()
  useDocumentTitle(t('home.eyebrow'))

  const { data, loading, error, reload } = useAsync(
    () =>
      Promise.all([
        publicApi.listServices(),
        publicApi.listPackages(),
        publicApi.listPortfolio(),
        publicApi.listArticles(),
      ]),
    [],
  )

  const [services, packages, portfolio, articles] = data || [[], [], [], []]
  const process = t('home.process')
  const deliverables = t('home.deliverables')

  return (
    <>
      <section className="hero">
        <div className="container split split--hero">
          <div className="reveal">
            <p className="eyebrow">{t('home.eyebrow')}</p>
            <h1>{t('home.title')}</h1>
            <p className="lede">{t('home.lede')}</p>
            <div className="hero__actions">
              <Link to="/brief" className="btn btn--primary">
                {t('home.ctaPrimary')}
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <a href="#cara-kerja" className="btn btn--outline">
                {t('home.ctaSecondary')}
              </a>
            </div>
          </div>

          <aside className="hero__panel">
            <p className="hero__panel-head">{t('home.deliverablesTitle')}</p>
            <ol className="deliverables">
              {(Array.isArray(deliverables) ? deliverables : []).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </aside>
        </div>
      </section>

      <section className="section" id="cara-kerja">
        <div className="container">
          <SectionHead
            eyebrow={t('home.processEyebrow')}
            title={t('home.processTitle')}
            lede={t('home.processLede')}
          />
          <ol className="process">
            {(Array.isArray(process) ? process : []).map((step, index) => (
              <li className="process__item" key={step.title}>
                <span className="process__index">{String(index + 1).padStart(2, '0')}</span>
                <h3>{step.title}</h3>
                <p className="muted" style={{ fontSize: 'var(--step-2)' }}>
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHead
            eyebrow={t('home.servicesEyebrow')}
            title={t('home.servicesTitle')}
            lede={t('home.servicesLede')}
          />

          {loading ? <LoadingBlock rows={4} /> : null}
          {error ? <ErrorBlock error={error} onRetry={reload} /> : null}
          {!loading && !error && services.length === 0 ? (
            <EmptyState title={t('work.emptyTitle')} body={t('admin.overview.seedReminder')} />
          ) : null}

          {services.length > 0
            ? services.map((service) => (
                <article className="service-row" key={service.id}>
                  <span className="service-row__icon">
                    <ServiceIcon name={service.icon} />
                  </span>
                  <div>
                    <h3>{pick(service, 'title', locale)}</h3>
                    <p>{pick(service, 'summary', locale)}</p>
                  </div>
                </article>
              ))
            : null}

          {!loading && !error && services.length > 0 ? (
            <div style={{ marginTop: 28 }}>
              <Link to="/layanan" className="btn btn--outline">
                {t('home.servicesCta')}
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>
          ) : null}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHead eyebrow={t('home.plansEyebrow')} title={t('home.plansTitle')} lede={t('home.plansLede')} />

          {loading ? <LoadingBlock rows={3} /> : null}

          {packages.length > 0 ? (
            <div className="plans">
              {packages.map((plan) => {
                const price = formatRupiah(plan.priceFrom, locale)
                const features = pickList(plan, 'features', locale)
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
                      <ul className="plan__features">
                        {features.map((feature) => (
                          <li key={feature}>
                            <Check size={15} aria-hidden="true" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <div className="plan__foot">
                      <span className="mono muted">
                        {t('plans.deliveryLabel')}: {pick(plan, 'delivery', locale) || '-'}
                      </span>
                      <Link to="/brief" className="btn btn--outline btn--sm">
                        {t('plans.ctaPerPlan')}
                      </Link>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : null}

          {!loading && packages.length > 0 ? (
            <p className="muted" style={{ marginTop: 20, fontSize: 'var(--step-2)' }}>
              {t('plans.introNote')}
            </p>
          ) : null}
        </div>
      </section>

      {portfolio.length > 0 ? (
        <section className="section">
          <div className="container">
            <SectionHead eyebrow={t('home.workEyebrow')} title={t('home.workTitle')} lede={t('home.workLede')} />
            <div className="work-grid">
              {portfolio.slice(0, 3).map((item) => (
                <Link className="work" to={`/portofolio/${item.slug}`} key={item.id}>
                  {item.coverImage ? (
                    <img className="work__cover" src={item.coverImage} alt="" loading="lazy" />
                  ) : (
                    <span className="work__cover work__cover--empty">{item.slug}</span>
                  )}
                  <div className="work__body">
                    <div className="work__meta">
                      <span>{t(`projectType.${item.category}`)}</span>
                      {item.year ? <span>{item.year}</span> : null}
                    </div>
                    <h3>{pick(item, 'title', locale)}</h3>
                    <p>{pick(item, 'summary', locale)}</p>
                  </div>
                </Link>
              ))}
            </div>
            <div style={{ marginTop: 28 }}>
              <Link to="/portofolio" className="btn btn--outline">
                {t('home.workCta')}
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {articles.length > 0 ? (
        <section className="section">
          <div className="container">
            <SectionHead eyebrow={t('home.blogEyebrow')} title={t('home.blogTitle')} lede={t('home.blogLede')} />
            <div className="post-list">
              {articles.slice(0, 4).map((article) => (
                <Link className="post" to={`/artikel/${article.slug}`} key={article.id}>
                  <time dateTime={article.publishedAt || article.createdAt}>
                    {article.publishedAt || article.createdAt || ''}
                  </time>
                  <h3>{pick(article, 'title', locale)}</h3>
                  <p>{pick(article, 'excerpt', locale)}</p>
                </Link>
              ))}
            </div>
            <div style={{ marginTop: 28 }}>
              <Link to="/artikel" className="btn btn--outline">
                {t('home.blogCta')}
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      ) : null}

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
            <Link to="/lacak" className="btn btn--outline">
              {t('nav.track')}
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
