// Tipos unificados del sistema POS clásico (Soft Restaurant)

export type Rol = 'admin' | 'cajero' | 'cocinero' | 'repartidor'

export type Permiso =
  | 'vender'
  | 'cobrar'
  | 'descuentos'
  | 'cancelar'
  | 'turnos'
  | 'reportes'
  | 'menu'
  | 'usuarios'
  | 'configuracion'
  | 'cocina'
  | 'entregas'

export interface UsuarioActual {
  id: number
  nombre: string
  usuario: string
  rol: Rol
  permisos: Permiso[]
}

export type TipoOrden = 'local' | 'llevar' | 'recoger' | 'domicilio'
export type EstadoOrden = 'abierta' | 'cerrada' | 'cancelada'
export type MetodoPago = 'efectivo' | 'tarjeta' | 'transferencia' | 'mixto'
export type PizzaTamano = 'Chica' | 'Mediana' | 'Grande'
export type PizzaMasa = 'Delgada' | 'Gruesa' | 'Orilla Rellena'

export interface Categoria {
  id: number
  nombre: string
  color: string
  orden: number
  activo: boolean
}

export interface Producto {
  id: number
  nombre: string
  descripcion: string | null
  precio: number
  idCategoria: number
  orden: number
  activo: boolean
}

export interface PaqueteItem {
  idProducto: number
  nombre: string
  cantidad: number
}

export interface Paquete {
  id: number
  nombre: string
  descripcion: string | null
  precio: number
  precioIndividual: number | null
  orden: number
  activo: boolean
  items: PaqueteItem[]
}

export interface Mesa {
  id: number
  nombre: string
  orden: number
  activo: boolean
}

export interface NotaRapida {
  id: number
  texto: string
  orden: number
  activo: boolean
}

export interface Configuracion {
  nombreNegocio: string
  ivaTasa: number
  ivaIncluido: boolean
  extras: Record<string, number>
  ticketPie: string
  zona: string
}

export interface Catalogo {
  categorias: Categoria[]
  productos: Producto[]
  paquetes: Paquete[]
  mesas: Mesa[]
  notasRapidas: NotaRapida[]
  config: Configuracion
}

export interface Cliente {
  id?: number
  celular: string
  nombre: string
  apellido?: string | null
  direccion?: string | null
  referencias?: string | null
  notas?: string | null
  ordenes?: number
}

// Línea en el ticket / orden
export interface DetalleOrden {
  id?: number // id_detalle al guardar
  uid: string // id local único en el carrito
  idProducto?: number | null
  idPaquete?: number | null
  nombre: string
  categoria?: string
  cantidad: number
  tamano?: PizzaTamano | null
  masa?: PizzaMasa | null
  notas?: string | null
  precioUnitario: number
  precioFinal: number
}

export interface PagoAplicado {
  metodo: MetodoPago
  monto: number
  montoRecibido?: number | null
  cambio?: number | null
  propina?: number | null
  fecha?: string
}

export interface Orden {
  id: number
  folio: string
  tipo: TipoOrden
  estado: EstadoOrden
  mesa: string | null
  comentarios: string | null
  subtotal: number
  descuentoPct: number
  descuento: number
  impuesto: number
  total: number
  metodoPago: MetodoPago | null
  pendientePago: boolean
  fechaCreacion: string
  fechaCierre: string | null
  comandaImpresa: string | null
  cajero: { id: number; nombre: string }
  repartidor: { id: number; nombre: string } | null
  cliente: Cliente | null
  cancelacion: { motivo: string; categoria: string; reembolso: number } | null
  items: DetalleOrden[]
  pagos: PagoAplicado[]
}

export interface ResumenTurno {
  id: number
  apertura: string
  cierre: string | null
  fondoInicial: number
  ventasPorMetodo: { metodo: MetodoPago; total: number; pagos: number; propinas: number }[]
  totalVentas: number
  propinas: number
  cancelaciones: { n: number; monto: number }
  cuentasEnEspera: { n: number; monto: number }
  efectivoEsperado: number
  efectivoContado: number | null
  notas: string | null
}
