// Prueba de humo del backend (requiere el servidor corriendo en :3001).  Uso: node scripts/smoke-test.js
const BASE = process.env.API || 'http://localhost:3001/api'
let pass = 0
let fail = 0

async function call(method, path, body, token) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  let data = null
  try { data = await res.json() } catch { /* sin cuerpo */ }
  return { status: res.status, data }
}
function check(name, cond, extra = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}`) } else { fail++; console.log(`  ✗ ${name} ${extra}`) }
}

console.log('\n[Auth]')
let r = await call('GET', '/catalogo')
check('catálogo sin token → 401', r.status === 401)
r = await call('POST', '/auth/login', { usuario: 'ana', password: 'mala' })
check('login con contraseña incorrecta → 401', r.status === 401)
r = await call('POST', '/auth/login', { usuario: 'ana', password: 'cajero123' })
check('login cajero OK', r.status === 200 && r.data.token)
const cajero = r.data.token
r = await call('POST', '/auth/login', { usuario: 'carlos', password: 'admin123' })
const admin = r.data.token
r = await call('POST', '/auth/login', { usuario: 'miguel', password: 'cocina123' })
const cocina = r.data.token

console.log('\n[Catálogo]')
r = await call('GET', '/catalogo', null, cajero)
check('catálogo con token', r.status === 200 && r.data.productos.length >= 15, JSON.stringify(r.data).slice(0, 120))
check('trae 12 mesas', r.data.mesas?.length === 12)
check('trae notas rápidas', r.data.notasRapidas?.length > 0)
check('productos sin emoji', !('emoji' in (r.data.productos[0] || {})))
const pizza = r.data.productos.find(p => p.nombre === 'Pepperoni')
const coca = r.data.productos.find(p => p.nombre === 'Coca-Cola')
r = await call('POST', '/productos', { nombre: 'X', precio: 1, idCategoria: 1 }, cajero)
check('cajero no puede crear productos → 403', r.status === 403)

console.log('\n[Orden en espera (domicilio)]')
r = await call('POST', '/ordenes', { tipo: 'domicilio', items: [{ idProducto: pizza.id, cantidad: 1 }] }, cajero)
check('domicilio sin cliente → 400', r.status === 400)
const dom = {
  tipo: 'domicilio',
  cliente: { celular: '5559990001', nombre: 'Cliente Prueba', direccion_principal: 'Calle Falsa 123' },
  items: [{ idProducto: pizza.id, cantidad: 2, tamano: 'Grande', masa: 'Orilla Rellena', notas: 'sin cebolla' }, { idProducto: coca.id, cantidad: 2 }],
  claveIdempotencia: 'smoke-' + Date.now(),
}
r = await call('POST', '/ordenes', dom, cajero)
check('crea orden en espera', r.status === 201 && r.data.orden.estado === 'abierta', JSON.stringify(r.data))
const o1 = r.data.orden
// pepperoni 179 + grande 30 + orilla 20 = 229 *2 = 458 + coca 35*2=70 → 528
check('total calculado por el servidor = 528.00', o1.total === 528, `total=${o1.total}`)
check('IVA incluido: 528 - 528/1.16 = 72.83', o1.impuesto === 72.83, `iva=${o1.impuesto}`)
check('nota por producto guardada', o1.items.some(i => i.notas === 'sin cebolla'))
check('cliente creado en BD', o1.cliente?.celular === '5559990001')
r = await call('POST', '/ordenes', dom, cajero)
check('idempotencia: mismo folio, no duplica', r.data.orden?.folio === o1.folio)

console.log('\n[Cocina]')
r = await call('GET', '/cocina/comandas', null, cajero)
check('cajero no accede a cocina → 403', r.status === 403)
r = await call('GET', '/cocina/comandas', null, cocina)
check('comanda pendiente visible en cocina', r.data.pendientes?.some(o => o.folio === o1.folio))
r = await call('POST', `/cocina/comandas/${o1.id}/imprimir`, null, cocina)
check('imprimir marca la comanda', r.status === 200 && r.data.orden.comandaImpresa)
r = await call('GET', '/cocina/comandas', null, cocina)
check('ya no está pendiente', !r.data.pendientes?.some(o => o.folio === o1.folio))

console.log('\n[Cobro]')
r = await call('POST', `/ordenes/${o1.id}/pagar`, { pagos: [{ metodo: 'efectivo', monto: 100 }] }, cajero)
check('pago que no cubre el total → 400', r.status === 400, JSON.stringify(r.data))
r = await call('POST', `/ordenes/${o1.id}/pagar`, { pagos: [{ metodo: 'efectivo', monto: 300, montoRecibido: 500 }, { metodo: 'tarjeta', monto: 228 }] }, cajero)
check('pago mixto OK → cerrada/mixto', r.status === 200 && r.data.orden.estado === 'cerrada' && r.data.orden.metodoPago === 'mixto', JSON.stringify(r.data))
check('2 pagos guardados, cambio 200', r.data.orden?.pagos.length === 2 && r.data.orden.pagos[0].cambio === 200)
r = await call('POST', `/ordenes/${o1.id}/pagar`, { pagos: [{ metodo: 'efectivo', monto: 528 }] }, cajero)
check('doble cobro → 409', r.status === 409)

console.log('\n[Orden pagada al instante (mesa)]')
r = await call('POST', '/ordenes', { tipo: 'local', items: [{ idProducto: coca.id, cantidad: 1 }], pagos: [{ metodo: 'efectivo', monto: 35, montoRecibido: 50 }] }, cajero)
check('local sin mesa → 400', r.status === 400)
r = await call('POST', '/ordenes', { tipo: 'local', mesa: '4', items: [{ idProducto: coca.id, cantidad: 1 }], pagos: [{ metodo: 'efectivo', monto: 35, montoRecibido: 50 }], descuentoPct: 0 }, cajero)
check('mesa pagada → cerrada', r.status === 201 && r.data.orden.estado === 'cerrada' && r.data.orden.mesa === '4', JSON.stringify(r.data))
const o2 = r.data.orden
r = await call('POST', '/ordenes', { tipo: 'llevar', items: [{ idProducto: coca.id, cantidad: 1 }], descuentoPct: 10 }, cocina)
check('usuario sin permiso de vender → 403', r.status === 403)
r = await call('POST', '/ordenes', { tipo: 'llevar', items: [{ idProducto: coca.id, cantidad: 2 }], descuentoPct: 10 }, cajero)
check('cajero con permiso aplica 10%: 70 - 7 = 63.00', r.status === 201 && r.data.orden.total === 63, JSON.stringify(r.data).slice(0, 150))
const o3 = r.data.orden

console.log('\n[Cancelación]')
r = await call('POST', `/ordenes/${o2.id}/cancelar`, { motivo: 'Prueba humo', categoria: 'error_cajero' }, cajero)
check('cajero sin autorización → 403', r.status === 403)
r = await call('POST', `/ordenes/${o2.id}/cancelar`, { motivo: 'Prueba humo', categoria: 'error_cajero', autoriza: { usuario: 'carlos', password: 'admin123' } }, cajero)
check('cancela con autorización de supervisor', r.status === 200 && r.data.orden.estado === 'cancelada', JSON.stringify(r.data))
r = await call('POST', `/ordenes/${o2.id}/cancelar`, { motivo: 'otra vez', autoriza: { usuario: 'carlos', password: 'admin123' } }, cajero)
check('doble cancelación → 409', r.status === 409)
r = await call('GET', '/ordenes?estado=cancelada', null, admin)
const dups = r.data.ordenes.filter(o => o.id === o2.id).length
check('sin órdenes duplicadas en la lista', dups === 1, `dups=${dups}`)

console.log('\n[Turno / dashboard]')
r = await call('POST', '/turnos/abrir', { fondoInicial: 500 }, cajero)
check('abre turno', r.status === 201 || r.status === 409)
r = await call('GET', '/turnos/corte', null, cajero)
check('corte parcial', r.status === 200 && r.data.corte.fondoInicial >= 0, JSON.stringify(r.data).slice(0, 200))
r = await call('GET', '/admin/dashboard', null, cajero)
check('cajero sin acceso a dashboard → 403', r.status === 403)
r = await call('GET', '/admin/dashboard', null, admin)
check('dashboard admin', r.status === 200 && r.data.resumen, JSON.stringify(r.data).slice(0, 200))

console.log('\n[Menú admin]')
r = await call('POST', '/productos', { nombre: 'Prueba Humo', descripcion: 'x', precio: 10, idCategoria: 3 }, admin)
check('admin crea producto', r.status === 201)
const nuevo = r.data.id
r = await call('PUT', `/productos/${nuevo}`, { precio: 12.5 }, admin)
check('admin edita precio', r.status === 200)
r = await call('DELETE', `/productos/${nuevo}`, null, admin)
check('admin desactiva producto', r.status === 200)

console.log(`\nResultado: ${pass} OK, ${fail} fallos`)
process.exit(fail ? 1 : 0)
