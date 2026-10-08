import React, { useState } from 'react'
import { Orden } from '../../types'
import { fmt } from '../../utils/formatters'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'

interface CancelDialogProps {
  order: Orden
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

export function CancelDialog({ order, needsSupervisor = false, onConfirm, onClose }: CancelDialogProps) {
  const [selected, setSelected] = useState(MOTIVOS[0])
  const [customMotivo, setCustomMotivo] = useState('')
  const [supervisorUser, setSupervisorUser] = useState('carlos')
  const [supervisorPass, setSupervisorPass] = useState('')

  const handleConfirm = () => {
    const finalMotivo = selected.cat === 'otro' && customMotivo.trim() ? customMotivo.trim() : selected.label
    onConfirm({
      motivo: finalMotivo,
      categoria: selected.cat,
      autoriza: needsSupervisor ? { usuario: supervisorUser.trim(), password: supervisorPass } : null,
    })
  }

  const isCobrada = order.estado === 'cerrada'

  return (
    <Dialog title={`ANULAR ORDEN ${order.folio}`} isOpen={true} onClose={onClose} maxWidth="max-w-md">
      <div className="flex flex-col gap-3 select-none">
        <div className="swing-inset bg-white p-3">
          <div className="flex justify-between items-baseline">
            <span className="font-bold text-sm text-gray-700">Folio:</span>
            <span className="font-mono text-xl font-black text-[#0A246A]">{order.folio}</span>
          </div>
          <div className="flex justify-between items-baseline mt-1">
            <span className="font-bold text-sm text-gray-700">Monto de la Orden:</span>
            <span className="font-mono text-xl font-black text-black">{fmt(order.total)}</span>
          </div>

          {isCobrada && (
            <div className="mt-2 p-2 bg-[#FFEBEE] border border-[#D32F2F] text-[#B71C1C] text-xs font-bold">
              ATENCIÓN: La orden ya fue cobrada ({order.metodoPago?.toUpperCase()}). Se debe reembolsar{' '}
              {fmt(order.total)} al cliente.
            </div>
          )}
        </div>

        <div>
          <span className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 block">
            Selecciona el motivo de cancelación:
          </span>
          <div className="flex flex-col gap-1.5 swing-inset bg-white p-2">
            {MOTIVOS.map(m => (
              <Button
                key={m.cat}
                size="sm"
                variant={selected.cat === m.cat ? 'primary' : 'default'}
                onClick={() => setSelected(m)}
                className="justify-start text-xs font-bold py-2"
              >
                {selected.cat === m.cat ? '► ' : '  '} {m.label}
              </Button>
            ))}
          </div>
        </div>

        {selected.cat === 'otro' && (
          <div>
            <label className="text-xs font-bold text-gray-700 uppercase mb-1 block">
              Especifica el motivo:
            </label>
            <input
              type="text"
              value={customMotivo}
              onChange={e => setCustomMotivo(e.target.value)}
              placeholder="Escribe la razón..."
              className="w-full h-10 px-2 text-sm bg-white swing-inset outline-none font-bold"
            />
          </div>
        )}

        {needsSupervisor && (
          <div className="p-2.5 bg-[#FFFDE7] border border-[#FBC02D] swing-inset flex flex-col gap-2">
            <span className="text-xs font-black text-[#F57F17] uppercase">
              Se requiere autorización de supervisor:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={supervisorUser}
                onChange={e => setSupervisorUser(e.target.value)}
                placeholder="Usuario supervisor"
                className="h-10 px-2 text-xs bg-white swing-inset outline-none font-bold"
              />
              <input
                type="password"
                value={supervisorPass}
                onChange={e => setSupervisorPass(e.target.value)}
                placeholder="Contraseña"
                className="h-10 px-2 text-xs bg-white swing-inset outline-none font-bold"
              />
            </div>
          </div>
        )}

        <div className="flex justify-between items-center pt-2 border-t border-[#808080] mt-1">
          <Button size="md" variant="default" onClick={onClose}>
            VOLVER
          </Button>

          <Button
            size="md"
            variant="danger"
            onClick={handleConfirm}
            disabled={needsSupervisor && !supervisorPass}
            className="font-black px-4"
          >
            CONFIRMAR ANULACIÓN
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
