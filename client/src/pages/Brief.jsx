import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronLeft, Send } from 'lucide-react'
import { CopyButton, Field, InlineAlert, PageHeader } from '../components/ui.jsx'
import { useI18n } from '../i18n/index.jsx'
import { ApiError, publicApi } from '../lib/api.js'
import { saveLastTicket } from '../lib/lastTicket.js'
import { useDocumentTitle } from '../lib/useDocumentTitle.js'

// Daftar ini harus sama dengan enum di server/src/validate.js.
const PROJECT_TYPES = ['company-profile', 'toko-online', 'sistem-internal', 'landing-page', 'redesign', 'lainnya']
const BUDGETS = ['belum-tahu', 'sampai-5', '5-15', '15-50', 'diatas-50']
const TIMELINES = ['secepatnya', 'satu-dua-bulan', 'tiga-enam-bulan', 'belum-jelas']
const FEATURES = ['auth', 'payment', 'cms', 'multi-bahasa', 'integrasi-api', 'laporan', 'notifikasi', 'seo', 'pwa']

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  company: '',
  role: '',
  projectType: '',
  budget: '',
  timeline: '',
  features: [],
  reference: '',
  brief: '',
  website: '',
}

// Kode kesalahan dari API diterjemahkan lewat kamus bahasa. Kode yang tidak
// dikenal jatuh ke kalimat umum supaya teks teknis tidak tampil ke pengunjung.
function noticeMessage(t, code) {
  if (!code) return ''
  if (code === 'network_error') return t('common.networkError')
  const translated = t(`errors.${code}`)
  return translated.startsWith('errors.') ? t('common.errorGeneric') : translated
}

export default function Brief() {
  const { t } = useI18n()
  useDocumentTitle(t('brief.title'))

  const [step, setStep] = useState(0)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [ticketCode, setTicketCode] = useState('')

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  function toggleFeature(key) {
    setForm((current) => ({
      ...current,
      features: current.features.includes(key)
        ? current.features.filter((item) => item !== key)
        : [...current.features, key],
    }))
  }

  // Validasi dijalankan per langkah supaya kesalahan muncul di langkah yang sedang diisi,
  // bukan menumpuk di akhir setelah semua isian diisi.
  function validateStep(index) {
    const found = {}

    if (index === 0) {
      if (form.name.trim().length < 2) found.name = t('brief.validation.step1')
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) found.email = t('brief.validation.emailInvalid')
      if (form.phone.replace(/\D/g, '').length < 9) found.phone = t('brief.validation.phoneInvalid')
    }

    if (index === 1) {
      if (!form.projectType) found.projectType = t('brief.validation.step2')
      if (!form.budget) found.budget = t('brief.validation.step2')
      if (!form.timeline) found.timeline = t('brief.validation.step2')
    }

    if (index === 2) {
      if (form.brief.trim().length < 20) found.brief = t('brief.validation.step3')
    }

    return found
  }

  function goNext() {
    const found = validateStep(step)
    setErrors(found)
    if (Object.keys(found).length === 0) setStep((current) => Math.min(current + 1, 2))
  }

  function goBack() {
    setErrors({})
    setStep((current) => Math.max(current - 1, 0))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setNotice(null)

    const found = { ...validateStep(0), ...validateStep(1), ...validateStep(2) }
    if (Object.keys(found).length > 0) {
      setErrors(found)
      setStep(found.brief ? 2 : found.projectType || found.budget || found.timeline ? 1 : 0)
      return
    }

    setSubmitting(true)
    try {
      const result = await publicApi.createLead({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        company: form.company.trim(),
        role: form.role.trim(),
        projectType: form.projectType,
        budget: form.budget,
        timeline: form.timeline,
        features: form.features,
        reference: form.reference.trim(),
        brief: form.brief.trim(),
        website: form.website,
      })
      const code = result?.ticketCode || ''
      // Kode disimpan di perangkat supaya halaman lacak bisa mengisinya sendiri.
      saveLastTicket(code)
      setTicketCode(code)
      setForm(EMPTY_FORM)
      setStep(0)
    } catch (error) {
      const code = error instanceof ApiError ? error.message : 'internal_error'
      setNotice(code)
    } finally {
      setSubmitting(false)
    }
  }

  if (ticketCode) {
    const nextSteps = t('brief.nextSteps')

    return (
      <>
        <PageHeader eyebrow={t('brief.eyebrow')} title={t('brief.successTitle')} lede={t('brief.successBody')} />

        <section className="section section--plain">
          <div className="container">
            <div className="receipt">
              <div className="ticket">
                <div className="ticket__main">
                  <span className="ticket__label">{t('brief.ticketLabel')}</span>
                  <span className="ticket__code">{ticketCode}</span>
                </div>
                <CopyButton value={ticketCode} />
              </div>

              <p className="field__hint">{t('brief.ticketHint')}</p>

              <div className="receipt__next">
                <h2>{t('brief.nextTitle')}</h2>
                <ol className="action-list">
                  {(Array.isArray(nextSteps) ? nextSteps : []).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              </div>

              <div className="cluster">
                <Link to="/lacak" className="btn btn--primary">
                  {t('brief.trackLink')}
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
                <button type="button" className="btn btn--outline" onClick={() => setTicketCode('')}>
                  {t('brief.sendAnother')}
                </button>
              </div>
            </div>
          </div>
        </section>
      </>
    )
  }

  const noticeText = notice ? noticeMessage(t, notice) : ''
  const stepLabels = t('brief.steps')

  return (
    <>
      <PageHeader eyebrow={t('brief.eyebrow')} title={t('brief.title')} lede={t('brief.lede')} />

      <section className="section section--plain">
        <div className="container" style={{ maxWidth: 780 }}>
          <ol className="steps">
            {(Array.isArray(stepLabels) ? stepLabels : []).map((label, index) => (
              <li
                className="steps__item"
                key={label}
                aria-current={index === step ? 'step' : undefined}
                data-done={index < step}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                <span>{label}</span>
              </li>
            ))}
          </ol>

          {noticeText ? (
            <div style={{ marginBottom: 22 }}>
              <InlineAlert tone="error">{noticeText}</InlineAlert>
            </div>
          ) : null}

          <form className="card" onSubmit={handleSubmit} noValidate>
            {step === 0 ? (
              <div className="field-grid field-grid--2">
                <Field label={t('brief.fields.name')} required htmlFor="brief-name" error={errors.name}>
                  <input
                    id="brief-name"
                    className="input"
                    value={form.name}
                    onChange={(event) => update('name', event.target.value)}
                    placeholder={t('brief.fields.namePlaceholder')}
                    autoComplete="name"
                    aria-invalid={Boolean(errors.name)}
                  />
                </Field>

                <Field label={t('brief.fields.email')} required htmlFor="brief-email" error={errors.email}>
                  <input
                    id="brief-email"
                    className="input"
                    type="email"
                    value={form.email}
                    onChange={(event) => update('email', event.target.value)}
                    placeholder={t('brief.fields.emailPlaceholder')}
                    autoComplete="email"
                    aria-invalid={Boolean(errors.email)}
                  />
                </Field>

                <Field label={t('brief.fields.phone')} required htmlFor="brief-phone" error={errors.phone}>
                  <input
                    id="brief-phone"
                    className="input"
                    type="tel"
                    value={form.phone}
                    onChange={(event) => update('phone', event.target.value)}
                    placeholder={t('brief.fields.phonePlaceholder')}
                    autoComplete="tel"
                    aria-invalid={Boolean(errors.phone)}
                  />
                </Field>

                <Field label={t('brief.fields.company')} htmlFor="brief-company">
                  <input
                    id="brief-company"
                    className="input"
                    value={form.company}
                    onChange={(event) => update('company', event.target.value)}
                    placeholder={t('brief.fields.companyPlaceholder')}
                    autoComplete="organization"
                  />
                </Field>

                <Field label={t('brief.fields.role')} htmlFor="brief-role">
                  <input
                    id="brief-role"
                    className="input"
                    value={form.role}
                    onChange={(event) => update('role', event.target.value)}
                    placeholder={t('brief.fields.rolePlaceholder')}
                    autoComplete="organization-title"
                  />
                </Field>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="field-grid">
                <Field label={t('brief.fields.projectType')} required htmlFor="brief-type" error={errors.projectType}>
                  <select
                    id="brief-type"
                    className="select"
                    value={form.projectType}
                    onChange={(event) => update('projectType', event.target.value)}
                    aria-invalid={Boolean(errors.projectType)}
                  >
                    <option value="">-</option>
                    {PROJECT_TYPES.map((key) => (
                      <option value={key} key={key}>
                        {t(`projectType.${key}`)}
                      </option>
                    ))}
                  </select>
                </Field>

                <div className="field-grid field-grid--2">
                  <Field label={t('brief.fields.budget')} required htmlFor="brief-budget" error={errors.budget}>
                    <select
                      id="brief-budget"
                      className="select"
                      value={form.budget}
                      onChange={(event) => update('budget', event.target.value)}
                      aria-invalid={Boolean(errors.budget)}
                    >
                      <option value="">-</option>
                      {BUDGETS.map((key) => (
                        <option value={key} key={key}>
                          {t(`budget.${key}`)}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label={t('brief.fields.timeline')} required htmlFor="brief-timeline" error={errors.timeline}>
                    <select
                      id="brief-timeline"
                      className="select"
                      value={form.timeline}
                      onChange={(event) => update('timeline', event.target.value)}
                      aria-invalid={Boolean(errors.timeline)}
                    >
                      <option value="">-</option>
                      {TIMELINES.map((key) => (
                        <option value={key} key={key}>
                          {t(`timeline.${key}`)}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="field-grid">
                <div className="field">
                  <span className="field__label">{t('brief.fields.features')}</span>
                  <div className="check-group" style={{ marginTop: 8 }}>
                    {FEATURES.map((key) => (
                      <label className="check" key={key}>
                        <input
                          type="checkbox"
                          checked={form.features.includes(key)}
                          onChange={() => toggleFeature(key)}
                        />
                        <span>{t(`feature.${key}`)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <Field label={t('brief.fields.reference')} htmlFor="brief-reference">
                  <input
                    id="brief-reference"
                    className="input"
                    value={form.reference}
                    onChange={(event) => update('reference', event.target.value)}
                    placeholder={t('brief.fields.referencePlaceholder')}
                  />
                </Field>

                <Field label={t('brief.fields.brief')} required htmlFor="brief-body" error={errors.brief}>
                  <textarea
                    id="brief-body"
                    className="textarea"
                    value={form.brief}
                    onChange={(event) => update('brief', event.target.value)}
                    placeholder={t('brief.fields.briefPlaceholder')}
                    aria-invalid={Boolean(errors.brief)}
                  />
                </Field>
              </div>
            ) : null}

            {/* Honeypot: disembunyikan dari penglihatan dan pembaca layar.
                Manusia tidak mengisinya, bot pengisi formulir biasanya mengisi. */}
            <div className="honeypot" aria-hidden="true">
              <label htmlFor="brief-website">{t('brief.fields.honeypot')}</label>
              <input
                id="brief-website"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={form.website}
                onChange={(event) => update('website', event.target.value)}
              />
            </div>

            <div className="form-actions">
              <button type="button" className="btn btn--quiet" onClick={goBack} disabled={step === 0}>
                <ChevronLeft size={16} aria-hidden="true" />
                {t('brief.stepLabels.back')}
              </button>

              {step < 2 ? (
                <button type="button" className="btn btn--primary" onClick={goNext}>
                  {t('brief.stepLabels.next')}
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              ) : (
                <button type="submit" className="btn btn--primary" disabled={submitting}>
                  <Send size={16} aria-hidden="true" />
                  {submitting ? t('brief.stepLabels.submitting') : t('brief.stepLabels.submit')}
                </button>
              )}
            </div>
          </form>
        </div>
      </section>
    </>
  )
}
