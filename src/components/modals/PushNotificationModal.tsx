import React, { useEffect, useState } from 'react'
import { notifications } from '../../services/notifications'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { AlertIcon, CheckIcon } from '../ui/Icons'

interface PushNotificationModalProps {
  onClose: () => void
}

export function PushNotificationModal({ onClose }: PushNotificationModalProps) {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSupported, setIsSupported] = useState(true)
  const [testStatus, setTestStatus] = useState<string | null>(null)

  useEffect(() => {
    setIsSupported(notifications.isSupported())
    setPermission(notifications.getPermission())
  }, [])

  const handleRequestPermission = async () => {
    const res = await notifications.requestPermission()
    setPermission(res)
    if (res === 'granted') {
      setTestStatus('¡Permisos concedidos! Ahora puedes enviar notificaciones de prueba.')
    } else if (res === 'denied') {
      setTestStatus('Permisos bloqueados en el navegador. Debes habilitarlos en la barra de direcciones.')
    }
  }

  const handleTestNotification = async () => {
    setTestStatus('Enviando notificación push...')
    const ok = await notifications.sendNotification('🍕 Pizzería Volcán POS', {
      body: '¡Notificación Push de prueba recibida con éxito! Sistema operativo conectado.',
      tag: 'test',
    })

    if (ok) {
      setTestStatus('¡Notificación enviada con éxito! Revisa la barra de notificaciones de tu dispositivo.')
    } else {
      setTestStatus('No se pudo enviar la notificación. Verifica que los permisos estén concedidos.')
    }
  }

  const handleTestKitchen = async () => {
    setTestStatus('Enviando alerta de cocina...')
    await notifications.notifyNewKitchenOrder('#4099', 3, '1x Pepperoni Grande, 2x Coca-Cola')
    setTestStatus('Alerta de comanda enviada con campanazo y vibración.')
  }

  const handleTestReady = async () => {
    setTestStatus('Enviando alerta de pedido listo...')
    await notifications.notifyOrderReady('#4099', 'domicilio', 'Roberto Mendoza')
    setTestStatus('Alerta de entrega enviada.')
  }

  return (
    <Dialog title="NOTIFICACIONES PUSH & ALERTAS EN TIEMPO REAL" isOpen={true} onClose={onClose} maxWidth="max-w-xl">
      <div className="flex flex-col gap-4 select-none text-slate-800">
        {/* Estado actual */}
        <div className="p-3.5 rounded-2xl border bg-slate-50 flex items-center justify-between">
          <div>
            <span className="text-xs font-extrabold uppercase text-slate-500 tracking-wider block">
              Estado de Notificaciones:
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`w-3 h-3 rounded-full ${
                  permission === 'granted'
                    ? 'bg-emerald-500 animate-pulse'
                    : permission === 'denied'
                    ? 'bg-rose-500'
                    : 'bg-amber-500'
                }`}
              />
              <span className="text-sm font-black uppercase">
                {permission === 'granted'
                  ? 'ACTIVAS Y PERMITIDAS'
                  : permission === 'denied'
                  ? 'BLOQUEADAS EN EL NAVEGADOR'
                  : 'PENDIENTES DE AUTORIZACIÓN'}
              </span>
            </div>
          </div>

          {permission !== 'granted' && (
            <Button
              size="sm"
              variant="primary"
              onClick={handleRequestPermission}
              className="text-xs font-black py-2 px-3 shadow-sm"
            >
              ACTIVAR PERMISOS
            </Button>
          )}
        </div>

        {/* Mensaje de feedback */}
        {testStatus && (
          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckIcon className="w-4 h-4 text-blue-600 shrink-0 stroke-[2.5]" />
            <span>{testStatus}</span>
          </div>
        )}

        {/* Botones de Prueba */}
        <div>
          <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-2">
            Pruebas Rápidas de Notificaciones:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleTestNotification}
              className="p-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 shadow-2xs text-left active:scale-95 transition-all flex flex-col justify-between min-h-[78px]"
            >
              <span className="text-xs font-black text-slate-900 block leading-tight">
                🔔 Prueba General
              </span>
              <span className="text-[11px] text-slate-500 font-medium mt-1">
                Envía notificación del sistema al dispositivo
              </span>
            </button>

            <button
              type="button"
              onClick={handleTestKitchen}
              className="p-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 shadow-2xs text-left active:scale-95 transition-all flex flex-col justify-between min-h-[78px]"
            >
              <span className="text-xs font-black text-amber-900 block leading-tight">
                🍕 Alerta Cocina
              </span>
              <span className="text-[11px] text-amber-700 font-medium mt-1">
                Campana y aviso de nueva comanda entrante
              </span>
            </button>

            <button
              type="button"
              onClick={handleTestReady}
              className="p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 shadow-2xs text-left active:scale-95 transition-all flex flex-col justify-between min-h-[78px]"
            >
              <span className="text-xs font-black text-emerald-900 block leading-tight">
                🛵 Pedido Listo
              </span>
              <span className="text-[11px] text-emerald-700 font-medium mt-1">
                Aviso a repartidor o mesero para entrega
              </span>
            </button>
          </div>
        </div>

        {/* Guía paso a paso para dispositivos móviles y escritorio */}
        <div className="bg-slate-100 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-2">
          <span className="font-extrabold text-slate-900 uppercase tracking-wider block">
            ¿Cómo probarlas en tu Teléfono Móvil o Tableta?
          </span>
          <ol className="list-decimal list-inside space-y-1 text-slate-600 font-medium">
            <li>
              <strong>Paso 1:</strong> Pulsa el botón <strong>ACTIVAR PERMISOS</strong> arriba y selecciona <em>&quot;Permitir&quot;</em> cuando el navegador lo solicite.
            </li>
            <li>
              <strong>Paso 2:</strong> Pulsa <strong>🔔 Prueba General</strong>. La notificación aparecerá en la barra superior de tu celular y emitirá un sonido de campana con vibración.
            </li>
            <li>
              <strong>En iPhone / iPad (iOS):</strong> Para recibir notificaciones push en iOS, pulsa el botón Compartir de Safari y selecciona <em>&quot;Añadir a la pantalla de inicio&quot;</em>. Al abrir la app desde el inicio, podrás autorizar las notificaciones nativas.
            </li>
            <li>
              <strong>En Android:</strong> Funcionan directamente en Google Chrome al conceder permisos.
            </li>
          </ol>
        </div>

        <div className="flex justify-end pt-1">
          <Button size="md" variant="default" onClick={onClose}>
            CERRAR
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
