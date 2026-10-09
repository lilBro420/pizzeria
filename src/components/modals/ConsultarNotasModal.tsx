import React, { useEffect, useState } from 'react'
import { NotaRapida, Orden } from '../../types'
import { api } from '../../services/api'
import { fmt, formatFecha } from '../../utils/formatters'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { PrinterIcon } from '../ui/Icons'

interface ConsultarNotasModalProps {
  notasRapidas?: NotaRapida[]
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
      <div className="flex flex-col gap-3.5 h-[75vh] select-none">
        {/* Filters */}
        <div className="flex gap-2 items-center shrink-0">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por folio (#4001), mesa o cliente..."
            className="flex-1 h-11 px-3.5 text-sm bg-white rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-900"
          />

          <div className="flex gap-1">
            {[
              { id: 'todos', label: 'TODAS' },
              { id: 'cerrada', label: 'COBRADAS' },
              { id: 'abierta', label: 'EN ESPERA' },
              { id: 'cancelada', label: 'ANULADAS' },
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFiltroEstado(f.id)}
                className={`px-3 py-2 rounded-xl text-xs font-black transition-all border ${
                  filtroEstado === f.id
                    ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <Button size="sm" variant="default" onClick={loadData} className="h-11">
            ACTUALIZAR
          </Button>
        </div>

        {/* 2-pane layout: List on left, details on right */}
        <div className="flex-1 grid grid-cols-12 gap-3 min-h-0">
          {/* Order list */}
          <div className="col-span-6 bg-slate-100 rounded-xl border border-slate-200 overflow-y-auto p-2 flex flex-col gap-2">
            {loading ? (
              <div className="p-6 text-center text-xs text-slate-500 font-bold">Cargando notas...</div>
            ) : filtradas.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 font-bold">No se encontraron notas.</div>
            ) : (
              filtradas.map(o => (
                <div
                  key={o.id}
                  onClick={() => setSelectedOrder(o)}
                  className={`p-3 rounded-xl cursor-pointer flex justify-between items-center text-xs transition-all border ${
                    selectedOrder?.id === o.id
                      ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                      : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm">{o.folio}</span>
                      <span className="font-bold uppercase opacity-85">
                        {o.tipo} {o.mesa ? `· Mesa ${o.mesa}` : ''}
                      </span>
                    </div>
                    <div className="text-[11px] opacity-75 font-mono mt-0.5">
                      {formatFecha(o.fechaCreacion)} · Cajero: {o.cajero.nombre}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-black text-sm block">{fmt(o.total)}</span>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                        o.estado === 'cerrada'
                          ? selectedOrder?.id === o.id
                            ? 'bg-emerald-500 text-white'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : o.estado === 'abierta'
                          ? selectedOrder?.id === o.id
                            ? 'bg-amber-500 text-white'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                          : selectedOrder?.id === o.id
                          ? 'bg-rose-500 text-white'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {o.estado.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Ticket preview on right */}
          <div className="col-span-6 bg-white rounded-xl border border-slate-200 flex flex-col p-4 shadow-sm overflow-hidden">
            {selectedOrder ? (
              <div className="flex-1 flex flex-col justify-between overflow-y-auto">
                <div>
                  <div className="border-b border-slate-200 pb-3 mb-3 text-center">
                    <span className="text-base font-black text-slate-900 block">PIZZERÍA VOLCÁN</span>
                    <span className="text-xs font-mono text-slate-500 block">
                      Folio: {selectedOrder.folio} · {formatFecha(selectedOrder.fechaCreacion)}
                    </span>
                    <div className="text-xs font-bold text-slate-700 mt-1">
                      Tipo: {selectedOrder.tipo.toUpperCase()} {selectedOrder.mesa ? `(Mesa ${selectedOrder.mesa})` : ''}
                    </div>
                  </div>

                  {/* Items */}
                  <div className="space-y-2 py-2 border-b border-slate-200 text-xs">
                    {selectedOrder.items.map((it, idx) => (
                      <div key={idx} className="flex flex-col">
                        <div className="flex justify-between font-bold text-slate-900">
                          <span>
                            {it.cantidad}× {it.nombre}
                          </span>
                          <span className="font-mono">{fmt(it.precioFinal * it.cantidad)}</span>
                        </div>
                        {(it.tamano || it.masa) && (
                          <div className="text-[11px] text-slate-500">
                            {it.tamano ? `Tam: ${it.tamano}` : ''} {it.masa ? `· Masa: ${it.masa}` : ''}
                          </div>
                        )}
                        {it.notas && (
                          <div className="text-[11px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded mt-0.5">
                            Nota: {it.notas}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div className="py-2.5 border-b border-slate-200 text-xs space-y-1">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal:</span>
                      <span className="font-mono font-bold">{fmt(selectedOrder.subtotal)}</span>
                    </div>
                    {selectedOrder.descuento > 0 && (
                      <div className="flex justify-between text-rose-600 font-bold">
                        <span>Descuento:</span>
                        <span className="font-mono">-{fmt(selectedOrder.descuento)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-600">
                      <span>IVA (16% incl):</span>
                      <span className="font-mono">{fmt(selectedOrder.impuesto)}</span>
                    </div>
                    <div className="flex justify-between text-base font-black text-slate-900 pt-1">
                      <span>TOTAL:</span>
                      <span className="font-mono text-blue-700">{fmt(selectedOrder.total)}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 flex gap-2">
                  <Button
                    size="md"
                    variant="default"
                    onClick={() => alert(`Reimprimiendo ticket ${selectedOrder.folio}...`)}
                    className="flex-1 text-xs font-black flex items-center justify-center gap-1.5"
                  >
                    <PrinterIcon className="w-4 h-4" />
                    <span>REIMPRIMIR TICKET</span>
                  </Button>
                  {selectedOrder.estado === 'abierta' && onCancelOrder && (
                    <Button
                      size="md"
                      variant="danger"
                      onClick={() => onCancelOrder(selectedOrder)}
                      className="text-xs font-black"
                    >
                      ANULAR
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 font-bold text-xs">
                Selecciona una orden a la izquierda para ver su detalle.
              </div>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  )
}
