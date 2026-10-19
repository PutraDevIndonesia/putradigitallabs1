import { Link } from 'react-router-dom'
import { Mail, MapPin, Phone } from 'lucide-react'
import { useI18n } from '../i18n/index.jsx'

// Kanal kontak dibaca dari environment. Yang kosong tidak ditampilkan,
// jadi footer tidak pernah memuat nomor atau alamat karangan.
const CONTACT = {
  email: (import.meta.env.VITE_CONTACT_EMAIL || '').trim(),
  phone: (import.meta.env.VITE_CONTACT_PHONE || '').trim(),
  whatsapp: (import.meta.env.VITE_WHATSAPP || '').trim(),
  address: (import.meta.env.VITE_ADDRESS || '').trim(),
}

function whatsappHref(value) {
  const digits = value.replace(/[^\d]/g, '')
  return digits ? `https://wa.me/${digits}` : ''
}

export function Footer() {
  const { t } = useI18n()
  const year = new Date().getFullYear()
  const hasContact = Boolean(CONTACT.email || CONTACT.phone || CONTACT.whatsapp || CONTACT.address)

  return (
    <footer className="site-footer">
      <div className="band">
        <div className="footer-grid">
          <div className="stack stack--tight">
            <h3>Putra Digital Labs</h3>
            <p className="muted" style={{ fontSize: 'var(--step-2)', maxWidth: '46ch' }}>
              {t('footer.aboutBody')}
            </p>
          </div>

          <div>
            <h3>{t('footer.linksTitle')}</h3>
            <ul className="footer-links">
              <li>
                <Link to="/layanan">{t('nav.services')}</Link>
              </li>
              <li>
                <Link to="/paket">{t('nav.plans')}</Link>
              </li>
              <li>
                <Link to="/portofolio">{t('nav.work')}</Link>
              </li>
              <li>
                <Link to="/artikel">{t('nav.blog')}</Link>
              </li>
              <li>
                <Link to="/brief">{t('nav.brief')}</Link>
              </li>
              <li>
                <Link to="/lacak">{t('nav.track')}</Link>
              </li>
            </ul>
          </div>

          <div>
            <h3>{t('footer.contactTitle')}</h3>
            {hasContact ? (
              <ul className="footer-links">
                {CONTACT.email ? (
                  <li>
                    <a href={`mailto:${CONTACT.email}`}>
                      <Mail size={15} aria-hidden="true" style={{ marginRight: 6, verticalAlign: '-2px' }} />
                      {CONTACT.email}
                    </a>
                  </li>
                ) : null}
                {CONTACT.phone ? (
                  <li>
                    <a href={`tel:${CONTACT.phone.replace(/\s/g, '')}`}>
                      <Phone size={15} aria-hidden="true" style={{ marginRight: 6, verticalAlign: '-2px' }} />
                      {CONTACT.phone}
                    </a>
                  </li>
                ) : null}
                {CONTACT.whatsapp ? (
                  <li>
                    <a href={whatsappHref(CONTACT.whatsapp)} target="_blank" rel="noreferrer">
                      WhatsApp
                    </a>
                  </li>
                ) : null}
                {CONTACT.address ? (
                  <li className="muted">
                    <MapPin size={15} aria-hidden="true" style={{ marginRight: 6, verticalAlign: '-2px' }} />
                    {CONTACT.address}
                  </li>
                ) : null}
              </ul>
            ) : (
              <p className="muted" style={{ fontSize: 'var(--step-2)' }}>
                {t('footer.noContact')}
              </p>
            )}
          </div>
        </div>

        <div className="footer-bottom">
          <span>
            &copy; {year} Putra Digital Labs. {t('footer.rights')}
          </span>
        </div>
      </div>
    </footer>
  )
}
