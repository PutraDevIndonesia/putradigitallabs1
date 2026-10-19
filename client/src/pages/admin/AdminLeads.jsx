import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, ErrorBlock, LoadingBlock } from '../../components/ui.jsx'
import { StatusBadge } from '../../components/StatusBadge.jsx'
import { useI18n } from '../../i18n/index.jsx'
import { adminApi } from '../../lib/api.js'
import { formatDateTime } from '../../lib/format.js'
import { useAsync } from '../../lib/useAsync.js'

// Urutan ini harus sama dengan LEAD_STATUSES di server/src/validate.js.
const STATUS_ORDER = ['baru', 'dihubungi', 'penawaran', 'dikerjakan', 'selesai', 'batal']

export default function AdminLeads() {
  const { t, locale } = useI18n()
  const [status, setStatus] = useState('')

  // Filter dikerjakan di server lewat query, jadi tabel tidak perlu memuat
  // seluruh lead hanya untuk menampilkan satu status.
  const { data: leads, loading, error, reload } = useAsync(() => adminApi.listLeads(status), [status])

  return (
    <>
      <div className="stack stack--tight">
        <h1 style={{ fontSize: 'var(--step-4)' }}>{t('admin.leads.title')}</h1>
        <p className="muted">{t('admin.leads.lede')}</p>
      </div>

      <div className="toolbar">
        <div className="toolbar__group">
          <div className="field">
            <label className="field__label" htmlFor="lead-status">
              {t('admin.leads.filterLabel')}
            </label>
            <select
              id="lead-status"
              className="select"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">{t('admin.leads.filterAll')}</option>
              {STATUS_ORDER.map((key) => (
                <option value={key} key={key}>
                  {t(`status.${key}`)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button type="button" className="btn btn--outline btn--sm" onClick={reload}>
          {t('common.retry')}
        </button>
      </div>

      {loading ? <LoadingBlock rows={4} /> : null}
      {error ? <ErrorBlock error={error} onRetry={reload} /> : null}

      {!loading && !error && (leads || []).length === 0 ? <EmptyState title={t('admin.leads.empty')} /> : null}

      {(leads || []).length > 0 ? (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>{t('admin.leads.columns.created')}</th>
                <th>{t('admin.leads.columns.name')}</th>
                <th>{t('admin.leads.columns.project')}</th>
                <th>{t('admin.leads.columns.budget')}</th>
                <th>{t('admin.leads.columns.status')}</th>
                <th>{t('admin.leads.columns.action')}</th>
              </tr>
            </thead>
            <tbody>
              {(leads || []).map((lead) => (
                <tr key={lead.id}>
                  <td className="mono">{formatDateTime(lead.createdAt, locale)}</td>
                  <td>
                    <strong>{lead.name}</strong>
                    <br />
                    <span className="muted" style={{ fontSize: 'var(--step-1)' }}>
                      {lead.company || lead.email}
                    </span>
                  </td>
                  <td>{t(`projectType.${lead.projectType}`)}</td>
                  <td>{t(`budget.${lead.budget}`)}</td>
                  <td>
                    <StatusBadge status={lead.status} />
                  </td>
                  <td>
                    <Link to={`/admin/lead/${lead.id}`} className="btn btn--outline btn--sm">
                      {t('admin.leads.openDetail')}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  )
}
