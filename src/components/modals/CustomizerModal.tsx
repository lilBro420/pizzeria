import { useState } from 'react'
import { MenuItem, PizzaSize, PizzaDough } from '../../types'
import { SIZES, DOUGHS, SIZE_EXTRA } from '../../data/menu'
import { fmt, unitPrice } from '../../utils/formatters'
import { Minus, Plus, MessageSquare, X } from 'lucide-react'

interface CustomizerModalProps {
  item: MenuItem
  initialQty?: number
  initialSize?: PizzaSize
  initialDough?: PizzaDough
  initialComments?: string
  onConfirm: (qty: number, size?: PizzaSize, dough?: PizzaDough, comments?: string) => void
  onClose: () => void
}

export function CustomizerModal({ 
  item, 
  initialQty = 1,
  initialSize = 'Mediana',
  initialDough = 'Delgada',
  initialComments = '',
  onConfirm, 
  onClose 
}: CustomizerModalProps) {
  const isPizza = item.category === 'pizzas'
  const [qty, setQty] = useState(initialQty)
  const [size, setSize] = useState<PizzaSize>(initialSize)
  const [dough, setDough] = useState<PizzaDough>(initialDough)
  const [comments, setComments] = useState(initialComments)
  
  const unitPriceCalc = isPizza ? unitPrice(item, size, dough) : item.basePrice
  const total = unitPriceCalc * qty

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative z-50 w-full max-w-sm mx-4 max-h-[90vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: '#1a1a2e', border: '1.5px solid #2d2d4a' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-4 border-b shrink-0" style={{ borderColor: '#2d2d4a' }}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-3xl mb-1">{item.emoji}</div>
              <h2 className="text-white font-black text-xl tracking-tight">Agregar {item.name}</h2>
              <p className="text-gray-400 text-sm mt-0.5">{item.desc}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#2d2d4a transparent' }}>
          
          <div className="flex items-center justify-between bg-[#12122a] p-3 rounded-2xl">
            <span className="text-gray-400 font-bold uppercase text-xs tracking-widest pl-2">Cantidad</span>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="w-10 h-10 rounded-xl bg-[#2d2d4a] hover:bg-[#3d3d6a] flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <Minus size={18} />
              </button>
              <span className="text-2xl font-black font-mono text-white w-6 text-center">{qty}</span>
              <button 
                onClick={() => setQty(qty + 1)}
                className="w-10 h-10 rounded-xl bg-[#C41E3A] hover:bg-red-600 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          {isPizza && (
            <>
              <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2.5">Tamaño</div>
                <div className="grid grid-cols-3 gap-2">
                  {SIZES.map(s => {
                    const extra = SIZE_EXTRA[s]
                    return (
                      <button
                        key={s}
                        onClick={() => setSize(s)}
                        className={`py-3 rounded-2xl text-sm font-bold transition-all cursor-pointer flex flex-col items-center gap-1 ${
                          size === s
                            ? 'bg-[#C41E3A] text-white shadow-lg shadow-red-900/30'
                            : 'bg-white/8 text-gray-300 hover:bg-white/15 border border-white/10'
                        }`}
                      >
                        <span>{s}</span>
                        <span className={`text-[10px] font-mono ${size === s ? 'text-red-200' : 'text-gray-500'}`}>
                          {extra === 0 ? 'base' : extra > 0 ? `+$${extra}` : `-$${Math.abs(extra)}`}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2.5">Masa</div>
                <div className="grid grid-cols-3 gap-2">
                  {DOUGHS.map(d => (
                    <button
                      key={d}
                      onClick={() => setDough(d)}
                      className={`py-3 px-2 rounded-2xl text-xs font-bold transition-all cursor-pointer text-center leading-tight ${
                        dough === d
                          ? 'bg-[#C41E3A] text-white shadow-lg shadow-red-900/30'
                          : 'bg-white/8 text-gray-300 hover:bg-white/15 border border-white/10'
                      }`}
                    >
                      {d}
                      {d === 'Orilla Rellena' && (
                        <span className={`block text-[10px] font-mono mt-0.5 ${dough === d ? 'text-red-200' : 'text-gray-500'}`}>
                          +$20
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
              <MessageSquare size={14} /> Notas para cocina
            </div>
            <textarea
              value={comments}
              onChange={e => setComments(e.target.value)}
              placeholder="Ej: Sin cebolla, aderezo aparte..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500/50 resize-none h-20 transition-colors"
            />
          </div>
        </div>

        <div className="px-6 py-5 shrink-0 border-t" style={{ borderColor: '#2d2d4a' }}>
          <button
            onClick={() => onConfirm(qty, isPizza ? size : undefined, isPizza ? dough : undefined, comments)}
            className="w-full py-4 rounded-2xl font-black text-white text-base uppercase tracking-wide transition-all cursor-pointer flex justify-between px-6 items-center"
            style={{ background: '#C41E3A', boxShadow: '0 6px 24px rgba(196,30,58,0.45)' }}
          >
            <span>Agregar</span>
            <span className="font-mono">{fmt(total)}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
