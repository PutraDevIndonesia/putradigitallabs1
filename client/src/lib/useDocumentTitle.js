import { useEffect } from 'react'

const SITE_NAME = 'Putra Digital Labs'

// Setiap halaman menetapkan judulnya sendiri supaya tab browser, riwayat,
// dan hasil pencarian tidak semuanya memakai judul yang sama.
export function useDocumentTitle(title) {
  useEffect(() => {
    if (!title) return undefined
    const previous = document.title
    document.title = `${title} — ${SITE_NAME}`
    return () => {
      document.title = previous
    }
  }, [title])
}
