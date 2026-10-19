// Data dari Realtime Database menyimpan dua versi teks dengan akhiran _id dan _en.
// Fungsi ini memilih versi yang cocok dengan bahasa aktif, dengan Indonesia sebagai cadangan.
export function pick(record, field, locale) {
  if (!record) return ''
  const preferred = record[`${field}_${locale}`]
  if (preferred !== undefined && preferred !== null && preferred !== '') return preferred
  return record[`${field}_id`] ?? ''
}

export function pickList(record, field, locale) {
  const value = pick(record, field, locale)
  if (Array.isArray(value)) return value
  if (value && typeof value === 'object') return Object.values(value)
  return []
}

export function formatDate(value, locale) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function formatDateTime(value, locale) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function formatRupiah(amount, locale) {
  if (amount === null || amount === undefined || amount === '') return ''
  const number = Number(amount)
  if (!Number.isFinite(number)) return ''
  return new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(number)
}

export function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
}

/*
  Nomor WhatsApp Indonesia ditulis lokal mulai dengan 0, sedangkan tautan wa.me
  menuntut format internasional tanpa tanda plus. Fungsi ini menormalkannya dan
  mengembalikan string kosong bila nomornya tidak masuk akal, supaya tombolnya
  bisa disembunyikan daripada mengarah ke tautan rusak.
*/
export function whatsappNumber(value) {
  const digits = String(value || '').replace(/\D/g, '')
  if (digits === '') return ''

  if (digits.startsWith('62')) return digits.length >= 10 ? digits : ''
  if (digits.startsWith('0')) {
    const rest = digits.replace(/^0+/, '')
    return rest.length >= 9 ? `62${rest}` : ''
  }
  return digits.length >= 9 ? `62${digits}` : ''
}

export function whatsappLink(value, message) {
  const number = whatsappNumber(value)
  if (!number) return ''
  const text = String(message || '').trim()
  return `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

// Isi artikel dan studi kasus dikirim sebagai teks biasa; baris kosong menjadi pemisah paragraf.
export function toParagraphs(body) {
  return String(body || '')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
}

export function formatFileSize(bytes) {
  if (typeof bytes !== 'number' || bytes < 0) return ''
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const size = (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)
  return `${size} ${units[i] || 'B'}`
}
