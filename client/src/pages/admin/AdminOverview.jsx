import { Link } from 'react-router-dom'
import { ErrorBlock, InlineAlert, LoadingBlock } from '../../components/ui.jsx'
import { useI18n } from '../../i18n/index.jsx'
import { adminApi } from '../../lib/api.js'
import { formatRupiah } from '../../lib/format.js'
import { useAsync } from '../../lib/useAsync.js'

export default function AdminOverview() {
  const { t, locale } = useI18n()

  const { data, loading, error, reload } = useAsync(
    () => Promise.all([adminApi.overview(), adminApi.listContent('packages'), adminApi.listContent('services')]),
    [],
  )

  const [overview, packages, services] = data || [null, [], []]

  // Peringatan ini muncul dari keadaan data yang sebenarnya, bukan pengingat statis:
  // pengunjung akan melihat ajakan minta penawaran selama harga paket dikosongkan.
  const missingPrices = (packages || []).filter(
    (plan) => plan.priceFrom === null || plan.priceFrom === undefined || plan.priceFrom === '',
  )
  const noCatalog = (packages || []).length === 0 || (services || []).length === 0

  return (
    <>
      <div className="stack stack--tight">
        <h1 style={{ fontSize: 'var(--step-4)' }}>{t('admin.overview.title')}</h1>
        <p className="muted">{t('admin.overview.lede')}</p>
      </div>

      {loading ? <LoadingBlock rows={3} /> : null}
      {error ? <ErrorBlock error={error} onRetry={reload} /> : null}

      {overview ? (
        <div className="metrics">
          <div className="metric">
            <span className="metric__value">{overview.totalLeads ?? 0}</span>
            <span className="metric__label">{t('admin.overview.totalLeads')}</span>
          </div>
          <div className="metric">
            <span className="metric__value">{overview.untouched ?? 0}</span>
            <span className="metric__label">{t('admin.overview.newLeads')}</span>
          </div>
          <div className="metric">
            <span className="metric__value">{overview.portfolioTotal ?? 0}</span>
            <span className="metric__label">{t('admin.overview.portfolio')}</span>
          </div>
          <div className="metric">
            <span className="metric__value">{overview.articlesTotal ?? 0}</span>
            <span className="metric__label">{t('admin.overview.articles')}</span>
          </div>
        </div>
      ) : null}

      {/* Angka uang dipisah dari jumlah data karena satuannya rupiah dan hanya
          bisa dihitung setelah ada transaksi yang dicatat. */}
      {overview ? (
        <div className="metrics">
          <div className="metric">
            <span className="metric__value mono">{formatRupiah(overview.receivedTotal, locale) || 'Rp 0'}</span>
            <span className="metric__label">{t('admin.payments.received')}</span>
          </div>
          <div className="metric">
            <span className="metric__value mono">{formatRupiah(overview.pendingTotal, locale) || 'Rp 0'}</span>
            <span className="metric__label">{t('admin.payments.pending')}</span>
          </div>
          <div className="metric">
            <span className="metric__value mono">{formatRupiah(overview.outstandingTotal, locale) || 'Rp 0'}</span>
            <span className="metric__label">{t('admin.payments.outstanding')}</span>
          </div>
        </div>
      ) : null}

      {overview && missingPrices.length > 0 ? (
        <InlineAlert tone="warn">
          {t('admin.overview.priceReminder')}{' '}
          <Link to="/admin/paket">{t('admin.overview.priceReminderCta')}</Link>
        </InlineAlert>
      ) : null}

      {overview && noCatalog ? <InlineAlert tone="info">{t('admin.overview.seedReminder')}</InlineAlert> : null}

      {overview && overview.totalLeads > 0 ? (
        <Link to="/admin/lead" className="btn btn--outline btn--sm" style={{ width: 'fit-content' }}>
          {t('admin.nav.leads')}
        </Link>
      ) : null}
    </>
  )
}
