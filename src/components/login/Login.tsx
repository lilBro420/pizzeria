import { useState } from 'react'
import { Role } from '../../types'
import { MonitorSmartphone, ShieldCheck, Lock } from 'lucide-react'

interface LoginProps {
  onLogin: (role: Role) => void
}

export function Login({ onLogin }: LoginProps) {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [pin, setPin] = useState('')

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedRole) onLogin(selectedRole)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#080808] p-6 font-sans">
      <div className="mb-10 text-center">
        <div className="text-6xl mb-4">🍕</div>
        <h1 className="text-4xl font-black tracking-tight text-white mb-2">Pizzería Volcán</h1>
        <p className="text-gray-400 font-medium text-sm tracking-widest uppercase">
          Punto de Venta
        </p>
      </div>

      {!selectedRole ? (
        <div className="flex flex-col sm:flex-row gap-5 w-full max-w-lg">
          <button
            onClick={() => setSelectedRole('pos')}
            className="flex-1 flex flex-col items-center gap-4 p-8 rounded-2xl border border-gray-800 bg-[#121212] hover:border-red-500/50 hover:bg-[#1a1a1a] hover:shadow-[0_0_20px_rgba(220,38,38,0.15)] transition-all group cursor-pointer"
          >
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
              <MonitorSmartphone className="w-8 h-8 text-red-500" />
            </div>
            <div className="text-center">
              <div className="font-bold text-xl text-white mb-1">Cajero</div>
              <div className="text-sm text-gray-400">Tomar pedidos y cobrar</div>
            </div>
          </button>
          
          <button
            onClick={() => setSelectedRole('admin')}
            className="flex-1 flex flex-col items-center gap-4 p-8 rounded-2xl border border-gray-800 bg-[#121212] hover:border-blue-500/50 hover:bg-[#1a1a1a] hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] transition-all group cursor-pointer"
          >
            <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
              <ShieldCheck className="w-8 h-8 text-blue-500" />
            </div>
            <div className="text-center">
              <div className="font-bold text-xl text-white mb-1">Administrador</div>
              <div className="text-sm text-gray-400">Gestión de menú y reportes</div>
            </div>
          </button>
        </div>
      ) : (
        <div className="w-full max-w-sm bg-[#121212] border border-gray-800 rounded-2xl p-8 shadow-xl">
          <button 
            onClick={() => {
              setSelectedRole(null)
              setPin('')
            }}
            className="text-gray-500 text-sm mb-6 hover:text-white transition-colors cursor-pointer flex items-center gap-2"
          >
            ← Volver
          </button>
          
          <div className="flex flex-col items-center mb-8">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${selectedRole === 'admin' ? 'bg-blue-500/10' : 'bg-red-500/10'}`}>
              <Lock className={`w-8 h-8 ${selectedRole === 'admin' ? 'text-blue-500' : 'text-red-500'}`} />
            </div>
            <h2 className="text-xl font-bold text-white">
              Iniciar Sesión como {selectedRole === 'admin' ? 'Administrador' : 'Cajero'}
            </h2>
            <p className="text-gray-400 text-sm mt-1">Ingresa tu código PIN (Opcional)</p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <input 
              type="password"
              placeholder="••••"
              value={pin}
              onChange={e => setPin(e.target.value)}
              className="bg-[#080808] border border-gray-700 rounded-xl px-4 py-4 text-center text-2xl font-mono text-white tracking-widest focus:border-white focus:outline-none transition-colors"
              autoFocus
            />
            <button 
              type="submit"
              className={`py-4 rounded-xl font-bold text-white transition-all cursor-pointer ${
                selectedRole === 'admin' 
                  ? 'bg-blue-600 hover:bg-blue-500' 
                  : 'bg-red-600 hover:bg-red-500'
              }`}
            >
              Entrar
            </button>
          </form>
        </div>
      )}
      
      <p className="mt-12 text-gray-600 text-xs font-mono">v2.0 · Soft-Style POS</p>
    </div>
  )
}
