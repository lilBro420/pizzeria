// Ejecuta migrations/*.sql en orden dentro de UNA transacción por archivo y registra lo aplicado.
// Además asigna contraseñas iniciales (hash bcrypt) a los usuarios que aún tienen hashes de prueba.
import dotenv from 'dotenv'
import pg from 'pg'
import fs from 'fs'
import path from 'path'
import bcrypt from 'bcryptjs'

dotenv.config()
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

const dir = path.join(process.cwd(), 'migrations')
const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort()

await pool.query(`CREATE TABLE IF NOT EXISTS public.migraciones (
  nombre VARCHAR(100) PRIMARY KEY, aplicada TIMESTAMPTZ DEFAULT NOW())`)
const done = new Set((await pool.query('SELECT nombre FROM public.migraciones')).rows.map(r => r.nombre))

for (const f of files) {
  if (done.has(f)) { console.log(`= ${f} (ya aplicada)`); continue }
  const sql = fs.readFileSync(path.join(dir, f), 'utf8')
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(sql)
    await client.query('INSERT INTO public.migraciones (nombre) VALUES ($1)', [f])
    await client.query('COMMIT')
    console.log(`+ ${f} aplicada`)
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(`x ${f} FALLÓ y se revirtió:`, err.message)
    client.release()
    await pool.end()
    process.exit(1)
  }
  client.release()
}

// Contraseñas iniciales (el admin debe cambiarlas desde Usuarios)
const iniciales = { carlos: 'admin123', ana: 'cajero123', miguel: 'cocina123', juan: 'reparto123', luis: 'reparto123' }
for (const [usuario, pass] of Object.entries(iniciales)) {
  const r = await pool.query(
    `SELECT id_usuario, contrasena_hash FROM public.usuarios WHERE LOWER(usuario) = $1`, [usuario])
  if (r.rowCount && !r.rows[0].contrasena_hash.startsWith('$2')) {
    await pool.query('UPDATE public.usuarios SET contrasena_hash = $1 WHERE id_usuario = $2',
      [await bcrypt.hash(pass, 10), r.rows[0].id_usuario])
    console.log(`  contraseña inicial asignada a "${usuario}"`)
  }
}

await pool.end()
console.log('Listo.')
