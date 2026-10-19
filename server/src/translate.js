import { TRANSLATABLE_FIELDS } from './validate.js'

/*
  Penerjemah otomatis untuk isi website.

  Aturannya: admin hanya menulis versi bahasa utama (PRIMARY_LOCALE). Versi
  pasangannya diisi server saat penyimpanan, dan hanya untuk bidang yang masih
  kosong. Teks yang sudah ditulis manual tidak pernah ditimpa.

  Kalau TRANSLATE_PROVIDER atau TRANSLATE_API_KEY belum diisi, modul ini tidak
  memanggil layanan apa pun dan mengembalikan status 'nonaktif'.
*/

const PROVIDERS = ['none', 'deepl', 'google']
const REQUEST_TIMEOUT_MS = 20000
const DEEPL_ENDPOINT = 'https://api-free.deepl.com/v2/translate'
const GOOGLE_ENDPOINT = 'https://translation.googleapis.com/language/translate/v2'

export function providerName() {
  const value = (process.env.TRANSLATE_PROVIDER || 'none').trim().toLowerCase()
  return PROVIDERS.includes(value) ? value : 'none'
}

export function translationEnabled() {
  return providerName() !== 'none' && (process.env.TRANSLATE_API_KEY || '').trim() !== ''
}

export function primaryLocale() {
  return (process.env.PRIMARY_LOCALE || 'id').trim().toLowerCase() === 'en' ? 'en' : 'id'
}

export function secondaryLocale() {
  return primaryLocale() === 'id' ? 'en' : 'id'
}

async function translateWithDeepL(texts, target) {
  const endpoint = (process.env.TRANSLATE_ENDPOINT || DEEPL_ENDPOINT).trim()
  const body = new URLSearchParams()
  body.set('target_lang', target.toUpperCase())
  body.set('source_lang', primaryLocale().toUpperCase())
  for (const text of texts) body.append('text', text)

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${(process.env.TRANSLATE_API_KEY || '').trim()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`DeepL menolak permintaan (${response.status}): ${detail.slice(0, 200)}`)
  }

  const payload = await response.json()
  return (payload.translations || []).map((item) => item.text)
}

async function translateWithGoogle(texts, target) {
  const endpoint = (process.env.TRANSLATE_ENDPOINT || GOOGLE_ENDPOINT).trim()
  const response = await fetch(`${endpoint}?key=${encodeURIComponent((process.env.TRANSLATE_API_KEY || '').trim())}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: texts, target, source: primaryLocale(), format: 'text' }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`Google Translate menolak permintaan (${response.status}): ${detail.slice(0, 200)}`)
  }

  const payload = await response.json()
  return (payload.data?.translations || []).map((item) => item.translatedText)
}

async function translateBatch(texts, target) {
  const provider = providerName()
  if (provider === 'deepl') return translateWithDeepL(texts, target)
  if (provider === 'google') return translateWithGoogle(texts, target)
  throw new Error('Penerjemah belum diaktifkan')
}

/*
  Mengisi bidang pasangan bahasa pada satu rekaman lalu mengembalikan statusnya:
  - 'nonaktif'  penyedia terjemahan belum diatur
  - 'manual'    tidak ada bidang kosong, versi pasangan sudah ditulis sendiri
  - 'auto'      ada bidang yang berhasil diterjemahkan
  - 'gagal'     penyedia menolak; rekaman tetap disimpan apa adanya
*/
export async function fillTranslations(collection, record) {
  const fields = TRANSLATABLE_FIELDS[collection] || []
  const from = primaryLocale()
  const to = secondaryLocale()

  if (!translationEnabled()) return { status: 'nonaktif', translated: 0 }
  if (fields.length === 0) return { status: 'manual', translated: 0 }

  // Kumpulan teks yang perlu diterjemahkan, lengkap dengan penunjuk tempat
  // menaruh hasilnya. Bidang yang sudah terisi dilewati agar tulisan manual aman.
  const pending = []

  for (const field of fields) {
    const sourceValue = record[`${field}_${from}`]
    const targetValue = record[`${field}_${to}`]

    if (Array.isArray(sourceValue)) {
      const targetList = Array.isArray(targetValue) ? targetValue : []
      sourceValue.forEach((item, index) => {
        const text = String(item ?? '').trim()
        if (text === '') return
        if (String(targetList[index] ?? '').trim() !== '') return
        pending.push({ field, index, text })
      })
      continue
    }

    const text = String(sourceValue ?? '').trim()
    if (text === '') continue
    if (String(targetValue ?? '').trim() !== '') continue
    pending.push({ field, index: null, text })
  }

  if (pending.length === 0) return { status: 'manual', translated: 0 }

  try {
    const results = await translateBatch(
      pending.map((item) => item.text),
      to,
    )

    results.forEach((translated, position) => {
      const item = pending[position]
      const text = String(translated ?? '').trim()
      if (!item || text === '') return

      if (item.index === null) {
        record[`${item.field}_${to}`] = text
        return
      }

      const current = record[`${item.field}_${to}`]
      const list = Array.isArray(current) ? [...current] : []
      list[item.index] = text
      record[`${item.field}_${to}`] = list
    })

    return { status: 'auto', translated: pending.length }
  } catch (error) {
    console.error('[terjemahan]', error?.message || error)
    return { status: 'gagal', translated: 0, message: String(error?.message || error) }
  }
}
