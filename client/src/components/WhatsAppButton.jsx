import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, X } from 'lucide-react'
import { SiWhatsapp } from 'react-icons/si'
import { useI18n } from '../i18n/index.jsx'
import { whatsappLink, whatsappNumber } from '../lib/format.js'

const RAW_NUMBER = (import.meta.env.VITE_WHATSAPP || '').trim()

/*
  Tombol WhatsApp mengambang. Kliknya membuka pop-up kecil berisi pesan pesanan
  yang sudah disiapkan, lalu satu tombol membuka WhatsApp dengan pesan itu.

  Pop-up ini tidak memakai komponen Modal karena sifatnya bukan dialog yang
  menghentikan halaman: pengunjung masih boleh menggulir dan membaca sambil
  panelnya terbuka. Karena itu kunci gulir tidak dipasang dan fokus hanya
  dipindahkan seperlunya.
*/
export function WhatsAppButton() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const buttonRef = useRef(null)
  const sendRef = useRef(null)

  const message = t('wa.messageTemplate')
  const link = whatsappLink(RAW_NUMBER, message)

  useEffect(() => {
    if (!open) return undefined

    function handleKey(event) {
      if (event.key === 'Escape') {
        setOpen(false)
        // Fokus dikembalikan ke tombol agar pengguna keyboard tidak tersesat.
        buttonRef.current?.focus()
      }
    }

    function handlePointerDown(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false)
    }

    document.addEventListener('keydown', handleKey)
    document.addEventListener('pointerdown', handlePointerDown)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [open])

  // Nomor yang tidak valid tidak menghasilkan tombol sama sekali, supaya tidak
  // ada tombol mati yang mengarah ke tautan rusak.
  if (!whatsappNumber(RAW_NUMBER) || !link) return null

  return (
    <div className="wa" ref={wrapRef}>
      {open ? (
        <div className="wa__panel reveal" role="dialog" aria-labelledby="wa-judul">
          <div className="wa__head">
            <h2 id="wa-judul">{t('wa.title')}</h2>
            <button
              type="button"
              className="wa__close"
              onClick={() => {
                setOpen(false)
                buttonRef.current?.focus()
              }}
              aria-label={t('common.close')}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          <p className="wa__intro">{t('wa.intro')}</p>

          <pre className="wa__preview" aria-label={t('wa.title')}>
            {message}
          </pre>

          <div className="wa__actions">
            <a className="btn btn--primary btn--sm" href={link} target="_blank" rel="noreferrer" ref={sendRef}>
              <SiWhatsapp size={16} aria-hidden="true" />
              {t('wa.send')}
              <ArrowUpRight size={15} aria-hidden="true" />
            </a>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        className="wa__button"
        ref={buttonRef}
        aria-expanded={open}
        aria-controls="wa-panel"
        onClick={() => setOpen((current) => !current)}
      >
        <SiWhatsapp size={22} aria-hidden="true" />
        <span className="wa__label">{t('wa.open')}</span>
      </button>
    </div>
  )
}
