import { Readable } from 'node:stream'
import crypto from 'node:crypto'

const STORAGE_BASE_URL = (process.env.STORAGE_BASE_URL || 'https://dashboard.mputraramadhani.id').replace(/\/+$/, '')
const STORAGE_API_KEY = String(process.env.STORAGE_API_KEY || '').trim()
const NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,180}$/

export function storageConfigured() {
  return STORAGE_API_KEY !== ''
}

// Nama berkas ikut dikirim ke layanan penyimpanan dan dipakai lagi saat menghapus,
// jadi hanya karakter yang aman untuk URL dan sistem berkas yang diterima.
export function safeStorageName(raw) {
  const cleaned = String(raw || '')
    .trim()
    .replace(/[^A-Za-z0-9._-]/g, '_')
    .replace(/^[._-]+/, '')
    .slice(0, 180)
  return NAME_PATTERN.test(cleaned) ? cleaned : ''
}

export async function uploadToStorage(buffer, filename) {
  const displayName = safeStorageName(filename) || `berkas-${Date.now()}`
  if (!storageConfigured()) throw new Error('storage-belum-diatur')

  // Berkas disimpan memakai awalan acak supaya dua proyek dengan nama berkas
  // sama tidak saling menimpa di penyimpanan bersama. Nama asli tetap dipakai
  // untuk ditampilkan dan sebagai nama unduhan.
  const name = `${crypto.randomBytes(4).toString('hex')}-${displayName}`

  const response = await fetch(`${STORAGE_BASE_URL}/api/upload`, {
    method: 'POST',
    headers: {
      'X-Api-Key': STORAGE_API_KEY,
      'X-Filename': name,
      'Content-Type': 'application/octet-stream',
    },
    body: buffer,
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`storage-upload-gagal:${response.status}:${detail.slice(0, 200)}`)
  }

  const payload = await response.json().catch(() => null)
  const storedName = payload?.file?.name || name
  const relative = payload?.downloadUrl || `/files/${encodeURIComponent(storedName)}?api_key=${STORAGE_API_KEY}`

  return {
    name: storedName,
    displayName,
    size: typeof payload?.file?.size === 'number' ? payload.file.size : buffer.length,
    url: relative.startsWith('http') ? relative : `${STORAGE_BASE_URL}${relative}`,
  }
}

export async function deleteFromStorage(filename) {
  const name = safeStorageName(filename)
  if (!name || !storageConfigured()) return false

  try {
    const response = await fetch(`${STORAGE_BASE_URL}/api/files/${encodeURIComponent(name)}`, {
      method: 'DELETE',
      headers: { 'X-Api-Key': STORAGE_API_KEY },
    })
    return response.ok
  } catch {
    return false
  }
}

// Tautan penyimpanan hanya boleh menunjuk ke host penyimpanan yang dikenal supaya
// parameter dari database tidak bisa dipakai memanggil alamat lain.
export async function openStoredFile(url) {
  const target = String(url || '')
  if (!target.startsWith(`${STORAGE_BASE_URL}/`)) return null

  const response = await fetch(target)
  if (!response.ok || !response.body) return null
  return response
}

export function pipeStoredFile(response, res, filename) {
  res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream')
  const asciiName = String(filename || 'berkas').replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '')
  res.setHeader('Content-Disposition', `attachment; filename="${asciiName}"`)
  Readable.fromWeb(response.body).pipe(res)
}
