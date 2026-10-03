import { MenuItem, OrderItem, Order, PizzaSize, PizzaDough } from '../types'
import { SIZE_EXTRA, DOUGH_EXTRA, TAX } from '../data/menu'

export const fmt = (n: number) => `$${n.toFixed(2)}`

export const uid = () => Math.random().toString(36).slice(2, 8)

export const nowTime = () =>
  new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

export const unitPrice = (item: MenuItem, size?: PizzaSize, dough?: PizzaDough) =>
  item.basePrice + (size ? SIZE_EXTRA[size] : 0) + (dough ? DOUGH_EXTRA[dough] : 0)

export const calcTotals = (items: OrderItem[], discount = 0) => {
  const subtotal = items.reduce((s, i) => s + i.finalPrice * i.qty, 0)
  const discountAmt = subtotal * (discount / 100)
  return { subtotal, discountAmt, total: (subtotal - discountAmt) * (1 + TAX) }
}

export const itemsSummary = (o: Order) =>
  o.items.map(i => `${i.qty}× ${i.item.name}`).join(', ') || 'Sin detalle'
