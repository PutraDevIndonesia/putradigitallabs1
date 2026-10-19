import { useRef, useState } from 'react'
import { ChevronDown, RefreshCw, Save, Trash2, Upload } from 'lucide-react'
import { Field, InlineAlert } from '../ui.jsx'
import { useI18n } from '../../i18n/index.jsx'
import { slugify } from '../../lib/format.js'

function ImageUploadControl({ id, value, onChange, t }) {
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  function handleFile(file) {
    setError('')
    if (!file) return

    // Validasi tipe gambar
    if (!file.type.startsWith('image/')) {
      setError(t('admin.content.imageFormatError'))
      return
    }

    // Validasi ukuran maksimal 5MB (5 * 1024 * 1024 bytes)
    const MAX_BYTES = 5 * 1024 * 1024
    if (file.size > MAX_BYTES) {
      setError(t('admin.content.imageSizeError'))
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      onChange(event.target.result)
    }
    reader.onerror = () => {
      setError(t('common.errorGeneric'))
    }
    reader.readAsDataURL(file)
  }

  function handleDrop(event) {
    event.preventDefault()
    const file = event.dataTransfer?.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div className="image-uploader">
      <input
        ref={fileInputRef}
        id={id}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        style={{ display: 'none' }}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) handleFile(file)
        }}
      />

      {value ? (
        <div className="image-preview-card">
          <div className="image-preview-16-9">
            <img src={value} alt="Website 16:9" />
          </div>
          <div className="image-preview-actions">
            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <RefreshCw size={14} aria-hidden="true" />
              <span>{t('admin.content.changeImage')}</span>
            </button>
            <button
              type="button"
              className="btn btn--danger btn--sm"
              onClick={() => onChange('')}
            >
              <Trash2 size={14} aria-hidden="true" />
              <span>{t('admin.content.removeImage')}</span>
            </button>
          </div>
        </div>
      ) : (
        <div
          className="image-dropzone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click()
          }}
        >
          <div className="image-dropzone-inner">
            <div className="image-dropzone-icon">
              <Upload size={22} aria-hidden="true" />
            </div>
            <strong>{t('admin.content.uploadImage')}</strong>
            <p className="field__hint">{t('admin.content.imageHint')}</p>
          </div>
        </div>
      )}

      {error ? (
        <p className="field__error" role="alert" style={{ marginTop: 6 }}>
          {error}
        </p>
      ) : null}
    </div>
  )
}

// Bentuk satu bidang ditentukan oleh atribut type di konfigurasi koleksi,
// jadi komponen ini tidak perlu tahu koleksi mana yang sedang diedit.
function renderControl(field, value, onChange, onBlur, t, idPrefix) {
  const id = `${idPrefix}-${field.key}`

  if (field.type === 'image') {
    return <ImageUploadControl id={id} value={value} onChange={onChange} t={t} />
  }

  if (field.type === 'boolean') {
    return (
      <label className="check check--switch" htmlFor={id}>
        <input id={id} type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} />
        <span>{t('admin.content.publishedOn')}</span>
      </label>
    )
  }

  if (field.type === 'select') {
    return (
      <select id={id} className="select" value={value ?? ''} onChange={(event) => onChange(event.target.value)}>
        {(field.options || []).map((option) => (
          <option value={option} key={option}>
            {field.optionPrefix ? t(`${field.optionPrefix}.${option}`) : option}
          </option>
        ))}
      </select>
    )
  }

  if (field.type === 'lines' || field.type === 'textarea') {
    return (
      <textarea
        id={id}
        className="textarea"
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
      />
    )
  }

  if (field.type === 'number') {
    return (
      <input
        id={id}
        className="input"
        type="number"
        min="0"
        step="1"
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
      />
    )
  }

  return (
    <input
      id={id}
      className="input"
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
    />
  )
}

/*
  Editor menampilkan satu bahasa saja sebagai bidang wajib. Versi bahasa kedua
  diisi otomatis oleh server, dan hanya dibuka kalau operator memang ingin
  memeriksa atau memperbaikinya.
*/
export function ContentEditor({
  config,
  initialValues,
  saving,
  issues,
  onSubmit,
  onCancel,
  primaryLocale = 'id',
  secondaryLocale = 'en',
  translationEnabled = false,
}) {
  const { t } = useI18n()
  const [values, setValues] = useState(initialValues)

  const localeFields = config.fields.filter((field) => field.locale)
  const plainFields = config.fields.filter((field) => !field.locale)

  function setValue(key, value) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  // Slug dipakai di URL publik. Kalau dikosongkan saat entri baru dibuat,
  // isinya diturunkan dari judul bahasa utama agar operator tidak perlu mengetik ulang.
  function makeBlurHandler(field) {
    if (!field.autoSlugFrom) return undefined
    return () => {
      const slugValue = String(values[field.key] || '').trim()
      if (slugValue !== '') return
      const generated = slugify(String(values[field.autoSlugFrom] || ''))
      if (generated) setValue(field.key, generated)
    }
  }

  const issueFor = (key) => (issues || []).find((issue) => issue.path === key)?.message

  return (
    <form
      className="stack"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(values)
      }}
    >
      {issues && issues.length > 0 ? <InlineAlert tone="error">{t('errors.invalid_input')}</InlineAlert> : null}

      {localeFields.length > 0 ? (
        <div className="field-grid">
          {localeFields.map((field) => (
            <Field
              key={`${field.key}_${primaryLocale}`}
              label={t(field.labelKey || field.key)}
              htmlFor={`editor-${primaryLocale}-${field.key}`}
              required={field.required}
              error={issueFor(`${field.key}_${primaryLocale}`)}
            >
              {renderControl(
                field,
                values[`${field.key}_${primaryLocale}`],
                (value) => setValue(`${field.key}_${primaryLocale}`, value),
                makeBlurHandler(field),
                t,
                `editor-${primaryLocale}`,
              )}
            </Field>
          ))}
        </div>
      ) : null}

      {localeFields.length > 0 ? (
        <details className="editor__translation">
          <summary>
            <ChevronDown size={15} aria-hidden="true" />
            <span>{t('admin.content.reviewTranslation', { lang: secondaryLocale.toUpperCase() })}</span>
          </summary>

          <div className="stack" style={{ marginTop: 14 }}>
            <p className="field__hint">
              {translationEnabled ? t('admin.content.translationOn') : t('admin.content.translationOff')}
            </p>

            {localeFields.map((field) => (
              <Field
                key={`${field.key}_${secondaryLocale}`}
                label={t(field.labelKey || field.key)}
                htmlFor={`editor-${secondaryLocale}-${field.key}`}
                error={issueFor(`${field.key}_${secondaryLocale}`)}
              >
                {renderControl(
                  field,
                  values[`${field.key}_${secondaryLocale}`],
                  (value) => setValue(`${field.key}_${secondaryLocale}`, value),
                  undefined,
                  t,
                  `editor-${secondaryLocale}`,
                )}
              </Field>
            ))}
          </div>
        </details>
      ) : null}

      <div className="field-grid field-grid--2">
        {plainFields.map((field) => (
          <Field
            key={field.key}
            label={t(field.labelKey || field.key)}
            htmlFor={`editor-${field.key}`}
            hint={field.hint ? t(field.hint) : field.type === 'lines' ? t('admin.content.linesHint') : undefined}
            required={field.required}
            error={issueFor(field.key)}
          >
            {renderControl(
              field,
              values[field.key],
              (value) => setValue(field.key, value),
              makeBlurHandler(field),
              t,
              'editor',
            )}
          </Field>
        ))}
      </div>

      <div className="cluster">
        <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>
          <Save size={15} aria-hidden="true" />
          {saving ? t('common.saving') : t('common.save')}
        </button>
        <button type="button" className="btn btn--quiet btn--sm" onClick={onCancel} disabled={saving}>
          {t('common.cancel')}
        </button>
      </div>
    </form>
  )
}
