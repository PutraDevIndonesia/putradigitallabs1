import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Download, FileText, FolderArchive, Search } from 'lucide-react'
import { Field, InlineAlert, PageHeader } from '../components/ui.jsx'
import { StatusBadge } from '../components/StatusBadge.jsx'
import { useI18n } from '../i18n/index.jsx'
import { apiUrl, publicApi } from '../lib/api.js'
import { formatDate, formatDateTime, formatFileSize } from '../lib/format.js'
import { readLastTicket } from '../lib/lastTicket.js'
import { useDocumentTitle } from '../lib/useDocumentTitle.js'

const CODE_PATTERN = /^PDL-[A-Z0-9]{4,8}$/

// Kode bisa datang dari tautan seperti /lacak?code=PDL-ABC123 atau ?PDL-ABC123.
// Format lama "?=PDL-ABC123" juga diterima supaya tautan yang sudah terlanjur
// dibagikan tetap berfungsi.
function readCodeFromSearch(searchParams) {
  let raw = searchParams.get('code') || searchParams.get('ticket') || searchParams.get('kode')

  if (!raw) {
    for (const [key, value] of searchParams.entries()) {
      if (key.trim() === '' && value) {
        raw = value
        break
      }
    }
  }

  // Tautan bisa datang tanpa query string sama sekali (?PDL-ABC123) atau
  // dengan tanda "=" yang tidak lengkap (?=PDL-ABC123).
  if (!raw) {
    const bare = window.location.search.replace(/^\?/, '').replace(/^=/, '')
    if (bare) raw = decodeURIComponent(bare.split('&')[0].split('=').pop() || '')
  }

  return String(raw || '')
    .trim()
    .toUpperCase()
}

const DELIVERABLES = [
  {
    kind: 'project',
    labelKey: 'track.projectFileLabel',
    descKey: 'track.projectFileDesc',
    icon: FolderArchive,
  },
  {
    kind: 'invoice',
    labelKey: 'track.invoiceFileLabel',
    descKey: 'track.invoiceFileDesc',
    icon: FileText,
  },
]

export default function Lacak() {
  const { t, locale } = useI18n()
  useDocumentTitle(t('track.title'))

  const [searchParams] = useSearchParams()
  const urlCode = readCodeFromSearch(searchParams)

  // Kode tiket dari tautan (?code=PDL-XXXX) diisi lebih dulu, lalu kode
  // terakhir dari perangkat ini sebagai cadangan supaya pengunjung tidak perlu
  // mencari kodenya lagi saat mau memeriksa status.
  const [code, setCode] = useState(() => urlCode || readLastTicket())
  const [status, setStatus] = useState('idle')
  const [result, setResult] = useState(null)
  const [message, setMessage] = useState(null)

  // Menandai permintaan pertama dari tautan agar tidak diulang saat render
  // ulang, sementara penekanan tombol Track tetap bisa mencari kode yang sama.
  const autoTrackedRef = useRef('')

  async function handleSubmit(event) {
    event?.preventDefault()
    const normalized = code.trim().toUpperCase()

    // Format diperiksa di klien lebih dulu supaya salah ketik tidak perlu satu perjalanan ke server.
    if (!CODE_PATTERN.test(normalized)) {
      setStatus('invalid')
      setResult(null)
      setMessage(null)
      return
    }

    setStatus('loading')
    setMessage(null)

    try {
      const data = await publicApi.track(normalized)
      setResult(data)
      setStatus('found')
    } catch (error) {
      setResult(null)
      setStatus(error?.status === 404 ? 'notfound' : 'error')
      setMessage(error?.message || 'internal_error')
    }
  }

  // Tautan lacak (?code=PDL-XXXX) langsung dicari saat halaman dibuka, jadi
  // pengunjung tidak perlu menekan tombol Track lagi. Kode yang tidak cocok
  // format tetap dibiarkan di kolom agar bisa diperbaiki sendiri.
  useEffect(() => {
    if (!urlCode || autoTrackedRef.current === urlCode) return
    autoTrackedRef.current = urlCode
    setCode(urlCode)
    if (CODE_PATTERN.test(urlCode)) handleSubmit()
    // handleSubmit hanya memakai code yang baru diset di atas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlCode])

  // Riwayat status dibaca dari kunci statusHistory. Sebelumnya kunci ini bernama
  // "timeline" dan bertabrakan dengan target waktu pengunjung.
  const history = Array.isArray(result?.statusHistory) ? result.statusHistory : []

  // Rincian permintaan dikirim server sebagai objek terpisah supaya blok ini bisa
  // disembunyikan kalau data lama belum menyimpannya.
  const project = result?.project || null

  // Daftar berkas unduhan hanya dikirim server setelah status proyek selesai,
  // jadi blok unduhan cukup mengikuti ada tidaknya data tersebut.
  const isCompleted = String(result?.status || '') === 'selesai'
  const deliverables = DELIVERABLES.map((item) => ({ ...item, file: result?.files?.[item.kind] })).filter(
    (item) => Boolean(item.file?.downloadUrl),
  )

  return (
    <>
      <PageHeader eyebrow={t('track.eyebrow')} title={t('track.title')} lede={t('track.lede')} />

      <section className="section section--plain">
        <div className="container" style={{ maxWidth: 780 }}>
          <form className="card" onSubmit={handleSubmit}>
            <div className="split split--2" style={{ alignItems: 'end' }}>
              <Field label={t('track.label')} htmlFor="track-code">
                <input
                  id="track-code"
                  className="input mono"
                  value={code}
                  onChange={(event) => setCode(event.target.value.toUpperCase())}
                  placeholder={t('track.placeholder')}
                  autoComplete="off"
                  spellCheck="false"
                  aria-invalid={status === 'invalid' || status === 'notfound'}
                />
              </Field>

              <button type="submit" className="btn btn--primary" disabled={status === 'loading'}>
                <Search size={16} aria-hidden="true" />
                {status === 'loading' ? t('track.submitting') : t('track.submit')}
              </button>
            </div>
          </form>

          <div className="stack" style={{ marginTop: 28 }} aria-live="polite">
            {status === 'invalid' ? (
              <div className="card stack stack--tight">
                <h2 style={{ fontSize: 'var(--step-4)' }}>{t('track.invalidTitle')}</h2>
                <p className="muted">{t('track.invalidBody')}</p>
              </div>
            ) : null}

            {status === 'notfound' ? (
              <div className="card stack stack--tight">
                <h2 style={{ fontSize: 'var(--step-4)' }}>{t('track.notFoundTitle')}</h2>
                <p className="muted">{t('track.notFoundBody')}</p>
                <Link to="/brief" className="btn btn--outline btn--sm" style={{ width: 'fit-content' }}>
                  {t('nav.brief')}
                </Link>
              </div>
            ) : null}

            {status === 'error' ? (
              <InlineAlert tone="error">
                {t(`errors.${message}`).startsWith('errors.') ? t('common.errorGeneric') : t(`errors.${message}`)}
              </InlineAlert>
            ) : null}

            {status === 'found' && result ? (
              <div className="card track-result">
                <div className="status-line">
                  <div className="stack stack--tight">
                    <span className="mono muted">{t('track.resultTitle', { code: result.ticketCode })}</span>
                    <strong style={{ fontSize: 'var(--step-4)' }}>{t(`projectType.${result.projectType}`)}</strong>
                  </div>
                  <StatusBadge status={result.status} />
                </div>

                <dl className="stack stack--tight">
                  <div className="detail-row">
                    <dt className="detail-row__label">{t('track.submitted')}</dt>
                    <dd className="detail-row__value" style={{ margin: 0 }}>
                      {formatDate(result.createdAt, locale)}
                    </dd>
                  </div>
                  <div className="detail-row">
                    <dt className="detail-row__label">{t('track.lastUpdate')}</dt>
                    <dd className="detail-row__value" style={{ margin: 0 }}>
                      {formatDateTime(result.updatedAt, locale)}
                    </dd>
                  </div>
                </dl>

                {project ? (
                  <div className="stack stack--tight">
                    <h2 style={{ fontSize: 'var(--step-4)' }}>{t('track.projectTitle')}</h2>
                    <p className="muted">{t('track.projectLede')}</p>

                    <dl className="detail-grid detail-grid--2" style={{ margin: 0 }}>
                      {project.requestedBy ? (
                        <div className="detail-row">
                          <dt className="detail-row__label">{t('track.requestedBy')}</dt>
                          <dd className="detail-row__value" style={{ margin: 0 }}>
                            {project.requestedBy}
                          </dd>
                        </div>
                      ) : null}

                      {project.company ? (
                        <div className="detail-row">
                          <dt className="detail-row__label">{t('track.company')}</dt>
                          <dd className="detail-row__value" style={{ margin: 0 }}>
                            {project.company}
                            {project.role ? ` · ${project.role}` : ''}
                          </dd>
                        </div>
                      ) : null}

                      {project.budget ? (
                        <div className="detail-row">
                          <dt className="detail-row__label">{t('track.budget')}</dt>
                          <dd className="detail-row__value" style={{ margin: 0 }}>
                            {t(`budget.${project.budget}`)}
                          </dd>
                        </div>
                      ) : null}

                      {project.timeline ? (
                        <div className="detail-row">
                          <dt className="detail-row__label">{t('track.timeline')}</dt>
                          <dd className="detail-row__value" style={{ margin: 0 }}>
                            {t(`timeline.${project.timeline}`)}
                          </dd>
                        </div>
                      ) : null}

                      <div className="detail-row" style={{ gridColumn: '1 / -1' }}>
                        <dt className="detail-row__label">{t('track.features')}</dt>
                        <dd className="detail-row__value" style={{ margin: 0 }}>
                          {project.features && project.features.length > 0 ? (
                            <span className="cluster">
                              {project.features.map((key) => (
                                <span className="chip" key={key}>
                                  {t(`feature.${key}`)}
                                </span>
                              ))}
                            </span>
                          ) : (
                            t('track.noFeatures')
                          )}
                        </dd>
                      </div>

                      {project.reference ? (
                        <div className="detail-row" style={{ gridColumn: '1 / -1' }}>
                          <dt className="detail-row__label">{t('track.reference')}</dt>
                          <dd className="detail-row__value" style={{ margin: 0 }}>
                            {project.reference}
                          </dd>
                        </div>
                      ) : null}

                      {project.description ? (
                        <div className="detail-row" style={{ gridColumn: '1 / -1' }}>
                          <dt className="detail-row__label">{t('track.description')}</dt>
                          <dd className="detail-row__value" style={{ margin: 0 }}>
                            <p className="brief-text" style={{ margin: 0 }}>
                              {project.description}
                            </p>
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                  </div>
                ) : null}

                <div className="stack stack--tight">
                  <h2 style={{ fontSize: 'var(--step-4)' }}>{t('track.timelineTitle')}</h2>
                  <ol className="timeline">
                    {history.map((entry, index) => (
                      <li
                        className={`timeline__item${index < history.length - 1 ? ' timeline__item--done' : ''}`}
                        key={`${entry.at}-${index}`}
                      >
                        <span className="timeline__dot" aria-hidden="true" />
                        <div className="stack stack--tight">
                          <div className="timeline__meta">
                            <StatusBadge status={entry.status} />
                            <span>{formatDateTime(entry.at, locale)}</span>
                          </div>
                          {entry.note ? <p className="muted">{entry.note}</p> : null}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>

                {isCompleted ? (
                  <div className="stack stack--tight">
                    <h2 style={{ fontSize: 'var(--step-4)' }}>{t('track.filesTitle')}</h2>
                    <p className="muted">{t('track.filesLede')}</p>

                    {deliverables.length > 0 ? (
                      <ul className="stack stack--tight" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {deliverables.map(({ kind, file, labelKey, descKey, icon: Icon }) => (
                          <li className="cluster" key={kind} style={{ justifyContent: 'space-between' }}>
                            <span className="cluster">
                              <Icon size={18} aria-hidden="true" />
                              <span className="stack stack--tight">
                                <strong>{t(labelKey)}</strong>
                                <span className="muted">{t(descKey)}</span>
                                        <span className="mono muted">
                                          {file.displayName || file.name}
                                  {typeof file.size === 'number' ? ` · ${formatFileSize(file.size)}` : ''}
                                </span>
                              </span>
                            </span>
                                <a
                                  className="btn btn--primary btn--sm"
                                  href={apiUrl(file.downloadUrl)}
                                  download={file.displayName || file.name}
                                >
                              <Download size={15} aria-hidden="true" />
                              {t('track.download')}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="muted">{t('track.filesPending')}</p>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </>
  )
}
