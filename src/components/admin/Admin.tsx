import { useState } from 'react'
import { Category, Order, OrderStatus, OrdersStore } from '../../types'
import { MenuStore } from '../../hooks/useMenu'
import {
  ALL_PAY,
  ORDER_TYPES,
  PAY,
  STATUS,
  STATUS_LIST,
  canCancel,
  nextActions,
} from '../../constants/orderRules'
import { fmt, itemsSummary } from '../../utils/formatters'
import { Badge } from '../common/Badge'
import { CancelDialog } from '../modals/CancelDialog'
import { Edit2, Check, X, LayoutDashboard, ListOrdered, UtensilsCrossed, CircleDollarSign, CookingPot, CheckCircle2, Bike } from 'lucide-react'

interface AdminProps {
  onLogout: () => void
  ordersStore: OrdersStore
  menuStore: MenuStore
}

export function Admin({ onLogout, ordersStore, menuStore }: AdminProps) {
  const { orders } = ordersStore
  const { items: MENU, updateItem } = menuStore
  const [filter, setFilter] = useState<OrderStatus | 'todos'>('todos')
  const [tab, setTab] = useState<'dashboard' | 'pedidos' | 'menu'>('dashboard')
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null)
  
  // Menu Editing State
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [editPrice, setEditPrice] = useState<string>('')
  const [editName, setEditName] = useState<string>('')

  const count = (s: OrderStatus) => orders.filter(o => o.status === s).length
  const delivered = orders.filter(o => o.status === 'entregado')
  const totalVentas = delivered.reduce((s, o) => s + o.total, 0)
  const preparando = count('preparando')
  const listos = count('listo')
  const enCamino = count('en_reparto') + count('esperando')
  const cancelados = count('cancelado')
  const reembolsos = orders.reduce((s, o) => s + (o.refund ?? 0), 0)
  const filtered = orders.filter(o => filter === 'todos' || o.status === filter)

  // Top productos reales
  const sold = new Map<string, number>()
  orders
    .filter(o => o.status !== 'cancelado')
    .forEach(o =>
      o.items.forEach(i => sold.set(i.item.id, (sold.get(i.item.id) ?? 0) + i.qty))
    )
  const topProducts = [...sold.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .flatMap(([id, qty]) => {
      const item = MENU.find(m => m.id === id)
      return item ? [{ item, qty }] : []
    })

  const startEdit = (item: any) => {
    setEditingItem(item.id)
    setEditPrice(item.basePrice.toString())
    setEditName(item.name)
  }

  const saveEdit = () => {
    if (editingItem) {
      updateItem(editingItem, { 
        basePrice: parseFloat(editPrice) || 0,
        name: editName
      })
      setEditingItem(null)
    }
  }

  return (
    <div
      className="flex flex-col h-screen bg-[#080808] overflow-hidden"
      style={{ fontFamily: "'Work Sans', system-ui, sans-serif" }}
    >
      <header className="flex items-center justify-between px-4 h-12 border-b border-[#272727] bg-[#0e0e0e] shrink-0">
        <div className="flex items-center gap-2">
          <UtensilsCrossed size={18} className="text-white" />
          <span className="font-bold text-white text-sm">Pizzería Volcán</span>
          <span className="text-[#404040] text-xs font-mono ml-2">Admin · Patrón</span>
        </div>
        <button
          onClick={onLogout}
          className="text-xs text-[#8a8a8a] hover:text-white transition-colors px-2 py-1 rounded border border-[#272727] hover:border-[#404040] cursor-pointer"
        >
          Salir
        </button>
      </header>

      <div className="flex border-b border-[#272727] bg-[#0e0e0e] shrink-0 px-2">
        <button
          onClick={() => setTab('dashboard')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors cursor-pointer border-b-2 ${
            tab === 'dashboard' ? 'text-white border-[#C41E3A]' : 'text-[#8a8a8a] border-transparent hover:text-white'
          }`}
        >
          <LayoutDashboard size={16} /> Dashboard
        </button>
        <button
          onClick={() => setTab('pedidos')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors cursor-pointer border-b-2 ${
            tab === 'pedidos' ? 'text-white border-[#C41E3A]' : 'text-[#8a8a8a] border-transparent hover:text-white'
          }`}
        >
          <ListOrdered size={16} /> Pedidos
        </button>
        <button
          onClick={() => setTab('menu')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors cursor-pointer border-b-2 ${
            tab === 'menu' ? 'text-white border-[#C41E3A]' : 'text-[#8a8a8a] border-transparent hover:text-white'
          }`}
        >
          <UtensilsCrossed size={16} /> Menú
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6" style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 transparent' }}>
        {tab === 'dashboard' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Resumen del día</h2>
              <p className="text-[#8a8a8a] text-sm mt-1 font-mono">
                {new Date().toLocaleDateString('es-MX', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-[#141414] border border-[#272727] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[#8a8a8a] text-xs font-medium uppercase tracking-wider">Ventas del día</span>
                  <CircleDollarSign className="text-green-400" size={20} />
                </div>
                <div className="text-2xl font-bold font-mono text-green-400">{fmt(totalVentas)}</div>
                <div className="text-[#404040] text-xs mt-1">{delivered.length} entregadas · {cancelados} canceladas{reembolsos > 0 ? ` · reembolsos ${fmt(reembolsos)}` : ''}</div>
              </div>
              
              <div className="bg-[#141414] border border-[#272727] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[#8a8a8a] text-xs font-medium uppercase tracking-wider">En preparación</span>
                  <CookingPot className="text-amber-400" size={20} />
                </div>
                <div className="text-2xl font-bold font-mono text-amber-400">{preparando}</div>
                <div className="text-[#404040] text-xs mt-1">en cocina</div>
              </div>

              <div className="bg-[#141414] border border-[#272727] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[#8a8a8a] text-xs font-medium uppercase tracking-wider">Listos</span>
                  <CheckCircle2 className="text-blue-400" size={20} />
                </div>
                <div className="text-2xl font-bold font-mono text-blue-400">{listos}</div>
                <div className="text-[#404040] text-xs mt-1">esperando salida</div>
              </div>

              <div className="bg-[#141414] border border-[#272727] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[#8a8a8a] text-xs font-medium uppercase tracking-wider">En camino</span>
                  <Bike className="text-purple-400" size={20} />
                </div>
                <div className="text-2xl font-bold font-mono text-purple-400">{enCamino}</div>
                <div className="text-[#404040] text-xs mt-1">reparto o esperando</div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#141414] border border-[#272727] rounded-xl p-5">
                <h3 className="font-semibold text-white mb-4">Ventas por forma de pago</h3>
                {ALL_PAY.map(pm => {
                  const pmTotal = delivered
                    .filter(o => o.payMethod === pm)
                    .reduce((s, o) => s + o.total, 0)
                  const pct = totalVentas > 0 ? (pmTotal / totalVentas) * 100 : 0
                  return (
                    <div key={pm} className="mb-3">
                      <div className="flex justify-between mb-1 text-sm">
                        <div className="flex items-center gap-2 text-[#d0d0d0]">
                          <span>{PAY[pm].icon}</span>
                          <span>{PAY[pm].label}</span>
                        </div>
                        <span className="font-mono text-white">{fmt(pmTotal)}</span>
                      </div>
                      <div className="h-1.5 bg-[#1c1c1c] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#C41E3A] rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="bg-[#141414] border border-[#272727] rounded-xl p-5">
                <h3 className="font-semibold text-white mb-4">Top productos</h3>
                {topProducts.length === 0 && (
                  <div className="text-[#404040] text-sm py-2">Aún no hay ventas</div>
                )}
                {topProducts.map(({ item, qty }, idx) => (
                  <div key={item.id} className="flex items-center gap-3 py-1.5">
                    <span className="text-[#404040] font-mono text-xs w-4">{idx + 1}</span>
                    <span>{item.emoji}</span>
                    <span className="flex-1 text-sm text-[#d0d0d0]">{item.name}</span>
                    <span className="font-mono text-sm text-[#C41E3A]">{qty}×</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-[#141414] border border-[#272727] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#1e1e1e]">
                <h3 className="font-semibold text-white">Últimos pedidos</h3>
              </div>
              <div className="divide-y divide-[#1e1e1e]">
                {orders.slice(0, 5).map(o => (
                  <div key={o.id} className="flex items-center gap-4 px-5 py-3">
                    <span className="font-mono text-sm font-bold text-[#C41E3A] w-14 shrink-0">
                      {o.id}
                    </span>
                    <span className="text-[#8a8a8a] font-mono text-xs w-12 shrink-0">{o.time}</span>
                    <span className="text-[#8a8a8a] text-xs">· {o.cashier}</span>
                    <div className="flex-1" />
                    <span className="font-mono text-sm text-white w-20 text-right shrink-0">
                      {fmt(o.total)}
                    </span>
                    <Badge status={o.status} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'pedidos' && (
          <div className="max-w-5xl mx-auto space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-xl font-bold text-white">Gestión de pedidos</h2>
              <div className="flex gap-1.5 flex-wrap">
                {(['todos', ...STATUS_LIST] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setFilter(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer capitalize ${
                      filter === s
                        ? 'bg-[#C41E3A] text-white'
                        : 'bg-[#141414] border border-[#272727] text-[#8a8a8a] hover:text-white'
                    }`}
                  >
                    {s === 'todos' ? 'Todos' : STATUS[s].label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              {filtered.map(o => {
                const type = ORDER_TYPES[o.orderType]
                const all = nextActions(o)
                const actions = all.filter(a => !a.charge)
                const awaitingCharge = o.payMethod === null && o.status !== 'entregado' && o.status !== 'cancelado'
                return (
                  <div
                    key={o.id}
                    className="bg-[#141414] border border-[#272727] rounded-xl overflow-hidden"
                  >
                    <div className="flex items-center gap-4 px-4 py-3 border-b border-[#1e1e1e] flex-wrap">
                      <span className="font-mono font-bold text-[#C41E3A]">{o.id}</span>
                      <span className="text-[#8a8a8a] font-mono text-xs">{o.time}</span>
                      <span className="text-[#8a8a8a] text-xs">· {o.cashier}</span>
                      <div className="flex-1" />
                      <Badge status={o.status} />
                      <div className="flex gap-2 flex-wrap">
                        {actions.map(a => (
                          <button
                            key={a.label}
                            onClick={() => a.to && ordersStore.setStatus(o.id, a.to)}
                            className="text-xs px-3 py-1.5 bg-[#C41E3A] hover:bg-[#a01830] text-white rounded-lg font-medium transition-colors cursor-pointer"
                          >
                            {a.label}
                          </button>
                        ))}
                        {awaitingCharge && (
                          <span className="text-xs px-3 py-1.5 rounded-lg border border-amber-500/30 text-amber-400">
                            Cobro pendiente en caja
                          </span>
                        )}
                        {canCancel(o) && (
                          <button
                            onClick={() => setCancelTarget(o)}
                            className="text-xs px-3 py-1.5 bg-[#1c1c1c] border border-[#272727] text-[#8a8a8a] hover:text-red-400 hover:border-red-800 rounded-lg font-medium transition-colors cursor-pointer"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="px-4 py-3 flex flex-wrap gap-3 items-end justify-between">
                      <div className="text-sm text-[#d0d0d0]">
                        {type.icon} {itemsSummary(o)}
                        {o.status === 'cancelado' && o.cancelReason && (
                          <span className="text-red-400"> · {o.cancelReason}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[#8a8a8a] text-xs">
                          {o.payMethod ? PAY[o.payMethod].icon : '⏳'}
                        </span>
                        <span className="font-mono font-bold text-white">{fmt(o.total)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
              {filtered.length === 0 && (
                <div className="text-center py-16 text-[#404040]">
                  <div className="text-4xl mb-2">📋</div>
                  <div>Sin pedidos en esta categoría</div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'menu' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <h2 className="text-xl font-bold text-white">Gestión del menú</h2>
            {(['pizzas', 'snacks', 'bebidas'] as Category[]).map(cat => (
              <div key={cat}>
                <h3 className="font-semibold text-[#8a8a8a] uppercase tracking-widest text-xs font-mono mb-3 capitalize flex items-center justify-between">
                  {cat}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {MENU.filter(m => m.category === cat).map(item => (
                    <div
                      key={item.id}
                      className="bg-[#141414] border border-[#272727] rounded-xl p-4 hover:border-[#404040] transition-colors relative group flex flex-col"
                    >
                      {editingItem === item.id ? (
                        <div className="flex flex-col gap-2 h-full">
                          <input 
                            type="text" 
                            value={editName} 
                            onChange={e => setEditName(e.target.value)}
                            className="bg-[#080808] border border-[#272727] rounded px-2 py-1 text-sm text-white outline-none focus:border-[#C41E3A]" 
                          />
                          <input 
                            type="number" 
                            value={editPrice} 
                            onChange={e => setEditPrice(e.target.value)}
                            className="bg-[#080808] border border-[#272727] rounded px-2 py-1 text-sm font-mono text-[#C41E3A] outline-none focus:border-[#C41E3A]" 
                          />
                          <div className="flex gap-2 mt-auto pt-2">
                            <button onClick={saveEdit} className="flex-1 bg-green-600 hover:bg-green-500 text-white py-1 rounded text-xs font-bold flex justify-center items-center gap-1">
                              <Check size={14} /> Guardar
                            </button>
                            <button onClick={() => setEditingItem(null)} className="flex-1 bg-[#272727] hover:bg-[#404040] text-white py-1 rounded text-xs font-bold flex justify-center items-center gap-1">
                              <X size={14} /> Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button 
                            onClick={() => startEdit(item)}
                            className="absolute top-2 right-2 p-1.5 bg-[#272727] hover:bg-blue-600 rounded-md text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                          >
                            <Edit2 size={14} />
                          </button>
                          <div className="text-2xl mb-2">{item.emoji}</div>
                          <div className="font-semibold text-white text-sm">{item.name}</div>
                          <div className="text-[#8a8a8a] text-xs mt-0.5 line-clamp-2">{item.desc}</div>
                          <div
                            className="mt-auto font-mono font-bold text-sm pt-3"
                            style={{ color: '#C41E3A' }}
                          >
                            {fmt(item.basePrice)}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {cancelTarget && (
        <CancelDialog
          order={cancelTarget}
          onConfirm={reason => {
            ordersStore.cancel(cancelTarget.id, reason)
            setCancelTarget(null)
          }}
          onClose={() => setCancelTarget(null)}
        />
      )}
    </div>
  )
}
