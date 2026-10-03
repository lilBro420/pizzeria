import { useState } from 'react'
import { OrderItem, OrderType, PayMethod } from '../../types'
import { ORDER_TYPES, PAY } from '../../constants/orderRules'
import { fmt } from '../../utils/formatters'

interface PayScreenProps {
  order: OrderItem[]
  orderType: OrderType
  total: number
  discount: number
  discountAmt: number
  onConfirm: (payMethod: PayMethod) => void
  onBack: () => void
}

const KEYS = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
  ['.', '0', 'DEL'],
]

const COINS = [0.5, 1, 2, 5, 10, 20]
const BILLS = [50, 100, 200, 500, 1000]

export function PayScreen({
  order,
  orderType,
  total,
  discount,
  discountAmt,
  onConfirm,
  onBack,
}: PayScreenProps) {
  const allowed = ORDER_TYPES[orderType].payMethods
  const [payMethod, setPayMethod] = useState<PayMethod>(allowed[0])
  const [input, setInput] = useState('')

  const received = parseFloat(input) || 0
  const change = received - total
  const canConfirm = payMethod !== 'efectivo' || received >= total

  const press = (key: string) => {
    if (key === 'DEL') {
      setInput(p => p.slice(0, -1))
      return
    }
    if (key === 'CLR') {
      setInput('')
      return
    }
    if (key === '.') {
      if (input.includes('.')) return
      setInput(p => (p === '' ? '0.' : p + '.'))
      return
    }
    if (input.includes('.') && input.split('.')[1]?.length >= 2) return
    setInput(p => (p === '0' ? key : p + key))
  }

  const addAmount = (amount: number) => {
    const current = parseFloat(input) || 0
    setInput(
      (current + amount)
        .toFixed(2)
        .replace(/\.?0+$/, '')
        .replace(/(\.\d)0$/, '$1')
    )
  }

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ fontFamily: "'Work Sans', system-ui, sans-serif", background: '#f0f0f2' }}
    >
      <div className="flex flex-col flex-1 p-5 gap-4 overflow-hidden">
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors cursor-pointer font-semibold text-sm"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M12 4L6 10L12 16"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Volver al menú
          </button>
          <span className="text-gray-300">·</span>
          <span className="text-gray-400 text-sm font-mono">Cobro de orden</span>
        </div>

        <div
          className="grid gap-2 shrink-0"
          style={{ gridTemplateColumns: `repeat(${allowed.length}, minmax(0, 1fr))` }}
        >
          {allowed.map(m => (
            <button
              key={m}
              onClick={() => {
                setPayMethod(m)
                setInput('')
              }}
              className={`flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all cursor-pointer ${
                payMethod === m
                  ? 'bg-[#16a34a] text-white shadow-lg shadow-green-900/25'
                  : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              <span className="text-lg">{PAY[m].icon}</span>
              <span>{PAY[m].label}</span>
            </button>
          ))}
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 shrink-0">
          <div className="flex items-end justify-between mb-1">
            <span className="text-gray-400 text-sm font-medium">Total a cobrar</span>
            <span className="font-black text-2xl text-gray-900 font-mono">{fmt(total)}</span>
          </div>
          <div className="h-px bg-gray-100 my-3" />
          {payMethod === 'efectivo' ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-500 text-sm font-medium">Recibido</span>
                <span
                  className={`font-black text-3xl font-mono ${input ? 'text-gray-900' : 'text-gray-300'}`}
                >
                  {input ? fmt(received) : '$0.00'}
                </span>
              </div>
              <div
                className={`flex items-center justify-between rounded-2xl px-4 py-3 transition-colors ${
                  received === 0 ? 'bg-gray-50' : change >= 0 ? 'bg-green-50' : 'bg-red-50'
                }`}
              >
                <span
                  className={`font-bold text-sm ${
                    received === 0 ? 'text-gray-400' : change >= 0 ? 'text-green-700' : 'text-red-600'
                  }`}
                >
                  {change >= 0 ? 'Cambio' : 'Falta'}
                </span>
                <span
                  className={`font-black text-2xl font-mono ${
                    received === 0 ? 'text-gray-300' : change >= 0 ? 'text-green-600' : 'text-red-500'
                  }`}
                >
                  {received === 0 ? '$0.00' : fmt(Math.abs(change))}
                </span>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center py-4 gap-3">
              <span className="text-3xl">{payMethod === 'tarjeta' ? '💳' : '📲'}</span>
              <div>
                <div className="font-bold text-gray-700">
                  {payMethod === 'tarjeta' ? 'Pago con tarjeta' : 'Transferencia bancaria'}
                </div>
                <div className="text-gray-400 text-sm">Confirmar al recibir el pago</div>
              </div>
            </div>
          )}
        </div>

        {payMethod === 'efectivo' && (
          <>
            <div className="shrink-0">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Monedas</div>
              <div className="grid grid-cols-6 gap-1.5">
                {COINS.map(c => (
                  <button
                    key={c}
                    onClick={() => addAmount(c)}
                    className="py-2 rounded-xl bg-white border border-gray-200 hover:border-gray-400 hover:bg-gray-50 text-gray-700 font-bold text-xs transition-all cursor-pointer shadow-sm"
                  >
                    {c < 1 ? `${c * 100}¢` : `$${c}`}
                  </button>
                ))}
              </div>
            </div>

            <div className="shrink-0">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Billetes</div>
              <div className="grid grid-cols-5 gap-1.5">
                {BILLS.map(b => (
                  <button
                    key={b}
                    onClick={() => addAmount(b)}
                    className="py-2.5 rounded-xl bg-white border border-gray-200 hover:border-green-400 hover:bg-green-50 hover:text-green-700 text-gray-700 font-bold text-sm transition-all cursor-pointer shadow-sm"
                  >
                    ${b}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-2 min-h-0">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Teclado numérico
              </div>
              <div className="grid grid-rows-4 gap-2 flex-1">
                {KEYS.map((row, ri) => (
                  <div key={ri} className="grid grid-cols-3 gap-2">
                    {row.map(key => (
                      <button
                        key={key}
                        onClick={() => press(key)}
                        className={`rounded-2xl font-bold text-xl transition-all cursor-pointer shadow-sm flex items-center justify-center ${
                          key === 'DEL'
                            ? 'bg-red-50 border border-red-200 text-red-500 hover:bg-red-100'
                            : 'bg-white border border-gray-200 text-gray-800 hover:bg-gray-50 hover:border-gray-300 active:bg-gray-100'
                        }`}
                      >
                        {key === 'DEL' ? (
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M21 5H9L2 12l7 7h12V5Z"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M16 10l-4 4M12 10l4 4"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          </svg>
                        ) : (
                          key
                        )}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="w-72 xl:w-80 shrink-0 flex flex-col shadow-2xl" style={{ background: '#7a1212' }}>
        <div className="px-5 pt-5 pb-3 shrink-0">
          <div
            className="inline-flex rounded-xl overflow-hidden p-0.5 w-full"
            style={{ background: '#5a0e0e' }}
          >
            {(Object.keys(ORDER_TYPES) as OrderType[]).map(t => (
              <div
                key={t}
                className={`flex-1 py-2 text-[10px] font-bold text-center rounded-[10px] ${
                  orderType === t ? 'bg-white text-[#7a1212]' : 'text-white/50'
                }`}
              >
                {ORDER_TYPES[t].icon} {ORDER_TYPES[t].label}
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 pb-2 shrink-0 flex items-center justify-between">
          <span className="font-black text-lg tracking-wide uppercase" style={{ color: '#F5C518' }}>
            Resumen
          </span>
          <span className="font-mono text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {order.length} producto{order.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="mx-5 h-px mb-2 shrink-0" style={{ background: 'rgba(255,255,255,0.12)' }} />

        <div
          className="flex-1 overflow-y-auto px-4 py-1"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255,255,255,0.2) transparent',
          }}
        >
          <div className="space-y-1.5">
            {order.map(oi => (
              <div
                key={oi.uid}
                className="flex items-start gap-2 rounded-xl px-3 py-2.5"
                style={{ background: 'rgba(255,255,255,0.09)' }}
              >
                <span className="text-lg shrink-0 mt-0.5">{oi.item.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white text-xs leading-tight">
                    {oi.qty}× {oi.item.name}
                  </div>
                  {(oi.size || oi.dough) && (
                    <div
                      className="text-[10px] mt-0.5 leading-tight"
                      style={{ color: 'rgba(255,255,255,0.45)' }}
                    >
                      {[oi.size, oi.dough].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>
                <span className="font-black font-mono text-xs text-white shrink-0">
                  {fmt(oi.finalPrice * oi.qty)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div
          className="px-5 pt-3 pb-5 shrink-0 border-t"
          style={{ borderColor: 'rgba(255,255,255,0.12)' }}
        >
          <div className="mb-4">
            {discount > 0 && (
              <div className="flex justify-between text-xs text-green-400 mb-1">
                <span>Descuento ({discount}%)</span>
                <span className="font-mono">-{fmt(discountAmt)}</span>
              </div>
            )}
            <div className="flex justify-between font-black text-2xl" style={{ color: '#F5C518' }}>
              <span>Total</span>
              <span className="font-mono">{fmt(total)}</span>
            </div>
          </div>

          {payMethod === 'efectivo' && received > 0 && change >= 0 && (
            <div className="flex justify-between font-bold text-sm mb-3 px-3 py-2 rounded-xl bg-green-900/40">
              <span className="text-green-400">Cambio</span>
              <span className="text-green-400 font-mono">{fmt(change)}</span>
            </div>
          )}

          <button
            onClick={() => onConfirm(payMethod)}
            disabled={!canConfirm}
            className="w-full py-4 rounded-2xl font-black text-white text-base uppercase tracking-wide transition-all cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
            style={{
              background: canConfirm ? '#22c55e' : '#166534',
              boxShadow: canConfirm ? '0 5px 18px rgba(34,197,94,0.4)' : 'none',
            }}
          >
            {canConfirm ? '✓ CONFIRMAR PAGO' : 'INGRESA MONTO'}
          </button>
        </div>
      </div>
    </div>
  )
}
