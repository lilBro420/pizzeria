import { useState } from 'react'
import { MenuItem, PizzaSize, PizzaDough } from '../../types'
import { SIZES, DOUGHS, SIZE_EXTRA } from '../../data/menu'
import { fmt, unitPrice } from '../../utils/formatters'

interface CustomizerModalProps {
  item: MenuItem
  onConfirm: (size: PizzaSize, dough: PizzaDough, price: number) => void
  onClose: () => void
}

export function CustomizerModal({ item, onConfirm, onClose }: CustomizerModalProps) {
  const [size, setSize] = useState<PizzaSize>('Mediana')
  const [dough, setDough] = useState<PizzaDough>('Delgada')
  const price = unitPrice(item, size, dough)

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative z-50 w-full max-w-sm mx-4 rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: '#1a1a2e', border: '1.5px solid #2d2d4a' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-4 border-b" style={{ borderColor: '#2d2d4a' }}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-3xl mb-1">{item.emoji}</div>
              <h2 className="text-white font-black text-xl tracking-tight">Personalizar {item.name}</h2>
              <p className="text-gray-400 text-sm mt-0.5">{item.desc}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
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

          <div className="flex items-center justify-between py-3 px-4 rounded-2xl" style={{ background: '#12122a' }}>
            <span className="text-gray-400 text-sm">{size} · {dough}</span>
            <span className="text-[#F5C518] font-black font-mono text-lg">{fmt(price)}</span>
          </div>
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={() => onConfirm(size, dough, price)}
            className="w-full py-4 rounded-2xl font-black text-white text-base uppercase tracking-wide transition-all cursor-pointer"
            style={{ background: '#C41E3A', boxShadow: '0 6px 24px rgba(196,30,58,0.45)' }}
          >
            Agregar {fmt(price)}
          </button>
        </div>
      </div>
    </div>
  )
}
