import { Outlet } from 'react-router-dom'
import { Footer } from './Footer.jsx'
import { Header } from './Header.jsx'
import { WhatsAppButton } from './WhatsAppButton.jsx'
import { useI18n } from '../i18n/index.jsx'

export function PublicLayout() {
  const { t } = useI18n()

  return (
    <>
      <a className="skip-link" href="#main">
        {t('nav.skipToContent')}
      </a>
      <Header />
      <main id="main">
        <Outlet />
      </main>
      <Footer />
      {/* Tombol pesanan cepat hanya di halaman pengunjung; di dashboard admin
          tidak ada gunanya karena operator yang sedang mengisinya. */}
      <WhatsAppButton />
    </>
  )
}
