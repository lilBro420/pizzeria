import { useEffect, useState } from 'react'
import { UsuarioActual } from './types'
import { api } from './services/api'
import { Login } from './components/login/Login'
import { POS } from './components/pos/POS'
import { Admin } from './components/admin/Admin'
import { CocinaKDS } from './components/cocina/CocinaKDS'
import { notifications, InAppNotification } from './services/notifications'
import { PizzaIcon } from './components/ui/Icons'

export type AppView = 'pos' | 'admin' | 'cocina'

export default function App() {
  const [usuario, setUsuario] = useState<UsuarioActual | null>(null)
  const [view, setView] = useState<AppView>('pos')
  const [initializing, setInitializing] = useState(true)

  // Intentar restaurar sesión activa al cargar la app
  useEffect(() => {
    let mounted = true
    async function restoreSession() {
      if (!api.hasToken()) {
        if (mounted) setInitializing(false)
        return
      }
      try {
        const u = await api.me()
        if (mounted) {
          setUsuario(u)
          if (u.rol === 'cocinero') {
            setView('cocina')
          } else {
            setView('pos')
          }
        }
      } catch (err) {
        console.warn('Sesión previa inválida o expirada:', err)
        api.logout()
        if (mounted) setUsuario(null)
      } finally {
        if (mounted) setInitializing(false)
      }
    }
    restoreSession()
    return () => {
      mounted = false
    }
  }, [])

  const handleLogin = (u: UsuarioActual) => {
    setUsuario(u)
    if (u.rol === 'cocinero') {
      setView('cocina')
    } else {
      setView('pos')
    }
  }

  const handleLogout = () => {
    api.logout()
    setUsuario(null)
    setView('pos')
  }

  const [activeNotification, setActiveNotification] = useState<InAppNotification | null>(null)

  useEffect(() => {
    return notifications.subscribe(notif => {
      setActiveNotification(notif)
      setTimeout(() => {
        setActiveNotification(curr => (curr?.id === notif.id ? null : curr))
      }, 6000)
    })
  }, [])

  const renderContent = () => {
    if (initializing) {
      return (
        <div className="w-screen h-screen flex flex-col items-center justify-center bg-slate-900 text-white select-none">
          <div className="bg-slate-800/90 backdrop-blur-md p-8 rounded-3xl flex flex-col items-center gap-4 shadow-2xl border border-slate-700/60 max-w-sm w-full mx-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
              <PizzaIcon className="w-8 h-8 text-white" />
            </div>
            <div className="text-center">
              <span className="text-xl font-black tracking-tight block">PIZZERÍA VOLCÁN</span>
              <span className="text-xs text-slate-400 font-medium">Sistema Punto de Venta & KDS</span>
            </div>
            <div className="w-7 h-7 border-3 border-blue-500 border-t-transparent rounded-full animate-spin my-1" />
            <span className="text-xs text-slate-400 font-mono">Conectando con base de datos...</span>
          </div>
        </div>
      )
    }

    if (!usuario) {
      return <Login onLogin={handleLogin} />
    }

    if (view === 'cocina') {
      return <CocinaKDS usuario={usuario} onBack={() => setView('pos')} onLogout={handleLogout} />
    }

    if (view === 'admin') {
      return (
        <Admin
          usuario={usuario}
          onLogout={handleLogout}
          onGoPOS={() => setView('pos')}
          onGoCocina={() => setView('cocina')}
        />
      )
    }

    return (
      <POS
        usuario={usuario}
        onLogout={handleLogout}
        onGoCocina={() => setView('cocina')}
        onGoAdmin={() => setView('admin')}
      />
    )
  }

  const isKitchen = activeNotification?.tag === 'kitchen'

  return (
    <>
      {/* Banner flotante de Notificación Push para Móviles y KDS */}
      {activeNotification && (
        <div className="fixed top-2 inset-x-2 sm:inset-x-auto sm:right-4 sm:max-w-md z-[9999] animate-in slide-in-from-top-4 duration-200">
          <div
            className={`backdrop-blur-md text-white p-3.5 rounded-2xl shadow-2xl border flex items-start gap-3 transition-all ${
              isKitchen
                ? 'bg-slate-950/98 border-amber-400 ring-2 ring-amber-400/50 shadow-amber-500/25'
                : 'bg-slate-900/95 border-slate-700'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-black text-xs shadow-sm ${
                isKitchen ? 'bg-amber-500 text-slate-950 animate-pulse' : 'bg-blue-600 text-white'
              }`}
            >
              {isKitchen ? 'COC' : 'POS'}
            </div>
            <div className="flex-1 min-w-0">
              <span
                className={`text-xs font-black tracking-tight block ${
                  isKitchen ? 'text-amber-300' : 'text-white'
                }`}
              >
                {activeNotification.title}
              </span>
              <span className="text-[11px] text-slate-200 block mt-0.5 leading-tight font-medium">
                {activeNotification.body}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveNotification(null)}
              className="text-slate-400 hover:text-white text-xs font-bold px-1"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {renderContent()}
    </>
  )
}