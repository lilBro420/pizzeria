import { Order, OrderItem, OrderStatus, OrderType, PayMethod, PizzaDough, PizzaSize } from '../types'
import { MENU } from './menu'
import { calcTotals, uid, unitPrice } from '../utils/formatters'

const line = (menuId: string, qty = 1, size?: PizzaSize, dough?: PizzaDough): OrderItem => {
  const item = MENU.find(m => m.id === menuId)!
  return { uid: uid(), item, qty, size, dough, finalPrice: unitPrice(item, size, dough) }
}

const sample = (
  id: string,
  time: string,
  cashier: string,
  orderType: OrderType,
  status: OrderStatus,
  payMethod: PayMethod | null,
  items: OrderItem[],
  cancelReason?: string
): Order => {
  const total = calcTotals(items).total
  return {
    id,
    time,
    cashier,
    orderType,
    status,
    payMethod,
    items,
    discount: 0,
    total,
    cancelReason,
    refund: status === 'cancelado' && payMethod ? total : undefined,
  }
}

export const SAMPLE_ORDERS: Order[] = [
  sample('#4024', '12:22', 'Ana',    'recoger',   'preparando', null,            [line('p4', 1, 'Grande', 'Delgada'), line('s3')]),
  sample('#4023', '12:18', 'Carlos', 'local',     'preparando', 'transferencia', [line('p1', 1, 'Mediana', 'Delgada'), line('b5', 2)]),
  sample('#4022', '12:05', 'Ana',    'domicilio', 'listo',      null,            [line('p5', 1, 'Grande', 'Gruesa'), line('s2'), line('b1', 2)]),
  sample('#4025', '11:50', 'Carlos', 'llevar',    'cancelado',  'efectivo',      [line('p6', 1, 'Mediana', 'Delgada')], 'Error al tomar la orden'),
  sample('#4021', '11:30', 'Carlos', 'llevar',    'entregado',  'tarjeta',       [line('p2', 1, 'Mediana', 'Delgada'), line('s1')]),
]
