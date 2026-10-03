import {
  PayMethod,
  OrderType,
  OrderStatus,
  Tone,
  Order,
  OrderAction,
} from '../types'

export const PAY: Record<PayMethod, { icon: string; label: string }> = {
  efectivo:      { icon: '💵', label: 'Efectivo' },
  tarjeta:       { icon: '💳', label: 'Tarjeta' },
  transferencia: { icon: '📲', label: 'Transferencia' },
}

export const ALL_PAY = Object.keys(PAY) as PayMethod[]

// payUpfront: true  → se cobra ANTES de mandar a cocina (comer aquí / para llevar)
//             false → se manda a cocina y se cobra después (recoger / domicilio)
export const ORDER_TYPES: Record<
  OrderType,
  { icon: string; label: string; hint: string; payUpfront: boolean; payMethods: PayMethod[] }
> = {
  local:     { icon: '🍽️', label: 'Aquí',      hint: 'Se cobra primero y pasa a cocina',                 payUpfront: true,  payMethods: ALL_PAY },
  llevar:    { icon: '🥡', label: 'Llevar',    hint: 'Se cobra primero y pasa a cocina',                 payUpfront: true,  payMethods: ALL_PAY },
  recoger:   { icon: '📞', label: 'Recoger',   hint: 'Pasa a cocina; se cobra cuando el cliente llegue', payUpfront: false, payMethods: ALL_PAY },
  domicilio: { icon: '🛵', label: 'Domicilio', hint: 'Pasa a cocina; el repartidor cobra en efectivo',   payUpfront: false, payMethods: ['efectivo'] },
}

// Momento del flujo en el que el cajero registra el cobro de las órdenes que se pagan después
export const PAY_AT: Partial<Record<OrderType, OrderStatus>> = {
  recoger: 'listo',
  domicilio: 'en_reparto',
}

export const STATUS: Record<
  OrderStatus,
  { label: string; badge: string; dot: string; border: string; bg: string }
> = {
  preparando: {
    label: 'En cocina',
    badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    dot: 'bg-amber-400 animate-pulse',
    border: 'rgba(245,197,24,0.6)',
    bg: 'rgba(245,197,24,0.08)',
  },
  listo: {
    label: 'Lista',
    badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    dot: 'bg-blue-400',
    border: 'rgba(96,165,250,0.6)',
    bg: 'rgba(96,165,250,0.08)',
  },
  en_reparto: {
    label: 'En reparto',
    badge: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    dot: 'bg-purple-400',
    border: 'rgba(168,85,247,0.6)',
    bg: 'rgba(168,85,247,0.08)',
  },
  esperando: {
    label: 'Esperando cliente',
    badge: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    dot: 'bg-orange-400 animate-pulse',
    border: 'rgba(251,146,60,0.6)',
    bg: 'rgba(251,146,60,0.08)',
  },
  entregado: {
    label: 'Entregada',
    badge: 'bg-green-500/15 text-green-400 border-green-500/30',
    dot: 'bg-green-400',
    border: 'rgba(34,197,94,0.5)',
    bg: 'rgba(34,197,94,0.06)',
  },
  cancelado: {
    label: 'Cancelada',
    badge: 'bg-red-500/15 text-red-400 border-red-500/30',
    dot: 'bg-red-400',
    border: 'rgba(239,68,68,0.5)',
    bg: 'rgba(239,68,68,0.06)',
  },
}

export const STATUS_LIST = Object.keys(STATUS) as OrderStatus[]

export const STATUS_TOAST: Partial<Record<OrderStatus, string>> = {
  listo: '✅ Orden lista',
  en_reparto: '🛵 Orden enviada a reparto',
  esperando: '🛍️ Orden esperando al cliente',
  entregado: '🎉 Orden finalizada con éxito',
}

export const isClosed = (s: OrderStatus) => s === 'entregado' || s === 'cancelado'

export const canCancel = (o: Order) => !isClosed(o.status)

export const TONE: Record<Tone, { background: string; color: string; shadow: string }> = {
  yellow: { background: '#F5C518', color: '#7a1212', shadow: 'rgba(245,197,24,0.3)' },
  green:  { background: '#22c55e', color: '#fff',    shadow: 'rgba(34,197,94,0.4)' },
  purple: { background: '#8b5cf6', color: '#fff',    shadow: 'rgba(139,92,246,0.4)' },
  orange: { background: '#f97316', color: '#fff',    shadow: 'rgba(249,115,22,0.4)' },
  ghost:  { background: 'rgba(255,255,255,0.1)', color: '#fff', shadow: 'transparent' },
}

// Siguiente(s) acción(es) de una orden según su tipo y estado.
// local:      preparando → listo → entregado (servir en mesa)
// llevar:     preparando → listo → entregado | esperando → entregado
// recoger:    preparando → listo → COBRAR → entregado
// domicilio:  preparando → listo → en_reparto → COBRAR (efectivo) → entregado
export function nextActions(o: Order): OrderAction[] {
  const t = o.orderType
  if (o.payMethod === null && PAY_AT[t] === o.status) {
    return [
      {
        icon: '💰',
        label: t === 'domicilio' ? 'Cobrar y finalizar' : 'Cobrar y entregar',
        tone: 'green',
        charge: true,
      },
    ]
  }
  switch (o.status) {
    case 'preparando':
      return [{ icon: '🍕', label: 'Marcar como listo', tone: 'yellow', to: 'listo' }]
    case 'listo':
      if (t === 'domicilio') return [{ icon: '🛵', label: 'Enviar a reparto', tone: 'purple', to: 'en_reparto' }]
      if (t === 'llevar')
        return [
          { icon: '✅', label: 'Entregado', tone: 'green', to: 'entregado' },
          { icon: '🛍️', label: 'Esperando', tone: 'orange', to: 'esperando' },
        ]
      return [
        {
          icon: t === 'local' ? '🍽️' : '✅',
          label: t === 'local' ? 'Servir en mesa' : 'Entregar',
          tone: 'green',
          to: 'entregado',
        },
      ]
    case 'esperando':
    case 'en_reparto':
      return [{ icon: '✅', label: 'Finalizar entrega', tone: 'ghost', to: 'entregado' }]
    default:
      return []
  }
}
