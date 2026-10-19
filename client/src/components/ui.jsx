import { useEffect, useState } from 'react'
import { AlertTriangle, Check, CircleAlert, Copy, Inbox } from 'lucide-react'
import { useI18n } from '../i18n/index.jsx'

export function SectionHead({ eyebrow, title, lede }) {
  return (
    <div className="section__head">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h2>{title}</h2>
      {lede ? <p className="lede">{lede}</p> : null}
    </div>
  )
}

export function PageHeader({ eyebrow, title, lede }) {
  return (
    <header className="section section--plain" style={{ paddingBottom: 8 }}>
      <div className="container">
        <div className="section__head" style={{ marginBottom: 0 }}>
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h1>{title}</h1>
          {lede ? <p className="lede">{lede}</p> : null}
        </div>
      </div>
    </header>
  )
}

export function Skeleton({ height = 16, width = '100%', radius = 2 }) {
  return <span className="skeleton" style={{ display: 'block', height, width, borderRadius: radius }} />
}

export function LoadingBlock({ label, rows = 3 }) {
  const { t } = useI18n()
  return (
    <div className="stack" role="status" aria-live="polite" aria-busy="true">
      <span className="visually-hidden">{label || t('common.loading')}</span>
      {Array.from({ length: rows }).map((_item, index) => (
        <Skeleton key={index} height={index === 0 ? 22 : 14} width={index === 0 ? '38%' : '100%'} />
      ))}
    </div>
  )
}

// Kesalahan dari API dikodekan (mis. rate_limited). Peta kode ke kalimat
// dilakukan di kamus bahasa, dengan satu kalimat umum sebagai cadangan.
export function ErrorBlock({ error, onRetry }) {
  const { t } = useI18n()
  const code = error?.message || 'internal_error'
  const translated = t(`errors.${code}`)
  const message = translated.startsWith('errors.') ? t('common.errorGeneric') : translated
  const isNetwork = code === 'network_error'

  return (
    <div className="notice notice--error" role="alert">
      <AlertTriangle size={18} aria-hidden="true" style={{ flex: 'none', marginTop: 2 }} />
      <div className="stack stack--tight">
        <span>{isNetwork ? t('common.networkError') : message}</span>
        {onRetry ? (
          <button type="button" className="btn btn--outline btn--sm" onClick={onRetry} style={{ width: 'fit-content' }}>
            {t('common.retry')}
          </button>
        ) : null}
      </div>
    </div>
  )
}

export function EmptyState({ title, body, action, icon: Icon = Inbox }) {
  return (
    <div className="empty">
      <Icon size={22} aria-hidden="true" style={{ color: 'var(--ink-300)' }} />
      <h3>{title}</h3>
      {body ? <p className="muted">{body}</p> : null}
      {action || null}
    </div>
  )
}

export function Field({ label, hint, error, required, htmlFor, children }) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={htmlFor}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {hint ? <p className="field__hint">{hint}</p> : null}
      {children}
      {error ? (
        <p className="field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function CopyButton({ value, label }) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!copied) return undefined
    const timer = window.setTimeout(() => setCopied(false), 2200)
    return () => window.clearTimeout(timer)
  }, [copied])

  async function handleCopy() {
    try {
      await window.navigator.clipboard.writeText(value)
      setCopied(true)
      setFailed(false)
    } catch {
      // Browser menolak akses papan klip (umumnya karena halaman bukan HTTPS).
      // Kegagalan ini diberitahukan, bukan didiamkan, supaya pengunjung tahu
      // harus menyalin sendiri dan tidak mengira kodenya sudah tersalin.
      setCopied(false)
      setFailed(true)
    }
  }

  return (
    <div className="copy">
      <button type="button" className="btn btn--outline btn--sm" onClick={handleCopy}>
        {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
        <span>{copied ? t('common.copied') : failed ? t('common.copyManual') : label || t('common.copy')}</span>
        <span className="visually-hidden" aria-live="polite">
          {copied ? t('common.copied') : ''}
        </span>
      </button>

      {failed ? (
        <p className="field__hint copy__hint" role="alert">
          {t('common.copyManualHint')}
        </p>
      ) : null}
    </div>
  )
}

export function InlineAlert({ tone = 'info', children }) {
  const Icon = tone === 'error' ? AlertTriangle : CircleAlert
  return (
    <div className={`notice notice--${tone}`} role={tone === 'error' ? 'alert' : undefined}>
      <Icon size={18} aria-hidden="true" style={{ flex: 'none', marginTop: 2 }} />
      <span>{children}</span>
    </div>
  )
}
