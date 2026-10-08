import {
  Catalogo,
  Categoria,
  Cliente,
  Configuracion,
  Mesa,
  NotaRapida,
  Orden,
  Paquete,
  Permiso,
  PizzaMasa,
  PizzaTamano,
  Producto,
  ResumenTurno,
  TipoOrden,
  UsuarioActual,
} from '../types'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

let authToken: string | null = localStorage.getItem('pos_token')

export function setToken(token: string | null) {
  authToken = token
  if (token) {
    localStorage.setItem('pos_token', token)
  } else {
    localStorage.removeItem('pos_token')
  }
}

export function getToken(): string | null {
  return authToken
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {})
  headers.set('Content-Type', 'application/json')
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`)
  }

  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    })
  } catch (err: any) {
    console.error('Error de red al conectar con API:', err)
    const msg = (err?.message || '').toLowerCase()
    if (msg.includes('load failed') || msg.includes('failed to fetch') || msg.includes('networkerror')) {
      throw new Error('No se pudo conectar con el servidor backend. Verifica que esté activo en el puerto 3001.')
    }
    throw err
  }

  let data: any = null
  try {
    data = await res.json()
  } catch {
    // Body is empty or not JSON
  }

  if (!res.ok) {
    if (res.status === 401) {
      setToken(null)
    }
    const message = data?.error || `Error ${res.status}: ${res.statusText}`
    throw new Error(message)
  }

  return data
}

export const api = {
  // ── Auth ──────────────────────────────────────────────
  async login(usuario: string, password: string): Promise<{ token: string; usuario: UsuarioActual }> {
    const data = await request<{ ok: boolean; token: string; usuario: UsuarioActual }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ usuario, password }),
    })
    setToken(data.token)
    return data
  },

  async me(): Promise<UsuarioActual> {
    const data = await request<{ ok: boolean; usuario: UsuarioActual }>('/auth/me')
    return data.usuario
  },

  logout() {
    setToken(null)
  },

  hasToken(): boolean {
    return Boolean(authToken)
  },

  getToken(): string | null {
    return authToken
  },

  // ── Catálogo (POS + Admin) ───────────────────────────
  async getCatalogo(todos = false): Promise<Catalogo> {
    const data = await request<{ ok: boolean } & Catalogo>(`/catalogo${todos ? '?todos=1' : ''}`)
    return {
      categorias: data.categorias,
      productos: data.productos,
      paquetes: data.paquetes,
      mesas: data.mesas,
      notasRapidas: data.notasRapidas,
      config: data.config,
    }
  },

  async getClientes(q = ''): Promise<Cliente[]> {
    const data = await request<{ ok: boolean; clientes: Cliente[] }>(`/clientes?q=${encodeURIComponent(q)}`)
    return data.clientes
  },

  // Categorías CRUD
  async createCategoria(payload: { nombre: string; color: string; orden?: number }): Promise<number> {
    const data = await request<{ ok: boolean; id: number }>('/categorias', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return data.id
  },

  async updateCategoria(id: number, payload: Partial<Categoria>): Promise<void> {
    await request(`/categorias/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  // Productos CRUD
  async createProducto(payload: {
    nombre: string
    descripcion?: string | null
    precio: number
    idCategoria: number
  }): Promise<number> {
    const data = await request<{ ok: boolean; id: number }>('/productos', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return data.id
  },

  async updateProducto(id: number, payload: Partial<Producto>): Promise<void> {
    await request(`/productos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  async deleteProducto(id: number): Promise<void> {
    await request(`/productos/${id}`, {
      method: 'DELETE',
    })
  },

  async reorderProductos(ids: number[]): Promise<void> {
    await request('/productos/orden', {
      method: 'PUT',
      body: JSON.stringify({ ids }),
    })
  },

  // Paquetes CRUD
  async createPaquete(payload: {
    nombre: string
    descripcion?: string | null
    precio: number
    items: { idProducto: number; cantidad: number }[]
  }): Promise<number> {
    const data = await request<{ ok: boolean; id: number }>('/paquetes', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return data.id
  },

  async updatePaquete(id: number, payload: Partial<Paquete>): Promise<void> {
    await request(`/paquetes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  async deletePaquete(id: number): Promise<void> {
    await request(`/paquetes/${id}`, {
      method: 'DELETE',
    })
  },

  // Configuración
  async updateConfiguracion(config: Record<string, string | number | boolean>): Promise<Configuracion> {
    const data = await request<{ ok: boolean; config: Configuracion }>('/configuracion', {
      method: 'PUT',
      body: JSON.stringify(config),
    })
    return data.config
  },

  // Mesas & Notas Rápidas
  async createMesa(texto: string): Promise<number> {
    const data = await request<{ ok: boolean; id: number }>('/mesas', {
      method: 'POST',
      body: JSON.stringify({ texto }),
    })
    return data.id
  },

  async updateMesa(id: number, payload: { texto?: string; activo?: boolean; orden?: number }): Promise<void> {
    await request(`/mesas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  async deleteMesa(id: number): Promise<void> {
    await request(`/mesas/${id}`, {
      method: 'DELETE',
    })
  },

  async createNotaRapida(texto: string): Promise<number> {
    const data = await request<{ ok: boolean; id: number }>('/notas-rapidas', {
      method: 'POST',
      body: JSON.stringify({ texto }),
    })
    return data.id
  },

  async updateNotaRapida(id: number, payload: { texto?: string; activo?: boolean; orden?: number }): Promise<void> {
    await request(`/notas-rapidas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  async deleteNotaRapida(id: number): Promise<void> {
    await request(`/notas-rapidas/${id}`, {
      method: 'DELETE',
    })
  },

  // ── Órdenes ──────────────────────────────────────────
  async getOrdenes(filtros?: {
    estado?: 'abierta' | 'cerrada' | 'cancelada'
    desde?: string
    hasta?: string
    q?: string
    limit?: number
  }): Promise<Orden[]> {
    const params = new URLSearchParams()
    if (filtros?.estado) params.set('estado', filtros.estado)
    if (filtros?.desde) params.set('desde', filtros.desde)
    if (filtros?.hasta) params.set('hasta', filtros.hasta)
    if (filtros?.q) params.set('q', filtros.q)
    if (filtros?.limit) params.set('limit', String(filtros.limit))

    const query = params.toString() ? `?${params.toString()}` : ''
    const data = await request<{ ok: boolean; ordenes: Orden[] }>(`/ordenes${query}`)
    return data.ordenes
  },

  async getOrden(id: number): Promise<Orden> {
    const data = await request<{ ok: boolean; orden: Orden }>(`/ordenes/${id}`)
    return data.orden
  },

  async createOrden(payload: {
    tipo: TipoOrden
    mesa?: string | null
    cliente?: {
      celular: string
      nombre: string
      apellido?: string | null
      direccion_principal?: string | null
      referencias?: string | null
    } | null
    idRepartidor?: number | null
    descuentoPct?: number
    comentarios?: string | null
    items: {
      idProducto?: number | null
      idPaquete?: number | null
      cantidad: number
      tamano?: PizzaTamano | null
      masa?: PizzaMasa | null
      notas?: string | null
    }[]
    pagos?: {
      metodo: 'efectivo' | 'dolares' | 'tarjeta' | 'transferencia'
      monto: number
      montoRecibido?: number | null
    }[] | null
    propina?: number
    claveIdempotencia?: string | null
  }): Promise<Orden> {
    const data = await request<{ ok: boolean; orden: Orden }>('/ordenes', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return data.orden
  },

  async pagarOrden(
    id: number,
    payload: {
      pagos: {
        metodo: 'efectivo' | 'dolares' | 'tarjeta' | 'transferencia'
        monto: number
        montoRecibido?: number | null
      }[]
      propina?: number
    }
  ): Promise<Orden> {
    const data = await request<{ ok: boolean; orden: Orden }>(`/ordenes/${id}/pagar`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return data.orden
  },

  async asignarRepartidor(id: number, idRepartidor: number | null): Promise<void> {
    await request(`/ordenes/${id}/repartidor`, {
      method: 'PATCH',
      body: JSON.stringify({ idRepartidor }),
    })
  },

  async cancelarOrden(
    id: number,
    payload: {
      motivo: string
      categoria: string
      autoriza?: { usuario: string; password: string } | null
    }
  ): Promise<Orden> {
    const data = await request<{ ok: boolean; orden: Orden }>(`/ordenes/${id}/cancelar`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return data.orden
  },

  // ── Cocina (KDS) ─────────────────────────────────────
  async getComandas(impresas = false): Promise<{
    pendientes: Orden[]
    canceladas: Orden[]
    impresas: Orden[]
  }> {
    const data = await request<{
      ok: boolean
      pendientes: Orden[]
      canceladas: Orden[]
      impresas: Orden[]
    }>(`/cocina/comandas${impresas ? '?impresas=1' : ''}`)
    return data
  },

  async imprimirComanda(id: number): Promise<Orden> {
    const data = await request<{ ok: boolean; orden: Orden }>(`/cocina/comandas/${id}/imprimir`, {
      method: 'POST',
    })
    return data.orden
  },

  // ── Turnos ───────────────────────────────────────────
  async getTurnoActual(): Promise<ResumenTurno | null> {
    const data = await request<{ ok: boolean; turno: ResumenTurno | null }>('/turnos/actual')
    return data.turno
  },

  async abrirTurno(fondoInicial = 0): Promise<ResumenTurno> {
    const data = await request<{ ok: boolean; turno: ResumenTurno }>('/turnos/abrir', {
      method: 'POST',
      body: JSON.stringify({ fondoInicial }),
    })
    return data.turno
  },

  async corteParcial(): Promise<ResumenTurno> {
    const data = await request<{ ok: boolean; corte: ResumenTurno }>('/turnos/corte')
    return data.corte
  },

  async cerrarTurno(payload: { efectivoContado: number; notas?: string | null }): Promise<ResumenTurno> {
    const data = await request<{ ok: boolean; corte: ResumenTurno }>('/turnos/cerrar', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return data.corte
  },

  // ── Admin Dashboard & Usuarios ───────────────────────
  async getDashboard(filtros?: { desde?: string; hasta?: string }): Promise<any> {
    const params = new URLSearchParams()
    if (filtros?.desde) params.set('desde', filtros.desde)
    if (filtros?.hasta) params.set('hasta', filtros.hasta)
    const query = params.toString() ? `?${params.toString()}` : ''
    const data = await request<{ ok: boolean } & any>(`/admin/dashboard${query}`)
    return data
  },

  async getUsuarios(): Promise<any[]> {
    const data = await request<{ ok: boolean; usuarios: any[] }>('/usuarios')
    return data.usuarios
  },

  async getRepartidores(): Promise<{ id: number; nombre: string }[]> {
    const data = await request<{ ok: boolean; repartidores: { id: number; nombre: string }[] }>('/usuarios/repartidores')
    return data.repartidores
  },

  async getPermisos(): Promise<Record<string, string>> {
    const data = await request<{ ok: boolean; permisos: Record<string, string> }>('/usuarios/permisos')
    return data.permisos
  },

  async createUsuario(payload: any): Promise<number> {
    const data = await request<{ ok: boolean; id: number }>('/usuarios', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return data.id
  },

  async updateUsuario(id: number, payload: any): Promise<void> {
    await request(`/usuarios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
}
