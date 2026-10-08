import React, { useState } from 'react'
import { Button } from './Button'

interface VirtualKeyboardProps {
  value: string
  onChange: (value: string) => void
  onEnter?: () => void
  enterLabel?: string
}

export function VirtualKeyboard({ value, onChange, onEnter, enterLabel = 'LISTO' }: VirtualKeyboardProps) {
  const [caps, setCaps] = useState(false)

  const rows = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-'],
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ñ'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.'],
  ]

  const handleKey = (char: string) => {
    const out = caps ? char.toUpperCase() : char.toLowerCase()
    onChange(value + out)
  }

  const handleBackspace = () => {
    if (value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div className="flex flex-col gap-1.5 w-full select-none bg-[#D4D0C8] p-2 swing-outset">
      {rows.map((row, rIdx) => (
        <div key={rIdx} className="flex justify-center gap-1.5">
          {rIdx === 2 && (
            <Button
              size="sm"
              variant={caps ? 'primary' : 'default'}
              className="px-3 min-w-[50px] font-black"
              onClick={() => setCaps(!caps)}
            >
              MAYÚS
            </Button>
          )}

          {row.map(char => (
            <Button
              key={char}
              size="sm"
              className="flex-1 max-w-[54px] min-h-[44px] text-lg font-bold bg-white"
              onClick={() => handleKey(char)}
            >
              {caps ? char.toUpperCase() : char}
            </Button>
          ))}

          {rIdx === 0 && (
            <Button
              size="sm"
              variant="danger"
              className="px-3 min-w-[64px] font-bold"
              onClick={handleBackspace}
            >
              ⌫
            </Button>
          )}
        </div>
      ))}

      <div className="flex justify-center gap-2 mt-1">
        <Button
          size="sm"
          className="flex-1 max-w-[360px] min-h-[44px] font-bold tracking-wider"
          onClick={() => onChange(value + ' ')}
        >
          ESPACIO
        </Button>
        <Button
          size="sm"
          variant="warning"
          className="px-4 font-bold"
          onClick={() => onChange('')}
        >
          LIMPIAR
        </Button>
        {onEnter && (
          <Button
            size="sm"
            variant="success"
            className="px-6 font-black"
            onClick={onEnter}
          >
            {enterLabel}
          </Button>
        )}
      </div>
    </div>
  )
}
