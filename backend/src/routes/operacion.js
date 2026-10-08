import { Router } from 'express'
import { z } from 'zod'
import { pool, tx } from '../db.js'
import { HttpError, wrap } from '../http.js'
import { authenticate, requirePerm } from '../auth.js'
import { getConfig } from '../config.js'
import { fetchOrdenes } from './ordenes.js'

export const cocinaRouter = Router()
export const turnosRouter = Router()
export const adminRouter = Router()

// ─── Cocina: monitor de comandas ────────────────────────────────────
cocinaRouter.use(authenticate, requirePerm('cocina'))

// Pendientes = aún sin imprimir. Impresas (opcional) = últimas 4 h.
// Canceladas = canceladas en las últimas 2 h DESPUÉS de haberse impreso (cocina debe enterarse).
cocinaRouter.get(
  '/comandas',
  wrap(async (req, res) => {
    const incluirImpresas = req.query.impresas === '1'
    const [pendientes, canceladas, impresas] = await Promise.all([
      fetchOrdenes(
        pool,
        `o.comanda_impresa_at IS NULL AND o.estado_actual <> 'cancelada' AND o.fecha_creacion >= NOW() - INTERVAL '24 hours'`,
        [],
        { order: 'o.fecha_creacion ASC, o.id_orden ASC', limit: 100 }
      ),
      fetchOrdenes(
        pool,
        `o.estado_actual = 'cancelada' AND o.comanda_impresa_at IS NOT NULL AND o.fecha_creacion >= NOW() - INTERVAL '2 hours'`,
        [],
        { limit: 50 }
      ),
      incluirImpresas
        ? fetchOrdenes(
            pool,
            `o.comanda_impresa_at >= NOW() - INTERVAL '4 hours' AND o.estado_actual <> 'cancelada'`,
            [],
            { order: 'o.comanda_impresa_at DESC', limit: 100 }
          )
        : [],
    ])
    res.json({ ok: true, pendientes, canceladas, impresas })
  })
)

// Marca la comanda como impresa (la primera vez) y devuelve los datos para el ticket.
cocinaRouter.post(
  '/comandas/:id/imprimir',
  wrap(async (req, res) => {
    const idOrden = z.coerce.number().int().positive().parse(req.params.id)
    await tx(async c => {
      const r = await c.query(
        `UPDATE public.ordenes SET comanda_impresa_at = NOW()
         WHERE id_orden = $1 AND comanda_impresa_at IS NULL RETURNING id_orden`,
        [idOrden]
      )
      if (r.rowCount) {
        await c.query(
          `INSERT INTO public.orden_estado_historial (id_orden, estado, id_empleado, notas)
           VALUES ($1, 'comanda_impresa', $2, 'Comanda impresa en cocina')`,
          [idOrden, req.user.id]
        )
      }
    })
    const [orden] = await fetchOrdenes(pool, 'o.id_orden = $1', [idOrden])
    if (!orden) throw new HttpError(404, 'Orden no encontrada')
    res.json({ ok: true, orden })
  })
)

// ─── Turnos / corte de caja ─────────────────────────────────────────
turnosRouter.use(authenticate)

async function resumenTurno(q, turno) {
  const rango = `fecha >= $2 AND fecha <= COALESCE($3, NOW())`
  const [metodos, canc, abiertas] = await Promise.all([
    q.query(
      `SELECT p.metodo, SUM(p.monto)::float8 AS total, COUNT(*)::int AS pagos, COALESCE(SUM(p.propina), 0)::float8 AS propinas
       FROM public.pagos p JOIN public.ordenes o ON o.id_orden = p.id_orden
       WHERE p.id_empleado = $1 AND p.${rango} AND o.estado_actual = 'cerrada' GROUP BY p.metodo`,
      [turno.id_empleado, turno.apertura, turno.cierre]
    ),
    q.query(
      `SELECT COUNT(*)::int AS n, COALESCE(SUM(monto_perdido), 0)::float8 AS monto
       FROM public.cancelacionesauditoria
       WHERE id_empleado_cancelo = $1 AND timestamp_cancelacion >= $2 AND timestamp_cancelacion <= COALESCE($3, NOW())`,
      [turno.id_empleado, turno.apertura, turno.cierre]
    ),
    q.query(`SELECT COUNT(*)::int AS n, COALESCE(SUM(total), 0)::float8 AS monto FROM public.ordenes WHERE id_empleado = $1 AND estado_actual = 'abierta'`, [turno.id_empleado]),
  ])
  const por = Object.fromEntries(metodos.rows.map(m => [m.metodo, m]))
  const efectivo = por.efectivo?.total ?? 0
  const fondo = parseFloat(turno.fondo_inicial)
  return {
    id: turno.id_turno,
    apertura: turno.apertura,
    cierre: turno.cierre,
    fondoInicial: fondo,
    ventasPorMetodo: metodos.rows,
    totalVentas: metodos.rows.reduce((s, m) => s + m.total, 0),
    propinas: metodos.rows.reduce((s, m) => s + m.propinas, 0),
    cancelaciones: canc.rows[0],
    cuentasEnEspera: abiertas.rows[0],
    efectivoEsperado: Math.round((fondo + efectivo) * 100) / 100,
    efectivoContado: turno.efectivo_contado != null ? parseFloat(turno.efectivo_contado) : null,
    notas: turno.notas,
  }
}

turnosRouter.get(
  '/actual',
  wrap(async (req, res) => {
    const r = await pool.query('SELECT * FROM public.turnos WHERE id_empleado = $1 AND cierre IS NULL', [req.user.id])
    res.json({ ok: true, turno: r.rows[0] ? await resumenTurno(pool, r.rows[0]) : null })
  })
)

turnosRouter.post(
  '/abrir',
  requirePerm('turnos'),
  wrap(async (req, res) => {
    const { fondoInicial } = z.object({ fondoInicial: z.number().min(0).max(100000).default(0) }).parse(req.body)
    const ya = await pool.query('SELECT 1 FROM public.turnos WHERE id_empleado = $1 AND cierre IS NULL', [req.user.id])
    if (ya.rowCount) throw new HttpError(409, 'Ya tienes un turno abierto')
    const r = await pool.query('INSERT INTO public.turnos (id_empleado, fondo_inicial) VALUES ($1, $2) RETURNING *', [req.user.id, fondoInicial])
    res.status(201).json({ ok: true, turno: await resumenTurno(pool, r.rows[0]) })
  })
)

// Corte parcial (X): no cierra el turno
turnosRouter.get('/corte', requirePerm('turnos'), wrap(async (req, res) => {
  const r = await pool.query('SELECT * FROM public.turnos WHERE id_empleado = $1 AND cierre IS NULL', [req.user.id])
  if (!r.rowCount) throw new HttpError(404, 'No tienes un turno abierto')
  res.json({ ok: true, corte: await resumenTurno(pool, r.rows[0]) })
}))

turnosRouter.post(
  '/cerrar',
  requirePerm('turnos'),
  wrap(async (req, res) => {
    const b = z.object({ efectivoContado: z.number().min(0).max(1000000), notas: z.string().max(500).nullish() }).parse(req.body)
    const corte = await tx(async c => {
      const r = await c.query(
        `UPDATE public.turnos SET cierre = NOW(), efectivo_contado = $2, notas = $3
         WHERE id_empleado = $1 AND cierre IS NULL RETURNING *`,
        [req.user.id, b.efectivoContado, b.notas || null]
      )
      if (!r.rowCount) throw new HttpError(404, 'No tienes un turno abierto')
      return resumenTurno(c, r.rows[0])
    })
    res.json({ ok: true, corte })
  })
)

// ─── Dashboard del administrador ────────────────────────────────────
adminRouter.use(authenticate, requirePerm('reportes'))

adminRouter.get(
  '/dashboard',
  wrap(async (req, res) => {
    const f = z
      .object({
        desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      })
      .parse(req.query)
    const cfg = await getConfig()
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: cfg.zona }) // YYYY-MM-DD
    const desde = f.desde || hoy
    const hasta = f.hasta || desde
    const rangoO = `(o.fecha_creacion AT TIME ZONE $1)::date BETWEEN $2::date AND $3::date`
    const p = [cfg.zona, desde, hasta]

    const [res1, metodos, tipos, top, cancs] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) FILTER (WHERE estado_actual = 'cerrada')::int AS cerradas,
                COALESCE(SUM(total) FILTER (WHERE estado_actual = 'cerrada'), 0)::float8 AS ventas,
                COUNT(*) FILTER (WHERE estado_actual = 'cancelada')::int AS canceladas,
                COALESCE(SUM(total) FILTER (WHERE estado_actual = 'cancelada'), 0)::float8 AS monto_cancelado,
                COUNT(*) FILTER (WHERE estado_actual = 'abierta')::int AS abiertas,
                COALESCE(SUM(total) FILTER (WHERE estado_actual = 'abierta'), 0)::float8 AS por_cobrar
         FROM public.ordenes o WHERE ${rangoO}`,
        p
      ),
      pool.query(
        `SELECT pg.metodo, SUM(pg.monto)::float8 AS total, COUNT(*)::int AS pagos
         FROM public.pagos pg JOIN public.ordenes o ON o.id_orden = pg.id_orden
         WHERE o.estado_actual = 'cerrada' AND ${rangoO} GROUP BY pg.metodo ORDER BY total DESC`,
        p
      ),
      pool.query(
        `SELECT tipo, COUNT(*)::int AS ordenes, SUM(total)::float8 AS total
         FROM public.ordenes o WHERE estado_actual = 'cerrada' AND ${rangoO} GROUP BY tipo ORDER BY total DESC`,
        p
      ),
      pool.query(
        `SELECT COALESCE(pr.nombre, paq.nombre) AS nombre, SUM(d.cantidad)::int AS cantidad
         FROM public.orden_detalle d JOIN public.ordenes o ON o.id_orden = d.id_orden
         LEFT JOIN public.productos pr ON pr.id_producto = d.id_producto
         LEFT JOIN public.paquetes paq ON paq.id_paquete = d.id_paquete
         WHERE o.estado_actual <> 'cancelada' AND ${rangoO} GROUP BY 1 ORDER BY cantidad DESC LIMIT 8`,
        p
      ),
      pool.query(
        `SELECT ca.motivo, ca.monto_perdido::float8 AS monto, o.folio, u.nombre AS empleado, ca.timestamp_cancelacion AS fecha
         FROM public.cancelacionesauditoria ca JOIN public.ordenes o ON o.id_orden = ca.id_orden
         JOIN public.usuarios u ON u.id_usuario = ca.id_empleado_cancelo
         WHERE (ca.timestamp_cancelacion AT TIME ZONE $1)::date BETWEEN $2::date AND $3::date
         ORDER BY ca.timestamp_cancelacion DESC LIMIT 20`,
        p
      ),
    ])
    const s = res1.rows[0]
    res.json({
      ok: true,
      rango: { desde, hasta },
      resumen: { ...s, ticketPromedio: s.cerradas ? Math.round((s.ventas / s.cerradas) * 100) / 100 : 0 },
      ventasPorMetodo: metodos.rows,
      ventasPorTipo: tipos.rows,
      topProductos: top.rows,
      cancelaciones: cancs.rows,
    })
  })
)
