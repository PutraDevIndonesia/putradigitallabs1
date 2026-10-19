import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, ErrorBlock, LoadingBlock, PageHeader } from '../components/ui.jsx'
import { useI18n } from '../i18n/index.jsx'
import { publicApi } from '../lib/api.js'
import { pick } from '../lib/format.js'
import { useAsync } from '../lib/useAsync.js'
import { useDocumentTitle } from '../lib/useDocumentTitle.js'

export default function Portofolio() {
  const { t, locale } = useI18n()
  useDocumentTitle(t('work.title'))

  const { data: items, loading, error, reload } = useAsync(() => publicApi.listPortfolio(), [])
  const [category, setCategory] = useState('all')

  // Kategori disusun dari data yang benar-benar ada, jadi filter tidak pernah
  // menampilkan tombol yang hasilnya kosong.
  const categories = useMemo(() => {
    const unique = new Set((items || []).map((item) => item.category).filter(Boolean))
    return ['all', ...unique]
  }, [items])

  const visible = (items || []).filter((item) => category === 'all' || item.category === category)

  return (
    <>
      <PageHeader eyebrow={t('work.eyebrow')} title={t('work.title')} lede={t('work.lede')} />

      <section className="section section--plain">
        <div className="container">
          {loading ? <LoadingBlock rows={3} /> : null}
          {error ? <ErrorBlock error={error} onRetry={reload} /> : null}

          {!loading && !error && (items || []).length === 0 ? (
            <EmptyState
              title={t('work.emptyTitle')}
              body={t('work.emptyBody')}
              action={
                <Link to="/brief" className="btn btn--outline btn--sm">
                  {t('work.emptyCta')}
                </Link>
              }
            />
          ) : null}

          {categories.length > 1 ? (
            <div className="filters" role="group" aria-label={t('work.categoryLabel')}>
              {categories.map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={category === key}
                  onClick={() => setCategory(key)}
                >
                  {key === 'all' ? t('work.all') : t(`projectType.${key}`)}
                </button>
              ))}
            </div>
          ) : null}

          {visible.length > 0 ? (
            <div className="work-grid">
              {visible.map((item) => (
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
          ) : null}

          {!loading && !error && (items || []).length > 0 && visible.length === 0 ? (
            <p className="muted">{t('work.emptyBody')}</p>
          ) : null}
        </div>
      </section>
    </>
  )
}
