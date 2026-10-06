import { useState, useEffect } from 'react'
import { MenuItem } from '../types'
import { api } from '../services/api'

export interface MenuStore {
  items: MenuItem[]
  loading: boolean
  error: string | null
  refreshMenu: () => Promise<void>
  addItem: (item: MenuItem) => void
  updateItem: (id: string | number, updates: Partial<MenuItem>) => void
  deleteItem: (id: string | number) => void
  reorderItem: (id: string | number, newIndex: number) => void
}

export function useMenu(): MenuStore {
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadMenu = async () => {
    try {
      setLoading(true)
      const prods = await api.getProductos()
      setItems(prods)
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
    items,
    loading,
    error,
    refreshMenu: loadMenu,
    addItem: (item) => setItems(prev => [...prev, item]),
    updateItem: (id, updates) => setItems(prev => prev.map(i => (i.id === id ? { ...i, ...updates } : i))),
    deleteItem: (id) => setItems(prev => prev.filter(i => i.id !== id)),
    reorderItem: (id, newIndex) => {
      setItems(prev => {
        const index = prev.findIndex(i => i.id === id)
        if (index < 0) return prev
        const clone = [...prev]
        const [moved] = clone.splice(index, 1)
        clone.splice(newIndex, 0, moved)
        return clone
      })
    }
  }
}

