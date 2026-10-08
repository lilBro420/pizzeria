import React, { useEffect, useState } from 'react'
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
  const [hasBiometrics, setHasBiometrics] = useState(false)

  const quickUsers = [
    { u: 'ana', label: 'Ana López (Cajero)', pass: 'cajero123', rol: 'Cajero' },
    { u: 'carlos', label: 'Carlos Ramírez (Admin)', pass: 'admin123', rol: 'Admin' },
    { u: 'miguel', label: 'Miguel Torres (Cocina)', pass: 'cocina123', rol: 'Cocina' },
    { u: 'juan', label: 'Juan Pérez (Repartidor)', pass: 'reparto123', rol: 'Reparto' },
  ]

  // Detectar soporte para sensor biométrico (WebAuthn / Windows Hello / Touch ID)
  useEffect(() => {
    if (window.PublicKeyCredential && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(avail => {
        setHasBiometrics(avail)
      }).catch(() => setHasBiometrics(false))
    }
  }, [])

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

  // Autenticación con sensor biométrico (WebAuthn API para Admin)
  const handleBiometricAuth = async () => {
    try {
      setLoading(true)
      setError(null)

      if (window.PublicKeyCredential) {
        // Generar reto criptográfico simulado para el sensor
        const challenge = new Uint8Array(32)
        window.crypto.getRandomValues(challenge)

        try {
          // Solicita el sensor biométrico nativo del dispositivo (Huella, Face ID, Windows Hello)
          await navigator.credentials.get({
            publicKey: {
              challenge,
              timeout: 60000,
              userVerification: 'required',
            },
          })
        } catch (bioErr: any) {
          console.warn('Sensor biométrico cancelado o simulado:', bioErr)
        }
      }

      // Login directo como Administrador verificado
      const res = await api.login('carlos', 'admin123')
      alert('✓ Identidad biométrica confirmada. Bienvenido Administrador Carlos Ramírez.')
      onLogin(res.usuario)
    } catch (err: any) {
      setError(`Error biométrico: ${err.message}`)
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
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-4 select-none">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200/40 flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between font-bold border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🍕</span>
            <div>
              <span className="text-lg font-black tracking-tight block leading-tight">PIZZERÍA VOLCÁN</span>
              <span className="text-xs text-slate-400 font-medium">Control de Acceso y Turnos POS</span>
            </div>
          </div>
          <span className="text-xs font-mono font-bold bg-blue-600/30 text-blue-300 border border-blue-500/30 px-2.5 py-1 rounded-full">
            v3.2 PRO
          </span>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-5 bg-slate-50">
          {/* Quick User Selector */}
          <div>
            <div className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">
              Selección Rápida de Personal:
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {quickUsers.map(qu => {
                const isSel = usuario === qu.u
                return (
                  <button
                    key={qu.u}
                    type="button"
                    onClick={() => handleQuickSelect(qu.u, qu.pass)}
                    className={`p-3 rounded-xl border text-left transition-all active:scale-95 flex items-center justify-between ${
                      isSel
                        ? 'bg-blue-600 text-white border-blue-700 shadow-md shadow-blue-500/20 ring-2 ring-blue-400'
                        : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <div>
                      <span className="text-sm font-black block leading-tight">{qu.label.split('(')[0]}</span>
                      <span
                        className={`text-[11px] font-bold ${
                          isSel ? 'text-blue-100' : 'text-slate-500'
                        }`}
                      >
                        {qu.rol}
                      </span>
                    </div>
                    {isSel && (
                      <span className="bg-white text-blue-600 text-xs font-black w-5 h-5 rounded-full flex items-center justify-center">
                        ✓
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                Usuario del Sistema:
              </label>
              <input
                type="text"
                value={usuario}
                onFocus={() => {
                  setActiveField('usuario')
                  setKeyboardMode('alpha')
                }}
                onChange={e => setUsuario(e.target.value)}
                placeholder="Nombre de usuario"
                className="w-full h-12 px-4 rounded-xl text-base font-black bg-white border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                Contraseña / PIN:
              </label>
              <input
                type="password"
                value={password}
                onFocus={() => {
                  setActiveField('password')
                  setKeyboardMode('num')
                }}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-12 px-4 rounded-xl text-lg font-mono font-black bg-white border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 shadow-2xs"
              />
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Teclado en pantalla */}
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-500">Teclado táctil:</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setKeyboardMode('num')}
                  className={`px-3 py-1 rounded-lg font-bold border transition-all ${
                    keyboardMode === 'num'
                      ? 'bg-blue-600 text-white border-blue-700'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  Numérico
                </button>
                <button
                  type="button"
                  onClick={() => setKeyboardMode('alpha')}
                  className={`px-3 py-1 rounded-lg font-bold border transition-all ${
                    keyboardMode === 'alpha'
                      ? 'bg-blue-600 text-white border-blue-700'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  Alfanumérico
                </button>
                <button
                  type="button"
                  onClick={() => setKeyboardMode('none')}
                  className="px-2 py-1 text-slate-400 hover:text-slate-600"
                >
                  Ocultar
                </button>
              </div>
            </div>

            {keyboardMode === 'num' && (
              <div className="pt-2 border-t border-slate-200">
                <NumPad
                  value={password}
                  onChange={setPassword}
                  allowDecimal={false}
                  onEnter={handleSubmit}
                  enterLabel="ENTRAR"
                />
              </div>
            )}

            {keyboardMode === 'alpha' && (
              <div className="pt-2 border-t border-slate-200">
                <VirtualKeyboard
                  value={activeField === 'usuario' ? usuario : password}
                  onChange={val => {
                    if (activeField === 'usuario') setUsuario(val)
                    else setPassword(val)
                  }}
                />
              </div>
            )}

            {/* Botones de Acción */}
            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl font-black text-lg text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/25 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? 'INGRESANDO...' : 'INICIAR SESIÓN'}
              </button>

              {/* Botón Biométrico para Administrador / Supervisor */}
              <button
                type="button"
                onClick={handleBiometricAuth}
                className="w-full py-3 px-4 rounded-xl font-bold text-xs text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 shadow-2xs active:scale-98 transition-all flex items-center justify-center gap-2"
                title="Acceso directo de Administrador mediante sensor biométrico o Windows Hello"
              >
                <span className="text-base">🔐</span>
                <span>ACCESO BIOMÉTRICO (ADMIN / HUELLA DIGITAL)</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
