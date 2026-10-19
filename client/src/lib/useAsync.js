import { useCallback, useEffect, useRef, useState } from 'react'

// Hook ini menyatukan tiga keadaan yang selalu dibutuhkan saat memuat data:
// sedang memuat, berhasil, atau gagal. Ada juga reload() untuk mencoba ulang.
export function useAsync(loader, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const [nonce, setNonce] = useState(0)
  const loaderRef = useRef(loader)
  loaderRef.current = loader

  useEffect(() => {
    let active = true
    setState((previous) => ({ ...previous, loading: true, error: null }))

    loaderRef.current().then(
      (data) => {
        // Komponen mungkin sudah dilepas saat respons datang; abaikan hasilnya.
        if (active) setState({ data, loading: false, error: null })
      },
      (error) => {
        if (active) setState({ data: null, loading: false, error })
      },
    )

    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce])

  const reload = useCallback(() => setNonce((value) => value + 1), [])

  return { ...state, reload }
}
