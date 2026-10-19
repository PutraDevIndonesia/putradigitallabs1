import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { ContentEditor } from '../../components/admin/ContentEditor.jsx'
import { ConfirmDialog, Modal } from '../../components/admin/Modal.jsx'
import { useToast } from '../../components/Toast.jsx'
import { EmptyState, ErrorBlock, LoadingBlock } from '../../components/ui.jsx'
import { useI18n } from '../../i18n/index.jsx'
import { ApiError, adminApi } from '../../lib/api.js'
import { emptyValues, toFormValues, toPayload } from '../../lib/contentConfigs.js'
import { formatRupiah, pick } from '../../lib/format.js'
import { useAsync } from '../../lib/useAsync.js'

function cellValue(column, item, locale, t) {
  if (column.locale) return pick(item, column.key, locale)
  if (column.boolean) {
    return <span className={`badge${item[column.key] === false ? '' : ' badge--selesai'}`}>{item[column.key] === false ? t('common.draft') : t('common.published')}</span>
  }
  if (column.price) return formatRupiah(item[column.key], locale) || t('plans.priceFallback')
  if (item[column.key] === null || item[column.key] === undefined || item[column.key] === '') return '-'
  return String(item[column.key])
}

export default function AdminContent({ config }) {
  const { t, locale } = useI18n()
  const { notify } = useToast()

  const { data: items, loading, error, reload } = useAsync(
    () => adminApi.listContent(config.collection),
    [config.collection],
  )

  // Pengaturan terjemahan datang dari server, bukan ditebak di klien: kalau
  // penerjemah belum diaktifkan, editor memberi tahu bahwa versi bahasa kedua kosong.
  const { data: settings } = useAsync(() => adminApi.settings(), [])

  // editing.id bernilai null saat membuat entri baru. Nilai awal sudah dikonversi
  // ke bentuk formulir supaya editor tidak perlu tahu bentuk data asli dari API.
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [issues, setIssues] = useState([])
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  function startCreate() {
    setIssues([])
    setEditing({ id: null, key: 'new', values: emptyValues(config) })
  }

  function startEdit(item) {
    setIssues([])
    setEditing({ id: item.id, key: item.id, values: toFormValues(config, item) })
  }

  function closeEditor() {
    setEditing(null)
    setIssues([])
  }

  async function handleSave(values) {
    setSaving(true)
    setIssues([])
    try {
      const payload = toPayload(config, values)
      const saved = editing.id
        ? await adminApi.updateContent(config.collection, editing.id, payload)
        : await adminApi.createContent(config.collection, payload)

      notify(t('admin.content.saved'))
      // Penyedia terjemahan yang menolak tidak membatalkan penyimpanan, jadi
      // kegagalannya dilaporkan terpisah agar isinya bisa diperiksa nanti.
      if (saved?.translationStatus === 'gagal') notify(t('admin.content.translationFailed'), 'error')
      closeEditor()
      reload()
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 422) {
        setIssues(caught.payload?.issues || [])
      } else if (caught instanceof ApiError && caught.status === 409) {
        notify(t('errors.slug_taken'), 'error')
      } else if (caught instanceof ApiError && caught.message === 'network_error') {
        notify(t('common.networkError'), 'error')
      } else {
        notify(t('common.errorGeneric'), 'error')
      }
    } finally {
      setSaving(false)
    }
  }

  // Penghapusan dikonfirmasi lewat pop-up sendiri, bukan window.confirm, supaya
  // pertanyaannya ikut bahasa antarmuka dan tidak memblokir render React.
  async function confirmDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await adminApi.deleteContent(config.collection, pendingDelete.id)
      notify(t('admin.content.deleted'))
      setPendingDelete(null)
      reload()
    } catch {
      notify(t('common.errorGeneric'), 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <div className="toolbar">
        <div className="stack stack--tight">
          <h1 style={{ fontSize: 'var(--step-4)' }}>{t(config.titleKey)}</h1>
          <span className="muted mono">
            {config.collection} · {(items || []).length}
          </span>
        </div>
        <button type="button" className="btn btn--primary btn--sm" onClick={startCreate}>
          <Plus size={15} aria-hidden="true" />
          {t('admin.content.createNew')}
        </button>
      </div>

      {loading ? <LoadingBlock rows={4} /> : null}
      {error ? <ErrorBlock error={error} onRetry={reload} /> : null}

      {!loading && !error && (items || []).length === 0 ? <EmptyState title={t('admin.content.empty')} /> : null}

      {(items || []).length > 0 ? (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                {config.columns.map((column) => (
                  <th key={column.key}>{t(column.labelKey || column.key)}</th>
                ))}
                <th>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {(items || []).map((item) => (
                <tr key={item.id}>
                  {config.columns.map((column) => (
                    <td key={column.key} className={column.mono ? 'mono' : undefined}>
                      {cellValue(column, item, locale, t)}
                    </td>
                  ))}
                  <td>
                    <div className="cluster" style={{ justifyContent: 'flex-end' }}>
                      <button type="button" className="btn btn--outline btn--sm" onClick={() => startEdit(item)}>
                        <Pencil size={14} aria-hidden="true" />
                        {t('common.edit')}
                      </button>
                      <button type="button" className="btn btn--danger btn--sm" onClick={() => setPendingDelete(item)}>
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
        title={editing?.id ? t('admin.content.editing') : t('admin.content.creating')}
        onClose={closeEditor}
      >
        {editing ? (
          <ContentEditor
            key={editing.key}
            config={config}
            initialValues={editing.values}
            saving={saving}
            issues={issues}
            primaryLocale={settings?.primaryLocale || 'id'}
            secondaryLocale={settings?.secondaryLocale || 'en'}
            translationEnabled={Boolean(settings?.translationEnabled)}
            onSubmit={handleSave}
            onCancel={closeEditor}
          />
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={t('admin.content.deleteTitle')}
        body={t('admin.content.deleteConfirm')}
        confirmLabel={t('common.delete')}
        busy={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </>
  )
}
