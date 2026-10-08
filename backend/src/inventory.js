/** Descuento de inventario por receta (FEFO, multi-lote, con bloqueo) y restitución al cancelar. */

export async function consumeInventory(client, { idOrden, folio, idEmpleado, lines }) {
  // 1) Cantidad vendida por producto (los paquetes se expanden a sus productos)
  const qtyByProduct = new Map()
  const add = (id, q) => qtyByProduct.set(id, (qtyByProduct.get(id) || 0) + q)

  for (const l of lines) if (l.idProducto) add(l.idProducto, l.cantidad)

  const paqLines = lines.filter(l => l.idPaquete)
  if (paqLines.length) {
    const det = await client.query(
      `SELECT id_paquete, id_producto, cantidad FROM public.paquete_detalle WHERE id_paquete = ANY($1)`,
      [[...new Set(paqLines.map(l => l.idPaquete))]]
    )
    for (const l of paqLines) {
      det.rows.filter(d => d.id_paquete === l.idPaquete).forEach(d => add(d.id_producto, d.cantidad * l.cantidad))
    }
  }
  if (!qtyByProduct.size) return

  // 2) Insumos necesarios
  const rec = await client.query(
    `SELECT id_producto, id_insumo, cantidad FROM public.recetas WHERE id_producto = ANY($1)`,
    [[...qtyByProduct.keys()]]
  )
  const needByInsumo = new Map()
  for (const r of rec.rows) {
    const q = parseFloat(r.cantidad) * (qtyByProduct.get(r.id_producto) || 0)
    needByInsumo.set(r.id_insumo, (needByInsumo.get(r.id_insumo) || 0) + q)
  }

  // 3) Consumir por lote (primero el que caduca antes). Orden por id_insumo evita deadlocks.
  for (const idInsumo of [...needByInsumo.keys()].sort((a, b) => a - b)) {
    let remaining = needByInsumo.get(idInsumo)
    const lotes = await client.query(
      `SELECT id_lote, cantidad_actual_base FROM public.lotes_insumo
       WHERE id_insumo = $1 AND cantidad_actual_base > 0
         AND (fecha_caducidad IS NULL OR fecha_caducidad >= CURRENT_DATE)
       ORDER BY fecha_caducidad NULLS LAST, id_lote
       FOR UPDATE`,
      [idInsumo]
    )
    for (const lote of lotes.rows) {
      if (remaining <= 0) break
      const take = Math.min(remaining, parseFloat(lote.cantidad_actual_base))
      await client.query(
        `UPDATE public.lotes_insumo SET cantidad_actual_base = cantidad_actual_base - $1 WHERE id_lote = $2`,
        [take, lote.id_lote]
      )
      await client.query(
        `INSERT INTO public.movimientos_inventario
           (id_insumo, id_lote, tipo, motivo, cantidad, id_orden, id_empleado, notas)
         VALUES ($1, $2, 'salida', 'venta', $3, $4, $5, $6)`,
        [idInsumo, lote.id_lote, take, idOrden, idEmpleado, `Consumo receta orden ${folio}`]
      )
      remaining -= take
    }
    if (remaining > 0.0001) {
      // No se bloquea la venta por falta de stock registrado; se deja aviso en consola.
      console.warn(`⚠ Stock insuficiente del insumo ${idInsumo} en la orden ${folio}: faltaron ${remaining}`)
    }
  }
}

export async function restoreInventory(client, { idOrden, folio, idEmpleado }) {
  const movs = await client.query(
    `SELECT id_insumo, id_lote, cantidad FROM public.movimientos_inventario
     WHERE id_orden = $1 AND tipo = 'salida' AND motivo = 'venta' AND id_lote IS NOT NULL`,
    [idOrden]
  )
  for (const m of movs.rows) {
    await client.query(
      `UPDATE public.lotes_insumo SET cantidad_actual_base = cantidad_actual_base + $1 WHERE id_lote = $2`,
      [m.cantidad, m.id_lote]
    )
    await client.query(
      `INSERT INTO public.movimientos_inventario
         (id_insumo, id_lote, tipo, motivo, cantidad, id_orden, id_empleado, notas)
       VALUES ($1, $2, 'entrada', 'ajuste_manual', $3, $4, $5, $6)`,
      [m.id_insumo, m.id_lote, m.cantidad, idOrden, idEmpleado, `Restitución por cancelación ${folio}`]
    )
  }
}
