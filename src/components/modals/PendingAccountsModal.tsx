import { OrdersStore } from '../../types'
import { isClosed, ORDER_TYPES, STATUS } from '../../constants/orderRules'
import { fmt } from '../../utils/formatters'
import { X, Clock, Banknote } from 'lucide-react'

interface PendingAccountsModalProps {
  ordersStore: OrdersStore
  onClose: () => void
  onPayOrder: (orderId: string) => void
}

export function PendingAccountsModal({ ordersStore, onClose, onPayOrder }: PendingAccountsModalProps) {
  const pendingOrders = ordersStore.orders.filter(o => !isClosed(o.status) && o.payMethod === null)

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 md:p-8">
      <div className="bg-[#121212] w-full max-w-5xl h-full max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-gray-800">
        <div className="flex items-center justify-between p-6 border-b border-gray-800 shrink-0 bg-[#1a1a1a]">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-black text-white tracking-tight">Cuentas en Espera</h2>
            <span className="bg-amber-500/20 text-amber-500 text-xs font-bold px-3 py-1 rounded-full border border-amber-500/30">
              {pendingOrders.length} {pendingOrders.length === 1 ? 'cuenta' : 'cuentas'}
            </span>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 transparent' }}>
          {pendingOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-4">
              <Clock size={48} className="opacity-20" />
              <p className="text-lg">No hay cuentas pendientes por cobrar.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingOrders.map(order => {
                const type = ORDER_TYPES[order.orderType]
                const status = STATUS[order.status]
                
                return (
                  <div key={order.id} className="bg-[#1a1a1a] border border-gray-800 rounded-2xl flex flex-col hover:border-gray-600 transition-colors">
                    <div className="p-4 border-b border-gray-800 flex justify-between items-start">
                      <div>
                        <div className="font-mono text-xl font-black text-white mb-1">{order.id}</div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-400 bg-gray-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                            {type.icon} {type.label}
                          </span>
                          <span className="text-gray-500 flex items-center gap-1">
                            <Clock size={12} /> {order.time}
                          </span>
                        </div>
                      </div>
                      <div className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${status.badge} uppercase tracking-wider`}>
                        {status.label}
                      </div>
                    </div>
                    
                    <div className="p-4 flex-1 text-sm text-gray-300">
                      {order.client?.name && (
                        <div className="mb-3 pb-3 border-b border-gray-800/50">
                          <div className="font-bold text-white">{order.client.name}</div>
                          {order.client.phone && <div className="text-gray-500 text-xs font-mono">{order.client.phone}</div>}
                          {order.client.address && <div className="text-gray-500 text-xs mt-1">{order.client.address}</div>}
                        </div>
                      )}
                      {order.table && (
                        <div className="mb-3 pb-3 border-b border-gray-800/50">
                          <span className="text-gray-500 text-xs uppercase">Mesa/Ref:</span> <span className="font-bold text-white">{order.table}</span>
                        </div>
                      )}
                      
                      <div className="space-y-1 mt-2">
                        {order.items.slice(0, 3).map(i => (
                          <div key={i.uid} className="flex justify-between">
                            <span className="truncate pr-2">{i.qty}x {i.item.name}</span>
                            <span className="font-mono text-gray-400 shrink-0">{fmt(i.finalPrice * i.qty)}</span>
                          </div>
                        ))}
                        {order.items.length > 3 && (
                          <div className="text-xs text-gray-500 italic mt-1">
                            + {order.items.length - 3} producto(s) más...
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-4 bg-[#121212] rounded-b-2xl border-t border-gray-800 flex items-center justify-between">
                      <div className="font-black text-xl text-yellow-500 font-mono">{fmt(order.total)}</div>
                      <button 
                        onClick={() => onPayOrder(order.id)}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors"
                      >
                        <Banknote size={16} /> Cobrar
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
