import { Router } from 'express'
import { z } from 'zod'
import { pool } from '../db.js'
import { HttpError, wrap } from '../http.js'
import {
  authenticate,
  checkCredentials,
  hasPerm,
  hashPassword,
  loginLimiter,
  PERMISOS,
  publicUser,
  requirePerm,
  signToken,
} from '../auth.js'

export const authRouter = Router()
export const usuariosRouter = Router()

// ─── Login ──────────────────────────────────────────────────────────
authRouter.post(
  '/login',
  wrap(async (req, res) => {
    const { usuario, password } = z
      .object({ usuario: z.string().min(1).max(40), password: z.string().min(1).max(100) })
      .parse(req.body)

    const limiter = loginLimiter(usuario)
    if (limiter.blocked) throw new HttpError(429, 'Demasiados intentos. Espera unos minutos.')

    const u = await checkCredentials(usuario, password)
    if (!u) {
      limiter.fail()
      throw new HttpError(401, 'Usuario o contraseña incorrectos')
    }
    limiter.reset()
    await pool.query('UPDATE public.usuarios SET ultimo_acceso = NOW() WHERE id_usuario = $1', [u.id_usuario])
    res.json({ ok: true, token: signToken(u.id_usuario), usuario: publicUser(u) })
  })
)

authRouter.get('/me', authenticate, (req, res) => res.json({ ok: true, usuario: req.user }))

// ─── Usuarios (administración) ──────────────────────────────────────
usuariosRouter.use(authenticate)

usuariosRouter.get('/permisos', (req, res) => res.json({ ok: true, permisos: PERMISOS }))

// Lista corta de repartidores para asignar en domicilio (no requiere ser admin)
usuariosRouter.get(
  '/repartidores',
  requirePerm('vender', 'entregas', 'usuarios'),
  wrap(async (req, res) => {
    const r = await pool.query(
      `SELECT id_usuario AS id, nombre FROM public.usuarios WHERE rol = 'repartidor' AND activo = TRUE ORDER BY nombre`
    )
    res.json({ ok: true, repartidores: r.rows })
  })
)

const ROLES = ['admin', 'cajero', 'cocinero', 'repartidor']
const permEnum = z.array(z.enum(Object.keys(PERMISOS))).max(20)

usuariosRouter.get(
  '/',
  requirePerm('usuarios'),
  wrap(async (req, res) => {
    const r = await pool.query(
      `SELECT id_usuario AS id, nombre, usuario, correo, rol, permisos, activo, ultimo_acceso
       FROM public.usuarios ORDER BY activo DESC, nombre`
    )
    res.json({ ok: true, usuarios: r.rows })
  })
)

usuariosRouter.post(
  '/',
  requirePerm('usuarios'),
  wrap(async (req, res) => {
    const b = z
      .object({
        nombre: z.string().min(1).max(100),
        usuario: z.string().regex(/^[a-zA-Z0-9._-]{3,40}$/, 'Usuario: 3-40 letras, números, . _ -'),
        password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').max(100),
        rol: z.enum(ROLES),
        permisos: permEnum,
        correo: z.string().email().max(120).nullish(),
      })
      .parse(req.body)
    const r = await pool.query(
      `INSERT INTO public.usuarios (nombre, usuario, correo, contrasena_hash, rol, permisos)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id_usuario AS id`,
      [b.nombre, b.usuario, b.correo || null, await hashPassword(b.password), b.rol, b.permisos]
    )
    res.status(201).json({ ok: true, id: r.rows[0].id })
  })
)

usuariosRouter.put(
  '/:id',
  requirePerm('usuarios'),
  wrap(async (req, res) => {
    const id = z.coerce.number().int().positive().parse(req.params.id)
    const b = z
      .object({
        nombre: z.string().min(1).max(100).optional(),
        usuario: z.string().regex(/^[a-zA-Z0-9._-]{3,40}$/).optional(),
        password: z.string().min(6).max(100).optional(),
        rol: z.enum(ROLES).optional(),
        permisos: permEnum.optional(),
        activo: z.boolean().optional(),
        correo: z.string().email().max(120).nullish(),
      })
      .parse(req.body)

    // No permitir que el admin se quite el acceso a sí mismo
    if (id === req.user.id) {
      if (b.activo === false) throw new HttpError(400, 'No puedes desactivar tu propio usuario')
      if (b.permisos && !b.permisos.includes('usuarios')) {
        throw new HttpError(400, 'No puedes quitarte el permiso de administrar usuarios')
      }
    }

    const sets = []
    const vals = []
    const push = (col, v) => {
      vals.push(v)
      sets.push(`${col} = $${vals.length}`)
    }
    if (b.nombre !== undefined) push('nombre', b.nombre)
    if (b.usuario !== undefined) push('usuario', b.usuario)
    if (b.password !== undefined) push('contrasena_hash', await hashPassword(b.password))
    if (b.rol !== undefined) push('rol', b.rol)
    if (b.permisos !== undefined) push('permisos', b.permisos)
    if (b.activo !== undefined) push('activo', b.activo)
    if (b.correo !== undefined) push('correo', b.correo || null)
    if (!sets.length) throw new HttpError(400, 'Nada que actualizar')

    vals.push(id)
    const r = await pool.query(
      `UPDATE public.usuarios SET ${sets.join(', ')} WHERE id_usuario = $${vals.length} RETURNING id_usuario`,
      vals
    )
    if (!r.rowCount) throw new HttpError(404, 'Usuario no encontrado')
    res.json({ ok: true })
  })
)

// Cambio de contraseña propio
usuariosRouter.post(
  '/mi-password',
  wrap(async (req, res) => {
    const b = z
      .object({ actual: z.string().min(1), nueva: z.string().min(6).max(100) })
      .parse(req.body)
    const u = await checkCredentials(req.user.usuario, b.actual)
    if (!u) throw new HttpError(400, 'La contraseña actual es incorrecta')
    await pool.query('UPDATE public.usuarios SET contrasena_hash = $1 WHERE id_usuario = $2', [
      await hashPassword(b.nueva),
      req.user.id,
    ])
    res.json({ ok: true })
  })
)

export { hasPerm }
