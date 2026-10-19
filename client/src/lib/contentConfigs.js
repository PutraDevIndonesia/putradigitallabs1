import { ICON_CHOICES } from '../components/ServiceIcon.jsx'

// Kategori harus sama dengan PORTFOLIO_CATEGORIES di server/src/validate.js
const PROJECT_TYPE_OPTIONS = [
  'company-profile',
  'toko-online',
  'sistem-internal',
  'landing-page',
  'redesign',
  'lainnya',
]

/*
  Satu definisi bidang dipakai untuk tiga hal sekaligus: daftar tabel, formulir,
  dan penyusunan payload ke API. Dengan begitu menambah bidang cukup diubah di sini,
  tidak perlu menyentuh kode tabel maupun formulir.

  Atribut bidang:
  - locale: true berarti teks disimpan dua kali (akhiran _id dan _en)
  - lines: satu baris teks menjadi satu item array
  - number: nilai kosong dikirim sebagai null, bukan 0
*/
export const CONTENT_CONFIGS = {
  services: {
    collection: 'services',
    titleKey: 'admin.nav.services',
    columns: [
      { key: 'title', labelKey: 'admin.fields.title', locale: true },
      { key: 'icon', labelKey: 'admin.fields.icon', mono: true },
      { key: 'order', labelKey: 'admin.fields.order', mono: true },
      { key: 'published', labelKey: 'admin.fields.published', boolean: true },
    ],
    fields: [
      { key: 'title', labelKey: 'admin.fields.title', type: 'text', locale: true, required: true },
      { key: 'summary', labelKey: 'admin.fields.summary', type: 'textarea', locale: true, required: true },
      { key: 'icon', labelKey: 'admin.fields.icon', type: 'select', options: ICON_CHOICES },
      { key: 'order', labelKey: 'admin.fields.order', type: 'number' },
      { key: 'published', labelKey: 'admin.fields.published', type: 'boolean' },
    ],
  },

  packages: {
    collection: 'packages',
    titleKey: 'admin.nav.plans',
    columns: [
      { key: 'name', labelKey: 'admin.fields.name', locale: true },
      { key: 'priceFrom', labelKey: 'admin.fields.priceFrom', price: true },
      { key: 'order', labelKey: 'admin.fields.order', mono: true },
      { key: 'published', labelKey: 'admin.fields.published', boolean: true },
    ],
    fields: [
      { key: 'name', labelKey: 'admin.fields.name', type: 'text', locale: true, required: true },
      { key: 'tagline', labelKey: 'admin.fields.tagline', type: 'text', locale: true },
      { key: 'priceFrom', labelKey: 'admin.fields.priceFrom', type: 'number', hint: 'admin.content.priceHint' },
      { key: 'priceNote', labelKey: 'admin.fields.priceNote', type: 'text', locale: true },
      { key: 'delivery', labelKey: 'admin.fields.delivery', type: 'text', locale: true },
      { key: 'features', labelKey: 'admin.fields.features', type: 'lines', locale: true },
      { key: 'recommended', labelKey: 'admin.fields.recommended', type: 'boolean' },
      { key: 'order', labelKey: 'admin.fields.order', type: 'number' },
      { key: 'published', labelKey: 'admin.fields.published', type: 'boolean' },
    ],
  },

  portfolio: {
    collection: 'portfolio',
    titleKey: 'admin.nav.work',
    columns: [
      { key: 'title', labelKey: 'admin.fields.title', locale: true },
      { key: 'slug', labelKey: 'admin.fields.slug', mono: true },
      { key: 'year', labelKey: 'admin.fields.year', mono: true },
      { key: 'published', labelKey: 'admin.fields.published', boolean: true },
    ],
    fields: [
      { key: 'title', labelKey: 'admin.fields.title', type: 'text', locale: true, required: true },
      { key: 'slug', labelKey: 'admin.fields.slug', type: 'text', required: true, hint: 'admin.content.slugHint', autoSlugFrom: 'title_id' },
      { key: 'summary', labelKey: 'admin.fields.summary', type: 'textarea', locale: true, required: true },
      { key: 'body', labelKey: 'admin.fields.body', type: 'textarea', locale: true },
      { key: 'client', labelKey: 'admin.fields.client', type: 'text' },
      { key: 'category', labelKey: 'admin.fields.category', type: 'select', options: PROJECT_TYPE_OPTIONS, optionPrefix: 'projectType' },
      { key: 'year', labelKey: 'admin.fields.year', type: 'number' },
      { key: 'url', labelKey: 'admin.fields.url', type: 'text' },
      { key: 'stack', labelKey: 'admin.fields.stack', type: 'lines' },
      { key: 'coverImage', labelKey: 'admin.fields.coverImage', type: 'image', hint: 'admin.content.imageHint' },
      { key: 'published', labelKey: 'admin.fields.published', type: 'boolean' },
    ],
  },

  articles: {
    collection: 'articles',
    titleKey: 'admin.nav.blog',
    columns: [
      { key: 'title', labelKey: 'admin.fields.title', locale: true },
      { key: 'slug', labelKey: 'admin.fields.slug', mono: true },
      { key: 'publishedAt', labelKey: 'admin.fields.publishedAt', mono: true },
      { key: 'published', labelKey: 'admin.fields.published', boolean: true },
    ],
    fields: [
      { key: 'title', labelKey: 'admin.fields.title', type: 'text', locale: true, required: true },
      { key: 'slug', labelKey: 'admin.fields.slug', type: 'text', required: true, hint: 'admin.content.slugHint', autoSlugFrom: 'title_id' },
      { key: 'excerpt', labelKey: 'admin.fields.excerpt', type: 'textarea', locale: true, required: true },
      { key: 'body', labelKey: 'admin.fields.body', type: 'textarea', locale: true, required: true },
      { key: 'coverImage', labelKey: 'admin.fields.coverImage', type: 'image', hint: 'admin.content.imageHint' },
      { key: 'publishedAt', labelKey: 'admin.fields.publishedAt', type: 'text' },
      { key: 'published', labelKey: 'admin.fields.published', type: 'boolean' },
    ],
  },
}

export function emptyValues(config) {
  const values = {}
  for (const field of config.fields) {
    if (field.locale) {
      values[`${field.key}_id`] = ''
      values[`${field.key}_en`] = ''
    } else if (field.type === 'lines') {
      values[field.key] = ''
    } else if (field.type === 'boolean') {
      values[field.key] = field.key === 'published'
    } else if (field.type === 'number') {
      values[field.key] = ''
    } else if (field.type === 'select') {
      values[field.key] = field.options[0]
    } else {
      values[field.key] = ''
    }
  }
  return values
}

export function toFormValues(config, item) {
  const values = emptyValues(config)
  if (!item) return values

  for (const field of config.fields) {
    if (field.locale) {
      values[`${field.key}_id`] = item[`${field.key}_id`] ?? ''
      values[`${field.key}_en`] = item[`${field.key}_en`] ?? ''
      continue
    }
    if (field.type === 'lines') {
      const raw = item[field.key]
      const list = Array.isArray(raw) ? raw : raw && typeof raw === 'object' ? Object.values(raw) : []
      values[field.key] = list.join('\n')
      continue
    }
    if (field.type === 'boolean') {
      values[field.key] = item[field.key] !== false
      continue
    }
    values[field.key] = item[field.key] === null || item[field.key] === undefined ? '' : String(item[field.key])
  }

  return values
}

export function toPayload(config, values) {
  const payload = {}

  for (const field of config.fields) {
    if (field.locale) {
      payload[`${field.key}_id`] = (values[`${field.key}_id`] || '').trim()
      payload[`${field.key}_en`] = (values[`${field.key}_en`] || '').trim()
      continue
    }

    const raw = values[field.key]

    if (field.type === 'boolean') {
      payload[field.key] = Boolean(raw)
      continue
    }

    if (field.type === 'lines') {
      payload[field.key] = String(raw || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
      continue
    }

    if (field.type === 'number') {
      const text = String(raw ?? '').trim()
      payload[field.key] = text === '' ? null : Number(text)
      continue
    }

    payload[field.key] = String(raw ?? '').trim()
  }

  return payload
}
