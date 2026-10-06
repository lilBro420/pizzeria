import { useRef, useState } from 'react'
import {
  Category,
  MenuItem,
  Order,
  OrderItem,
  OrderStatus,
  OrdersStore,
  OrderType,
  PayMethod,
  PizzaDough,
  PizzaSize,
  Client,
  AppliedPayment
} from '../../types'
import { ORDER_TYPES } from '../../constants/orderRules'
import { calcTotals, fmt, nowTime, uid, unitPrice } from '../../utils/formatters'
import { CustomizerModal } from '../modals/CustomizerModal'
import { PayScreen } from './PayScreen'
import { MenuStore } from '../../hooks/useMenu'
import { ClientsStore } from '../../hooks/useClients'
import { OrderTypeModal } from '../modals/OrderTypeModal'
import { PendingAccountsModal } from '../modals/PendingAccountsModal'
import { ExitMenuModal } from '../modals/ExitMenuModal'
import { 
  LogOut, 
  Users, 
  Clock, 
  Trash2, 
  Edit3, 
  ShoppingBag,
  ListRestart,
  Loader2
} from 'lucide-react'

type Paying = { kind: 'cart', type: OrderType, client?: Client, table?: string } | { kind: 'order'; id: string }

interface POSProps {
  onLogout: () => void
  ordersStore: OrdersStore
  menuStore: MenuStore
  clientsStore: ClientsStore
}

export function POS({ onLogout, ordersStore, menuStore, clientsStore }: POSProps) {
  const { orders, loading: ordersLoading, create: createOrder } = ordersStore
  const { items: MENU, loading: menuLoading } = menuStore

  const [category, setCategory] = useState<Category>('Todo')
  const [order, setOrder] = useState<OrderItem[]>([])
  
  // States for modals
  const [customizing, setCustomizing] = useState<{item: MenuItem, initial?: OrderItem} | null>(null)
  const [showOrderType, setShowOrderType] = useState(false)
  const [showPending, setShowPending] = useState(false)
  const [showExit, setShowExit] = useState(false)
  
  const [discount, setDiscount] = useState(0)
  const [showDiscountInput, setShowDiscountInput] = useState(false)
  const [discountInput, setDiscountInput] = useState('')
  
  const [paying, setPaying] = useState<Paying | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  const notify = (msg: string, ms = 2500) => {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), ms)
  }

  if (ordersLoading || menuLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f5f5f7] flex-col gap-4 text-red-600">
        <Loader2 className="animate-spin" size={48} />
        <span className="font-bold tracking-widest uppercase text-sm">Cargando datos...</span>
      </div>
    )
  }

  // ── Derivados ──
  const filtered = category === 'Todo' ? MENU : MENU.filter(i => i.category === category)
  const { total } = calcTotals(order, discount)
  const totalItems = order.reduce((s, i) => s + i.qty, 0)
  const ready = order.length > 0
  
  const pendingPaymentCount = orders.filter(o => o.payMethod === null && o.status !== 'entregado' && o.status !== 'cancelado').length

  // ── Carrito ──
  const handleItemClick = (item: MenuItem) => {
    setCustomizing({ item })
  }

  const handleEditItem = (oi: OrderItem) => {
    setCustomizing({ item: oi.item, initial: oi })
  }

  const confirmCustomize = (qty: number, size?: PizzaSize, dough?: PizzaDough, comments?: string) => {
    if (!customizing) return
    
    if (customizing.initial) {
      setOrder(prev => prev.map(i => {
        if (i.uid === customizing.initial!.uid) {
          return {
            ...i,
            qty,
            size,
            dough,
            comments,
            finalPrice: customizing.item.category === 'pizzas' ? unitPrice(customizing.item, size, dough) : customizing.item.basePrice
          }
        }
        return i
      }))
    } else {
      setOrder(prev => [
        ...prev,
        { 
          uid: uid(), 
          item: customizing.item, 
          qty, 
          size, 
          dough, 
          comments, 
          finalPrice: customizing.item.category === 'pizzas' ? unitPrice(customizing.item, size, dough) : customizing.item.basePrice 
        },
      ])
    }
    setCustomizing(null)
  }

  const removeItem = (u: string) => setOrder(prev => prev.filter(i => i.uid !== u))

  const clearCart = () => {
    setOrder([])
    setDiscount(0)
    setShowDiscountInput(false)
    setDiscountInput('')
  }

  const applyDiscount = () => {
    const v = parseFloat(discountInput)
    if (!isNaN(v) && v >= 0 && v <= 100) setDiscount(v)
    setShowDiscountInput(false)
    setDiscountInput('')
  }

  // ── Órdenes ──
  const handleOrderTypeConfirm = (orderType: OrderType, client?: Client, table?: string) => {
    setShowOrderType(false)
    if (ORDER_TYPES[orderType].payUpfront) {
      setPaying({ kind: 'cart', type: orderType, client, table })
    } else {
      submitOrder(null, orderType, client, table)
    }
  }

  const submitOrder = async (payMethod: PayMethod | null, orderType: OrderType, client?: Client, table?: string, paymentDetails?: any) => {
    try {
      const id = await createOrder({
        items: order,
        discount,
        total,
        payMethod,
        status: 'preparando',
        time: nowTime(),
        cashier: 'Cajero',
        orderType,
        client,
        table
      }, paymentDetails)
      
      clearCart()
      if (payMethod) {
        notify(`✅ Orden ${id} cobrada y enviada a cocina`, 3500)
      } else {
        notify(`📝 Orden ${id} enviada a cocina (Cuenta en espera)`, 3500)
      }
    } catch (err: any) {
      alert(`Error al crear orden: ${err.message}`)
    }
  }

  const handlePayConfirm = async (payments: AppliedPayment[]) => {
    if (!paying) return
    const mainMethod = payments.length > 0 ? payments[0].method : 'efectivo'
    const totalPaid = payments.reduce((s, p) => s + p.amount, 0)
    
    // Simplificación para API: mandamos montoRecibido y asume el primer método
    const paymentDetails = { montoRecibido: totalPaid }

    if (paying.kind === 'cart') {
      await submitOrder(mainMethod, paying.type, paying.client, paying.table, paymentDetails)
    } else {
      try {
        await ordersStore.collect(paying.id, payments, paymentDetails)
        notify(`✅ Orden cobrada exitosamente`, 3500)
        setShowPending(false)
      } catch (err: any) {
        alert(`Error al cobrar orden: ${err.message}`)
      }
    }
    setPaying(null)
  }

  const payingOrder = paying?.kind === 'order' ? orders.find(o => o.id === paying.id) : undefined

  if (paying && (paying.kind === 'cart' || payingOrder)) {
    const src = payingOrder ?? { items: order, orderType: (paying as any).type, discount }
    const t = calcTotals(src.items, src.discount)
    return (
      <PayScreen
        order={src.items}
        orderType={src.orderType}
        total={t.total}
        discount={src.discount}
        discountAmt={t.discountAmt}
        onConfirm={handlePayConfirm}
        onBack={() => setPaying(null)}
      />
    )
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#f5f5f7] font-sans">
      <header className="flex items-center justify-between px-4 md:px-6 h-16 bg-white border-b border-gray-200 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🍕</span>
          <div className="hidden md:block">
            <span className="font-black text-gray-900 text-lg tracking-tight block leading-none">Pizzería Volcán</span>
            <span className="text-gray-400 text-xs font-medium uppercase tracking-widest">Punto de Venta</span>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <button
            onClick={() => setShowPending(true)}
            className="flex items-center gap-2 text-xs md:text-sm font-bold px-4 py-2.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors shadow-sm"
          >
            <Clock size={18} />
            <span className="hidden sm:inline">Cuentas en espera</span>
            {pendingPaymentCount > 0 && (
              <span className="bg-amber-500 text-white px-2 py-0.5 rounded-full text-[10px] leading-none ml-1">
                {pendingPaymentCount}
              </span>
            )}
          </button>

          <button className="hidden sm:flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-gray-900 px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm">
            <Users size={18} />
            Clientes
          </button>
          
          <button
            onClick={() => setShowExit(true)}
            className="flex items-center gap-2 text-sm font-bold text-red-600 hover:text-red-700 px-4 py-2.5 rounded-xl border border-red-200 hover:bg-red-50 transition-colors shadow-sm"
          >
            <LogOut size={18} />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden gap-3 lg:gap-4 p-3 lg:p-4">
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <div className="flex overflow-x-auto gap-2 md:gap-3 mb-4 shrink-0 pb-2 scrollbar-hide">
            {(['Todo', 'pizzas', 'snacks', 'bebidas', 'paquetes'] as Category[]).map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-5 md:px-8 py-3 rounded-2xl text-sm md:text-base font-black uppercase tracking-wide whitespace-nowrap transition-all shadow-sm ${
                  category === cat
                    ? 'bg-red-600 text-white shadow-red-900/20 shadow-lg'
                    : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div
            className="flex-1 overflow-y-auto pr-2"
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}
          >
            {category === 'Todo' && (
              <div className="mb-6 grid grid-cols-1 sm:grid-cols-4 gap-3 md:gap-4">
                <button onClick={() => setCategory('pizzas')} className="bg-white border border-gray-200 rounded-3xl p-6 text-center hover:shadow-lg hover:border-red-300 transition-all group">
                  <div className="text-6xl mb-3 group-hover:scale-110 transition-transform">🍕</div>
                  <h3 className="font-black text-xl text-gray-800">Pizzas</h3>
                </button>
                <button onClick={() => setCategory('snacks')} className="bg-white border border-gray-200 rounded-3xl p-6 text-center hover:shadow-lg hover:border-yellow-300 transition-all group">
                  <div className="text-6xl mb-3 group-hover:scale-110 transition-transform">🍟</div>
                  <h3 className="font-black text-xl text-gray-800">Snacks</h3>
                </button>
                <button onClick={() => setCategory('bebidas')} className="bg-white border border-gray-200 rounded-3xl p-6 text-center hover:shadow-lg hover:border-blue-300 transition-all group">
                  <div className="text-6xl mb-3 group-hover:scale-110 transition-transform">🥤</div>
                  <h3 className="font-black text-xl text-gray-800">Bebidas</h3>
                </button>
                <button onClick={() => setCategory('paquetes')} className="bg-white border border-gray-200 rounded-3xl p-6 text-center hover:shadow-lg hover:border-purple-300 transition-all group">
                  <div className="text-6xl mb-3 group-hover:scale-110 transition-transform">📦</div>
                  <h3 className="font-black text-xl text-gray-800">Paquetes</h3>
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 pb-10">
              {filtered.map(item => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className="bg-white rounded-3xl p-4 md:p-5 flex flex-col items-center text-center shadow-sm border border-gray-200 hover:border-red-400 hover:shadow-lg hover:shadow-red-900/5 transition-all cursor-pointer group"
                >
                  <span className="text-5xl mb-3 group-hover:scale-110 transition-transform">{item.emoji}</span>
                  <span className="font-black text-gray-900 text-sm md:text-base leading-tight mb-1">{item.name}</span>
                  <span className="text-gray-400 text-[10px] md:text-xs leading-snug line-clamp-2 mb-3">
                    {item.desc}
                  </span>
                  <span className="mt-auto font-black font-mono text-base md:text-lg text-red-600 bg-red-50 px-3 py-1 rounded-xl">
                    {fmt(item.basePrice)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="w-full lg:w-80 xl:w-96 shrink-0 flex flex-col bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-200">
          <div className="px-5 py-4 shrink-0 flex items-center justify-between border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-2">
              <ShoppingBag className="text-red-500" size={24} />
              <span className="font-black text-lg text-gray-900 uppercase tracking-tight">
                Orden Actual
              </span>
            </div>
            {totalItems > 0 && (
              <span className="bg-red-100 text-red-700 text-xs font-black px-3 py-1 rounded-full border border-red-200">
                {totalItems} items
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-2" style={{ scrollbarWidth: 'thin' }}>
            {order.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 opacity-40">
                <ListRestart size={48} />
                <span className="text-gray-500 text-sm font-medium text-center">
                  La orden está vacía.<br/>Selecciona productos del menú.
                </span>
              </div>
            ) : (
              <div className="space-y-3 pt-2 pb-4">
                {order.map(oi => (
                  <div key={oi.uid} className="bg-gray-50 border border-gray-200 rounded-2xl p-3 flex gap-3">
                    <span className="text-2xl mt-1 shrink-0">{oi.item.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900 text-sm leading-tight mb-0.5">
                        {oi.qty}× {oi.item.name}
                      </div>
                      {(oi.size || oi.dough) && (
                        <div className="text-xs text-gray-500 mb-1">
                          {[oi.size, oi.dough].filter(Boolean).join(' · ')}
                        </div>
                      )}
                      {oi.comments && (
                        <div className="text-[10px] text-amber-600 bg-amber-50 border border-amber-100 rounded-md px-2 py-1 mb-1 italic line-clamp-2">
                          "{oi.comments}"
                        </div>
                      )}
                      <div className="font-black font-mono text-sm text-gray-900 mt-1">
                        {fmt(oi.finalPrice * oi.qty)}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0 justify-between">
                      <button onClick={() => removeItem(oi.uid)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                      <button onClick={() => handleEditItem(oi)} className="text-gray-400 hover:text-blue-500 hover:bg-blue-50 p-1.5 rounded-lg transition-colors">
                        <Edit3 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-5 border-t border-gray-200 bg-gray-50 shrink-0">
            {discount > 0 && (
              <div className="flex justify-between text-sm text-green-600 mb-2 font-bold">
                <span>Descuento ({discount}%)</span>
                <span className="font-mono">-{fmt(total * (discount/100))}</span>
              </div>
            )}
            
            <div className="flex justify-between items-end mb-4">
              <span className="font-black text-gray-400 uppercase tracking-widest text-xs">Total</span>
              <span className="font-black text-3xl text-gray-900 font-mono leading-none">{fmt(total)}</span>
            </div>

            <button
              onClick={() => setShowOrderType(true)}
              disabled={!ready}
              className={`w-full py-4 rounded-xl font-black text-white text-base md:text-lg uppercase tracking-wider transition-all ${
                ready 
                  ? 'bg-red-600 hover:bg-red-700 shadow-[0_8px_20px_rgba(220,38,38,0.3)]' 
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              Pagar Cuenta
            </button>

            <div className="flex items-center justify-center gap-4 mt-4">
              <button
                onClick={() => setShowDiscountInput(v => !v)}
                disabled={order.length === 0}
                className="text-xs font-bold text-gray-500 hover:text-gray-800 disabled:opacity-40 transition-colors"
              >
                % Aplicar Descuento
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={clearCart}
                disabled={!ready}
                className="text-xs font-bold text-red-400 hover:text-red-600 disabled:opacity-40 transition-colors"
              >
                Vaciar Orden
              </button>
            </div>
            
            {showDiscountInput && (
              <div className="flex gap-2 mt-3 p-3 bg-white border border-gray-200 rounded-xl">
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Porcentaje %"
                  value={discountInput}
                  onChange={e => setDiscountInput(e.target.value)}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:border-red-500 outline-none"
                />
                <button
                  onClick={applyDiscount}
                  className="px-4 py-2 rounded-lg bg-gray-900 text-white font-bold text-xs"
                >
                  OK
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {customizing && (
        <CustomizerModal
          item={customizing.item}
          initialQty={customizing.initial?.qty}
          initialSize={customizing.initial?.size}
          initialDough={customizing.initial?.dough}
          initialComments={customizing.initial?.comments}
          onConfirm={confirmCustomize}
          onClose={() => setCustomizing(null)}
        />
      )}

      {showOrderType && (
        <OrderTypeModal 
          clientsStore={clientsStore}
          onConfirm={handleOrderTypeConfirm}
          onClose={() => setShowOrderType(false)}
        />
      )}

      {showPending && (
        <PendingAccountsModal 
          ordersStore={ordersStore}
          onClose={() => setShowPending(false)}
          onPayOrder={(id) => setPaying({ kind: 'order', id })}
        />
      )}

      {showExit && (
        <ExitMenuModal 
          onClose={() => setShowExit(false)}
          onLogout={onLogout}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full font-bold shadow-2xl z-50 text-sm animate-bounce">
          {toast}
        </div>
      )}
    </div>
  )
}
