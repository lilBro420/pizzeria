import React, { useState } from 'react'
import { UsuarioActual } from '../../types'
import { api } from '../../services/api'
import { Button } from '../ui/Button'
import { VirtualKeyboard } from '../ui/VirtualKeyboard'
import { NumPad } from '../ui/NumPad'

interface LoginProps {
  onLogin: (usuario: UsuarioActual) => void
}

export function Login({ onLogin }: LoginProps) {
  const [usuario, setUsuario] = useState('ana')
  const [password, setPassword] = useState('cajero123')
  const [activeField, setActiveField] = useState<'usuario' | 'password'>('password')
  const [keyboardMode, setKeyboardMode] = useState<'num' | 'alpha' | 'none'>('num')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const quickUsers = [
    { u: 'ana', label: 'Ana López (Cajero)', pass: 'cajero123' },
    { u: 'carlos', label: 'Carlos Ramírez (Admin)', pass: 'admin123' },
    { u: 'miguel', label: 'Miguel Torres (Cocina)', pass: 'cocina123' },
    { u: 'juan', label: 'Juan Pérez (Repartidor)', pass: 'reparto123' },
  ]

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!usuario.trim() || !password) {
      setError('Introduce usuario y contraseña')
      return
    }

    try {
      setLoading(true)
      setError(null)
      const res = await api.login(usuario.trim(), password)
      onLogin(res.usuario)
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickSelect = (u: string, p: string) => {
    setUsuario(u)
    setPassword(p)
    setError(null)
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#5A738E] p-4 select-none">
      <div className="w-full max-w-xl swing-outset bg-[#D4D0C8] shadow-2xl border-2 border-black flex flex-col">
        {/* Title bar */}
        <div className="bg-[#0A246A] text-white px-3 py-2 flex items-center justify-between font-bold text-base select-none shrink-0 border-b border-black">
          <span className="tracking-wide">Pizzería Volcán — Control de Acceso</span>
          <span className="text-xs font-mono opacity-80">Soft POS v3.0</span>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col gap-4 bg-[#ECE9D8]">
          {/* Quick User Selector */}
          <div>
            <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Usuarios Rápidos (Táctil):
            </div>
            <div className="grid grid-cols-2 gap-2">
              {quickUsers.map(qu => (
                <Button
                  key={qu.u}
                  size="sm"
                  variant={usuario === qu.u ? 'primary' : 'default'}
                  onClick={() => handleQuickSelect(qu.u, qu.pass)}
                  className="text-sm font-bold truncate justify-start"
                >
                  {qu.label}
                </Button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-1">
                Usuario:
              </label>
              <input
                type="text"
                value={usuario}
                onFocus={() => {
                  setActiveField('usuario')
                  setKeyboardMode('alpha')
                }}
                onChange={e => setUsuario(e.target.value)}
                className="w-full h-12 px-3 text-lg font-bold bg-white swing-inset outline-none text-black"
                placeholder="Nombre de usuario"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-1">
                Contraseña:
              </label>
              <input
                type="password"
                value={password}
                onFocus={() => {
                  setActiveField('password')
                  setKeyboardMode('num')
                }}
                onChange={e => setPassword(e.target.value)}
                className="w-full h-12 px-3 text-2xl font-mono tracking-widest bg-white swing-inset outline-none text-black"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-[#FFEBEE] border-2 border-[#D32F2F] text-[#B71C1C] p-2 text-sm font-bold swing-inset">
                ✕ {error}
              </div>
            )}

            <div className="flex gap-2 mt-1">
              <Button
                type="submit"
                variant="success"
                size="lg"
                disabled={loading}
                className="flex-1 text-lg font-black tracking-wider"
              >
                {loading ? 'INGRESANDO...' : 'ENTRAR AL SISTEMA'}
              </Button>

              <Button
                type="button"
                variant="default"
                size="lg"
                onClick={() => setKeyboardMode(m => (m === 'none' ? 'num' : m === 'num' ? 'alpha' : 'none'))}
                className="text-xs px-3 font-bold"
              >
                {keyboardMode === 'none' ? 'TECLADO' : keyboardMode === 'num' ? 'ABC' : '123'}
              </Button>
            </div>
          </form>

          {/* On-screen keyboard depending on active field */}
          {keyboardMode === 'num' && (
            <div className="mt-2 pt-2 border-t border-[#808080]">
              <NumPad
                value={activeField === 'usuario' ? usuario : password}
                onChange={val => {
                  if (activeField === 'usuario') setUsuario(val)
                  else setPassword(val)
                }}
                allowDecimal={false}
                onEnter={handleSubmit}
                enterLabel="ENTRAR"
              />
            </div>
          )}

          {keyboardMode === 'alpha' && (
            <div className="mt-2 pt-2 border-t border-[#808080]">
              <VirtualKeyboard
                value={activeField === 'usuario' ? usuario : password}
                onChange={val => {
                  if (activeField === 'usuario') setUsuario(val)
                  else setPassword(val)
                }}
                onEnter={handleSubmit}
                enterLabel="ENTRAR"
              />
            </div>
          )}
        </div>

        {/* Status bar */}
        <div className="bg-[#D4D0C8] px-3 py-1 text-xs text-gray-700 font-bold border-t border-[#808080] flex justify-between select-none">
          <span>Servidor: Conectado</span>
          <span>Resolución táctil: 7" - 10"</span>
        </div>
      </div>
    </div>
  )
}
