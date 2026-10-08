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
    <Dialog title={`Personalizar: ${item.nombre.toUpperCase()}`} isOpen={true} onClose={onClose} maxWidth="max-w-xl">
      <div className="flex flex-col gap-4 select-none">
        {/* Quantity selector */}
        <div className="swing-inset bg-white p-3 flex items-center justify-between">
          <span className="font-bold text-base text-gray-800 uppercase tracking-wide">Cantidad:</span>
          <div className="flex items-center gap-3">
            <Button
              size="lg"
              variant="default"
              className="w-14 h-14 text-2xl font-black"
              onClick={() => setQty(Math.max(1, qty - 1))}
            >
              -
            </Button>
            <span className="text-3xl font-black font-mono w-12 text-center text-black">{qty}</span>
            <Button
              size="lg"
              variant="default"
              className="w-14 h-14 text-2xl font-black"
              onClick={() => setQty(qty + 1)}
            >
              +
            </Button>
          </div>
        </div>

        {/* Pizza Size & Dough Options */}
        {isPizza && (
          <div className="flex flex-col gap-3">
            <div>
              <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Tamaño de Pizza:
              </div>
              <div className="grid grid-cols-3 gap-2">
                {SIZES.map(s => {
                  const extra = config.extras[s] ?? 0
                  const isSel = size === s
                  return (
                    <Button
                      key={s}
                      size="lg"
                      variant={isSel ? 'primary' : 'default'}
                      onClick={() => setSize(s)}
                      className="flex flex-col items-center justify-center py-2"
                    >
                      <span className="text-base font-extrabold">{s}</span>
                      <span className="text-xs font-mono font-normal opacity-90">
                        {extra === 0 ? 'Normal' : extra > 0 ? `+$${extra}` : `-$${Math.abs(extra)}`}
                      </span>
                    </Button>
                  )
                })}
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Tipo de Masa:
              </div>
              <div className="grid grid-cols-3 gap-2">
                {DOUGHS.map(d => {
                  const extra = config.extras[d] ?? 0
                  const isSel = dough === d
                  return (
                    <Button
                      key={d}
                      size="lg"
                      variant={isSel ? 'primary' : 'default'}
                      onClick={() => setDough(d)}
                      className="flex flex-col items-center justify-center py-2"
                    >
                      <span className="text-sm font-extrabold text-center leading-tight">{d}</span>
                      {extra > 0 && (
                        <span className="text-xs font-mono font-normal opacity-90">
                          +${extra}
                        </span>
                      )}
                    </Button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Quick Kitchen Notes */}
        <div>
          <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            Comentarios Rápidos para Cocina:
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1.5 swing-inset bg-white">
            {notasRapidas.map(nr => {
              const active = comments.includes(nr.texto)
              return (
                <button
                  key={nr.id}
                  type="button"
                  onClick={() => handleToggleNotaRapida(nr.texto)}
                  className={`px-3 py-2 text-xs font-bold swing-button select-none ${
                    active ? 'bg-[#0A246A] text-white' : 'bg-[#E1E1E1] text-black'
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
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Notas Adicionales:
            </span>
            <Button
              size="sm"
              variant="default"
              className="text-xs py-1"
              onClick={() => setShowKeyboard(!showKeyboard)}
            >
              {showKeyboard ? 'Ocultar Teclado' : 'Abrir Teclado'}
            </Button>
          </div>
          <input
            type="text"
            value={comments}
            onChange={e => setComments(e.target.value)}
            placeholder="Escribe comentarios para cocina..."
            className="w-full h-11 px-3 text-base font-bold bg-white swing-inset outline-none text-black"
          />
        </div>

        {showKeyboard && (
          <VirtualKeyboard
            value={comments}
            onChange={setComments}
            onEnter={() => setShowKeyboard(false)}
            enterLabel="CERRAR TECLADO"
          />
        )}

        {/* Actions bar */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#808080]">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-gray-600 uppercase">Total Renglón:</span>
            <span className="text-2xl font-black font-mono text-[#0A246A]">{fmt(totalPrice)}</span>
          </div>

          <div className="flex gap-2">
            <Button size="lg" variant="default" onClick={onClose}>
              CANCELAR
            </Button>
            <Button
              size="lg"
              variant="success"
              onClick={() =>
                onConfirm(
                  qty,
                  isPizza ? size : null,
                  isPizza ? dough : null,
                  comments.trim() ? comments.trim() : null
                )
              }
              className="text-lg font-black tracking-wider px-6"
            >
              CONFIRMAR
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
