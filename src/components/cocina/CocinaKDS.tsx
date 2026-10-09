import React, { useEffect, useRef, useState } from 'react'
import { Orden, UsuarioActual } from '../../types'
import { api } from '../../services/api'
import { notifications } from '../../services/notifications'
import { Button } from '../ui/Button'
import { BellIcon } from '../ui/Icons'

interface CocinaKDSProps {
  usuario: UsuarioActual
  onBack: () => void
}

export function CocinaKDS({ usuario, onBack }: CocinaKDSProps) {
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
    <div className="min-h-[100dvh] lg:h-screen w-full flex flex-col bg-[#2A3439] select-none text-white overflow-y-auto lg:overflow-hidden p-2">
      {/* KDS Top Bar */}
      <div className="bg-[#1C2327] px-3 sm:px-4 py-2 flex items-center justify-between border-2 border-black swing-outset shrink-0 mb-2 gap-2 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button size="sm" variant="default" onClick={onBack} className="text-xs font-bold py-1">
            ← VOLVER AL POS
          </Button>
          <span className="text-base sm:text-xl font-black tracking-wider text-yellow-400">
            MONITOR DE COCINA (KDS)
          </span>
          <span className="text-xs text-gray-400 font-mono hidden md:inline">
            {usuario.nombre} ({usuario.rol.toUpperCase()})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Botón para probar / desbloquear campana de cocina */}
          <button
            type="button"
            onClick={handleTestCampana}
            className="bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 px-2.5 py-1 rounded-lg font-black text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            title="Toca para probar o activar el sonido de la campana de cocina"
          >
            <BellIcon className="w-3.5 h-3.5 fill-current" />
            <span>PROBAR CAMPANA</span>
          </button>

          <span className="text-xs font-bold bg-[#E65100] px-2.5 sm:px-3 py-1 text-white border border-[#FF9800]">
            {pendientes.length} PENDIENTES
          </span>

          <Button
            size="sm"
            variant={verImpresas ? 'primary' : 'default'}
            onClick={() => setVerImpresas(!verImpresas)}
            className="text-xs font-bold py-1"
          >
            {verImpresas ? 'OCULTAR IMPRESAS' : 'VER IMPRESAS'}
          </Button>
        </div>
      </div>

      {/* Cancelled warnings bar */}
      {canceladas.length > 0 && (
        <div className="bg-[#B71C1C] text-white p-2 mb-2 swing-inset font-bold text-xs flex items-center justify-between">
          <span>
            ATENCIÓN COCINA: Se han cancelado {canceladas.length} órdenes que ya se habían enviado:
          </span>
          <span className="font-mono text-yellow-300">
            {canceladas.map(c => `${c.folio} (${c.mesa ? `Mesa ${c.mesa}` : c.tipo})`).join(' · ')}
          </span>
        </div>
      )}

      {/* Grid of Kitchen Tickets */}
      <div className="flex-1 overflow-y-auto p-2 bg-[#1E2529] swing-inset">
        {loading && pendientes.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400 font-bold text-lg">
            Cargando monitor de cocina...
          </div>
        ) : pendientes.length === 0 && (!verImpresas || impresas.length === 0) ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 font-bold text-xl gap-2">
            <span>TODO AL DÍA EN COCINA</span>
            <span className="text-sm font-normal text-gray-400">
              No hay comandas pendientes en este momento.
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {/* Unprinted pending command cards */}
            {pendientes.map(orden => (
              <div
                key={orden.id}
                onClick={() => handleImprimir(orden.id)}
                className="bg-white text-black swing-outset border-2 border-black flex flex-col justify-between cursor-pointer hover:border-yellow-400 transition-none"
              >
                <div>
                  {/* Card Title */}
                  <div className="bg-[#0A246A] text-white p-2 flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-black font-mono block leading-none">
                        {orden.folio}
                      </span>
                      <span className="text-xs font-bold text-yellow-300 uppercase">
                        {orden.tipo === 'local'
                          ? `MESA: ${orden.mesa || 'S/M'}`
                          : orden.tipo === 'llevar'
                          ? `LLEVAR ${orden.mesa ? `(${orden.mesa})` : ''}`
                          : orden.tipo.toUpperCase()}
                      </span>
                    </div>

                    <span className="text-[11px] font-mono text-gray-200 text-right">
                      {new Date(orden.fechaCreacion).toLocaleTimeString('es-MX', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {orden.cliente && (
                    <div className="px-3 py-1 bg-gray-100 border-b border-gray-300 text-xs font-bold text-gray-800">
                      Cliente: {orden.cliente.nombre}
                    </div>
                  )}

                  {/* Items list */}
                  <div className="p-3 space-y-2.5">
                    {orden.items.map((it, idx) => (
                      <div key={idx} className="border-b border-gray-200 pb-2">
                        <div className="flex items-baseline justify-between text-base font-extrabold text-black">
                          <span>
                            {it.cantidad}× {it.nombre}
                          </span>
                          {it.tamano && (
                            <span className="text-xs font-bold text-gray-700 bg-gray-200 px-1">
                              {it.tamano}
                            </span>
                          )}
                        </div>

                        {it.masa && (
                          <div className="text-xs font-bold text-gray-600">
                            Masa: {it.masa}
                          </div>
                        )}

                        {it.notas && (
                          <div className="mt-1 p-1 bg-[#FFF9C4] border border-[#FBC02D] text-[#B71C1C] text-xs font-black">
                            ► {it.notas.toUpperCase()}
                          </div>
                        )}
                      </div>
                    ))}

                    {orden.comentarios && (
                      <div className="p-1.5 bg-[#E1F5FE] border border-[#0288D1] text-[#01579B] text-xs font-black mt-2">
                        OBSERVACIÓN GENERAL: {orden.comentarios}
                      </div>
                    )}
                  </div>
                </div>

                {/* Print button bar */}
                <div className="p-2 bg-[#E1E1E1] border-t-2 border-black">
                  <Button
                    size="md"
                    variant="success"
                    onClick={e => {
                      e.stopPropagation()
                      handleImprimir(orden.id)
                    }}
                    className="w-full text-sm font-black tracking-wider py-3"
                  >
                    IMPRIMIR TICKET Y MARCAR LISTO
                  </Button>
                </div>
              </div>
            ))}

            {/* Printed recent commands */}
            {verImpresas &&
              impresas.map(orden => (
                <div
                  key={orden.id}
                  className="bg-[#ECE9D8] text-gray-700 swing-outset border-2 border-gray-500 opacity-70 flex flex-col justify-between"
                >
                  <div>
                    <div className="bg-[#607D8B] text-white p-2 flex justify-between items-center">
                      <div>
                        <span className="text-xl font-bold font-mono">{orden.folio}</span>
                        <span className="text-xs block">
                          {orden.tipo.toUpperCase()} {orden.mesa ? `· Mesa ${orden.mesa}` : ''}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold bg-gray-700 px-2 py-0.5">IMPRESO</span>
                    </div>

                    <div className="p-3 text-xs space-y-1">
                      {orden.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span>
                            {it.cantidad}× {it.nombre}
                          </span>
                          {it.tamano && <span>{it.tamano}</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-2 border-t border-gray-400">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleImprimir(orden.id)}
                      className="w-full text-xs font-bold"
                    >
                      REIMPRIMIR TICKET
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
