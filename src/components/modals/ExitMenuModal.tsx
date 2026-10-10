import React from 'react'
import { UsuarioActual } from '../../types'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'

interface ExitMenuModalProps {
  usuario: UsuarioActual
  onClose: () => void
  onLogout: () => void
  onOpenNotas?: () => void
  onOpenConsultarNotas?: () => void
  onOpenTurno?: () => void
  onOpenTurnos?: () => void
  onOpenCocina?: () => void
  onGoCocina?: () => void
  onOpenAdmin?: () => void
  onGoAdmin?: () => void
}

export function ExitMenuModal({
  usuario,
  onClose,
  onLogout,
  onOpenNotas,
  onOpenConsultarNotas,
  onOpenTurno,
  onOpenTurnos,
  onOpenCocina,
  onGoCocina,
  onOpenAdmin,
  onGoAdmin,
}: ExitMenuModalProps) {
  const canAdmin = usuario.permisos.some(p => ['menu', 'reportes', 'usuarios'].includes(p))
  const canCocina = usuario.permisos.includes('cocina')

  const handleNotas = onOpenNotas || onOpenConsultarNotas
  const handleTurno = onOpenTurno || onOpenTurnos
  const handleCocina = onOpenCocina || onGoCocina
  const handleAdmin = onOpenAdmin || onGoAdmin

  return (
    <Dialog title="MENÚ DEL SISTEMA" isOpen={true} onClose={onClose} maxWidth="max-w-md">
      <div className="flex flex-col gap-3.5 touch-pan-y">
        <div className="bg-slate-100 rounded-xl p-3 text-xs flex justify-between items-center border border-slate-200">
          <span className="font-bold text-slate-500">Usuario activo:</span>
          <span className="font-black text-blue-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
            {usuario.nombre} ({usuario.rol.toUpperCase()})
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {handleNotas && (
            <button
              type="button"
              onClick={() => {
                onClose()
                handleNotas()
              }}
              className="p-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-left transition-all active:scale-95 shadow-2xs flex flex-col justify-between min-h-[78px]"
            >
              <span className="text-sm font-black text-slate-900 block">CONSULTAR NOTAS</span>
              <span className="text-[11px] text-slate-500 mt-1 block">Historial y comentarios</span>
            </button>
          )}

          {handleTurno && (
            <button
              type="button"
              onClick={() => {
                onClose()
                handleTurno()
              }}
              className="p-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-left transition-all active:scale-95 shadow-2xs flex flex-col justify-between min-h-[78px]"
            >
              <span className="text-sm font-black text-slate-900 block">CORTE / TURNO</span>
              <span className="text-[11px] text-slate-500 mt-1 block">Arqueo y fondo de caja</span>
            </button>
          )}

          {canCocina && handleCocina && (
            <button
              type="button"
              onClick={() => {
                onClose()
                handleCocina()
              }}
              className="p-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-left transition-all active:scale-95 shadow-2xs flex flex-col justify-between min-h-[78px]"
            >
              <span className="text-sm font-black text-slate-900 block">MONITOR COCINA</span>
              <span className="text-[11px] text-slate-500 mt-1 block">Ver y atender comandas</span>
            </button>
          )}

          {canAdmin && handleAdmin && (
            <button
              type="button"
              onClick={() => {
                onClose()
                handleAdmin()
              }}
              className="p-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-left transition-all active:scale-95 shadow-2xs flex flex-col justify-between min-h-[78px]"
            >
              <span className="text-sm font-black text-slate-900 block">ADMINISTRACIÓN</span>
              <span className="text-[11px] text-slate-500 mt-1 block">Menú, catálogo y personal</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              onClose()
              onLogout()
            }}
            className="p-3.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-left transition-all active:scale-95 shadow-2xs flex flex-col justify-between min-h-[78px]"
          >
            <span className="text-sm font-black block">CAMBIAR USUARIO</span>
            <span className="text-[11px] text-amber-800 mt-1 block">Cambiar cajero</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose()
              onLogout()
            }}
            className="p-3.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 text-left transition-all active:scale-95 shadow-2xs flex flex-col justify-between min-h-[78px]"
          >
            <span className="text-sm font-black block">CERRAR SESIÓN</span>
            <span className="text-[11px] text-rose-700 mt-1 block">Salir del sistema</span>
          </button>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-200">
          <Button size="md" variant="default" onClick={onClose} className="px-6 font-bold">
            CANCELAR
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
