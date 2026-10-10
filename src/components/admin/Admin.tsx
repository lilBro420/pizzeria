import React, { useEffect, useState } from 'react'
import {
  Catalogo,
  Categoria,
  Orden,
  Producto,
  UsuarioActual,
} from '../../types'
import { api } from '../../services/api'
import { fmt, formatFecha } from '../../utils/formatters'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'
import { Dialog } from '../ui/Dialog'
import { CancelDialog } from '../modals/CancelDialog'
import { notifications } from '../../services/notifications'
import { BellIcon } from '../ui/Icons'

interface AdminProps {
  usuario: UsuarioActual
  onLogout: () => void
  onGoPOS?: () => void
  onGoCocina?: () => void
}

export function Admin({ usuario, onLogout, onGoPOS, onGoCocina }: AdminProps) {
  const [tab, setTab] = useState<
    'dashboard' | 'pedidos' | 'menu' | 'categorias' | 'config' | 'usuarios' | 'notificaciones'
  >('dashboard')
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default')
  const [notifMsg, setNotifMsg] = useState<string | null>(null)
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null)
  const [ordenes, setOrdenes] = useState<Orden[]>([])
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [usuariosList, setUsuariosList] = useState<any[]>([])
  const [permisosMap, setPermisosMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  // Modales
  const [cancelTarget, setCancelTarget] = useState<Orden | null>(null)
  const [editingProduct, setEditingProduct] = useState<Partial<Producto> | null>(null)
  const [editingCategoria, setEditingCategoria] = useState<Partial<Categoria> | null>(null)
  const [editingUsuario, setEditingUsuario] = useState<any | null>(null)
  const [newPasswordInput, setNewPasswordInput] = useState('')

  // Configuración
  const [configForm, setConfigForm] = useState<Record<string, any>>({})

  const reloadAll = async () => {
    try {
      setLoading(true)
      const [cat, ord, dash, usrs, perms] = await Promise.all([
        api.getCatalogo(true),
        api.getOrdenes({ limit: 100 }),
        api.getDashboard(),
        api.getUsuarios(),
        api.getPermisos(),
      ])
      setCatalogo(cat)
      setOrdenes(ord)
      setDashboardData(dash)
      setUsuariosList(usrs)
      setPermisosMap(perms)
      if (cat.config) {
        setConfigForm({
          nombre_negocio: cat.config.nombreNegocio,
          iva_tasa: cat.config.ivaTasa,
          iva_incluido: cat.config.ivaIncluido ? 'true' : 'false',
          extra_chica: cat.config.extras['Chica'] ?? -20,
          extra_grande: cat.config.extras['Grande'] ?? 30,
          extra_orilla_rellena: cat.config.extras['Orilla Rellena'] ?? 20,
          ticket_pie: cat.config.ticketPie,
        })
      }
    } catch (err: any) {
      console.error('Error al cargar datos de admin:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reloadAll()
  }, [])

  // Guardar producto
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProduct) return
    try {
      if (editingProduct.id) {
        await api.updateProducto(editingProduct.id, {
          nombre: editingProduct.nombre,
          descripcion: editingProduct.descripcion,
          precio: Number(editingProduct.precio),
          idCategoria: Number(editingProduct.idCategoria),
          activo: editingProduct.activo,
        })
      } else {
        await api.createProducto({
          nombre: editingProduct.nombre || '',
          descripcion: editingProduct.descripcion || null,
          precio: Number(editingProduct.precio) || 0,
          idCategoria: Number(editingProduct.idCategoria) || catalogo?.categorias[0]?.id || 1,
        })
      }
      setEditingProduct(null)
      await reloadAll()
    } catch (err: any) {
      alert(`Error al guardar producto: ${err.message}`)
    }
  }

  // Reordenar productos
  const handleMoveProduct = async (prod: Producto, dir: -1 | 1) => {
    if (!catalogo) return
    const sameCat = catalogo.productos.filter(p => p.idCategoria === prod.idCategoria)
    const idx = sameCat.findIndex(p => p.id === prod.id)
    if (idx < 0) return
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= sameCat.length) return

    const clone = [...sameCat]
    const [moved] = clone.splice(idx, 1)
    clone.splice(newIdx, 0, moved)

    try {
      await api.reorderProductos(clone.map(p => p.id))
      await reloadAll()
    } catch (err: any) {
      alert(`Error al reordenar: ${err.message}`)
    }
  }

  // Guardar categoría
  const handleSaveCategoria = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCategoria) return
    try {
      if (editingCategoria.id) {
        await api.updateCategoria(editingCategoria.id, {
          nombre: editingCategoria.nombre,
          color: editingCategoria.color,
          activo: editingCategoria.activo,
        })
      } else {
        await api.createCategoria({
          nombre: editingCategoria.nombre || '',
          color: editingCategoria.color || '#4B5563',
        })
      }
      setEditingCategoria(null)
      await reloadAll()
    } catch (err: any) {
      alert(`Error al guardar categoría: ${err.message}`)
    }
  }

  // Guardar configuración
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.updateConfiguracion(configForm)
      alert('Configuración actualizada en el servidor.')
      await reloadAll()
    } catch (err: any) {
      alert(`Error al guardar configuración: ${err.message}`)
    }
  }

  // Guardar usuario
  const handleSaveUsuario = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUsuario) return
    try {
      const payload: any = {
        nombre: editingUsuario.nombre,
        usuario: editingUsuario.usuario,
        rol: editingUsuario.rol,
        permisos: editingUsuario.permisos,
        activo: editingUsuario.activo,
      }
      if (newPasswordInput) {
        payload.password = newPasswordInput
      }

      if (editingUsuario.id) {
        await api.updateUsuario(editingUsuario.id, payload)
      } else {
        if (!newPasswordInput) {
          alert('Debes ingresar una contraseña para el nuevo usuario.')
          return
        }
        payload.password = newPasswordInput
        await api.createUsuario(payload)
      }
      setEditingUsuario(null)
      setNewPasswordInput('')
      await reloadAll()
    } catch (err: any) {
      alert(`Error al guardar usuario: ${err.message}`)
    }
  }

  const handleTogglePermiso = (permisoKey: string) => {
    if (!editingUsuario) return
    const current: string[] = editingUsuario.permisos || []
    if (current.includes(permisoKey)) {
      setEditingUsuario({ ...editingUsuario, permisos: current.filter(p => p !== permisoKey) })
    } else {
      setEditingUsuario({ ...editingUsuario, permisos: [...current, permisoKey] })
    }
  }

  return (
    <div className="min-h-[100dvh] lg:h-screen w-full flex flex-col bg-slate-100 p-2 sm:p-3 select-none overflow-y-auto lg:overflow-hidden font-sans">
      {/* ── Top Bar Moderna ── */}
      <header className="bg-slate-900 border border-slate-800 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl flex flex-wrap items-center justify-between shadow-md shrink-0 mb-2 gap-2">
        <div className="flex items-center gap-3">
          <span className="text-base sm:text-lg font-black tracking-tight">PANEL DE ADMINISTRACIÓN</span>
          <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700 font-mono hidden sm:inline">
            Admin: <strong className="text-white">{usuario.nombre}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onGoPOS && (
            <Button size="sm" variant="success" onClick={onGoPOS} className="text-xs font-black py-1 px-3">
              IR AL POS
            </Button>
          )}

          {onGoCocina && (
            <Button size="sm" variant="warning" onClick={onGoCocina} className="text-xs font-bold py-1 px-3">
              COCINA
            </Button>
          )}

          <Button size="sm" variant="danger" onClick={onLogout} className="text-xs font-black py-1 px-3">
            CERRAR SESIÓN
          </Button>
        </div>
      </header>

      {/* ── Admin Tabs Pills ── */}
      <div className="flex gap-1.5 shrink-0 pb-1 overflow-x-auto scrollbar-none">
        {[
          { id: 'dashboard', label: 'DASHBOARD Y VENTAS' },
          { id: 'pedidos', label: 'PEDIDOS Y CUENTAS' },
          { id: 'menu', label: 'GESTIÓN DEL MENÚ' },
          { id: 'categorias', label: 'CATEGORÍAS' },
          { id: 'config', label: 'CONFIGURACIÓN GENERAL' },
          { id: 'usuarios', label: 'USUARIOS Y PRIVILEGIOS' },
          { id: 'notificaciones', label: 'NOTIFICACIONES PUSH' },
        ].map(t => {
          const isSel = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as any)}
              className={`px-3.5 py-2 rounded-xl font-black text-xs uppercase tracking-wide shrink-0 transition-all active:scale-95 border ${
                isSel
                  ? 'bg-blue-600 text-white border-blue-700 shadow-sm shadow-blue-500/20'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* ── Tab Content Panel ── */}
      <div className="flex-1 flex flex-col min-h-0 bg-white rounded-2xl border border-slate-200 shadow-sm p-3 sm:p-4 overflow-y-auto">
        {loading ? (
          <div className="h-full flex items-center justify-center font-bold text-slate-500">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span>Cargando información administrativa...</span>
            </div>
          </div>
        ) : tab === 'dashboard' ? (
          /* 1. Dashboard Tab */
          <div className="flex flex-col gap-4">
            {dashboardData?.resumen && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">
                    VENTAS TOTALES (HOY):
                  </span>
                  <span className="text-3xl font-black font-mono text-blue-700 block mt-1">
                    {fmt(dashboardData.resumen.ventas)}
                  </span>
                  <span className="text-xs text-slate-500 font-medium block mt-1">
                    {dashboardData.resumen.cerradas} cuentas cobradas
                  </span>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">
                    TICKET PROMEDIO:
                  </span>
                  <span className="text-3xl font-black font-mono text-slate-900 block mt-1">
                    {fmt(dashboardData.resumen.ticketPromedio)}
                  </span>
                  <span className="text-xs text-slate-500 font-medium block mt-1">Por orden cerrada</span>
                </div>

                <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200">
                  <span className="text-xs font-extrabold text-amber-800 uppercase tracking-wider block">
                    CUENTAS EN ESPERA:
                  </span>
                  <span className="text-3xl font-black font-mono text-amber-700 block mt-1">
                    {dashboardData.resumen.abiertas}
                  </span>
                  <span className="text-xs text-amber-700 font-medium block mt-1">
                    Por cobrar: {fmt(dashboardData.resumen.por_cobrar)}
                  </span>
                </div>

                <div className="bg-rose-50/60 p-4 rounded-2xl border border-rose-200">
                  <span className="text-xs font-extrabold text-rose-800 uppercase tracking-wider block">
                    CANCELACIONES:
                  </span>
                  <span className="text-3xl font-black font-mono text-rose-700 block mt-1">
                    {dashboardData.resumen.canceladas}
                  </span>
                  <span className="text-xs text-rose-700 font-medium block mt-1">
                    Monto: {fmt(dashboardData.resumen.monto_cancelado)}
                  </span>
                </div>
              </div>
            )}

            {/* Breakdown tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-1">
              <Panel title="VENTAS POR MÉTODO DE PAGO">
                <div className="p-3 bg-white space-y-2">
                  {(dashboardData?.ventasPorMetodo || []).map((m: any) => (
                    <div key={m.metodo} className="flex justify-between items-center text-xs pb-2 border-b border-slate-100 last:border-b-0">
                      <span className="font-bold uppercase text-slate-800">
                        {m.metodo} ({m.pagos} pagos)
                      </span>
                      <span className="font-mono font-black text-sm text-blue-700">{fmt(m.total)}</span>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="TOP PRODUCTOS MÁS VENDIDOS">
                <div className="p-3 bg-white space-y-2">
                  {(dashboardData?.topProductos || []).map((tp: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-xs pb-2 border-b border-slate-100 last:border-b-0">
                      <span className="font-bold text-slate-800">{tp.nombre}</span>
                      <span className="font-mono font-black text-sm text-slate-900">
                        {tp.cantidad} vendidos
                      </span>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </div>
        ) : tab === 'pedidos' ? (
          /* 2. Pedidos Tab */
          <div className="flex flex-col gap-3">
            <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              Historial de Pedidos Recientes ({ordenes.length}):
            </span>
            <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 font-black text-slate-600">
                    <th className="p-3">FOLIO</th>
                    <th className="p-3">TIPO</th>
                    <th className="p-3">ESTADO</th>
                    <th className="p-3">TOTAL</th>
                    <th className="p-3">PAGO</th>
                    <th className="p-3">FECHA</th>
                    <th className="p-3">ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {ordenes.map(o => (
                    <tr key={o.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono font-black text-blue-700">{o.folio}</td>
                      <td className="p-3 uppercase font-bold text-slate-800">
                        {o.tipo} {o.mesa ? `· M:${o.mesa}` : ''}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full font-black uppercase text-[10px] border ${
                            o.estado === 'cerrada'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : o.estado === 'abierta'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {o.estado}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-black text-slate-900">{fmt(o.total)}</td>
                      <td className="p-3 uppercase font-bold text-slate-700">{o.metodoPago || 'PENDIENTE'}</td>
                      <td className="p-3 text-slate-500 font-mono">{formatFecha(o.fechaCreacion)}</td>
                      <td className="p-3">
                        {o.estado !== 'cancelada' && (
                          <button
                            type="button"
                            onClick={() => setCancelTarget(o)}
                            className="text-xs font-black py-1 px-2.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 active:scale-95 transition-all"
                          >
                            ANULAR
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : tab === 'menu' ? (
          /* 3. Menú Tab */
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                Catálogo de Productos del Menú ({catalogo?.productos.length || 0}):
              </span>
              <Button
                size="sm"
                variant="success"
                onClick={() =>
                  setEditingProduct({
                    nombre: '',
                    descripcion: '',
                    precio: 100,
                    idCategoria: catalogo?.categorias[0]?.id || 1,
                    activo: true,
                  })
                }
                className="text-xs font-black py-1.5 px-3"
              >
                + AGREGAR NUEVO PRODUCTO
              </Button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 font-black text-slate-600">
                    <th className="p-3">ORDEN</th>
                    <th className="p-3">NOMBRE</th>
                    <th className="p-3">CATEGORÍA</th>
                    <th className="p-3">PRECIO BASE</th>
                    <th className="p-3">DESCRIPCIÓN</th>
                    <th className="p-3">ESTADO</th>
                    <th className="p-3">ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {(catalogo?.productos || []).map(prod => {
                    const cat = catalogo?.categorias.find(c => c.id === prod.idCategoria)
                    return (
                      <tr key={prod.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="p-3">
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => handleMoveProduct(prod, -1)}
                              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 font-black text-xs border border-slate-200 text-slate-700 active:scale-95"
                              title="Subir orden"
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveProduct(prod, 1)}
                              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 font-black text-xs border border-slate-200 text-slate-700 active:scale-95"
                              title="Bajar orden"
                            >
                              ▼
                            </button>
                          </div>
                        </td>
                        <td className="p-3 font-black text-slate-900">{prod.nombre}</td>
                        <td className="p-3">
                          <span
                            className="px-2.5 py-0.5 text-[11px] font-black text-white uppercase rounded-md shadow-2xs"
                            style={{ backgroundColor: cat?.color || '#333' }}
                          >
                            {cat?.nombre || 'General'}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-black text-sm text-blue-700">
                          {fmt(prod.precio)}
                        </td>
                        <td className="p-3 text-slate-500 truncate max-w-xs">{prod.descripcion || '—'}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 font-black uppercase text-[10px] rounded-full border ${
                              prod.activo ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {prod.activo ? 'ACTIVO' : 'INACTIVO'}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingProduct(prod)}
                              className="text-xs font-bold py-1 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                            >
                              EDITAR
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                await api.updateProducto(prod.id, { activo: !prod.activo })
                                await reloadAll()
                              }}
                              className={`text-xs font-black py-1 px-2.5 rounded-lg border ${
                                prod.activo
                                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              {prod.activo ? 'DESACTIVAR' : 'ACTIVAR'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : tab === 'categorias' ? (
          /* 4. Categorías Tab */
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                Categorías del Sistema:
              </span>
              <Button
                size="sm"
                variant="success"
                onClick={() => setEditingCategoria({ nombre: '', color: '#B71C1C', activo: true })}
                className="text-xs font-black py-1.5 px-3"
              >
                + AGREGAR CATEGORÍA
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(catalogo?.categorias || []).map(cat => (
                <div key={cat.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-base font-black uppercase text-slate-900">{cat.nombre}</span>
                      <span
                        className="w-6 h-6 rounded-lg border border-slate-300 shadow-2xs"
                        style={{ backgroundColor: cat.color }}
                        title={cat.color}
                      />
                    </div>
                    <span className="text-xs font-mono text-slate-500 block">Color: {cat.color}</span>
                    <span className="text-xs text-slate-500 block mt-0.5">
                      Productos: {catalogo?.productos.filter(p => p.idCategoria === cat.id).length}
                    </span>
                  </div>

                  <div className="flex justify-end gap-1 mt-3 pt-2.5 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setEditingCategoria(cat)}
                      className="text-xs font-bold py-1 px-3 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs"
                    >
                      EDITAR
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : tab === 'config' ? (
          /* 5. Configuración Tab */
          <form onSubmit={handleSaveConfig} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 max-w-xl space-y-4">
            <span className="text-sm font-black text-slate-900 uppercase block border-b border-slate-200 pb-2.5">
              Configuración de Precios e Impuestos:
            </span>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                Nombre del Negocio:
              </label>
              <input
                type="text"
                value={configForm.nombre_negocio || ''}
                onChange={e => setConfigForm({ ...configForm, nombre_negocio: e.target.value })}
                className="w-full h-11 px-3.5 text-sm bg-white rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  Tasa de IVA (ej. 0.16 = 16%):
                </label>
                <input
                  type="text"
                  value={configForm.iva_tasa || ''}
                  onChange={e => setConfigForm({ ...configForm, iva_tasa: e.target.value })}
                  className="w-full h-11 px-3.5 text-sm bg-white rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500 font-bold font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  IVA Incluido en Precios de Menú:
                </label>
                <select
                  value={configForm.iva_incluido || 'true'}
                  onChange={e => setConfigForm({ ...configForm, iva_incluido: e.target.value })}
                  className="w-full h-11 px-3 text-sm bg-white rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-900"
                >
                  <option value="true">Sí (Precios ya tienen IVA)</option>
                  <option value="false">No (Se suma al cobrar)</option>
                </select>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200">
              <span className="text-xs font-black text-slate-800 uppercase block mb-2">
                Recargos de Tamaños y Masas ($):
              </span>
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Pizza Chica:</label>
                  <input
                    type="number"
                    value={configForm.extra_chica || ''}
                    onChange={e => setConfigForm({ ...configForm, extra_chica: e.target.value })}
                    className="w-full h-10 px-3 text-sm bg-white rounded-xl border border-slate-300 outline-none font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Pizza Grande:</label>
                  <input
                    type="number"
                    value={configForm.extra_grande || ''}
                    onChange={e => setConfigForm({ ...configForm, extra_grande: e.target.value })}
                    className="w-full h-10 px-3 text-sm bg-white rounded-xl border border-slate-300 outline-none font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Orilla Rellena:</label>
                  <input
                    type="number"
                    value={configForm.extra_orilla_rellena || ''}
                    onChange={e => setConfigForm({ ...configForm, extra_orilla_rellena: e.target.value })}
                    className="w-full h-10 px-3 text-sm bg-white rounded-xl border border-slate-300 outline-none font-mono font-bold text-slate-900"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <Button type="submit" size="md" variant="success" className="font-black px-6 shadow-sm">
                GUARDAR CONFIGURACIÓN
              </Button>
            </div>
          </form>
        ) : tab === 'usuarios' ? (
          /* 6. Usuarios Tab */
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                Personal del Sistema y Privilegios ({usuariosList.length}):
              </span>
              <Button
                size="sm"
                variant="success"
                onClick={() =>
                  setEditingUsuario({
                    nombre: '',
                    usuario: '',
                    rol: 'cajero',
                    permisos: ['vender', 'cobrar'],
                    activo: true,
                  })
                }
                className="text-xs font-black py-1.5 px-3"
              >
                + REGISTRAR NUEVO USUARIO
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {usuariosList.map(u => (
                <div key={u.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-base font-black text-slate-900">{u.nombre}</span>
                      <span className="text-xs font-black uppercase px-2.5 py-0.5 bg-blue-600 text-white rounded-md shadow-2xs">
                        {u.rol}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-slate-500 block">Usuario: @{u.usuario}</span>
                    <div className="mt-2.5 text-xs">
                      <span className="font-extrabold text-slate-700 block mb-1">Permisos asignados:</span>
                      <div className="flex flex-wrap gap-1">
                        {(u.permisos || []).map((p: string) => (
                          <span key={p} className="bg-white border border-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-1 mt-3.5 pt-2.5 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingUsuario(u)
                        setNewPasswordInput('')
                      }}
                      className="text-xs font-bold py-1 px-3 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs"
                    >
                      EDITAR PRIVILEGIOS
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* 7. Notificaciones Push y Alertas */
          <div className="flex flex-col gap-4 max-w-2xl bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div>
              <span className="text-base font-black text-slate-900 block mb-1">
                NOTIFICACIONES PUSH & ALERTAS EN TIEMPO REAL
              </span>
              <p className="text-xs text-slate-500">
                Configura y prueba la recepción de notificaciones en el sistema operativo, móviles (Android / iOS) y tabletas.
              </p>
            </div>

            {/* Estado del permiso */}
            <div className="p-3.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">Estado del Permiso:</span>
                <span className="text-sm font-black text-slate-900">
                  {notifications.getPermission() === 'granted'
                    ? 'Permitido en este dispositivo'
                    : notifications.getPermission() === 'denied'
                    ? 'Bloqueado en el navegador'
                    : 'Pendiente de autorización'}
                </span>
              </div>
              <Button
                size="sm"
                variant="primary"
                onClick={async () => {
                  const p = await notifications.requestPermission()
                  setNotifPermission(p)
                  setNotifMsg(p === 'granted' ? 'Permisos otorgados correctamente' : 'Permiso no otorgado')
                }}
                className="text-xs font-black py-1.5 px-3"
              >
                SOLICITAR PERMISOS
              </Button>
            </div>

            {notifMsg && (
              <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold rounded-xl">
                {notifMsg}
              </div>
            )}

            {/* Botones de prueba */}
            <div className="space-y-2">
              <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
                Disparar Pruebas de Notificación:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Button
                  size="md"
                  variant="default"
                  onClick={async () => {
                    const ok = await notifications.sendNotification('Pizzería Volcán', {
                      body: 'Notificación de prueba del sistema POS enviada.',
                    })
                    setNotifMsg(ok ? 'Notificación enviada con éxito' : 'No se pudo enviar la notificación')
                  }}
                  className="text-xs font-black py-2.5"
                >
                  PRUEBA GENERAL
                </Button>
                <Button
                  size="md"
                  variant="warning"
                  onClick={async () => {
                    await notifications.notifyNewKitchenOrder('#4099', 2, 'Pizza Familiar, Refresco')
                    setNotifMsg('Alerta sonora y push de cocina enviada.')
                  }}
                  className="text-xs font-black py-2.5"
                >
                  ALERTA COCINA
                </Button>
                <Button
                  size="md"
                  variant="success"
                  onClick={async () => {
                    await notifications.notifyOrderReady('#4099', 'domicilio', 'Juan Gómez')
                    setNotifMsg('Alerta de entrega enviada.')
                  }}
                  className="text-xs font-black py-2.5"
                >
                  PEDIDO LISTO
                </Button>
              </div>
            </div>

            {/* Guía móvil */}
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs space-y-1.5 text-blue-950">
              <span className="font-extrabold block uppercase tracking-wider">Guía para móviles y tabletas:</span>
              <ul className="list-disc list-inside space-y-1 text-blue-900 font-medium">
                <li><strong>En Android (Chrome):</strong> Concede permisos al presionar &quot;SOLICITAR PERMISOS&quot;. Al pulsar prueba, vibrará y sonará la campana.</li>
                <li><strong>En iPhone / iPad (Safari):</strong> En redes locales HTTP, el sistema despliega automáticamente el banner flotante interactivo con sonido de campana de cocina.</li>
                <li><strong>En Pantalla Dividida o Segundo Plano:</strong> Si cambias de pestaña o minimizas el navegador, las notificaciones seguirán activas.</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals for Admin ── */}
      {/* 1. Modal Editar Producto */}
      {editingProduct && (
        <Dialog
          title={editingProduct.id ? `Editar: ${editingProduct.nombre}` : 'Nuevo Producto'}
          isOpen={true}
          onClose={() => setEditingProduct(null)}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleSaveProduct} className="flex flex-col gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nombre del Producto:
              </label>
              <input
                type="text"
                required
                value={editingProduct.nombre || ''}
                onChange={e => setEditingProduct({ ...editingProduct, nombre: e.target.value })}
                className="w-full h-11 px-3 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-bold text-slate-900 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Categoría:</label>
              <select
                value={editingProduct.idCategoria || catalogo?.categorias[0]?.id}
                onChange={e => setEditingProduct({ ...editingProduct, idCategoria: Number(e.target.value) })}
                className="w-full h-11 px-3 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-bold text-slate-900 transition"
              >
                {catalogo?.categorias.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Precio de Venta ($):
              </label>
              <input
                type="number"
                step="0.5"
                required
                value={editingProduct.precio || ''}
                onChange={e => setEditingProduct({ ...editingProduct, precio: parseFloat(e.target.value) })}
                className="w-full h-11 px-3 text-base font-mono font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-900 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Descripción / Ingredientes:
              </label>
              <input
                type="text"
                value={editingProduct.descripcion || ''}
                onChange={e => setEditingProduct({ ...editingProduct, descripcion: e.target.value })}
                className="w-full h-11 px-3 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-900 transition"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 mt-2">
              <Button type="button" size="md" variant="default" onClick={() => setEditingProduct(null)} className="rounded-xl px-4 font-bold text-xs">
                CANCELAR
              </Button>
              <Button type="submit" size="md" variant="success" className="font-black px-6 rounded-xl shadow-sm">
                GUARDAR
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* 2. Modal Editar Categoría */}
      {editingCategoria && (
        <Dialog
          title={editingCategoria.id ? `Editar Categoría` : 'Nueva Categoría'}
          isOpen={true}
          onClose={() => setEditingCategoria(null)}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleSaveCategoria} className="flex flex-col gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nombre de Categoría:
              </label>
              <input
                type="text"
                required
                value={editingCategoria.nombre || ''}
                onChange={e => setEditingCategoria({ ...editingCategoria, nombre: e.target.value })}
                className="w-full h-11 px-3 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-bold text-slate-900 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Color de Botón (Hexadecimal):
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={editingCategoria.color || '#B71C1C'}
                  onChange={e => setEditingCategoria({ ...editingCategoria, color: e.target.value })}
                  className="w-12 h-11 border border-slate-300 rounded-xl cursor-pointer p-0.5 bg-white"
                />
                <input
                  type="text"
                  value={editingCategoria.color || '#B71C1C'}
                  onChange={e => setEditingCategoria({ ...editingCategoria, color: e.target.value })}
                  className="flex-1 h-11 px-3 text-sm bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 mt-2">
              <Button type="button" size="md" variant="default" onClick={() => setEditingCategoria(null)} className="rounded-xl px-4 font-bold text-xs">
                CANCELAR
              </Button>
              <Button type="submit" size="md" variant="success" className="font-black px-6 rounded-xl shadow-sm">
                GUARDAR
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* 3. Modal Editar Usuario y Permisos */}
      {editingUsuario && (
        <Dialog
          title={`Privilegios: ${editingUsuario.nombre || 'Nuevo Usuario'}`}
          isOpen={true}
          onClose={() => setEditingUsuario(null)}
          maxWidth="max-w-lg"
        >
          <form onSubmit={handleSaveUsuario} className="flex flex-col gap-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nombre Completo:</label>
                <input
                  type="text"
                  required
                  value={editingUsuario.nombre || ''}
                  onChange={e => setEditingUsuario({ ...editingUsuario, nombre: e.target.value })}
                  className="w-full h-11 px-3 text-sm bg-white border border-slate-300 rounded-xl font-bold outline-none text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nombre de Usuario:</label>
                <input
                  type="text"
                  required
                  value={editingUsuario.usuario || ''}
                  onChange={e => setEditingUsuario({ ...editingUsuario, usuario: e.target.value })}
                  className="w-full h-11 px-3 text-sm bg-white border border-slate-300 rounded-xl font-bold outline-none text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Rol Base:</label>
                <select
                  value={editingUsuario.rol || 'cajero'}
                  onChange={e => setEditingUsuario({ ...editingUsuario, rol: e.target.value })}
                  className="w-full h-11 px-3 text-sm bg-white border border-slate-300 rounded-xl font-bold outline-none text-slate-900"
                >
                  <option value="admin">Administrador</option>
                  <option value="cajero">Cajero</option>
                  <option value="cocinero">Cocinero</option>
                  <option value="repartidor">Repartidor</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {editingUsuario.id ? 'Cambiar Contraseña:' : 'Contraseña Inicial:'}
                </label>
                <input
                  type="password"
                  placeholder={editingUsuario.id ? 'Dejar en blanco para no cambiar' : 'Mínimo 6 caracteres'}
                  value={newPasswordInput}
                  onChange={e => setNewPasswordInput(e.target.value)}
                  className="w-full h-11 px-3 text-sm bg-white border border-slate-300 rounded-xl outline-none text-slate-900"
                />
              </div>
            </div>

            {/* Granular permissions checkboxes */}
            <div className="mt-2">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider block mb-1.5">
                Permisos Específicos:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-white border border-slate-200 rounded-xl max-h-48 overflow-y-auto overscroll-contain">
                {Object.entries(permisosMap).map(([pKey, pLabel]) => {
                  const has = (editingUsuario.permisos || []).includes(pKey)
                  return (
                    <label
                      key={pKey}
                      className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer text-xs font-bold transition-colors ${
                        has ? 'bg-blue-50 text-blue-950 border border-blue-200' : 'hover:bg-slate-50 text-slate-600 border border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={has}
                        onChange={() => handleTogglePermiso(pKey)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>{pLabel}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 mt-2">
              <Button type="button" size="md" variant="default" onClick={() => setEditingUsuario(null)} className="rounded-xl px-4 font-bold text-xs">
                CANCELAR
              </Button>
              <Button type="submit" size="md" variant="success" className="font-black px-6 rounded-xl shadow-sm">
                GUARDAR USUARIO
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* 4. Cancel Dialog */}
      {cancelTarget && (
        <CancelDialog
          order={cancelTarget}
          needsSupervisor={false}
          onConfirm={async payload => {
            try {
              await api.cancelarOrden(cancelTarget.id, payload)
              alert(`Orden ${cancelTarget.folio} ha sido anulada.`)
              setCancelTarget(null)
              await reloadAll()
            } catch (err: any) {
              alert(`Error al anular orden: ${err.message}`)
            }
          }}
          onClose={() => setCancelTarget(null)}
        />
      )}
    </div>
  )
}
