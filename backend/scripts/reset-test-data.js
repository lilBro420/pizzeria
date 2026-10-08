// Borra TODAS las ventas de prueba (órdenes, pagos, cancelaciones, comandas, movimientos de venta, turnos)
// y devuelve al inventario lo que esas ventas consumieron. NO toca menú, usuarios, clientes ni insumos.
// Uso:  node scripts/reset-test-data.js --yes      (hacer antes: node scripts/backup.js)
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'
import pg from 'pg'

if (!process.argv.includes('--yes')) {
  console.log('Esto borra TODAS las órdenes. Ejecuta con --yes para confirmar (y haz antes un respaldo).')
  process.exit(1)
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env') })
dotenv.config()
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
const client = await pool.connect()
try {
  await client.query('BEGIN')

  // Inventario: sumar de vuelta el consumo neto de las ventas (salidas - restituciones)
  await client.query(`
    UPDATE public.lotes_insumo l
    SET cantidad_actual_base = l.cantidad_actual_base + COALESCE((
      SELECT SUM(CASE WHEN m.tipo = 'salida' THEN m.cantidad ELSE -m.cantidad END)
      FROM public.movimientos_inventario m WHERE m.id_lote = l.id_lote AND m.id_orden IS NOT NULL), 0)`)

  for (const t of [
    'movimientos_inventario WHERE id_orden IS NOT NULL',
    'ventas_paquetes_auditoria',
    'cancelacionesauditoria',
    'pagos',
    'orden_estado_historial',
    'orden_detalle',
    'ordenes',
    'turnos',
  ]) {
    const r = await client.query(`DELETE FROM public.${t}`)
    console.log(`  ${t.split(' ')[0]}: ${r.rowCount} filas borradas`)
  }
  await client.query(`UPDATE public.clientes SET total_ordenes = 0, fecha_ultima_orden = NULL`)
  await client.query(`ALTER SEQUENCE public.folio_seq RESTART WITH 4001`)
  await client.query('COMMIT')
  console.log('Listo: base de ventas limpia, folios reiniciados en #4001.')
} catch (err) {
  await client.query('ROLLBACK')
  console.error('Falló y se revirtió:', err.message)
  process.exitCode = 1
} finally {
  client.release()
  await pool.end()
}
