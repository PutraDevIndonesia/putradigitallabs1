import { useState } from 'react'
import { Save } from 'lucide-react'
import { Field, InlineAlert } from '../ui.jsx'
import { useI18n } from '../../i18n/index.jsx'

export const PAYMENT_KINDS = ['dp', 'pelunasan', 'lainnya']
export const PAYMENT_STATUSES = ['diterima', 'menunggu']
export const PAYMENT_METHODS = ['transfer', 'tunai', 'qris', 'lainnya']

export function emptyPayment(leadId = '') {
  return {
    leadId,
    amount: '',
    kind: 'dp',
    method: 'transfer',
    paidAt: new Date().toISOString().slice(0, 10),
    status: 'diterima',
    note: '',
  }
}

export function toPaymentValues(payment) {
  if (!payment) return emptyPayment()
  return {
    leadId: payment.leadId || '',
    amount: payment.amount === null || payment.amount === undefined ? '' : String(payment.amount),
    kind: payment.kind || 'dp',
    method: payment.method || 'transfer',
    paidAt: payment.paidAt || '',
    status: payment.status || 'diterima',
    note: payment.note || '',
  }
}

export function toPaymentPayload(values) {
  return {
    leadId: String(values.leadId || '').trim(),
    amount: Number(values.amount || 0),
    kind: values.kind,
    method: values.method,
    paidAt: String(values.paidAt || '').trim(),
    status: values.status,
    note: String(values.note || '').trim(),
  }
}

/*
  Satu form dipakai oleh dua tempat: halaman Transaksi (proyek dipilih dari daftar)
  dan halaman detail brief (proyeknya sudah pasti, jadi pilihannya dikunci).
*/
export function PaymentForm({ initialValues, leads = [], fixedLeadId, saving, issues, onSubmit, onCancel }) {
  const { t } = useI18n()
  const [values, setValues] = useState(initialValues)

  function setValue(key, value) {
    setValues((current) => ({ ...current, [key]: value }))
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

      <div className="field-grid field-grid--2">
        {!fixedLeadId ? (
          <Field label={t('admin.payments.fields.lead')} required htmlFor="pay-lead" error={issueFor('leadId')}>
            <select
              id="pay-lead"
              className="select"
              value={values.leadId}
              onChange={(event) => setValue('leadId', event.target.value)}
            >
              <option value="">{t('admin.payments.selectLead')}</option>
              {leads.map((lead) => (
                <option value={lead.id} key={lead.id}>
                  {lead.name}
                  {lead.company ? ` · ${lead.company}` : ''}
                </option>
              ))}
            </select>
          </Field>
        ) : null}

        <Field label={t('admin.payments.fields.amount')} required htmlFor="pay-amount" error={issueFor('amount')}>
          <input
            id="pay-amount"
            className="input mono"
            type="number"
            min="0"
            step="1000"
            value={values.amount}
            onChange={(event) => setValue('amount', event.target.value)}
          />
        </Field>

        <Field label={t('admin.payments.fields.kind')} htmlFor="pay-kind">
          <select id="pay-kind" className="select" value={values.kind} onChange={(event) => setValue('kind', event.target.value)}>
            {PAYMENT_KINDS.map((key) => (
              <option value={key} key={key}>
                {t(`admin.payments.kinds.${key}`)}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t('admin.payments.fields.status')} htmlFor="pay-status">
          <select
            id="pay-status"
            className="select"
            value={values.status}
            onChange={(event) => setValue('status', event.target.value)}
          >
            {PAYMENT_STATUSES.map((key) => (
              <option value={key} key={key}>
                {t(`admin.payments.statuses.${key}`)}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t('admin.payments.fields.method')} htmlFor="pay-method">
          <select
            id="pay-method"
            className="select"
            value={values.method}
            onChange={(event) => setValue('method', event.target.value)}
          >
            {PAYMENT_METHODS.map((key) => (
              <option value={key} key={key}>
                {t(`admin.payments.methods.${key}`)}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t('admin.payments.fields.date')} htmlFor="pay-date">
          <input
            id="pay-date"
            className="input"
            type="date"
            value={values.paidAt}
            onChange={(event) => setValue('paidAt', event.target.value)}
          />
        </Field>

        <Field label={t('admin.payments.fields.note')} htmlFor="pay-note">
          <input
            id="pay-note"
            className="input"
            value={values.note}
            onChange={(event) => setValue('note', event.target.value)}
          />
        </Field>
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
