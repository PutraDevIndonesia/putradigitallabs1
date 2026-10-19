import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import id from './id.js'
import en from './en.js'

const DICTIONARIES = { id, en }
const STORAGE_KEY = 'pdl_locale'

const LocaleContext = createContext(null)

function readInitialLocale() {
  if (typeof window === 'undefined') return 'id'
  const saved = window.localStorage.getItem(STORAGE_KEY)
  if (saved === 'id' || saved === 'en') return saved
  // Pengunjung dari luar Indonesia langsung melihat versi Inggris.
  return String(window.navigator?.language || '').toLowerCase().startsWith('en') ? 'en' : 'id'
}

// Teks disimpan bertingkat (mis. "brief.fields.name") supaya file kamus tetap terbaca.
function resolve(dictionary, key) {
  return key
    .split('.')
    .reduce((current, part) => (current && typeof current === 'object' ? current[part] : undefined), dictionary)
}

export function LocaleProvider({ children }) {
  const [locale, setLocale] = useState(readInitialLocale)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, locale)
    document.documentElement.lang = locale
  }, [locale])

  const t = useCallback(
    (key, vars) => {
      const value = resolve(DICTIONARIES[locale], key) ?? resolve(DICTIONARIES.id, key)
      if (typeof value !== 'string') return key
      if (!vars) return value
      return value.replace(/\{(\w+)\}/g, (_match, name) => (vars[name] ?? ''))
    },
    [locale],
  )

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, t])

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useI18n() {
  const context = useContext(LocaleContext)
  if (!context) throw new Error('useI18n harus dipakai di dalam LocaleProvider')
  return context
}
