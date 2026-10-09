import React, { useEffect, useState } from 'react'
import { ResumenTurno, UsuarioActual } from '../../types'
import { api } from '../../services/api'
import { fmt, formatFecha } from '../../utils/formatters'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { AlertIcon, CheckIcon } from '../ui/Icons'
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
      alert('Turno cerrado correctamente y arqueo guardado.')
      if (onShiftClosed) onShiftClosed()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog title="CONTROL DE TURNO Y CAJA" isOpen={true} onClose={onClose} maxWidth="max-w-2xl">
      <div className="flex flex-col gap-3 select-none">
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
            <AlertIcon className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center font-bold text-slate-500">Cargando información del turno...</div>
        ) : !turno ? (
          /* Shift not opened yet */
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-4 shadow-sm">
            <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-amber-900">
              <span className="text-base font-black flex items-center gap-2 mb-1">
                <AlertIcon className="w-5 h-5 text-amber-600 shrink-0" />
                <span>NO HAY TURNO ABIERTO ACTUALMENTE</span>
              </span>
              <p className="text-xs text-amber-800">
                Para comenzar a cobrar y procesar pedidos en caja con el usuario <b>{usuario.nombre}</b>, debes ingresar el fondo inicial de efectivo.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  Fondo Inicial de Caja ($ MXN):
                </label>
                <input
                  type="text"
                  value={fondoInicial}
                  onChange={e => setFondoInicial(e.target.value)}
                  className="w-full h-12 px-3.5 text-2xl font-mono font-black bg-slate-50 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />

                <div className="mt-2.5 grid grid-cols-3 gap-2">
                  {[200, 500, 1000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setFondoInicial(String(amt))}
                      className="py-2 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-xs text-slate-700 border border-slate-200 active:scale-95 transition-all"
                    >
                      ${amt}
                    </button>
                  ))}
                </div>

                <div className="mt-5">
                  <button
                    type="button"
                    onClick={handleAbrir}
                    className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base shadow-md shadow-emerald-500/20 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <CheckIcon className="w-5 h-5 stroke-[3]" />
                    <span>ABRIR TURNO AHORA</span>
                  </button>
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
            <div className="bg-white rounded-xl border border-slate-200 p-4 grid grid-cols-3 gap-2 text-xs shadow-sm">
              <div>
                <span className="text-slate-400 font-semibold block">Turno ID:</span>
                <span className="font-mono font-black text-sm text-slate-900">#{turno.id}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Apertura:</span>
                <span className="font-bold text-slate-900">{formatFecha(turno.apertura)}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Fondo Inicial:</span>
                <span className="font-mono font-black text-sm text-emerald-600">{fmt(turno.fondoInicial)}</span>
              </div>
            </div>

            {/* Sales by method breakdown */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-2.5">
                Ventas de este Turno:
              </span>
              <div className="space-y-2">
                {turno.ventasPorMetodo.map(m => (
                  <div key={m.metodo} className="flex justify-between items-baseline text-xs pb-1.5 border-b border-slate-100">
                    <span className="font-bold uppercase text-slate-600">
                      {m.metodo} ({m.pagos} {m.pagos === 1 ? 'pago' : 'pagos'})
                    </span>
                    <span className="font-mono font-black text-sm text-slate-900">{fmt(m.total)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-baseline pt-2">
                  <span className="font-black text-sm text-slate-900">TOTAL VENTAS COBRADAS:</span>
                  <span className="font-mono text-xl font-black text-blue-700">
                    {fmt(turno.totalVentas)}
                  </span>
                </div>
              </div>
            </div>

            {/* Shift expected balance */}
            <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 flex justify-between items-center text-emerald-950 shadow-sm">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wide block text-emerald-700">
                  Efectivo Esperado en Caja:
                </span>
                <span className="text-[11px] text-emerald-800">
                  Fondo ({fmt(turno.fondoInicial)}) + Ventas en efectivo
                </span>
              </div>
              <span className="text-3xl font-mono font-black text-emerald-700">
                {fmt(turno.efectivoEsperado)}
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex justify-between items-center pt-2">
              <Button size="md" variant="default" onClick={onClose}>
                CERRAR VENTANA
              </Button>
              <div className="flex gap-2">
                <Button
                  size="md"
                  variant="primary"
                  onClick={() => alert(`Corte Parcial (X):\nTotal Ventas: ${fmt(turno.totalVentas)}\nEfectivo Esperado: ${fmt(turno.efectivoEsperado)}`)}
                >
                  IMPRIMIR CORTE X
                </Button>
                <Button
                  size="md"
                  variant="danger"
                  onClick={() => setMode('close')}
                >
                  CERRAR TURNO (CORTE Z)
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Closing shift / Arqueo screen */
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-4 shadow-sm">
            <span className="text-base font-black text-slate-900 block">
              ARQUEO DE CAJA Y CIERRE FINAL (CORTE Z)
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                    Efectivo Contado en Caja ($ MXN):
                  </label>
                  <input
                    type="text"
                    value={efectivoContado}
                    onChange={e => setEfectivoContado(e.target.value)}
                    placeholder="Monto real en el cajón"
                    className="w-full h-12 px-3.5 text-2xl font-mono font-black bg-slate-50 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  />
                </div>

                {efectivoContado && (
                  <div className="p-3 rounded-xl bg-slate-100 text-xs font-bold flex justify-between items-center">
                    <span>Diferencia de caja:</span>
                    <span
                      className={`font-mono text-base font-black ${
                        parseFloat(efectivoContado) >= turno.efectivoEsperado
                          ? 'text-emerald-600'
                          : 'text-rose-600'
                      }`}
                    >
                      {fmt(parseFloat(efectivoContado) - turno.efectivoEsperado)}
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Notas u observaciones:
                  </label>
                  <input
                    type="text"
                    value={notas}
                    onChange={e => setNotas(e.target.value)}
                    placeholder="Ej. Sobraron 2 pesos, billete falso retenido..."
                    className="w-full h-11 px-3 text-sm bg-slate-50 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  />
                </div>

                <div className="flex gap-2 mt-2">
                  <Button size="md" variant="default" onClick={() => setMode('view')}>
                    CANCELAR
                  </Button>
                  <Button size="md" variant="danger" onClick={handleCerrar} className="flex-1">
                    CONFIRMAR Y CERRAR TURNO
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
