import { useState } from 'react'
import { Order, OrderStatus, PayMethod, OrdersStore, AppliedPayment } from '../types'
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
    updateOrder: (id: string, updates: Partial<Order>) =>
      update(id, o => ({ ...o, ...updates })),
    // Cobro de una orden pendiente (recoger / domicilio): la cobra y la finaliza
    collect: (id: string, payments: AppliedPayment[]) =>
      update(id, o => {
        if (o.payMethod !== null || isClosed(o.status)) return o
        const mainMethod = payments.length > 0 ? payments[0].method : 'efectivo'
        return { ...o, payMethod: mainMethod, appliedPayments: payments, status: 'entregado' }
      }),
    cancel: (id: string, reason: string) =>
      update(id, o =>
        canCancel(o)
          ? { ...o, status: 'cancelado', cancelReason: reason, refund: o.payMethod ? o.total : 0 }
          : o
      ),
    clearClosed: () => setOrders(prev => prev.filter(o => !isClosed(o.status))),
  }
}
