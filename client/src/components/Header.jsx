import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useI18n } from '../i18n/index.jsx'

const NAV_ITEMS = [
  { to: '/layanan', key: 'nav.services' },
  { to: '/paket', key: 'nav.plans' },
  { to: '/portofolio', key: 'nav.work' },
  { to: '/artikel', key: 'nav.blog' },
]

// Logo diambil dari client/public/logo.png. Kalau file belum ada, penanda teks
// ditampilkan agar header tidak menampilkan gambar yang rusak.
function BrandMark() {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <span className="brand__fallback" aria-hidden="true">
        PD
      </span>
    )
  }

  return (
    <img
      className="brand__mark"
      src="/logo.png"
      alt=""
      width="34"
      height="34"
      onError={() => setFailed(true)}
    />
  )
}

export function Header() {
  const { t, locale, setLocale } = useI18n()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  // Menu ponsel ditutup setiap kali pindah halaman supaya tidak menutupi konten baru.
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!menuOpen) return undefined
    function handleKey(event) {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [menuOpen])

  return (
    <header className="site-header">
      <div className="rule-brand" />
      <div className="band site-header__inner">
        <Link to="/" className="brand" aria-label={t('brand.name')}>
          <BrandMark />
          <span className="brand__name">
            <strong>Putra Digital Labs</strong>
            <span>{t('brand.tagline')}</span>
          </span>
        </Link>

        <nav className="site-nav" aria-label={t('nav.main')}>
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to}>
              {t(item.key)}
            </NavLink>
          ))}
          <NavLink to="/lacak">{t('nav.track')}</NavLink>
        </nav>

        <div className="header-tools">
          <div className="lang" role="group" aria-label={t('nav.language')}>
            <button type="button" aria-pressed={locale === 'id'} onClick={() => setLocale('id')}>
              ID
            </button>
            <button type="button" aria-pressed={locale === 'en'} onClick={() => setLocale('en')}>
              EN
            </button>
          </div>

          <Link to="/brief" className="btn btn--primary btn--sm header-cta">
            {t('nav.brief')}
          </Link>

          <button
            type="button"
            className="nav-toggle"
            aria-expanded={menuOpen}
            aria-controls="menu-ponsel"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            <span className="visually-hidden">{menuOpen ? t('nav.closeMenu') : t('nav.openMenu')}</span>
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className="mobile-nav" id="menu-ponsel">
          <div className="band">
            <ul>
              {NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to}>{t(item.key)}</NavLink>
                </li>
              ))}
              <li>
                <NavLink to="/lacak">{t('nav.track')}</NavLink>
              </li>
              <li>
                <NavLink to="/brief">{t('nav.brief')}</NavLink>
              </li>
            </ul>
          </div>
        </div>
      ) : null}
    </header>
  )
}
