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
    <div className="min-h-[100dvh] lg:h-screen w-full flex flex-col bg-[#D4D0C8] p-2 select-none overflow-y-auto lg:overflow-hidden font-sans">
      {/* ── Top Bar ── */}
      <div className="bg-[#0A246A] text-white px-3 py-2 flex flex-wrap items-center justify-between border-2 border-black swing-outset shrink-0 mb-2 gap-2">
        <div className="flex items-center gap-3">
          <span className="text-lg sm:text-xl font-black tracking-wide font-sans">PANEL DE ADMINISTRACIÓN</span>
          <span className="text-xs bg-[#1F4E79] px-2 py-0.5 font-mono text-gray-200">
            Admin: {usuario.nombre}
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
      </div>

      {/* ── Admin Tabs ── */}
      <div className="flex gap-1 shrink-0 pb-1 overflow-x-auto scrollbar-none">
        {[
          { id: 'dashboard', label: 'DASHBOARD Y VENTAS' },
          { id: 'pedidos', label: 'PEDIDOS Y CUENTAS' },
          { id: 'menu', label: 'GESTIÓN DEL MENÚ' },
          { id: 'categorias', label: 'CATEGORÍAS' },
          { id: 'config', label: 'CONFIGURACIÓN GENERAL' },
          { id: 'usuarios', label: 'USUARIOS Y PRIVILEGIOS' },
          { id: 'notificaciones', label: 'NOTIFICACIONES PUSH' },
        ].map(t => (
          <Button
            key={t.id}
            size="md"
            variant="tab"
            active={tab === t.id}
            onClick={() => setTab(t.id as any)}
            className="text-xs font-bold shrink-0"
          >
            {t.label}
          </Button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div className="flex-1 flex flex-col min-h-0 bg-[#ECE9D8] swing-inset p-3 overflow-y-auto">
        {loading ? (
          <div className="h-full flex items-center justify-center font-bold text-gray-600">
            Cargando información administrativa...
          </div>
        ) : tab === 'dashboard' ? (
          /* 1. Dashboard Tab */
          <div className="flex flex-col gap-3">
            {dashboardData?.resumen && (
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-white p-3 swing-outset border">
                  <span className="text-xs font-bold text-gray-600 block">VENTAS TOTALES (HOY):</span>
                  <span className="text-2xl font-black font-mono text-[#0A246A]">
                    {fmt(dashboardData.resumen.ventas)}
                  </span>
                  <span className="text-[11px] text-gray-500 block mt-1">
                    {dashboardData.resumen.cerradas} cuentas cobradas
                  </span>
                </div>

                <div className="bg-white p-3 swing-outset border">
                  <span className="text-xs font-bold text-gray-600 block">TICKET PROMEDIO:</span>
                  <span className="text-2xl font-black font-mono text-black">
                    {fmt(dashboardData.resumen.ticketPromedio)}
                  </span>
                </div>

                <div className="bg-white p-3 swing-outset border">
                  <span className="text-xs font-bold text-gray-600 block">CUENTAS EN ESPERA:</span>
                  <span className="text-2xl font-black font-mono text-amber-800">
                    {dashboardData.resumen.abiertas}
                  </span>
                  <span className="text-[11px] text-amber-700 block mt-1">
                    Por cobrar: {fmt(dashboardData.resumen.por_cobrar)}
                  </span>
                </div>

                <div className="bg-white p-3 swing-outset border">
                  <span className="text-xs font-bold text-gray-600 block">CANCELACIONES:</span>
                  <span className="text-2xl font-black font-mono text-red-800">
                    {dashboardData.resumen.canceladas}
                  </span>
                  <span className="text-[11px] text-red-700 block mt-1">
                    Pérdida: {fmt(dashboardData.resumen.monto_cancelado)}
                  </span>
                </div>
              </div>
            )}

            {/* Breakdown tables */}
            <div className="grid grid-cols-2 gap-3 mt-2">
              <Panel title="VENTAS POR MÉTODO DE PAGO">
                <div className="p-3 bg-white swing-inset space-y-2">
                  {(dashboardData?.ventasPorMetodo || []).map((m: any) => (
                    <div key={m.metodo} className="flex justify-between items-center text-xs pb-1 border-b">
                      <span className="font-bold uppercase text-gray-800">
                        {m.metodo} ({m.pagos} pagos)
                      </span>
                      <span className="font-mono font-black text-sm text-[#0A246A]">{fmt(m.total)}</span>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="TOP PRODUCTOS MÁS VENDIDOS">
                <div className="p-3 bg-white swing-inset space-y-2">
                  {(dashboardData?.topProductos || []).map((tp: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-xs pb-1 border-b">
                      <span className="font-bold text-gray-800">{tp.nombre}</span>
                      <span className="font-mono font-black text-sm text-black">
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
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-gray-700 uppercase">
              Historial de Pedidos Recientes ({ordenes.length}):
            </span>
            <div className="bg-white swing-inset overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#D4D0C8] border-b border-[#808080] font-bold">
                    <th className="p-2">FOLIO</th>
                    <th className="p-2">TIPO</th>
                    <th className="p-2">ESTADO</th>
                    <th className="p-2">TOTAL</th>
                    <th className="p-2">PAGO</th>
                    <th className="p-2">FECHA</th>
                    <th className="p-2">ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {ordenes.map(o => (
                    <tr key={o.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="p-2 font-mono font-black text-[#0A246A]">{o.folio}</td>
                      <td className="p-2 uppercase font-bold">
                        {o.tipo} {o.mesa ? `· M:${o.mesa}` : ''}
                      </td>
                      <td className="p-2">
                        <span
                          className={`px-1.5 py-0.5 font-bold uppercase ${
                            o.estado === 'cerrada'
                              ? 'bg-green-100 text-green-900'
                              : o.estado === 'abierta'
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-red-100 text-red-900'
                          }`}
                        >
                          {o.estado}
                        </span>
                      </td>
                      <td className="p-2 font-mono font-black">{fmt(o.total)}</td>
                      <td className="p-2 uppercase font-bold">{o.metodoPago || 'PENDIENTE'}</td>
                      <td className="p-2 text-gray-600 font-mono">{formatFecha(o.fechaCreacion)}</td>
                      <td className="p-2">
                        {o.estado !== 'cancelada' && (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => setCancelTarget(o)}
                            className="text-[11px] py-1 px-2 font-bold"
                          >
                            ANULAR
                          </Button>
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
              <span className="text-sm font-black text-gray-800 uppercase">
                Catálogo de Productos del Menú ({catalogo?.productos.length || 0}):
              </span>
              <Button
                size="md"
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
                className="text-xs font-black"
              >
                + AGREGAR NUEVO PRODUCTO
              </Button>
            </div>

            <div className="bg-white swing-inset overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#D4D0C8] border-b border-[#808080] font-bold">
                    <th className="p-2">ORDEN</th>
                    <th className="p-2">NOMBRE</th>
                    <th className="p-2">CATEGORÍA</th>
                    <th className="p-2">PRECIO BASE</th>
                    <th className="p-2">DESCRIPCIÓN</th>
                    <th className="p-2">ESTADO</th>
                    <th className="p-2">ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {(catalogo?.productos || []).map(prod => {
                    const cat = catalogo?.categorias.find(c => c.id === prod.idCategoria)
                    return (
                      <tr key={prod.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="p-2">
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => handleMoveProduct(prod, -1)}
                              className="w-6 h-6 swing-button font-black text-xs"
                              title="Subir orden"
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveProduct(prod, 1)}
                              className="w-6 h-6 swing-button font-black text-xs"
                              title="Bajar orden"
                            >
                              ▼
                            </button>
                          </div>
                        </td>
                        <td className="p-2 font-black text-black">{prod.nombre}</td>
                        <td className="p-2">
                          <span
                            className="px-2 py-0.5 text-[11px] font-bold text-white uppercase"
                            style={{ backgroundColor: cat?.color || '#333' }}
                          >
                            {cat?.nombre || 'General'}
                          </span>
                        </td>
                        <td className="p-2 font-mono font-black text-sm text-[#0A246A]">
                          {fmt(prod.precio)}
                        </td>
                        <td className="p-2 text-gray-600 truncate max-w-xs">{prod.descripcion || '—'}</td>
                        <td className="p-2">
                          <span
                            className={`px-1.5 py-0.5 font-bold uppercase text-[10px] ${
                              prod.activo ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-900'
                            }`}
                          >
                            {prod.activo ? 'ACTIVO' : 'INACTIVO'}
                          </span>
                        </td>
                        <td className="p-2">
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => setEditingProduct(prod)}
                              className="text-[11px] py-1 px-2 font-bold"
                            >
                              EDITAR
                            </Button>
                            <Button
                              size="sm"
                              variant={prod.activo ? 'danger' : 'success'}
                              onClick={async () => {
                                await api.updateProducto(prod.id, { activo: !prod.activo })
                                await reloadAll()
                              }}
                              className="text-[11px] py-1 px-2 font-bold"
                            >
                              {prod.activo ? 'DESACTIVAR' : 'ACTIVAR'}
                            </Button>
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
              <span className="text-sm font-black text-gray-800 uppercase">
                Categorías del Sistema:
              </span>
              <Button
                size="md"
                variant="success"
                onClick={() => setEditingCategoria({ nombre: '', color: '#B71C1C', activo: true })}
                className="text-xs font-black"
              >
                + AGREGAR CATEGORÍA
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {(catalogo?.categorias || []).map(cat => (
                <div key={cat.id} className="bg-white p-3 swing-outset flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-base font-black uppercase text-black">{cat.nombre}</span>
                      <span
                        className="w-6 h-6 border-2 border-black"
                        style={{ backgroundColor: cat.color }}
                        title={cat.color}
                      />
                    </div>
                    <span className="text-xs text-gray-600 block">Color hexadecimal: {cat.color}</span>
                    <span className="text-xs text-gray-600 block">
                      Productos: {catalogo?.productos.filter(p => p.idCategoria === cat.id).length}
                    </span>
                  </div>

                  <div className="flex justify-end gap-1 mt-3 pt-2 border-t border-gray-200">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => setEditingCategoria(cat)}
                      className="text-xs font-bold"
                    >
                      EDITAR
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : tab === 'config' ? (
          /* 5. Configuración Tab */
          <form onSubmit={handleSaveConfig} className="bg-white swing-inset p-4 max-w-xl space-y-3">
            <span className="text-sm font-black text-[#0A246A] uppercase block border-b pb-2">
              Configuración de Precios e Impuestos:
            </span>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Nombre del Negocio:
              </label>
              <input
                type="text"
                value={configForm.nombre_negocio || ''}
                onChange={e => setConfigForm({ ...configForm, nombre_negocio: e.target.value })}
                className="w-full h-10 px-2 text-sm bg-[#ECE9D8] swing-inset outline-none font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Tasa de IVA (ej. 0.16 = 16%):
                </label>
                <input
                  type="text"
                  value={configForm.iva_tasa || ''}
                  onChange={e => setConfigForm({ ...configForm, iva_tasa: e.target.value })}
                  className="w-full h-10 px-2 text-sm bg-[#ECE9D8] swing-inset outline-none font-bold font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  IVA Incluido en Precios de Menú:
                </label>
                <select
                  value={configForm.iva_incluido || 'true'}
                  onChange={e => setConfigForm({ ...configForm, iva_incluido: e.target.value })}
                  className="w-full h-10 px-2 text-sm bg-[#ECE9D8] swing-inset outline-none font-bold"
                >
                  <option value="true">Sí (Precios ya tienen IVA)</option>
                  <option value="false">No (Se suma al cobrar)</option>
                </select>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-200">
              <span className="text-xs font-black text-gray-800 uppercase block mb-2">
                Recargos de Tamaños y Masas ($):
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-gray-600 block">Pizza Chica:</label>
                  <input
                    type="number"
                    value={configForm.extra_chica || ''}
                    onChange={e => setConfigForm({ ...configForm, extra_chica: e.target.value })}
                    className="w-full h-10 px-2 text-sm bg-[#ECE9D8] swing-inset outline-none font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-600 block">Pizza Grande:</label>
                  <input
                    type="number"
                    value={configForm.extra_grande || ''}
                    onChange={e => setConfigForm({ ...configForm, extra_grande: e.target.value })}
                    className="w-full h-10 px-2 text-sm bg-[#ECE9D8] swing-inset outline-none font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-600 block">Orilla Rellena:</label>
                  <input
                    type="number"
                    value={configForm.extra_orilla_rellena || ''}
                    onChange={e => setConfigForm({ ...configForm, extra_orilla_rellena: e.target.value })}
                    className="w-full h-10 px-2 text-sm bg-[#ECE9D8] swing-inset outline-none font-mono font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-300 flex justify-end">
              <Button type="submit" size="md" variant="success" className="font-black px-6">
                GUARDAR CONFIGURACIÓN
              </Button>
            </div>
          </form>
        ) : (
          /* 6. Usuarios Tab */
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-black text-gray-800 uppercase">
                Personal del Sistema y Privilegios ({usuariosList.length}):
              </span>
              <Button
                size="md"
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
                className="text-xs font-black"
              >
                + REGISTRAR NUEVO USUARIO
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {usuariosList.map(u => (
                <div key={u.id} className="bg-white p-3 swing-outset flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-base font-black text-black">{u.nombre}</span>
                      <span className="text-xs font-bold uppercase px-2 py-0.5 bg-[#0A246A] text-white">
                        {u.rol}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-gray-600 block">Usuario: {u.usuario}</span>
                    <div className="mt-2 text-xs">
                      <span className="font-bold text-gray-700 block mb-0.5">Permisos habilitados:</span>
                      <div className="flex flex-wrap gap-1">
                        {(u.permisos || []).map((p: string) => (
                          <span key={p} className="bg-gray-200 text-gray-800 text-[10px] font-bold px-1.5 py-0.5">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-1 mt-3 pt-2 border-t border-gray-200">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => {
                        setEditingUsuario(u)
                        setNewPasswordInput('')
                      }}
                      className="text-xs font-bold"
                    >
                      EDITAR PRIVILEGIOS
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 7. Notificaciones Push y Alertas */}
        {tab === 'notificaciones' && (
          <div className="flex flex-col gap-4 max-w-2xl bg-white p-5 rounded-xl border border-gray-300 shadow-sm">
            <div>
              <span className="text-lg font-black text-black block mb-1">
                NOTIFICACIONES PUSH & ALERTAS EN TIEMPO REAL
              </span>
              <p className="text-xs text-gray-600">
                Configura y prueba la recepción de notificaciones en el sistema operativo, móviles (Android / iOS) y tabletas.
              </p>
            </div>

            {/* Estado del permiso */}
            <div className="p-4 bg-gray-50 border rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-gray-500 uppercase block">Estado del Permiso:</span>
                <span className="text-sm font-black text-black">
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
              >
                SOLICITAR PERMISOS
              </Button>
            </div>

            {notifMsg && (
              <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold rounded-lg">
                {notifMsg}
              </div>
            )}

            {/* Botones de prueba */}
            <div className="space-y-2">
              <span className="text-xs font-black text-gray-700 uppercase block">
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
                  className="text-xs font-black py-3"
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
                  className="text-xs font-black py-3"
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
                  className="text-xs font-black py-3"
                >
                  PEDIDO LISTO
                </Button>
              </div>
            </div>

            {/* Guía móvil */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs space-y-2 text-blue-950">
              <span className="font-black block uppercase">Guía para probar en Móviles y Tabletas:</span>
              <ul className="list-disc list-inside space-y-1 text-blue-900">
                <li><strong>En Android (Chrome):</strong> Concede permisos al presionar &quot;SOLICITAR PERMISOS&quot;. Al pulsar prueba, vibrará y sonará la campana.</li>
                <li><strong>En iPhone / iPad (Safari iOS 16.4+):</strong> Abre la página en Safari, presiona el botón Compartir y elige <em>&quot;Añadir a pantalla de inicio&quot;</em>. Al abrir la app desde el icono en tu pantalla, soporta notificaciones push completas.</li>
                <li><strong>En Pantalla Dividida o Segundo Plano:</strong> Si cambias de pestaña o minimizas el navegador, las notificaciones seguirán apareciendo en la bandeja del sistema.</li>
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
          <form onSubmit={handleSaveProduct} className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Nombre del Producto:
              </label>
              <input
                type="text"
                required
                value={editingProduct.nombre || ''}
                onChange={e => setEditingProduct({ ...editingProduct, nombre: e.target.value })}
                className="w-full h-10 px-2 text-sm bg-white swing-inset outline-none font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Categoría:</label>
              <select
                value={editingProduct.idCategoria || catalogo?.categorias[0]?.id}
                onChange={e => setEditingProduct({ ...editingProduct, idCategoria: Number(e.target.value) })}
                className="w-full h-10 px-2 text-sm bg-white swing-inset outline-none font-bold"
              >
                {catalogo?.categorias.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Precio de Venta ($):
              </label>
              <input
                type="number"
                step="0.5"
                required
                value={editingProduct.precio || ''}
                onChange={e => setEditingProduct({ ...editingProduct, precio: parseFloat(e.target.value) })}
                className="w-full h-10 px-2 text-lg font-mono font-bold bg-white swing-inset outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Descripción / Ingredientes:
              </label>
              <input
                type="text"
                value={editingProduct.descripcion || ''}
                onChange={e => setEditingProduct({ ...editingProduct, descripcion: e.target.value })}
                className="w-full h-10 px-2 text-sm bg-white swing-inset outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-300 mt-2">
              <Button type="button" size="md" variant="default" onClick={() => setEditingProduct(null)}>
                CANCELAR
              </Button>
              <Button type="submit" size="md" variant="success" className="font-black px-6">
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
          <form onSubmit={handleSaveCategoria} className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Nombre de Categoría:
              </label>
              <input
                type="text"
                required
                value={editingCategoria.nombre || ''}
                onChange={e => setEditingCategoria({ ...editingCategoria, nombre: e.target.value })}
                className="w-full h-10 px-2 text-sm bg-white swing-inset outline-none font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Color de Botón (Hexadecimal):
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={editingCategoria.color || '#B71C1C'}
                  onChange={e => setEditingCategoria({ ...editingCategoria, color: e.target.value })}
                  className="w-12 h-10 border swing-inset cursor-pointer"
                />
                <input
                  type="text"
                  value={editingCategoria.color || '#B71C1C'}
                  onChange={e => setEditingCategoria({ ...editingCategoria, color: e.target.value })}
                  className="flex-1 h-10 px-2 text-sm bg-white swing-inset font-mono font-bold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-300 mt-2">
              <Button type="button" size="md" variant="default" onClick={() => setEditingCategoria(null)}>
                CANCELAR
              </Button>
              <Button type="submit" size="md" variant="success" className="font-black px-6">
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
          <form onSubmit={handleSaveUsuario} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nombre Completo:</label>
                <input
                  type="text"
                  required
                  value={editingUsuario.nombre || ''}
                  onChange={e => setEditingUsuario({ ...editingUsuario, nombre: e.target.value })}
                  className="w-full h-10 px-2 text-sm bg-white swing-inset font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nombre de Usuario:</label>
                <input
                  type="text"
                  required
                  value={editingUsuario.usuario || ''}
                  onChange={e => setEditingUsuario({ ...editingUsuario, usuario: e.target.value })}
                  className="w-full h-10 px-2 text-sm bg-white swing-inset font-bold outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Rol Base:</label>
                <select
                  value={editingUsuario.rol || 'cajero'}
                  onChange={e => setEditingUsuario({ ...editingUsuario, rol: e.target.value })}
                  className="w-full h-10 px-2 text-sm bg-white swing-inset font-bold outline-none"
                >
                  <option value="admin">Administrador</option>
                  <option value="cajero">Cajero</option>
                  <option value="cocinero">Cocinero</option>
                  <option value="repartidor">Repartidor</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  {editingUsuario.id ? 'Cambiar Contraseña:' : 'Contraseña Inicial:'}
                </label>
                <input
                  type="password"
                  placeholder={editingUsuario.id ? 'Dejar en blanco para no cambiar' : 'Mínimo 6 caracteres'}
                  value={newPasswordInput}
                  onChange={e => setNewPasswordInput(e.target.value)}
                  className="w-full h-10 px-2 text-sm bg-white swing-inset outline-none"
                />
              </div>
            </div>

            {/* Granular permissions checkboxes */}
            <div className="mt-2">
              <span className="text-xs font-black text-gray-800 uppercase block mb-1">
                Permisos Específicos:
              </span>
              <div className="grid grid-cols-2 gap-1.5 p-2 bg-white swing-inset max-h-48 overflow-y-auto">
                {Object.entries(permisosMap).map(([pKey, pLabel]) => {
                  const has = (editingUsuario.permisos || []).includes(pKey)
                  return (
                    <label
                      key={pKey}
                      className="flex items-center gap-2 p-1 hover:bg-gray-50 cursor-pointer text-xs font-bold"
                    >
                      <input
                        type="checkbox"
                        checked={has}
                        onChange={() => handleTogglePermiso(pKey)}
                        className="w-4 h-4"
                      />
                      <span className={has ? 'text-black' : 'text-gray-500'}>{pLabel}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-300 mt-2">
              <Button type="button" size="md" variant="default" onClick={() => setEditingUsuario(null)}>
                CANCELAR
              </Button>
              <Button type="submit" size="md" variant="success" className="font-black px-6">
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
