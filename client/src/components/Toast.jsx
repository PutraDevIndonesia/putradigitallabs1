import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Check, Info, X } from 'lucide-react'
import { useI18n } from '../i18n/index.jsx'

const ToastContext = createContext(null)
const TOAST_TTL_MS = 5200

const ICONS = { ok: Check, error: AlertTriangle, info: Info }

function ToastItem({ toast, onDismiss }) {
  const { t } = useI18n()
  const Icon = ICONS[toast.tone] || Info

  return (
    <div className={`toast toast--${toast.tone}`}>
      <Icon size={18} aria-hidden="true" style={{ flex: 'none', marginTop: 1 }} />
      <span>{toast.message}</span>
      <button type="button" onClick={() => onDismiss(toast.id)} aria-label={t('common.close')}>
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const nextId = useRef(0)

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const notify = useCallback(
    (message, tone = 'ok') => {
      nextId.current += 1
      const id = nextId.current
      setToasts((current) => [...current, { id, tone, message }])
      window.setTimeout(() => dismiss(id), TOAST_TTL_MS)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ notify }), [notify])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast harus dipakai di dalam ToastProvider')
  return context
}
