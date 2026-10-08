import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { pool } from './db.js'
import { HttpError, wrap } from './http.js'

const SECRET = process.env.JWT_SECRET
if (!SECRET || SECRET.length < 32) {
  console.error('❌ Falta JWT_SECRET (mínimo 32 caracteres) en backend/.env')
  process.exit(1)
}

export const PERMISOS = {
  vender: 'Tomar órdenes',
  cobrar: 'Cobrar cuentas',
  descuentos: 'Aplicar descuentos',
  cancelar: 'Cancelar cuentas sin autorización',
  turnos: 'Abrir y cerrar turno',
  reportes: 'Ver reportes y dashboard',
  menu: 'Editar menú y categorías',
  usuarios: 'Administrar usuarios',
  configuracion: 'Configuración del sistema',
  cocina: 'Pantalla de cocina',
  entregas: 'Entregas a domicilio',
}

export const signToken = idUsuario => jwt.sign({ sub: idUsuario }, SECRET, { expiresIn: '12h' })

export const hashPassword = pass => bcrypt.hash(pass, 10)

/** Verifica usuario + contraseña. Devuelve el usuario o null. */
export async function checkCredentials(usuario, password) {
  const r = await pool.query(
    `SELECT id_usuario, nombre, usuario, rol, permisos, activo, contrasena_hash
     FROM public.usuarios WHERE LOWER(usuario) = LOWER($1)`,
    [usuario]
  )
  const u = r.rows[0]
  if (!u || !u.activo) return null
  const ok = await bcrypt.compare(password, u.contrasena_hash)
  return ok ? u : null
}

export function publicUser(u) {
  return { id: u.id_usuario, nombre: u.nombre, usuario: u.usuario, rol: u.rol, permisos: u.permisos }
}

/** Middleware: exige "Authorization: Bearer <token>" y carga el usuario ACTUAL desde la BD. */
export const authenticate = wrap(async (req, res, next) => {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) throw new HttpError(401, 'Sesión requerida')
  let payload
  try {
    payload = jwt.verify(token, SECRET)
  } catch {
    throw new HttpError(401, 'Sesión expirada o inválida')
  }
  const r = await pool.query(
    `SELECT id_usuario, nombre, usuario, rol, permisos, activo FROM public.usuarios WHERE id_usuario = $1`,
    [payload.sub]
  )
  const u = r.rows[0]
  if (!u || !u.activo) throw new HttpError(401, 'Usuario desactivado')
  req.user = { id: u.id_usuario, nombre: u.nombre, usuario: u.usuario, rol: u.rol, permisos: u.permisos }
  next()
})

/** Exige al menos uno de los permisos indicados. */
export const requirePerm =
  (...perms) =>
  (req, res, next) =>
    perms.some(p => req.user.permisos.includes(p))
      ? next()
      : next(new HttpError(403, 'No tienes permiso para esta acción'))

export const hasPerm = (user, perm) => user.permisos.includes(perm)

/** Autorización de un supervisor con usuario/contraseña que tenga el permiso indicado. */
export async function authorizeSupervisor(autoriza, perm) {
  if (!autoriza?.usuario || !autoriza?.password) {
    throw new HttpError(403, 'Se requiere autorización de un supervisor')
  }
  const u = await checkCredentials(autoriza.usuario, autoriza.password)
  if (!u || !u.permisos.includes(perm)) {
    throw new HttpError(403, 'Autorización inválida')
  }
  return u
}

// Limitador simple de intentos de login (en memoria): 5 fallos por usuario cada 5 minutos
const fails = new Map()
export function loginLimiter(usuario) {
  const key = String(usuario).toLowerCase()
  const now = Date.now()
  const rec = (fails.get(key) || []).filter(t => now - t < 5 * 60 * 1000)
  fails.set(key, rec)
  return {
    blocked: rec.length >= 5,
    fail: () => fails.set(key, [...rec, now]),
    reset: () => fails.delete(key),
  }
}
