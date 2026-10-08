import React, { useEffect, useState } from 'react'
import { Orden } from '../../types'
import { api } from '../../services/api'
import { fmt, formatFecha } from '../../utils/formatters'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'

interface ConsultarNotasModalProps {
  onClose: () => void
  onCancelOrder?: (orden: Orden) => void
}

export function ConsultarNotasModal({ onClose, onCancelOrder }: ConsultarNotasModalProps) {
  const [ordenes, setOrdenes] = useState<Orden[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Orden | null>(null)
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await api.getOrdenes({ limit: 100 })
      setOrdenes(data)
      if (data.length > 0 && !selectedOrder) setSelectedOrder(data[0])
    } catch (err: any) {
      alert(`Error al cargar órdenes: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filtradas = ordenes.filter(o => {
    if (filtroEstado !== 'todos' && o.estado !== filtroEstado) return false
    if (!search) return true
    const term = search.toLowerCase()
    return (
      o.folio.toLowerCase().includes(term) ||
      (o.mesa && o.mesa.toLowerCase().includes(term)) ||
      (o.cliente && o.cliente.nombre.toLowerCase().includes(term)) ||
      (o.cliente && o.cliente.celular.includes(term))
    )
  })

  return (
    <Dialog title="CONSULTA DE NOTAS Y CUENTAS" isOpen={true} onClose={onClose} maxWidth="max-w-5xl">
      <div className="flex flex-col gap-3 h-[75vh] select-none">
        {/* Filters */}
        <div className="flex gap-2 items-center shrink-0">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por folio (#4001), mesa o cliente..."
            className="flex-1 h-10 px-3 text-sm bg-white swing-inset outline-none font-bold"
          />

          <div className="flex gap-1">
            {[
              { id: 'todos', label: 'TODAS' },
              { id: 'cerrada', label: 'COBRADAS' },
              { id: 'abierta', label: 'EN ESPERA' },
              { id: 'cancelada', label: 'ANULADAS' },
            ].map(f => (
              <Button
                key={f.id}
                size="sm"
                variant={filtroEstado === f.id ? 'primary' : 'default'}
                onClick={() => setFiltroEstado(f.id)}
                className="text-xs font-bold"
              >
                {f.label}
              </Button>
            ))}
          </div>

          <Button size="sm" variant="default" onClick={loadData} className="text-xs font-bold">
            ACTUALIZAR
          </Button>
        </div>

        {/* 2-pane layout: List on left, details on right */}
        <div className="flex-1 grid grid-cols-12 gap-3 min-h-0">
          {/* Order list */}
          <div className="col-span-6 swing-inset bg-white overflow-y-auto p-1.5 flex flex-col gap-1.5">
            {loading ? (
              <div className="p-4 text-center text-xs text-gray-500 font-bold">Cargando notas...</div>
            ) : filtradas.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-500 font-bold">No se encontraron notas.</div>
            ) : (
              filtradas.map(o => (
                <div
                  key={o.id}
                  onClick={() => setSelectedOrder(o)}
                  className={`p-2.5 swing-outset-thin cursor-pointer flex justify-between items-center text-xs ${
                    selectedOrder?.id === o.id ? 'bg-[#0A246A] text-white' : 'bg-[#ECE9D8] text-black'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm">{o.folio}</span>
                      <span className="font-bold uppercase opacity-80">
                        {o.tipo} {o.mesa ? `· Mesa ${o.mesa}` : ''}
                      </span>
                    </div>
                    <div className="text-[11px] opacity-75 font-mono">
                      {formatFecha(o.fechaCreacion)} · Cajero: {o.cajero.nombre}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-black text-sm block">{fmt(o.total)}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 border ${
                        o.estado === 'cerrada'
                          ? 'bg-green-100 text-green-900 border-green-400'
                          : o.estado === 'abierta'
                          ? 'bg-amber-100 text-amber-900 border-amber-400'
                          : 'bg-red-100 text-red-900 border-red-400'
                      }`}
                    >
                      {o.estado.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Selected Order Detail */}
          <div className="col-span-6 swing-inset bg-white p-3 flex flex-col justify-between overflow-hidden">
            {selectedOrder ? (
              <div className="flex flex-col h-full justify-between">
                <div>
                  <div className="pb-2 border-b border-[#808080] flex justify-between items-start">
                    <div>
                      <span className="text-2xl font-black font-mono text-[#0A246A] block">
                        {selectedOrder.folio}
                      </span>
                      <span className="text-xs font-bold text-gray-700">
                        Tipo: {selectedOrder.tipo.toUpperCase()}
                        {selectedOrder.mesa ? ` · Mesa ${selectedOrder.mesa}` : ''}
                      </span>
                    </div>
                    <div className="text-right text-xs">
                      <span className="text-gray-500 block">Fecha y Hora:</span>
                      <span className="font-mono font-bold text-black">
                        {formatFecha(selectedOrder.fechaCreacion)}
                      </span>
                    </div>
                  </div>

                  {selectedOrder.cliente && (
                    <div className="py-2 border-b border-gray-200 text-xs">
                      <span className="text-gray-500 block font-bold">Cliente:</span>
                      <span className="font-bold text-black">{selectedOrder.cliente.nombre}</span>
                      <span className="font-mono text-gray-600 block">{selectedOrder.cliente.celular}</span>
                      {selectedOrder.cliente.direccion && (
                        <span className="text-gray-700 block">{selectedOrder.cliente.direccion}</span>
                      )}
                    </div>
                  )}

                  {/* Items */}
                  <div className="py-2 overflow-y-auto max-h-48 space-y-1 text-xs">
                    {selectedOrder.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between items-baseline border-b border-gray-100 pb-1">
                        <div>
                          <span className="font-bold text-black">
                            {it.cantidad}× {it.nombre}
                          </span>
                          {it.tamano && <span className="text-[11px] text-gray-600"> ({it.tamano}, {it.masa})</span>}
                          {it.notas && <span className="text-[10px] text-blue-900 block">Nota: {it.notas}</span>}
                        </div>
                        <span className="font-mono font-bold text-black">
                          {fmt(it.precioFinal * it.cantidad)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals & actions */}
                <div className="pt-2 border-t border-[#808080]">
                  <div className="space-y-1 text-xs text-gray-700 mb-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-mono font-bold">{fmt(selectedOrder.subtotal)}</span>
                    </div>
                    {selectedOrder.descuento > 0 && (
                      <div className="flex justify-between text-red-700">
                        <span>Descuento ({selectedOrder.descuentoPct}%):</span>
                        <span className="font-mono font-bold">-{fmt(selectedOrder.descuento)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-black text-black pt-1 border-t border-gray-300">
                      <span>TOTAL:</span>
                      <span className="font-mono text-xl text-[#0A246A]">{fmt(selectedOrder.total)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="md"
                      variant="default"
                      onClick={() => alert(`Imprimiendo ticket para ${selectedOrder.folio}...`)}
                      className="flex-1 font-bold text-xs"
                    >
                      REIMPRIMIR TICKET
                    </Button>

                    {selectedOrder.estado !== 'cancelada' && onCancelOrder && (
                      <Button
                        size="md"
                        variant="danger"
                        onClick={() => {
                          onCancelOrder(selectedOrder)
                          onClose()
                        }}
                        className="font-bold text-xs px-3"
                      >
                        ANULAR ORDEN
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 font-bold text-sm">
                Selecciona una orden de la lista para ver su detalle.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-[#808080]">
          <Button size="md" variant="default" onClick={onClose} className="px-8 font-bold">
            CERRAR
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
