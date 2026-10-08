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
    <Dialog title="TIPO DE ORDEN Y DESTINO" isOpen={true} onClose={onClose} maxWidth="max-w-2xl">
      <div className="flex flex-col gap-4 select-none">
        {/* Type selection buttons */}
        <div className="grid grid-cols-4 gap-2">
          {(
            [
              { t: 'local', label: 'COMER AQUÍ' },
              { t: 'llevar', label: 'PARA LLEVAR' },
              { t: 'recoger', label: 'RECOGER' },
              { t: 'domicilio', label: 'DOMICILIO' },
            ] as const
          ).map(opt => (
            <Button
              key={opt.t}
              size="lg"
              variant={tipo === opt.t ? 'primary' : 'default'}
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
              className="text-base font-black py-3"
            >
              {opt.label}
            </Button>
          ))}
        </div>

        {/* Content depending on order type */}
        {isLocalOrLlevar && (
          <div className="flex flex-col gap-3 swing-inset bg-white p-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                Número de Mesa o Referencia:
              </label>
              {tipo === 'local' && (
                <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 border border-red-300">
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
                placeholder="Ej. Mesa 4, Barra, Terraza..."
                className="flex-1 h-12 px-3 text-xl font-bold bg-[#ECE9D8] swing-inset outline-none text-black"
              />
              <Button size="md" variant="default" onClick={() => setMesa('')}>
                LIMPIAR
              </Button>
            </div>

            {/* Quick table selector */}
            <div>
              <div className="text-xs font-bold text-gray-600 uppercase mb-1">
                Selección Rápida de Mesas:
              </div>
              <div className="grid grid-cols-6 gap-2">
                {mesas.map(m => (
                  <Button
                    key={m.id}
                    size="sm"
                    variant={mesa === m.nombre ? 'primary' : 'default'}
                    onClick={() => setMesa(m.nombre)}
                    className="font-black text-base py-2"
                  >
                    Mesa {m.nombre}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {(isRecoger || isDomicilio) && (
          <div className="flex flex-col gap-3 swing-inset bg-white p-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-800 uppercase mb-1">
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
                  className="w-full h-11 px-3 text-lg font-mono font-bold bg-[#ECE9D8] swing-inset outline-none text-black"
                />
                {searching && <span className="text-xs text-blue-700 font-bold mt-1 block">Buscando...</span>}
                {foundClient && (
                  <span className="text-xs text-green-700 font-bold mt-1 block">
                    ✓ Cliente registrado: {foundClient.nombre}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-800 uppercase mb-1">
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
                  className="w-full h-11 px-3 text-base font-bold bg-[#ECE9D8] swing-inset outline-none text-black"
                />
              </div>
            </div>

            {isDomicilio && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-800 uppercase mb-1">
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
                    className="w-full h-11 px-3 text-base font-bold bg-[#ECE9D8] swing-inset outline-none text-black"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-800 uppercase mb-1">
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
                    className="w-full h-11 px-3 text-base font-bold bg-[#ECE9D8] swing-inset outline-none text-black"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* On-screen keyboard if enabled */}
        {keyboardMode === 'num' && (
          <div className="pt-2 border-t border-[#808080]">
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
          <div className="pt-2 border-t border-[#808080]">
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

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#808080]">
          <Button size="lg" variant="default" onClick={onClose}>
            CANCELAR
          </Button>

          <div className="flex gap-2">
            <Button
              size="lg"
              variant="warning"
              disabled={!isValid}
              onClick={() => handleFinish(false)}
              className="text-base font-black px-4"
              title="Envía la comanda a cocina y deja la cuenta pendiente de cobro"
            >
              ENVIAR A ESPERA
            </Button>

            <Button
              size="lg"
              variant="success"
              disabled={!isValid}
              onClick={() => handleFinish(true)}
              className="text-base font-black px-6"
              title="Abre la pantalla de cobro para pagar ahora"
            >
              COBRAR AHORA
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
