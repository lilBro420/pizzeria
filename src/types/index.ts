export type Role = 'pos' | 'admin'
export type Category = 'pizzas' | 'snacks' | 'bebidas' | 'paquetes' | 'Clientes'
export type PayMethod = 'efectivo' | 'tarjeta' | 'transferencia'
export type OrderStatus = 'preparando' | 'listo' | 'en_reparto' | 'esperando' | 'entregado' | 'cancelado'
export type OrderType = 'local' | 'llevar' | 'recoger' | 'domicilio'
export type PizzaSize = 'Chica' | 'Mediana' | 'Grande'
export type PizzaDough = 'Delgada' | 'Gruesa' | 'Orilla Rellena'
export type Tone = 'yellow' | 'green' | 'purple' | 'orange' | 'ghost'

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
  finalPrice: number
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
  payMethod: PayMethod | null // null = todavía sin cobrar (única fuente de verdad del cobro)
  status: OrderStatus
  time: string
  cashier: string
  orderType: OrderType
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
  collect: (
    id: string,
    payMethod: PayMethod,
    paymentDetails?: { montoRecibido?: number; cambio?: number; propina?: number }
  ) => Promise<void>
  cancel: (id: string, reason: string) => Promise<void>
  clearClosed: () => void
}
