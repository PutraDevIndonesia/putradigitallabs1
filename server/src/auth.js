import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const TOKEN_TTL = '12h'
const MIN_SECRET_LENGTH = 16

function secret() {
  const value = process.env.JWT_SECRET || ''
  if (value.length < MIN_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET belum diisi atau kurang dari ${MIN_SECRET_LENGTH} karakter`)
  }
  return value
}

// Perbandingan waktu-konstan agar panjang dan isi sandi tidak bocor lewat timing.
function safeEqual(a, b) {
  const left = Buffer.from(String(a), 'utf8')
  const right = Buffer.from(String(b), 'utf8')
  if (left.length !== right.length) return false
  return crypto.timingSafeEqual(left, right)
}

export function verifyCredentials(email, password) {
  const expectedEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase()
  const hash = (process.env.ADMIN_PASSWORD_HASH || '').trim()
  const plain = process.env.ADMIN_PASSWORD || ''

  if (!expectedEmail || (!hash && !plain)) {
    return { ok: false, reason: 'belum-dikonfigurasi' }
  }
  if (String(email || '').trim().toLowerCase() !== expectedEmail) {
    return { ok: false, reason: 'kredensial-salah' }
  }
  const entered = String(password || '')
  const match = hash ? bcrypt.compareSync(entered, hash) : safeEqual(entered, plain)
  return match ? { ok: true } : { ok: false, reason: 'kredensial-salah' }
}

export function issueToken(email) {
  return jwt.sign({ sub: 'admin', email }, secret(), { expiresIn: TOKEN_TTL })
}

export function requireAdmin(req, res, next) {
  const header = req.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) {
    return res.status(401).json({ error: 'unauthorized' })
  }
  try {
    req.admin = jwt.verify(token, secret())
    return next()
  } catch {
    return res.status(401).json({ error: 'unauthorized' })
  }
}

export function authIsConfigured() {
  const hasSecret = (process.env.JWT_SECRET || '').length >= MIN_SECRET_LENGTH
  const hasAdmin = Boolean((process.env.ADMIN_EMAIL || '').trim())
  const hasPassword = Boolean((process.env.ADMIN_PASSWORD_HASH || '').trim() || process.env.ADMIN_PASSWORD)
  return hasSecret && hasAdmin && hasPassword
}
