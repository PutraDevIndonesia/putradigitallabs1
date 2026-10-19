const BASE = (import.meta.env.VITE_API_BASE || '/api').replace(/\/+$/, '')
const TOKEN_KEY = 'pdl_admin_token'
const REQUEST_TIMEOUT_MS = 15000

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

export function getToken() {
  return window.localStorage.getItem(TOKEN_KEY) || ''
}

export function setToken(token) {
  window.localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY)
}

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let response
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (error) {
    // Jaringan mati dan permintaan yang melewati batas waktu diperlakukan sama oleh UI:
    // keduanya butuh tombol coba lagi, bukan pesan kesalahan teknis.
    throw new ApiError(error?.name === 'TimeoutError' ? 'network_error' : 'network_error', 0, null)
  }

  const isJson = (response.headers.get('content-type') || '').includes('application/json')
  const payload = isJson ? await response.json().catch(() => null) : null

  if (!response.ok) {
    // Token yang ditolak server langsung dibuang, lalu halaman diarahkan ke form masuk.
    // Tanpa ini, operator akan melihat pesan kesalahan umum tanpa tahu bahwa sesinya berakhir.
    if (response.status === 401 && auth) {
      clearToken()
      window.location.assign('/admin')
    }
    throw new ApiError(payload?.error || 'internal_error', response.status, payload)
  }

  return payload?.data ?? null
}

// Unggahan butuh waktu lebih panjang daripada permintaan data biasa, dan badan
// permintaannya dikirim sebagai biner mentah agar server tidak perlu parser multipart.
const UPLOAD_TIMEOUT_MS = 180000
const DOWNLOAD_TIMEOUT_MS = 180000

async function uploadBinary(path, file) {
  const headers = { 'Content-Type': 'application/octet-stream' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const query = file?.name ? `?filename=${encodeURIComponent(file.name)}` : ''
  let response
  try {
    response = await fetch(`${BASE}${path}${query}`, {
      method: 'POST',
      headers,
      body: file,
      signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
    })
  } catch {
    throw new ApiError('network_error', 0, null)
  }

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    if (response.status === 401) {
      clearToken()
      window.location.assign('/admin')
    }
    throw new ApiError(payload?.error || 'internal_error', response.status, payload)
  }
  return payload?.data ?? null
}

async function downloadBinary(path) {
  const headers = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let response
  try {
    response = await fetch(`${BASE}${path}`, { headers, signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) })
  } catch {
    throw new ApiError('network_error', 0, null)
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new ApiError(payload?.error || 'internal_error', response.status, payload)
  }
  return response.blob()
}

// Alamat relatif untuk berkas publik dipakai langsung sebagai tautan unduh,
// jadi frontend tidak perlu menyusun ulang alamat API sendiri.
export function apiUrl(path) {
  return `${BASE}${path}`
}

export const publicApi = {
  listServices: () => request('/public/services'),
  listPackages: () => request('/public/packages'),
  listPortfolio: () => request('/public/portfolio'),
  getPortfolio: (slug) => request(`/public/portfolio/${encodeURIComponent(slug)}`),
  listArticles: () => request('/public/articles'),
  getArticle: (slug) => request(`/public/articles/${encodeURIComponent(slug)}`),
  createLead: (payload) => request('/public/leads', { method: 'POST', body: payload }),
  track: (code) => request(`/public/track/${encodeURIComponent(code)}`),
}

export const adminApi = {
  login: (email, password) => request('/admin/login', { method: 'POST', body: { email, password } }),
  session: () => request('/admin/session', { auth: true }),
  settings: () => request('/admin/settings', { auth: true }),
  overview: () => request('/admin/overview', { auth: true }),
  listLeads: (status) =>
    request(`/admin/leads${status ? `?status=${encodeURIComponent(status)}` : ''}`, { auth: true }),
  getLead: (id) => request(`/admin/leads/${encodeURIComponent(id)}`, { auth: true }),
  updateLead: (id, patch) =>
    request(`/admin/leads/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch, auth: true }),
  uploadLeadFile: (id, kind, file) =>
    uploadBinary(`/admin/leads/${encodeURIComponent(id)}/files/${encodeURIComponent(kind)}`, file),
  downloadLeadFile: (id, kind) =>
    downloadBinary(`/admin/leads/${encodeURIComponent(id)}/files/${encodeURIComponent(kind)}`),
  deleteLeadFile: (id, kind) =>
    request(`/admin/leads/${encodeURIComponent(id)}/files/${encodeURIComponent(kind)}`, {
      method: 'DELETE',
      auth: true,
    }),
  deleteLead: (id) => request(`/admin/leads/${encodeURIComponent(id)}`, { method: 'DELETE', auth: true }),
  listPayments: (params = {}) => {
    const query = new URLSearchParams()
    if (params.leadId) query.set('leadId', params.leadId)
    if (params.status) query.set('status', params.status)
    const suffix = query.toString() ? `?${query.toString()}` : ''
    return request(`/admin/payments${suffix}`, { auth: true })
  },
  createPayment: (payload) => request('/admin/payments', { method: 'POST', body: payload, auth: true }),
  updatePayment: (id, payload) =>
    request(`/admin/payments/${encodeURIComponent(id)}`, { method: 'PATCH', body: payload, auth: true }),
  deletePayment: (id) => request(`/admin/payments/${encodeURIComponent(id)}`, { method: 'DELETE', auth: true }),
  listContent: (collection) => request(`/admin/content/${collection}`, { auth: true }),
  createContent: (collection, payload) =>
    request(`/admin/content/${collection}`, { method: 'POST', body: payload, auth: true }),
  updateContent: (collection, id, payload) =>
    request(`/admin/content/${collection}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: payload,
      auth: true,
    }),
  deleteContent: (collection, id) =>
    request(`/admin/content/${collection}/${encodeURIComponent(id)}`, { method: 'DELETE', auth: true }),
}
