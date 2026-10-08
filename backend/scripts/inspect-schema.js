import dotenv from 'dotenv'
import pg from 'pg'

dotenv.config()
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

const cols = await pool.query(`
  SELECT table_name, column_name, data_type, character_maximum_length, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_schema = 'public'
  ORDER BY table_name, ordinal_position
`)
const byTable = {}
for (const c of cols.rows) {
  ;(byTable[c.table_name] ||= []).push(
    `${c.column_name} ${c.data_type}${c.character_maximum_length ? `(${c.character_maximum_length})` : ''}${c.is_nullable === 'NO' ? ' NOT NULL' : ''}${c.column_default ? ` DEFAULT ${c.column_default}` : ''}`
  )
}
for (const [t, list] of Object.entries(byTable)) {
  const n = await pool.query(`SELECT COUNT(*)::int AS n FROM public."${t}"`)
  console.log(`\n== ${t} (${n.rows[0].n} filas)`)
  list.forEach(l => console.log('  ' + l))
}

const cons = await pool.query(`
  SELECT conrelid::regclass AS tabla, conname, pg_get_constraintdef(oid) AS def
  FROM pg_constraint
  WHERE connamespace = 'public'::regnamespace AND contype IN ('c','u')
  ORDER BY 1, 2
`)
console.log('\n== CONSTRAINTS (check/unique)')
cons.rows.forEach(r => console.log(`  ${r.tabla}: ${r.conname} -> ${r.def}`))

await pool.end()
