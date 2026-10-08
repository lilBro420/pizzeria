import express from 'express'
import cors from 'cors'
import { pool } from './src/db.js'
import { errorHandler, notFound, wrap } from './src/http.js'
import { authRouter, usuariosRouter } from './src/routes/usuarios.js'
import { catalogoRouter } from './src/routes/catalogo.js'
import { ordenesRouter } from './src/routes/ordenes.js'
import { adminRouter, cocinaRouter, turnosRouter } from './src/routes/operacion.js'

const app = express()
app.disable('x-powered-by')

// CORS: localhost, redes privadas (tablets en la LAN) y orígenes extra de CORS_EXTRA_ORIGINS
const extra = (process.env.CORS_EXTRA_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)
const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/
app.use(
  cors({
    origin: (origin, cb) => cb(null, !origin || LOCAL.test(origin) || extra.includes(origin)),
  })
)
app.use(express.json({ limit: '200kb' }))

app.get(
  '/api/health',
  wrap(async (req, res) => {
    const r = await pool.query('SELECT NOW() AS ahora')
    res.json({ ok: true, mensaje: 'Backend funcionando correctamente', db_time: r.rows[0].ahora })
  })
)

app.use('/api/auth', authRouter)
app.use('/api/usuarios', usuariosRouter)
app.use('/api', catalogoRouter) // /catalogo, /categorias, /productos, /paquetes, /configuracion, /mesas, /notas-rapidas, /clientes
app.use('/api/ordenes', ordenesRouter)
app.use('/api/cocina', cocinaRouter)
app.use('/api/turnos', turnosRouter)
app.use('/api/admin', adminRouter)

app.use(notFound)
app.use(errorHandler)

process.on('unhandledRejection', err => console.error('unhandledRejection:', err))

async function start() {
  try {
    const r = await pool.query('SELECT NOW() AS ahora, current_database() AS db')
    console.log('✅ Conexión a Supabase OK')
    console.log('   Hora del servidor:', r.rows[0].ahora)
    console.log('   Base de datos:', r.rows[0].db)
    await pool.query(
      `INSERT INTO public.configuracion (clave, valor) VALUES ('zona_horaria', 'America/Mexico_City') ON CONFLICT (clave) DO NOTHING`
    )
  } catch (err) {
    console.error('❌ Error al conectar a la base de datos:', err.message)
    process.exit(1)
  }
  const PORT = process.env.PORT || 3001
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Backend corriendo en http://localhost:${PORT}`)
    console.log(`   Prueba: http://localhost:${PORT}/api/health`)
  })
}
start()