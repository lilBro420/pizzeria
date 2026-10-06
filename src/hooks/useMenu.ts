import { useState, useEffect } from 'react'
import { MenuItem } from '../types'
import { api } from '../services/api'

export function useMenu() {
  const [menu, setMenu] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadMenu = async () => {
    try {
      setLoading(true)
      const prods = await api.getProductos()
      setMenu(prods)
      setError(null)
    } catch (err: any) {
      console.error('Error al cargar productos del backend:', err)
      setError(err.message || 'Error al conectar con la base de datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMenu()
  }, [])

  return {
    menu,
    loading,
    error,
    refreshMenu: loadMenu,
  }
}
