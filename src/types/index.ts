export type Role = 'pos' | 'admin'
export type Category = 'Todo' | 'pizzas' | 'snacks' | 'bebidas' | 'Clientes'
export type PayMethod = 'efectivo' | 'tarjeta' | 'transferencia'
export type OrderStatus = 'preparando' | 'listo' | 'en_reparto' | 'esperando' | 'entregado' | 'cancelado'
export type OrderType = 'local' | 'llevar' | 'recoger' | 'domicilio'
export type PizzaSize = 'Chica' | 'Mediana' | 'Grande'
export type PizzaDough = 'Delgada' | 'Gruesa' | 'Orilla Rellena'
export type Tone = 'yellow' | 'green' | 'purple' | 'orange' | 'ghost'

export interface Client {
  phone: string
  name: string
  address: string
}

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
  comments?: string
  finalPrice: number
}

export interface AppliedPayment {
  method: PayMethod
  amount: number
}

export interface Order {
  id: string
  items: OrderItem[]
  discount: number
  total: number
  payMethod: PayMethod | null // Mantenemos null cuando no hay ningún pago aún
  appliedPayments?: AppliedPayment[] // Array de pagos divididos
  status: OrderStatus
  time: string
  cashier: string
  orderType: OrderType
  table?: string // Número de mesa para 'local' o 'llevar'
  client?: Client // Cliente para 'domicilio' o 'recoger'
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
  updateOrder: (id: string, updates: Partial<Order>) => void
  collect: (id: string, payments: AppliedPayment[]) => void
  cancel: (id: string, reason: string) => void
  clearClosed: () => void
}
