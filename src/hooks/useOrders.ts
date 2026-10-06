import { useState, useEffect, useCallback } from 'react'
import { Order, OrderStatus, PayMethod, OrdersStore, PizzaSize, PizzaDough } from '../types'
import { isClosed } from '../constants/orderRules'
import { api } from '../services/api'

export function useOrders(): OrdersStore {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    try {
      const data = await api.getOrdenes()
      setOrders(data)
      setError(null)
    } catch (err: any) {
      console.error('Error al sincronizar órdenes con el backend:', err)
      setError(err.message || 'Error al conectar con la base de datos')
    } finally {
      setLoading(false)
    }
  }, [])

  // Carga inicial y sondeo periódico para mantener sincronizadas las comandas
  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 4000)
    return () => clearInterval(interval)
  }, [fetchOrders])

  const create = async (
    draft: Omit<Order, 'id'>,
    paymentDetails?: { montoRecibido?: number; cambio?: number; propina?: number }
  ): Promise<string> => {
    try {
      const itemsPayload = draft.items.map(i => {
        const isPaq = Boolean(i.item.isPackage || i.item.idPaquete)
        const numId =
          typeof i.item.id === 'number'
            ? i.item.id
            : parseInt(String(i.item.id).replace(/\D/g, ''), 10)

        return {
          idProducto: isPaq ? null : isNaN(numId) ? null : numId,
          idPaquete: isPaq ? i.item.idPaquete || numId : null,
          cantidad: i.qty,
          tamano: isPaq ? undefined : (i.size as PizzaSize | undefined),
          masa: isPaq ? undefined : (i.dough as PizzaDough | undefined),
          precioUnitario: i.item.basePrice,
          precioFinal: i.finalPrice,
        }
      })

      const nueva = await api.createOrden({
        tipo: draft.orderType,
        subtotal: draft.items.reduce((s, i) => s + i.finalPrice * i.qty, 0),
        descuentoTotal: draft.discount,
        impuesto: 0,
        total: draft.total,
        metodoPago: draft.payMethod,
        pendingPayment: draft.payMethod === null,
        idCliente: draft.idCliente || null,
        comentarios: draft.clienteNotas || undefined,
        items: itemsPayload,
        montoRecibido: paymentDetails?.montoRecibido,
        cambio: paymentDetails?.cambio,
        propina: paymentDetails?.propina,
      })

      await fetchOrders()
      return nueva.folio || `#${nueva.id_orden}`
    } catch (err: any) {
      console.error('Error al crear orden en backend:', err)
      throw err
    }
  }

  const setStatus = async (id: string, status: OrderStatus): Promise<void> => {
    // Actualización optimista inmediata
    setOrders(prev =>
      prev.map(o => (o.id === id || String(o.numericId) === id ? { ...o, status } : o))
    )
    try {
      const target = orders.find(o => o.id === id || String(o.numericId) === id)
      const idParam = target?.numericId || id
      await api.updateEstado(idParam, status)
      await fetchOrders()
    } catch (err: any) {
      console.error('Error al actualizar estado:', err)
      await fetchOrders()
      throw err
    }
  }

  const collect = async (
    id: string,
    payMethod: PayMethod,
    paymentDetails?: { montoRecibido?: number; cambio?: number; propina?: number }
  ): Promise<void> => {
    // Actualización optimista inmediata
    setOrders(prev =>
      prev.map(o =>
        o.id === id || String(o.numericId) === id
          ? { ...o, payMethod, status: 'entregado' }
          : o
      )
    )
    try {
      const target = orders.find(o => o.id === id || String(o.numericId) === id)
      const idParam = target?.numericId || id
      await api.pagarOrden(idParam, {
        metodoPago: payMethod,
        montoRecibido: paymentDetails?.montoRecibido,
        cambio: paymentDetails?.cambio,
        propina: paymentDetails?.propina,
      })
      await fetchOrders()
    } catch (err: any) {
      console.error('Error al cobrar orden:', err)
      await fetchOrders()
      throw err
    }
  }

  const cancel = async (id: string, reason: string): Promise<void> => {
    // Actualización optimista inmediata
    setOrders(prev =>
      prev.map(o =>
        o.id === id || String(o.numericId) === id
          ? {
              ...o,
              status: 'cancelado',
              cancelReason: reason,
              refund: o.payMethod ? o.total : undefined,
            }
          : o
      )
    )
    try {
      const target = orders.find(o => o.id === id || String(o.numericId) === id)
      const idParam = target?.numericId || id
      await api.cancelarOrden(idParam, reason)
      await fetchOrders()
    } catch (err: any) {
      console.error('Error al cancelar orden:', err)
      await fetchOrders()
      throw err
    }
  }

  const clearClosed = () => {
    setOrders(prev => prev.filter(o => !isClosed(o.status)))
  }

  return {
    orders,
    loading,
    error,
    refresh: fetchOrders,
    create,
    setStatus,
    collect,
    cancel,
    clearClosed,
  }
}
