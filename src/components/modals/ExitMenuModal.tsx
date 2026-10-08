import React from 'react'
import { UsuarioActual } from '../../types'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'

interface ExitMenuModalProps {
  usuario: UsuarioActual
  onClose: () => void
  onLogout: () => void
  onOpenConsultarNotas: () => void
  onOpenTurnos: () => void
  onGoCocina?: () => void
  onGoAdmin?: () => void
}

export function ExitMenuModal({
  usuario,
  onClose,
  onLogout,
  onOpenConsultarNotas,
  onOpenTurnos,
  onGoCocina,
  onGoAdmin,
}: ExitMenuModalProps) {
  const canAdmin = usuario.permisos.some(p => ['menu', 'reportes', 'usuarios'].includes(p))
  const canCocina = usuario.permisos.includes('cocina')

  return (
    <Dialog title="MENÚ DEL SISTEMA / SALIR" isOpen={true} onClose={onClose} maxWidth="max-w-md">
      <div className="flex flex-col gap-3 select-none">
        <div className="swing-inset bg-white p-2 text-xs flex justify-between items-center">
          <span className="font-bold text-gray-700">Usuario activo:</span>
          <span className="font-black text-[#0A246A]">{usuario.nombre} ({usuario.rol.toUpperCase()})</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            size="lg"
            variant="default"
            onClick={() => {
              onClose()
              onOpenConsultarNotas()
            }}
            className="flex flex-col items-center justify-center p-3 text-center"
          >
            <span className="text-base font-extrabold">CONSULTAR NOTAS</span>
            <span className="text-[11px] font-normal text-gray-600">Historial y reimpresión</span>
          </Button>

          <Button
            size="lg"
            variant="default"
            onClick={() => {
              onClose()
              onOpenTurnos()
            }}
            className="flex flex-col items-center justify-center p-3 text-center"
          >
            <span className="text-base font-extrabold">CORTE / TURNO</span>
            <span className="text-[11px] font-normal text-gray-600">Apertura y arqueo de caja</span>
          </Button>

          {canCocina && onGoCocina && (
            <Button
              size="lg"
              variant="default"
              onClick={() => {
                onClose()
                onGoCocina()
              }}
              className="flex flex-col items-center justify-center p-3 text-center"
            >
              <span className="text-base font-extrabold">MONITOR COCINA</span>
              <span className="text-[11px] font-normal text-gray-600">Ver comandas activas</span>
            </Button>
          )}

          {canAdmin && onGoAdmin && (
            <Button
              size="lg"
              variant="default"
              onClick={() => {
                onClose()
                onGoAdmin()
              }}
              className="flex flex-col items-center justify-center p-3 text-center"
            >
              <span className="text-base font-extrabold">ADMINISTRACIÓN</span>
              <span className="text-[11px] font-normal text-gray-600">Menú, usuarios, reportes</span>
            </Button>
          )}

          <Button
            size="lg"
            variant="warning"
            onClick={() => {
              onClose()
              onLogout()
            }}
            className="flex flex-col items-center justify-center p-3 text-center"
          >
            <span className="text-base font-black">CAMBIAR USUARIO</span>
            <span className="text-[11px] font-normal text-amber-950">Volver a pantalla de login</span>
          </Button>

          <Button
            size="lg"
            variant="danger"
            onClick={() => {
              onClose()
              onLogout()
            }}
            className="flex flex-col items-center justify-center p-3 text-center"
          >
            <span className="text-base font-black">CERRAR SESIÓN</span>
            <span className="text-[11px] font-normal text-red-200">Salir del sistema</span>
          </Button>
        </div>

        <div className="flex justify-end pt-2 border-t border-[#808080]">
          <Button size="md" variant="default" onClick={onClose} className="px-6 font-bold">
            CANCELAR
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
