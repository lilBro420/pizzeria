import React, { useEffect, useRef, useState } from 'react'
import { Orden, UsuarioActual } from '../../types'
import { api } from '../../services/api'
import { notifications } from '../../services/notifications'
import { Button } from '../ui/Button'
import { BellIcon, CheckIcon, PizzaIcon } from '../ui/Icons'

interface CocinaKDSProps {
  usuario: UsuarioActual
  onBack: () => void
  onLogout?: () => void
}

export function CocinaKDS({ usuario, onBack, onLogout }: CocinaKDSProps) {
  const [pendientes, setPendientes] = useState<Orden[]>([])
  const [canceladas, setCanceladas] = useState<Orden[]>([])
  const [impresas, setImpresas] = useState<Orden[]>([])
  const [verImpresas, setVerImpresas] = useState(false)
  const [loading, setLoading] = useState(true)

  const knownIdsRef = useRef<Set<number>>(new Set())
  const isInitialRef = useRef(true)

  const loadComandas = async () => {
    try {
      const data = await api.getComandas(verImpresas)

      // Detección en tiempo real de nuevas comandas entrantes
      if (isInitialRef.current) {
        data.pendientes.forEach(o => knownIdsRef.current.add(o.id))
        isInitialRef.current = false
      } else {
        const nuevas = data.pendientes.filter(o => !knownIdsRef.current.has(o.id))
        if (nuevas.length > 0) {
          for (const n of nuevas) {
            knownIdsRef.current.add(n.id)
            const itemsTxt = n.items.map(i => `${i.cantidad}x ${i.nombre}`).join(', ')
            const mesaTxt = n.mesa ? ` (Mesa ${n.mesa})` : n.tipo ? ` (${n.tipo.toUpperCase()})` : ''
            notifications.notifyNewKitchenOrder(
              `${n.folio}${mesaTxt}`,
              n.items.length,
              itemsTxt
            )
          }
        }
      }

      setPendientes(data.pendientes)
      setCanceladas(data.canceladas)
      setImpresas(data.impresas)
    } catch (err: any) {
      console.error('Error al cargar comandas:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadComandas()
    const timer = setInterval(loadComandas, 3500)
    return () => clearInterval(timer)
  }, [verImpresas])

  const handleImprimir = async (id: number) => {
    try {
      const ord = pendientes.find(p => p.id === id)
      await api.imprimirComanda(id)
      if (ord) {
        notifications.notifyOrderReady(ord.folio, ord.tipo, ord.cliente?.nombre)
      }
      await loadComandas()
    } catch (err: any) {
      alert(`Error al imprimir comanda: ${err.message}`)
    }
  }

  const handleTestCampana = () => {
    notifications.unlockAudio()
    notifications.playChime('kitchen')
    notifications.vibrate([100, 50, 100])
  }

  return (
    <div className="min-h-[100dvh] lg:h-screen w-full flex flex-col bg-slate-950 select-none text-white overflow-y-auto lg:overflow-hidden p-2 sm:p-3 font-sans">
      {/* ── KDS Top Bar Moderna ── */}
      <header className="bg-slate-900 px-3 sm:px-4 py-2.5 rounded-2xl flex items-center justify-between border border-slate-800 shadow-xl shrink-0 mb-3 gap-2 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-2 sm:gap-4">
          {usuario.rol !== 'cocinero' ? (
            <Button size="sm" variant="default" onClick={onBack} className="text-xs font-black py-1 px-3">
              ← VOLVER AL POS
            </Button>
          ) : null}
          <div className="flex items-center gap-2">
            <PizzaIcon className="w-5 h-5 text-amber-400 hidden sm:block" />
            <span className="text-base sm:text-lg font-black tracking-tight text-white">
              MONITOR DE COCINA (KDS)
            </span>
          </div>
          <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-1 rounded-lg border border-slate-700 font-mono hidden md:inline">
            Cocinero: <strong className="text-white">{usuario.nombre}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Botón para probar / desbloquear campana de cocina */}
          <button
            type="button"
            onClick={handleTestCampana}
            className="bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
            title="Toca para probar o activar el sonido de la campana de cocina"
          >
            <BellIcon className="w-3.5 h-3.5 fill-current" />
            <span>PROBAR CAMPANA</span>
          </button>

          <span className="text-xs font-black bg-orange-500/20 text-orange-400 border border-orange-500/40 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
            <span>{pendientes.length} PENDIENTES</span>
          </span>

          <Button
            size="sm"
            variant={verImpresas ? 'primary' : 'default'}
            onClick={() => setVerImpresas(!verImpresas)}
            className="text-xs font-black py-1.5 px-3"
          >
            {verImpresas ? 'OCULTAR IMPRESAS' : 'VER IMPRESAS'}
          </Button>

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="h-9 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-sm active:scale-95 transition-all flex items-center cursor-pointer"
              title="Cerrar sesión"
            >
              SALIR
            </button>
          )}
        </div>
      </header>

      {/* Cancelled warnings bar */}
      {canceladas.length > 0 && (
        <div className="bg-rose-950/80 border border-rose-500/60 text-rose-200 px-4 py-2.5 rounded-2xl mb-3 font-bold text-xs flex items-center justify-between shadow-lg animate-in slide-in-from-top-2">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span>ATENCIÓN COCINA: Se han cancelado {canceladas.length} órdenes enviadas:</span>
          </span>
          <span className="font-mono text-amber-300 font-black">
            {canceladas.map(c => `${c.folio} (${c.mesa ? `Mesa ${c.mesa}` : c.tipo})`).join(' · ')}
          </span>
        </div>
      )}

      {/* Grid of Kitchen Tickets */}
      <div className="flex-1 overflow-y-auto p-1 bg-slate-950 rounded-2xl">
        {loading && pendientes.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 font-bold text-base">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
              <span>Cargando monitor de cocina...</span>
            </div>
          </div>
        ) : pendientes.length === 0 && (!verImpresas || impresas.length === 0) ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 font-bold text-base gap-2 p-8">
            <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mb-2">
              <PizzaIcon className="w-9 h-9" />
            </div>
            <span className="text-xl font-black text-slate-300">TODO AL DÍA EN COCINA</span>
            <span className="text-xs font-normal text-slate-500">
              No hay comandas pendientes en este momento. Las nuevas órdenes sonarán automáticamente.
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {/* Unprinted pending command cards */}
            {pendientes.map(orden => (
              <div
                key={orden.id}
                onClick={() => handleImprimir(orden.id)}
                className="bg-slate-900 rounded-2xl border border-slate-800 hover:border-amber-400/80 shadow-2xl flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.01] overflow-hidden"
              >
                <div>
                  {/* Card Title */}
                  <div className="bg-slate-800/90 px-3.5 py-2.5 flex items-center justify-between border-b border-slate-700/60">
                    <div>
                      <span className="text-2xl font-black font-mono text-white block leading-none tracking-tight">
                        {orden.folio}
                      </span>
                      <span className="text-xs font-black mt-1 inline-block uppercase">
                        {orden.tipo === 'local' ? (
                          <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-md">
                            MESA: {orden.mesa || 'S/M'}
                          </span>
                        ) : orden.tipo === 'llevar' ? (
                          <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-md">
                            LLEVAR {orden.mesa ? `(${orden.mesa})` : ''}
                          </span>
                        ) : orden.tipo === 'domicilio' ? (
                          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                            DOMICILIO
                          </span>
                        ) : (
                          <span className="bg-slate-700 text-slate-200 px-2 py-0.5 rounded-md">
                            {orden.tipo.toUpperCase()}
                          </span>
                        )}
                      </span>
                    </div>

                    <span className="text-xs font-mono text-slate-400 text-right font-bold">
                      {new Date(orden.fechaCreacion).toLocaleTimeString('es-MX', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {orden.cliente && (
                    <div className="px-3.5 py-1.5 bg-slate-800/50 border-b border-slate-800 text-xs text-slate-300 font-medium">
                      Cliente: <strong className="text-white">{orden.cliente.nombre}</strong>
                      {orden.cliente.direccion && (
                        <span className="block text-[11px] text-slate-400 truncate mt-0.5">
                          {orden.cliente.direccion}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Items list */}
                  <div className="p-3.5 space-y-2.5">
                    {orden.items.map((it, idx) => (
                      <div key={idx} className="border-b border-slate-800/80 pb-2 last:border-b-0">
                        <div className="flex items-baseline justify-between text-base font-black text-white">
                          <span className="flex items-baseline gap-2">
                            <span className="text-amber-400 font-mono text-lg">{it.cantidad}×</span>
                            <span>{it.nombre}</span>
                          </span>
                          {it.tamano && (
                            <span className="text-xs font-black bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-md">
                              {it.tamano}
                            </span>
                          )}
                        </div>

                        {it.masa && (
                          <div className="text-xs font-bold text-slate-400 mt-0.5 pl-6">
                            Masa: <span className="text-slate-200">{it.masa}</span>
                          </div>
                        )}

                        {it.notas && (
                          <div className="mt-1.5 ml-6 p-1.5 bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs font-black rounded-lg">
                            ► {it.notas.toUpperCase()}
                          </div>
                        )}
                      </div>
                    ))}

                    {orden.comentarios && (
                      <div className="p-2 bg-blue-950/40 border border-blue-500/30 text-blue-300 text-xs font-black rounded-xl mt-2">
                        OBSERVACIÓN GENERAL: {orden.comentarios}
                      </div>
                    )}
                  </div>
                </div>

                {/* Print button bar */}
                <div className="p-2.5 bg-slate-950/80 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation()
                      handleImprimir(orden.id)
                    }}
                    className="w-full py-3.5 rounded-xl text-sm font-black tracking-wide text-white bg-emerald-600 hover:bg-emerald-500 active:scale-98 shadow-lg shadow-emerald-950/50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckIcon className="w-4 h-4 stroke-[3]" />
                    <span>IMPRIMIR TICKET Y MARCAR LISTO</span>
                  </button>
                </div>
              </div>
            ))}

            {/* Printed recent commands */}
            {verImpresas &&
              impresas.map(orden => (
                <div
                  key={orden.id}
                  className="bg-slate-900/60 rounded-2xl border border-slate-800 opacity-60 hover:opacity-100 flex flex-col justify-between transition-opacity"
                >
                  <div>
                    <div className="bg-slate-800/60 px-3.5 py-2 flex justify-between items-center rounded-t-2xl border-b border-slate-800">
                      <div>
                        <span className="text-lg font-bold font-mono text-slate-300">{orden.folio}</span>
                        <span className="text-xs text-slate-400 block font-medium">
                          {orden.tipo.toUpperCase()} {orden.mesa ? `· Mesa ${orden.mesa}` : ''}
                        </span>
                      </div>
                      <span className="text-[10px] font-black bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-md">
                        IMPRESO
                      </span>
                    </div>

                    <div className="p-3 text-xs space-y-1 text-slate-400">
                      {orden.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span>
                            {it.cantidad}× {it.nombre}
                          </span>
                          {it.tamano && <span className="font-bold">{it.tamano}</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => handleImprimir(orden.id)}
                      className="w-full py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    >
                      REIMPRIMIR TICKET
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
