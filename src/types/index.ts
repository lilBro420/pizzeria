export type Role = 'pos' | 'admin'
export type Category = 'Todo' | 'pizzas' | 'snacks' | 'bebidas' | 'paquetes' | 'Clientes'
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
  id: string | number
  name: string
  basePrice: number
  desc: string
  category: Category
  emoji: string
  isPackage?: boolean
  idPaquete?: number
  itemsIncluidos?: any[]
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

export interface Cliente {
  id_cliente: number
  celular: string
  nombre: string
  apellido?: string | null
  direccion_principal?: string | null
  referencias?: string | null
  entre_calles?: string | null
  codigo_postal?: string | null
  notas?: string | null
  total_ordenes?: number
}

export interface Order {
  id: string
  numericId?: number
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
  idCliente?: number | null
  clienteNombre?: string
  clienteApellido?: string
  clienteCelular?: string
  clienteDireccion?: string
  clienteReferencias?: string
  clienteNotas?: string
  fechaCreacion?: string
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
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  create: (
    draft: Omit<Order, 'id'>,
    paymentDetails?: { montoRecibido?: number; cambio?: number; propina?: number }
  ) => Promise<string>
  setStatus: (id: string, status: OrderStatus) => Promise<void>
  updateOrder: (id: string, updates: Partial<Order>) => Promise<void>
  collect: (
    id: string,
    payments: AppliedPayment[],
    paymentDetails?: { montoRecibido?: number; cambio?: number; propina?: number }
  ) => Promise<void>
  cancel: (id: string, reason: string) => Promise<void>
  clearClosed: () => void
}
