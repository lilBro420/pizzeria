import React, { useEffect, useState } from 'react'
import {
  Catalogo,
  Cliente,
  DetalleOrden,
  Orden,
  PizzaMasa,
  PizzaTamano,
  Producto,
  TipoOrden,
  UsuarioActual,
} from '../../types'
import { api } from '../../services/api'
import { calcTotals, fmt, uid } from '../../utils/formatters'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'
import { CustomizerModal } from '../modals/CustomizerModal'
import { OrderTypeModal } from '../modals/OrderTypeModal'
import { PendingAccountsModal } from '../modals/PendingAccountsModal'
import { ExitMenuModal } from '../modals/ExitMenuModal'
import { CancelDialog } from '../modals/CancelDialog'
import { TurnoModal } from '../modals/TurnoModal'
import { ConsultarNotasModal } from '../modals/ConsultarNotasModal'
import { PayScreen } from './PayScreen'
import {
  AlertIcon,
  CartIcon,
  CheckIcon,
  ClockIcon,
  MenuIcon,
  PizzaIcon,
  TrashIcon,
} from '../ui/Icons'

interface POSProps {
  usuario: UsuarioActual
  onLogout: () => void
  onGoCocina?: () => void
  onGoAdmin?: () => void
}

export function POS({ usuario, onLogout, onGoCocina, onGoAdmin }: POSProps) {
  // Catálogo y estado de datos
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null)
  const [ordenes, setOrdenes] = useState<Orden[]>([])
  const [turnoActual, setTurnoActual] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  // Categoría seleccionada ('todo' o id_categoria)
  const [selectedCat, setSelectedCat] = useState<number | 'todo' | 'paquetes'>('todo')

  // Carrito / ticket en curso
  const [cart, setCart] = useState<DetalleOrden[]>([])
  const [descuentoPct, setDescuentoPct] = useState(0)
  const [comentariosOrden, setComentariosOrden] = useState('')

  // Responsividad para tablets verticales: vista activa cuando width < 1024px ('menu' | 'cart')
  const [activeView, setActiveView] = useState<'menu' | 'cart'>('menu')

  // Modales
  const [customizingProduct, setCustomizingProduct] = useState<{
    item: Producto
    isPizza: boolean
    cartIndex?: number
  } | null>(null)
  const [editingCartItemNote, setEditingCartItemNote] = useState<number | null>(null)
  const [itemNoteInput, setItemNoteInput] = useState('')

  const [showOrderType, setShowOrderType] = useState(false)
  const [showPending, setShowPending] = useState(false)
  const [showExit, setShowExit] = useState(false)
  const [showTurno, setShowTurno] = useState(false)
  const [showNotas, setShowNotas] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<Orden | null>(null)

  // Pantalla de pago activa
  const [payScreenState, setPayScreenState] = useState<{
    isCart: boolean
    tipo: TipoOrden
    mesa: string | null
    cliente: Cliente | null
    ordenId?: number
    total: number
    subtotal: number
    descuento: number
    impuesto: number
    folio?: string
  } | null>(null)

  // Carga inicial y sondeo de órdenes abiertas y turno
  const loadData = async () => {
    try {
      const [catData, ordData, turnoData] = await Promise.all([
        api.getCatalogo(),
        api.getOrdenes({ limit: 100 }),
        api.getTurnoActual().catch(() => null),
      ])
      setCatalogo(catData)
      setOrdenes(ordData)
      setTurnoActual(turnoData)
    } catch (err: any) {
      console.error('Error al sincronizar POS:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const timer = setInterval(async () => {
      try {
        const ordData = await api.getOrdenes({ limit: 100 })
        setOrdenes(ordData)
      } catch {
        // Error temporal ignorado
      }
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  if (loading || !catalogo) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-100 text-slate-800 font-bold select-none">
        <div className="p-8 bg-white rounded-2xl shadow-xl border border-slate-200 text-center flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xl font-black text-slate-900">PIZZERÍA VOLCÁN — POS</span>
          <span className="text-sm text-slate-500">Cargando catálogo, mesas y turnos...</span>
        </div>
      </div>
    )
  }

  // Cálculos de totales del ticket en centavos enteros
  const cfg = catalogo.config
  const { subtotal, descuento, impuesto, total } = calcTotals(
    cart,
    descuentoPct,
    cfg.ivaTasa,
    cfg.ivaIncluido
  )

  const cuentasEnEspera = ordenes.filter(o => o.estado === 'abierta')

  // Manejo de productos en el menú
  const handleProductClick = (prod: Producto) => {
    const cat = catalogo.categorias.find(c => c.id === prod.idCategoria)
    const isPizza = cat?.nombre.toLowerCase().includes('pizza') ?? false
    setCustomizingProduct({ item: prod, isPizza })
  }

  const handleConfirmCustomizer = (
    qty: number,
    size?: PizzaTamano | null,
    dough?: PizzaMasa | null,
    comments?: string | null
  ) => {
    if (!customizingProduct) return
    const { item, isPizza } = customizingProduct

    const sizeExtra = isPizza && size ? cfg.extras[size] ?? 0 : 0
    const doughExtra = isPizza && dough ? cfg.extras[dough] ?? 0 : 0
    const precioFinal = Math.max(0, item.precio + sizeExtra + doughExtra)

    const line: DetalleOrden = {
      uid: uid(),
      idProducto: item.id,
      nombre: item.nombre,
      categoria: catalogo.categorias.find(c => c.id === item.idCategoria)?.nombre,
      cantidad: qty,
      tamano: size,
      masa: dough,
      notas: comments,
      precioUnitario: item.precio,
      precioFinal,
    }

    setCart([...cart, line])
    setCustomizingProduct(null)
  }

  // Manejo de paquetes
  const handleAddPaquete = (paq: any) => {
    const line: DetalleOrden = {
      uid: uid(),
      idPaquete: paq.id,
      nombre: paq.nombre,
      categoria: 'Paquetes',
      cantidad: 1,
      precioUnitario: paq.precio,
      precioFinal: paq.precio,
    }
    setCart([...cart, line])
  }

  const handleRemoveCartItem = (index: number) => {
    const updated = cart.filter((_, idx) => idx !== index)
    setCart(updated)
  }

  const handleSaveItemNote = (index: number) => {
    const updated = [...cart]
    updated[index].notas = itemNoteInput.trim() ? itemNoteInput.trim() : null
    setCart(updated)
    setEditingCartItemNote(null)
    setItemNoteInput('')
  }

  // Flujo al hacer clic en "PAGAR CUENTA"
  const handleStartPay = () => {
    if (cart.length === 0) {
      alert('Agrega al menos un producto a la comanda antes de continuar.')
      return
    }
    setShowOrderType(true)
  }

  const handleConfirmOrderType = async (data: {
    tipo: TipoOrden
    mesa: string | null
    cliente: Cliente | null
    payNow: boolean
  }) => {
    setShowOrderType(false)

    if (data.payNow) {
      // Validación estricta: NO dejar cobrar sin turno abierto
      if (!turnoActual) {
        alert('No tienes un turno de caja abierto. Debes abrir un turno para comenzar a cobrar.')
        setShowTurno(true)
        return
      }

      setPayScreenState({
        isCart: true,
        tipo: data.tipo,
        mesa: data.mesa,
        cliente: data.cliente,
        total,
        subtotal,
        descuento,
        impuesto,
      })
    } else {
      // Envía directo a cuenta en espera (unpaid, comanda mandada a cocina)
      try {
        setLoading(true)
        const payload = {
          tipo: data.tipo,
          mesa: data.mesa,
          cliente: data.cliente
            ? {
                celular: data.cliente.celular,
                nombre: data.cliente.nombre,
                direccion_principal: data.cliente.direccion,
                referencias: data.cliente.referencias,
              }
            : null,
          descuentoPct,
          comentarios: comentariosOrden || null,
          items: cart.map(i => ({
            idProducto: i.idProducto,
            idPaquete: i.idPaquete,
            cantidad: i.cantidad,
            tamano: i.tamano,
            masa: i.masa,
            notas: i.notas,
          })),
          claveIdempotencia: `cart-${Date.now()}-${Math.random()}`,
        }

        const ordenCreada = await api.createOrden(payload)
        alert(`Comanda ${ordenCreada.folio} enviada a cocina (Cuenta en Espera).`)
        setCart([])
        setDescuentoPct(0)
        setComentariosOrden('')
        await loadData()
      } catch (err: any) {
        alert(`Error al guardar cuenta en espera: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }
  }

  // Confirmar cobro desde PayScreen
  const handleConfirmPaymentFromPayScreen = async (pagosList: any[], finalDescuentoPct = descuentoPct) => {
    if (!payScreenState) return

    if (!turnoActual) {
      alert('No tienes un turno de caja abierto. Abre un turno antes de cobrar.')
      setShowTurno(true)
      return
    }

    try {
      setLoading(true)

      if (payScreenState.isCart) {
        const payload = {
          tipo: payScreenState.tipo,
          mesa: payScreenState.mesa,
          cliente: payScreenState.cliente
            ? {
                celular: payScreenState.cliente.celular,
                nombre: payScreenState.cliente.nombre,
                direccion_principal: payScreenState.cliente.direccion,
                referencias: payScreenState.cliente.referencias,
              }
            : null,
          descuentoPct: finalDescuentoPct,
          comentarios: comentariosOrden || null,
          items: cart.map(i => ({
            idProducto: i.idProducto,
            idPaquete: i.idPaquete,
            cantidad: i.cantidad,
            tamano: i.tamano,
            masa: i.masa,
            notas: i.notas,
          })),
          pagos: pagosList,
          claveIdempotencia: `pay-${Date.now()}-${Math.random()}`,
        }

        const orden = await api.createOrden(payload)
        alert(`Orden ${orden.folio} cobrada e impresa exitosamente.`)
        setCart([])
        setDescuentoPct(0)
        setComentariosOrden('')
        setPayScreenState(null)
      } else if (payScreenState.ordenId) {
        const orden = await api.pagarOrden(payScreenState.ordenId, {
          pagos: pagosList,
        })
        alert(`Cuenta ${orden.folio} cobrada exitosamente.`)
        setPayScreenState(null)
      }

      await loadData()
    } catch (err: any) {
      alert(`Error al procesar el cobro: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handlePayPendingOrder = (orden: Orden) => {
    if (!turnoActual) {
      alert('No tienes un turno de caja abierto. Debes abrir un turno para comenzar a cobrar.')
      setShowTurno(true)
      return
    }

    setShowPending(false)
    setPayScreenState({
      isCart: false,
      tipo: orden.tipo,
      mesa: orden.mesa,
      cliente: orden.cliente,
      ordenId: orden.id,
      total: orden.total,
      subtotal: orden.subtotal,
      descuento: orden.descuento,
      impuesto: orden.impuesto,
      folio: orden.folio,
    })
  }

  const handleConfirmCancelOrder = async (payload: any) => {
    if (!cancelTarget) return
    try {
      setLoading(true)
      await api.cancelarOrden(cancelTarget.id, payload)
      alert(`Orden ${cancelTarget.folio} ha sido anulada.`)
      setCancelTarget(null)
      await loadData()
    } catch (err: any) {
      alert(`Error al anular orden: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (payScreenState) {
    return (
      <PayScreen
        total={payScreenState.total}
        subtotal={payScreenState.subtotal}
        descuento={payScreenState.descuento}
        impuesto={payScreenState.impuesto}
        descuentoPctInitial={descuentoPct}
        folio={payScreenState.folio}
        mesa={payScreenState.mesa}
        clienteNombre={payScreenState.cliente?.nombre}
        ivaTasa={cfg.ivaTasa}
        ivaIncluido={cfg.ivaIncluido}
        onConfirm={handleConfirmPaymentFromPayScreen}
        onSendToWaiting={
          payScreenState.isCart && (payScreenState.tipo === 'domicilio' || payScreenState.tipo === 'recoger')
            ? async () => {
                const ps = payScreenState
                setPayScreenState(null)
                await handleConfirmOrderType({
                  tipo: ps.tipo,
                  mesa: ps.mesa,
                  cliente: ps.cliente,
                  payNow: false,
                })
              }
            : undefined
        }
        onBack={() => setPayScreenState(null)}
      />
    )
  }

  const currentProds = catalogo.productos.filter(p => {
    if (selectedCat === 'todo') return true
    if (selectedCat === 'paquetes') return false
    return p.idCategoria === selectedCat
  })

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-100 p-2 sm:p-3 select-none overflow-hidden font-sans">
      {/* ── Top Bar Moderna ── */}
      <header className="bg-slate-900 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl flex items-center justify-between shadow-md shrink-0 mb-2 border border-slate-800">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <PizzaIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
            <span className="text-base sm:text-lg font-black tracking-tight text-white">PIZZERÍA VOLCÁN</span>
            <span className="text-[10px] font-bold bg-blue-600 px-1.5 py-0.2 rounded-full text-white">POS</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs">
            <span className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700 font-medium">
              Cajero: <strong className="text-white">{usuario.nombre}</strong>
            </span>

            {turnoActual ? (
              <button
                type="button"
                onClick={() => setShowTurno(true)}
                className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 hover:bg-emerald-500/30 transition-all cursor-pointer"
                title="Haz clic para ver o cerrar el turno activo"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>
                  Turno #{turnoActual.id} Abierto {turnoActual.empleadoNombre ? `(${turnoActual.empleadoNombre})` : ''}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowTurno(true)}
                className="bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 hover:bg-rose-500/30 transition-all cursor-pointer"
                title="Haz clic para abrir tu turno de caja"
              >
                <AlertIcon className="w-3.5 h-3.5 text-rose-400" />
                Turno Cerrado
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Cuentas en Espera */}
          <button
            type="button"
            onClick={() => setShowPending(true)}
            className="h-9 sm:h-10 px-2.5 sm:px-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-sm active:scale-95 transition-all flex items-center gap-1.5"
          >
            <ClockIcon className="w-3.5 h-3.5" />
            <span>ESPERA</span>
            <span className="bg-slate-950 text-amber-300 px-1.5 py-0.2 rounded-md font-mono text-[11px]">
              {cuentasEnEspera.length}
            </span>
          </button>

          {/* Turno */}
          <button
            type="button"
            onClick={() => setShowTurno(true)}
            className="h-9 sm:h-10 px-2.5 sm:px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 active:scale-95 transition-all hidden sm:flex items-center"
          >
            TURNO
          </button>

          {/* Salir */}
          <button
            type="button"
            onClick={() => setShowExit(true)}
            className="h-9 sm:h-10 px-2.5 sm:px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-sm active:scale-95 transition-all flex items-center"
          >
            SALIR
          </button>
        </div>
      </header>

      {/* Selector de Pestaña para Tablets en Modo Vertical (width < 1024px) */}
      <div className="lg:hidden flex gap-2 mb-2 shrink-0">
        <button
          type="button"
          onClick={() => setActiveView('menu')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black border transition-all flex items-center justify-center gap-2 ${
            activeView === 'menu'
              ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
              : 'bg-white text-slate-700 border-slate-300'
          }`}
        >
          <MenuIcon className="w-4 h-4" />
          <span>CATÁLOGO Y MENÚ</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveView('cart')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black border transition-all flex items-center justify-center gap-2 ${
            activeView === 'cart'
              ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
              : 'bg-white text-slate-700 border-slate-300'
          }`}
        >
          <CartIcon className="w-4 h-4" />
          <span>COMANDA ({cart.length})</span>
          <span className="font-mono text-emerald-700 font-black bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            {fmt(total)}
          </span>
        </button>
      </div>

      {/* ── Main Layout Responsivo ── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-2.5 min-h-0 relative">
        {/* Left Side: Category Tabs & Products Grid */}
        <div
          className={`lg:col-span-8 flex flex-col min-h-0 gap-2 ${
            activeView === 'menu' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Category Tabs Bar */}
          <div className="flex gap-2 shrink-0 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCat('todo')}
              className={`h-11 px-4 rounded-xl font-black text-xs uppercase tracking-wide shrink-0 transition-all active:scale-95 border ${
                selectedCat === 'todo'
                  ? 'bg-blue-600 text-white border-blue-700 shadow-sm shadow-blue-500/20'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              TODO
            </button>

            {catalogo.categorias.map(cat => {
              const isSel = selectedCat === cat.id
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCat(cat.id)}
                  className={`h-11 px-4 rounded-xl font-black text-xs uppercase tracking-wide shrink-0 transition-all active:scale-95 border ${
                    isSel
                      ? 'bg-white text-slate-900 border-2 shadow-sm font-black'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                  style={{
                    borderColor: isSel ? cat.color : undefined,
                    boxShadow: isSel ? `0 0 0 1px ${cat.color}40` : undefined,
                  }}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                    {cat.nombre}
                  </span>
                </button>
              )
            })}

            <button
              type="button"
              onClick={() => setSelectedCat('paquetes')}
              className={`h-11 px-4 rounded-xl font-black text-xs uppercase tracking-wide shrink-0 transition-all active:scale-95 border ${
                selectedCat === 'paquetes'
                  ? 'bg-purple-600 text-white border-purple-700 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              PAQUETES
            </button>
          </div>

          {/* Main Menu Panel */}
          <Panel className="flex-1">
            <div className="p-2.5 sm:p-3 flex-1 overflow-y-auto bg-slate-50 rounded-b-xl">
              {/* When in "TODO": Show Category Big Cards first */}
              {selectedCat === 'todo' && (
                <div className="mb-3.5">
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2 block">
                    Categorías Principales:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {catalogo.categorias.map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCat(cat.id)}
                        className="bg-white hover:bg-slate-50 p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between text-left min-h-[76px] transition-all active:scale-95 border-l-4"
                        style={{ borderLeftColor: cat.color }}
                      >
                        <span className="text-sm font-black text-slate-900 leading-tight">
                          {cat.nombre.toUpperCase()}
                        </span>
                        <span className="text-[11px] text-slate-500 font-semibold mt-1">
                          {catalogo.productos.filter(p => p.idCategoria === cat.id).length} productos
                        </span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setSelectedCat('paquetes')}
                      className="bg-white hover:bg-slate-50 p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between text-left min-h-[76px] transition-all active:scale-95 border-l-4 border-l-purple-600"
                    >
                      <span className="text-sm font-black text-slate-900 leading-tight">PAQUETES</span>
                      <span className="text-[11px] text-slate-500 font-semibold mt-1">
                        {catalogo.paquetes.length} combos
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Products Grid */}
              {selectedCat !== 'paquetes' && (
                <div>
                  {selectedCat === 'todo' && (
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2 block">
                      Todos los Productos:
                    </span>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                    {currentProds.map(prod => {
                      const cat = catalogo.categorias.find(c => c.id === prod.idCategoria)
                      const catColor = cat?.color || '#2563EB'
                      return (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() => handleProductClick(prod)}
                          className="bg-white hover:bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between text-left min-h-[88px] transition-all active:scale-95 border-l-4"
                          style={{ borderLeftColor: catColor }}
                        >
                          <div>
                            <span className="text-sm font-black text-slate-900 block leading-tight">
                              {prod.nombre}
                            </span>
                            {prod.descripcion && (
                              <span className="text-[11px] text-slate-500 font-normal line-clamp-1 mt-0.5">
                                {prod.descripcion}
                              </span>
                            )}
                          </div>
                          <span className="text-base font-black font-mono text-blue-700 mt-2">
                            {fmt(prod.precio)}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Combos/Packages Grid */}
              {(selectedCat === 'paquetes' || selectedCat === 'todo') && catalogo.paquetes.length > 0 && (
                <div className="mt-3.5">
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2 block">
                    Paquetes y Combos:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {catalogo.paquetes.map(paq => (
                      <button
                        key={paq.id}
                        type="button"
                        onClick={() => handleAddPaquete(paq)}
                        className="bg-white hover:bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between text-left min-h-[88px] transition-all active:scale-95 border-l-4 border-l-purple-600"
                      >
                        <div>
                          <span className="text-sm font-black text-slate-900 block leading-tight">
                            {paq.nombre}
                          </span>
                          {paq.descripcion && (
                            <span className="text-[11px] text-slate-500 font-normal line-clamp-2 mt-0.5">
                              {paq.descripcion}
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between items-baseline mt-2">
                          <span className="text-base font-black font-mono text-purple-700">
                            {fmt(paq.precio)}
                          </span>
                          {paq.precioIndividual && paq.precioIndividual > paq.precio && (
                            <span className="text-[10px] text-emerald-600 font-black bg-emerald-50 px-1.5 py-0.5 rounded">
                              Ahorro: {fmt(paq.precioIndividual - paq.precio)}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Panel>

          {/* Barra Flotante de Acceso Rápido a Comanda para Tablets en Vertical */}
          {cart.length > 0 && (
            <div className="lg:hidden shrink-0 bg-slate-900 text-white p-3 rounded-2xl flex items-center justify-between shadow-lg border border-slate-800 animate-in slide-in-from-bottom-2">
              <div>
                <span className="text-xs text-slate-400 block font-medium">
                  {cart.length} {cart.length === 1 ? 'producto en comanda' : 'productos en comanda'}
                </span>
                <span className="text-xl font-mono font-black text-emerald-400">
                  {fmt(total)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveView('cart')}
                className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-emerald-600/30 active:scale-95 transition-all"
              >
                <span>VER COMANDA Y COBRAR</span>
                <span>→</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Order Ticket & Totals */}
        <div
          className={`lg:col-span-4 flex flex-col min-h-0 ${
            activeView === 'cart' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <Panel
            title="COMANDA ACTUAL"
            headerRight={
              <span className="text-xs font-mono font-black bg-blue-600 text-white px-2 py-0.5 rounded-full">
                {cart.length} {cart.length === 1 ? 'ítem' : 'ítems'}
              </span>
            }
            className="flex-1"
          >
            <div className="flex-1 flex flex-col justify-between bg-white min-h-0 p-3 rounded-b-xl">
              {/* Lines list */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 font-bold text-center p-6">
                    <PizzaIcon className="w-12 h-12 text-slate-300 mb-2" />
                    <span className="text-base font-black text-slate-700 block mb-1">
                      COMANDA VACÍA
                    </span>
                    <span className="text-xs text-slate-400">
                      Toca cualquier producto en el catálogo para agregarlo.
                    </span>
                  </div>
                ) : (
                  cart.map((it, idx) => (
                    <div
                      key={it.uid}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-1 shadow-2xs"
                    >
                      <div className="flex justify-between items-baseline">
                        <div className="flex items-baseline gap-2 flex-1 min-w-0 pr-2">
                          <span className="text-base font-black font-mono text-blue-700">
                            {it.cantidad}×
                          </span>
                          <span className="text-sm font-black text-slate-900 truncate">{it.nombre}</span>
                        </div>

                        <span className="text-base font-black font-mono text-slate-900 shrink-0">
                          {fmt(it.precioFinal * it.cantidad)}
                        </span>
                      </div>

                      {/* Modifiers (Tamaño, Masa) */}
                      {(it.tamano || it.masa) && (
                        <div className="text-[11px] text-slate-600 font-bold flex items-center gap-1.5">
                          {it.tamano && (
                            <span className="bg-slate-200/70 px-1.5 py-0.2 rounded text-slate-800">
                              {it.tamano}
                            </span>
                          )}
                          {it.masa && (
                            <span className="bg-slate-200/70 px-1.5 py-0.2 rounded text-slate-800">
                              {it.masa}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Line notes */}
                      {it.notas && (
                        <div className="text-xs font-bold text-amber-900 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                          Nota cocina: {it.notas}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex justify-end gap-1.5 pt-1.5 border-t border-slate-200 mt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCartItemNote(idx)
                            setItemNoteInput(it.notas || '')
                          }}
                          className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs active:scale-95 transition-all"
                        >
                          {it.notas ? 'Editar Nota' : '+ Nota'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveCartItem(idx)}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-black text-xs active:scale-95 transition-all flex items-center gap-1"
                          title="Eliminar producto"
                        >
                          <TrashIcon className="w-3 h-3" />
                          <span>Eliminar</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Totals Summary */}
              <div className="pt-3 border-t border-slate-200 bg-slate-50 p-3 rounded-xl mt-2 shrink-0">
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span className="font-bold">Subtotal:</span>
                    <span className="font-mono font-bold text-slate-800">{fmt(subtotal)}</span>
                  </div>

                  {descuentoPct > 0 && (
                    <div className="flex justify-between text-rose-600 font-bold">
                      <span>Descuento ({descuentoPct}%):</span>
                      <span className="font-mono font-bold">-{fmt(descuento)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-600">
                    <span className="font-bold">IVA (16% incluido):</span>
                    <span className="font-mono font-bold text-slate-800">{fmt(impuesto)}</span>
                  </div>

                  <div className="pt-2 border-t border-slate-300 flex justify-between items-baseline">
                    <span className="text-base font-black text-slate-900">TOTAL:</span>
                    <span className="text-2xl font-black font-mono text-blue-700">{fmt(total)}</span>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="flex gap-2 mt-3">
                  <Button
                    size="md"
                    variant="default"
                    disabled={cart.length === 0}
                    onClick={() => {
                      if (confirm('¿Vaciar todos los productos del pedido actual?')) {
                        setCart([])
                        setDescuentoPct(0)
                      }
                    }}
                    className="text-xs font-black px-3"
                  >
                    VACIAR
                  </Button>

                  <Button
                    size="lg"
                    variant="success"
                    disabled={cart.length === 0}
                    onClick={handleStartPay}
                    className="flex-1 text-base sm:text-lg font-black tracking-wide py-3 shadow-md shadow-emerald-500/25 flex items-center justify-center gap-2"
                  >
                    <CheckIcon className="w-5 h-5" />
                    <span>PAGAR CUENTA</span>
                  </Button>
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      {/* ── Modales ── */}
      {customizingProduct && (
        <CustomizerModal
          item={customizingProduct.item}
          isPizza={customizingProduct.isPizza}
          config={catalogo.config}
          notasRapidas={catalogo.notasRapidas}
          onConfirm={handleConfirmCustomizer}
          onClose={() => setCustomizingProduct(null)}
        />
      )}

      {editingCartItemNote !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-200">
            <span className="text-base font-black text-slate-900 block mb-1">
              NOTA DE COCINA PARA: {cart[editingCartItemNote]?.nombre}
            </span>
            <input
              type="text"
              value={itemNoteInput}
              onChange={e => setItemNoteInput(e.target.value)}
              placeholder="Ej. Sin cebolla, bien dorada..."
              className="w-full h-12 px-3.5 text-base font-bold bg-slate-50 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 my-3"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                size="md"
                variant="default"
                onClick={() => setEditingCartItemNote(null)}
              >
                CANCELAR
              </Button>
              <Button
                size="md"
                variant="primary"
                onClick={() => handleSaveItemNote(editingCartItemNote)}
              >
                GUARDAR NOTA
              </Button>
            </div>
          </div>
        </div>
      )}

      {showOrderType && (
        <OrderTypeModal
          mesas={catalogo.mesas}
          onConfirm={handleConfirmOrderType}
          onClose={() => setShowOrderType(false)}
        />
      )}

      {showPending && (
        <PendingAccountsModal
          ordenes={cuentasEnEspera}
          onPayOrder={handlePayPendingOrder}
          onCancelOrder={ord => {
            setShowPending(false)
            setCancelTarget(ord)
          }}
          onClose={() => setShowPending(false)}
        />
      )}

      {showExit && (
        <ExitMenuModal
          usuario={usuario}
          onOpenNotas={() => setShowNotas(true)}
          onOpenTurno={() => setShowTurno(true)}
          onOpenCocina={() => onGoCocina && onGoCocina()}
          onOpenAdmin={() => onGoAdmin && onGoAdmin()}
          onLogout={onLogout}
          onClose={() => setShowExit(false)}
        />
      )}

      {showTurno && (
        <TurnoModal
          usuario={usuario}
          onClose={() => {
            setShowTurno(false)
            loadData()
          }}
        />
      )}

      {showNotas && (
        <ConsultarNotasModal
          notasRapidas={catalogo.notasRapidas}
          onClose={() => setShowNotas(false)}
        />
      )}

      {cancelTarget && (
        <CancelDialog
          target={cancelTarget}
          usuario={usuario}
          onConfirm={handleConfirmCancelOrder}
          onClose={() => setCancelTarget(null)}
        />
      )}
    </div>
  )
}
