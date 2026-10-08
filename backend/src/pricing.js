import { HttpError } from './http.js'

/** Todo el dinero se maneja en CENTAVOS enteros para evitar errores de punto flotante. */
export const cents = n => Math.round(Number(n) * 100)
export const fromCents = c => c / 100

/**
 * Convierte las líneas que manda el cliente en líneas con precios REALES de la BD.
 * El cliente nunca decide el precio: solo qué producto/paquete, cantidad y opciones.
 */
export async function priceItems(client, items, cfg) {
  const prodIds = [...new Set(items.filter(i => i.idProducto).map(i => i.idProducto))]
  const paqIds = [...new Set(items.filter(i => i.idPaquete).map(i => i.idPaquete))]

  const prods = new Map()
  if (prodIds.length) {
    const r = await client.query(
      `SELECT p.id_producto, p.nombre, p.precio_base, LOWER(c.nombre) AS categoria
       FROM public.productos p JOIN public.categorias c ON c.id_categoria = p.id_categoria
       WHERE p.id_producto = ANY($1) AND p.activo = TRUE`,
      [prodIds]
    )
    r.rows.forEach(p => prods.set(p.id_producto, p))
  }
  const paqs = new Map()
  if (paqIds.length) {
    const r = await client.query(
      `SELECT id_paquete, nombre, precio_paquete, precio_individual
       FROM public.paquetes WHERE id_paquete = ANY($1) AND activo = TRUE`,
      [paqIds]
    )
    r.rows.forEach(p => paqs.set(p.id_paquete, p))
  }

  return items.map(it => {
    if (it.idProducto) {
      const p = prods.get(it.idProducto)
      if (!p) throw new HttpError(400, `El producto ${it.idProducto} no existe o está desactivado`)
      const base = cents(p.precio_base)
      let unit = base
      let tamano = null
      let masa = null
      if (p.categoria === 'pizzas') {
        tamano = it.tamano || 'Mediana'
        masa = it.masa || 'Delgada'
        unit += cents(cfg.extras[tamano] ?? 0) + cents(cfg.extras[masa] ?? 0)
      }
      return {
        idProducto: p.id_producto,
        idPaquete: null,
        nombre: p.nombre,
        cantidad: it.cantidad,
        tamano,
        masa,
        notas: it.notas?.trim() || null,
        unitBase: base,
        unitFinal: Math.max(0, unit),
      }
    }
    const p = paqs.get(it.idPaquete)
    if (!p) throw new HttpError(400, `El paquete ${it.idPaquete} no existe o está desactivado`)
    const base = cents(p.precio_paquete)
    return {
      idProducto: null,
      idPaquete: p.id_paquete,
      nombre: p.nombre,
      cantidad: it.cantidad,
      tamano: null,
      masa: null,
      notas: it.notas?.trim() || null,
      unitBase: base,
      unitFinal: base,
      precioIndividual: cents(p.precio_individual ?? p.precio_paquete),
    }
  })
}

/**
 * bruto = suma de líneas; descuento = % sobre bruto; el IVA va incluido (o se suma) según configuración.
 * Devuelve centavos.
 */
export function totals(lines, pct, cfg) {
  const bruto = lines.reduce((s, l) => s + l.unitFinal * l.cantidad, 0)
  const descuento = Math.round((bruto * pct) / 100)
  const neto = bruto - descuento
  if (cfg.ivaIncluido) {
    return { bruto, descuento, impuesto: neto - Math.round(neto / (1 + cfg.ivaTasa)), total: neto }
  }
  const impuesto = Math.round(neto * cfg.ivaTasa)
  return { bruto, descuento, impuesto, total: neto + impuesto }
}

/**
 * Valida los pagos contra el total. Devuelve filas listas para insertar y el método principal.
 * - Cada pago: monto aplicado a la cuenta (centavos). En efectivo puede traer montoRecibido (para el cambio).
 * - La suma de montos debe ser EXACTAMENTE el total.
 */
export function normalizePagos(pagos, totalCents, propina = 0) {
  if (!pagos?.length) throw new HttpError(400, 'Falta al menos un pago')
  const rows = pagos.map(p => {
    const monto = cents(p.monto)
    let recibido = p.montoRecibido != null ? cents(p.montoRecibido) : monto
    if (p.metodo !== 'efectivo') recibido = monto
    if (recibido < monto) throw new HttpError(400, 'El monto recibido no puede ser menor al monto aplicado')
    return { metodo: p.metodo, monto, recibido, cambio: recibido - monto, propina: 0 }
  })
  const suma = rows.reduce((s, r) => s + r.monto, 0)
  if (suma !== totalCents) {
    throw new HttpError(
      400,
      `Los pagos suman $${fromCents(suma).toFixed(2)} y el total es $${fromCents(totalCents).toFixed(2)}`
    )
  }
  rows[0].propina = cents(propina || 0)
  const metodos = [...new Set(rows.map(r => r.metodo))]
  return { rows, metodoPrincipal: metodos.length > 1 ? 'mixto' : metodos[0] }
}

export function turnoNombre(date = new Date()) {
  const h = date.getHours()
  return h < 12 ? 'mañana' : h < 18 ? 'tarde' : 'noche'
}
