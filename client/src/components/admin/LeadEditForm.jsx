import { useState } from 'react'
import { Save } from 'lucide-react'
import { Field, InlineAlert } from '../ui.jsx'
import { useI18n } from '../../i18n/index.jsx'

export const PROJECT_TYPES = [
  'company-profile',
  'toko-online',
  'sistem-internal',
  'landing-page',
  'redesign',
  'lainnya',
]
export const BUDGETS = ['belum-tahu', 'sampai-5', '5-15', '15-50', 'diatas-50']
export const TIMELINES = ['secepatnya', 'satu-dua-bulan', 'tiga-enam-bulan', 'belum-jelas']
export const FEATURES = [
  'auth',
  'payment',
  'cms',
  'multi-bahasa',
  'integrasi-api',
  'laporan',
  'notifikasi',
  'seo',
  'pwa',
]

export function toLeadValues(lead) {
  if (!lead) return {}
  return {
    name: lead.name || '',
    email: lead.email || '',
    phone: lead.phone || '',
    company: lead.company || '',
    role: lead.role || '',
    projectType: lead.projectType || 'company-profile',
    budget: lead.budget || 'belum-tahu',
    timeline: lead.timeline || 'secepatnya',
    features: Array.isArray(lead.features) ? [...lead.features] : [],
    reference: lead.reference || '',
    brief: lead.brief || '',
  }
}

export function toLeadPayload(values) {
  return {
    name: String(values.name || '').trim(),
    email: String(values.email || '').trim(),
    phone: String(values.phone || '').trim(),
    company: String(values.company || '').trim(),
    role: String(values.role || '').trim(),
    projectType: values.projectType,
    budget: values.budget,
    timeline: values.timeline,
    features: Array.isArray(values.features) ? values.features : [],
    reference: String(values.reference || '').trim(),
    brief: String(values.brief || '').trim(),
  }
}

export function LeadEditForm({ initialValues, saving, issues = [], onSubmit, onCancel }) {
  const { t } = useI18n()
  const [values, setValues] = useState(() => ({
    ...initialValues,
    features: Array.isArray(initialValues?.features) ? [...initialValues.features] : [],
  }))

  function setValue(field, val) {
    setValues((prev) => ({ ...prev, [field]: val }))
  }

  function toggleFeature(key) {
    setValues((prev) => {
      const exists = prev.features.includes(key)
      const nextFeatures = exists ? prev.features.filter((f) => f !== key) : [...prev.features, key]
      return { ...prev, features: nextFeatures }
    })
  }

  function handleSubmit(event) {
    event.preventDefault()
    onSubmit(values)
  }

  const issueByPath = new Map((issues || []).map((item) => [item.path, item.message]))

  return (
    <form className="stack" onSubmit={handleSubmit} noValidate>
      {issues.length > 0 ? (
        <InlineAlert tone="error">
          <ul className="stack stack--tight" style={{ margin: 0, paddingLeft: 20 }}>
            {issues.map((issue, idx) => (
              <li key={idx}>
                <strong>{issue.path || 'form'}</strong>: {issue.message}
              </li>
            ))}
          </ul>
        </InlineAlert>
      ) : null}

      <div className="field-grid field-grid--2">
        <Field
          label={t('brief.fields.name')}
          htmlFor="lead-edit-name"
          error={issueByPath.get('name')}
          required
        >
          <input
            id="lead-edit-name"
            className="input"
            value={values.name}
            onChange={(e) => setValue('name', e.target.value)}
            required
          />
        </Field>

        <Field
          label={t('brief.fields.email')}
          htmlFor="lead-edit-email"
          error={issueByPath.get('email')}
          required
        >
          <input
            id="lead-edit-email"
            type="email"
            className="input"
            value={values.email}
            onChange={(e) => setValue('email', e.target.value)}
            required
          />
        </Field>

        <Field
          label={t('brief.fields.phone')}
          htmlFor="lead-edit-phone"
          error={issueByPath.get('phone')}
          required
        >
          <input
            id="lead-edit-phone"
            className="input"
            value={values.phone}
            onChange={(e) => setValue('phone', e.target.value)}
            required
          />
        </Field>

        <Field
          label={t('brief.fields.company')}
          htmlFor="lead-edit-company"
          error={issueByPath.get('company')}
        >
          <input
            id="lead-edit-company"
            className="input"
            value={values.company}
            onChange={(e) => setValue('company', e.target.value)}
          />
        </Field>

        <Field
          label={t('brief.fields.role')}
          htmlFor="lead-edit-role"
          error={issueByPath.get('role')}
        >
          <input
            id="lead-edit-role"
            className="input"
            value={values.role}
            onChange={(e) => setValue('role', e.target.value)}
          />
        </Field>

        <Field
          label={t('brief.fields.projectType')}
          htmlFor="lead-edit-project-type"
          error={issueByPath.get('projectType')}
          required
        >
          <select
            id="lead-edit-project-type"
            className="select"
            value={values.projectType}
            onChange={(e) => setValue('projectType', e.target.value)}
          >
            {PROJECT_TYPES.map((key) => (
              <option value={key} key={key}>
                {t(`projectType.${key}`)}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label={t('brief.fields.budget')}
          htmlFor="lead-edit-budget"
          error={issueByPath.get('budget')}
          required
        >
          <select
            id="lead-edit-budget"
            className="select"
            value={values.budget}
            onChange={(e) => setValue('budget', e.target.value)}
          >
            {BUDGETS.map((key) => (
              <option value={key} key={key}>
                {t(`budget.${key}`)}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label={t('brief.fields.timeline')}
          htmlFor="lead-edit-timeline"
          error={issueByPath.get('timeline')}
          required
        >
          <select
            id="lead-edit-timeline"
            className="select"
            value={values.timeline}
            onChange={(e) => setValue('timeline', e.target.value)}
          >
            {TIMELINES.map((key) => (
              <option value={key} key={key}>
                {t(`timeline.${key}`)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="field">
        <span className="field__label">{t('brief.fields.features')}</span>
        <div className="check-group" style={{ marginTop: 8 }}>
          {FEATURES.map((key) => (
            <label className="check" key={key}>
              <input
                type="checkbox"
                checked={values.features.includes(key)}
                onChange={() => toggleFeature(key)}
              />
              <span>{t(`feature.${key}`)}</span>
            </label>
          ))}
        </div>
      </div>

      <Field
        label={t('brief.fields.reference')}
        htmlFor="lead-edit-reference"
        error={issueByPath.get('reference')}
      >
        <input
          id="lead-edit-reference"
          className="input"
          value={values.reference}
          onChange={(e) => setValue('reference', e.target.value)}
        />
      </Field>

      <Field
        label={t('brief.fields.brief')}
        htmlFor="lead-edit-brief"
        error={issueByPath.get('brief')}
        required
      >
        <textarea
          id="lead-edit-brief"
          className="textarea"
          rows={5}
          value={values.brief}
          onChange={(e) => setValue('brief', e.target.value)}
          required
        />
      </Field>

      <div className="cluster" style={{ justifyContent: 'flex-start' }}>
        <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>
          <Save size={15} aria-hidden="true" />
          {saving ? t('common.saving') : t('admin.leads.detail.saveBrief')}
        </button>
        <button
          type="button"
          className="btn btn--quiet btn--sm"
          onClick={onCancel}
          disabled={saving}
        >
          {t('common.cancel')}
        </button>
      </div>
    </form>
  )
}
