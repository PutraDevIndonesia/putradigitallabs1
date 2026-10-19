import { Link, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { EmptyState, ErrorBlock, LoadingBlock } from '../components/ui.jsx'
import { useI18n } from '../i18n/index.jsx'
import { publicApi } from '../lib/api.js'
import { formatDate, pick, toParagraphs } from '../lib/format.js'
import { useAsync } from '../lib/useAsync.js'
import { useDocumentTitle } from '../lib/useDocumentTitle.js'

export default function ArtikelDetail() {
  const { slug } = useParams()
  const { t, locale } = useI18n()
  const { data: article, loading, error, reload } = useAsync(() => publicApi.getArticle(slug), [slug])

  useDocumentTitle(article ? pick(article, 'title', locale) : t('blog.title'))

  // Isi artikel diketik sebagai teks biasa; baris kosong menjadi pemisah paragraf.
  const paragraphs = toParagraphs(pick(article, 'body', locale))

  return (
    <section className="section section--plain">
      <div className="container stack stack--loose">
        <Link to="/artikel" className="btn btn--quiet btn--sm" style={{ width: 'fit-content' }}>
          <ChevronLeft size={16} aria-hidden="true" />
          {t('blog.backToList')}
        </Link>

        {loading ? <LoadingBlock rows={4} /> : null}
        {error ? <ErrorBlock error={error} onRetry={reload} /> : null}

        {!loading && !error && !article ? (
          <EmptyState
            title={t('blog.emptyTitle')}
            body={t('blog.emptyBody')}
            action={
              <Link to="/artikel" className="btn btn--outline btn--sm">
                {t('blog.backToList')}
              </Link>
            }
          />
        ) : null}

        {article ? (
          <article className="stack stack--loose">
            <header className="stack stack--tight" style={{ maxWidth: '72ch' }}>
              <time className="mono muted" dateTime={article.publishedAt || article.createdAt}>
                {formatDate(article.publishedAt || article.createdAt, locale)}
              </time>
              <h1 style={{ fontSize: 'var(--step-5)' }}>{pick(article, 'title', locale)}</h1>
              <p className="lede">{pick(article, 'excerpt', locale)}</p>
            </header>

            {article.coverImage ? <img src={article.coverImage} alt="" loading="lazy" /> : null}

            <div className="prose">
              {paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 40)}>{paragraph}</p>
              ))}
            </div>
          </article>
        ) : null}
      </div>
    </section>
  )
}
