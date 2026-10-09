import { Router } from 'express'
import { z } from 'zod'
import { pool, tx } from '../db.js'
import { HttpError, wrap } from '../http.js'
import { authenticate, authorizeSupervisor, hasPerm, requirePerm } from '../auth.js'
import { getConfig } from '../config.js'
import { cents, fromCents, normalizePagos, priceItems, totals, turnoNombre } from '../pricing.js'
import { consumeInventory, restoreInventory } from '../inventory.js'

export const ordenesRouter = Router()
ordenesRouter.use(authenticate)

// ─── Lectura: formato único de orden para POS, cocina y admin ───────
const ORDER_SELECT = `
  SELECT o.id_orden, o.folio, o.tipo, o.estado_actual, o.mesa, o.comentarios,
         o.subtotal::float8 AS subtotal, o.descuento_pct::float8 AS descuento_pct,
         o.descuento_total::float8 AS descuento, o.impuesto::float8 AS impuesto, o.total::float8 AS total,
         o.metodo_pago, o.pending_payment, o.fecha_creacion, o.fecha_cierre, o.comanda_impresa_at,
         o.id_empleado, u.nombre AS cajero_nombre, o.id_repartidor, r.nombre AS repartidor_nombre,
         c.id_cliente, c.celular, c.nombre AS cliente_nombre, c.apellido AS cliente_apellido,
         c.direccion_principal, c.referencias,
         ca.motivo AS cancel_motivo, ca.categoria_motivo AS cancel_categoria, ca.monto_ya_cobrado::float8 AS cancel_cobrado
  FROM public.ordenes o
  JOIN public.usuarios u ON u.id_usuario = o.id_empleado
  LEFT JOIN public.usuarios r ON r.id_usuario = o.id_repartidor
  LEFT JOIN public.clientes c ON c.id_cliente = o.id_cliente
  LEFT JOIN LATERAL (
    SELECT motivo, categoria_motivo, monto_ya_cobrado FROM public.cancelacionesauditoria
    WHERE id_orden = o.id_orden ORDER BY timestamp_cancelacion DESC LIMIT 1
  ) ca ON TRUE`

export async function fetchOrdenes(q, where = 'TRUE', params = [], { limit = 300, order = 'o.fecha_creacion DESC, o.id_orden DESC' } = {}) {
  const orders = await q.query(`${ORDER_SELECT} WHERE ${where} ORDER BY ${order} LIMIT ${Number(limit)}`, params)
  if (!orders.rowCount) return []
  const ids = orders.rows.map(o => o.id_orden)

  const [det, pag] = await Promise.all([
    q.query(
      `SELECT d.id_detalle, d.id_orden, d.id_producto, d.id_paquete, d.cantidad, d.tamano, d.masa, d.notas,
              d.precio_unitario::float8 AS precio_unitario, d.precio_final::float8 AS precio_final,
              COALESCE(p.nombre, paq.nombre) AS nombre, c.nombre AS categoria
       FROM public.orden_detalle d
       LEFT JOIN public.productos p ON p.id_producto = d.id_producto
       LEFT JOIN public.categorias c ON c.id_categoria = p.id_categoria
       LEFT JOIN public.paquetes paq ON paq.id_paquete = d.id_paquete
       WHERE d.id_orden = ANY($1) ORDER BY d.id_detalle`,
      [ids]
    ),
    q.query(
      `SELECT id_orden, metodo, monto::float8 AS monto, monto_recibido::float8 AS monto_recibido,
              cambio::float8 AS cambio, propina::float8 AS propina, fecha
       FROM public.pagos WHERE id_orden = ANY($1) ORDER BY id_pago`,
      [ids]
    ),
  ])
  const items = new Map()
  det.rows.forEach(d => (items.get(d.id_orden) || items.set(d.id_orden, []).get(d.id_orden)).push(d))
  const pagos = new Map()
  pag.rows.forEach(p => (pagos.get(p.id_orden) || pagos.set(p.id_orden, []).get(p.id_orden)).push(p))

  return orders.rows.map(o => ({
    id: o.id_orden,
    folio: o.folio,
    tipo: o.tipo,
    estado: o.estado_actual,
    mesa: o.mesa,
    comentarios: o.comentarios,
    subtotal: o.subtotal,
    descuentoPct: o.descuento_pct,
    descuento: o.descuento,
    impuesto: o.impuesto,
    total: o.total,
    metodoPago: o.metodo_pago,
    pendientePago: o.pending_payment,
    fechaCreacion: o.fecha_creacion,
    fechaCierre: o.fecha_cierre,
    comandaImpresa: o.comanda_impresa_at,
    cajero: { id: o.id_empleado, nombre: o.cajero_nombre },
    repartidor: o.id_repartidor ? { id: o.id_repartidor, nombre: o.repartidor_nombre } : null,
    cliente: o.id_cliente
      ? {
          id: o.id_cliente,
          celular: o.celular,
          nombre: [o.cliente_nombre, o.cliente_apellido].filter(Boolean).join(' '),
          direccion: o.direccion_principal,
          referencias: o.referencias,
        }
      : null,
    cancelacion:
      o.estado_actual === 'cancelada'
        ? { motivo: o.cancel_motivo, categoria: o.cancel_categoria, reembolso: o.cancel_cobrado ?? 0 }
        : null,
    items: (items.get(o.id_orden) || []).map(d => ({
      id: d.id_detalle,
      idProducto: d.id_producto,
      idPaquete: d.id_paquete,
      nombre: d.nombre,
      categoria: d.categoria,
      cantidad: d.cantidad,
      tamano: d.tamano,
      masa: d.masa,
      notas: d.notas,
      precioUnitario: d.precio_unitario,
      precioFinal: d.precio_final,
    })),
    pagos: (pagos.get(o.id_orden) || []).map(p => ({
      metodo: p.metodo,
      monto: p.monto,
      montoRecibido: p.monto_recibido,
      cambio: p.cambio,
      propina: p.propina,
      fecha: p.fecha,
    })),
  }))
}

// GET /api/ordenes?estado=abierta|cerrada|cancelada&desde=YYYY-MM-DD&hasta=YYYY-MM-DD&turno=1&q=texto
// Sin filtros: las cuentas abiertas + todo lo de las últimas 24 h.
ordenesRouter.get(
  '/',
  requirePerm('vender', 'cobrar', 'reportes'),
  wrap(async (req, res) => {
    const f = z
      .object({
        estado: z.enum(['abierta', 'cerrada', 'cancelada']).optional(),
        desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        q: z.string().max(50).optional(),
        limit: z.coerce.number().int().min(1).max(500).optional(),
      })
      .parse(req.query)
    const cfg = await getConfig()
    const where = []
    const params = []
    const p = v => (params.push(v), `$${params.length}`)

    if (f.estado) where.push(`o.estado_actual = ${p(f.estado)}`)
    if (f.desde || f.hasta) {
      const tz = p(cfg.zona)
      if (f.desde) where.push(`(o.fecha_creacion AT TIME ZONE ${tz})::date >= ${p(f.desde)}::date`)
      if (f.hasta) where.push(`(o.fecha_creacion AT TIME ZONE ${tz})::date <= ${p(f.hasta)}::date`)
    } else if (!f.estado) {
      where.push(`(o.estado_actual = 'abierta' OR o.fecha_creacion >= NOW() - INTERVAL '24 hours')`)
    }
    if (f.q) {
      const like = p(`%${f.q.replace(/[%_]/g, '')}%`)
      where.push(`(o.folio ILIKE ${like} OR o.mesa ILIKE ${like} OR c.nombre ILIKE ${like} OR c.celular ILIKE ${like})`)
    }
    const ordenes = await fetchOrdenes(pool, where.length ? where.join(' AND ') : 'TRUE', params, { limit: f.limit ?? 300 })
    res.json({ ok: true, ordenes })
  })
)

ordenesRouter.get(
  '/:id',
  requirePerm('vender', 'cobrar', 'reportes'),
  wrap(async (req, res) => {
    const [orden] = await fetchOrdenes(pool, 'o.id_orden = $1', [z.coerce.number().int().positive().parse(req.params.id)])
    if (!orden) throw new HttpError(404, 'Orden no encontrada')
    res.json({ ok: true, orden })
  })
)

// ─── Crear orden ────────────────────────────────────────────────────
const METODOS = ['efectivo', 'tarjeta', 'transferencia', 'dolares']
const itemSchema = z
  .object({
    idProducto: z.number().int().positive().nullish(),
    idPaquete: z.number().int().positive().nullish(),
    cantidad: z.number().int().min(1).max(99),
    tamano: z.enum(['Chica', 'Mediana', 'Grande']).nullish(),
    masa: z.enum(['Delgada', 'Gruesa', 'Orilla Rellena']).nullish(),
    notas: z.string().max(255).nullish(),
  })
  .refine(i => Boolean(i.idProducto) !== Boolean(i.idPaquete), 'Cada línea debe ser un producto o un paquete')

const pagoSchema = z.object({
  metodo: z.enum(METODOS),
  monto: z.number().positive().max(1000000),
  montoRecibido: z.number().positive().max(1000000).nullish(),
})

const crearSchema = z.object({
  tipo: z.enum(['local', 'llevar', 'recoger', 'domicilio']),
  mesa: z.string().trim().max(20).nullish(),
  cliente: z
    .object({
      celular: z.string().regex(/^\d{10}$/, 'El celular debe tener 10 dígitos'),
      nombre: z.string().trim().min(1).max(80),
      apellido: z.string().trim().max(80).nullish(),
      direccion_principal: z.string().trim().max(255).nullish(),
      referencias: z.string().trim().max(255).nullish(),
    })
    .nullish(),
  idRepartidor: z.number().int().positive().nullish(),
  descuentoPct: z.number().min(0).max(100).default(0),
  comentarios: z.string().max(500).nullish(),
  items: z.array(itemSchema).min(1, 'La orden no tiene productos').max(100),
  pagos: z.array(pagoSchema).max(6).nullish(),
  propina: z.number().min(0).max(100000).default(0),
  claveIdempotencia: z.string().max(64).nullish(),
})

ordenesRouter.post(
  '/',
  requirePerm('vender'),
  wrap(async (req, res) => {
    const b = crearSchema.parse(req.body)
    const user = req.user

    if (b.tipo === 'local' && !b.mesa) throw new HttpError(400, 'Indica el número de mesa')
    if ((b.tipo === 'domicilio' || b.tipo === 'recoger') && !b.cliente) {
      throw new HttpError(400, 'Indica el cliente (teléfono y nombre)')
    }
    if (b.tipo === 'domicilio' && !b.cliente?.direccion_principal) {
      throw new HttpError(400, 'Indica la dirección de entrega')
    }
    if (b.descuentoPct > 0 && !hasPerm(user, 'descuentos')) {
      throw new HttpError(403, 'No tienes permiso para aplicar descuentos')
    }
    if (b.pagos?.length) {
      if (!hasPerm(user, 'cobrar')) {
        throw new HttpError(403, 'No tienes permiso para cobrar')
      }
      const tOpen = await pool.query('SELECT id_turno FROM public.turnos WHERE cierre IS NULL ORDER BY apertura DESC LIMIT 1')
      if (!tOpen.rowCount) {
        throw new HttpError(400, 'No hay un turno de caja abierto en el sistema. Abre un turno antes de cobrar.')
      }
    }

    const idOrden = await tx(async c => {
      // Idempotencia: un doble toque no crea dos órdenes
      if (b.claveIdempotencia) {
        const dup = await c.query('SELECT id_orden FROM public.ordenes WHERE clave_idempotencia = $1', [b.claveIdempotencia])
        if (dup.rowCount) return dup.rows[0].id_orden
      }

      const cfg = await getConfig(c)
      const lines = await priceItems(c, b.items, cfg)
      const t = totals(lines, b.descuentoPct, cfg)
      const pagos = b.pagos?.length ? normalizePagos(b.pagos, t.total, b.propina) : null

      if (b.idRepartidor) {
        const rep = await c.query(`SELECT 1 FROM public.usuarios WHERE id_usuario = $1 AND rol = 'repartidor' AND activo`, [b.idRepartidor])
        if (!rep.rowCount) throw new HttpError(400, 'Repartidor inválido')
      }

      // Cliente: se crea o actualiza por celular
      let idCliente = null
      if (b.cliente) {
        const cl = await c.query(
          `INSERT INTO public.clientes (celular, nombre, apellido, direccion_principal, referencias)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (celular) DO UPDATE SET
             nombre = EXCLUDED.nombre,
             apellido = COALESCE(EXCLUDED.apellido, public.clientes.apellido),
             direccion_principal = COALESCE(EXCLUDED.direccion_principal, public.clientes.direccion_principal),
             referencias = COALESCE(EXCLUDED.referencias, public.clientes.referencias),
             activo = TRUE
           RETURNING id_cliente`,
          [b.cliente.celular, b.cliente.nombre, b.cliente.apellido || null, b.cliente.direccion_principal || null, b.cliente.referencias || null]
        )
        idCliente = cl.rows[0].id_cliente
      }

      const folio = `#${(await c.query(`SELECT nextval('public.folio_seq') AS n`)).rows[0].n}`
      const turno = await c.query('SELECT id_turno FROM public.turnos WHERE cierre IS NULL ORDER BY apertura DESC LIMIT 1')
      const pagada = Boolean(pagos)

      const o = await c.query(
        `INSERT INTO public.ordenes
           (folio, id_cliente, id_empleado, tipo, estado_actual, subtotal, descuento_total, descuento_pct, impuesto, total,
            metodo_pago, pending_payment, comentarios, mesa, id_repartidor, id_turno, fecha_cierre, clave_idempotencia)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING id_orden`,
        [
          folio, idCliente, user.id, b.tipo, pagada ? 'cerrada' : 'abierta',
          fromCents(t.bruto), fromCents(t.descuento), b.descuentoPct, fromCents(t.impuesto), fromCents(t.total),
          pagos?.metodoPrincipal ?? null, !pagada, b.comentarios?.trim() || null, b.mesa || null,
          b.idRepartidor ?? null, turno.rows[0]?.id_turno ?? null, pagada ? new Date() : null, b.claveIdempotencia ?? null,
        ]
      )
      const idOrden = o.rows[0].id_orden

      for (const l of lines) {
        const d = await c.query(
          `INSERT INTO public.orden_detalle
             (id_orden, id_producto, id_paquete, cantidad, tamano, masa, precio_unitario, precio_final, notas)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id_detalle`,
          [idOrden, l.idProducto, l.idPaquete, l.cantidad, l.tamano, l.masa, fromCents(l.unitBase), fromCents(l.unitFinal), l.notas]
        )
        if (l.idPaquete) {
          const indiv = (l.precioIndividual ?? l.unitFinal) * l.cantidad
          const aplicado = l.unitFinal * l.cantidad
          await c.query(
            `INSERT INTO public.ventas_paquetes_auditoria
               (id_paquete, id_orden, id_orden_detalle, id_empleado, turno, precio_paquete_aplicado,
                precio_individual_suma, ahorro_cliente, productos_incluidos, notas)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Venta desde POS')`,
            [l.idPaquete, idOrden, d.rows[0].id_detalle, user.id, turnoNombre(), fromCents(aplicado),
             fromCents(Math.max(indiv, aplicado)), fromCents(Math.max(0, indiv - aplicado)), l.nombre]
          )
        }
      }

      await consumeInventory(c, { idOrden, folio, idEmpleado: user.id, lines })

      await c.query(
        `INSERT INTO public.orden_estado_historial (id_orden, estado, id_empleado, notas) VALUES ($1, $2, $3, $4)`,
        [idOrden, pagada ? 'cerrada' : 'abierta', user.id, pagada ? `Orden ${folio} cobrada y enviada a cocina` : `Orden ${folio} enviada a cocina (cuenta en espera)`]
      )

      if (pagos) {
        for (const p of pagos.rows) {
          await c.query(
            `INSERT INTO public.pagos (id_orden, metodo, monto, monto_recibido, cambio, propina, id_empleado)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [idOrden, p.metodo, fromCents(p.monto), fromCents(p.recibido), fromCents(p.cambio), fromCents(p.propina), user.id]
          )
        }
      }
      if (idCliente) {
        await c.query(
          `UPDATE public.clientes SET total_ordenes = COALESCE(total_ordenes, 0) + 1, fecha_ultima_orden = NOW() WHERE id_cliente = $1`,
          [idCliente]
        )
      }
      return idOrden
    })

    const [orden] = await fetchOrdenes(pool, 'o.id_orden = $1', [idOrden])
    res.status(201).json({ ok: true, orden })
  })
)

// ─── Cobrar una cuenta en espera ────────────────────────────────────
ordenesRouter.post(
  '/:id/pagar',
  requirePerm('cobrar'),
  wrap(async (req, res) => {
    const idOrden = z.coerce.number().int().positive().parse(req.params.id)
    const b = z.object({ pagos: z.array(pagoSchema).min(1).max(6), propina: z.number().min(0).max(100000).default(0) }).parse(req.body)

    await tx(async c => {
      const tOpen = await c.query('SELECT id_turno FROM public.turnos WHERE cierre IS NULL ORDER BY apertura DESC LIMIT 1')
      if (!tOpen.rowCount) {
        throw new HttpError(400, 'No hay un turno de caja abierto en el sistema. Abre un turno antes de cobrar.')
      }

      const r = await c.query('SELECT id_orden, folio, estado_actual, total FROM public.ordenes WHERE id_orden = $1 FOR UPDATE', [idOrden])
      const o = r.rows[0]
      if (!o) throw new HttpError(404, 'Orden no encontrada')
      if (o.estado_actual === 'cancelada') throw new HttpError(409, 'La cuenta está cancelada')
      if (o.estado_actual === 'cerrada') throw new HttpError(409, 'La cuenta ya fue pagada')

      const pagos = normalizePagos(b.pagos, cents(o.total), b.propina)
      for (const p of pagos.rows) {
        await c.query(
          `INSERT INTO public.pagos (id_orden, metodo, monto, monto_recibido, cambio, propina, id_empleado)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [idOrden, p.metodo, fromCents(p.monto), fromCents(p.recibido), fromCents(p.cambio), fromCents(p.propina), req.user.id]
        )
      }
      await c.query(
        `UPDATE public.ordenes SET metodo_pago = $1, pending_payment = FALSE, estado_actual = 'cerrada', fecha_cierre = NOW() WHERE id_orden = $2`,
        [pagos.metodoPrincipal, idOrden]
      )
      await c.query(
        `INSERT INTO public.orden_estado_historial (id_orden, estado, id_empleado, notas) VALUES ($1, 'cerrada', $2, 'Cuenta cobrada en caja')`,
        [idOrden, req.user.id]
      )
    })
    const [orden] = await fetchOrdenes(pool, 'o.id_orden = $1', [idOrden])
    res.json({ ok: true, orden })
  })
)

// ─── Asignar repartidor ─────────────────────────────────────────────
ordenesRouter.patch(
  '/:id/repartidor',
  requirePerm('vender', 'entregas'),
  wrap(async (req, res) => {
    const { idRepartidor } = z.object({ idRepartidor: z.number().int().positive().nullable() }).parse(req.body)
    const r = await pool.query(
      `UPDATE public.ordenes SET id_repartidor = $1 WHERE id_orden = $2 AND tipo = 'domicilio' AND estado_actual <> 'cancelada' RETURNING id_orden`,
      [idRepartidor, z.coerce.number().int().positive().parse(req.params.id)]
    )
    if (!r.rowCount) throw new HttpError(404, 'Orden a domicilio no encontrada')
    res.json({ ok: true })
  })
)

// ─── Cancelar ───────────────────────────────────────────────────────
const MOTIVOS = ['cliente_arrepintio', 'error_cajero', 'producto_danado', 'tiempo_espera', 'otro']

ordenesRouter.post(
  '/:id/cancelar',
  requirePerm('vender', 'cobrar', 'cancelar'),
  wrap(async (req, res) => {
    const idOrden = z.coerce.number().int().positive().parse(req.params.id)
    const b = z
      .object({
        motivo: z.string().trim().min(3, 'Escribe el motivo').max(255),
        categoria: z.enum(MOTIVOS).default('otro'),
        autoriza: z.object({ usuario: z.string(), password: z.string() }).nullish(),
      })
      .parse(req.body)

    // Sin permiso propio de cancelar, se necesita la autorización de un supervisor
    const autorizador = hasPerm(req.user, 'cancelar')
      ? { id_usuario: req.user.id }
      : await authorizeSupervisor(b.autoriza, 'cancelar')

    await tx(async c => {
      const r = await c.query('SELECT * FROM public.ordenes WHERE id_orden = $1 FOR UPDATE', [idOrden])
      const o = r.rows[0]
      if (!o) throw new HttpError(404, 'Orden no encontrada')
      if (o.estado_actual === 'cancelada') throw new HttpError(409, 'La cuenta ya está cancelada')

      const cobrada = o.estado_actual === 'cerrada'
      const prods = await c.query(
        `SELECT d.cantidad, COALESCE(p.nombre, paq.nombre) AS nombre, d.tamano FROM public.orden_detalle d
         LEFT JOIN public.productos p ON p.id_producto = d.id_producto
         LEFT JOIN public.paquetes paq ON paq.id_paquete = d.id_paquete WHERE d.id_orden = $1`,
        [idOrden]
      )
      const texto = prods.rows.map(p => `${p.cantidad}x ${p.nombre}${p.tamano ? ` (${p.tamano})` : ''}`).join(', ')

      await c.query(`UPDATE public.ordenes SET estado_actual = 'cancelada', pending_payment = FALSE WHERE id_orden = $1`, [idOrden])
      await c.query(
        `INSERT INTO public.cancelacionesauditoria
           (id_orden, id_empleado_cancelo, id_empleado_autorizo, monto_perdido, monto_ya_cobrado, metodo_pago_original,
            estado_orden_al_cancelar, productos_cancelados, motivo, categoria_motivo, cliente_notificado, turno, flag_sospechoso)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,FALSE,$11,$12)`,
        [idOrden, req.user.id, autorizador.id_usuario, o.total, cobrada ? o.total : 0, o.metodo_pago,
         o.estado_actual, texto || 'Sin detalle', b.motivo, b.categoria, turnoNombre(), cobrada]
      )
      await restoreInventory(c, { idOrden, folio: o.folio, idEmpleado: req.user.id })
      if (o.id_cliente) {
        await c.query('UPDATE public.clientes SET total_ordenes = GREATEST(0, COALESCE(total_ordenes, 0) - 1) WHERE id_cliente = $1', [o.id_cliente])
      }
      await c.query(
        `INSERT INTO public.orden_estado_historial (id_orden, estado, id_empleado, notas) VALUES ($1, 'cancelada', $2, $3)`,
        [idOrden, req.user.id, `Cancelada: ${b.motivo}`]
      )
    })
    const [orden] = await fetchOrdenes(pool, 'o.id_orden = $1', [idOrden])
    res.json({ ok: true, orden })
  })
)
