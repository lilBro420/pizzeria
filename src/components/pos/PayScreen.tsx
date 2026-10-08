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
  folio?: string
  mesa?: string | null
  clienteNombre?: string | null
  onConfirm: (pagos: { metodo: 'efectivo' | 'tarjeta' | 'transferencia'; monto: number; montoRecibido?: number | null }[]) => void
  onSendToWaiting?: () => void
  onBack: () => void
}

export function PayScreen({
  total,
  subtotal,
  descuento,
  impuesto,
  folio,
  mesa,
  clienteNombre,
  onConfirm,
  onSendToWaiting,
  onBack,
}: PayScreenProps) {
  const [selectedMethod, setSelectedMethod] = useState<'efectivo' | 'tarjeta' | 'transferencia'>('efectivo')
  const [inputMonto, setInputMonto] = useState('')
  const [pagos, setPagos] = useState<PagoAplicado[]>([])

  // Centavos enteros para precisión absoluta
  const totalCents = Math.round(total * 100)
  const pagadoCents = pagos.reduce((acc, p) => acc + Math.round(p.monto * 100), 0)
  const restanteCents = Math.max(0, totalCents - pagadoCents)
  const restante = restanteCents / 100

  const inputNumber = parseFloat(inputMonto) || 0
  const inputNumberCents = Math.round(inputNumber * 100)

  // En efectivo: si el cajero teclea más del restante, es el dinero recibido y da cambio
  const efectivoCambio =
    selectedMethod === 'efectivo' && inputNumberCents > restanteCents
      ? (inputNumberCents - restanteCents) / 100
      : 0

  const BILLS = [50, 100, 200, 500, 1000]

  const handleAddPayment = () => {
    if (restanteCents <= 0) return

    let montoAplicarCents = 0
    let montoRecibidoCents = 0

    if (inputNumberCents <= 0) {
      // Si no tecleó nada, aplica el monto exacto restante
      montoAplicarCents = restanteCents
      montoRecibidoCents = restanteCents
    } else if (selectedMethod === 'efectivo') {
      if (inputNumberCents >= restanteCents) {
        montoAplicarCents = restanteCents
        montoRecibidoCents = inputNumberCents
      } else {
        montoAplicarCents = inputNumberCents
        montoRecibidoCents = inputNumberCents
      }
    } else {
      // Tarjeta o transferencia: no puede ser mayor al restante
      montoAplicarCents = Math.min(inputNumberCents, restanteCents)
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
  }

  const handleFinalizar = () => {
    // Si aún falta dinero por cubrir pero hay una cifra en el teclado:
    if (restanteCents > 0) {
      let montoAplicarCents = restanteCents
      let recibidoCents = restanteCents

      if (inputNumberCents >= restanteCents) {
        montoAplicarCents = restanteCents
        recibidoCents = inputNumberCents
      } else if (inputNumberCents > 0) {
        // No cubre el total
        alert('El pago no cubre el total de la cuenta.')
        return
      }

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
        }))
      )
      return
    }

    onConfirm(
      pagos.map(p => ({
        metodo: p.metodo as any,
        monto: p.monto,
        montoRecibido: p.montoRecibido,
      }))
    )
  }

  const puedeCobrar =
    restanteCents === 0 ||
    (inputNumberCents >= restanteCents && selectedMethod === 'efectivo') ||
    inputNumberCents === restanteCents

  return (
    <div className="h-full w-full flex flex-col bg-[#D4D0C8] p-3 select-none overflow-hidden">
      {/* Title Bar */}
      <div className="bg-[#0A246A] text-white px-4 py-2 flex items-center justify-between font-bold text-base border-2 border-black swing-outset shrink-0 mb-2">
        <div className="flex items-center gap-3">
          <Button size="sm" variant="default" onClick={onBack} className="text-xs font-bold py-1">
            ← VOLVER
          </Button>
          <span className="text-lg">COBRAR CUENTA {folio ? `— ${folio}` : ''}</span>
          {mesa && <span className="bg-[#1F4E79] px-2 py-0.5 text-xs">Mesa {mesa}</span>}
          {clienteNombre && <span className="bg-[#1F4E79] px-2 py-0.5 text-xs">{clienteNombre}</span>}
        </div>

        {onSendToWaiting && (
          <Button
            size="sm"
            variant="warning"
            onClick={onSendToWaiting}
            className="text-xs font-bold py-1"
          >
            DEJAR EN ESPERA
          </Button>
        )}
      </div>

      {/* Main Grid: 3 columns */}
      <div className="flex-1 grid grid-cols-12 gap-3 min-h-0">
        {/* Left column: Resumen de cuenta */}
        <div className="col-span-4 flex flex-col gap-2 min-h-0">
          <Panel title="RESUMEN DE CUENTA" className="flex-1">
            <div className="p-3 flex flex-col h-full justify-between bg-white swing-inset">
              <div className="space-y-3">
                <div className="flex justify-between items-baseline text-sm text-gray-700">
                  <span className="font-bold">Subtotal:</span>
                  <span className="font-mono text-base font-bold">{fmt(subtotal)}</span>
                </div>

                {descuento > 0 && (
                  <div className="flex justify-between items-baseline text-sm text-red-700">
                    <span className="font-bold">Descuento aplicado:</span>
                    <span className="font-mono text-base font-bold">-{fmt(descuento)}</span>
                  </div>
                )}

                <div className="flex justify-between items-baseline text-sm text-gray-700">
                  <span className="font-bold">IVA (16% incluido):</span>
                  <span className="font-mono text-base font-bold">{fmt(impuesto)}</span>
                </div>

                <div className="pt-2 border-t-2 border-black flex justify-between items-baseline">
                  <span className="font-black text-lg text-black">TOTAL:</span>
                  <span className="font-mono text-3xl font-black text-[#0A246A]">{fmt(total)}</span>
                </div>
              </div>

              {/* Pagos ya aplicados */}
              <div className="mt-4 pt-3 border-t border-gray-300 flex-1 flex flex-col min-h-0">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 block">
                  Pagos Registrados ({pagos.length}):
                </span>
                <div className="flex-1 overflow-y-auto space-y-1.5 p-1 bg-[#ECE9D8] swing-inset">
                  {pagos.length === 0 ? (
                    <div className="text-xs text-gray-500 italic p-2 text-center">
                      No se han agregado pagos aún.
                    </div>
                  ) : (
                    pagos.map((p, idx) => (
                      <div
                        key={idx}
                        className="bg-white p-2 swing-outset-thin flex items-center justify-between text-xs font-bold"
                      >
                        <div>
                          <span className="uppercase text-[#0A246A] block">
                            {p.metodo === 'efectivo'
                              ? 'Efectivo'
                              : p.metodo === 'tarjeta'
                              ? 'Tarjeta'
                              : 'Transferencia'}
                          </span>
                          {p.metodo === 'efectivo' && p.montoRecibido && p.montoRecibido > p.monto && (
                            <span className="text-[10px] text-gray-600 block">
                              Recibió: {fmt(p.montoRecibido)} · Cambio: {fmt(p.cambio)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-black">{fmt(p.monto)}</span>
                          <button
                            type="button"
                            onClick={() => handleRemovePayment(idx)}
                            className="w-6 h-6 swing-button text-red-700 font-black text-xs"
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

              {/* Status footer */}
              <div className="mt-3 pt-2 border-t border-gray-300">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-xs font-bold text-gray-600">Restante por Cobrar:</span>
                  <span
                    className={`font-mono text-2xl font-black ${
                      restanteCents === 0 ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    {fmt(restante)}
                  </span>
                </div>

                {efectivoCambio > 0 && (
                  <div className="bg-[#E8F5E9] border border-green-600 p-2 flex justify-between items-center text-green-900 font-bold">
                    <span className="text-sm">CAMBIO A ENTREGAR:</span>
                    <span className="text-2xl font-mono font-black">{fmt(efectivoCambio)}</span>
                  </div>
                )}
              </div>
            </div>
          </Panel>
        </div>

        {/* Center column: Métodos de pago y opciones */}
        <div className="col-span-4 flex flex-col gap-2 min-h-0">
          <Panel title="MÉTODO DE PAGO" className="flex-1">
            <div className="p-3 flex flex-col h-full gap-3 bg-[#ECE9D8]">
              {/* Method tabs */}
              <div className="grid grid-cols-1 gap-2">
                {[
                  { m: 'efectivo', label: 'EFECTIVO (MXN)' },
                  { m: 'tarjeta', label: 'TARJETA BANCARIA' },
                  { m: 'transferencia', label: 'TRANSFERENCIA (SPEI)' },
                ].map(opt => (
                  <Button
                    key={opt.m}
                    size="lg"
                    variant={selectedMethod === opt.m ? 'primary' : 'default'}
                    onClick={() => {
                      setSelectedMethod(opt.m as any)
                    }}
                    className="text-base font-black py-4 justify-start px-4"
                  >
                    {selectedMethod === opt.m ? '► ' : '  '} {opt.label}
                  </Button>
                ))}
              </div>

              {/* Quick Cash Bills for Efectivo */}
              {selectedMethod === 'efectivo' && (
                <div className="mt-2">
                  <span className="text-xs font-bold text-gray-700 uppercase mb-1 block">
                    Billetes Rápidos:
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {BILLS.map(b => (
                      <Button
                        key={b}
                        size="md"
                        variant="default"
                        className="text-base font-black font-mono bg-white"
                        onClick={() => setInputMonto(String(b))}
                      >
                        ${b}
                      </Button>
                    ))}
                    <Button
                      size="md"
                      variant="default"
                      className="text-xs font-black bg-[#FFFDE7]"
                      onClick={() => setInputMonto(String(restante))}
                    >
                      EXACTO
                    </Button>
                  </div>
                </div>
              )}

              {/* Split Payment Helper */}
              <div className="mt-auto p-3 swing-inset bg-white">
                <span className="text-xs font-bold text-gray-700 block mb-1">
                  Monto a aplicar con este método:
                </span>
                <div className="text-2xl font-mono font-black text-[#0A246A] p-2 bg-[#ECE9D8] swing-inset mb-2">
                  {fmt(inputNumber > 0 ? inputNumber : restante)}
                </div>

                <Button
                  size="md"
                  variant="default"
                  onClick={handleAddPayment}
                  disabled={restanteCents <= 0}
                  className="w-full font-black text-sm"
                >
                  + AGREGAR ESTE PAGO A LA LISTA
                </Button>
              </div>
            </div>
          </Panel>
        </div>

        {/* Right column: Teclado Numérico para ingresar efectivo/monto */}
        <div className="col-span-4 flex flex-col gap-2 min-h-0">
          <Panel title="TECLADO NUMÉRICO (MONTO RECIBIDO)" className="flex-1">
            <div className="p-3 flex flex-col h-full justify-between bg-white swing-inset">
              <div className="mb-2">
                <div className="text-xs font-bold text-gray-600 uppercase mb-1">Teclea el monto recibido:</div>
                <div className="h-14 px-3 flex items-center justify-end text-3xl font-mono font-black bg-[#ECE9D8] swing-inset text-black">
                  {inputMonto ? `$${inputMonto}` : '$0.00'}
                </div>
              </div>

              <div className="flex-1 flex flex-col justify-center">
                <NumPad
                  value={inputMonto}
                  onChange={setInputMonto}
                  allowDecimal={true}
                  onEnter={handleFinalizar}
                  enterLabel="COBRAR AHORA"
                />
              </div>

              <div className="pt-3 border-t border-[#808080]">
                <Button
                  size="lg"
                  variant="success"
                  disabled={!puedeCobrar}
                  onClick={handleFinalizar}
                  className="w-full text-xl font-black py-4 tracking-wider"
                >
                  CONFIRMAR Y FINALIZAR
                </Button>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
