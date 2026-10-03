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
} from '../../types'
import { MENU } from '../../data/menu'
import {
  ORDER_TYPES,
  STATUS,
  STATUS_LIST,
  STATUS_TOAST,
  TONE,
  isClosed,
  canCancel,
  nextActions,
} from '../../constants/orderRules'
import { calcTotals, fmt, nowTime, uid, unitPrice } from '../../utils/formatters'
import { CustomizerModal } from '../modals/CustomizerModal'
import { CancelDialog } from '../modals/CancelDialog'
import { PayScreen } from './PayScreen'

type Paying = { kind: 'cart' } | { kind: 'order'; id: string }

interface POSProps {
  onLogout: () => void
  store: OrdersStore
}

export function POS({ onLogout, store }: POSProps) {
  const { orders } = store
  const [category, setCategory] = useState<Category>('pizzas')
  const [order, setOrder] = useState<OrderItem[]>([])
  const [orderType, setOrderType] = useState<OrderType>('llevar')
  const [discount, setDiscount] = useState(0)
  const [showDiscountInput, setShowDiscountInput] = useState(false)
  const [discountInput, setDiscountInput] = useState('')
  const [customizing, setCustomizing] = useState<MenuItem | null>(null)
  const [paying, setPaying] = useState<Paying | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null)
  const [rightTab, setRightTab] = useState<'orden' | 'comandas'>('orden')
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  // ── Derivados ──
  const filtered = MENU.filter(i => i.category === category)
  const { total } = calcTotals(order, discount)
  const totalItems = order.reduce((s, i) => s + i.qty, 0)
  const rule = ORDER_TYPES[orderType]
  const ready = order.length > 0
  const activeCount = orders.filter(o => !isClosed(o.status)).length
  const closedCount = orders.length - activeCount
  const countBy = (s: OrderStatus) => orders.filter(o => o.status === s).length
  const getItemCount = (id: string) =>
    order.filter(i => i.item.id === id).reduce((s, i) => s + i.qty, 0)

  const notify = (msg: string, ms = 2500) => {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), ms)
  }

  // ── Carrito ──
  const addLine = (item: MenuItem, size?: PizzaSize, dough?: PizzaDough) =>
    setOrder(prev => {
      const same = prev.find(
        i => i.item.id === item.id && i.size === size && i.dough === dough
      )
      if (same) return prev.map(i => (i === same ? { ...i, qty: i.qty + 1 } : i))
      return [
        ...prev,
        { uid: uid(), item, qty: 1, size, dough, finalPrice: unitPrice(item, size, dough) },
      ]
    })

  const addItem = (item: MenuItem) =>
    item.category === 'pizzas' ? setCustomizing(item) : addLine(item)

  const confirmCustomize = (size: PizzaSize, dough: PizzaDough) => {
    if (customizing) addLine(customizing, size, dough)
    setCustomizing(null)
  }

  const removeItem = (u: string) => setOrder(prev => prev.filter(i => i.uid !== u))

  const removeOne = (itemId: string) => {
    const last = [...order].reverse().find(i => i.item.id === itemId)
    if (!last) return
    setOrder(prev =>
      last.qty > 1
        ? prev.map(i => (i.uid === last.uid ? { ...i, qty: i.qty - 1 } : i))
        : prev.filter(i => i.uid !== last.uid)
    )
  }

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
  const submitOrder = (payMethod: PayMethod | null) => {
    const id = store.create({
      items: order,
      discount,
      total,
      payMethod,
      status: 'preparando',
      time: nowTime(),
      cashier: 'Cajero',
      orderType,
    })
    clearCart()
    setRightTab('comandas')
    notify(
      `${rule.icon} ${id} enviada a cocina${payMethod ? ' — cobrada' : ' — cobro pendiente'}`,
      3500
    )
  }

  const confirmPayment = (method: PayMethod) => {
    if (!paying) return
    if (paying.kind === 'cart') {
      submitOrder(method)
    } else {
      store.collect(paying.id, method)
      notify(`✅ Orden ${paying.id} cobrada y finalizada`, 3500)
      setRightTab('comandas')
    }
    setPaying(null)
  }

  const advance = (id: string, status: OrderStatus) => {
    store.setStatus(id, status)
    notify(STATUS_TOAST[status] ?? 'Estado actualizado')
  }

  const confirmCancel = (reason: string) => {
    if (!cancelTarget) return
    store.cancel(cancelTarget.id, reason)
    notify(`🚫 Orden ${cancelTarget.id} cancelada`)
    setCancelTarget(null)
  }

  const clearClosed = () => {
    if (closedCount === 0) return
    store.clearClosed()
    notify(
      `🧹 ${closedCount} comanda${closedCount !== 1 ? 's' : ''} cerrada${closedCount !== 1 ? 's' : ''} limpiada${closedCount !== 1 ? 's' : ''}`
    )
  }

  // Pantalla de cobro: carrito nuevo (local/llevar) u orden existente (recoger/domicilio)
  const payingOrder =
    paying?.kind === 'order' ? orders.find(o => o.id === paying.id) : undefined

  if (paying && (paying.kind === 'cart' || payingOrder)) {
    const src = payingOrder ?? { items: order, orderType, discount }
    const t = calcTotals(src.items, src.discount)
    return (
      <PayScreen
        order={src.items}
        orderType={src.orderType}
        total={t.total}
        discount={src.discount}
        discountAmt={t.discountAmt}
        onConfirm={confirmPayment}
        onBack={() => setPaying(null)}
      />
    )
  }

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{ background: '#f5f5f7', fontFamily: "'Work Sans', system-ui, sans-serif" }}
    >
      {/* Top bar */}
      <header className="flex items-center justify-between px-5 h-13 bg-white border-b border-gray-200 shrink-0 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">🍕</span>
          <span className="font-black text-gray-900 text-base tracking-tight">Pizzería Volcán</span>
          <span className="text-gray-300 mx-1">·</span>
          <span className="text-gray-400 text-sm font-medium">Punto de Venta</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onLogout}
            className="text-xs text-gray-400 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer font-medium"
          >
           Clientes
          </button>
          <button
            onClick={onLogout}
            className="text-xs text-gray-400 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer font-medium"
          >
            Salir
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden gap-3 p-3">
        {/* ── LEFT: Menu ─────────────────────────────────────────────────── */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <div className="flex gap-2 mb-3 shrink-0">
            {(
              [
                ['pizzas', 'Pizzas'],
                ['snacks', 'Snacks'],
                ['bebidas', 'Bebidas'],
              ] as const
            ).map(([cat, label]) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  category === cat
                    ? 'bg-[#C41E3A] text-white shadow-lg shadow-red-900/20'
                    : 'bg-[#252535] text-gray-300 hover:bg-[#32324a] hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div
            className="flex-1 overflow-y-auto"
            style={{
              maskImage: 'linear-gradient(to bottom, black 82%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 82%, transparent 100%)',
              scrollbarWidth: 'thin',
              scrollbarColor: '#4a4a5a transparent',
            }}
          >
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 pb-10 pr-1">
              {filtered.map(item => {
                const count = getItemCount(item.id)
                return (
                  <div
                    key={item.id}
                    onClick={() => addItem(item)}
                    className={`relative text-left rounded-2xl p-4 flex flex-col transition-all cursor-pointer group ${
                      count > 0
                        ? 'border-2 border-[#C41E3A]/70 shadow-lg shadow-red-900/15'
                        : 'border-2 border-transparent hover:border-[#3d3d5a]'
                    }`}
                    style={{
                      background:
                        count > 0
                          ? 'linear-gradient(135deg, #1f1f38, #181830)'
                          : 'linear-gradient(135deg, #1a1a2e, #16213e)',
                    }}
                  >
                    {count > 0 && (
                      <span
                        className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full text-white text-[10px] font-black font-mono flex items-center justify-center"
                        style={{ background: '#C41E3A' }}
                      >
                        {count}
                      </span>
                    )}
                    <span className="text-4xl mb-2.5 leading-none">{item.emoji}</span>
                    <span className="font-bold text-white text-sm leading-tight">{item.name}</span>
                    <span className="text-gray-400 text-[11px] mt-0.5 leading-snug line-clamp-2 mb-3">
                      {item.desc}
                    </span>
                    <span className="font-black font-mono text-base mb-3" style={{ color: '#F5C518' }}>
                      {fmt(item.basePrice)}
                    </span>

                    <div
                      className="flex items-center gap-1.5 mt-auto"
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        onClick={() => removeOne(item.id)}
                        disabled={count === 0}
                        className="w-7 h-7 rounded-lg font-bold text-white text-lg flex items-center justify-center transition-colors cursor-pointer disabled:opacity-30 leading-none"
                        style={{ background: count === 0 ? '#3a1a22' : '#C41E3A' }}
                      >
                        −
                      </button>
                      <span className="flex-1 text-center font-mono font-bold text-white text-sm">
                        {count}
                      </span>
                      <button
                        onClick={() => addItem(item)}
                        className="w-7 h-7 rounded-lg font-bold text-white text-lg flex items-center justify-center transition-colors cursor-pointer leading-none"
                        style={{ background: '#C41E3A' }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Order panel (dark red) ──────────────────────────────── */}
        <div
          className="w-72 xl:w-80 shrink-0 flex flex-col rounded-3xl overflow-hidden shadow-2xl"
          style={{ background: '#7a1212' }}
        >
          {/* Tab switcher */}
          <div className="px-3 pt-3 pb-0 shrink-0">
            <div className="flex rounded-xl overflow-hidden p-0.5" style={{ background: '#5a0e0e' }}>
              <button
                onClick={() => setRightTab('orden')}
                className={`flex-1 py-2 text-xs font-bold rounded-[10px] transition-all cursor-pointer ${
                  rightTab === 'orden' ? 'bg-white text-[#7a1212] shadow' : 'text-white/60 hover:text-white'
                }`}
              >
                📋 Orden
              </button>
              <button
                onClick={() => setRightTab('comandas')}
                className={`flex-1 py-2 text-xs font-bold rounded-[10px] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  rightTab === 'comandas' ? 'bg-white text-[#7a1212] shadow' : 'text-white/60 hover:text-white'
                }`}
              >
                🍳 Comandas
                {activeCount > 0 && (
                  <span
                    className={`text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none ${
                      rightTab === 'comandas' ? 'bg-[#C41E3A] text-white' : 'bg-[#F5C518] text-[#7a1212]'
                    }`}
                  >
                    {activeCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* ── ORDEN TAB ── */}
          {rightTab === 'orden' && (
            <>
              <div className="px-3 pt-3 pb-2 shrink-0">
                <div className="grid grid-cols-4 gap-1">
                  {(Object.keys(ORDER_TYPES) as OrderType[]).map(t => (
                    <button
                      key={t}
                      onClick={() => setOrderType(t)}
                      className={`py-1.5 text-[10px] font-bold rounded-xl transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                        orderType === t ? 'bg-white text-[#7a1212] shadow' : 'text-white/55 hover:text-white'
                      }`}
                      style={{ background: orderType === t ? 'white' : 'rgba(255,255,255,0.07)' }}
                    >
                      <span className="text-sm">{ORDER_TYPES[t].icon}</span>
                      <span>{ORDER_TYPES[t].label}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-2 text-[10px] text-amber-300/80 text-center leading-tight">
                  {rule.hint}
                </div>
              </div>

              <div className="px-4 pb-1 shrink-0 flex items-center justify-between">
                <span className="font-black text-base tracking-wide uppercase" style={{ color: '#F5C518' }}>
                  Orden actual
                </span>
                {totalItems > 0 && (
                  <span
                    className="text-[10px] font-black font-mono px-2 py-0.5 rounded-full"
                    style={{ background: '#F5C518', color: '#7a1212' }}
                  >
                    {totalItems} items
                  </span>
                )}
              </div>
              <div className="mx-4 h-px mb-1 shrink-0" style={{ background: 'rgba(255,255,255,0.12)' }} />

              <div
                className="flex-1 overflow-y-auto px-3 py-1"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(255,255,255,0.2) transparent',
                }}
              >
                {order.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3" style={{ opacity: 0.4 }}>
                    <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
                      <path
                        d="M20 6 L20 30 M10 22 L20 32 L30 22"
                        stroke="#F5C518"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className="text-white/60 text-xs text-center leading-relaxed">
                      Selecciona productos
                      <br />
                      del menú para agregar
                    </span>
                  </div>
                ) : (
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
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="font-black font-mono text-xs text-white">
                            {fmt(oi.finalPrice * oi.qty)}
                          </span>
                          <button
                            onClick={() => removeItem(oi.uid)}
                            className="text-[10px] hover:text-red-300 transition-colors cursor-pointer"
                            style={{ color: 'rgba(255,255,255,0.3)' }}
                          >
                            quitar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div
                className="px-4 pt-2 pb-4 shrink-0 border-t"
                style={{ borderColor: 'rgba(255,255,255,0.12)' }}
              >
                <div className="flex justify-between font-black text-xl mb-3" style={{ color: '#F5C518' }}>
                  <span>Total</span>
                  <span className="font-mono">{fmt(total)}</span>
                </div>

                {showDiscountInput && (
                  <div className="flex gap-2 mb-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="%"
                      value={discountInput}
                      onChange={e => setDiscountInput(e.target.value)}
                      className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm font-mono text-white placeholder-white/30 outline-none focus:border-yellow-400"
                    />
                    <button
                      onClick={applyDiscount}
                      className="px-3 py-1.5 rounded-lg bg-yellow-400 text-yellow-900 font-bold text-xs cursor-pointer hover:bg-yellow-300 transition-colors"
                    >
                      OK
                    </button>
                  </div>
                )}

                <button
                  onClick={() => (rule.payUpfront ? setPaying({ kind: 'cart' }) : submitOrder(null))}
                  disabled={!ready}
                  className="w-full py-3.5 rounded-2xl font-black text-white text-base uppercase tracking-wide transition-all cursor-pointer disabled:opacity-35 disabled:cursor-default mb-2.5"
                  style={{
                    background: rule.payUpfront
                      ? ready
                        ? '#22c55e'
                        : '#166534'
                      : ready
                      ? '#d97706'
                      : '#78350f',
                    boxShadow: ready
                      ? `0 5px 18px ${rule.payUpfront ? 'rgba(34,197,94,0.38)' : 'rgba(217,119,6,0.4)'}`
                      : 'none',
                  }}
                >
                  {rule.payUpfront ? `COBRAR ${ready ? fmt(total) : ''}` : '👨‍🍳 ENVIAR A COCINA'}
                </button>

                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => setShowDiscountInput(v => !v)}
                    disabled={order.length === 0}
                    className="text-xs font-semibold transition-colors cursor-pointer disabled:opacity-30"
                    style={{ color: '#F5C518' }}
                  >
                    Descuento {discount > 0 && `(${discount}%)`}
                  </button>
                  <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>·</span>
                  <button
                    onClick={clearCart}
                    disabled={!ready}
                    className="text-xs font-semibold text-red-400 hover:text-red-300 transition-colors cursor-pointer disabled:opacity-30"
                  >
                    Vaciar
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── COMANDAS TAB ── */}
          {rightTab === 'comandas' && (
            <>
              <div className="px-4 pt-3 pb-2 shrink-0 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-black text-base uppercase tracking-wide" style={{ color: '#F5C518' }}>
                    Comandas
                  </span>
                  <div className="flex items-center gap-2">
                    {closedCount > 0 && (
                      <button
                        onClick={clearClosed}
                        className="text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                        style={{
                          background: 'rgba(34,197,94,0.15)',
                          color: '#4ade80',
                          border: '1px solid rgba(34,197,94,0.35)',
                        }}
                      >
                        🧹 Limpiar ({closedCount})
                      </button>
                    )}
                    <span className="text-[10px] font-mono text-white/50">{activeCount} activas</span>
                  </div>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {STATUS_LIST.map(
                    s =>
                      countBy(s) > 0 && (
                        <span
                          key={s}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS[s].badge}`}
                        >
                          {countBy(s)} {STATUS[s].label}
                        </span>
                      )
                  )}
                </div>
              </div>
              <div className="mx-4 h-px mb-2 shrink-0" style={{ background: 'rgba(255,255,255,0.12)' }} />

              <div
                className="flex-1 overflow-y-auto px-3 pb-3 space-y-3"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(255,255,255,0.2) transparent',
                }}
              >
                {orders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 gap-3 opacity-40">
                    <span className="text-3xl">📋</span>
                    <span className="text-white/60 text-xs text-center leading-relaxed">
                      No hay órdenes
                      <br />
                      Toma un pedido para comenzar
                    </span>
                  </div>
                ) : (
                  orders.map(o => {
                    const st = STATUS[o.status]
                    const type = ORDER_TYPES[o.orderType]
                    const actions = nextActions(o)
                    const unpaid = o.payMethod === null && !isClosed(o.status)

                    return (
                      <div
                        key={o.id}
                        className="rounded-2xl overflow-hidden transition-all duration-300"
                        style={{
                          background: st.bg,
                          border: `1.5px solid ${st.border}`,
                          opacity: isClosed(o.status) ? 0.65 : 1,
                        }}
                      >
                        <div
                          className="flex items-center gap-2 px-3 pt-3 pb-2 border-b"
                          style={{ borderColor: 'rgba(255,255,255,0.08)' }}
                        >
                          <span className="font-mono font-black text-base" style={{ color: '#F5C518' }}>
                            {o.id}
                          </span>
                          <span className="text-[11px] font-bold text-white/70 bg-white/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                            {type.icon} {type.label}
                          </span>
                          <div className="flex-1" />
                          <span className="text-[10px] font-mono text-white/40">{o.time}</span>
                        </div>

                        <div className="px-3 py-2 text-[11px] text-white/80 leading-relaxed">
                          {o.items.map(i => (
                            <div key={i.uid} className="flex justify-between">
                              <span>
                                {i.qty}× {i.item.name}
                                {i.size ? ` (${i.size})` : ''}
                                {i.dough ? ` · ${i.dough}` : ''}
                              </span>
                              <span className="font-mono text-white/60">{fmt(i.finalPrice * i.qty)}</span>
                            </div>
                          ))}
                        </div>

                        <div
                          className="flex items-center justify-between px-3 py-2"
                          style={{ background: 'rgba(0,0,0,0.2)' }}
                        >
                          <span className="text-[10px] font-black text-white/70 uppercase tracking-wider">
                            {st.label}
                            {unpaid ? ' · por cobrar' : ''}
                          </span>
                          <span className="font-mono font-black text-white">{fmt(o.total)}</span>
                        </div>

                        <div className="p-3 pt-2 space-y-2">
                          {actions.length > 0 && (
                            <div className={`grid gap-2 ${actions.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                              {actions.map(a => {
                                const tone = TONE[a.tone]
                                return (
                                  <button
                                    key={a.label}
                                    onClick={() =>
                                      a.charge
                                        ? setPaying({ kind: 'order', id: o.id })
                                        : a.to && advance(o.id, a.to)
                                    }
                                    className="py-3 rounded-xl font-black text-[11px] uppercase tracking-wide transition-all cursor-pointer"
                                    style={{
                                      background: tone.background,
                                      color: tone.color,
                                      boxShadow: `0 4px 14px ${tone.shadow}`,
                                    }}
                                  >
                                    {a.icon} {a.label}
                                  </button>
                                )
                              })}
                            </div>
                          )}

                          {canCancel(o) && (
                            <button
                              onClick={() => setCancelTarget(o)}
                              className="w-full py-1.5 rounded-lg text-[11px] font-bold text-red-300/80 hover:text-red-200 border border-red-400/25 hover:bg-red-500/10 transition-colors cursor-pointer"
                            >
                              🚫 Cancelar pedido
                            </button>
                          )}

                          {o.status === 'entregado' && (
                            <div className="text-center py-1 text-[11px] font-bold text-green-300/80 uppercase tracking-widest">
                              ✓ Orden finalizada
                            </div>
                          )}
                          {o.status === 'cancelado' && (
                            <div className="text-center py-1 text-[11px] font-bold text-red-300/80 leading-snug">
                              🚫 Cancelada{o.cancelReason ? ` · ${o.cancelReason}` : ''}
                              {o.refund ? (
                                <div className="font-mono text-yellow-300/90">Devolver {fmt(o.refund)}</div>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Customizer modal */}
      {customizing && (
        <CustomizerModal
          item={customizing}
          onConfirm={confirmCustomize}
          onClose={() => setCustomizing(null)}
        />
      )}

      {/* Cancel dialog */}
      {cancelTarget && (
        <CancelDialog
          order={cancelTarget}
          onConfirm={confirmCancel}
          onClose={() => setCancelTarget(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 border border-gray-700 text-white px-5 py-3 rounded-2xl font-semibold shadow-2xl z-50 text-sm">
          {toast}
        </div>
      )}
    </div>
  )
}
