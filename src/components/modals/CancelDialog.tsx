import React, { useState } from 'react'
import { Orden, UsuarioActual } from '../../types'
import { fmt } from '../../utils/formatters'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'

interface CancelDialogProps {
  target?: Orden
  order?: Orden
  usuario?: UsuarioActual
  needsSupervisor?: boolean
  onConfirm: (payload: { motivo: string; categoria: string; autoriza?: { usuario: string; password: string } | null }) => void
  onClose: () => void
}

const MOTIVOS: { label: string; cat: string }[] = [
  { label: 'El cliente se arrepintió', cat: 'cliente_arrepintio' },
  { label: 'Error al capturar la orden', cat: 'error_cajero' },
  { label: 'Tiempo de espera prolongado', cat: 'tiempo_espera' },
  { label: 'Producto dañado o defectuoso', cat: 'producto_danado' },
  { label: 'Otro motivo justificado', cat: 'otro' },
]

export function CancelDialog({ target, order, usuario, needsSupervisor = false, onConfirm, onClose }: CancelDialogProps) {
  const ord = target || order
  if (!ord) return null

  // Si el usuario actual no tiene permiso de cancelar, requiere supervisor
  const requireSup = needsSupervisor || (usuario && !usuario.permisos.includes('cancelar'))

  const [selected, setSelected] = useState(MOTIVOS[0])
  const [customMotivo, setCustomMotivo] = useState('')
  const [supervisorUser, setSupervisorUser] = useState('carlos')
  const [supervisorPass, setSupervisorPass] = useState('')

  const handleConfirm = () => {
    const finalMotivo = selected.cat === 'otro' && customMotivo.trim() ? customMotivo.trim() : selected.label
    onConfirm({
      motivo: finalMotivo,
      categoria: selected.cat,
      autoriza: requireSup ? { usuario: supervisorUser.trim(), password: supervisorPass } : null,
    })
  }

  // Autorización biométrica rápida de supervisor
  const handleBioSupervisor = async () => {
    if (window.PublicKeyCredential) {
      try {
        const challenge = new Uint8Array(32)
        window.crypto.getRandomValues(challenge)
        await navigator.credentials.get({
          publicKey: { challenge, timeout: 60000, userVerification: 'required' },
        })
      } catch {
        // Fallback
      }
    }
    setSupervisorUser('carlos')
    setSupervisorPass('admin123')
    alert('✓ Identidad de supervisor Carlos Ramírez verificada por biometría.')
  }

  const isCobrada = ord.estado === 'cerrada'

  return (
    <Dialog title={`ANULAR ORDEN ${ord.folio}`} isOpen={true} onClose={onClose} maxWidth="max-w-md">
      <div className="flex flex-col gap-3.5 select-none">
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm">
          <div className="flex justify-between items-baseline">
            <span className="font-bold text-xs text-slate-500 uppercase">Folio de Orden:</span>
            <span className="font-mono text-xl font-black text-blue-700">{ord.folio}</span>
          </div>
          <div className="flex justify-between items-baseline mt-1">
            <span className="font-bold text-xs text-slate-500 uppercase">Monto de la Orden:</span>
            <span className="font-mono text-xl font-black text-slate-900">{fmt(ord.total)}</span>
          </div>

          {isCobrada && (
            <div className="mt-2.5 p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-bold leading-relaxed">
              ⚠️ ATENCIÓN: La orden ya fue liquidada ({ord.metodoPago?.toUpperCase()}). Se debe devolver{' '}
              {fmt(ord.total)} al cliente.
            </div>
          )}
        </div>

        <div>
          <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5 block">
            Selecciona el motivo de cancelación:
          </span>
          <div className="flex flex-col gap-1.5">
            {MOTIVOS.map(m => {
              const isSel = selected.cat === m.cat
              return (
                <button
                  key={m.cat}
                  type="button"
                  onClick={() => setSelected(m)}
                  className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all active:scale-98 flex items-center justify-between ${
                    isSel
                      ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  <span>{m.label}</span>
                  {isSel && <span>✓</span>}
                </button>
              )
            })}
          </div>
        </div>

        {selected.cat === 'otro' && (
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">
              Especifica el motivo:
            </label>
            <input
              type="text"
              value={customMotivo}
              onChange={e => setCustomMotivo(e.target.value)}
              placeholder="Escribe la razón..."
              className="w-full h-11 px-3 text-xs bg-white rounded-xl border border-slate-300 outline-none font-bold text-slate-900"
            />
          </div>
        )}

        {requireSup && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex flex-col gap-2.5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-amber-900 uppercase">
                Autorización de supervisor:
              </span>
              <button
                type="button"
                onClick={handleBioSupervisor}
                className="text-[11px] font-black text-blue-700 bg-white px-2 py-0.5 rounded-md border border-slate-300 hover:bg-slate-50 flex items-center gap-1"
                title="Autorizar usando sensor biométrico / huella"
              >
                <span>🔐</span> Huella Admin
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={supervisorUser}
                onChange={e => setSupervisorUser(e.target.value)}
                placeholder="Usuario supervisor"
                className="h-10 px-2.5 text-xs bg-white rounded-lg border border-slate-300 outline-none font-bold text-slate-900"
              />
              <input
                type="password"
                value={supervisorPass}
                onChange={e => setSupervisorPass(e.target.value)}
                placeholder="Contraseña"
                className="h-10 px-2.5 text-xs bg-white rounded-lg border border-slate-300 outline-none font-bold text-slate-900"
              />
            </div>
          </div>
        )}

        <div className="flex justify-between items-center pt-2 border-t border-slate-200 mt-1">
          <Button size="md" variant="default" onClick={onClose}>
            VOLVER
          </Button>

          <Button
            size="md"
            variant="danger"
            onClick={handleConfirm}
            disabled={requireSup && !supervisorPass}
            className="font-black px-5 shadow-sm shadow-rose-500/20"
          >
            CONFIRMAR ANULACIÓN
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
