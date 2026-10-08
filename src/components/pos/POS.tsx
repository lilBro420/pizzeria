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
  const [loading, setLoading] = useState(true)

  // Categoría seleccionada ('todo' o id_categoria)
  const [selectedCat, setSelectedCat] = useState<number | 'todo' | 'paquetes'>('todo')

  // Carrito / ticket en curso
  const [cart, setCart] = useState<DetalleOrden[]>([])
  const [descuentoPct, setDescuentoPct] = useState(0)
  const [comentariosOrden, setComentariosOrden] = useState('')

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

  // Carga inicial y sondeo de órdenes abiertas
  const loadData = async () => {
    try {
      const [catData, ordData] = await Promise.all([api.getCatalogo(), api.getOrdenes({ limit: 100 })])
      setCatalogo(catData)
      setOrdenes(ordData)
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
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#D4D0C8] text-black font-bold select-none">
        <div className="p-8 swing-outset bg-[#ECE9D8] text-center border-2 border-black">
          <span className="text-xl block mb-2 text-[#0A246A]">PIZZERÍA VOLCÁN — POS</span>
          <span className="text-sm text-gray-700">Cargando catálogo y mesas desde el servidor...</span>
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

    // Abre el modal para configurar cantidad, tamaño, masa y notas de cocina
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
    setCart(cart.filter((_, idx) => idx !== index))
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
      alert('Agrega al menos un producto a la orden antes de continuar.')
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
      // Abre pantalla de pago de inmediato
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
      // Envía directo a cuenta en espera (unpaid, sent to kitchen)
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
        alert(`✓ Orden ${ordenCreada.folio} enviada a cocina (Cuenta en Espera).`)
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
  const handleConfirmPaymentFromPayScreen = async (pagosList: any[]) => {
    if (!payScreenState) return

    try {
      setLoading(true)

      if (payScreenState.isCart) {
        // Crear orden y cobrar al mismo tiempo
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
          pagos: pagosList,
          claveIdempotencia: `pay-${Date.now()}-${Math.random()}`,
        }

        const orden = await api.createOrden(payload)
        alert(`✓ Orden ${orden.folio} cobrada exitosamente e impresa.`)
        setCart([])
        setDescuentoPct(0)
        setComentariosOrden('')
        setPayScreenState(null)
      } else if (payScreenState.ordenId) {
        // Cobrar una cuenta en espera existente
        const orden = await api.pagarOrden(payScreenState.ordenId, {
          pagos: pagosList,
        })
        alert(`✓ Cuenta ${orden.folio} cobrada exitosamente.`)
        setPayScreenState(null)
      }

      await loadData()
    } catch (err: any) {
      alert(`Error al procesar el cobro: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Cobrar una cuenta en espera desde el modal
  const handlePayPendingOrder = (orden: Orden) => {
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

  // Cancelar una orden
  const handleConfirmCancelOrder = async (payload: any) => {
    if (!cancelTarget) return
    try {
      setLoading(true)
      await api.cancelarOrden(cancelTarget.id, payload)
      alert(`✓ Orden ${cancelTarget.folio} ha sido anulada.`)
      setCancelTarget(null)
      await loadData()
    } catch (err: any) {
      alert(`Error al anular orden: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Si PayScreen está activo, se muestra a pantalla completa
  if (payScreenState) {
    return (
      <PayScreen
        total={payScreenState.total}
        subtotal={payScreenState.subtotal}
        descuento={payScreenState.descuento}
        impuesto={payScreenState.impuesto}
        folio={payScreenState.folio}
        mesa={payScreenState.mesa}
        clienteNombre={payScreenState.cliente?.nombre}
        onConfirm={handleConfirmPaymentFromPayScreen}
        onSendToWaiting={
          payScreenState.isCart
            ? () => {
                handleConfirmOrderType({
                  tipo: payScreenState.tipo,
                  mesa: payScreenState.mesa,
                  cliente: payScreenState.cliente,
                  payNow: false,
                })
                setPayScreenState(null)
              }
            : undefined
        }
        onBack={() => setPayScreenState(null)}
      />
    )
  }

  // Filtrado de productos para la categoría actual
  const currentProds = catalogo.productos.filter(p => {
    if (selectedCat === 'todo') return true
    if (selectedCat === 'paquetes') return false
    return p.idCategoria === selectedCat
  })

  return (
    <div className="h-screen w-screen flex flex-col bg-[#D4D0C8] p-2 select-none overflow-hidden">
      {/* ── Top Bar ── */}
      <div className="bg-[#0A246A] text-white px-3 py-1.5 flex items-center justify-between border-2 border-black swing-outset shrink-0 mb-2">
        <div className="flex items-center gap-3">
          <span className="text-xl font-black tracking-wide font-sans">PIZZERÍA VOLCÁN</span>
          <span className="text-xs bg-[#1F4E79] px-2 py-0.5 font-mono text-gray-200">
            Cajero: {usuario.nombre} ({usuario.rol.toUpperCase()})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Cuentas en Espera Button */}
          <Button
            size="sm"
            variant="warning"
            onClick={() => setShowPending(true)}
            className="text-xs font-black py-1 px-3"
          >
            CUENTAS EN ESPERA ({cuentasEnEspera.length})
          </Button>

          {/* Turno Button */}
          <Button
            size="sm"
            variant="default"
            onClick={() => setShowTurno(true)}
            className="text-xs font-bold py-1 px-3"
          >
            TURNO / CAJA
          </Button>

          {/* Salir Button */}
          <Button
            size="sm"
            variant="danger"
            onClick={() => setShowExit(true)}
            className="text-xs font-black py-1 px-3"
          >
            SALIR
          </Button>
        </div>
      </div>

      {/* ── Main Layout: Menu Left (62%), Cart Right (38%) ── */}
      <div className="flex-1 grid grid-cols-12 gap-2 min-h-0">
        {/* Left Side: Category Tabs & Products Grid */}
        <div className="col-span-8 flex flex-col min-h-0 gap-2">
          {/* Category Tabs Bar */}
          <div className="flex gap-1.5 shrink-0 overflow-x-auto pb-1">
            <Button
              size="md"
              variant="tab"
              active={selectedCat === 'todo'}
              onClick={() => setSelectedCat('todo')}
              className="text-sm font-black min-w-[90px]"
            >
              TODO
            </Button>

            {catalogo.categorias.map(cat => (
              <Button
                key={cat.id}
                size="md"
                variant="tab"
                active={selectedCat === cat.id}
                onClick={() => setSelectedCat(cat.id)}
                className="text-sm font-black min-w-[100px]"
                style={
                  selectedCat === cat.id
                    ? { borderTopColor: cat.color, borderTopWidth: '4px' }
                    : {}
                }
              >
                {cat.nombre.toUpperCase()}
              </Button>
            ))}

            <Button
              size="md"
              variant="tab"
              active={selectedCat === 'paquetes'}
              onClick={() => setSelectedCat('paquetes')}
              className="text-sm font-black min-w-[100px]"
            >
              PAQUETES
            </Button>
          </div>

          {/* Main Menu Panel */}
          <Panel className="flex-1">
            <div className="p-2 flex-1 overflow-y-auto bg-[#ECE9D8] swing-inset">
              {/* When in "TODO": Show Category Big Cards first */}
              {selectedCat === 'todo' && (
                <div className="mb-3">
                  <span className="text-xs font-black text-gray-700 uppercase tracking-wider mb-1.5 block">
                    Categorías Principales (Toca para ir):
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    {catalogo.categorias.map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCat(cat.id)}
                        className="swing-button flex flex-col items-center justify-center p-3 text-center min-h-[72px]"
                        style={{ borderTop: `4px solid ${cat.color}` }}
                      >
                        <span className="text-base font-black text-black">{cat.nombre.toUpperCase()}</span>
                        <span className="text-xs text-gray-600 font-bold">
                          {catalogo.productos.filter(p => p.idCategoria === cat.id).length} productos
                        </span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setSelectedCat('paquetes')}
                      className="swing-button flex flex-col items-center justify-center p-3 text-center min-h-[72px]"
                      style={{ borderTop: '4px solid #4A148C' }}
                    >
                      <span className="text-base font-black text-black">PAQUETES</span>
                      <span className="text-xs text-gray-600 font-bold">
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
                    <span className="text-xs font-black text-gray-700 uppercase tracking-wider mb-1.5 block">
                      Todos los Productos:
                    </span>
                  )}
                  <div className="grid grid-cols-3 xl:grid-cols-4 gap-2">
                    {currentProds.map(prod => {
                      const cat = catalogo.categorias.find(c => c.id === prod.idCategoria)
                      const catColor = cat?.color || '#0A246A'
                      return (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() => handleProductClick(prod)}
                          className="swing-button flex flex-col justify-between p-3 min-h-[84px] text-left"
                          style={{ borderLeft: `6px solid ${catColor}` }}
                        >
                          <div>
                            <span className="text-base font-black text-black block leading-tight">
                              {prod.nombre}
                            </span>
                            {prod.descripcion && (
                              <span className="text-[11px] text-gray-600 font-normal line-clamp-1">
                                {prod.descripcion}
                              </span>
                            )}
                          </div>
                          <span className="text-lg font-black font-mono text-[#0A246A] mt-2">
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
                <div className="mt-3">
                  <span className="text-xs font-black text-gray-700 uppercase tracking-wider mb-1.5 block">
                    Paquetes y Combos:
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {catalogo.paquetes.map(paq => (
                      <button
                        key={paq.id}
                        type="button"
                        onClick={() => handleAddPaquete(paq)}
                        className="swing-button flex flex-col justify-between p-3 min-h-[84px] text-left border-l-[6px] border-l-[#4A148C]"
                      >
                        <div>
                          <span className="text-base font-black text-black block leading-tight">
                            {paq.nombre}
                          </span>
                          {paq.descripcion && (
                            <span className="text-[11px] text-gray-600 font-normal line-clamp-2">
                              {paq.descripcion}
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between items-baseline mt-2">
                          <span className="text-lg font-black font-mono text-[#0A246A]">
                            {fmt(paq.precio)}
                          </span>
                          {paq.precioIndividual && paq.precioIndividual > paq.precio && (
                            <span className="text-[10px] text-green-700 font-bold">
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
        </div>

        {/* Right Side: Order Ticket & Totals (38%) */}
        <div className="col-span-4 flex flex-col min-h-0">
          <Panel
            title="TICKET DE VENTA"
            headerRight={
              <span className="text-xs font-mono font-bold bg-[#1F4E79] px-2 py-0.5">
                {cart.length} {cart.length === 1 ? 'artículo' : 'artículos'}
              </span>
            }
            className="flex-1"
          >
            <div className="flex-1 flex flex-col justify-between bg-white swing-inset min-h-0 p-2">
              {/* Lines list */}
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 font-bold text-center p-4">
                    <span className="text-lg block mb-1">LA ORDEN ESTÁ VACÍA</span>
                    <span className="text-xs">Toca cualquier producto a la izquierda para agregarlo.</span>
                  </div>
                ) : (
                  cart.map((it, idx) => (
                    <div
                      key={it.uid}
                      className="p-2 swing-outset-thin bg-[#FAFAFA] flex flex-col gap-1 border border-gray-300"
                    >
                      <div className="flex justify-between items-baseline">
                        <div className="flex items-baseline gap-1.5 flex-1 min-w-0 pr-2">
                          <span className="text-base font-black font-mono text-[#0A246A]">
                            {it.cantidad}×
                          </span>
                          <span className="text-sm font-black text-black truncate">{it.nombre}</span>
                        </div>

                        <span className="text-base font-black font-mono text-black shrink-0">
                          {fmt(it.precioFinal * it.cantidad)}
                        </span>
                      </div>

                      {/* Modifiers (Tamaño, Masa) */}
                      {(it.tamano || it.masa) && (
                        <div className="text-[11px] text-gray-600 font-bold">
                          {it.tamano ? `Tamaño: ${it.tamano}` : ''}
                          {it.tamano && it.masa ? ' · ' : ''}
                          {it.masa ? `Masa: ${it.masa}` : ''}
                        </div>
                      )}

                      {/* Line notes / Comments for kitchen */}
                      {it.notas && (
                        <div className="text-xs font-bold text-[#B71C1C] bg-[#FFFDE7] p-1 border border-[#FBC02D]">
                          Nota cocina: {it.notas}
                        </div>
                      )}

                      {/* Action buttons (Edit note, Delete) */}
                      <div className="flex justify-end gap-1 pt-1 border-t border-gray-200 mt-1">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => {
                            setEditingCartItemNote(idx)
                            setItemNoteInput(it.notas || '')
                          }}
                          className="text-[11px] font-bold py-0.5 px-2 min-h-[32px]"
                        >
                          {it.notas ? 'EDITAR NOTA' : '+ NOTA'}
                        </Button>

                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleRemoveCartItem(idx)}
                          className="text-[11px] font-black py-0.5 px-2 min-h-[32px]"
                          title="Eliminar producto de la orden"
                        >
                          ELIMINAR
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Totals Summary */}
              <div className="pt-2 border-t-2 border-black bg-[#ECE9D8] swing-inset p-2.5 mt-2 shrink-0">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-gray-700">
                    <span className="font-bold">Subtotal:</span>
                    <span className="font-mono font-bold">{fmt(subtotal)}</span>
                  </div>

                  {descuentoPct > 0 && (
                    <div className="flex justify-between text-red-700">
                      <span className="font-bold">Descuento ({descuentoPct}%):</span>
                      <span className="font-mono font-bold">-{fmt(descuento)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-gray-700">
                    <span className="font-bold">IVA (16% incluido):</span>
                    <span className="font-mono font-bold">{fmt(impuesto)}</span>
                  </div>

                  <div className="pt-1.5 border-t border-gray-400 flex justify-between items-baseline">
                    <span className="text-base font-black text-black">TOTAL A PAGAR:</span>
                    <span className="text-2xl font-black font-mono text-[#0A246A]">{fmt(total)}</span>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="flex gap-2 mt-3">
                  <Button
                    size="md"
                    variant="default"
                    disabled={cart.length === 0}
                    onClick={() => {
                      if (confirm('¿Vaciar todos los productos del ticket actual?')) {
                        setCart([])
                        setDescuentoPct(0)
                      }
                    }}
                    className="text-xs font-bold"
                  >
                    VACIAR
                  </Button>

                  <Button
                    size="md"
                    variant="default"
                    onClick={() => {
                      const pct = prompt('Introduce el porcentaje de descuento (0 - 100):', String(descuentoPct))
                      if (pct !== null) {
                        const n = Math.max(0, Math.min(100, parseFloat(pct) || 0))
                        setDescuentoPct(n)
                      }
                    }}
                    className="text-xs font-bold"
                  >
                    {descuentoPct > 0 ? `DESC: ${descuentoPct}%` : 'DESCUENTO'}
                  </Button>

                  <Button
                    size="lg"
                    variant="success"
                    disabled={cart.length === 0}
                    onClick={handleStartPay}
                    className="flex-1 text-lg font-black tracking-wider py-3"
                  >
                    PAGAR CUENTA
                  </Button>
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      {/* ── Modals ── */}
      {/* 1. Customizer Modal */}
      {customizingProduct && (
        <CustomizerModal
          item={customizingProduct.item}
          isPizza={customizingProduct.isPizza}
          config={cfg}
          notasRapidas={catalogo.notasRapidas}
          onConfirm={handleConfirmCustomizer}
          onClose={() => setCustomizingProduct(null)}
        />
      )}

      {/* 2. Modal for editing line note */}
      {editingCartItemNote !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 select-none">
          <div className="w-full max-w-md swing-outset bg-[#D4D0C8] p-4 flex flex-col gap-3 border-2 border-black">
            <span className="text-sm font-black text-[#0A246A] uppercase">
              Editar Comentario de Cocina:
            </span>
            <input
              type="text"
              value={itemNoteInput}
              onChange={e => setItemNoteInput(e.target.value)}
              placeholder="Ej. Sin cebolla, extra salsa..."
              className="w-full h-12 px-3 text-base font-bold bg-white swing-inset outline-none text-black"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button size="md" variant="default" onClick={() => setEditingCartItemNote(null)}>
                CANCELAR
              </Button>
              <Button
                size="md"
                variant="success"
                onClick={() => handleSaveItemNote(editingCartItemNote)}
                className="font-black px-6"
              >
                GUARDAR NOTA
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Order Type & Destination Modal */}
      {showOrderType && (
        <OrderTypeModal
          mesas={catalogo.mesas}
          onConfirm={handleConfirmOrderType}
          onClose={() => setShowOrderType(false)}
        />
      )}

      {/* 4. Cuentas en Espera Modal */}
      {showPending && (
        <PendingAccountsModal
          ordenes={ordenes}
          onClose={() => setShowPending(false)}
          onPayOrder={handlePayPendingOrder}
          onCancelOrder={o => {
            setShowPending(false)
            setCancelTarget(o)
          }}
        />
      )}

      {/* 5. Exit Menu Modal */}
      {showExit && (
        <ExitMenuModal
          usuario={usuario}
          onClose={() => setShowExit(false)}
          onLogout={onLogout}
          onOpenConsultarNotas={() => setShowNotas(true)}
          onOpenTurnos={() => setShowTurno(true)}
          onGoCocina={onGoCocina}
          onGoAdmin={onGoAdmin}
        />
      )}

      {/* 6. Turno Modal */}
      {showTurno && <TurnoModal usuario={usuario} onClose={() => setShowTurno(false)} />}

      {/* 7. Consultar Notas Modal */}
      {showNotas && (
        <ConsultarNotasModal
          onClose={() => setShowNotas(false)}
          onCancelOrder={o => setCancelTarget(o)}
        />
      )}

      {/* 8. Cancel Order Dialog */}
      {cancelTarget && (
        <CancelDialog
          order={cancelTarget}
          needsSupervisor={!usuario.permisos.includes('cancelar')}
          onConfirm={handleConfirmCancelOrder}
          onClose={() => setCancelTarget(null)}
        />
      )}
    </div>
  )
}
