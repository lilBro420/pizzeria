import { Router } from 'express'
import { z } from 'zod'
import { pool, tx } from '../db.js'
import { HttpError, wrap } from '../http.js'
import { authenticate, requirePerm } from '../auth.js'
import { CONFIG_KEYS, getConfig, invalidateConfig, publicConfig } from '../config.js'

export const catalogoRouter = Router()
catalogoRouter.use(authenticate)

const id = z.coerce.number().int().positive()
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color inválido (ej. #B71C1C)')

// ─── Catálogo completo para el POS (1 sola llamada) ─────────────────
async function cargarCatalogo(todos) {
  const act = todos ? '' : 'WHERE activo = TRUE'
  const [cats, prods, paqs, mesas, notas, cfg] = await Promise.all([
    pool.query(`SELECT id_categoria AS id, nombre, color, orden, activo FROM public.categorias ${act} ORDER BY orden, id_categoria`),
    pool.query(
      `SELECT p.id_producto AS id, p.nombre, p.descripcion, p.precio_base::float8 AS precio, p.id_categoria AS "idCategoria",
              p.orden, p.activo
       FROM public.productos p ${todos ? '' : 'WHERE p.activo = TRUE'}
       ORDER BY p.id_categoria, p.orden, p.id_producto`
    ),
    pool.query(
      `SELECT pq.id_paquete AS id, pq.nombre, pq.descripcion, pq.precio_paquete::float8 AS precio,
              pq.precio_individual::float8 AS "precioIndividual", pq.orden, pq.activo,
              COALESCE(json_agg(json_build_object('idProducto', pd.id_producto, 'nombre', pr.nombre, 'cantidad', pd.cantidad))
                FILTER (WHERE pd.id_detalle IS NOT NULL), '[]') AS items
       FROM public.paquetes pq
       LEFT JOIN public.paquete_detalle pd ON pd.id_paquete = pq.id_paquete
       LEFT JOIN public.productos pr ON pr.id_producto = pd.id_producto
       ${todos ? '' : 'WHERE pq.activo = TRUE'}
       GROUP BY pq.id_paquete ORDER BY pq.orden, pq.id_paquete`
    ),
    pool.query(`SELECT id_mesa AS id, nombre, orden, activo FROM public.mesas ${act} ORDER BY orden, id_mesa`),
    pool.query(`SELECT id_nota AS id, texto, orden, activo FROM public.notas_rapidas ${act} ORDER BY orden, id_nota`),
    getConfig(),
  ])
  return {
    categorias: cats.rows,
    productos: prods.rows,
    paquetes: paqs.rows,
    mesas: mesas.rows,
    notasRapidas: notas.rows,
    config: publicConfig(cfg),
  }
}

catalogoRouter.get(
  '/catalogo',
  wrap(async (req, res) => {
    const todos = req.query.todos === '1'
    if (todos && !req.user.permisos.some(p => ['menu', 'configuracion'].includes(p))) {
      throw new HttpError(403, 'No tienes permiso para esta acción')
    }
    res.json({ ok: true, ...(await cargarCatalogo(todos)) })
  })
)

// ─── Categorías ─────────────────────────────────────────────────────
const catSchema = z.object({ nombre: z.string().min(1).max(50), color: hex, orden: z.number().int().min(0).max(999).optional() })

catalogoRouter.post(
  '/categorias',
  requirePerm('menu'),
  wrap(async (req, res) => {
    const b = catSchema.parse(req.body)
    const r = await pool.query(
      `INSERT INTO public.categorias (nombre, color, orden)
       VALUES ($1, $2, COALESCE($3, (SELECT COALESCE(MAX(orden), 0) + 1 FROM public.categorias))) RETURNING id_categoria AS id`,
      [b.nombre, b.color, b.orden ?? null]
    )
    res.status(201).json({ ok: true, id: r.rows[0].id })
  })
)

catalogoRouter.put(
  '/categorias/:id',
  requirePerm('menu'),
  wrap(async (req, res) => {
    const b = catSchema.partial().extend({ activo: z.boolean().optional() }).parse(req.body)
    const cid = id.parse(req.params.id)
    if (b.activo === false) {
      const n = await pool.query('SELECT COUNT(*)::int AS n FROM public.productos WHERE id_categoria = $1 AND activo = TRUE', [cid])
      if (n.rows[0].n > 0) throw new HttpError(409, 'Desactiva o mueve primero los productos de esta categoría')
    }
    const r = await pool.query(
      `UPDATE public.categorias SET nombre = COALESCE($1, nombre), color = COALESCE($2, color),
              orden = COALESCE($3, orden), activo = COALESCE($4, activo) WHERE id_categoria = $5 RETURNING id_categoria`,
      [b.nombre ?? null, b.color ?? null, b.orden ?? null, b.activo ?? null, cid]
    )
    if (!r.rowCount) throw new HttpError(404, 'Categoría no encontrada')
    res.json({ ok: true })
  })
)

// ─── Productos ──────────────────────────────────────────────────────
const prodSchema = z.object({
  nombre: z.string().min(1).max(100),
  descripcion: z.string().max(255).nullish(),
  precio: z.number().min(0).max(100000),
  idCategoria: id,
})

catalogoRouter.post(
  '/productos',
  requirePerm('menu'),
  wrap(async (req, res) => {
    const b = prodSchema.parse(req.body)
    const r = await pool.query(
      `INSERT INTO public.productos (nombre, descripcion, precio_base, id_categoria, orden)
       VALUES ($1, $2, $3, $4, (SELECT COALESCE(MAX(orden), 0) + 1 FROM public.productos WHERE id_categoria = $4))
       RETURNING id_producto AS id`,
      [b.nombre, b.descripcion || null, b.precio, b.idCategoria]
    )
    res.status(201).json({ ok: true, id: r.rows[0].id })
  })
)

// Debe ir ANTES de /productos/:id
catalogoRouter.put(
  '/productos/orden',
  requirePerm('menu'),
  wrap(async (req, res) => {
    const { ids } = z.object({ ids: z.array(id).min(1).max(500) }).parse(req.body)
    await pool.query(
      `UPDATE public.productos p SET orden = x.pos
       FROM (SELECT unnest($1::int[]) AS id, generate_series(1, $2) AS pos) x WHERE p.id_producto = x.id`,
      [ids, ids.length]
    )
    res.json({ ok: true })
  })
)

catalogoRouter.put(
  '/productos/:id',
  requirePerm('menu'),
  wrap(async (req, res) => {
    const b = prodSchema.partial().extend({ activo: z.boolean().optional() }).parse(req.body)
    const r = await pool.query(
      `UPDATE public.productos SET nombre = COALESCE($1, nombre), descripcion = COALESCE($2, descripcion),
              precio_base = COALESCE($3, precio_base), id_categoria = COALESCE($4, id_categoria),
              activo = COALESCE($5, activo) WHERE id_producto = $6 RETURNING id_producto`,
      [b.nombre ?? null, b.descripcion ?? null, b.precio ?? null, b.idCategoria ?? null, b.activo ?? null, id.parse(req.params.id)]
    )
    if (!r.rowCount) throw new HttpError(404, 'Producto no encontrado')
    res.json({ ok: true })
  })
)

catalogoRouter.delete(
  '/productos/:id',
  requirePerm('menu'),
  wrap(async (req, res) => {
    // Baja lógica: el historial de ventas conserva el producto
    await pool.query('UPDATE public.productos SET activo = FALSE WHERE id_producto = $1', [id.parse(req.params.id)])
    res.json({ ok: true })
  })
)

// ─── Paquetes ───────────────────────────────────────────────────────
const paqSchema = z.object({
  nombre: z.string().min(1).max(100),
  descripcion: z.string().max(255).nullish(),
  precio: z.number().min(0).max(100000),
  items: z.array(z.object({ idProducto: id, cantidad: z.number().int().min(1).max(20) })).min(1).max(20),
})

async function guardarItemsPaquete(c, idPaquete, items) {
  await c.query('DELETE FROM public.paquete_detalle WHERE id_paquete = $1', [idPaquete])
  for (const it of items) {
    await c.query('INSERT INTO public.paquete_detalle (id_paquete, id_producto, cantidad) VALUES ($1, $2, $3)', [
      idPaquete,
      it.idProducto,
      it.cantidad,
    ])
  }
  // precio_individual = suma de las partes (para mostrar el ahorro)
  await c.query(
    `UPDATE public.paquetes SET precio_individual = COALESCE((
       SELECT SUM(pr.precio_base * pd.cantidad) FROM public.paquete_detalle pd
       JOIN public.productos pr ON pr.id_producto = pd.id_producto WHERE pd.id_paquete = $1), precio_paquete)
     WHERE id_paquete = $1`,
    [idPaquete]
  )
}

catalogoRouter.post(
  '/paquetes',
  requirePerm('menu'),
  wrap(async (req, res) => {
    const b = paqSchema.parse(req.body)
    const newId = await tx(async c => {
      const r = await c.query(
        `INSERT INTO public.paquetes (nombre, descripcion, precio_paquete, categoria_paquete, orden)
         VALUES ($1, $2, $3, 'combo', (SELECT COALESCE(MAX(orden), 0) + 1 FROM public.paquetes)) RETURNING id_paquete`,
        [b.nombre, b.descripcion || null, b.precio]
      )
      await guardarItemsPaquete(c, r.rows[0].id_paquete, b.items)
      return r.rows[0].id_paquete
    })
    res.status(201).json({ ok: true, id: newId })
  })
)

catalogoRouter.put(
  '/paquetes/:id',
  requirePerm('menu'),
  wrap(async (req, res) => {
    const b = paqSchema.partial().extend({ activo: z.boolean().optional() }).parse(req.body)
    const pid = id.parse(req.params.id)
    await tx(async c => {
      const r = await c.query(
        `UPDATE public.paquetes SET nombre = COALESCE($1, nombre), descripcion = COALESCE($2, descripcion),
                precio_paquete = COALESCE($3, precio_paquete), activo = COALESCE($4, activo)
         WHERE id_paquete = $5 RETURNING id_paquete`,
        [b.nombre ?? null, b.descripcion ?? null, b.precio ?? null, b.activo ?? null, pid]
      )
      if (!r.rowCount) throw new HttpError(404, 'Paquete no encontrado')
      if (b.items) await guardarItemsPaquete(c, pid, b.items)
    })
    res.json({ ok: true })
  })
)

catalogoRouter.delete(
  '/paquetes/:id',
  requirePerm('menu'),
  wrap(async (req, res) => {
    await pool.query('UPDATE public.paquetes SET activo = FALSE WHERE id_paquete = $1', [id.parse(req.params.id)])
    res.json({ ok: true })
  })
)

// ─── Configuración ──────────────────────────────────────────────────
catalogoRouter.put(
  '/configuracion',
  requirePerm('configuracion'),
  wrap(async (req, res) => {
    const b = z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).parse(req.body)
    const entries = Object.entries(b)
    for (const [k, v] of entries) {
      if (!CONFIG_KEYS.includes(k)) throw new HttpError(400, `Clave de configuración desconocida: ${k}`)
      if (k === 'iva_tasa' && !(parseFloat(v) >= 0 && parseFloat(v) < 1)) {
        throw new HttpError(400, 'iva_tasa debe estar entre 0 y 1 (ej. 0.16)')
      }
      if (k.startsWith('extra_') && !Number.isFinite(parseFloat(v))) {
        throw new HttpError(400, `${k} debe ser numérico`)
      }
    }
    await tx(async c => {
      for (const [k, v] of entries) {
        await c.query(
          `INSERT INTO public.configuracion (clave, valor) VALUES ($1, $2)
           ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor`,
          [k, String(v)]
        )
      }
    })
    invalidateConfig()
    res.json({ ok: true, config: publicConfig(await getConfig()) })
  })
)

// ─── Mesas y notas rápidas ──────────────────────────────────────────
function crudSimple(ruta, tabla, pk, campoTexto, perm, maxLen) {
  catalogoRouter.post(
    `/${ruta}`,
    requirePerm(perm),
    wrap(async (req, res) => {
      const { texto } = z.object({ texto: z.string().min(1).max(maxLen) }).parse(req.body)
      const r = await pool.query(
        `INSERT INTO public.${tabla} (${campoTexto}, orden) VALUES ($1, (SELECT COALESCE(MAX(orden), 0) + 1 FROM public.${tabla}))
         RETURNING ${pk} AS id`,
        [texto]
      )
      res.status(201).json({ ok: true, id: r.rows[0].id })
    })
  )
  catalogoRouter.put(
    `/${ruta}/:id`,
    requirePerm(perm),
    wrap(async (req, res) => {
      const b = z
        .object({ texto: z.string().min(1).max(maxLen).optional(), activo: z.boolean().optional(), orden: z.number().int().optional() })
        .parse(req.body)
      await pool.query(
        `UPDATE public.${tabla} SET ${campoTexto} = COALESCE($1, ${campoTexto}), activo = COALESCE($2, activo),
                orden = COALESCE($3, orden) WHERE ${pk} = $4`,
        [b.texto ?? null, b.activo ?? null, b.orden ?? null, id.parse(req.params.id)]
      )
      res.json({ ok: true })
    })
  )
  catalogoRouter.delete(
    `/${ruta}/:id`,
    requirePerm(perm),
    wrap(async (req, res) => {
      await pool.query(`UPDATE public.${tabla} SET activo = FALSE WHERE ${pk} = $1`, [id.parse(req.params.id)])
      res.json({ ok: true })
    })
  )
}
crudSimple('mesas', 'mesas', 'id_mesa', 'nombre', 'configuracion', 20)
crudSimple('notas-rapidas', 'notas_rapidas', 'id_nota', 'texto', 'configuracion', 60)

// ─── Clientes: búsqueda por teléfono / nombre (el POS la usa en domicilio y recoger) ───
catalogoRouter.get(
  '/clientes',
  requirePerm('vender', 'cobrar', 'reportes'),
  wrap(async (req, res) => {
    const { q } = z.object({ q: z.string().trim().max(50).default('') }).parse(req.query)
    const like = `%${q.replace(/[%_]/g, '')}%`
    const r = await pool.query(
      `SELECT id_cliente AS id, celular, nombre, apellido, direccion_principal AS direccion,
              referencias, notas, COALESCE(total_ordenes, 0) AS ordenes
       FROM public.clientes
       WHERE activo = TRUE AND ($1 = '%%' OR celular ILIKE $1 OR nombre ILIKE $1 OR apellido ILIKE $1)
       ORDER BY fecha_ultima_orden DESC NULLS LAST, nombre LIMIT 20`,
      [like]
    )
    res.json({ ok: true, clientes: r.rows })
  })
)
