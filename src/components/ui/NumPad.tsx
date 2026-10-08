import React from 'react'
import { Button } from './Button'

interface NumPadProps {
  value: string
  onChange: (value: string) => void
  allowDecimal?: boolean
  presets?: number[]
  onPreset?: (preset: number) => void
  onEnter?: () => void
  enterLabel?: string
}

export function NumPad({
  value,
  onChange,
  allowDecimal = true,
  presets,
  onPreset,
  onEnter,
  enterLabel = 'ACEPTAR',
}: NumPadProps) {
  const handleDigit = (digit: string) => {
    if (digit === '.') {
      if (!allowDecimal || value.includes('.')) return
      onChange(value === '' ? '0.' : value + '.')
      return
    }
    if (digit === '00') {
      if (value === '' || value === '0') return
      if (value.includes('.') && value.split('.')[1].length >= 2) return
      onChange(value + '00')
      return
    }
    if (value === '0') {
      onChange(digit)
      return
    }
    if (value.includes('.') && value.split('.')[1].length >= 2) return
    onChange(value + digit)
  }

  const handleDelete = () => {
    if (value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  const handleClear = () => {
    onChange('')
  }

  return (
    <div className="flex flex-col gap-2 w-full select-none">
      {presets && presets.length > 0 && (
        <div className="grid grid-cols-4 gap-2 mb-1">
          {presets.map(p => (
            <Button
              key={p}
              size="sm"
              variant="default"
              className="bg-[#E6F0FA] text-[#0A246A] font-extrabold text-base"
              onClick={() => onPreset ? onPreset(p) : onChange(String(p))}
            >
              ${p}
            </Button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {['7', '8', '9', '4', '5', '6', '1', '2', '3'].map(num => (
          <Button
            key={num}
            size="lg"
            className="text-2xl font-black bg-white"
            onClick={() => handleDigit(num)}
          >
            {num}
          </Button>
        ))}

        {allowDecimal ? (
          <Button
            size="lg"
            className="text-2xl font-black bg-white"
            onClick={() => handleDigit('.')}
          >
            .
          </Button>
        ) : (
          <Button
            size="lg"
            className="text-xl font-bold bg-[#ECE9D8]"
            onClick={() => handleDigit('00')}
          >
            00
          </Button>
        )}

        <Button
          size="lg"
          className="text-2xl font-black bg-white"
          onClick={() => handleDigit('0')}
        >
          0
        </Button>

        <Button
          size="lg"
          variant="danger"
          className="text-xl font-black"
          onClick={handleDelete}
        >
          BORRAR
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-1">
        <Button
          size="md"
          variant="warning"
          className="text-base font-bold"
          onClick={handleClear}
        >
          LIMPIAR
        </Button>

        {onEnter && (
          <Button
            size="md"
            variant="success"
            className="text-base font-black tracking-wider"
            onClick={onEnter}
          >
            {enterLabel}
          </Button>
        )}
      </div>
    </div>
  )
}
