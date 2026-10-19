import crypto from 'node:crypto'
import { db } from './firebase.js'

// Alfabet tanpa karakter mudah tertukar (I, L, O, 0, 1) supaya kode bisa dibacakan lewat telepon.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 6
const MAX_ATTEMPTS = 6

export function buildTicketCode() {
  const bytes = crypto.randomBytes(CODE_LENGTH)
  let code = ''
  for (let i = 0; i < bytes.length; i += 1) {
    // ALPHABET berisi 32 karakter, dan 256 habis dibagi 32,
    // sehingga modulo di sini tidak menimbulkan bias distribusi.
    code += ALPHABET[bytes[i] % ALPHABET.length]
  }
  return `PDL-${code}`
}

export function normalizeTicketCode(value) {
  return String(value || '').trim().toUpperCase()
}

export async function createUniqueTicketCode() {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const code = buildTicketCode()
    const snapshot = await db().ref(`tickets/${code}`).get()
    if (!snapshot.exists()) return code
  }
  throw new Error('Gagal mendapatkan kode tiket unik setelah beberapa percobaan')
}
