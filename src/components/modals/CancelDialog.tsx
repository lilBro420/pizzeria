import { useState } from 'react'
import { Order } from '../../types'
import { ORDER_TYPES, PAY } from '../../constants/orderRules'
import { CANCEL_REASONS } from '../../data/menu'
import { fmt } from '../../utils/formatters'

interface CancelDialogProps {
  order: Order
  onConfirm: (reason: string) => void
  onClose: () => void
}

export function CancelDialog({ order, onConfirm, onClose }: CancelDialogProps) {
  const [reason, setReason] = useState(CANCEL_REASONS[0])
  const type = ORDER_TYPES[order.orderType]
  const paidWith = order.payMethod
  const note =
    order.status === 'en_reparto'
      ? '🛵 La pizza ya salió: el repartidor debe regresarla al local.'
      : order.status === 'preparando'
      ? '🍳 Avisa a cocina para que detenga la preparación.'
      : null

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative z-50 w-full max-w-sm mx-4 rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: '#1a1a2e', border: '1.5px solid #2d2d4a' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-4 border-b" style={{ borderColor: '#2d2d4a' }}>
          <div className="text-3xl mb-1">🚫</div>
          <h2 className="text-white font-black text-xl tracking-tight">Cancelar pedido {order.id}</h2>
          <p className="text-gray-400 text-sm mt-0.5">
            {type.icon} {type.label} · {fmt(order.total)}
          </p>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2.5">Motivo</div>
            <div className="flex flex-col gap-1.5">
              {CANCEL_REASONS.map(r => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                    reason === r
                      ? 'bg-[#C41E3A] text-white'
                      : 'bg-white/8 text-gray-300 hover:bg-white/15 border border-white/10'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {paidWith && (
            <div
              className="rounded-2xl px-4 py-3 text-sm"
              style={{
                background: 'rgba(245,197,24,0.1)',
                border: '1px solid rgba(245,197,24,0.35)',
                color: '#F5C518',
              }}
            >
              💰 Ya estaba cobrada ({PAY[paidWith].label}). Devuelve <b className="font-mono">{fmt(order.total)}</b> al cliente.
            </div>
          )}
          {note && <div className="text-xs text-gray-400">{note}</div>}
        </div>

        <div className="px-6 pb-6 grid grid-cols-2 gap-2">
          <button
            onClick={onClose}
            className="py-3 rounded-2xl font-bold text-sm text-gray-300 bg-white/10 hover:bg-white/15 transition-colors cursor-pointer"
          >
            Volver
          </button>
          <button
            onClick={() => onConfirm(reason)}
            className="py-3 rounded-2xl font-black text-sm text-white uppercase tracking-wide cursor-pointer"
            style={{ background: '#C41E3A', boxShadow: '0 6px 24px rgba(196,30,58,0.45)' }}
          >
            Cancelar pedido
          </button>
        </div>
      </div>
    </div>
  )
}
