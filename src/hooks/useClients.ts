import { useState } from 'react'
import { Client } from '../types'

export interface ClientsStore {
  clients: Client[]
  addOrUpdateClient: (client: Client) => void
  findByPhone: (phone: string) => Client | undefined
}

export function useClients(): ClientsStore {
  const [clients, setClients] = useState<Client[]>([])

  return {
    clients,
    addOrUpdateClient: (client) => {
      setClients(prev => {
        const index = prev.findIndex(c => c.phone === client.phone)
        if (index >= 0) {
          const clone = [...prev]
          clone[index] = client
          return clone
        }
        return [...prev, client]
      })
    },
    findByPhone: (phone) => clients.find(c => c.phone === phone)
  }
}
