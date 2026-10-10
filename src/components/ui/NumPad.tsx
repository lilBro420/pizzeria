import React from 'react'
import { Button } from './Button'
import { CheckIcon } from './Icons'

interface NumPadProps {
  value: string
  onChange: (value: string) => void
  allowDecimal?: boolean
  presets?: number[]
  onPreset?: (preset: number) => void
  onEnter?: () => void
  enterLabel?: string
  className?: string
}

export function NumPad({
  value,
  onChange,
  allowDecimal = true,
  presets,
  onPreset,
  onEnter,
  enterLabel = 'ACEPTAR',
  className = '',
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
    <div className={`flex flex-col gap-2 w-full select-none ${className}`}>
      {presets && presets.length > 0 && (
        <div className="grid grid-cols-4 gap-2 mb-1">
          {presets.map(p => (
            <Button
              key={p}
              size="sm"
              variant="default"
              className="bg-blue-50 text-blue-700 border-blue-200 font-black text-base hover:bg-blue-100"
              onClick={() => onPreset ? onPreset(p) : onChange(String(p))}
            >
              ${p}
            </Button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {['7', '8', '9', '4', '5', '6', '1', '2', '3'].map(num => (
          <button
            key={num}
            type="button"
            className="h-14 md:h-16 rounded-xl font-mono text-2xl font-black bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 shadow-sm active:scale-95 transition-all flex items-center justify-center"
            onClick={() => handleDigit(num)}
          >
            {num}
          </button>
        ))}

        {allowDecimal ? (
          <button
            type="button"
            className="h-14 md:h-16 rounded-xl font-mono text-2xl font-black bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 shadow-sm active:scale-95 transition-all flex items-center justify-center"
            onClick={() => handleDigit('.')}
          >
            .
          </button>
        ) : (
          <button
            type="button"
            className="h-14 md:h-16 rounded-xl font-mono text-xl font-bold bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm active:scale-95 transition-all flex items-center justify-center"
            onClick={() => handleDigit('00')}
          >
            00
          </button>
        )}

        <button
          type="button"
          className="h-14 md:h-16 rounded-xl font-mono text-2xl font-black bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 shadow-sm active:scale-95 transition-all flex items-center justify-center"
          onClick={() => handleDigit('0')}
        >
          0
        </button>

        <button
          type="button"
          className="h-14 md:h-16 rounded-xl font-bold text-base bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 shadow-sm active:scale-95 transition-all flex items-center justify-center"
          onClick={handleDelete}
        >
          ⌫ BORRAR
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-1">
        <Button
          size="lg"
          variant="default"
          className="text-base font-bold text-slate-700 bg-slate-100 border-slate-300 hover:bg-slate-200"
          onClick={handleClear}
        >
          LIMPIAR
        </Button>

        {onEnter && (
          <Button
            size="lg"
            variant="success"
            className="text-lg font-black tracking-wide shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5"
            onClick={onEnter}
          >
            <CheckIcon className="w-5 h-5 stroke-[3]" />
            <span>{enterLabel}</span>
          </Button>
        )}
      </div>
    </div>
  )
}
