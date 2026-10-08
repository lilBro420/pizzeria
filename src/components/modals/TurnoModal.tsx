import React, { useEffect, useState } from 'react'
import { ResumenTurno, UsuarioActual } from '../../types'
import { api } from '../../services/api'
import { fmt, formatFecha } from '../../utils/formatters'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { NumPad } from '../ui/NumPad'

interface TurnoModalProps {
  usuario: UsuarioActual
  onClose: () => void
  onShiftClosed?: () => void
}

export function TurnoModal({ usuario, onClose, onShiftClosed }: TurnoModalProps) {
  const [turno, setTurno] = useState<ResumenTurno | null>(null)
  const [loading, setLoading] = useState(true)
  const [fondoInicial, setFondoInicial] = useState('500')
  const [efectivoContado, setEfectivoContado] = useState('')
  const [notas, setNotas] = useState('')
  const [mode, setMode] = useState<'view' | 'close'>('view')
  const [error, setError] = useState<string | null>(null)

  const loadTurno = async () => {
    try {
      setLoading(true)
      const data = await api.getTurnoActual()
      setTurno(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTurno()
  }, [])

  const handleAbrir = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.abrirTurno(parseFloat(fondoInicial) || 0)
      setTurno(res)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCerrar = async () => {
    if (!efectivoContado) {
      setError('Introduce el efectivo contado en caja')
      return
    }
    try {
      setLoading(true)
      setError(null)
      await api.cerrarTurno({
        efectivoContado: parseFloat(efectivoContado) || 0,
        notas: notas.trim() || null,
      })
      alert('Turno cerrado correctamente.')
      if (onShiftClosed) onShiftClosed()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog title="CONTROL DE TURNO Y CORTE DE CAJA" isOpen={true} onClose={onClose} maxWidth="max-w-2xl">
      <div className="flex flex-col gap-3 select-none">
        {error && (
          <div className="bg-[#FFEBEE] border border-[#D32F2F] text-[#B71C1C] p-2 text-xs font-bold swing-inset">
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center font-bold text-gray-600">Cargando información del turno...</div>
        ) : !turno ? (
          /* Shift not opened yet */
          <div className="swing-inset bg-white p-4 flex flex-col gap-4">
            <div>
              <span className="text-base font-black text-[#0A246A] block mb-1">
                NO HAY TURNO ABIERTO ACTUALMENTE
              </span>
              <p className="text-xs text-gray-600">
                Para comenzar a cobrar y tomar pedidos con el usuario <b>{usuario.nombre}</b>, debes registrar el
                fondo de apertura de caja.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Fondo Inicial de Caja ($ MXN):
                </label>
                <input
                  type="text"
                  value={fondoInicial}
                  onChange={e => setFondoInicial(e.target.value)}
                  className="w-full h-12 px-3 text-2xl font-mono font-bold bg-[#ECE9D8] swing-inset outline-none text-black"
                />

                <div className="mt-2 grid grid-cols-3 gap-1">
                  {[200, 500, 1000].map(amt => (
                    <Button
                      key={amt}
                      size="sm"
                      variant="default"
                      onClick={() => setFondoInicial(String(amt))}
                      className="text-xs font-bold"
                    >
                      ${amt}
                    </Button>
                  ))}
                </div>

                <div className="mt-4">
                  <Button
                    size="lg"
                    variant="success"
                    onClick={handleAbrir}
                    className="w-full text-base font-black tracking-wider py-3"
                  >
                    ABRIR TURNO AHORA
                  </Button>
                </div>
              </div>

              <div>
                <NumPad value={fondoInicial} onChange={setFondoInicial} allowDecimal={false} />
              </div>
            </div>
          </div>
        ) : mode === 'view' ? (
          /* Active shift dashboard */
          <div className="flex flex-col gap-3">
            <div className="swing-inset bg-white p-3 grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-gray-500 block">Turno ID:</span>
                <span className="font-mono font-bold text-black">#{turno.id}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Apertura:</span>
                <span className="font-bold text-black">{formatFecha(turno.apertura)}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Fondo Inicial:</span>
                <span className="font-mono font-black text-black">{fmt(turno.fondoInicial)}</span>
              </div>
            </div>

            {/* Sales by method breakdown */}
            <div className="swing-inset bg-white p-3">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">
                Ventas de este Turno:
              </span>
              <div className="space-y-1.5">
                {turno.ventasPorMetodo.map(m => (
                  <div key={m.metodo} className="flex justify-between items-baseline text-xs pb-1 border-b border-gray-100">
                    <span className="font-bold uppercase text-gray-700">
                      {m.metodo} ({m.pagos} {m.pagos === 1 ? 'pago' : 'pagos'})
                    </span>
                    <span className="font-mono font-black text-sm text-black">{fmt(m.total)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-baseline pt-1">
                  <span className="font-black text-sm text-black">TOTAL VENTAS COBRADAS:</span>
                  <span className="font-mono text-xl font-black text-[#0A246A]">
                    {fmt(turno.totalVentas)}
                  </span>
                </div>
              </div>
            </div>

            {/* Expected cash in drawer */}
            <div className="swing-inset bg-[#E8F5E9] border border-green-700 p-3 flex justify-between items-center text-green-900 font-bold">
              <div>
                <span className="text-sm block">EFECTIVO ESPERADO EN CAJA:</span>
                <span className="text-[11px] text-green-800 font-normal">
                  (Fondo Inicial + Ventas en Efectivo)
                </span>
              </div>
              <span className="text-3xl font-mono font-black">{fmt(turno.efectivoEsperado)}</span>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-[#808080]">
              <Button size="md" variant="default" onClick={onClose} className="px-6 font-bold">
                VOLVER
              </Button>

              <div className="flex gap-2">
                <Button
                  size="md"
                  variant="primary"
                  onClick={() => alert(`Corte Parcial impreso en ticket:\nVentas: ${fmt(turno.totalVentas)}\nEfectivo esperado: ${fmt(turno.efectivoEsperado)}`)}
                  className="font-black"
                >
                  CORTE PARCIAL (X)
                </Button>

                <Button
                  size="md"
                  variant="danger"
                  onClick={() => setMode('close')}
                  className="font-black px-6"
                >
                  CERRAR TURNO (Z)
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Close shift form */
          <div className="swing-inset bg-white p-3 flex flex-col gap-3">
            <div className="bg-[#FFEBEE] p-2 text-xs font-bold text-[#B71C1C]">
              ARQUEO DE CAJA: Cuenta el dinero físico que hay en el cajón e ingrésalo abajo.
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Efectivo Contado en Caja ($):
                </label>
                <input
                  type="text"
                  value={efectivoContado}
                  onChange={e => setEfectivoContado(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-12 px-3 text-2xl font-mono font-bold bg-[#ECE9D8] swing-inset outline-none text-black mb-2"
                />

                {efectivoContado && (
                  <div className="p-2 text-xs font-bold border swing-inset mb-2">
                    {parseFloat(efectivoContado) >= turno.efectivoEsperado ? (
                      <span className="text-green-800">
                        Sobrante: {fmt(parseFloat(efectivoContado) - turno.efectivoEsperado)}
                      </span>
                    ) : (
                      <span className="text-red-800">
                        Faltante: {fmt(turno.efectivoEsperado - parseFloat(efectivoContado))}
                      </span>
                    )}
                  </div>
                )}

                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Notas / Observaciones del Cierre:
                </label>
                <input
                  type="text"
                  value={notas}
                  onChange={e => setNotas(e.target.value)}
                  placeholder="Opcional..."
                  className="w-full h-10 px-2 text-xs bg-[#ECE9D8] swing-inset outline-none font-bold"
                />

                <div className="flex gap-2 mt-4">
                  <Button size="md" variant="default" onClick={() => setMode('view')}>
                    REGRESAR
                  </Button>
                  <Button
                    size="md"
                    variant="danger"
                    onClick={handleCerrar}
                    className="flex-1 font-black text-base"
                  >
                    CONFIRMAR CIERRE (Z)
                  </Button>
                </div>
              </div>

              <div>
                <NumPad value={efectivoContado} onChange={setEfectivoContado} allowDecimal={true} />
              </div>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  )
}
