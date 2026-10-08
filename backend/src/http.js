export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

/** Envuelve handlers async para enviar los errores al middleware global. */
export const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

export function notFound(req, res) {
  res.status(404).json({ ok: false, error: 'Ruta no encontrada' })
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ ok: false, error: err.message })
  }
  if (err?.name === 'ZodError') {
    const msg = err.issues.map(i => `${i.path.join('.') || 'body'}: ${i.message}`).join('; ')
    return res.status(400).json({ ok: false, error: `Datos inválidos — ${msg}` })
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ ok: false, error: 'JSON inválido' })
  }
  if (err?.code === '23505') {
    return res.status(409).json({ ok: false, error: 'Ya existe un registro con ese valor' })
  }
  if (err?.code === '23503') {
    return res.status(409).json({ ok: false, error: 'El registro está en uso por otros datos' })
  }
  console.error('Error no controlado:', err)
  res.status(500).json({ ok: false, error: 'Error interno del servidor' })
}
