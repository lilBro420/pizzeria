import { DetalleOrden, Orden } from '../types'

export const fmt = (n: number | null | undefined): string => {
  if (n === null || n === undefined || isNaN(n)) return '$0.00'
  return `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export const uid = (): string => Math.random().toString(36).slice(2, 9)

export const nowTime = (): string =>
  new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

export const formatFecha = (iso: string): string => {
  try {
    const d = new Date(iso)
    return d.toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

/**
 * Cálculo de totales en CENTAVOS enteros para evitar discrepancias de redondeo.
 * El IVA está incluido por defecto (según la respuesta del usuario).
 */
export const calcTotals = (
  items: DetalleOrden[],
  discountPct = 0,
  ivaTasa = 0.16,
  ivaIncluido = true
): {
  subtotal: number
  descuento: number
  impuesto: number
  total: number
} => {
  const brutoCents = items.reduce((acc, it) => acc + Math.round(it.precioFinal * 100) * it.cantidad, 0)
  const descCents = Math.round((brutoCents * discountPct) / 100)
  const netoCents = brutoCents - descCents

  let impCents = 0
  let totCents = netoCents

  if (ivaIncluido) {
    impCents = netoCents - Math.round(netoCents / (1 + ivaTasa))
    totCents = netoCents
  } else {
    impCents = Math.round(netoCents * ivaTasa)
    totCents = netoCents + impCents
  }

  return {
    subtotal: brutoCents / 100,
    descuento: descCents / 100,
    impuesto: impCents / 100,
    total: totCents / 100,
  }
}

export const itemsSummary = (o: Orden): string =>
  o.items.map(i => `${i.cantidad}× ${i.nombre}`).join(', ') || 'Sin detalle'
