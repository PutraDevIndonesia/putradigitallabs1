import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { Field, InlineAlert } from '../../components/ui.jsx'
import { useI18n } from '../../i18n/index.jsx'
import { ApiError, adminApi, getToken, setToken } from '../../lib/api.js'
import { useDocumentTitle } from '../../lib/useDocumentTitle.js'

export default function AdminLogin() {
  const { t } = useI18n()
  const navigate = useNavigate()
  useDocumentTitle(t('admin.login.title'))

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Token lama langsung diarahkan ke ringkasan; validitasnya diperiksa di AdminLayout.
  useEffect(() => {
    if (getToken()) navigate('/admin/ringkasan', { replace: true })
  }, [navigate])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const result = await adminApi.login(email.trim(), password)
      setToken(result.token)
      navigate('/admin/ringkasan', { replace: true })
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 503) setError(t('admin.login.notConfigured'))
      else if (caught instanceof ApiError && caught.status === 401) setError(t('admin.login.invalid'))
      else if (caught instanceof ApiError && caught.message === 'network_error') setError(t('common.networkError'))
      else setError(t('common.errorGeneric'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="admin-login">
      <div className="admin-login__card">
        <div className="rule-brand" />
        <div className="admin-login__body">
          <div className="stack stack--tight">
            <h1 style={{ fontSize: 'var(--step-4)' }}>{t('admin.login.title')}</h1>
            <p className="muted" style={{ fontSize: 'var(--step-2)' }}>
              {t('admin.login.lede')}
            </p>
          </div>

          {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}

          <form className="stack" onSubmit={handleSubmit}>
            <Field label={t('admin.login.email')} htmlFor="admin-email">
              <input
                id="admin-email"
                className="input"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </Field>

            <Field label={t('admin.login.password')} htmlFor="admin-password">
              <input
                id="admin-password"
                className="input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </Field>

            <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
              <LogIn size={16} aria-hidden="true" />
              {submitting ? t('admin.login.submitting') : t('admin.login.submit')}
            </button>
          </form>

          <Link to="/" className="muted" style={{ fontSize: 'var(--step-2)' }}>
            {t('admin.login.backToSite')}
          </Link>
        </div>
      </div>
    </div>
  )
}
