import React, { useState } from 'react'
import { MetodoPago, PagoAplicado } from '../../types'
import { fmt } from '../../utils/formatters'
import { Button } from '../ui/Button'
import { NumPad } from '../ui/NumPad'
import { Panel } from '../ui/Panel'

interface PayScreenProps {
  total: number
  subtotal: number
  descuento: number
  impuesto: number
  descuentoPctInitial?: number
  ivaTasa?: number
  ivaIncluido?: boolean
  folio?: string
  mesa?: string | null
  clienteNombre?: string | null
  onConfirm: (
    pagos: {
      metodo: 'efectivo' | 'dolares' | 'tarjeta' | 'transferencia'
      monto: number
      montoRecibido?: number | null
    }[],
    nuevoDescuentoPct?: number
  ) => void
  onSendToWaiting?: () => void
  onBack: () => void
}

export function PayScreen({
  total: initialTotal,
  subtotal: initialSubtotal,
  descuento: initialDescuento,
  impuesto: initialImpuesto,
  descuentoPctInitial = 0,
  ivaTasa = 0.16,
  ivaIncluido = true,
  folio,
  mesa,
  clienteNombre,
  onConfirm,
  onSendToWaiting,
  onBack,
}: PayScreenProps) {
  const [selectedMethod, setSelectedMethod] = useState<'efectivo' | 'dolares' | 'tarjeta' | 'transferencia'>('efectivo')
  const [inputMonto, setInputMonto] = useState('')
  const [pagos, setPagos] = useState<PagoAplicado[]>([])
  const [descuentoPct, setDescuentoPct] = useState(descuentoPctInitial)
  const [showDiscountModal, setShowDiscountModal] = useState(false)

  // Tipo de cambio USD a MXN (fijo o configurable)
  const TIPO_CAMBIO_USD = 18.0

  // Cálculo en vivo de totales considerando si se cambió el descuento en esta pantalla
  const bruto = initialSubtotal + (descuentoPctInitial > 0 ? initialDescuento : 0)
  const descMonto = Math.round((bruto * descuentoPct) / 100 * 100) / 100
  const neto = Math.max(0, bruto - descMonto)
  const total = neto
  const subtotal = ivaIncluido ? Math.round((neto / (1 + ivaTasa)) * 100) / 100 : neto
  const impuesto = Math.round((total - subtotal) * 100) / 100

  // Centavos enteros para precisión absoluta
  const totalCents = Math.round(total * 100)
  const pagadoCents = pagos.reduce((acc, p) => acc + Math.round(p.monto * 100), 0)
  const restanteCents = Math.max(0, totalCents - pagadoCents)
  const restante = restanteCents / 100

  const inputNumber = parseFloat(inputMonto) || 0

  // Si paga en dólares, convertir el input a pesos MXN
  const inputEnMXN = selectedMethod === 'dolares' ? inputNumber * TIPO_CAMBIO_USD : inputNumber
  const inputEnMXNCents = Math.round(inputEnMXN * 100)

  // Cambio permanente guardado en estado (para que NUNCA desaparezca de la vista)
  const [cambioPermanente, setCambioPermanente] = useState<number | null>(null)

  // Cambio en tiempo real si el cajero está tecleando
  const efectivoCambioEnVivo =
    (selectedMethod === 'efectivo' || selectedMethod === 'dolares') && inputEnMXNCents > restanteCents
      ? (inputEnMXNCents - restanteCents) / 100
      : null

  // Cambio visible definitivo (el de en vivo o el permanente guardado)
  const cambioMostrar = efectivoCambioEnVivo ?? cambioPermanente ?? 0

  const BILLS_MXN = [50, 100, 200, 500, 1000]
  const BILLS_USD = [5, 10, 20, 50, 100]

  // Botón "ACEPTAR" del teclado numérico
  const handleAceptarMonto = () => {
    if (restanteCents <= 0 && pagos.length > 0) return

    let montoAplicarCents = 0
    let montoRecibidoCents = 0

    if (inputEnMXNCents <= 0) {
      // Si no tecleó número, aplica el restante exacto
      montoAplicarCents = restanteCents
      montoRecibidoCents = restanteCents
    } else if (selectedMethod === 'efectivo' || selectedMethod === 'dolares') {
      if (inputEnMXNCents >= restanteCents) {
        montoAplicarCents = restanteCents
        montoRecibidoCents = inputEnMXNCents
        const cambioCalculado = (inputEnMXNCents - restanteCents) / 100
        setCambioPermanente(cambioCalculado)
      } else {
        montoAplicarCents = inputEnMXNCents
        montoRecibidoCents = inputEnMXNCents
      }
    } else {
      // Tarjeta o transferencia
      montoAplicarCents = Math.min(inputEnMXNCents, restanteCents)
      montoRecibidoCents = montoAplicarCents
    }

    const nuevoPago: PagoAplicado = {
      metodo: selectedMethod,
      monto: montoAplicarCents / 100,
      montoRecibido: montoRecibidoCents / 100,
      cambio: (montoRecibidoCents - montoAplicarCents) / 100,
    }

    setPagos([...pagos, nuevoPago])
    setInputMonto('')
  }

  const handleRemovePayment = (index: number) => {
    setPagos(pagos.filter((_, idx) => idx !== index))
    setCambioPermanente(null)
  }

  // Botón "PAGAR CUENTA"
  const handlePagarCuenta = () => {
    // Si aún falta dinero pero hay un número ingresado en el teclado:
    if (restanteCents > 0) {
      if (inputEnMXNCents >= restanteCents) {
        // Aplica el pago pendiente automáticamente
        const montoAplicarCents = restanteCents
        const recibidoCents = inputEnMXNCents
        const lista = [
          ...pagos,
          {
            metodo: selectedMethod,
            monto: montoAplicarCents / 100,
            montoRecibido: recibidoCents / 100,
            cambio: (recibidoCents - montoAplicarCents) / 100,
          },
        ]
        onConfirm(
          lista.map(p => ({
            metodo: p.metodo as any,
            monto: p.monto,
            montoRecibido: p.montoRecibido,
          })),
          descuentoPct
        )
        return
      }

      alert('El monto ingresado no cubre el total de la cuenta.')
      return
    }

    if (pagos.length === 0) {
      alert('Introduce el monto recibido y presiona Aceptar.')
      return
    }

    onConfirm(
      pagos.map(p => ({
        metodo: p.metodo as any,
        monto: p.monto,
        montoRecibido: p.montoRecibido,
      })),
      descuentoPct
    )
  }

  const cuentaCubierta =
    restanteCents === 0 ||
    ((selectedMethod === 'efectivo' || selectedMethod === 'dolares') && inputEnMXNCents >= restanteCents) ||
    inputEnMXNCents === restanteCents

  return (
    <div className="h-full w-full flex flex-col bg-slate-100 p-2 sm:p-4 select-none overflow-hidden">
      {/* Title Bar */}
      <div className="bg-slate-900 text-white px-4 py-3 rounded-xl flex items-center justify-between font-bold text-base shadow-sm shrink-0 mb-3 border border-slate-800">
        <div className="flex items-center gap-3">
          <Button size="sm" variant="default" onClick={onBack} className="text-xs font-black py-1 px-3">
            ← VOLVER AL PEDIDO
          </Button>
          <span className="text-base sm:text-lg font-black tracking-tight">
            COBRAR CUENTA {folio ? `— ${folio}` : ''}
          </span>
          {mesa && (
            <span className="bg-blue-600 text-white px-2.5 py-0.5 rounded-full text-xs font-black">
              Mesa {mesa}
            </span>
          )}
          {clienteNombre && (
            <span className="bg-slate-700 text-white px-2.5 py-0.5 rounded-full text-xs font-bold">
              {clienteNombre}
            </span>
          )}
        </div>

        {onSendToWaiting && (
          <Button
            size="sm"
            variant="warning"
            onClick={onSendToWaiting}
            className="text-xs font-black py-1.5 px-3 shadow-sm"
          >
            ENVIAR A ESPERA
          </Button>
        )}
      </div>

      {/* Main Grid: Responsive 3 columns on tablet/desktop, stacked on mobile */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0 overflow-y-auto lg:overflow-hidden">
        {/* Left column: Resumen de cuenta & Cambio permanente */}
        <div className="lg:col-span-4 flex flex-col gap-3 min-h-0">
          <Panel title="RESUMEN DE CUENTA" className="flex-1">
            <div className="p-4 flex flex-col h-full justify-between bg-white">
              <div className="space-y-2.5">
                <div className="flex justify-between items-baseline text-sm text-slate-600">
                  <span className="font-bold">Subtotal:</span>
                  <span className="font-mono text-base font-bold text-slate-800">{fmt(subtotal)}</span>
                </div>

                {descMonto > 0 && (
                  <div className="flex justify-between items-baseline text-sm text-rose-600 font-bold">
                    <span>Descuento aplicado ({descuentoPct}%):</span>
                    <span className="font-mono text-base">-{fmt(descMonto)}</span>
                  </div>
                )}

                <div className="flex justify-between items-baseline text-sm text-slate-600">
                  <span className="font-bold">IVA (16% incluido):</span>
                  <span className="font-mono text-base font-bold text-slate-800">{fmt(impuesto)}</span>
                </div>

                {/* Botón de Descuento (Pedido por el usuario: vive en Cobrar Cuenta) */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDiscountModal(true)}
                    className="w-full py-2 px-3 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-black flex items-center justify-between active:scale-98 transition-all"
                  >
                    <span>🏷️ DESCUENTO DE LA ORDEN:</span>
                    <span className="text-blue-700 font-black">
                      {descuentoPct > 0 ? `${descuentoPct}% (Modificar)` : '+ Agregar descuento'}
                    </span>
                  </button>
                </div>

                <div className="pt-3 border-t-2 border-slate-900 flex justify-between items-baseline">
                  <span className="font-black text-base text-slate-900">TOTAL A COBRAR:</span>
                  <span className="font-mono text-3xl font-black text-blue-700">{fmt(total)}</span>
                </div>
              </div>

              {/* Pagos ya aplicados */}
              <div className="mt-4 pt-3 border-t border-slate-200 flex-1 flex flex-col min-h-0">
                <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Pagos Registrados ({pagos.length}):
                </span>
                <div className="flex-1 overflow-y-auto space-y-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
                  {pagos.length === 0 ? (
                    <div className="text-xs text-slate-400 italic p-3 text-center">
                      Teclea el monto recibido y pulsa Aceptar.
                    </div>
                  ) : (
                    pagos.map((p, idx) => (
                      <div
                        key={idx}
                        className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between text-xs font-bold shadow-2xs"
                      >
                        <div>
                          <span className="uppercase text-blue-800 font-black block">
                            {p.metodo === 'efectivo'
                              ? 'Efectivo (MXN)'
                              : p.metodo === 'dolares'
                              ? 'Dólares (USD)'
                              : p.metodo === 'tarjeta'
                              ? 'Tarjeta Bancaria'
                              : 'Transferencia'}
                          </span>
                          {p.montoRecibido && p.montoRecibido > p.monto && (
                            <span className="text-[11px] text-slate-500 block">
                              Recibió: {fmt(p.montoRecibido)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-slate-900 font-black">{fmt(p.monto)}</span>
                          <button
                            type="button"
                            onClick={() => handleRemovePayment(idx)}
                            className="w-6 h-6 rounded-md bg-rose-50 text-rose-600 hover:bg-rose-100 font-black text-xs flex items-center justify-center transition-colors"
                            title="Quitar pago"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Status footer: Restante & CAMBIO PERMANENTE DESTACADO */}
              <div className="mt-3 pt-3 border-t border-slate-200 flex flex-col gap-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-bold text-slate-500 uppercase">Restante por Cobrar:</span>
                  <span
                    className={`font-mono text-2xl font-black ${
                      restanteCents === 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {fmt(restante)}
                  </span>
                </div>

                {/* ¡EL CAMBIO NUNCA SE QUITA DE LA VISTA! Banner permanente destacado */}
                <div
                  className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                    cambioMostrar > 0
                      ? 'bg-emerald-500 text-white border-emerald-600 shadow-md shadow-emerald-500/25 animate-pulse'
                      : 'bg-slate-100 text-slate-400 border-slate-200'
                  }`}
                >
                  <span className="text-[11px] font-black uppercase tracking-wider opacity-90">
                    Cambio a Devolver al Cliente:
                  </span>
                  <span className="text-3xl font-mono font-black tracking-tight">
                    {cambioMostrar > 0 ? fmt(cambioMostrar) : '$0.00'}
                  </span>
                </div>
              </div>
            </div>
          </Panel>
        </div>

        {/* Center column: Métodos de pago (con DÓLARES abajo de Efectivo) */}
        <div className="lg:col-span-4 flex flex-col gap-3 min-h-0">
          <Panel title="MÉTODO DE PAGO" className="flex-1">
            <div className="p-4 flex flex-col h-full gap-3.5 bg-slate-50">
              {/* Method tabs: EFECTIVO, DOLARES, TARJETA, TRANSFERENCIA */}
              <div className="grid grid-cols-1 gap-2">
                {[
                  { m: 'efectivo', label: '💵 EFECTIVO (MXN)', sub: 'Pesos Mexicanos' },
                  {
                    m: 'dolares',
                    label: '💵 DÓLARES (USD)',
                    sub: `Tipo de cambio: $${TIPO_CAMBIO_USD.toFixed(2)} MXN`,
                  },
                  { m: 'tarjeta', label: '💳 TARJETA BANCARIA', sub: 'Terminal / TPV' },
                  { m: 'transferencia', label: '📱 TRANSFERENCIA', sub: 'SPEI / Depósito' },
                ].map(opt => {
                  const isSel = selectedMethod === opt.m
                  return (
                    <button
                      key={opt.m}
                      type="button"
                      onClick={() => {
                        setSelectedMethod(opt.m as any)
                        setInputMonto('')
                      }}
                      className={`p-3.5 rounded-xl border-2 flex items-center justify-between transition-all active:scale-98 ${
                        isSel
                          ? 'bg-blue-600 text-white border-blue-700 shadow-md shadow-blue-500/20 ring-2 ring-blue-400'
                          : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-left">
                        <span className="text-base font-black tracking-tight block">{opt.label}</span>
                        <span
                          className={`text-xs mt-0.5 block ${
                            isSel ? 'text-blue-100' : 'text-slate-500'
                          }`}
                        >
                          {opt.sub}
                        </span>
                      </div>
                      {isSel && (
                        <span className="bg-white text-blue-600 text-xs font-black w-6 h-6 rounded-full flex items-center justify-center">
                          ✓
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Quick Cash Bills for Efectivo MXN */}
              {selectedMethod === 'efectivo' && (
                <div className="mt-1">
                  <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5 block">
                    Billetes Rápidos en Efectivo (MXN):
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {BILLS_MXN.map(b => (
                      <button
                        key={b}
                        type="button"
                        className="h-12 rounded-xl bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 font-mono text-base font-black shadow-2xs active:scale-95 transition-all"
                        onClick={() => setInputMonto(String(b))}
                      >
                        ${b}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="h-12 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono text-xs font-black shadow-2xs active:scale-95 transition-all"
                      onClick={() => setInputMonto(String(restante))}
                    >
                      EXACTO
                    </button>
                  </div>
                </div>
              )}

              {/* Quick Cash Bills for Dólares USD */}
              {selectedMethod === 'dolares' && (
                <div className="mt-1">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 mb-2 text-amber-900 text-xs">
                    <span className="font-black block">Pago en Dólares Americanos</span>
                    <span>1 USD = ${TIPO_CAMBIO_USD.toFixed(2)} MXN. El cambio se entrega en pesos.</span>
                  </div>
                  <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5 block">
                    Billetes Rápidos (USD):
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {BILLS_USD.map(b => (
                      <button
                        key={b}
                        type="button"
                        className="h-12 rounded-xl bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 font-mono text-base font-black shadow-2xs active:scale-95 transition-all"
                        onClick={() => setInputMonto(String(b))}
                      >
                        ${b} USD
                      </button>
                    ))}
                    <button
                      type="button"
                      className="h-12 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono text-xs font-black shadow-2xs active:scale-95 transition-all"
                      onClick={() => {
                        const usdExact = Math.ceil((restante / TIPO_CAMBIO_USD) * 100) / 100
                        setInputMonto(String(usdExact))
                      }}
                    >
                      EXACTO USD
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Panel>
        </div>

        {/* Right column: Teclado Numérico con botón ACEPTAR y Botón PAGAR CUENTA */}
        <div className="lg:col-span-4 flex flex-col gap-3 min-h-0">
          <Panel title="IMPORTE RECIBIDO" className="flex-1">
            <div className="p-4 flex flex-col h-full justify-between bg-white">
              {/* Display de monto recibido */}
              <div className="mb-2">
                <div className="text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-1 flex justify-between">
                  <span>Monto recibido del cliente:</span>
                  {selectedMethod === 'dolares' && inputNumber > 0 && (
                    <span className="text-emerald-700 font-black">
                      ≈ ${inputEnMXN.toFixed(2)} MXN
                    </span>
                  )}
                </div>
                <div className="h-14 px-4 rounded-xl flex items-center justify-end text-3xl font-mono font-black bg-slate-100 border border-slate-300 text-slate-900 shadow-inner">
                  {inputMonto
                    ? selectedMethod === 'dolares'
                      ? `$${inputMonto} USD`
                      : `$${inputMonto}`
                    : '$0.00'}
                </div>
              </div>

              {/* Teclado numérico táctil */}
              <div className="flex-1 flex flex-col justify-center my-1">
                <NumPad
                  value={inputMonto}
                  onChange={setInputMonto}
                  allowDecimal={true}
                  onEnter={handleAceptarMonto}
                  enterLabel="ACEPTAR MONTO"
                />
              </div>

              {/* Botón único principal: PAGAR CUENTA */}
              <div className="pt-3 border-t border-slate-200">
                <button
                  type="button"
                  disabled={!cuentaCubierta && pagos.length === 0}
                  onClick={handlePagarCuenta}
                  className={`w-full py-4 px-6 rounded-xl font-black text-xl tracking-wider text-white shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2 ${
                    cuentaCubierta || pagos.length > 0
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30 cursor-pointer'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                  }`}
                >
                  <span>✓</span>
                  <span>PAGAR CUENTA</span>
                </button>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      {/* Modal para Aplicar Descuento desde Cobro */}
      {showDiscountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-200">
            <span className="text-base font-black text-slate-900 block mb-1">
              APLICAR DESCUENTO
            </span>
            <span className="text-xs text-slate-500 block mb-4">
              Selecciona el porcentaje de descuento sobre la orden
            </span>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {[0, 5, 10, 15, 20, 50].map(pct => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => {
                    setDescuentoPct(pct)
                    setShowDiscountModal(false)
                  }}
                  className={`py-3 rounded-xl font-black text-sm transition-all border ${
                    descuentoPct === pct
                      ? 'bg-blue-600 text-white border-blue-700 ring-2 ring-blue-400'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                  }`}
                >
                  {pct === 0 ? 'Sin desc.' : `${pct}%`}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                size="md"
                variant="default"
                className="flex-1"
                onClick={() => setShowDiscountModal(false)}
              >
                CERRAR
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
