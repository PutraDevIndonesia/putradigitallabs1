import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, ExternalLink } from 'lucide-react'
import { EmptyState, ErrorBlock, LoadingBlock } from '../components/ui.jsx'
import { useI18n } from '../i18n/index.jsx'
import { publicApi } from '../lib/api.js'
import { pick, toParagraphs } from '../lib/format.js'
import { useAsync } from '../lib/useAsync.js'
import { useDocumentTitle } from '../lib/useDocumentTitle.js'

export default function PortofolioDetail() {
  const { slug } = useParams()
  const { t, locale } = useI18n()
  const { data: item, loading, error, reload } = useAsync(() => publicApi.getPortfolio(slug), [slug])

  useDocumentTitle(item ? pick(item, 'title', locale) : t('work.title'))

  const stack = Array.isArray(item?.stack) ? item.stack : []
  const paragraphs = toParagraphs(pick(item, 'body', locale))

  return (
    <section className="section section--plain">
      <div className="container stack stack--loose">
        <Link to="/portofolio" className="btn btn--quiet btn--sm" style={{ width: 'fit-content' }}>
          <ChevronLeft size={16} aria-hidden="true" />
          {t('work.backToList')}
        </Link>

        {loading ? <LoadingBlock rows={4} /> : null}
        {error ? <ErrorBlock error={error} onRetry={reload} /> : null}

        {!loading && !error && !item ? (
          <EmptyState
            title={t('work.emptyTitle')}
            body={t('work.emptyBody')}
            action={
              <Link to="/portofolio" className="btn btn--outline btn--sm">
                {t('work.backToList')}
              </Link>
            }
          />
        ) : null}

        {item ? (
          <article className="stack stack--loose">
            {item.coverImage ? (
              <div className="work-detail__cover-16-9">
                <img src={item.coverImage} alt={pick(item, 'title', locale)} loading="lazy" />
              </div>
            ) : null}

            <div className="split split--2">
              <header className="stack stack--tight">
              <p className="eyebrow">{t(`projectType.${item.category}`)}</p>
              <h1 style={{ fontSize: 'var(--step-5)' }}>{pick(item, 'title', locale)}</h1>
              <p className="lede">{pick(item, 'summary', locale)}</p>

              <dl className="stack stack--tight" style={{ marginTop: 12 }}>
                {item.client ? (
                  <div className="detail-row">
                    <dt className="detail-row__label">{t('work.clientLabel')}</dt>
                    <dd className="detail-row__value" style={{ margin: 0 }}>
                      {item.client}
                    </dd>
                  </div>
                ) : null}
                {item.year ? (
                  <div className="detail-row">
                    <dt className="detail-row__label">{t('work.yearLabel')}</dt>
                    <dd className="detail-row__value" style={{ margin: 0 }}>
                      {item.year}
                    </dd>
                  </div>
                ) : null}
                {stack.length > 0 ? (
                  <div className="detail-row">
                    <dt className="detail-row__label">{t('work.stackLabel')}</dt>
                    <dd className="cluster" style={{ margin: 8, padding: 0 }}>
                      {stack.map((tech) => (
                        <span className="chip" key={tech}>
                          {tech}
                        </span>
                      ))}
                    </dd>
                  </div>
                ) : null}
              </dl>

              {item.url ? (
                <a
                  className="btn btn--outline btn--sm"
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ width: 'fit-content' }}
                >
                  {t('work.openSite')}
                  <ExternalLink size={15} aria-hidden="true" />
                </a>
              ) : null}
            </header>

            <div className="prose">
              {paragraphs.length > 0 ? (
                paragraphs.map((paragraph) => <p key={paragraph.slice(0, 40)}>{paragraph}</p>)
              ) : (
                <p className="muted">{pick(item, 'summary', locale)}</p>
              )}
            </div>
          </div>
        </article>
        ) : null}
      </div>
    </section>
  )
}
