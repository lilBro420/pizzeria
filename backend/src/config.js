import { pool } from './db.js'

let cache = null
let cachedAt = 0

export const SIZE_KEYS = {
  Chica: 'extra_chica',
  Mediana: 'extra_mediana',
  Grande: 'extra_grande',
  Delgada: 'extra_delgada',
  Gruesa: 'extra_gruesa',
  'Orilla Rellena': 'extra_orilla_rellena',
}

export const CONFIG_KEYS = [
  'nombre_negocio',
  'iva_tasa',
  'iva_incluido',
  'extra_chica',
  'extra_mediana',
  'extra_grande',
  'extra_delgada',
  'extra_gruesa',
  'extra_orilla_rellena',
  'ticket_pie',
  'zona_horaria',
]

export function invalidateConfig() {
  cache = null
}

/** Configuración editable (IVA, recargos…) con caché de 30 s. */
export async function getConfig(q = pool) {
  if (cache && Date.now() - cachedAt < 30000) return cache
  const r = await q.query('SELECT clave, valor FROM public.configuracion')
  const raw = Object.fromEntries(r.rows.map(x => [x.clave, x.valor]))
  const num = (k, d) => {
    const v = parseFloat(raw[k])
    return Number.isFinite(v) ? v : d
  }
  const extras = {}
  for (const [label, key] of Object.entries(SIZE_KEYS)) extras[label] = num(key, 0)
  cache = {
    raw,
    nombreNegocio: raw.nombre_negocio || 'Pizzería',
    ivaTasa: num('iva_tasa', 0.16),
    ivaIncluido: raw.iva_incluido !== 'false',
    extras,
    ticketPie: raw.ticket_pie || '',
    zona: raw.zona_horaria || 'America/Mexico_City',
  }
  cachedAt = Date.now()
  return cache
}

/** Versión segura para el frontend. */
export function publicConfig(cfg) {
  return {
    nombreNegocio: cfg.nombreNegocio,
    ivaTasa: cfg.ivaTasa,
    ivaIncluido: cfg.ivaIncluido,
    extras: cfg.extras,
    ticketPie: cfg.ticketPie,
    zona: cfg.zona,
  }
}
