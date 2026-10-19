import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { db, snapshotToArray } from '../firebase.js'
import { openStoredFile, pipeStoredFile } from '../storage.js'
import { formatIssues, leadSchema } from '../validate.js'
import { createUniqueTicketCode, normalizeTicketCode } from '../ticket.js'

const router = Router()

// Pembatas laju menjaga endpoint tulis dari spam dan pengiriman ulang tak sengaja.
const DELIVERABLE_KINDS = ['project', 'invoice']

// Tautan publik tidak langsung mengarah ke layanan penyimpanan pihak ketiga
// karena tautan itu memuat kunci API. Endpoint publik ini menjadi perantara
// agar kunci tetap tersimpan di server.
function publicDeliverables(ticketCode, lead) {
  const files = lead?.files
  if (!files || typeof files !== 'object') return null

  const out = {}
  for (const kind of DELIVERABLE_KINDS) {
    const entry = files[kind]
    if (entry && typeof entry === 'object' && entry.name) {
      out[kind] = {
        name: entry.name,
        displayName: entry.displayName || entry.name,
        size: entry.size,
        uploadedAt: entry.uploadedAt,
        downloadUrl: `/api/public/track/${encodeURIComponent(ticketCode)}/files/${kind}`,
      }
    }
  }
  return Object.keys(out).length > 0 ? out : null
}

// Ringkasan isi brief dipakai halaman lacak supaya klien bisa memeriksa kembali
// data yang dikirim tanpa menghubungi admin. Email dan nomor telepon sengaja
// tidak disertakan karena kode tiket bisa diteruskan ke orang lain.
function publicProjectDetail(lead) {
  const features = Array.isArray(lead?.features)
    ? lead.features.filter((item) => typeof item === 'string' && item !== '')
    : []

  return {
    requestedBy: lead?.name || '',
    company: lead?.company || '',
    role: lead?.role || '',
    budget: lead?.budget || '',
    timeline: lead?.timeline || '',
    features,
    reference: lead?.reference || '',
    description: lead?.brief || '',
  }
}

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'rate_limited', message: 'Terlalu banyak pengiriman. Coba lagi beberapa menit lagi.' },
})

const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 90,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'rate_limited' },
})

const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0)
const byDateDesc = (a, b) => String(b.publishedAt || b.createdAt || '').localeCompare(String(a.publishedAt || a.createdAt || ''))

async function publishedList(path) {
  const snapshot = await db().ref(path).get()
  return snapshotToArray(snapshot).filter((item) => item.published !== false)
}

// Isi artikel dan studi kasus bisa panjang, jadi hanya diambil saat detail dibuka.
function withoutFields(item, fields) {
  const copy = { ...item }
  for (const field of fields) delete copy[field]
  return copy
}

router.get('/services', async (_req, res, next) => {
  try {
    res.json({ data: (await publishedList('public/services')).sort(byOrder) })
  } catch (error) {
    next(error)
  }
})

router.get('/packages', async (_req, res, next) => {
  try {
    res.json({ data: (await publishedList('public/packages')).sort(byOrder) })
  } catch (error) {
    next(error)
  }
})

router.get('/portfolio', async (_req, res, next) => {
  try {
    const items = (await publishedList('public/portfolio'))
      .map((item) => withoutFields(item, ['body_id', 'body_en']))
      .sort((a, b) => Number(b.year || 0) - Number(a.year || 0))
    res.json({ data: items })
  } catch (error) {
    next(error)
  }
})

router.get('/portfolio/:slug', async (req, res, next) => {
  try {
    const items = await publishedList('public/portfolio')
    const found = items.find((item) => item.slug === req.params.slug)
    if (!found) return res.status(404).json({ error: 'not_found' })
    res.json({ data: found })
  } catch (error) {
    next(error)
  }
})

router.get('/articles', async (_req, res, next) => {
  try {
    const items = (await publishedList('public/articles'))
      .map((item) => withoutFields(item, ['body_id', 'body_en']))
      .sort(byDateDesc)
    res.json({ data: items })
  } catch (error) {
    next(error)
  }
})

router.get('/articles/:slug', async (req, res, next) => {
  try {
    const items = await publishedList('public/articles')
    const found = items.find((item) => item.slug === req.params.slug)
    if (!found) return res.status(404).json({ error: 'not_found' })
    res.json({ data: found })
  } catch (error) {
    next(error)
  }
})

router.post('/leads', writeLimiter, async (req, res, next) => {
  try {
    // Honeypot: field ini tersembunyi di form. Bot biasanya mengisinya.
    // Balasan dibuat seolah sukses agar bot tidak belajar cara menghindarinya.
    if (typeof req.body?.website === 'string' && req.body.website.trim() !== '') {
      return res.status(201).json({ data: { ticketCode: 'PDL-XXXXXX' } })
    }

    const parsed = leadSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(422).json({ error: 'invalid_input', issues: formatIssues(parsed.error) })
    }

    const now = new Date().toISOString()
    const ticketCode = await createUniqueTicketCode()
    const leadRef = db().ref('leads').push()
    const record = {
      // Kode tiket disimpan di dalam lead supaya penghapusan brief tidak perlu
      // memindai seluruh indeks tiket, dan dashboard bisa menampilkan kodenya.
      ticketCode,
      ...parsed.data,
      status: 'baru',
      notes: '',
      createdAt: now,
      updatedAt: now,
      // Riwayat status diberi nama sendiri. Sebelumnya kunci ini bernama
      // "timeline" dan itu bertabrakan dengan target waktu yang dipilih
      // pengunjung di formulir, sehingga kolom Target waktu menampilkan objek.
      statusHistory: [{ status: 'baru', at: now, note: '' }],
    }

    await leadRef.set(record)
    // Indeks terpisah supaya pelacakan status bisa mencari lewat kode tiket tanpa memindai seluruh lead.
    await db().ref(`tickets/${ticketCode}`).set({ leadId: leadRef.key, createdAt: now })

    res.status(201).json({ data: { ticketCode } })
  } catch (error) {
    next(error)
  }
})

router.get('/track/:code', readLimiter, async (req, res, next) => {
  try {
    const code = normalizeTicketCode(req.params.code)
    if (!/^PDL-[A-Z0-9]{4,8}$/.test(code)) {
      return res.status(422).json({ error: 'invalid_code' })
    }

    const indexSnapshot = await db().ref(`tickets/${code}`).get()
    if (!indexSnapshot.exists()) return res.status(404).json({ error: 'not_found' })

    const leadSnapshot = await db().ref(`leads/${indexSnapshot.val().leadId}`).get()
    if (!leadSnapshot.exists()) return res.status(404).json({ error: 'not_found' })

    const lead = leadSnapshot.val()
    // Email dan nomor telepon tidak dikembalikan di sini karena kode tiket bisa
    // dibagikan. Isi brief hanya sebatas rincian proyek agar klien bisa memeriksa
    // kembali permintaannya, dan berkas serah terima baru muncul setelah selesai.
    const isCompleted = String(lead.status || '').toLowerCase() === 'selesai'

    res.json({
      data: {
        ticketCode: code,
        status: lead.status,
        projectType: lead.projectType,
        locale: lead.locale || 'id',
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt,
        statusHistory: Array.isArray(lead.statusHistory) ? lead.statusHistory : [],
        project: publicProjectDetail(lead),
        files: isCompleted ? publicDeliverables(code, lead) : null,
      },
    })
  } catch (error) {
    next(error)
  }
})

router.get('/track/:code/files/:kind', readLimiter, async (req, res, next) => {
  try {
    const code = normalizeTicketCode(req.params.code)
    if (!/^PDL-[A-Z0-9]{4,8}$/.test(code)) {
      return res.status(422).json({ error: 'invalid_code' })
    }

    const kind = String(req.params.kind || '')
    if (!DELIVERABLE_KINDS.includes(kind)) return res.status(404).json({ error: 'not_found' })

    const indexSnapshot = await db().ref(`tickets/${code}`).get()
    if (!indexSnapshot.exists()) return res.status(404).json({ error: 'not_found' })

    const leadSnapshot = await db().ref(`leads/${indexSnapshot.val().leadId}`).get()
    if (!leadSnapshot.exists()) return res.status(404).json({ error: 'not_found' })

    const lead = leadSnapshot.val()
    // Unduhan dibuka hanya setelah proyek selesai, sama seperti daftar berkasnya.
    if (String(lead.status || '').toLowerCase() !== 'selesai') {
      return res.status(404).json({ error: 'not_found' })
    }

    const entry = lead.files?.[kind]
    if (!entry?.url) return res.status(404).json({ error: 'not_found' })

    // Berkas diteruskan lewat server ini supaya kunci penyimpanan tidak ikut
    // terkirim ke peramban pengunjung.
    const upstream = await openStoredFile(entry.url)
    if (!upstream) return res.status(502).json({ error: 'storage_unavailable' })

    pipeStoredFile(upstream, res, entry.displayName || entry.name)
  } catch (error) {
    next(error)
  }
})

export default router
