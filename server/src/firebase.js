import fs from 'node:fs'
import admin from 'firebase-admin'

let initialized = false

// Tanpa kunci service account, applicationDefault() mencoba menghubungi
// metadata server Google dan permintaan menggantung sebelum akhirnya gagal.
// Karena itu kredensial diperiksa lebih dulu supaya server bisa menolak cepat
// dengan pesan yang bisa ditindaklanjuti.
export function credentialsConfigured() {
  if ((process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim() !== '') return true
  const keyPath = (process.env.GOOGLE_APPLICATION_CREDENTIALS || '').trim()
  return keyPath !== '' && fs.existsSync(keyPath)
}

// Kredensial dibaca dari environment, bukan dari file di dalam repo.
// Dua cara didukung: JSON service account inline, atau path file lewat
// GOOGLE_APPLICATION_CREDENTIALS yang dibaca oleh applicationDefault().
function buildCredential() {
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (inline && inline.trim() !== '') {
    let parsed
    try {
      parsed = JSON.parse(inline)
    } catch {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON tidak bisa di-parse sebagai JSON')
    }
    return admin.credential.cert(parsed)
  }
  return admin.credential.applicationDefault()
}

function initApp() {
  if (initialized) return
  const databaseURL = (process.env.FIREBASE_DATABASE_URL || '').trim()
  if (!databaseURL) {
    throw new Error('FIREBASE_DATABASE_URL belum diisi. Salin server/.env.example ke server/.env')
  }
  if (!credentialsConfigured()) {
    throw new Error(
      'Kredensial service account belum diisi. Isi FIREBASE_SERVICE_ACCOUNT_JSON atau GOOGLE_APPLICATION_CREDENTIALS di server/.env',
    )
  }
  admin.initializeApp({ credential: buildCredential(), databaseURL })
  initialized = true
}

export function isConfigured() {
  return Boolean((process.env.FIREBASE_DATABASE_URL || '').trim())
}

export function db() {
  initApp()
  return admin.database()
}

export function ref(path) {
  return db().ref(path)
}

// Skrip sekali jalan seperti seed harus menutup koneksi Firebase, kalau tidak
// event loop Node tetap hidup dan perintah tidak pernah selesai.
export async function closeFirebase() {
  if (!initialized) return
  await admin.app().delete()
  initialized = false
}

// Realtime Database menyimpan koleksi sebagai objek ber-key, bukan array.
// Helper ini mengubahnya menjadi array sambil mempertahankan key sebagai id.
export function snapshotToArray(snapshot) {
  const value = snapshot.val() || {}
  return Object.entries(value).map(([id, item]) => ({ id, ...item }))
}
