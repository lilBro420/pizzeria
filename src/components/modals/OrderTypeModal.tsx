import React, { useState } from 'react'
import { Cliente, Mesa, TipoOrden } from '../../types'
import { api } from '../../services/api'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { NumPad } from '../ui/NumPad'
import { VirtualKeyboard } from '../ui/VirtualKeyboard'

interface OrderTypeModalProps {
  mesas: Mesa[]
  initialType?: TipoOrden
  initialTable?: string
  initialClient?: Cliente | null
  onConfirm: (data: {
    tipo: TipoOrden
    mesa: string | null
    cliente: Cliente | null
    payNow: boolean
  }) => void
  onClose: () => void
}

export function OrderTypeModal({
  mesas,
  initialType = 'local',
  initialTable = '',
  initialClient = null,
  onConfirm,
  onClose,
}: OrderTypeModalProps) {
  const [tipo, setTipo] = useState<TipoOrden>(initialType)
  const [mesa, setMesa] = useState(initialTable)
  const [phone, setPhone] = useState(initialClient?.celular || '')
  const [name, setName] = useState(initialClient?.nombre || '')
  const [address, setAddress] = useState(initialClient?.direccion || '')
  const [referencias, setReferencias] = useState(initialClient?.referencias || '')
  const [searching, setSearching] = useState(false)
  const [foundClient, setFoundClient] = useState<Cliente | null>(initialClient)
  const [activeInput, setActiveInput] = useState<'mesa' | 'phone' | 'name' | 'address' | 'referencias'>('mesa')
  const [keyboardMode, setKeyboardMode] = useState<'num' | 'alpha' | 'none'>('num')

  const handlePhoneChange = async (val: string) => {
    setPhone(val)
    if (val.length >= 7) {
      try {
        setSearching(true)
        const res = await api.getClientes(val)
        const match = res.find(c => c.celular === val)
        if (match) {
          setName(match.nombre)
          setAddress(match.direccion || '')
          setReferencias(match.referencias || '')
          setFoundClient(match)
        } else {
          setFoundClient(null)
        }
      } catch {
        // Search error ignored
      } finally {
        setSearching(false)
      }
    } else {
      setFoundClient(null)
    }
  }

  const isLocalOrLlevar = tipo === 'local' || tipo === 'llevar'
  const isRecoger = tipo === 'recoger'
  const isDomicilio = tipo === 'domicilio'

  // Regla: Domicilio y Recoger van a espera; Comer Aquí y Llevar van a cobro directo
  const isEsperaService = isRecoger || isDomicilio

  const isValid =
    (tipo === 'local' ? mesa.trim().length > 0 : true) &&
    (isRecoger ? phone.length >= 10 && name.trim().length > 0 : true) &&
    (isDomicilio ? phone.length >= 10 && name.trim().length > 0 && address.trim().length > 0 : true)

  const handleFinish = (payNow: boolean) => {
    if (!isValid) return
    const clientePayload: Cliente | null =
      isRecoger || isDomicilio
        ? {
            celular: phone.trim(),
            nombre: name.trim(),
            direccion: address.trim() || null,
            referencias: referencias.trim() || null,
          }
        : null

    onConfirm({
      tipo,
      mesa: isLocalOrLlevar ? mesa.trim() || null : null,
      cliente: clientePayload,
      payNow,
    })
  }

  return (
    <Dialog title="DESTINO DEL PEDIDO" isOpen={true} onClose={onClose} maxWidth="max-w-2xl">
      <div className="flex flex-col gap-4 select-none">
        {/* Type selection buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(
            [
              { t: 'local', label: 'COMER AQUÍ', sub: 'Mesa en restaurante' },
              { t: 'llevar', label: 'PARA LLEVAR', sub: 'Mostrador directo' },
              { t: 'recoger', label: 'RECOGER', sub: 'Pedido por teléfono' },
              { t: 'domicilio', label: 'DOMICILIO', sub: 'Envío con repartidor' },
            ] as const
          ).map(opt => {
            const isSel = tipo === opt.t
            return (
              <button
                key={opt.t}
                type="button"
                onClick={() => {
                  setTipo(opt.t)
                  if (opt.t === 'local' || opt.t === 'llevar') {
                    setActiveInput('mesa')
                    setKeyboardMode('num')
                  } else {
                    setActiveInput('phone')
                    setKeyboardMode('num')
                  }
                }}
                className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center transition-all active:scale-95 ${
                  isSel
                    ? 'bg-blue-600 text-white border-blue-700 shadow-md shadow-blue-500/25 ring-2 ring-blue-400/50'
                    : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className="text-sm sm:text-base font-black tracking-tight">{opt.label}</span>
                <span
                  className={`text-[11px] mt-0.5 font-medium ${
                    isSel ? 'text-blue-100' : 'text-slate-500'
                  }`}
                >
                  {opt.sub}
                </span>
              </button>
            )
          })}
        </div>

        {/* Content depending on order type */}
        {isLocalOrLlevar && (
          <div className="flex flex-col gap-3 bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm">
            <div className="flex justify-between items-center">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                {tipo === 'local' ? 'Número de Mesa:' : 'Referencia / Identificador (Opcional):'}
              </label>
              {tipo === 'local' && (
                <span className="text-xs font-black text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                  REQUERIDO
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={mesa}
                onFocus={() => {
                  setActiveInput('mesa')
                  setKeyboardMode('num')
                }}
                onChange={e => setMesa(e.target.value)}
                placeholder={tipo === 'local' ? 'Ej. Mesa 4, Terraza 2...' : 'Ej. Juan, Barra...'}
                className="flex-1 h-12 px-3.5 text-xl font-black bg-slate-50 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
              />
              <Button size="md" variant="default" onClick={() => setMesa('')}>
                LIMPIAR
              </Button>
            </div>

            {/* Quick table selector */}
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Selección Rápida de Mesas:
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {mesas.map(m => {
                  const isSel = mesa === m.nombre
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMesa(m.nombre)}
                      className={`h-12 rounded-xl font-black text-sm transition-all active:scale-95 border ${
                        isSel
                          ? 'bg-blue-600 text-white border-blue-700 shadow-sm ring-2 ring-blue-400'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                      }`}
                    >
                      Mesa {m.nombre}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {(isRecoger || isDomicilio) && (
          <div className="flex flex-col gap-3 bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Teléfono (10 dígitos):
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  value={phone}
                  onFocus={() => {
                    setActiveInput('phone')
                    setKeyboardMode('num')
                  }}
                  onChange={e => handlePhoneChange(e.target.value)}
                  placeholder="Ej. 5551234567"
                  className="w-full h-12 px-3.5 text-lg font-mono font-black bg-slate-50 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
                {searching && <span className="text-xs text-blue-600 font-bold mt-1 block">Buscando cliente...</span>}
                {foundClient && (
                  <span className="text-xs text-emerald-600 font-bold mt-1 block">
                    ✓ Cliente registrado: {foundClient.nombre}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Nombre del Cliente:
                </label>
                <input
                  type="text"
                  value={name}
                  onFocus={() => {
                    setActiveInput('name')
                    setKeyboardMode('alpha')
                  }}
                  onChange={e => setName(e.target.value)}
                  placeholder="Nombre y apellido"
                  className="w-full h-12 px-3.5 text-base font-bold bg-slate-50 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>
            </div>

            {isDomicilio && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                    Dirección de Entrega:
                  </label>
                  <input
                    type="text"
                    value={address}
                    onFocus={() => {
                      setActiveInput('address')
                      setKeyboardMode('alpha')
                    }}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="Calle, número, colonia"
                    className="w-full h-12 px-3.5 text-base font-bold bg-slate-50 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                    Referencias:
                  </label>
                  <input
                    type="text"
                    value={referencias}
                    onFocus={() => {
                      setActiveInput('referencias')
                      setKeyboardMode('alpha')
                    }}
                    onChange={e => setReferencias(e.target.value)}
                    placeholder="Entre calles, color de fachada"
                    className="w-full h-12 px-3.5 text-base font-bold bg-slate-50 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* On-screen keyboard if enabled */}
        {keyboardMode === 'num' && (
          <div className="pt-2 border-t border-slate-200">
            <NumPad
              value={activeInput === 'mesa' ? mesa : phone}
              onChange={val => {
                if (activeInput === 'mesa') setMesa(val)
                else handlePhoneChange(val)
              }}
              allowDecimal={false}
            />
          </div>
        )}

        {keyboardMode === 'alpha' && (
          <div className="pt-2 border-t border-slate-200">
            <VirtualKeyboard
              value={
                activeInput === 'name'
                  ? name
                  : activeInput === 'address'
                  ? address
                  : activeInput === 'referencias'
                  ? referencias
                  : mesa
              }
              onChange={val => {
                if (activeInput === 'name') setName(val)
                else if (activeInput === 'address') setAddress(val)
                else if (activeInput === 'referencias') setReferencias(val)
                else setMesa(val)
              }}
            />
          </div>
        )}

        {/* Action Buttons: Regla estricta del usuario */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200">
          <Button size="lg" variant="default" onClick={onClose}>
            CANCELAR
          </Button>

          {isEsperaService ? (
            /* Solo ENVIAR A ESPERA para Domicilio y Recoger */
            <Button
              size="lg"
              variant="warning"
              disabled={!isValid}
              onClick={() => handleFinish(false)}
              className="text-base font-black px-6 shadow-md shadow-amber-500/20"
              title="Envía la comanda a cocina y deja la cuenta pendiente de cobro"
            >
              ENVIAR A ESPERA (COCINA)
            </Button>
          ) : (
            /* Solo COBRAR AHORA para Comer Aquí (Local) y Llevar */
            <Button
              size="lg"
              variant="success"
              disabled={!isValid}
              onClick={() => handleFinish(true)}
              className="text-base font-black px-8 shadow-md shadow-emerald-500/20"
              title="Abre la pantalla de cobro para pagar ahora"
            >
              COBRAR AHORA
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  )
}
