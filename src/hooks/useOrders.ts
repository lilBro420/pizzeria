import { useState } from 'react'
import { Order, OrderStatus, PayMethod, OrdersStore } from '../types'
import { SAMPLE_ORDERS } from '../data/sampleOrders'
import { canCancel, isClosed } from '../constants/orderRules'

const nextId = (orders: Order[]) =>
  `#${Math.max(4000, ...orders.map(o => parseInt(o.id.slice(1), 10))) + 1}`

export function useOrders(): OrdersStore {
  const [orders, setOrders] = useState<Order[]>(SAMPLE_ORDERS)

  const update = (id: string, fn: (o: Order) => Order) =>
    setOrders(prev => prev.map(o => (o.id === id ? fn(o) : o)))

  return {
    orders,
    create: (draft: Omit<Order, 'id'>) => {
      const id = nextId(orders)
      setOrders(prev => [{ ...draft, id }, ...prev])
      return id
    },
    setStatus: (id: string, status: OrderStatus) =>
      update(id, o => (isClosed(o.status) ? o : { ...o, status })),
    // Cobro de una orden pendiente (recoger / domicilio): la cobra y la finaliza
    collect: (id: string, payMethod: PayMethod) =>
      update(id, o =>
        o.payMethod === null && !isClosed(o.status) ? { ...o, payMethod, status: 'entregado' } : o
      ),
    cancel: (id: string, reason: string) =>
      update(id, o =>
        canCancel(o)
          ? { ...o, status: 'cancelado', cancelReason: reason, refund: o.payMethod ? o.total : 0 }
          : o
      ),
    clearClosed: () => setOrders(prev => prev.filter(o => !isClosed(o.status))),
  }
}
