import { useState } from 'react'
import { Role } from './types'
import { useOrders } from './hooks/useOrders'
import { useMenu } from './hooks/useMenu'
import { useClients } from './hooks/useClients'
import { Login } from './components/login/Login'
import { POS } from './components/pos/POS'
import { Admin } from './components/admin/Admin'

export default function App() {
  const [role, setRole] = useState<Role | null>(null)
  
  const ordersStore = useOrders()
  const menuStore = useMenu()
  const clientsStore = useClients()

  if (!role) {
    return <Login onLogin={setRole} />
  }

  const logout = () => setRole(null)

  return role === 'pos' ? (
    <POS 
      onLogout={logout} 
      ordersStore={ordersStore} 
      menuStore={menuStore} 
      clientsStore={clientsStore} 
    />
  ) : (
    <Admin 
      onLogout={logout} 
      ordersStore={ordersStore} 
      menuStore={menuStore} 
    />
  )
}