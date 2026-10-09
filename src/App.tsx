import { useEffect, useState } from 'react'
import { UsuarioActual } from './types'
import { api } from './services/api'
import { Login } from './components/login/Login'
import { POS } from './components/pos/POS'
import { Admin } from './components/admin/Admin'
import { CocinaKDS } from './components/cocina/CocinaKDS'
import { notifications, InAppNotification } from './services/notifications'

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
      }, 4500)
    })
  }, [])

  const renderContent = () => {
    if (initializing) {
      return (
        <div className="w-screen h-screen flex flex-col items-center justify-center bg-[#d4d0c8] text-[#111827]">
          <div className="swing-outset bg-[#e8e6e1] p-8 flex flex-col items-center gap-4 shadow-md border-2 border-[#808080]">
            <div className="w-8 h-8 border-4 border-[#000080] border-t-transparent rounded-full animate-spin" />
            <div className="text-base font-bold text-[#000080]">Cargando Sistema POS...</div>
            <div className="text-xs text-[#555]">Conectando con base de datos</div>
          </div>
        </div>
      )
    }

    if (!usuario) {
      return <Login onLogin={handleLogin} />
    }

    if (view === 'cocina') {
      return <CocinaKDS usuario={usuario} onBack={() => setView('pos')} />
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

  return (
    <>
      {/* Banner flotante de Notificación Push para Móviles (iOS / Android / Desktop) */}
      {activeNotification && (
        <div className="fixed top-2 inset-x-2 sm:inset-x-auto sm:right-4 sm:max-w-md z-[9999] animate-in slide-in-from-top-4 duration-200">
          <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-2xl border border-slate-700 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 font-black text-white text-xs shadow-sm">
              POS
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-black tracking-tight text-white block">
                {activeNotification.title}
              </span>
              <span className="text-[11px] text-slate-300 block mt-0.5 leading-tight">
                {activeNotification.body}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveNotification(null)}
              className="text-slate-400 hover:text-white text-xs font-bold px-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {renderContent()}
    </>
  )
}