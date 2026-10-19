import express, { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { authIsConfigured, issueToken, requireAdmin, verifyCredentials } from '../auth.js'
import { db, snapshotToArray } from '../firebase.js'
import { deleteFromStorage, openStoredFile, pipeStoredFile, uploadToStorage } from '../storage.js'
import {
  createSchemas,
  formatIssues,
  LEAD_STATUSES,
  patchSchemas,
  paymentSchema,
  PAYMENT_STATUSES,
  TRANSLATABLE_FIELDS,
  updateLeadSchema,
  updatePaymentSchema,
} from '../validate.js'
import { fillTranslations, primaryLocale, providerName, secondaryLocale, translationEnabled } from '../translate.js'

const router = Router()

// Nama koleksi dari URL dipetakan ke path Realtime Database lewat daftar tetap,
// sehingga pengguna tidak bisa menulis ke node arbitrer.
const COLLECTIONS = {
  services: 'public/services',
  packages: 'public/packages',
  portfolio: 'public/portfolio',
  articles: 'public/articles',
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'rate_limited', message: 'Terlalu banyak percobaan masuk. Tunggu beberapa menit.' },
})

function resolveCollection(req, res, next) {
  const path = COLLECTIONS[req.params.collection]
  if (!path) return res.status(404).json({ error: 'unknown_collection' })
  req.refPath = path
  return next()
}

function byOrder(a, b) {
  return (a.order ?? 0) - (b.order ?? 0)
}

function byCreatedDesc(a, b) {
  return String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
}

// Slug dipakai di URL publik, jadi harus unik antar item dalam koleksi yang sama.
async function findSlugConflict(path, slug, ignoreId) {
  if (!slug) return null
  const snapshot = await db().ref(path).get()
  const items = snapshotToArray(snapshot)
  return items.find((item) => item.slug === slug && item.id !== ignoreId) || null
}

router.post('/login', loginLimiter, (req, res) => {
  if (!authIsConfigured()) {
    return res.status(503).json({
      error: 'auth-not-configured',
      message: 'Isi ADMIN_EMAIL, ADMIN_PASSWORD (atau ADMIN_PASSWORD_HASH), dan JWT_SECRET di server/.env',
    })
  }

  const email = String(req.body?.email || '')
  const password = String(req.body?.password || '')
  const result = verifyCredentials(email, password)

  if (!result.ok) {
    return res.status(401).json({
      error: result.reason === 'belum-dikonfigurasi' ? 'auth-not-configured' : 'invalid_credentials',
    })
  }

  return res.json({ data: { token: issueToken(email.trim()), email: email.trim() } })
})

router.get('/session', requireAdmin, (req, res) => {
  res.json({ data: { email: req.admin.email } })
})

router.get('/settings', requireAdmin, (_req, res) => {
  // Dashboard memakai ini untuk memutuskan apakah kolom bahasa kedua masih perlu
  // ditampilkan. Statusnya datang dari server supaya UI tidak menebak-nebak.
  res.json({
    data: {
      primaryLocale: primaryLocale(),
      secondaryLocale: secondaryLocale(),
      translationEnabled: translationEnabled(),
      translationProvider: providerName(),
    },
  })
})

router.get('/overview', requireAdmin, async (_req, res, next) => {
  try {
    const [leadSnapshot, portfolioSnapshot, articleSnapshot, paymentSnapshot] = await Promise.all([
      db().ref('leads').get(),
      db().ref('public/portfolio').get(),
      db().ref('public/articles').get(),
      db().ref('payments').get(),
    ])

    const leads = snapshotToArray(leadSnapshot)
    const byStatus = {}
    for (const status of LEAD_STATUSES) byStatus[status] = 0
    for (const lead of leads) {
      const status = LEAD_STATUSES.includes(lead.status) ? lead.status : 'baru'
      byStatus[status] += 1
    }

    // Pemasukan dicatat per brief. Dua angka dipisah karena uang yang sudah masuk
    // dan uang yang masih menunggu konfirmasi punya arti berbeda saat memeriksa kas.
    const payments = snapshotToArray(paymentSnapshot)
    let receivedTotal = 0
    let pendingTotal = 0
    const receivedPerLead = {}

    for (const payment of payments) {
      const amount = Number(payment.amount) || 0
      if (payment.status === 'menunggu') {
        pendingTotal += amount
        continue
      }
      receivedTotal += amount
      receivedPerLead[payment.leadId] = (receivedPerLead[payment.leadId] || 0) + amount
    }

    // Sisa tagihan hanya bisa dihitung untuk brief yang nilai kesepakatannya sudah diisi.
    let outstandingTotal = 0
    for (const lead of leads) {
      const dealValue = Number(lead.dealValue) || 0
      if (dealValue <= 0) continue
      outstandingTotal += Math.max(0, dealValue - (receivedPerLead[lead.id] || 0))
    }

    res.json({
      data: {
        totalLeads: leads.length,
        byStatus,
        untouched: byStatus.baru,
        portfolioTotal: Object.keys(portfolioSnapshot.val() || {}).length,
        articlesTotal: Object.keys(articleSnapshot.val() || {}).length,
        paymentsTotal: payments.length,
        receivedTotal,
        pendingTotal,
        outstandingTotal,
      },
    })
  } catch (error) {
    next(error)
  }
})

router.get('/leads', requireAdmin, async (req, res, next) => {
  try {
    const status = String(req.query.status || '').trim()
    const snapshot = await db().ref('leads').get()
    let items = snapshotToArray(snapshot)

    if (status && LEAD_STATUSES.includes(status)) {
      items = items.filter((item) => item.status === status)
    }

    // Daftar lead tidak perlu mengirim isi brief lengkap; itu diambil dari endpoint detail.
    items = items
      .map((item) => {
        // Isi brief dan riwayat status tidak perlu ikut di daftar; yang dibuang
        // hanya dua itu, sementara target waktu pengunjung tetap dikirim karena
        // ditampilkan di tabel.
        const { brief, notes, statusHistory, ...rest } = item
        return { ...rest, briefLength: (brief || '').length }
      })
      .sort(byCreatedDesc)

    res.json({ data: items })
  } catch (error) {
    next(error)
  }
})

router.get('/leads/:id', requireAdmin, async (req, res, next) => {
  try {
    const snapshot = await db().ref(`leads/${req.params.id}`).get()
    if (!snapshot.exists()) return res.status(404).json({ error: 'not_found' })
    res.json({ data: { id: req.params.id, ...snapshot.val() } })
  } catch (error) {
    next(error)
  }
})

router.delete('/leads/:id', requireAdmin, async (req, res, next) => {
  try {
    const leadRef = db().ref(`leads/${req.params.id}`)
    const snapshot = await leadRef.get()
    if (!snapshot.exists()) return res.status(404).json({ error: 'not_found' })

    const lead = snapshot.val()

    // Kode tiket kini disimpan di dalam lead, jadi penghapusan tidak perlu memindai
    // seluruh indeks. Lead lama yang belum menyimpan kodenya tetap dicari sebagai cadangan.
    let ticketCode = lead.ticketCode
    if (!ticketCode) {
      const indexSnapshot = await db().ref('tickets').get()
      const index = indexSnapshot.val() || {}
      ticketCode = Object.keys(index).find((code) => index[code]?.leadId === req.params.id) || ''
    }

    // Transaksi milik brief ikut dihapus. Kalau dibiarkan, catatan uangnya menggantung
    // tanpa proyek, dan angka pemasukan di dashboard tetap menghitung uang itu
    // padahal brief-nya sudah tidak ada.
    const paymentSnapshot = await db().ref('payments').get()
    const paymentIndex = paymentSnapshot.val() || {}
    const orphanPaymentIds = Object.entries(paymentIndex)
      .filter(([, payment]) => payment?.leadId === req.params.id)
      .map(([paymentId]) => paymentId)

    // Berkas serah terima ikut dibersihkan supaya dokumen klien tidak tertinggal
    // selamanya di penyimpanan setelah proyeknya dihapus dari daftar.
    const storedFiles = Object.values(lead.files || {}).filter((entry) => entry?.name)

    await leadRef.remove()
    // Indeks ikut dibersihkan supaya halaman pelacakan tidak menunjuk lead yang sudah hilang.
    if (ticketCode) await db().ref(`tickets/${ticketCode}`).remove()

    for (const entry of storedFiles) {
      await deleteFromStorage(entry.name)
    }

    for (const paymentId of orphanPaymentIds) {
      await db().ref(`payments/${paymentId}`).remove()
    }

    res.json({
      data: { id: req.params.id, deleted: true, paymentsDeleted: orphanPaymentIds.length },
    })
  } catch (error) {
    next(error)
  }
})

// Bidang data brief yang boleh diperbaiki operator lewat panel admin.
const BRIEF_FIELDS = [
  'name',
  'email',
  'phone',
  'company',
  'role',
  'projectType',
  'budget',
  'timeline',
  'features',
  'reference',
  'brief',
]

router.patch('/leads/:id', requireAdmin, async (req, res, next) => {
  try {
    const parsed = updateLeadSchema.safeParse(req.body || {})
    if (!parsed.success) {
      return res.status(422).json({ error: 'invalid_input', issues: formatIssues(parsed.error) })
    }

    const leadRef = db().ref(`leads/${req.params.id}`)
    const snapshot = await leadRef.get()
    if (!snapshot.exists()) return res.status(404).json({ error: 'not_found' })

    const current = snapshot.val()
    const now = new Date().toISOString()
    const { status, notes, note, dealValue, files } = parsed.data
    const update = { updatedAt: now }

    for (const field of BRIEF_FIELDS) {
      if (parsed.data[field] !== undefined) {
        update[field] = parsed.data[field]
      }
    }

    if (typeof notes === 'string') update.notes = notes
    // Nilai kesepakatan boleh dikosongkan (null) selama harga belum disetujui klien.
    if (dealValue !== undefined) update.dealValue = dealValue

    if (files !== undefined) {
      const mergedFiles = { ...(current.files || {}) }
      const clearedEntries = []
      if (files.project !== undefined) {
        if (files.project === null) {
          clearedEntries.push(mergedFiles.project)
          delete mergedFiles.project
        } else mergedFiles.project = files.project
      }
      if (files.invoice !== undefined) {
        if (files.invoice === null) {
          clearedEntries.push(mergedFiles.invoice)
          delete mergedFiles.invoice
        } else mergedFiles.invoice = files.invoice
      }
      update.files = Object.keys(mergedFiles).length > 0 ? mergedFiles : null

      // Slot yang dikosongkan berarti berkasnya tidak dipakai lagi, jadi ikut dihapus
      // dari penyimpanan agar tidak menyisakan dokumen lama milik klien.
      for (const entry of clearedEntries) {
        if (entry?.name) await deleteFromStorage(entry.name)
      }
    }

    // Lead yang dibuat sebelum perbaikan menyimpan riwayatnya di kunci "timeline".
    // Nilai itu dibaca sebagai cadangan supaya riwayat lamanya tidak hilang
    // begitu saja saat status diubah.
    const previousHistory = Array.isArray(current.statusHistory)
      ? current.statusHistory
      : Array.isArray(current.timeline)
        ? current.timeline
        : []

    if (status && status !== current.status) {
      update.status = status
      // Riwayat status disimpan agar pemantau bisa melihat progres perubahannya.
      update.statusHistory = [...previousHistory, { status, at: now, note: (note || '').slice(0, 400) }]
    } else if (note) {
      update.statusHistory = [...previousHistory, { status: current.status, at: now, note: note.slice(0, 400) }]
    }

    await leadRef.update(update)
    res.json({ data: { id: req.params.id, ...current, ...update } })
  } catch (error) {
    next(error)
  }
})

const FILE_KINDS = ['project', 'invoice']

// Berkas dikirim sebagai badan biner mentah, bukan multipart, supaya tidak perlu
// menambah dependensi parser hanya untuk dua slot berkas per proyek.
const rawFileBody = express.raw({ type: () => true, limit: '50mb' })

router.post('/leads/:id/files/:kind', requireAdmin, rawFileBody, async (req, res, next) => {
  try {
    const kind = String(req.params.kind || '')
    if (!FILE_KINDS.includes(kind)) return res.status(404).json({ error: 'unknown_file_kind' })

    const buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0)
    if (buffer.length === 0) return res.status(422).json({ error: 'empty_file' })

    const leadRef = db().ref(`leads/${req.params.id}`)
    const snapshot = await leadRef.get()
    if (!snapshot.exists()) return res.status(404).json({ error: 'not_found' })

    const uploaded = await uploadToStorage(buffer, req.query.filename)
    const now = new Date().toISOString()
    const files = {
      ...(snapshot.val().files || {}),
      [kind]: { ...uploaded, uploadedAt: now },
    }

    await leadRef.update({ files, updatedAt: now })
    res.json({ data: { id: req.params.id, files, updatedAt: now } })
  } catch (error) {
    next(error)
  }
})

router.get('/leads/:id/files/:kind', requireAdmin, async (req, res, next) => {
  try {
    const kind = String(req.params.kind || '')
    if (!FILE_KINDS.includes(kind)) return res.status(404).json({ error: 'unknown_file_kind' })

    const snapshot = await db().ref(`leads/${req.params.id}`).get()
    if (!snapshot.exists()) return res.status(404).json({ error: 'not_found' })

    const entry = snapshot.val().files?.[kind]
    if (!entry?.url) return res.status(404).json({ error: 'file_not_found' })

    // Berkas diteruskan lewat server ini supaya kunci penyimpanan tidak pernah
    // dikirim ke peramban operator.
    const upstream = await openStoredFile(entry.url)
    if (!upstream) return res.status(502).json({ error: 'storage_unavailable' })

    pipeStoredFile(upstream, res, entry.displayName || entry.name)
  } catch (error) {
    next(error)
  }
})

router.delete('/leads/:id/files/:kind', requireAdmin, async (req, res, next) => {
  try {
    const kind = String(req.params.kind || '')
    if (!FILE_KINDS.includes(kind)) return res.status(404).json({ error: 'unknown_file_kind' })

    const leadRef = db().ref(`leads/${req.params.id}`)
    const snapshot = await leadRef.get()
    if (!snapshot.exists()) return res.status(404).json({ error: 'not_found' })

    const files = { ...(snapshot.val().files || {}) }
    const entry = files[kind]
    if (!entry) return res.status(404).json({ error: 'file_not_found' })

    // Berkas fisik dibersihkan lebih dulu. Kalau penyimpanan menolak, relasi di
    // database tetap dihapus agar klien tidak lagi melihat tautan yang mati.
    const removedFromStorage = await deleteFromStorage(entry.name)
    delete files[kind]

    const now = new Date().toISOString()
    const remaining = Object.keys(files).length > 0 ? files : null
    await leadRef.update({ files: remaining, updatedAt: now })

    res.json({ data: { id: req.params.id, removedFromStorage, files: remaining, updatedAt: now } })
  } catch (error) {
    next(error)
  }
})

router.get('/payments', requireAdmin, async (req, res, next) => {
  try {
    const leadId = String(req.query.leadId || '').trim()
    const status = String(req.query.status || '').trim()
    const snapshot = await db().ref('payments').get()
    let items = snapshotToArray(snapshot)

    if (leadId) items = items.filter((item) => item.leadId === leadId)
    if (status && PAYMENT_STATUSES.includes(status)) items = items.filter((item) => item.status === status)

    // Yang belum punya tanggal pembayaran diurutkan memakai waktu pencatatannya.
    items.sort((a, b) =>
      String(b.paidAt || b.createdAt || '').localeCompare(String(a.paidAt || a.createdAt || '')),
    )

    res.json({ data: items })
  } catch (error) {
    next(error)
  }
})

router.post('/payments', requireAdmin, async (req, res, next) => {
  try {
    const parsed = paymentSchema.safeParse(req.body || {})
    if (!parsed.success) {
      return res.status(422).json({ error: 'invalid_input', issues: formatIssues(parsed.error) })
    }

    // Transaksi harus menempel pada brief yang benar-benar ada, kalau tidak
    // catatannya akan menggantung dan tidak muncul di halaman mana pun.
    const leadSnapshot = await db().ref(`leads/${parsed.data.leadId}`).get()
    if (!leadSnapshot.exists()) return res.status(404).json({ error: 'lead_not_found' })

    const now = new Date().toISOString()
    const createdRef = db().ref('payments').push()
    const record = { ...parsed.data, createdAt: now, updatedAt: now }
    await createdRef.set(record)

    res.status(201).json({ data: { id: createdRef.key, ...record } })
  } catch (error) {
    next(error)
  }
})

router.patch('/payments/:id', requireAdmin, async (req, res, next) => {
  try {
    const parsed = updatePaymentSchema.safeParse(req.body || {})
    if (!parsed.success) {
      return res.status(422).json({ error: 'invalid_input', issues: formatIssues(parsed.error) })
    }

    const paymentRef = db().ref(`payments/${req.params.id}`)
    const snapshot = await paymentRef.get()
    if (!snapshot.exists()) return res.status(404).json({ error: 'not_found' })

    const update = { ...parsed.data, updatedAt: new Date().toISOString() }
    await paymentRef.update(update)

    res.json({ data: { id: req.params.id, ...snapshot.val(), ...update } })
  } catch (error) {
    next(error)
  }
})

router.delete('/payments/:id', requireAdmin, async (req, res, next) => {
  try {
    const paymentRef = db().ref(`payments/${req.params.id}`)
    const snapshot = await paymentRef.get()
    if (!snapshot.exists()) return res.status(404).json({ error: 'not_found' })

    await paymentRef.remove()
    res.json({ data: { id: req.params.id, deleted: true } })
  } catch (error) {
    next(error)
  }
})

router.get('/content/:collection', requireAdmin, resolveCollection, async (req, res, next) => {
  try {
    const snapshot = await db().ref(req.refPath).get()
    res.json({ data: snapshotToArray(snapshot).sort(byOrder) })
  } catch (error) {
    next(error)
  }
})

router.post('/content/:collection', requireAdmin, resolveCollection, async (req, res, next) => {
  try {
    const collection = req.params.collection
    const parsed = createSchemas[collection].safeParse(req.body || {})
    if (!parsed.success) {
      return res.status(422).json({ error: 'invalid_input', issues: formatIssues(parsed.error) })
    }

    const conflict = await findSlugConflict(req.refPath, parsed.data.slug, null)
    if (conflict) return res.status(409).json({ error: 'slug_taken', slug: parsed.data.slug })

    // Terjemahan dijalankan sebelum disimpan. Kalau penyedia terjemahan belum diatur,
    // fillTranslations hanya mengembalikan status 'nonaktif' dan rekaman tetap tersimpan.
    const record = { ...parsed.data }
    const translation = await fillTranslations(collection, record)

    const now = new Date().toISOString()
    const createdRef = db().ref(req.refPath).push()
    const stored = { ...record, translationStatus: translation.status, createdAt: now, updatedAt: now }
    await createdRef.set(stored)
    res.status(201).json({ data: { id: createdRef.key, ...stored }, translation })
  } catch (error) {
    next(error)
  }
})

router.patch('/content/:collection/:id', requireAdmin, resolveCollection, async (req, res, next) => {
  try {
    const collection = req.params.collection
    const parsed = patchSchemas[collection].safeParse(req.body || {})
    if (!parsed.success) {
      return res.status(422).json({ error: 'invalid_input', issues: formatIssues(parsed.error) })
    }

    const itemRef = db().ref(`${req.refPath}/${req.params.id}`)
    const snapshot = await itemRef.get()
    if (!snapshot.exists()) return res.status(404).json({ error: 'not_found' })

    const conflict = await findSlugConflict(req.refPath, parsed.data.slug, req.params.id)
    if (conflict) return res.status(409).json({ error: 'slug_taken', slug: parsed.data.slug })

    const previous = snapshot.val() || {}

    // PATCH hanya mengirim bidang yang berubah. Rekaman lama digabung dulu dengan
    // perubahan supaya penerjemahan tetap melihat teks yang tidak ikut dikirim.
    const merged = { ...previous, ...parsed.data }
    const translation = await fillTranslations(collection, merged)

    const update = { ...parsed.data, updatedAt: new Date().toISOString() }

    // Hanya bidang pasangan bahasa yang benar-benar berubah yang ikut disimpan.
    // Bidang yang sudah bernilai sama dilewati agar tidak ada penulisan sia-sia.
    for (const field of TRANSLATABLE_FIELDS[collection] || []) {
      const key = `${field}_${secondaryLocale()}`
      if (merged[key] === undefined) continue
      if (merged[key] === previous[key]) continue
      if (JSON.stringify(merged[key]) === JSON.stringify(previous[key])) continue
      update[key] = merged[key]
    }
    update.translationStatus = translation.status

    await itemRef.update(update)
    res.json({ data: { id: req.params.id, ...previous, ...update }, translation })
  } catch (error) {
    next(error)
  }
})

router.delete('/content/:collection/:id', requireAdmin, resolveCollection, async (req, res, next) => {
  try {
    const itemRef = db().ref(`${req.refPath}/${req.params.id}`)
    const snapshot = await itemRef.get()
    if (!snapshot.exists()) return res.status(404).json({ error: 'not_found' })
    await itemRef.remove()
    res.json({ data: { id: req.params.id, deleted: true } })
  } catch (error) {
    next(error)
  }
})

export default router
