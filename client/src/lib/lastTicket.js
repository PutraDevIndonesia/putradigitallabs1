const STORAGE_KEY = 'pdl_last_ticket'

/*
  Kode tiket terakhir disimpan di perangkat pengunjung, bukan di server.
  Tujuannya agar halaman lacak status bisa mengisi kodenya sendiri, sehingga
  pengunjung tidak perlu mencari lagi. Disimpan lokal karena kode ini milik
  pengunjung dan tidak perlu dikaitkan dengan identitas apa pun.
*/
export function saveLastTicket(code) {
  const value = String(code || '').trim()
  if (!value) return
  try {
    window.localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // Mode penyamaran atau penyimpanan penuh: kode tetap tampil di layar,
    // jadi kegagalan menyimpan tidak perlu mengganggu pengunjung.
  }
}

export function readLastTicket() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) || ''
  } catch {
    return ''
  }
}
