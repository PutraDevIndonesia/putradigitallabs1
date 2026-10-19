import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// React Router tidak mengembalikan posisi gulir saat pindah halaman.
// Tanpa ini, membuka halaman baru dari footer akan mendarat di tengah halaman.
export function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [pathname])

  return null
}
