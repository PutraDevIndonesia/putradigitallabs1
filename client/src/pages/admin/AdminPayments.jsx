import { useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { ConfirmDialog, Modal } from '../../components/admin/Modal.jsx'
import { PaymentForm, emptyPayment, toPaymentPayload, toPaymentValues } from '../../components/admin/PaymentForm.jsx'
import { useToast } from '../../components/Toast.jsx'
import { EmptyState, ErrorBlock, LoadingBlock } from '../../components/ui.jsx'
import { useI18n } from '../../i18n/index.jsx'
import { ApiError, adminApi } from '../../lib/api.js'
import { formatDate, formatRupiah } from '../../lib/format.js'
import { useAsync } from '../../lib/useAsync.js'

const STATUS_ORDER = ['diterima', 'menunggu']

export default function AdminPayments() {
  const { t, locale } = useI18n()
  const { notify } = useToast()

  const [statusFilter, setStatusFilter] = useState('')
  const { data, loading, error, reload } = useAsync(
    () => Promise.all([adminApi.listPayments({ status: statusFilter }), adminApi.listLeads()]),
    [statusFilter],
  )

  const [payments, leads] = data || [[], []]
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [issues, setIssues] = useState([])
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Nama proyek diambil dari daftar brief, bukan disimpan ulang di transaksi.
  // Dengan begitu mengganti nama klien tidak meninggalkan nama lama di riwayat pembayaran.
  const leadById = useMemo(() => {
    const map = {}
    for (const lead of leads) map[lead.id] = lead
    return map
  }, [leads])

  // Angka ringkasan selalu dihitung dari data yang sedang tampil, jadi filter
  // status ikut tercermin di angkanya dan tidak ada dua sumber kebenaran.
  const totals = useMemo(() => {
    let received = 0
    let pending = 0
    const receivedPerLead = {}

    for (const payment of payments) {
      const amount = Number(payment.amount) || 0
      if (payment.status === 'menunggu') {
        pending += amount
        continue
      }
      received += amount
      receivedPerLead[payment.leadId] = (receivedPerLead[payment.leadId] || 0) + amount
    }

    let outstanding = 0
    for (const lead of leads) {
      const dealValue = Number(lead.dealValue) || 0
      if (dealValue <= 0) continue
      outstanding += Math.max(0, dealValue - (receivedPerLead[lead.id] || 0))
    }

    return { received, pending, outstanding }
  }, [payments, leads])

  function startCreate() {
    setIssues([])
    setEditing({ id: null, key: 'baru', values: emptyPayment() })
  }

  function startEdit(payment) {
    setIssues([])
    setEditing({ id: payment.id, key: payment.id, values: toPaymentValues(payment) })
  }

  function closeEditor() {
    setEditing(null)
    setIssues([])
  }

  async function handleSave(values) {
    setSaving(true)
    setIssues([])
    try {
      const payload = toPaymentPayload(values)
      if (editing.id) await adminApi.updatePayment(editing.id, payload)
      else await adminApi.createPayment(payload)
      notify(t('admin.payments.saved'))
      closeEditor()
      reload()
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 422) setIssues(caught.payload?.issues || [])
      else if (caught instanceof ApiError && caught.status === 404) notify(t('errors.lead_not_found'), 'error')
      else if (caught instanceof ApiError && caught.message === 'network_error') notify(t('common.networkError'), 'error')
      else notify(t('common.errorGeneric'), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await adminApi.deletePayment(pendingDelete.id)
      notify(t('admin.payments.deleted'))
      setPendingDelete(null)
      reload()
    } catch {
      notify(t('common.errorGeneric'), 'error')
    } finally {
      setDeleting(false)
    }
  }

  const leadLabel = (leadId) => {
    const lead = leadById[leadId]
    if (!lead) return '-'
    return lead.company ? `${lead.name} · ${lead.company}` : lead.name
  }

  return (
    <>
      <div className="toolbar">
        <div className="stack stack--tight">
          <h1 style={{ fontSize: 'var(--step-4)' }}>{t('admin.payments.title')}</h1>
          <p className="muted" style={{ fontSize: 'var(--step-2)' }}>
            {t('admin.payments.lede')}
          </p>
        </div>
        <button type="button" className="btn btn--primary btn--sm" onClick={startCreate}>
          <Plus size={15} aria-hidden="true" />
          {t('admin.payments.addNew')}
        </button>
      </div>

      <div className="metrics">
        <div className="metric">
          <span className="metric__value mono">{formatRupiah(totals.received, locale) || 'Rp 0'}</span>
          <span className="metric__label">{t('admin.payments.received')}</span>
        </div>
        <div className="metric">
          <span className="metric__value mono">{formatRupiah(totals.pending, locale) || 'Rp 0'}</span>
          <span className="metric__label">{t('admin.payments.pending')}</span>
        </div>
        <div className="metric">
          <span className="metric__value mono">{formatRupiah(totals.outstanding, locale) || 'Rp 0'}</span>
          <span className="metric__label">{t('admin.payments.outstanding')}</span>
        </div>
      </div>

      <div className="toolbar">
        <div className="toolbar__group">
          <div className="field">
            <label className="field__label" htmlFor="payment-status">
              {t('admin.leads.filterLabel')}
            </label>
            <select
              id="payment-status"
              className="select"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">{t('admin.payments.filterAll')}</option>
              {STATUS_ORDER.map((key) => (
                <option value={key} key={key}>
                  {t(`admin.payments.statuses.${key}`)}
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

      {!loading && !error && (payments || []).length === 0 ? (
        <EmptyState title={t('admin.payments.empty')} />
      ) : null}

      {(payments || []).length > 0 ? (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>{t('admin.payments.columns.date')}</th>
                <th>{t('admin.payments.columns.lead')}</th>
                <th>{t('admin.payments.columns.kind')}</th>
                <th>{t('admin.payments.columns.method')}</th>
                <th>{t('admin.payments.columns.amount')}</th>
                <th>{t('admin.payments.columns.status')}</th>
                <th>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="mono">{payment.paidAt ? formatDate(payment.paidAt, locale) : '-'}</td>
                  <td>{leadLabel(payment.leadId)}</td>
                  <td>{t(`admin.payments.kinds.${payment.kind}`)}</td>
                  <td>{t(`admin.payments.methods.${payment.method}`)}</td>
                  <td className="mono">{formatRupiah(payment.amount, locale)}</td>
                  <td>{t(`admin.payments.statuses.${payment.status}`)}</td>
                  <td>
                    <div className="cluster" style={{ justifyContent: 'flex-end' }}>
                      <button type="button" className="btn btn--outline btn--sm" onClick={() => startEdit(payment)}>
                        <Pencil size={14} aria-hidden="true" />
                        {t('common.edit')}
                      </button>
                      <button
                        type="button"
                        className="btn btn--danger btn--sm"
                        onClick={() => setPendingDelete(payment)}
                      >
                        <Trash2 size={14} aria-hidden="true" />
                        {t('common.delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <Modal
        open={Boolean(editing)}
        title={editing?.id ? t('admin.payments.editing') : t('admin.payments.creating')}
        onClose={closeEditor}
      >
        {editing ? (
          <PaymentForm
            key={editing.key}
            initialValues={editing.values}
            leads={leads}
            saving={saving}
            issues={issues}
            onSubmit={handleSave}
            onCancel={closeEditor}
          />
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={t('admin.payments.deleteTitle')}
        body={t('admin.payments.deleteConfirm')}
        confirmLabel={t('common.delete')}
        busy={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </>
  )
}
