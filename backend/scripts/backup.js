// Respaldo completo de la BD a JSON (cada tabla/vista de public) en backend/backups/<fecha>/
import dotenv from 'dotenv'
import pg from 'pg'
import fs from 'fs'
import path from 'path'

dotenv.config()
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const dir = path.join(process.cwd(), 'backups', stamp)
fs.mkdirSync(dir, { recursive: true })

const tables = await pool.query(
  `SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY 1`
)
let total = 0
for (const { table_name } of tables.rows) {
  const r = await pool.query(`SELECT * FROM public."${table_name}"`)
  fs.writeFileSync(path.join(dir, `${table_name}.json`), JSON.stringify(r.rows, null, 2))
  total += r.rowCount
  console.log(`  ${table_name}: ${r.rowCount} filas`)
}
console.log(`\nRespaldo guardado en ${dir} (${total} filas)`)
await pool.end()
