import { useState } from 'react'
import { OrderType, Client } from '../../types'
import { ORDER_TYPES } from '../../constants/orderRules'
import { X, Search, User, MapPin, Hash } from 'lucide-react'
import { ClientsStore } from '../../hooks/useClients'

interface OrderTypeModalProps {
  clientsStore: ClientsStore
  onConfirm: (type: OrderType, client?: Client, table?: string) => void
  onClose: () => void
}

export function OrderTypeModal({ clientsStore, onConfirm, onClose }: OrderTypeModalProps) {
  const [type, setType] = useState<OrderType>('local')
  
  // Para 'local' y 'llevar'
  const [table, setTable] = useState('')
  
  // Para 'domicilio' y 'recoger'
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [clientFound, setClientFound] = useState(false)

  const handlePhoneChange = (p: string) => {
    setPhone(p)
    if (p.length >= 10) {
      const found = clientsStore.findByPhone(p)
      if (found) {
        setName(found.name)
        setAddress(found.address)
        setClientFound(true)
      } else {
        setClientFound(false)
      }
    } else {
      setClientFound(false)
    }
  }

  const handleConfirm = () => {
    if (type === 'domicilio' || type === 'recoger') {
      const client = { phone, name, address }
      clientsStore.addOrUpdateClient(client)
      onConfirm(type, client, undefined)
    } else {
      onConfirm(type, undefined, table)
    }
  }

  const rule = ORDER_TYPES[type]
  const isValid = 
    (type === 'local' || type === 'llevar') ? true : // Mesa es opcional o requerida? Asumimos opcional o puedes requerirla
    (type === 'recoger' ? phone.length >= 10 && name.length > 0 :
    type === 'domicilio' ? phone.length >= 10 && name.length > 0 && address.length > 0 : false)

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Tipo de Orden</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto">
          <div className="grid grid-cols-4 gap-2 mb-6">
            {(Object.keys(ORDER_TYPES) as OrderType[]).map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`py-3 flex flex-col items-center gap-1.5 rounded-xl border transition-all ${
                  type === t 
                    ? 'border-red-500 bg-red-50 text-red-700 shadow-sm' 
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                }`}
              >
                <span className="text-2xl">{ORDER_TYPES[t].icon}</span>
                <span className="text-xs font-bold">{ORDER_TYPES[t].label}</span>
              </button>
            ))}
          </div>

          <div className="p-4 bg-amber-50 text-amber-800 rounded-xl text-sm font-medium mb-6">
            {rule.hint}
          </div>

          <div className="space-y-4">
            {(type === 'local' || type === 'llevar') ? (
              <div>
                <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                  <Hash size={14} /> Número de Mesa / Referencia
                </label>
                <input 
                  type="text"
                  placeholder="Ej: Mesa 4, Barra, o nombre del cliente"
                  value={table}
                  onChange={e => setTable(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                    <Search size={14} /> Buscar por Teléfono
                  </label>
                  <input 
                    type="tel"
                    placeholder="10 dígitos"
                    value={phone}
                    onChange={e => handlePhoneChange(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm font-mono focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                  />
                  {clientFound && <span className="text-xs text-green-600 font-medium mt-1 inline-block">✓ Cliente encontrado</span>}
                </div>

                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                    <User size={14} /> Nombre del Cliente
                  </label>
                  <input 
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                  />
                </div>

                {type === 'domicilio' && (
                  <div>
                    <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                      <MapPin size={14} /> Dirección de Entrega
                    </label>
                    <textarea 
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      rows={2}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none resize-none"
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="p-5 border-t border-gray-100 shrink-0 bg-gray-50">
          <button
            onClick={handleConfirm}
            disabled={!isValid}
            className={`w-full py-4 rounded-xl font-black text-white text-base uppercase tracking-wide transition-all ${
              isValid ? (rule.payUpfront ? 'bg-green-600 hover:bg-green-700 shadow-[0_4px_14px_rgba(22,163,74,0.3)]' : 'bg-red-600 hover:bg-red-700 shadow-[0_4px_14px_rgba(220,38,38,0.3)]') : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            {rule.payUpfront ? 'Cobrar Ahora' : 'Enviar a Espera / Cocina'}
          </button>
        </div>
      </div>
    </div>
  )
}
