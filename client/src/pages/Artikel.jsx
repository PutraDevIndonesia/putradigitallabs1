import { Link } from 'react-router-dom'
import { EmptyState, ErrorBlock, LoadingBlock, PageHeader } from '../components/ui.jsx'
import { useI18n } from '../i18n/index.jsx'
import { publicApi } from '../lib/api.js'
import { formatDate, pick } from '../lib/format.js'
import { useAsync } from '../lib/useAsync.js'
import { useDocumentTitle } from '../lib/useDocumentTitle.js'

export default function Artikel() {
  const { t, locale } = useI18n()
  useDocumentTitle(t('blog.title'))

  const { data: articles, loading, error, reload } = useAsync(() => publicApi.listArticles(), [])
  const items = Array.isArray(articles) ? articles : []

  return (
    <>
      <PageHeader eyebrow={t('blog.eyebrow')} title={t('blog.title')} lede={t('blog.lede')} />

      <section className="section section--plain">
        <div className="container">
          {loading ? <LoadingBlock rows={3} /> : null}
          {error ? <ErrorBlock error={error} onRetry={reload} /> : null}

          {!loading && !error && items.length === 0 ? (
            <EmptyState
              title={t('blog.emptyTitle')}
              body={t('blog.emptyBody')}
              action={
                <Link to="/brief" className="btn btn--outline btn--sm">
                  {t('blog.emptyCta')}
                </Link>
              }
            />
          ) : null}

          {items.length > 0 ? (
            <div className="post-list">
              {items.map((article) => (
                <Link className="post" to={`/artikel/${article.slug}`} key={article.id}>
                  <time dateTime={article.publishedAt || article.createdAt}>
                    {formatDate(article.publishedAt || article.createdAt, locale)}
                  </time>
                  <h3>{pick(article, 'title', locale)}</h3>
                  <p>{pick(article, 'excerpt', locale)}</p>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </>
  )
}
