import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { useI18n } from '../../i18n/index.jsx'

/*
  Pop-up dibangun di atas elemen <dialog> bawaan browser. Alasannya:
  perangkap fokus, tombol Escape, dan pelapisan di atas konten lain sudah
  ditangani platform, sehingga tidak perlu ditulis ulang dan hasilnya
  tetap benar untuk pengguna keyboard maupun pembaca layar.
*/
export function Modal({ open, title, onClose, children, size = 'md' }) {
  const { t } = useI18n()
  const dialogRef = useRef(null)
  const titleIdRef = useRef(`judul-popup-${Math.random().toString(36).slice(2, 8)}`)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  // Gulir latar dikunci supaya roda tetikus tidak menggeser halaman di belakang pop-up.
  useEffect(() => {
    if (!open) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      className={`modal modal--${size}`}
      aria-labelledby={titleIdRef.current}
      onCancel={(event) => {
        // Escape ditangani sendiri agar state di React ikut tertutup,
        // bukan hanya elemen dom-nya.
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose()
      }}
    >
      <div className="modal__panel">
        <header className="modal__head">
          <h2 id={titleIdRef.current}>{title}</h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label={t('common.close')}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="modal__body">{children}</div>
      </div>
    </dialog>
  )
}

// Konfirmasi tindakan merusak. Dipakai menggantikan window.confirm supaya
// pertanyaannya ikut bahasa antarmuka dan tampil konsisten dengan pop-up lain.
export function ConfirmDialog({ open, title, body, confirmLabel, onConfirm, onCancel, busy }) {
  const { t } = useI18n()

  return (
    <Modal open={open} title={title} onClose={onCancel} size="sm">
      <div className="stack">
        <p className="muted">{body}</p>
        <div className="cluster" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn--quiet btn--sm" onClick={onCancel}>
            {t('common.cancel')}
          </button>
          <button type="button" className="btn btn--danger btn--sm" onClick={onConfirm} disabled={busy}>
            {confirmLabel || t('common.delete')}
          </button>
        </div>
      </div>
    </Modal>
  )
}
