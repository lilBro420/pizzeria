import React, { useState } from 'react'
import { Configuracion, NotaRapida, PizzaMasa, PizzaTamano, Producto } from '../../types'
import { fmt } from '../../utils/formatters'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { VirtualKeyboard } from '../ui/VirtualKeyboard'

interface CustomizerModalProps {
  item: Producto
  isPizza: boolean
  config: Configuracion
  notasRapidas: NotaRapida[]
  initialQty?: number
  initialSize?: PizzaTamano
  initialDough?: PizzaMasa
  initialComments?: string
  onConfirm: (qty: number, size?: PizzaTamano | null, dough?: PizzaMasa | null, comments?: string | null) => void
  onClose: () => void
}

export function CustomizerModal({
  item,
  isPizza,
  config,
  notasRapidas,
  initialQty = 1,
  initialSize = 'Mediana',
  initialDough = 'Delgada',
  initialComments = '',
  onConfirm,
  onClose,
}: CustomizerModalProps) {
  const [qty, setQty] = useState(initialQty)
  const [size, setSize] = useState<PizzaTamano>(initialSize)
  const [dough, setDough] = useState<PizzaMasa>(initialDough)
  const [comments, setComments] = useState(initialComments)
  const [showKeyboard, setShowKeyboard] = useState(false)

  const SIZES: PizzaTamano[] = ['Chica', 'Mediana', 'Grande']
  const DOUGHS: PizzaMasa[] = ['Delgada', 'Gruesa', 'Orilla Rellena']

  const sizeExtra = isPizza ? config.extras[size] ?? 0 : 0
  const doughExtra = isPizza ? config.extras[dough] ?? 0 : 0
  const unitPrice = Math.max(0, item.precio + sizeExtra + doughExtra)
  const totalPrice = unitPrice * qty

  const handleToggleNotaRapida = (texto: string) => {
    if (comments.includes(texto)) {
      setComments(comments.replace(texto, '').replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '').trim())
    } else {
      setComments(comments ? `${comments}, ${texto}` : texto)
    }
  }

  return (
    <Dialog title={`PERSONALIZAR: ${item.nombre.toUpperCase()}`} isOpen={true} onClose={onClose} maxWidth="max-w-xl">
      <div className="flex flex-col gap-4 select-none">
        {/* Quantity selector */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 flex items-center justify-between shadow-sm">
          <div>
            <span className="font-extrabold text-base text-slate-800 uppercase tracking-wide block">
              Cantidad:
            </span>
            <span className="text-xs text-slate-500">Unidades a comanda</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="w-13 h-13 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-2xl font-black border border-slate-300 shadow-sm active:scale-95 transition-all flex items-center justify-center"
              onClick={() => setQty(Math.max(1, qty - 1))}
            >
              -
            </button>
            <span className="text-3xl font-black font-mono w-14 text-center text-slate-900">{qty}</span>
            <button
              type="button"
              className="w-13 h-13 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-2xl font-black border border-blue-300 shadow-sm active:scale-95 transition-all flex items-center justify-center"
              onClick={() => setQty(qty + 1)}
            >
              +
            </button>
          </div>
        </div>

        {/* Pizza Size & Dough Options */}
        {isPizza && (
          <div className="flex flex-col gap-3.5">
            {/* Live Selection Summary Pill */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 flex items-center justify-between text-blue-900 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Selección actual:</span>
              <span className="text-sm font-black flex items-center gap-2">
                <span className="bg-blue-600 text-white px-2 py-0.5 rounded-md text-xs">{size}</span>
                <span className="text-blue-400">•</span>
                <span className="bg-indigo-600 text-white px-2 py-0.5 rounded-md text-xs">{dough}</span>
              </span>
            </div>

            {/* Size Options */}
            <div>
              <div className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5 flex justify-between">
                <span>1. Tamaño de Pizza:</span>
                <span className="text-blue-600 font-black">Seleccionado: {size}</span>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {SIZES.map(s => {
                  const extra = config.extras[s] ?? 0
                  const isSel = size === s
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSize(s)}
                      className={`relative min-h-[58px] p-2.5 rounded-xl flex flex-col items-center justify-center transition-all active:scale-95 border-2 ${
                        isSel
                          ? 'bg-blue-600 text-white border-blue-700 shadow-md shadow-blue-500/25 ring-2 ring-blue-400/50'
                          : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {isSel && (
                        <span className="absolute top-1.5 right-1.5 bg-white text-blue-700 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                          ✓
                        </span>
                      )}
                      <span className="text-base font-black tracking-tight">{s}</span>
                      <span
                        className={`text-xs font-mono mt-0.5 font-bold ${
                          isSel ? 'text-blue-100' : 'text-slate-500'
                        }`}
                      >
                        {extra === 0 ? 'Normal' : extra > 0 ? `+$${extra}` : `-$${Math.abs(extra)}`}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Dough Options */}
            <div>
              <div className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5 flex justify-between">
                <span>2. Tipo de Masa:</span>
                <span className="text-indigo-600 font-black">Seleccionado: {dough}</span>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {DOUGHS.map(d => {
                  const extra = config.extras[d] ?? 0
                  const isSel = dough === d
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDough(d)}
                      className={`relative min-h-[58px] p-2.5 rounded-xl flex flex-col items-center justify-center transition-all active:scale-95 border-2 ${
                        isSel
                          ? 'bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-500/25 ring-2 ring-indigo-400/50'
                          : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {isSel && (
                        <span className="absolute top-1.5 right-1.5 bg-white text-indigo-700 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                          ✓
                        </span>
                      )}
                      <span className="text-sm font-black text-center leading-tight">{d}</span>
                      <span
                        className={`text-xs font-mono mt-0.5 font-bold ${
                          isSel ? 'text-indigo-100' : 'text-slate-500'
                        }`}
                      >
                        {extra > 0 ? `+$${extra}` : 'Normal'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Quick Kitchen Notes */}
        <div>
          <div className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
            Comentarios Rápidos para Cocina:
          </div>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-white rounded-xl border border-slate-200 shadow-inner">
            {notasRapidas.map(nr => {
              const active = comments.includes(nr.texto)
              return (
                <button
                  key={nr.id}
                  type="button"
                  onClick={() => handleToggleNotaRapida(nr.texto)}
                  className={`px-3 py-2 text-xs font-bold rounded-lg select-none transition-all active:scale-95 ${
                    active
                      ? 'bg-slate-900 text-white shadow-sm ring-2 ring-slate-700'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  {active ? `✓ ${nr.texto}` : nr.texto}
                </button>
              )
            })}
          </div>
        </div>

        {/* Free text comments */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              Notas Adicionales:
            </span>
            <button
              type="button"
              onClick={() => setShowKeyboard(!showKeyboard)}
              className="text-xs font-black text-blue-600 hover:underline uppercase"
            >
              {showKeyboard ? 'Ocultar teclado' : 'Abrir teclado táctil'}
            </button>
          </div>
          <input
            type="text"
            value={comments}
            onChange={e => setComments(e.target.value)}
            onFocus={() => setShowKeyboard(true)}
            placeholder="Ej. Salsa picante aparte, partir en 8 rebanadas..."
            className="w-full h-12 px-3.5 text-base font-medium bg-white rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 shadow-sm"
          />
        </div>

        {/* Virtual Keyboard */}
        {showKeyboard && (
          <div className="pt-2 border-t border-slate-200">
            <VirtualKeyboard value={comments} onChange={setComments} />
          </div>
        )}

        {/* Price Summary & Confirm */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total a Comanda:</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-blue-700">{fmt(totalPrice)}</span>
              {qty > 1 && (
                <span className="text-xs font-mono text-slate-500 font-bold">
                  ({fmt(unitPrice)} c/u)
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button size="lg" variant="default" onClick={onClose}>
              CANCELAR
            </Button>
            <Button
              size="lg"
              variant="success"
              onClick={() => {
                onConfirm(
                  qty,
                  isPizza ? size : null,
                  isPizza ? dough : null,
                  comments.trim() || null
                )
              }}
              className="px-6 text-base font-black shadow-md shadow-emerald-500/20"
            >
              AGREGAR A COMANDA
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
