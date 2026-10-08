import React, { useState } from 'react'
import { Orden, TipoOrden } from '../../types'
import { fmt, formatFecha } from '../../utils/formatters'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'

interface PendingAccountsModalProps {
  ordenes: Orden[]
  onClose: () => void
  onPayOrder: (orden: Orden) => void
  onCancelOrder?: (orden: Orden) => void
}

export function PendingAccountsModal({
  ordenes,
  onClose,
  onPayOrder,
  onCancelOrder,
}: PendingAccountsModalProps) {
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')

  const pendientes = ordenes.filter(o => o.estado === 'abierta')
  const filtradas = pendientes.filter(o => {
    if (filtroTipo === 'todos') return true
    return o.tipo === filtroTipo
  })

  return (
    <Dialog title={`CUENTAS EN ESPERA (${pendientes.length} ACTIVAS)`} isOpen={true} onClose={onClose} maxWidth="max-w-5xl">
      <div className="flex flex-col gap-3 h-[75vh] select-none">
        {/* Filters bar */}
        <div className="flex gap-2 shrink-0">
          {[
            { id: 'todos', label: `TODAS (${pendientes.length})` },
            { id: 'local', label: 'COMER AQUÍ' },
            { id: 'llevar', label: 'PARA LLEVAR' },
            { id: 'recoger', label: 'RECOGER' },
            { id: 'domicilio', label: 'DOMICILIO' },
          ].map(f => (
            <Button
              key={f.id}
              size="sm"
              variant={filtroTipo === f.id ? 'primary' : 'default'}
              onClick={() => setFiltroTipo(f.id)}
              className="font-bold text-xs"
            >
              {f.label}
            </Button>
          ))}
        </div>

        {/* Orders list */}
        <div className="flex-1 overflow-y-auto swing-inset bg-[#ECE9D8] p-2">
          {filtradas.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 font-bold text-lg">
              No hay cuentas en espera en esta sección.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtradas.map(orden => (
                <div
                  key={orden.id}
                  className="swing-outset bg-white p-3 flex flex-col justify-between border-2 border-black"
                >
                  <div>
                    {/* Header: Folio & Tipo */}
                    <div className="flex justify-between items-start pb-2 border-b border-[#808080]">
                      <div>
                        <span className="text-xl font-black font-mono text-[#0A246A] block">
                          {orden.folio}
                        </span>
                        <span className="text-xs font-bold text-gray-600 uppercase">
                          {orden.tipo === 'local'
                            ? `MESA: ${orden.mesa || 'S/M'}`
                            : orden.tipo === 'llevar'
                            ? `LLEVAR ${orden.mesa ? `(${orden.mesa})` : ''}`
                            : orden.tipo.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-xs font-bold bg-[#FFF9C4] text-[#F57F17] px-2 py-0.5 border border-[#FBC02D]">
                        EN ESPERA
                      </span>
                    </div>

                    {/* Client info if delivery / pickup */}
                    {orden.cliente && (
                      <div className="py-1.5 text-xs border-b border-gray-200">
                        <div className="font-extrabold text-black">{orden.cliente.nombre}</div>
                        <div className="font-mono text-gray-600">{orden.cliente.celular}</div>
                        {orden.cliente.direccion && (
                          <div className="text-gray-700 truncate">{orden.cliente.direccion}</div>
                        )}
                      </div>
                    )}

                    {/* Items summary */}
                    <div className="py-2 text-xs font-medium space-y-1 max-h-28 overflow-y-auto">
                      {orden.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between items-center text-gray-800">
                          <span className="truncate pr-1">
                            {it.cantidad}× {it.nombre} {it.tamano ? `(${it.tamano})` : ''}
                          </span>
                          <span className="font-mono font-bold text-black shrink-0">
                            {fmt(it.precioFinal * it.cantidad)}
                          </span>
                        </div>
                      ))}
                      {orden.comentarios && (
                        <div className="text-[11px] font-bold text-blue-900 bg-blue-50 p-1 mt-1 border border-blue-200">
                          Nota: {orden.comentarios}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer & Pay button */}
                  <div className="pt-2 border-t border-[#808080] flex flex-col gap-2 mt-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-gray-600 font-bold">Total a Cobrar:</span>
                      <span className="text-2xl font-black font-mono text-[#0A246A]">
                        {fmt(orden.total)}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      {onCancelOrder && (
                        <Button
                          size="md"
                          variant="danger"
                          onClick={() => onCancelOrder(orden)}
                          className="text-xs font-bold px-2"
                        >
                          ANULAR
                        </Button>
                      )}
                      <Button
                        size="md"
                        variant="success"
                        onClick={() => onPayOrder(orden)}
                        className="flex-1 text-base font-black tracking-wider"
                      >
                        PAGAR CUENTA
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom actions */}
        <div className="flex justify-end pt-2 border-t border-[#808080]">
          <Button size="lg" variant="default" onClick={onClose} className="px-8 font-bold">
            VOLVER AL POS
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
