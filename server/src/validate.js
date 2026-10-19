import { z } from 'zod'

// Daftar ini harus sama dengan keys di client/src/components/ServiceIcon.jsx
export const ICON_KEYS = [
  'globe',
  'cart',
  'dashboard',
  'plug',
  'wrench',
  'gauge',
  'shield',
  'store',
  'receipt',
  'boxes',
  'workflow',
  'search',
]

/*
  Bidang yang punya pasangan bahasa. Dipakai oleh penerjemah otomatis:
  admin cukup mengisi versi bahasa utama, versi pasangannya diisi server.
  Daftar ini juga satu-satunya sumber kebenaran soal bidang mana yang dwibahasa.
*/
export const TRANSLATABLE_FIELDS = {
  services: ['title', 'summary'],
  packages: ['name', 'tagline', 'priceNote', 'delivery', 'features'],
  portfolio: ['title', 'summary', 'body'],
  articles: ['title', 'excerpt', 'body'],
}

export const PROJECT_TYPES = [
  'company-profile',
  'toko-online',
  'sistem-internal',
  'landing-page',
  'redesign',
  'lainnya',
]

export const BUDGETS = ['belum-tahu', 'sampai-5', '5-15', '15-50', 'diatas-50']
export const TIMELINES = ['secepatnya', 'satu-dua-bulan', 'tiga-enam-bulan', 'belum-jelas']

export const FEATURE_KEYS = [
  'auth',
  'payment',
  'cms',
  'multi-bahasa',
  'integrasi-api',
  'laporan',
  'notifikasi',
  'seo',
  'pwa',
]

export const LEAD_STATUSES = ['baru', 'dihubungi', 'penawaran', 'dikerjakan', 'selesai', 'batal']

export const PAYMENT_KINDS = ['dp', 'pelunasan', 'lainnya']
export const PAYMENT_STATUSES = ['diterima', 'menunggu']
export const PAYMENT_METHODS = ['transfer', 'tunai', 'qris', 'lainnya']

// Batas atas dipakai sebagai pengaman salah ketik: satu miliar rupiah per transaksi
// sudah jauh di atas nilai proyek yang wajar untuk jasa pembuatan website.
const AMOUNT_MAX = 1_000_000_000

const text = (max) => z.string().trim().max(max).optional().default('')
const requiredText = (max, min = 1) => z.string().trim().min(min).max(max)
const lineList = (max) =>
  z.array(z.string().trim().min(1).max(180)).max(max).optional().default([])

export const leadSchema = z.object({
  name: requiredText(80, 2),
  email: z.string().trim().email().max(120),
  phone: requiredText(24, 7),
  company: text(120),
  role: text(80),
  projectType: z.enum(PROJECT_TYPES),
  budget: z.enum(BUDGETS),
  timeline: z.enum(TIMELINES),
  features: z.array(z.enum(FEATURE_KEYS)).max(12).optional().default([]),
  reference: text(400),
  brief: requiredText(4000, 20),
  locale: z.enum(['id', 'en']).optional().default('id'),
})

export const fileEntrySchema = z.object({
  name: z.string().trim().min(1).max(255),
  displayName: z.string().trim().min(1).max(255).optional(),
  size: z.number().int().nonnegative().optional(),
  url: z.string().trim().url().max(2000),
  uploadedAt: z.string().trim().max(50).optional(),
}).nullable()

export const updateLeadSchema = z.object({
  // Data brief boleh diperbaiki dari panel admin dengan aturan yang sama seperti
  // formulir publik. Semua bidang opsional supaya pembaruan sebagian tetap aman,
  // dan bidang teks sengaja tidak diberi nilai bawaan agar tidak menimpa data lama.
  name: requiredText(80, 2).optional(),
  email: z.string().trim().email().max(120).optional(),
  phone: requiredText(24, 7).optional(),
  company: z.string().trim().max(120).optional(),
  role: z.string().trim().max(80).optional(),
  projectType: z.enum(PROJECT_TYPES).optional(),
  budget: z.enum(BUDGETS).optional(),
  timeline: z.enum(TIMELINES).optional(),
  features: z.array(z.enum(FEATURE_KEYS)).max(12).optional(),
  reference: z.string().trim().max(400).optional(),
  brief: requiredText(4000, 20).optional(),
  status: z.enum(LEAD_STATUSES).optional(),
  notes: z.string().max(4000).optional(),
  note: z.string().trim().max(400).optional(),
  // Nilai kesepakatan dipakai untuk menghitung sisa tagihan; null berarti belum ditetapkan.
  dealValue: z.number().int().min(0).max(AMOUNT_MAX).nullable().optional(),
  files: z.object({
    project: fileEntrySchema.optional(),
    invoice: fileEntrySchema.optional(),
  }).optional(),
})

export const paymentSchema = z.object({
  leadId: requiredText(60),
  amount: z.number().int().min(0).max(AMOUNT_MAX),
  kind: z.enum(PAYMENT_KINDS).optional().default('dp'),
  method: z.enum(PAYMENT_METHODS).optional().default('transfer'),
  status: z.enum(PAYMENT_STATUSES).optional().default('diterima'),
  paidAt: z.string().trim().max(30).optional().default(''),
  note: text(300),
})

// PATCH tidak boleh memindahkan transaksi ke brief lain, jadi leadId dikeluarkan.
export const updatePaymentSchema = paymentSchema.omit({ leadId: true }).partial()

export const serviceSchema = z.object({
  order: z.number().int().min(0).max(999).optional().default(0),
  icon: z.enum(ICON_KEYS).optional().default('globe'),
  title_id: requiredText(90),
  title_en: text(90),
  summary_id: requiredText(300),
  summary_en: text(300),
  published: z.boolean().optional().default(true),
})

export const packageSchema = z.object({
  order: z.number().int().min(0).max(999).optional().default(0),
  name_id: requiredText(70),
  name_en: text(70),
  tagline_id: text(200),
  tagline_en: text(200),
  priceFrom: z.number().int().nonnegative().nullable().optional().default(null),
  priceNote_id: text(120),
  priceNote_en: text(120),
  delivery_id: text(120),
  delivery_en: text(120),
  features_id: lineList(20),
  features_en: lineList(20),
  recommended: z.boolean().optional().default(false),
  published: z.boolean().optional().default(true),
})

export const PORTFOLIO_CATEGORIES = PROJECT_TYPES

const imageString = z.string().refine(
  (val) => {
    if (!val || val.trim() === '') return true
    if (val.startsWith('data:image/')) {
      // Data URL base64 untuk file maksimal 5MB (~7.2MB dalam base64)
      return val.length <= 7_500_000
    }
    return val.length <= 2000
  },
  { message: 'Format gambar tidak valid atau ukuran file melebihi 5MB' },
)

export const portfolioSchema = z.object({
  slug: requiredText(80, 3).regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    'slug hanya boleh huruf kecil, angka, dan tanda hubung',
  ),
  title_id: requiredText(110),
  title_en: text(110),
  client: text(90),
  category: z.enum(PORTFOLIO_CATEGORIES).optional().default('company-profile'),
  year: z.number().int().min(2000).max(2100).optional().nullable(),
  url: z.union([z.literal(''), z.string().trim().url().max(400)]).optional().default(''),
  summary_id: requiredText(300),
  summary_en: text(300),
  body_id: text(20000),
  body_en: text(20000),
  stack: z.array(z.string().trim().min(1).max(40)).max(20).optional().default([]),
  coverImage: imageString.optional().default(''),
  published: z.boolean().optional().default(true),
})

export const articleSchema = z.object({
  slug: requiredText(80, 3).regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    'slug hanya boleh huruf kecil, angka, dan tanda hubung',
  ),
  title_id: requiredText(140),
  title_en: text(140),
  excerpt_id: requiredText(320),
  excerpt_en: text(320),
  body_id: requiredText(20000, 40),
  body_en: text(20000),
  coverImage: imageString.optional().default(''),
  publishedAt: z.string().trim().max(40).optional().default(''),
  published: z.boolean().optional().default(true),
})

// PATCH hanya menyentuh field yang dikirim, jadi semua field dibuat opsional.
export const patchSchemas = {
  services: serviceSchema.partial(),
  packages: packageSchema.partial(),
  portfolio: portfolioSchema.partial(),
  articles: articleSchema.partial(),
}

export const createSchemas = {
  services: serviceSchema,
  packages: packageSchema,
  portfolio: portfolioSchema,
  articles: articleSchema,
}

export function formatIssues(error) {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }))
}
