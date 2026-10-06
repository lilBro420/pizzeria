import { useState } from 'react'
import { OrderItem, OrderType, PayMethod } from '../../types'
import { ORDER_TYPES, PAY } from '../../constants/orderRules'
import { fmt } from '../../utils/formatters'
import { ArrowLeft, Plus, X, Trash2 } from 'lucide-react'

interface PayScreenProps {
  order: OrderItem[]
  orderType: OrderType
  total: number
  discount: number
  discountAmt: number
  onConfirm: (payments: { method: PayMethod, amount: number }[]) => void
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
  const [appliedPayments, setAppliedPayments] = useState<{method: PayMethod, amount: number}[]>([])

  const totalPaid = appliedPayments.reduce((s, p) => s + p.amount, 0)
  const remaining = Math.max(0, total - totalPaid)
  const currentInputAmount = parseFloat(input) || 0
  
  const change = (totalPaid + currentInputAmount) - total
  
  const canConfirm = (totalPaid + currentInputAmount) >= total

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

  const applyPayment = () => {
    if (currentInputAmount <= 0) {
      if (remaining > 0) {
        setAppliedPayments([...appliedPayments, { method: payMethod, amount: remaining }])
      }
    } else {
      setAppliedPayments([...appliedPayments, { method: payMethod, amount: currentInputAmount }])
      setInput('')
    }
  }

  const removePayment = (index: number) => {
    setAppliedPayments(appliedPayments.filter((_, i) => i !== index))
  }

  const handleConfirm = () => {
    if (currentInputAmount > 0) {
      onConfirm([...appliedPayments, { method: payMethod, amount: currentInputAmount }])
    } else if (totalPaid >= total) {
      onConfirm(appliedPayments)
    } else {
      onConfirm([...appliedPayments, { method: payMethod, amount: remaining }])
    }
  }

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-gray-100 font-sans">
      <div className="flex flex-col flex-1 p-4 md:p-6 gap-4 overflow-y-auto">
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors cursor-pointer font-bold text-sm bg-white border border-gray-200 px-4 py-2 rounded-xl shadow-sm"
          >
            <ArrowLeft size={16} />
            Volver
          </button>
          <span className="text-gray-300">|</span>
          <span className="text-gray-500 font-bold uppercase tracking-widest text-xs">Pago de Orden</span>
        </div>

        <div className="grid grid-cols-3 gap-3 shrink-0">
          {allowed.map(m => (
            <button
              key={m}
              onClick={() => {
                setPayMethod(m)
                setInput('')
              }}
              className={`flex flex-col items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm transition-all cursor-pointer ${
                payMethod === m
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/25 border-transparent'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600'
              }`}
            >
              <span className="text-3xl">{PAY[m].icon}</span>
              <span className="uppercase tracking-wider text-[10px] md:text-xs">{PAY[m].label}</span>
            </button>
          ))}
        </div>

        <div className="bg-white rounded-3xl p-5 md:p-6 shadow-sm border border-gray-200 shrink-0">
          <div className="flex items-end justify-between mb-4">
            <span className="text-gray-500 text-sm font-bold uppercase tracking-widest">Restante a pagar</span>
            <span className={`font-black text-4xl font-mono ${remaining === 0 ? 'text-green-500' : 'text-gray-900'}`}>
              {fmt(remaining)}
            </span>
          </div>

          <div className="h-px bg-gray-100 mb-4" />

          {payMethod === 'efectivo' ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-500 text-xs font-bold uppercase">Monto a ingresar</span>
                <span className={`font-black text-3xl font-mono ${input ? 'text-blue-600' : 'text-gray-300'}`}>
                  {input ? fmt(currentInputAmount) : '$0.00'}
                </span>
              </div>
              <div className={`flex items-center justify-between rounded-2xl px-4 py-3 transition-colors ${
                  currentInputAmount === 0 ? 'bg-gray-50' : change >= 0 ? 'bg-green-50' : 'bg-red-50'
                }`}
              >
                <span className={`font-bold text-sm uppercase tracking-wide ${
                    currentInputAmount === 0 ? 'text-gray-400' : change >= 0 ? 'text-green-600' : 'text-red-500'
                  }`}
                >
                  {change >= 0 ? 'Cambio al cliente' : 'Falta para completar'}
                </span>
                <span className={`font-black text-xl font-mono ${
                    currentInputAmount === 0 ? 'text-gray-400' : change >= 0 ? 'text-green-600' : 'text-red-500'
                  }`}
                >
                  {currentInputAmount === 0 ? '$0.00' : fmt(Math.abs(change))}
                </span>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center py-6 gap-4 bg-gray-50 rounded-2xl border border-gray-100">
              <span className="text-4xl">{payMethod === 'tarjeta' ? '💳' : '📲'}</span>
              <div>
                <div className="font-black text-gray-800 text-lg uppercase tracking-tight">
                  {payMethod === 'tarjeta' ? 'Pago con Tarjeta' : 'Transferencia'}
                </div>
                <div className="text-gray-500 text-xs font-medium mt-1">
                  Ingresa el monto parcial, o cobra el total restante
                </div>
                <div className="mt-2 text-2xl font-mono font-black text-blue-600">
                  {input ? fmt(currentInputAmount) : fmt(remaining)}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-4 min-h-0 flex-1">
          <div className="w-1/2 flex flex-col min-h-0">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Teclado Numérico</div>
            <div className="grid grid-rows-4 gap-2 flex-1">
              {KEYS.map((row, ri) => (
                <div key={ri} className="grid grid-cols-3 gap-2">
                  {row.map(key => (
                    <button
                      key={key}
                      onClick={() => press(key)}
                      className={`rounded-2xl font-black text-xl transition-all cursor-pointer shadow-sm flex items-center justify-center ${
                        key === 'DEL'
                          ? 'bg-red-50 border border-red-200 text-red-500 hover:bg-red-100'
                          : 'bg-white border border-gray-200 text-gray-800 hover:bg-gray-50 hover:border-gray-300 active:bg-gray-100'
                      }`}
                    >
                      {key === 'DEL' ? <Trash2 size={20} /> : key}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
          
          <div className="w-1/2 flex flex-col gap-4 overflow-y-auto">
            {payMethod === 'efectivo' ? (
              <>
                <div>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Billetes</div>
                  <div className="grid grid-cols-3 gap-2">
                    {BILLS.map(b => (
                      <button
                        key={b}
                        onClick={() => addAmount(b)}
                        className="py-3 rounded-xl bg-white border border-gray-200 hover:border-green-400 hover:bg-green-50 text-gray-700 font-bold text-sm transition-all shadow-sm"
                      >
                        ${b}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Monedas</div>
                  <div className="grid grid-cols-3 gap-2">
                    {COINS.map(c => (
                      <button
                        key={c}
                        onClick={() => addAmount(c)}
                        className="py-2.5 rounded-xl bg-white border border-gray-200 hover:border-gray-400 hover:bg-gray-50 text-gray-700 font-bold text-xs transition-all shadow-sm"
                      >
                        {c < 1 ? `${c * 100}¢` : `$${c}`}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col">
                 <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Opciones de pago</div>
                 <button 
                  onClick={() => setInput(remaining.toString())}
                  className="w-full py-4 bg-white border border-blue-200 text-blue-600 rounded-2xl font-bold hover:bg-blue-50 transition-colors shadow-sm"
                 >
                   Monto Restante Exacto
                 </button>
              </div>
            )}
            
            <button 
              onClick={applyPayment}
              disabled={remaining <= 0}
              className="mt-auto py-4 bg-gray-900 hover:bg-black text-white rounded-2xl font-black uppercase tracking-widest shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Plus size={18} /> Aplicar Pago
            </button>
          </div>
        </div>
      </div>

      <div className="w-full md:w-80 shrink-0 flex flex-col bg-white border-l border-gray-200 shadow-2xl">
        <div className="p-5 border-b border-gray-100 bg-gray-50 shrink-0">
          <h3 className="font-black text-gray-900 uppercase tracking-widest">Pagos Aplicados</h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50/50" style={{ scrollbarWidth: 'thin' }}>
          {appliedPayments.length === 0 ? (
            <div className="text-center text-sm font-medium text-gray-400 mt-4">
              Aún no se han aplicado pagos.
            </div>
          ) : (
            appliedPayments.map((p, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-3 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{PAY[p.method].icon}</span>
                  <span className="font-bold text-gray-700 text-xs uppercase">{PAY[p.method].label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-black text-gray-900">{fmt(p.amount)}</span>
                  <button onClick={() => removePayment(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-5 border-t border-gray-200 bg-white shrink-0">
          <div className="flex justify-between items-end mb-2">
            <span className="font-bold text-gray-400 text-xs uppercase tracking-widest">Total de la Orden</span>
            <span className="font-mono text-xl font-bold text-gray-700">{fmt(total)}</span>
          </div>
          <div className="flex justify-between items-end mb-5">
            <span className="font-bold text-gray-400 text-xs uppercase tracking-widest">Total Pagado</span>
            <span className="font-mono text-xl font-bold text-blue-600">{fmt(totalPaid)}</span>
          </div>
          
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={`w-full py-5 rounded-2xl font-black text-white text-lg uppercase tracking-wider transition-all ${
              canConfirm 
                ? 'bg-green-600 hover:bg-green-700 shadow-[0_8px_20px_rgba(22,163,74,0.3)]' 
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            {canConfirm ? 'Finalizar Pago' : 'Pago Incompleto'}
          </button>
        </div>
      </div>
    </div>
  )
}
