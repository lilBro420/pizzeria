import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import pg from 'pg'

dotenv.config()

const { Pool } = pg
const app = express()
app.use(cors())
app.use(express.json())

// ─── Pool de conexiones a Supabase ──────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

// ─── Verificación al arrancar ───────────────────────────────────────
async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW() AS ahora, current_database() AS db')
    console.log('✅ Conexión a Supabase OK')
    console.log('   Hora del servidor:', result.rows[0].ahora)
    console.log('   Base de datos:', result.rows[0].db)
  } catch (err) {
    console.error('❌ Error al conectar a la base de datos:', err.message)
    process.exit(1)
  }
}

// ─── Health check ───────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS ahora')
    res.json({
      ok: true,
      mensaje: 'Backend funcionando correctamente',
      db_time: result.rows[0].ahora,
    })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// ─── Categorías ─────────────────────────────────────────────────────
app.get('/api/categorias', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id_categoria, nombre, orden, activo FROM public.categorias WHERE activo = TRUE ORDER BY orden, id_categoria'
    )
    res.json({ ok: true, total: result.rowCount, categorias: result.rows })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// ─── Productos ──────────────────────────────────────────────────────
app.get('/api/productos', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.id_producto, 
        p.nombre, 
        p.descripcion, 
        p.precio_base, 
        p.id_categoria, 
        c.nombre AS categoria_nombre,
        p.emoji, 
        p.activo
      FROM public.productos p
      LEFT JOIN public.categorias c ON p.id_categoria = c.id_categoria
      WHERE p.activo = TRUE 
      ORDER BY p.id_categoria, p.id_producto
    `)
    res.json({ ok: true, total: result.rowCount, productos: result.rows })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// ─── Paquetes / Combos ──────────────────────────────────────────────
app.get('/api/paquetes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.id_paquete, 
        p.nombre, 
        p.descripcion, 
        p.precio_paquete, 
        p.precio_individual, 
        p.imagen, 
        p.categoria_paquete, 
        p.activo,
        json_agg(
          json_build_object(
            'id_detalle', pd.id_detalle,
            'id_producto', pd.id_producto,
            'cantidad', pd.cantidad,
            'permite_sustitucion', pd.permite_sustitucion,
            'productos_sustitutos', pd.productos_sustitutos,
            'costo_extra_sustitucion', pd.costo_extra_sustitucion,
            'producto_nombre', pr.nombre,
            'producto_emoji', pr.emoji
          )
        ) AS items_incluidos
      FROM public.paquetes p
      LEFT JOIN public.paquete_detalle pd ON p.id_paquete = pd.id_paquete
      LEFT JOIN public.productos pr ON pd.id_producto = pr.id_producto
      WHERE p.activo = TRUE
      GROUP BY p.id_paquete
      ORDER BY p.id_paquete
    `)
    res.json({ ok: true, total: result.rowCount, paquetes: result.rows })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// ─── Clientes ───────────────────────────────────────────────────────
app.get('/api/clientes', async (req, res) => {
  try {
    const { search } = req.query
    let query = `
      SELECT 
        id_cliente, celular, nombre, apellido, direccion_principal, 
        referencias, entre_calles, codigo_postal, notas, total_ordenes, activo
      FROM public.clientes
      WHERE activo = TRUE
    `
    const params = []
    if (search) {
      query += ` AND (celular ILIKE $1 OR nombre ILIKE $1 OR apellido ILIKE $1)`
      params.push(`%${search}%`)
    }
    query += ` ORDER BY id_cliente`

    const result = await pool.query(query, params)
    res.json({ ok: true, total: result.rowCount, clientes: result.rows })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// ─── Usuarios (Personal) ────────────────────────────────────────────
app.get('/api/usuarios', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id_usuario, nombre, correo, rol, activo
      FROM public.usuarios
      WHERE activo = TRUE
      ORDER BY id_usuario
    `)
    res.json({ ok: true, total: result.rowCount, usuarios: result.rows })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// ─── Insumos / Inventario ───────────────────────────────────────────
app.get('/api/insumos', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        i.id_insumo, 
        i.nombre, 
        i.unidad_base, 
        i.punto_reorden, 
        i.costo_promedio, 
        i.activo,
        COALESCE(SUM(l.cantidad_actual_base), 0) AS stock_actual
      FROM public.insumos i
      LEFT JOIN public.lotes_insumo l ON i.id_insumo = l.id_insumo
      WHERE i.activo = TRUE
      GROUP BY i.id_insumo
      ORDER BY i.id_insumo
    `)
    res.json({ ok: true, total: result.rowCount, insumos: result.rows })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// ─── Obtener todas las órdenes con detalles ─────────────────────────
app.get('/api/ordenes', async (req, res) => {
  try {
    const ordersRes = await pool.query(`
      SELECT 
        o.id_orden,
        o.folio,
        o.id_cliente,
        c.nombre AS cliente_nombre,
        c.apellido AS cliente_apellido,
        c.celular AS cliente_celular,
        c.direccion_principal AS cliente_direccion,
        c.referencias AS cliente_referencias,
        c.notas AS cliente_notas,
        o.id_empleado,
        u.nombre AS cajero_nombre,
        o.tipo,
        o.estado_actual,
        o.subtotal,
        o.descuento_total,
        o.impuesto,
        o.total,
        o.metodo_pago,
        o.pending_payment,
        o.comentarios,
        o.fecha_creacion,
        o.fecha_entrega,
        canc.motivo AS cancel_motivo,
        canc.monto_ya_cobrado AS cancel_reembolso
      FROM public.ordenes o
      LEFT JOIN public.clientes c ON o.id_cliente = c.id_cliente
      LEFT JOIN public.usuarios u ON o.id_empleado = u.id_usuario
      LEFT JOIN public.cancelacionesauditoria canc ON o.id_orden = canc.id_orden
      ORDER BY o.fecha_creacion DESC, o.id_orden DESC
    `)

    const detailsRes = await pool.query(`
      SELECT 
        d.id_detalle,
        d.id_orden,
        d.id_producto,
        d.id_paquete,
        d.cantidad,
        d.tamano,
        d.masa,
        d.precio_unitario,
        d.precio_final,
        d.notas,
        p.nombre AS producto_nombre,
        p.emoji AS producto_emoji,
        p.descripcion AS producto_desc,
        p.precio_base AS producto_precio_base,
        c.nombre AS categoria_nombre,
        paq.nombre AS paquete_nombre,
        paq.imagen AS paquete_emoji,
        paq.descripcion AS paquete_desc,
        paq.precio_paquete AS paquete_precio
      FROM public.orden_detalle d
      LEFT JOIN public.productos p ON d.id_producto = p.id_producto
      LEFT JOIN public.categorias c ON p.id_categoria = c.id_categoria
      LEFT JOIN public.paquetes paq ON d.id_paquete = paq.id_paquete
      ORDER BY d.id_detalle ASC
    `)

    const itemsByOrder = {}
    detailsRes.rows.forEach(det => {
      if (!itemsByOrder[det.id_orden]) {
        itemsByOrder[det.id_orden] = []
      }
      itemsByOrder[det.id_orden].push(det)
    })

    const ordenes = ordersRes.rows.map(o => ({
      ...o,
      items: itemsByOrder[o.id_orden] || [],
    }))

    res.json({ ok: true, total: ordenes.length, ordenes })
  } catch (err) {
    console.error('Error al obtener órdenes:', err)
    res.status(500).json({ ok: false, error: err.message })
  }
})

// ─── Crear nueva orden ──────────────────────────────────────────────
app.post('/api/ordenes', async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const {
      idCliente = null,
      idEmpleado = 2, // Ana López (cajera por defecto)
      tipo = 'llevar', // 'local' | 'llevar' | 'recoger' | 'domicilio'
      subtotal,
      descuentoTotal = 0,
      impuesto = 0,
      total,
      metodoPago = null, // 'efectivo' | 'tarjeta' | 'transferencia' | null
      pendingPayment = false,
      comentarios = null,
      items = [],
      montoRecibido = null,
      cambio = 0,
      propina = 0,
    } = req.body

    // Generar siguiente folio consecutivo seguro
    const maxFolioRes = await client.query(`
      SELECT COALESCE(MAX(CAST(SUBSTRING(folio FROM 2) AS INTEGER)), 4000) + 1 AS next_f 
      FROM public.ordenes 
      WHERE folio ~ '^#[0-9]+'
    `)
    const folio = `#${maxFolioRes.rows[0].next_f}`

    const estadoInicial = 'preparando'

    const orderRes = await client.query(
      `INSERT INTO public.ordenes (
        folio, id_cliente, id_empleado, tipo, estado_actual,
        subtotal, descuento_total, impuesto, total,
        metodo_pago, pending_payment, comentarios, fecha_creacion
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      RETURNING *`,
      [
        folio,
        idCliente || null,
        idEmpleado,
        tipo,
        estadoInicial,
        subtotal,
        descuentoTotal,
        impuesto,
        total,
        metodoPago,
        pendingPayment,
        comentarios,
      ]
    )

    const nuevaOrden = orderRes.rows[0]
    const idOrden = nuevaOrden.id_orden

    // Insertar líneas en orden_detalle respetando la regla CHECK
    // (id_producto IS NOT NULL AND id_paquete IS NULL) OR (id_producto IS NULL AND id_paquete IS NOT NULL)
    const insertedItems = []
    for (const item of items) {
      const isPaquete = Boolean(item.idPaquete)
      const idProducto = isPaquete ? null : (item.idProducto ? Number(item.idProducto) : null)
      const idPaquete = isPaquete ? Number(item.idPaquete) : null

      const detRes = await client.query(
        `INSERT INTO public.orden_detalle (
          id_orden, id_producto, id_paquete, cantidad,
          tamano, masa, precio_unitario, precio_final, notas
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          idOrden,
          idProducto,
          idPaquete,
          item.cantidad || 1,
          isPaquete ? null : item.tamano || null,
          isPaquete ? null : item.masa || null,
          item.precioUnitario || item.precioFinal,
          item.precioFinal,
          item.notas || null,
        ]
      )

      const nuevoDetalle = detRes.rows[0]
      insertedItems.push(nuevoDetalle)

      // Si es paquete, registrar auditoría en ventas_paquetes_auditoria
      if (idPaquete) {
        const paqInfo = await client.query('SELECT * FROM public.paquetes WHERE id_paquete = $1', [idPaquete])
        if (paqInfo.rowCount > 0) {
          const pData = paqInfo.rows[0]
          const precioPaq = parseFloat(pData.precio_paquete)
          const precioInd = parseFloat(pData.precio_individual || pData.precio_paquete)
          const ahorro = Math.max(0, precioInd - precioPaq)

          await client.query(`
            INSERT INTO public.ventas_paquetes_auditoria (
              id_paquete, id_orden, id_orden_detalle, timestamp,
              id_empleado, turno, precio_paquete_aplicado, precio_individual_suma,
              ahorro_cliente, productos_incluidos, tuvo_sustitucion, sustituciones_realizadas,
              cargo_extra_sustitucion, sustitucion_era_valida, flag_sospechoso, notas
            ) VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          `, [
            idPaquete,
            idOrden,
            nuevoDetalle.id_detalle,
            idEmpleado,
            'tarde',
            precioPaq,
            precioInd,
            ahorro,
            pData.descripcion || pData.nombre,
            false,
            null,
            0,
            true,
            false,
            'Venta desde POS',
          ])
        }
      }

      // Descuento de stock en inventario por receta si aplica
      if (idProducto) {
        const recetas = await client.query('SELECT * FROM public.recetas WHERE id_producto = $1', [idProducto])
        for (const r of recetas.rows) {
          const consumo = parseFloat(r.cantidad) * (item.cantidad || 1)
          // Buscar lote con stock disponible
          const lote = await client.query(
            'SELECT id_lote, cantidad_actual_base FROM public.lotes_insumo WHERE id_insumo = $1 AND cantidad_actual_base > 0 ORDER BY fecha_caducidad ASC LIMIT 1',
            [r.id_insumo]
          )
          if (lote.rowCount > 0) {
            const idLote = lote.rows[0].id_lote
            await client.query(
              'UPDATE public.lotes_insumo SET cantidad_actual_base = GREATEST(0, cantidad_actual_base - $1) WHERE id_lote = $2',
              [consumo, idLote]
            )
            await client.query(`
              INSERT INTO public.movimientos_inventario (
                id_insumo, id_lote, tipo, motivo, cantidad, id_orden, id_empleado, timestamp, notas
              ) VALUES ($1, $2, 'salida', 'venta', $3, $4, $5, NOW(), $6)
            `, [r.id_insumo, idLote, consumo, idOrden, idEmpleado, `Consumo receta orden ${folio}`])
          }
        }
      }
    }

    // Registrar en orden_estado_historial
    await client.query(
      `INSERT INTO public.orden_estado_historial (
        id_orden, estado, timestamp, id_empleado, notas
      ) VALUES ($1, $2, NOW(), $3, $4)`,
      [idOrden, estadoInicial, idEmpleado, `Orden ${folio} creada y enviada a cocina`]
    )

    // Si ya se cobró (local / llevar), registrar en tabla pagos
    if (metodoPago && !pendingPayment) {
      await client.query(
        `INSERT INTO public.pagos (
          id_orden, metodo, monto, monto_recibido, cambio, propina, fecha, id_empleado
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)`,
        [
          idOrden,
          metodoPago,
          total,
          montoRecibido || total,
          cambio || 0,
          propina || 0,
          idEmpleado,
        ]
      )
    }

    // Si es cliente a domicilio, actualizar su contador y fecha de última orden
    if (idCliente) {
      await client.query(`
        UPDATE public.clientes 
        SET total_ordenes = COALESCE(total_ordenes, 0) + 1,
            fecha_ultima_orden = NOW()
        WHERE id_cliente = $1
      `, [idCliente])
    }

    await client.query('COMMIT')

    res.status(201).json({
      ok: true,
      orden: {
        ...nuevaOrden,
        items: insertedItems,
      },
    })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Error al crear orden:', err)
    res.status(500).json({ ok: false, error: err.message })
  } finally {
    client.release()
  }
})

// ─── Actualizar estado de orden ─────────────────────────────────────
app.patch('/api/ordenes/:id/estado', async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { id } = req.params
    const { estado, idEmpleado = 2, notas = null } = req.body

    const isNumeric = /^\d+$/.test(id)
    const whereClause = isNumeric ? 'id_orden = $2' : 'folio = $2'

    const orderRes = await client.query(
      `UPDATE public.ordenes 
       SET estado_actual = $1::character varying, 
           fecha_entrega = CASE WHEN $1::character varying = 'entregado'::character varying THEN NOW() ELSE fecha_entrega END
       WHERE ${whereClause}
       RETURNING *`,
      [estado, isNumeric ? parseInt(id, 10) : id]
    )

    if (orderRes.rowCount === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ ok: false, error: 'Orden no encontrada' })
    }

    const updated = orderRes.rows[0]

    await client.query(
      `INSERT INTO public.orden_estado_historial (
        id_orden, estado, timestamp, id_empleado, notas
      ) VALUES ($1, $2, NOW(), $3, $4)`,
      [updated.id_orden, estado, idEmpleado, notas || `Cambio de estado a ${estado}`]
    )

    await client.query('COMMIT')
    res.json({ ok: true, orden: updated })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Error al actualizar estado:', err)
    res.status(500).json({ ok: false, error: err.message })
  } finally {
    client.release()
  }
})

// ─── Registrar cobro de una orden ───────────────────────────────────
app.post('/api/ordenes/:id/pagar', async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { id } = req.params
    const {
      metodoPago,
      montoRecibido = null,
      cambio = null,
      propina = 0,
      idEmpleado = 2,
    } = req.body

    const isNumeric = /^\d+$/.test(id)
    const whereClause = isNumeric ? 'id_orden = $1' : 'folio = $1'

    const checkRes = await client.query(
      `SELECT * FROM public.ordenes WHERE ${whereClause}`,
      [isNumeric ? parseInt(id, 10) : id]
    )
    if (checkRes.rowCount === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ ok: false, error: 'Orden no encontrada' })
    }

    const order = checkRes.rows[0]

    const orderRes = await client.query(
      `UPDATE public.ordenes 
       SET metodo_pago = $1,
           pending_payment = FALSE,
           estado_actual = 'entregado',
           fecha_entrega = NOW()
       WHERE id_orden = $2
       RETURNING *`,
      [metodoPago, order.id_orden]
    )

    const updated = orderRes.rows[0]

    await client.query(
      `INSERT INTO public.pagos (
        id_orden, metodo, monto, monto_recibido, cambio, propina, fecha, id_empleado
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)`,
      [
        order.id_orden,
        metodoPago,
        updated.total,
        montoRecibido || updated.total,
        cambio || 0,
        propina,
        idEmpleado,
      ]
    )

    await client.query(
      `INSERT INTO public.orden_estado_historial (
        id_orden, estado, timestamp, id_empleado, notas
      ) VALUES ($1, 'entregado', NOW(), $2, 'Orden cobrada en caja y entregada')`,
      [order.id_orden, idEmpleado]
    )

    await client.query('COMMIT')
    res.json({ ok: true, orden: updated })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Error al cobrar orden:', err)
    res.status(500).json({ ok: false, error: err.message })
  } finally {
    client.release()
  }
})

// ─── Cancelar orden ─────────────────────────────────────────────────
app.post('/api/ordenes/:id/cancelar', async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { id } = req.params
    const {
      motivo = 'El cliente canceló',
      categoriaMotivo = 'cliente_arrepintio',
      idEmpleado = 2,
    } = req.body

    const isNumeric = /^\d+$/.test(id)
    const whereClause = isNumeric ? 'id_orden = $1' : 'folio = $1'

    const checkRes = await client.query(
      `SELECT * FROM public.ordenes WHERE ${whereClause}`,
      [isNumeric ? parseInt(id, 10) : id]
    )
    if (checkRes.rowCount === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ ok: false, error: 'Orden no encontrada' })
    }

    const order = checkRes.rows[0]
    const estadoPrevio = order.estado_actual
    const yaEstabaCobrada = order.metodo_pago !== null && !order.pending_payment
    const montoPerdido = order.total
    const montoYaCobrado = yaEstabaCobrada ? order.total : 0

    // Obtener nombres de productos cancelados
    const itemsRes = await client.query(`
      SELECT d.cantidad, COALESCE(p.nombre, paq.nombre, 'Producto') AS nombre, d.tamano
      FROM public.orden_detalle d
      LEFT JOIN public.productos p ON d.id_producto = p.id_producto
      LEFT JOIN public.paquetes paq ON d.id_paquete = paq.id_paquete
      WHERE d.id_orden = $1
    `, [order.id_orden])

    const productosTexto = itemsRes.rows
      .map(r => `${r.cantidad}x ${r.nombre}${r.tamano ? ` (${r.tamano})` : ''}`)
      .join(', ') || 'Productos de orden'

    // Actualizar orden
    const orderRes = await client.query(
      `UPDATE public.ordenes 
       SET estado_actual = 'cancelado'
       WHERE id_orden = $1
       RETURNING *`,
      [order.id_orden]
    )

    // Auditoría de cancelación
    await client.query(
      `INSERT INTO public.cancelacionesauditoria (
        id_orden, timestamp_cancelacion, id_empleado_cancelo, id_empleado_autorizo,
        monto_perdido, monto_ya_cobrado, metodo_pago_original, estado_orden_al_cancelar,
        productos_cancelados, motivo, categoria_motivo, cliente_notificado, turno, flag_sospechoso
      ) VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        order.id_orden,
        idEmpleado,
        idEmpleado,
        montoPerdido,
        montoYaCobrado,
        order.metodo_pago,
        estadoPrevio,
        productosTexto,
        motivo,
        categoriaMotivo,
        true,
        'tarde',
        false,
      ]
    )

    await client.query(
      `INSERT INTO public.orden_estado_historial (
        id_orden, estado, timestamp, id_empleado, notas
      ) VALUES ($1, 'cancelado', NOW(), $2, $3)`,
      [order.id_orden, idEmpleado, `Orden cancelada: ${motivo}`]
    )

    await client.query('COMMIT')
    res.json({
      ok: true,
      orden: orderRes.rows[0],
      refund: montoYaCobrado > 0 ? montoYaCobrado : undefined,
    })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Error al cancelar orden:', err)
    res.status(500).json({ ok: false, error: err.message })
  } finally {
    client.release()
  }
})

// ─── Dashboard Stats (Admin) ────────────────────────────────────────
app.get('/api/admin/dashboard', async (req, res) => {
  try {
    const deliveredRes = await pool.query(`
      SELECT 
        COUNT(*) AS total_entregadas,
        COALESCE(SUM(total), 0) AS ventas_totales
      FROM public.ordenes
      WHERE estado_actual = 'entregado'
    `)

    const statusCountsRes = await pool.query(`
      SELECT estado_actual, COUNT(*) AS count
      FROM public.ordenes
      GROUP BY estado_actual
    `)

    const paymentStatsRes = await pool.query(`
      SELECT metodo_pago, COUNT(*) AS count, COALESCE(SUM(total), 0) AS total
      FROM public.ordenes
      WHERE estado_actual = 'entregado' AND metodo_pago IS NOT NULL
      GROUP BY metodo_pago
    `)

    const refundsRes = await pool.query(`
      SELECT COALESCE(SUM(monto_ya_cobrado), 0) AS total_reembolsos
      FROM public.cancelacionesauditoria
    `)

    const topProductsRes = await pool.query(`
      SELECT 
        COALESCE(p.id_producto, paq.id_paquete) AS id_item,
        COALESCE(p.nombre, paq.nombre) AS nombre,
        COALESCE(p.emoji, paq.imagen, '🍕') AS emoji,
        SUM(d.cantidad) AS cantidad_vendida
      FROM public.orden_detalle d
      JOIN public.ordenes o ON d.id_orden = o.id_orden
      LEFT JOIN public.productos p ON d.id_producto = p.id_producto
      LEFT JOIN public.paquetes paq ON d.id_paquete = paq.id_paquete
      WHERE o.estado_actual != 'cancelado'
      GROUP BY id_item, nombre, emoji
      ORDER BY cantidad_vendida DESC
      LIMIT 5
    `)

    res.json({
      ok: true,
      ventas: {
        totalVentas: parseFloat(deliveredRes.rows[0].ventas_totales),
        totalEntregadas: parseInt(deliveredRes.rows[0].total_entregadas, 10),
        totalReembolsos: parseFloat(refundsRes.rows[0].total_reembolsos),
      },
      statusCounts: statusCountsRes.rows.reduce((acc, row) => {
        acc[row.estado_actual] = parseInt(row.count, 10)
        return acc
      }, {}),
      ventasPorMetodo: paymentStatsRes.rows.map(r => ({
        metodo: r.metodo_pago,
        total: parseFloat(r.total),
        count: parseInt(r.count, 10),
      })),
      topProductos: topProductsRes.rows.map(r => ({
        idProducto: r.id_item,
        nombre: r.nombre,
        emoji: r.emoji,
        cantidad: parseInt(r.cantidad_vendida, 10),
      })),
    })
  } catch (err) {
    console.error('Error en stats de dashboard:', err)
    res.status(500).json({ ok: false, error: err.message })
  }
})

// ─── Arrancar servidor ──────────────────────────────────────────────
const PORT = process.env.PORT || 3001

testConnection().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Backend corriendo en http://localhost:${PORT}`)
    console.log(`   Prueba: http://localhost:${PORT}/api/health`)
  })
})