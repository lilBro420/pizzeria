import React, { useState } from 'react'
import { Orden } from '../../types'
import { fmt, formatFecha } from '../../utils/formatters'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { PizzaIcon } from '../ui/Icons'

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
      <div className="flex flex-col gap-3.5 h-[75vh] select-none">
        {/* Filters bar */}
        <div className="flex gap-2 shrink-0 overflow-x-auto pb-1">
          {[
            { id: 'todos', label: `TODAS (${pendientes.length})` },
            { id: 'local', label: 'COMER AQUÍ' },
            { id: 'llevar', label: 'PARA LLEVAR' },
            { id: 'recoger', label: 'RECOGER' },
            { id: 'domicilio', label: 'DOMICILIO' },
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFiltroTipo(f.id)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all active:scale-95 border ${
                filtroTipo === f.id
                  ? 'bg-blue-600 text-white border-blue-700 shadow-sm shadow-blue-500/20'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Orders list */}
        <div className="flex-1 overflow-y-auto bg-slate-100 p-2 rounded-xl border border-slate-200">
          {filtradas.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 font-bold text-base p-6">
              <PizzaIcon className="w-12 h-12 text-slate-300 mb-2 stroke-[1.5]" />
              <span>No hay cuentas en espera en esta sección.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtradas.map(orden => (
                <div
                  key={orden.id}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
                >
                  <div>
                    {/* Header: Folio & Tipo */}
                    <div className="flex justify-between items-start pb-2.5 border-b border-slate-100">
                      <div>
                        <span className="text-xl font-black font-mono text-blue-700 block">
                          {orden.folio}
                        </span>
                        <span className="text-xs font-bold text-slate-500 uppercase">
                          {orden.tipo === 'local'
                            ? `MESA: ${orden.mesa || 'S/M'}`
                            : orden.tipo === 'llevar'
                            ? `LLEVAR ${orden.mesa ? `(${orden.mesa})` : ''}`
                            : orden.tipo.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-xs font-black bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full border border-amber-200">
                        EN ESPERA
                      </span>
                    </div>

                    {/* Client info if delivery / pickup */}
                    {orden.cliente && (
                      <div className="py-2 text-xs border-b border-slate-100">
                        <div className="font-black text-slate-900">{orden.cliente.nombre}</div>
                        <div className="font-mono text-slate-500">{orden.cliente.celular}</div>
                        {orden.cliente.direccion && (
                          <div className="text-slate-600 truncate mt-0.5">{orden.cliente.direccion}</div>
                        )}
                      </div>
                    )}

                    {/* Items summary */}
                    <div className="py-2.5 text-xs font-medium space-y-1.5 max-h-32 overflow-y-auto">
                      {orden.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between items-center text-slate-700">
                          <span className="truncate pr-2">
                            <strong>{it.cantidad}×</strong> {it.nombre} {it.tamano ? `(${it.tamano})` : ''}
                          </span>
                          <span className="font-mono font-bold text-slate-900 shrink-0">
                            {fmt(it.precioFinal * it.cantidad)}
                          </span>
                        </div>
                      ))}
                      {orden.comentarios && (
                        <div className="text-[11px] font-bold text-blue-900 bg-blue-50 p-1.5 rounded-lg border border-blue-200 mt-1">
                          Nota: {orden.comentarios}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer & Pay button */}
                  <div className="pt-2.5 border-t border-slate-100 flex flex-col gap-2.5 mt-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-slate-500 font-bold uppercase">Total a Cobrar:</span>
                      <span className="text-2xl font-black font-mono text-blue-700">
                        {fmt(orden.total)}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      {onCancelOrder && (
                        <button
                          type="button"
                          onClick={() => onCancelOrder(orden)}
                          className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs active:scale-95 transition-all"
                        >
                          ANULAR
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onPayOrder(orden)}
                        className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm tracking-wide shadow-sm shadow-emerald-500/20 active:scale-95 transition-all"
                      >
                        COBRAR CUENTA
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  )
}
