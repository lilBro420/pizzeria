import dotenv from 'dotenv'
import pg from 'pg'

dotenv.config()
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

const views = await pool.query(`
  SELECT viewname, definition FROM pg_views WHERE schemaname = 'public'
`)
views.rows.forEach(v => console.log(`\n-- ${v.viewname}\n${v.definition}`))

const idx = await pool.query(`
  SELECT tablename, indexname FROM pg_indexes WHERE schemaname='public' ORDER BY 1,2
`)
console.log('\n-- INDEXES')
idx.rows.forEach(i => console.log(`  ${i.tablename}: ${i.indexname}`))

const trg = await pool.query(`
  SELECT event_object_table, trigger_name, action_statement
  FROM information_schema.triggers WHERE trigger_schema='public'
`)
console.log('\n-- TRIGGERS', trg.rows)

const u = await pool.query('SELECT id_usuario, nombre, correo, rol, LEFT(contrasena_hash, 12) AS h FROM public.usuarios ORDER BY 1')
console.log('\n-- USUARIOS', u.rows)

await pool.end()
