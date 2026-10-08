import React from 'react'

interface DialogProps {
  title: string
  isOpen: boolean
  onClose: () => void
  maxWidth?: string
  children: React.ReactNode
}

export function Dialog({ title, isOpen, onClose, maxWidth = 'max-w-2xl', children }: DialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 select-none">
      <div
        className={`w-full ${maxWidth} flex flex-col swing-outset bg-[#D4D0C8] shadow-2xl border-2 border-black max-h-[96vh]`}
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-[#0A246A] text-white px-3 py-2 flex items-center justify-between font-bold text-base select-none shrink-0 border-b border-black">
          <span className="truncate">{title}</span>
          <button
            onClick={onClose}
            className="w-8 h-8 swing-button bg-[#E1E1E1] text-black font-extrabold text-sm ml-2 flex items-center justify-center"
            title="Cerrar"
          >
            ✕
          </button>
        </div>
        <div className="p-3 flex-1 overflow-y-auto flex flex-col min-h-0 bg-[#ECE9D8]">{children}</div>
      </div>
    </div>
  )
}
