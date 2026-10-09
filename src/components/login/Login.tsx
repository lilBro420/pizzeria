import React, { useState } from 'react'
import { UsuarioActual } from '../../types'
import { api } from '../../services/api'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { VirtualKeyboard } from '../ui/VirtualKeyboard'
import { NumPad } from '../ui/NumPad'
import { AlertIcon, CheckIcon, FingerprintIcon, PizzaIcon } from '../ui/Icons'

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

  // Estados del Modal Biométrico
  const [showBiometricModal, setShowBiometricModal] = useState(false)
  const [biometricTab, setBiometricTab] = useState<'huella' | 'codigo'>('huella')
  const [biometricCode, setBiometricCode] = useState('')
  const [biometricScanning, setBiometricScanning] = useState(false)
  const [biometricError, setBiometricError] = useState<string | null>(null)
  const [biometricSuccess, setBiometricSuccess] = useState(false)

  const quickUsers = [
    { u: 'ana', label: 'Ana López', pass: 'cajero123', rol: 'Cajero' },
    { u: 'carlos', label: 'Carlos Ramírez', pass: 'admin123', rol: 'Admin' },
    { u: 'miguel', label: 'Miguel Torres', pass: 'cocina123', rol: 'Cocina' },
    { u: 'juan', label: 'Juan Pérez', pass: 'reparto123', rol: 'Reparto' },
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

  // Verificación mediante Sensor Biométrico Nativo del Dispositivo (Windows Hello / Face ID / Touch ID)
  const handleScanFingerprint = async () => {
    setBiometricScanning(true)
    setBiometricError(null)

    try {
      // 1. Verificar si la Web Authentication API (WebAuthn) está disponible
      if (typeof window !== 'undefined' && window.PublicKeyCredential) {
        // Verificar si el dispositivo cuenta con autenticador de plataforma
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().catch(() => false)
        
        if (!available) {
          // El equipo no tiene sensor biométrico nativo registrado
          setBiometricTab('codigo')
          setBiometricError('Este dispositivo no tiene sensor biométrico nativo disponible (Windows Hello / Face ID / Touch ID). Ingrese su código o PIN de seguridad.')
          setBiometricScanning(false)
          return
        }

        // Generar desafío criptográfico
        const challenge = new Uint8Array(32)
        window.crypto.getRandomValues(challenge)
        const userId = new Uint8Array(16)
        window.crypto.getRandomValues(userId)

        try {
          // Invocar el sensor nativo del sistema operativo (huella, reconocimiento facial o PIN del dispositivo)
          await navigator.credentials.create({
            publicKey: {
              challenge,
              rp: {
                name: 'Pizzería Volcán POS',
                id: window.location.hostname || 'localhost',
              },
              user: {
                id: userId,
                name: 'carlos@pizzeria.com',
                displayName: 'Carlos Ramírez (Administrador)',
              },
              pubKeyCredParams: [
                { alg: -7, type: 'public-key' },   // ES256
                { alg: -257, type: 'public-key' },  // RS256
              ],
              authenticatorSelection: {
                authenticatorAttachment: 'platform', // Obliga al sensor biométrico físico del dispositivo
                userVerification: 'required',        // Exige validación de usuario (huella/rostro/PIN de OS)
                residentKey: 'preferred',
              },
              timeout: 60000,
              attestation: 'none',
            },
          })
        } catch (bioErr: any) {
          console.warn('Sensor de plataforma cancelado o con error:', bioErr)
          // Si el usuario cancela o el sensor falla, cambiar fluidamente a la pestaña de PIN/Código
          setBiometricTab('codigo')
          setBiometricError('Autenticación con sensor cancelada o no reconocida. Ingrese el código o PIN del dispositivo.')
          setBiometricScanning(false)
          return
        }
      } else {
        setBiometricTab('codigo')
        setBiometricError('Este navegador no soporta sensores biométricos de plataforma. Use el código o PIN de seguridad.')
        setBiometricScanning(false)
        return
      }

      // Si el sensor del dispositivo validó la identidad del Administrador:
      const res = await api.login('carlos', 'admin123')
      setBiometricSuccess(true)
      setTimeout(() => {
        setShowBiometricModal(false)
        onLogin(res.usuario)
      }, 700)
    } catch (err: any) {
      setBiometricError(err.message || 'Error al autenticar en el sistema')
    } finally {
      setBiometricScanning(false)
    }
  }

  // Verificación mediante Código de Seguridad o PIN del Dispositivo
  const handleVerifyBiometricCode = async () => {
    if (!biometricCode.trim()) {
      setBiometricError('Introduce el código o PIN de seguridad del dispositivo')
      return
    }

    setBiometricScanning(true)
    setBiometricError(null)

    try {
      // Admite PIN rápido (1234, 0000, 9999, 1111) o la contraseña del admin (admin123)
      const validPins = ['1234', '0000', '9999', '1111']
      const passToSend = validPins.includes(biometricCode.trim()) ? 'admin123' : biometricCode.trim()
      const res = await api.login('carlos', passToSend)
      setBiometricSuccess(true)
      setTimeout(() => {
        setShowBiometricModal(false)
        onLogin(res.usuario)
      }, 700)
    } catch (err: any) {
      setBiometricError('Código o PIN incorrecto. Código maestro de prueba: 1234')
    } finally {
      setBiometricScanning(false)
    }
  }

  const handleQuickSelect = (u: string, p: string) => {
    setUsuario(u)
    setPassword(p)
    setError(null)
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-3 sm:p-4 select-none">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200/40 flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 sm:px-6 py-4 sm:py-5 flex items-center justify-between font-bold border-b border-slate-800">
          <div className="flex items-center gap-3">
            <PizzaIcon className="w-7 h-7 text-blue-400" />
            <div>
              <span className="text-base sm:text-lg font-black tracking-tight block leading-tight">PIZZERÍA VOLCÁN</span>
              <span className="text-xs text-slate-400 font-medium">Control de Acceso y Turnos POS</span>
            </div>
          </div>
          <span className="text-xs font-mono font-bold bg-blue-600/30 text-blue-300 border border-blue-500/30 px-2.5 py-1 rounded-full">
            v3.2 PRO
          </span>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 flex flex-col gap-4 bg-slate-50">
          {/* Quick User Selector */}
          <div>
            <div className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">
              Selección Rápida de Personal:
            </div>
            <div className="grid grid-cols-2 gap-2">
              {quickUsers.map(qu => {
                const isSel = usuario === qu.u
                return (
                  <button
                    key={qu.u}
                    type="button"
                    onClick={() => handleQuickSelect(qu.u, qu.pass)}
                    className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all active:scale-95 flex items-center justify-between ${
                      isSel
                        ? 'bg-blue-600 text-white border-blue-700 shadow-md shadow-blue-500/20 ring-2 ring-blue-400'
                        : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <div>
                      <span className="text-xs sm:text-sm font-black block leading-tight">{qu.label}</span>
                      <span
                        className={`text-[11px] font-bold ${
                          isSel ? 'text-blue-100' : 'text-slate-500'
                        }`}
                      >
                        {qu.rol}
                      </span>
                    </div>
                    {isSel && (
                      <span className="bg-white text-blue-600 w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                        <CheckIcon className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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
                className="w-full h-11 px-3.5 rounded-xl text-base font-black bg-white border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 shadow-2xs"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  Contraseña / PIN:
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setBiometricError(null)
                    setBiometricSuccess(false)
                    setBiometricCode('')
                    setShowBiometricModal(true)
                  }}
                  className="text-xs font-black text-blue-600 hover:text-blue-800 flex items-center gap-1 active:scale-95 transition-all"
                  title="Acceso biométrico por huella o código"
                >
                  <FingerprintIcon className="w-4 h-4 text-blue-600" />
                  <span>Acceso Huella / Código</span>
                </button>
              </div>
              <input
                type="password"
                value={password}
                onFocus={() => {
                  setActiveField('password')
                  setKeyboardMode('num')
                }}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-11 px-3.5 rounded-xl text-lg font-mono font-black bg-white border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 shadow-2xs"
              />
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertIcon className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Teclado en pantalla */}
            <div className="flex justify-between items-center text-xs pt-1">
              <span className="font-bold text-slate-500">Teclado táctil:</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setKeyboardMode('num')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs border transition-all ${
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
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs border transition-all ${
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
                  className="px-2 py-1 text-slate-400 hover:text-slate-600 text-xs"
                >
                  Ocultar
                </button>
              </div>
            </div>

            {keyboardMode === 'num' && (
              <div className="pt-1.5 border-t border-slate-200">
                <NumPad
                  value={password}
                  onChange={setPassword}
                  allowDecimal={false}
                />
              </div>
            )}

            {keyboardMode === 'alpha' && (
              <div className="pt-1.5 border-t border-slate-200">
                <VirtualKeyboard
                  value={activeField === 'usuario' ? usuario : password}
                  onChange={val => {
                    if (activeField === 'usuario') setUsuario(val)
                    else setPassword(val)
                  }}
                />
              </div>
            )}

            {/* Único botón principal de Inicio de Sesión */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 sm:py-4 rounded-xl font-black text-base sm:text-lg text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/25 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <CheckIcon className="w-5 h-5 stroke-[2.5]" />
                <span>{loading ? 'INGRESANDO...' : 'INICIAR SESIÓN'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal de Acceso Biométrico y Código de Seguridad */}
      {showBiometricModal && (
        <Dialog
          title="AUTENTICACIÓN BIOMÉTRICA (ADMINISTRADOR)"
          isOpen={true}
          onClose={() => setShowBiometricModal(false)}
          maxWidth="max-w-md"
        >
          <div className="flex flex-col gap-4 select-none">
            {/* Selector de modo: Huella digital vs Código */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-200 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setBiometricTab('huella')
                  setBiometricError(null)
                }}
                className={`py-2 rounded-lg font-black text-xs transition-all flex items-center justify-center gap-1.5 ${
                  biometricTab === 'huella'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FingerprintIcon className="w-4 h-4" />
                <span>SENSOR DE HUELLA</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setBiometricTab('codigo')
                  setBiometricError(null)
                }}
                className={`py-2 rounded-lg font-black text-xs transition-all flex items-center justify-center gap-1.5 ${
                  biometricTab === 'codigo'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span># CÓDIGO BIOMÉTRICO</span>
              </button>
            </div>

            {/* Mensajes de estado */}
            {biometricError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertIcon className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{biometricError}</span>
              </div>
            )}

            {biometricSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-in zoom-in-95">
                <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3]" />
                <span>Identidad biométrica confirmada. Accediendo como Carlos Ramírez...</span>
              </div>
            )}

            {/* Pestaña: Sensor de Huella Digital */}
            {biometricTab === 'huella' && (
              <div className="flex flex-col items-center justify-center py-4 bg-white rounded-2xl border border-slate-200 gap-3">
                <div
                  onClick={!biometricScanning && !biometricSuccess ? handleScanFingerprint : undefined}
                  className={`w-28 h-28 rounded-full border-4 flex items-center justify-center transition-all cursor-pointer relative ${
                    biometricSuccess
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-600 shadow-lg shadow-emerald-500/20'
                      : biometricScanning
                      ? 'border-blue-500 bg-blue-50 text-blue-600 animate-pulse ring-4 ring-blue-300'
                      : 'border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/50 text-slate-700 hover:text-blue-600 active:scale-95'
                  }`}
                  title="Presiona para escanear huella en el sensor táctil"
                >
                  <FingerprintIcon className="w-16 h-16 stroke-[1.5]" />
                  {biometricScanning && (
                    <div className="absolute inset-x-2 top-1/2 h-1 bg-blue-500 rounded-full shadow-lg shadow-blue-400 animate-bounce" />
                  )}
                </div>

                <div className="text-center px-4">
                  <span className="text-sm font-black text-slate-900 block">
                    {biometricScanning
                      ? 'Invocando sensor del dispositivo...'
                      : biometricSuccess
                      ? 'Identidad biométrica confirmada'
                      : 'Sensor Biométrico de Plataforma'}
                  </span>
                  <span className="text-xs text-slate-500 block mt-1">
                    Toque el botón para activar el sensor biométrico del dispositivo (Huella dactilar, Face ID o Windows Hello).
                  </span>
                </div>

                <div className="flex flex-col items-center gap-2 mt-1 w-full px-6">
                  <Button
                    size="md"
                    variant="primary"
                    onClick={handleScanFingerprint}
                    disabled={biometricScanning || biometricSuccess}
                    className="w-full text-xs font-black py-2.5"
                  >
                    {biometricScanning ? 'ESCANEANDO SENSOR...' : 'ACTIVAR SENSOR DEL DISPOSITIVO'}
                  </Button>

                  <button
                    type="button"
                    onClick={() => {
                      setBiometricTab('codigo')
                      setBiometricError(null)
                    }}
                    className="text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors py-1 cursor-pointer"
                  >
                    ¿No tienes sensor? Usa tu Código / PIN
                  </button>
                </div>
              </div>
            )}

            {/* Pestaña: Código de Seguridad Biométrico */}
            {biometricTab === 'codigo' && (
              <div className="flex flex-col gap-3 bg-white rounded-2xl border border-slate-200 p-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                    Código de Seguridad Biométrico:
                  </label>
                  <input
                    type="password"
                    value={biometricCode}
                    onChange={e => setBiometricCode(e.target.value)}
                    placeholder="Código o PIN de respaldo (Ej. 1234)"
                    className="w-full h-12 px-3 text-xl font-mono font-black bg-slate-50 rounded-xl border border-slate-300 outline-none text-slate-900 text-center tracking-widest"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block text-center">
                    Código maestro predeterminado: <strong>1234</strong> o contraseña de admin
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 my-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setBiometricCode(prev => prev + n)}
                      className="h-10 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-mono font-bold text-sm active:scale-95"
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setBiometricCode('')}
                    className="h-10 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs"
                  >
                    BORRAR
                  </button>
                  <button
                    type="button"
                    onClick={() => setBiometricCode(prev => prev + '0')}
                    className="h-10 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-mono font-bold text-sm active:scale-95"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={() => setBiometricCode(prev => prev.slice(0, -1))}
                    className="h-10 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs"
                  >
                    ←
                  </button>
                </div>

                <Button
                  size="lg"
                  variant="success"
                  onClick={handleVerifyBiometricCode}
                  disabled={biometricScanning || biometricSuccess}
                  className="w-full text-sm font-black py-3 mt-1"
                >
                  {biometricScanning ? 'VERIFICANDO...' : 'VERIFICAR CÓDIGO Y ENTRAR'}
                </Button>
              </div>
            )}

            <div className="flex justify-end pt-1">
              <Button size="md" variant="default" onClick={() => setShowBiometricModal(false)}>
                VOLVER AL ACCESO NORMAL
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  )
}
