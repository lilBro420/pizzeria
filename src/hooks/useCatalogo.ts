import { useCallback, useEffect, useState } from 'react'
import { Catalogo } from '../types'
import { api } from '../services/api'

export function useCatalogo(includeInactive = false) {
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.getCatalogo(includeInactive)
      setCatalogo(data)
      setError(null)
    } catch (err: any) {
      console.error('Error al cargar catálogo:', err)
      setError(err.message || 'Error al conectar con la base de datos')
    } finally {
      setLoading(false)
    }
  }, [includeInactive])

  useEffect(() => {
    reload()
  }, [reload])

  return {
    catalogo,
    loading,
    error,
    reload,
  }
}
