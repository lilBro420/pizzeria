import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env') })
dotenv.config() // fallback to process.cwd() .env if any

// NOTA: Supabase (pooler) usa una cadena de certificados que Node no trae por defecto.
// Para verificar el certificado, descarga el CA desde Supabase y usa ssl: { ca }.
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  statement_timeout: 15000,
})

/** Ejecuta fn(client) dentro de una transacción; hace ROLLBACK si falla. */
export async function tx(fn) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    try {
      await client.query('ROLLBACK')
    } catch {
      /* conexión ya cerrada */
    }
    throw err
  } finally {
    client.release()
  }
}
