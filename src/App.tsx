import { useState } from 'react'
import { Role } from './types'
import { useOrders } from './hooks/useOrders'
import { Login } from './components/login/Login'
import { POS } from './components/pos/POS'
import { Admin } from './components/admin/Admin'

export default function App() {
  const [role, setRole] = useState<Role | null>(null)
  const store = useOrders() // un solo estado de órdenes compartido por POS y Admin

  if (!role) {
    return <Login onLogin={setRole} />
  }

  const logout = () => setRole(null)

  return role === 'pos' ? (
    <POS onLogout={logout} store={store} />
  ) : (
    <Admin onLogout={logout} store={store} />
  )
}