import { OrderStatus } from '../../types'
import { STATUS } from '../../constants/orderRules'

interface BadgeProps {
  status: OrderStatus
}

export function Badge({ status }: BadgeProps) {
  const m = STATUS[status]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium border ${m.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  )
}
