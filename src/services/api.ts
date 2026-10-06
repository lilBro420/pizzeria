import {
  Category,
  Cliente,
  MenuItem,
  Order,
  OrderItem,
  OrderStatus,
  OrderType,
  PayMethod,
  PizzaDough,
  PizzaSize,
} from '../types'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

// ─── Adaptadores de Datos de Backend a Tipos del Frontend ───────────

export interface BackendProducto {
  id_producto: number
  nombre: string
  descripcion: string
  precio_base: string | number
  id_categoria: number
  categoria_nombre?: string
  emoji: string
  activo: boolean
}

export interface BackendPaquete {
  id_paquete: number
  nombre: string
  descripcion: string
  precio_paquete: string | number
  precio_individual: string | number
  imagen: string
  categoria_paquete?: string
  activo: boolean
  items_incluidos?: any[]
}

export interface BackendCategoria {
  id_categoria: number
  nombre: string
  orden: number
  activo: boolean
}

export interface BackendDetalle {
  id_detalle: number
  id_orden: number
  id_producto: number | null
  id_paquete: number | null
  cantidad: number
  tamano: PizzaSize | null
  masa: PizzaDough | null
  precio_unitario: string | number
  precio_final: string | number
  notas: string | null
  producto_nombre?: string
  producto_emoji?: string
  producto_desc?: string
  producto_precio_base?: string | number
  categoria_nombre?: string
  paquete_nombre?: string
  paquete_emoji?: string
  paquete_desc?: string
  paquete_precio?: string | number
}

export interface BackendOrden {
  id_orden: number
  folio: string
  id_cliente: number | null
  cliente_nombre?: string | null
  cliente_apellido?: string | null
  cliente_celular?: string | null
  cliente_direccion?: string | null
  cliente_referencias?: string | null
  cliente_notas?: string | null
  id_empleado: number
  cajero_nombre?: string | null
  tipo: OrderType
  estado_actual: OrderStatus
  subtotal: string | number
  descuento_total: string | number
  impuesto: string | number
  total: string | number
  metodo_pago: PayMethod | null
  pending_payment: boolean
  comentarios: string | null
  fecha_creacion: string
  fecha_entrega: string | null
  cancel_motivo?: string | null
  cancel_reembolso?: string | number | null
  items?: BackendDetalle[]
}

export function mapProductoToMenuItem(p: BackendProducto): MenuItem {
  const catMap: Record<string, Category> = {
    pizzas: 'pizzas',
    snacks: 'snacks',
    bebidas: 'bebidas',
    paquetes: 'paquetes',
  }
  const catRaw = (p.categoria_nombre || '').toLowerCase()
  const category: Category = catMap[catRaw] || (catRaw as Category) || 'pizzas'

  return {
    id: p.id_producto,
    name: p.nombre,
    basePrice: typeof p.precio_base === 'string' ? parseFloat(p.precio_base) : Number(p.precio_base),
    desc: p.descripcion || '',
    category,
    emoji: p.emoji || '🍕',
    isPackage: false,
  }
}

export function mapPaqueteToMenuItem(p: BackendPaquete): MenuItem {
  return {
    id: `paq-${p.id_paquete}`,
    idPaquete: p.id_paquete,
    name: p.nombre,
    basePrice: typeof p.precio_paquete === 'string' ? parseFloat(p.precio_paquete) : Number(p.precio_paquete),
    desc: p.descripcion || '',
    category: 'paquetes',
    emoji: p.imagen || '📦',
    isPackage: true,
    itemsIncluidos: p.items_incluidos || [],
  }
}

export function mapBackendOrdenToFrontend(o: BackendOrden): Order {
  const time = o.fecha_creacion
    ? new Date(o.fecha_creacion).toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '--:--'

  const items: OrderItem[] = (o.items || []).map(d => {
    const isPaq = Boolean(d.id_paquete)
    const item: MenuItem = {
      id: isPaq ? `paq-${d.id_paquete}` : (d.id_producto || d.id_detalle),
      idPaquete: d.id_paquete || undefined,
      isPackage: isPaq,
      name: d.producto_nombre || d.paquete_nombre || 'Producto',
      basePrice:
        typeof d.precio_unitario === 'string'
          ? parseFloat(d.precio_unitario)
          : Number(d.precio_unitario || 0),
      desc: d.producto_desc || d.paquete_desc || '',
      category: isPaq ? 'paquetes' : ((d.categoria_nombre?.toLowerCase() as Category) || 'pizzas'),
      emoji: d.producto_emoji || d.paquete_emoji || (isPaq ? '📦' : '🍕'),
    }

    return {
      uid: String(d.id_detalle),
      item,
      qty: d.cantidad,
      size: d.tamano || undefined,
      dough: d.masa || undefined,
      finalPrice:
        typeof d.precio_final === 'string'
          ? parseFloat(d.precio_final)
          : Number(d.precio_final || 0),
    }
  })

  return {
    id: o.folio || `#${o.id_orden}`,
    numericId: o.id_orden,
    items,
    discount:
      typeof o.descuento_total === 'string'
        ? parseFloat(o.descuento_total)
        : Number(o.descuento_total || 0),
    total: typeof o.total === 'string' ? parseFloat(o.total) : Number(o.total || 0),
    payMethod: o.metodo_pago,
    status: o.estado_actual,
    time,
    cashier: o.cajero_nombre || 'Cajero',
    orderType: o.tipo,
    cancelReason: o.cancel_motivo || undefined,
    refund:
      o.cancel_reembolso !== undefined && o.cancel_reembolso !== null
        ? typeof o.cancel_reembolso === 'string'
          ? parseFloat(o.cancel_reembolso)
          : Number(o.cancel_reembolso)
        : undefined,
    idCliente: o.id_cliente,
    clienteNombre: o.cliente_nombre || undefined,
    clienteApellido: o.cliente_apellido || undefined,
    clienteCelular: o.cliente_celular || undefined,
    clienteDireccion: o.cliente_direccion || undefined,
    clienteReferencias: o.cliente_referencias || undefined,
    clienteNotas: o.cliente_notas || undefined,
    fechaCreacion: o.fecha_creacion,
  }
}

// ─── API Client Endpoints ───────────────────────────────────────────

export const api = {
  // Comprobar salud
  async health(): Promise<{ ok: boolean; mensaje: string; db_time: string }> {
    const res = await fetch(`${API_BASE}/health`)
    if (!res.ok) throw new Error('Error al conectar con el backend')
    return res.json()
  },

  // Obtener categorías
  async getCategorias(): Promise<BackendCategoria[]> {
    const res = await fetch(`${API_BASE}/categorias`)
    if (!res.ok) throw new Error('Error al cargar categorías')
    const data = await res.json()
    return data.categorias || []
  },

  // Obtener productos y paquetes unificados para el POS
  async getProductos(): Promise<MenuItem[]> {
    const [prodRes, paqRes] = await Promise.all([
      fetch(`${API_BASE}/productos`),
      fetch(`${API_BASE}/paquetes`),
    ])

    if (!prodRes.ok) throw new Error('Error al cargar productos')
    const prodData = await prodRes.json()
    const prods = (prodData.productos || []).map(mapProductoToMenuItem)

    let paqs: MenuItem[] = []
    if (paqRes.ok) {
      const paqData = await paqRes.json()
      paqs = (paqData.paquetes || []).map(mapPaqueteToMenuItem)
    }

    return [...prods, ...paqs]
  },

  // Obtener clientes
  async getClientes(search?: string): Promise<Cliente[]> {
    const url = search
      ? `${API_BASE}/clientes?search=${encodeURIComponent(search)}`
      : `${API_BASE}/clientes`
    const res = await fetch(url)
    if (!res.ok) throw new Error('Error al cargar clientes')
    const data = await res.json()
    return data.clientes || []
  },

  // Obtener órdenes
  async getOrdenes(): Promise<Order[]> {
    const res = await fetch(`${API_BASE}/ordenes`)
    if (!res.ok) throw new Error('Error al cargar órdenes')
    const data = await res.json()
    return (data.ordenes || []).map(mapBackendOrdenToFrontend)
  },

  // Crear orden
  async createOrden(payload: {
    tipo: OrderType
    subtotal: number
    descuentoTotal?: number
    impuesto?: number
    total: number
    metodoPago: PayMethod | null
    pendingPayment: boolean
    comentarios?: string
    idEmpleado?: number
    idCliente?: number | null
    items: {
      idProducto: number | string | null
      idPaquete?: number | null
      cantidad: number
      tamano?: PizzaSize
      masa?: PizzaDough
      precioUnitario: number
      precioFinal: number
      notas?: string
    }[]
    montoRecibido?: number | null
    cambio?: number
    propina?: number
  }): Promise<BackendOrden> {
    const res = await fetch(`${API_BASE}/ordenes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Error al crear orden')
    }
    const data = await res.json()
    return data.orden
  },

  // Actualizar estado de orden
  async updateEstado(
    id: string | number,
    estado: OrderStatus,
    idEmpleado = 2,
    notas?: string
  ): Promise<BackendOrden> {
    const res = await fetch(`${API_BASE}/ordenes/${encodeURIComponent(id)}/estado`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado, idEmpleado, notas }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Error al actualizar estado')
    }
    const data = await res.json()
    return data.orden
  },

  // Cobrar orden
  async pagarOrden(
    id: string | number,
    payload: {
      metodoPago: PayMethod
      montoRecibido?: number
      cambio?: number
      propina?: number
      idEmpleado?: number
    }
  ): Promise<BackendOrden> {
    const res = await fetch(`${API_BASE}/ordenes/${encodeURIComponent(id)}/pagar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Error al procesar cobro')
    }
    const data = await res.json()
    return data.orden
  },

  // Cancelar orden
  async cancelarOrden(
    id: string | number,
    motivo: string,
    idEmpleado = 2
  ): Promise<{ ok: boolean; orden: BackendOrden; refund?: number }> {
    const res = await fetch(`${API_BASE}/ordenes/${encodeURIComponent(id)}/cancelar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ motivo, idEmpleado }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Error al cancelar orden')
    }
    return res.json()
  },

  // Dashboard Stats
  async getDashboardStats() {
    const res = await fetch(`${API_BASE}/admin/dashboard`)
    if (!res.ok) throw new Error('Error al cargar métricas del dashboard')
    return res.json()
  },
}
