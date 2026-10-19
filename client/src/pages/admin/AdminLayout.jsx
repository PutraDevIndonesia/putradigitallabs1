import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { ExternalLink, LogOut } from 'lucide-react'
import { adminApi, clearToken, getToken } from '../../lib/api.js'
import { useI18n } from '../../i18n/index.jsx'

const NAV_ITEMS = [
  { to: '/admin/ringkasan', key: 'admin.nav.overview' },
  { to: '/admin/lead', key: 'admin.nav.leads' },
  { to: '/admin/transaksi', key: 'admin.nav.payments' },
  { to: '/admin/layanan', key: 'admin.nav.services' },
  { to: '/admin/paket', key: 'admin.nav.plans' },
  { to: '/admin/portofolio', key: 'admin.nav.work' },
  { to: '/admin/artikel', key: 'admin.nav.blog' },
]

export function AdminLayout() {
  const { t } = useI18n()
  const navigate = useNavigate()
  // Tiga keadaan: belum ada token, sedang memverifikasi, atau siap.
  // Verifikasi dilakukan ke server supaya token kedaluwarsa tidak dianggap valid
  // hanya karena masih tersimpan di localStorage.
  const [state, setState] = useState(() => (getToken() ? 'checking' : 'anonymous'))

  useEffect(() => {
    if (!getToken()) {
      setState('anonymous')
      return undefined
    }

    let active = true
    adminApi.session().then(
      () => {
        if (active) setState('ready')
      },
      () => {
        if (!active) return
        clearToken()
        setState('anonymous')
      },
    )

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (state === 'anonymous') navigate('/admin', { replace: true })
  }, [state, navigate])

  function handleLogout() {
    clearToken()
    navigate('/admin', { replace: true })
  }

  if (state !== 'ready') {
    return (
      <div className="container section">
        <p className="muted">{t('common.loading')}</p>
      </div>
    )
  }

  return (
    <div className="admin">
      <div className="admin__bar">
        <div className="container admin__bar-inner">
          <img src="/logo.png" alt="" width="28" height="28" style={{ objectFit: 'contain' }} />
          <h1>{t('admin.title')}</h1>
          <div className="cluster" style={{ marginLeft: 'auto' }}>
            <Link to="/" className="btn btn--quiet btn--sm">
              <ExternalLink size={15} aria-hidden="true" />
              {t('admin.nav.viewSite')}
            </Link>
            <button type="button" className="btn btn--outline btn--sm" onClick={handleLogout}>
              <LogOut size={15} aria-hidden="true" />
              {t('admin.nav.logout')}
            </button>
          </div>
        </div>
      </div>

      <div className="container admin__shell">
        <nav className="admin__nav" aria-label={t('admin.title')}>
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to}>
              {t(item.key)}
            </NavLink>
          ))}
        </nav>

        <div className="admin__main">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
