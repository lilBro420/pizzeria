export type Role = 'pos' | 'admin'
export type Category = 'pizzas' | 'snacks' | 'bebidas' | 'Clientes'
export type PayMethod = 'efectivo' | 'tarjeta' | 'transferencia'
export type OrderStatus = 'preparando' | 'listo' | 'en_reparto' | 'esperando' | 'entregado' | 'cancelado'
export type OrderType = 'local' | 'llevar' | 'recoger' | 'domicilio'
export type PizzaSize = 'Chica' | 'Mediana' | 'Grande'
export type PizzaDough = 'Delgada' | 'Gruesa' | 'Orilla Rellena'
export type Tone = 'yellow' | 'green' | 'purple' | 'orange' | 'ghost'

export interface MenuItem {
  id: string
  name: string
  basePrice: number
  desc: string
  category: Category
  emoji: string
}

export interface OrderItem {
  uid: string
  item: MenuItem
  qty: number
  size?: PizzaSize
  dough?: PizzaDough
  finalPrice: number
}

export interface Order {
  id: string
  items: OrderItem[]
  discount: number
  total: number
  payMethod: PayMethod | null // null = todavía sin cobrar (única fuente de verdad del cobro)
  status: OrderStatus
  time: string
  cashier: string
  orderType: OrderType
  cancelReason?: string
  refund?: number
}

export interface OrderAction {
  icon: string
  label: string
  tone: Tone
  to?: OrderStatus
  charge?: boolean
}

export interface OrdersStore {
  orders: Order[]
  create: (draft: Omit<Order, 'id'>) => string
  setStatus: (id: string, status: OrderStatus) => void
  collect: (id: string, payMethod: PayMethod) => void
  cancel: (id: string, reason: string) => void
  clearClosed: () => void
}
