import { useState } from 'react'
import { MenuItem, Category } from '../types'
import { MENU as INITIAL_MENU } from '../data/menu'

export interface MenuStore {
  items: MenuItem[]
  addItem: (item: MenuItem) => void
  updateItem: (id: string, updates: Partial<MenuItem>) => void
  deleteItem: (id: string) => void
  reorderItem: (id: string, newIndex: number) => void
}

export function useMenu(): MenuStore {
  const [items, setItems] = useState<MenuItem[]>(INITIAL_MENU)

  return {
    items,
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
