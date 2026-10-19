import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { authIsConfigured } from './auth.js'
import { isConfigured } from './firebase.js'
import adminRoutes from './routes/admin.js'
import publicRoutes from './routes/public.js'

const app = express()
const PORT = Number(process.env.PORT || 4000)

const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)

app.disable('x-powered-by')

app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    // Kebijakan ini hanya berlaku saat server ikut melayani hasil build frontend.
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com'],
        'img-src': ["'self'", 'data:', 'https:'],
        'connect-src': ["'self'", ...allowedOrigins],
        'frame-ancestors': ["'none'"],
        'object-src': ["'none'"],
      },
    },
  }),
)

app.use(
  cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
)
// Batas isi dipisah per kelompok endpoint. Formulir brief hanya perlu beberapa
// kilobyte, sedangkan panel admin mengirim konten yang jauh lebih panjang.
// Dengan begitu permintaan publik tidak bisa memaksa server menampung badan
// sebesar batas admin.
const publicBody = express.json({ limit: '64kb' })
const adminBody = express.json({ limit: '2mb' })

// X-Forwarded-For hanya dipercaya bila diminta lewat env supaya pembatas laju
// per IP tidak bisa dipalsukan saat server berdiri langsung, dan tidak menumpuk
// jadi satu saat server berada di belakang reverse proxy.
const trustProxy = String(process.env.TRUST_PROXY || '').trim()
if (trustProxy === 'true') app.set('trust proxy', true)
else if (trustProxy) app.set('trust proxy', /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy)

app.get('/api/health', (_req, res) => {
  res.json({ data: { ok: true } })
})

app.use('/api/public', publicBody, publicRoutes)
app.use('/api/admin', adminBody, adminRoutes)

const distDir = process.env.CLIENT_DIST
  ? path.resolve(process.cwd(), process.env.CLIENT_DIST)
  : null

if (distDir && fs.existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next()
    return res.sendFile(path.join(distDir, 'index.html'))
  })
}

app.use((_req, res) => {
  res.status(404).json({ error: 'not_found' })
})

app.use((error, req, res, _next) => {
  const message = String(error?.message || '')

  // Permintaan yang ditolak karena isinya terlalu besar atau bentuknya salah bukan
  // kegagalan server, jadi kode aslinya diteruskan agar pesannya bisa ditindaklanjuti.
  const status = Number(error?.status)
  if (status >= 400 && status < 500) {
    return res.status(status).json({ error: status === 413 ? 'file_too_large' : 'invalid_request' })
  }

  // Firebase belum dikonfigurasi bukan kesalahan server internal, jadi jawab 503 dengan pesan jelas.
  if (message.includes('belum diisi')) {
    console.error('[konfigurasi]', message)
    return res.status(503).json({ error: 'server-not-configured', message })
  }

  console.error('[error]', req.method, req.originalUrl, error)
  return res.status(500).json({ error: 'internal_error' })
})

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`API berjalan di http://localhost:${PORT}`)
    if (!isConfigured()) {
      console.warn('FIREBASE_DATABASE_URL belum diisi. Endpoint data akan menolak permintaan sampai .env lengkap.')
    }
    if (!authIsConfigured()) {
      console.warn('Kredensial admin belum lengkap. Endpoint /api/admin/login belum bisa dipakai.')
    }
  })
}

export default app
