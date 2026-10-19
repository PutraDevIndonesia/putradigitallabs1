import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Download, FileText, FolderArchive, Pencil, Plus, Save, Trash2, Upload } from 'lucide-react'
import { ConfirmDialog, Modal } from '../../components/admin/Modal.jsx'
import { LeadEditForm, toLeadPayload, toLeadValues } from '../../components/admin/LeadEditForm.jsx'
import { PaymentForm, emptyPayment, toPaymentPayload, toPaymentValues } from '../../components/admin/PaymentForm.jsx'
import { useToast } from '../../components/Toast.jsx'
import { StatusBadge } from '../../components/StatusBadge.jsx'
import { EmptyState, ErrorBlock, Field, LoadingBlock } from '../../components/ui.jsx'
import { useI18n } from '../../i18n/index.jsx'
import { ApiError, adminApi } from '../../lib/api.js'
import { formatDate, formatDateTime, formatFileSize, formatRupiah } from '../../lib/format.js'
import { useAsync } from '../../lib/useAsync.js'

const STATUS_ORDER = ['baru', 'dihubungi', 'penawaran', 'dikerjakan', 'selesai', 'batal']

const DELIVERABLE_FILES = [
  {
    type: 'project',
    titleKey: 'admin.leads.files.projectTitle',
    descKey: 'admin.leads.files.projectDesc',
    uploadKey: 'admin.leads.files.uploadProject',
    icon: FolderArchive,
  },
  {
    type: 'invoice',
    titleKey: 'admin.leads.files.invoiceTitle',
    descKey: 'admin.leads.files.invoiceDesc',
    uploadKey: 'admin.leads.files.uploadInvoice',
    icon: FileText,
  },
]

export default function AdminLeadDetail() {
  const { id } = useParams()
  const { t, locale } = useI18n()
  const { notify } = useToast()
  const navigate = useNavigate()

  const { data, loading, error, reload } = useAsync(
    () => Promise.all([adminApi.getLead(id), adminApi.listPayments({ leadId: id })]),
    [id],
  )

  // Kedua permintaan dijalankan bersamaan supaya halaman tidak berkedip dua kali:
  // data brief dan catatan pembayarannya tiba di waktu yang sama.
  const [lead, payments] = data || [null, []]

  const [draftStatus, setDraftStatus] = useState('')
  const [draftNote, setDraftNote] = useState('')
  const [draftNotes, setDraftNotes] = useState('')
  const [draftDealValue, setDraftDealValue] = useState('')
  const [saving, setSaving] = useState(false)

  // Formulir ubah brief disimpan sebagai nilai awal terpisah supaya menutup modal
  // tanpa menyimpan tidak mengubah data yang tampil di halaman.
  const [briefEditing, setBriefEditing] = useState(null)
  const [briefIssues, setBriefIssues] = useState([])
  const [savingBrief, setSavingBrief] = useState(false)

  const [uploadingType, setUploadingType] = useState(null)
  const [downloadingType, setDownloadingType] = useState(null)
  const [pendingFileDelete, setPendingFileDelete] = useState(null)
  const [deletingFile, setDeletingFile] = useState(false)

  // Input berkas disembunyikan secara visual; tombolnya yang menerima fokus keyboard
  // lalu memicu dialog pemilihan berkas.
  const fileInputs = {
    project: useRef(null),
    invoice: useRef(null),
  }

  const [paymentEditing, setPaymentEditing] = useState(null)
  const [paymentIssues, setPaymentIssues] = useState([])
  const [pendingPaymentDelete, setPendingPaymentDelete] = useState(null)
  const [deletingPayment, setDeletingPayment] = useState(false)
  const [pendingLeadDelete, setPendingLeadDelete] = useState(false)

  // Nilai formulir diambil dari data server sekali saja, supaya mengetik catatan
  // tidak tertimpa ketika data lain dimuat ulang.
  const [initialised, setInitialised] = useState(false)
  if (!initialised && lead) {
    setDraftStatus(lead.status || 'baru')
    setDraftNotes(lead.notes || '')
    setDraftDealValue(lead.dealValue === null || lead.dealValue === undefined ? '' : String(lead.dealValue))
    setInitialised(true)
  }

  // Pesan server untuk urusan berkas dipetakan ke kalimat yang bisa dibaca operator.
  function fileErrorMessage(caught) {
    if (caught?.message === 'network_error') return t('common.networkError')
    if (caught?.message === 'file_too_large') return t('admin.leads.files.tooLarge')
    return t('common.errorGeneric')
  }

  // Berkas dikirim ke API server ini, bukan langsung ke layanan penyimpanan, supaya
  // kunci akses penyimpanan tidak pernah ikut ke peramban operator.
  async function handleFileUpload(type, event) {
    const file = event.target.files?.[0]
    if (!file) return
    // Input dikosongkan supaya memilih berkas yang sama dua kali tetap memicu perubahan.
    event.target.value = ''

    setUploadingType(type)
    try {
      await adminApi.uploadLeadFile(id, type, file)
      notify(t('admin.leads.files.uploadSuccess'))
      reload()
    } catch (caught) {
      notify(fileErrorMessage(caught), 'error')
    } finally {
      setUploadingType(null)
    }
  }

  // Unduhan lewat API perlu token, jadi berkasnya diambil sebagai blob lalu disimpan
  // dari sisi peramban. Tautan langsung tidak bisa dipakai karena tidak membawa token.
  async function handleFileDownload(type, entry) {
    setDownloadingType(type)
    try {
      const blob = await adminApi.downloadLeadFile(id, type)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = entry?.displayName || entry?.name || type
      link.click()
      URL.revokeObjectURL(url)
    } catch (caught) {
      notify(fileErrorMessage(caught), 'error')
    } finally {
      setDownloadingType(null)
    }
  }

  async function confirmFileDelete() {
    if (!pendingFileDelete) return
    setDeletingFile(true)
    try {
      await adminApi.deleteLeadFile(id, pendingFileDelete.type)
      notify(t('admin.leads.files.deleteSuccess'))
      setPendingFileDelete(null)
      reload()
    } catch (caught) {
      notify(fileErrorMessage(caught), 'error')
    } finally {
      setDeletingFile(false)
    }
  }

  async function saveStatus() {
    setSaving(true)
    try {
      await adminApi.updateLead(id, { status: draftStatus, note: draftNote })
      setDraftNote('')
      notify(t('admin.leads.detail.saved'))
      reload()
    } catch (caught) {
      notify(caught?.message === 'network_error' ? t('common.networkError') : t('common.errorGeneric'), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function saveNotes() {
    setSaving(true)
    try {
      await adminApi.updateLead(id, { notes: draftNotes })
      notify(t('admin.leads.detail.saved'))
      reload()
    } catch (caught) {
      notify(caught?.message === 'network_error' ? t('common.networkError') : t('common.errorGeneric'), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function saveDealValue() {
    setSaving(true)
    try {
      const raw = String(draftDealValue || '').trim()
      // Kosong dikirim sebagai null, bukan 0, supaya "belum ditetapkan" tidak
      // terbaca sebagai nilai proyek nol rupiah.
      await adminApi.updateLead(id, { dealValue: raw === '' ? null : Number(raw) })
      notify(t('admin.leads.detail.saved'))
      reload()
    } catch (caught) {
      notify(caught?.message === 'network_error' ? t('common.networkError') : t('common.errorGeneric'), 'error')
    } finally {
      setSaving(false)
    }
  }

  function startBriefEdit() {
    if (!lead) return
    setBriefIssues([])
    setBriefEditing({ key: Date.now(), values: toLeadValues(lead) })
  }

  function closeBriefEditor() {
    setBriefEditing(null)
    setBriefIssues([])
  }

  async function handleBriefSave(values) {
    setSavingBrief(true)
    setBriefIssues([])
    try {
      const payload = toLeadPayload(values)
      await adminApi.updateLead(id, payload)
      notify(t('admin.leads.detail.briefSaved'))
      closeBriefEditor()
      reload()
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 422) {
        setBriefIssues(caught.payload?.issues || [])
      } else if (caught instanceof ApiError && caught.message === 'network_error') {
        notify(t('common.networkError'), 'error')
      } else {
        notify(t('common.errorGeneric'), 'error')
      }
    } finally {
      setSavingBrief(false)
    }
  }

  function startPaymentCreate() {
    setPaymentIssues([])
    setPaymentEditing({ id: null, key: 'baru', values: emptyPayment(id) })
  }

  function startPaymentEdit(payment) {
    setPaymentIssues([])
    setPaymentEditing({ id: payment.id, key: payment.id, values: toPaymentValues(payment) })
  }

  function closePaymentEditor() {
    setPaymentEditing(null)
    setPaymentIssues([])
  }

  async function handlePaymentSave(values) {
    setSaving(true)
    setPaymentIssues([])
    try {
      const payload = toPaymentPayload(values)
      if (paymentEditing.id) await adminApi.updatePayment(paymentEditing.id, payload)
      else await adminApi.createPayment(payload)
      notify(t('admin.payments.saved'))
      closePaymentEditor()
      reload()
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 422) setPaymentIssues(caught.payload?.issues || [])
      else if (caught instanceof ApiError && caught.message === 'network_error') notify(t('common.networkError'), 'error')
      else notify(t('common.errorGeneric'), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function confirmPaymentDelete() {
    if (!pendingPaymentDelete) return
    setDeletingPayment(true)
    try {
      await adminApi.deletePayment(pendingPaymentDelete.id)
      notify(t('admin.payments.deleted'))
      setPendingPaymentDelete(null)
      reload()
    } catch {
      notify(t('common.errorGeneric'), 'error')
    } finally {
      setDeletingPayment(false)
    }
  }

  async function confirmLeadDelete() {
    setSaving(true)
    try {
      await adminApi.deleteLead(id)
      notify(t('admin.leads.detail.deleted'))
      // Setelah dihapus, halaman ini tidak punya data lagi, jadi kembali ke daftar.
      navigate('/admin/lead')
    } catch (caught) {
      notify(caught?.message === 'network_error' ? t('common.networkError') : t('common.errorGeneric'), 'error')
      setPendingLeadDelete(false)
      setSaving(false)
    }
  }

  // Uang yang masih menunggu konfirmasi tidak dihitung sebagai pembayaran masuk.
  const paidTotal = (payments || [])
    .filter((payment) => payment.status !== 'menunggu')
    .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0)
  const dealValue = Number(lead?.dealValue) || 0
  const remaining = dealValue > 0 ? Math.max(0, dealValue - paidTotal) : 0

  // Riwayat status kini bernama statusHistory. Kunci lama "timeline" tetap dibaca
  // sebagai cadangan untuk lead yang dibuat sebelum perbaikan ini.
  const history = Array.isArray(lead?.statusHistory)
    ? lead.statusHistory
    : Array.isArray(lead?.timeline)
      ? lead.timeline
      : []
  const features = Array.isArray(lead?.features) ? lead.features : []

  return (
    <>
      <Link to="/admin/lead" className="btn btn--quiet btn--sm" style={{ width: 'fit-content' }}>
        <ChevronLeft size={16} aria-hidden="true" />
        {t('admin.leads.detail.back')}
      </Link>

      {loading ? <LoadingBlock rows={4} /> : null}
      {error ? <ErrorBlock error={error} onRetry={reload} /> : null}

      {!loading && !error && !lead ? <EmptyState title={t('admin.leads.empty')} /> : null}

      {lead ? (
        <>
          <div className="cluster" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="stack stack--tight">
              <h1 style={{ fontSize: 'var(--step-4)' }}>{t('admin.leads.detail.title', { name: lead.name })}</h1>
              <div className="cluster">
                <StatusBadge status={lead.status} />
                {lead.ticketCode ? <span className="badge">{lead.ticketCode}</span> : null}
                <span className="mono muted">{formatDateTime(lead.createdAt, locale)}</span>
              </div>
            </div>
            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={startBriefEdit}
            >
              <Pencil size={15} aria-hidden="true" />
              {t('admin.leads.detail.editBrief')}
            </button>
          </div>

          <div className="card detail-grid detail-grid--2">
            <div className="detail-row">
              <span className="detail-row__label">{t('admin.leads.detail.contact')}</span>
              <span className="detail-row__value">
                <a href={`mailto:${lead.email}`}>{lead.email}</a>
                <br />
                <a href={`tel:${lead.phone}`}>{lead.phone}</a>
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-row__label">{t('admin.leads.columns.project')}</span>
              <span className="detail-row__value">{t(`projectType.${lead.projectType}`)}</span>
            </div>

            <div className="detail-row">
              <span className="detail-row__label">{t('admin.leads.detail.budget')}</span>
              <span className="detail-row__value">{t(`budget.${lead.budget}`)}</span>
            </div>

            <div className="detail-row">
              <span className="detail-row__label">{t('admin.leads.detail.timeline')}</span>
              <span className="detail-row__value">
                {typeof lead.timeline === 'string' && lead.timeline ? t(`timeline.${lead.timeline}`) : '-'}
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-row__label">{t('admin.leads.detail.company')}</span>
              <span className="detail-row__value">
                {lead.company || '-'}
                {lead.role ? ` · ${lead.role}` : ''}
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-row__label">{t('admin.leads.detail.features')}</span>
              <span className="detail-row__value">
                {features.length > 0 ? (
                  <span className="cluster">
                    {features.map((key) => (
                      <span className="chip" key={key}>
                        {t(`feature.${key}`)}
                      </span>
                    ))}
                  </span>
                ) : (
                  t('admin.leads.detail.noFeatures')
                )}
              </span>
            </div>

            {lead.reference ? (
              <div className="detail-row">
                <span className="detail-row__label">{t('admin.leads.detail.reference')}</span>
                <span className="detail-row__value">{lead.reference}</span>
              </div>
            ) : null}

            <div className="detail-row" style={{ gridColumn: '1 / -1' }}>
              <span className="detail-row__label">{t('admin.leads.detail.brief')}</span>
              <p className="brief-text">{lead.brief}</p>
            </div>
          </div>

          <div className="card stack">
            <h2 style={{ fontSize: 'var(--step-3)' }}>{t('admin.leads.detail.statusLabel')}</h2>

            <div className="field-grid field-grid--2">
              <Field label={t('admin.leads.columns.status')} htmlFor="lead-new-status">
                <select
                  id="lead-new-status"
                  className="select"
                  value={draftStatus}
                  onChange={(event) => setDraftStatus(event.target.value)}
                >
                  {STATUS_ORDER.map((key) => (
                    <option value={key} key={key}>
                      {t(`status.${key}`)}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label={t('admin.leads.detail.noteLabel')} htmlFor="lead-note">
                <input
                  id="lead-note"
                  className="input"
                  value={draftNote}
                  onChange={(event) => setDraftNote(event.target.value)}
                  placeholder={t('admin.leads.detail.notePlaceholder')}
                />
              </Field>
            </div>

            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={saveStatus}
              disabled={saving}
              style={{ width: 'fit-content' }}
            >
              <Save size={15} aria-hidden="true" />
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </div>

          <div className="card stack">
            <h2 style={{ fontSize: 'var(--step-3)' }}>{t('admin.leads.detail.notesLabel')}</h2>
            <textarea
              className="textarea"
              value={draftNotes}
              onChange={(event) => setDraftNotes(event.target.value)}
              aria-label={t('admin.leads.detail.notesLabel')}
            />
            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={saveNotes}
              disabled={saving}
              style={{ width: 'fit-content' }}
            >
              {t('admin.leads.detail.saveNotes')}
            </button>
          </div>

          <div className="card stack">
            <h2 style={{ fontSize: 'var(--step-3)' }}>{t('admin.leads.detail.timelineTitle')}</h2>
            <ol className="timeline">
              {history.map((entry, index) => (
                <li
                  className={`timeline__item${index < history.length - 1 ? ' timeline__item--done' : ''}`}
                  key={`${entry.at}-${index}`}
                >
                  <span className="timeline__dot" aria-hidden="true" />
                  <div className="stack stack--tight">
                    <div className="timeline__meta">
                      <StatusBadge status={entry.status} />
                      <span>{formatDateTime(entry.at, locale)}</span>
                    </div>
                    {entry.note ? <p className="muted">{entry.note}</p> : null}
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="card stack">
            <div className="cluster" style={{ justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 'var(--step-3)' }}>{t('admin.payments.sectionTitle')}</h2>
              <button type="button" className="btn btn--outline btn--sm" onClick={startPaymentCreate}>
                <Plus size={15} aria-hidden="true" />
                {t('admin.payments.addNew')}
              </button>
            </div>

            <div className="metrics">
              <div className="metric">
                <span className="metric__value mono">{formatRupiah(paidTotal, locale) || 'Rp 0'}</span>
                <span className="metric__label">{t('admin.payments.paidSoFar')}</span>
              </div>
              <div className="metric">
                <span className="metric__value mono">{formatRupiah(remaining, locale) || 'Rp 0'}</span>
                <span className="metric__label">{t('admin.payments.remaining')}</span>
              </div>
            </div>

            <div className="field-grid field-grid--2">
              <Field
                label={t('admin.payments.dealValue')}
                hint={t('admin.payments.dealValueHint')}
                htmlFor="lead-deal-value"
              >
                <input
                  id="lead-deal-value"
                  className="input mono"
                  type="number"
                  min="0"
                  step="1000"
                  value={draftDealValue}
                  onChange={(event) => setDraftDealValue(event.target.value)}
                />
              </Field>
              <div className="cluster" style={{ alignItems: 'flex-end' }}>
                <button type="button" className="btn btn--outline btn--sm" onClick={saveDealValue} disabled={saving}>
                  {t('admin.payments.saveDealValue')}
                </button>
              </div>
            </div>

            {(payments || []).length === 0 ? (
              <p className="muted">{t('admin.payments.sectionEmpty')}</p>
            ) : (
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr>
                      <th>{t('admin.payments.columns.date')}</th>
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
                        <td>{t(`admin.payments.kinds.${payment.kind}`)}</td>
                        <td>{t(`admin.payments.methods.${payment.method}`)}</td>
                        <td className="mono">{formatRupiah(payment.amount, locale)}</td>
                        <td>{t(`admin.payments.statuses.${payment.status}`)}</td>
                        <td>
                          <div className="cluster" style={{ justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className="btn btn--outline btn--sm"
                              onClick={() => startPaymentEdit(payment)}
                            >
                              <Pencil size={14} aria-hidden="true" />
                              {t('common.edit')}
                            </button>
                            <button
                              type="button"
                              className="btn btn--danger btn--sm"
                              onClick={() => setPendingPaymentDelete(payment)}
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
            )}
          </div>

          <div className="card stack">
            <div className="stack stack--tight">
              <h2 style={{ fontSize: 'var(--step-3)' }}>{t('admin.leads.files.sectionTitle')}</h2>
              <p className="muted">{t('admin.leads.files.sectionHint')}</p>
            </div>

            {DELIVERABLE_FILES.map(({ type, titleKey, descKey, uploadKey, icon: Icon }) => {
              const entry = lead.files?.[type]
              const busy = uploadingType === type

              return (
                <div className="stack stack--tight" key={type}>
                  <span className="cluster">
                    <Icon size={16} aria-hidden="true" />
                    <strong>{t(titleKey)}</strong>
                  </span>
                  <span className="muted">{t(descKey)}</span>

                  {entry ? (
                    <>
                          <span className="mono">{entry.displayName || entry.name}</span>
                      <span className="muted">
                        {formatFileSize(entry.size)}
                        {entry.uploadedAt
                          ? ` · ${t('admin.leads.files.uploadedAt')} ${formatDateTime(entry.uploadedAt, locale)}`
                          : ''}
                      </span>
                      <span className="cluster">
                        <button
                          type="button"
                          className="btn btn--outline btn--sm"
                          onClick={() => handleFileDownload(type, entry)}
                          disabled={downloadingType === type}
                        >
                          <Download size={14} aria-hidden="true" />
                          {downloadingType === type
                            ? t('admin.leads.files.downloading')
                            : t('admin.leads.files.download')}
                        </button>
                        <button
                          type="button"
                          className="btn btn--danger btn--sm"
                          onClick={() => setPendingFileDelete({ type, file: entry })}
                          disabled={deletingFile}
                        >
                          <Trash2 size={14} aria-hidden="true" />
                          {t('admin.leads.files.delete')}
                        </button>
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="muted">{t('admin.leads.files.noFile')}</span>
                      <span className="cluster">
                        <input
                          ref={fileInputs[type]}
                          className="visually-hidden"
                          type="file"
                          tabIndex={-1}
                          onChange={(event) => handleFileUpload(type, event)}
                        />
                        <button
                          type="button"
                          className="btn btn--primary btn--sm"
                          onClick={() => fileInputs[type].current?.click()}
                          disabled={busy}
                        >
                          <Upload size={14} aria-hidden="true" />
                          {busy ? t('admin.leads.files.uploading') : t(uploadKey)}
                        </button>
                      </span>
                    </>
                  )}
                </div>
              )
            })}
          </div>

          <div className="card">
            <button
              type="button"
              className="btn btn--danger btn--sm"
              onClick={() => setPendingLeadDelete(true)}
              disabled={saving}
            >
              <Trash2 size={15} aria-hidden="true" />
              {t('admin.leads.detail.delete')}
            </button>
          </div>

          <Modal
            open={Boolean(paymentEditing)}
            title={paymentEditing?.id ? t('admin.payments.editing') : t('admin.payments.creating')}
            onClose={closePaymentEditor}
          >
            {paymentEditing ? (
              <PaymentForm
                key={paymentEditing.key}
                initialValues={paymentEditing.values}
                fixedLeadId={id}
                saving={saving}
                issues={paymentIssues}
                onSubmit={handlePaymentSave}
                onCancel={closePaymentEditor}
              />
            ) : null}
          </Modal>

          <Modal
            open={Boolean(briefEditing)}
            title={t('admin.leads.detail.editingBrief')}
            onClose={closeBriefEditor}
          >
            {briefEditing ? (
              <LeadEditForm
                key={briefEditing.key}
                initialValues={briefEditing.values}
                saving={savingBrief}
                issues={briefIssues}
                onSubmit={handleBriefSave}
                onCancel={closeBriefEditor}
              />
            ) : null}
          </Modal>

          <ConfirmDialog
            open={Boolean(pendingFileDelete)}
            title={t('admin.leads.files.deleteTitle')}
            body={t('admin.leads.files.deleteConfirm', { name: pendingFileDelete?.file?.displayName || pendingFileDelete?.file?.name || '' })}
            confirmLabel={t('common.delete')}
            busy={deletingFile}
            onCancel={() => setPendingFileDelete(null)}
            onConfirm={confirmFileDelete}
          />

          <ConfirmDialog
            open={Boolean(pendingPaymentDelete)}
            title={t('admin.payments.deleteTitle')}
            body={t('admin.payments.deleteConfirm')}
            confirmLabel={t('common.delete')}
            busy={deletingPayment}
            onCancel={() => setPendingPaymentDelete(null)}
            onConfirm={confirmPaymentDelete}
          />

          <ConfirmDialog
            open={pendingLeadDelete}
            title={t('admin.leads.detail.delete')}
            body={t('admin.leads.detail.deleteConfirm')}
            confirmLabel={t('common.delete')}
            busy={saving}
            onCancel={() => setPendingLeadDelete(false)}
            onConfirm={confirmLeadDelete}
          />
        </>
      ) : null}
    </>
  )
}
