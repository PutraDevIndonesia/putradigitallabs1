import { useI18n } from '../i18n/index.jsx'

const KNOWN = ['baru', 'dihubungi', 'penawaran', 'dikerjakan', 'selesai', 'batal']

export function StatusBadge({ status }) {
  const { t } = useI18n()
  const key = KNOWN.includes(status) ? status : 'batal'
  const label = t(`status.${key}`)

  return <span className={`badge badge--${key}`}>{label.startsWith('status.') ? status : label}</span>
}
